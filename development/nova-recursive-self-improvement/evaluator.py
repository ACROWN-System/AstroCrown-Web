#!/usr/bin/env python3
"""Protected evaluator for NOVA recursive self-improvement candidates."""

from __future__ import annotations

import argparse
import json
import os
import re
import shlex
import shutil
import stat
import subprocess
import tempfile
import time
from pathlib import Path
from typing import Any

from benchmark_dispatcher import resolve_profile
from sandbox_runtime import SandboxUnavailableError, run_sandboxed


SECRET_DIFF_PATTERNS = [
    re.compile(r"BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY", re.IGNORECASE),
    re.compile(
        r"(?:api[_-]?key|access[_-]?token|auth[_-]?token|password|client[_-]?secret)\s*[:=]",
        re.IGNORECASE,
    ),
    re.compile(r"(?:ghp_|github_pat_|sk-[A-Za-z0-9]{16,}|AKIA[0-9A-Z]{16})"),
    re.compile(r"Authorization\s*:\s*Bearer\s+[A-Za-z0-9._-]{12,}", re.IGNORECASE),
]


def safe_env(
    extra: dict[str, str] | None = None, *, home: Path | None = None
) -> dict[str, str]:
    blocked = re.compile(
        r"(API[_-]?KEY|TOKEN|PASSWORD|SECRET|PRIVATE[_-]?KEY|AUTH|CREDENTIAL|COOKIE|GITHUB|AWS|AZURE|GOOGLE)",
        re.IGNORECASE,
    )
    safe_home = str(home or Path(tempfile.gettempdir()) / "nova-rsi-home")
    env = {
        "PATH": os.environ.get("PATH", ""),
        "HOME": safe_home,
        "XDG_CONFIG_HOME": str(Path(safe_home) / ".config"),
        "XDG_CACHE_HOME": str(Path(safe_home) / ".cache"),
        "LANG": "C.UTF-8",
        "LC_ALL": "C.UTF-8",
        "PYTHONUNBUFFERED": "1",
        "PYTHONNOUSERSITE": "1",
        "GIT_TERMINAL_PROMPT": "0",
        "GIT_CONFIG_NOSYSTEM": "1",
    }
    if extra:
        for key, value in extra.items():
            if not blocked.search(key):
                env[key] = value
    return env


def _preexec_limits(policy: dict[str, Any] | None):
    try:
        import resource
    except ImportError:
        return None
    sandbox = (policy or {}).get("sandbox", {})
    cpu_seconds = int(sandbox.get("max_cpu_seconds", 120))
    file_bytes = int(sandbox.get("max_output_file_bytes", 64 * 1024 * 1024))
    open_files = int(sandbox.get("max_open_files", 256))

    def preexec() -> None:
        resource.setrlimit(resource.RLIMIT_CPU, (cpu_seconds, cpu_seconds))
        resource.setrlimit(resource.RLIMIT_FSIZE, (file_bytes, file_bytes))
        resource.setrlimit(resource.RLIMIT_NOFILE, (open_files, open_files))

    return preexec


def run(
    command: list[str],
    cwd: Path,
    timeout: int,
    extra_env: dict[str, str] | None = None,
    *,
    home: Path | None = None,
    policy: dict[str, Any] | None = None,
) -> tuple[int, str, float]:
    started = time.monotonic()
    result = subprocess.run(
        command,
        cwd=cwd,
        env=safe_env(extra_env, home=home),
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        timeout=timeout,
        check=False,
        preexec_fn=_preexec_limits(policy),
    )
    max_output = int((policy or {}).get("sandbox", {}).get("max_output_bytes", 32000))
    return result.returncode, result.stdout[-max_output:], time.monotonic() - started


def git(root: Path, *args: str) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=root,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=True,
        env=safe_env(home=root / ".rsi-control-home"),
    )
    return result.stdout.strip()


def changed_files(root: Path, baseline: str) -> list[str]:
    output = git(root, "diff", "--name-only", f"{baseline}..HEAD")
    return sorted(line for line in output.splitlines() if line)


def changed_statuses(root: Path, baseline: str) -> list[tuple[str, str]]:
    output = git(root, "diff", "--name-status", f"{baseline}..HEAD")
    statuses = []
    for line in output.splitlines():
        parts = line.split("\t", 1)
        if len(parts) == 2:
            statuses.append((parts[0], parts[1]))
    return statuses


def normalize_repo_path(path: str) -> str:
    candidate = path.replace("\\", "/")
    if candidate.startswith("/") or re.match(r"^[A-Za-z]:/", candidate):
        return ""
    parts = []
    for part in candidate.split("/"):
        if part in {"", "."}:
            continue
        if part == "..":
            return ""
        parts.append(part)
    return "/".join(parts)


def protected_changes(paths: list[str], policy: dict[str, Any]) -> list[str]:
    scope = policy["candidate_scope"]
    allowed_prefixes = tuple(scope["allowed_prefixes"])
    protected_paths = tuple(scope["protected_paths"])
    forbidden_fragments = tuple(scope["forbidden_path_fragments"])
    findings = []
    for raw_path in paths:
        normalized = normalize_repo_path(raw_path)
        if not normalized:
            findings.append(f"unsafe-path:{raw_path}")
            continue
        lowered = normalized.lower()
        if not any(normalized.startswith(prefix) for prefix in allowed_prefixes):
            findings.append(normalized)
        if any(
            normalized == prefix.rstrip("/")
            or normalized.startswith(prefix)
            for prefix in protected_paths
        ):
            findings.append(normalized)
        if any(fragment.lower() in lowered for fragment in forbidden_fragments):
            findings.append(normalized)
    return sorted(set(findings))


def unsafe_file_types(root: Path, paths: list[str], baseline: str) -> list[str]:
    findings = []
    summary = git(root, "diff", "--summary", f"{baseline}..HEAD")
    for line in summary.splitlines():
        lowered = line.lower()
        if any(token in lowered for token in ("mode change", "rename", "copy", "typechange")):
            findings.append(line)
    for relative in paths:
        path = root / relative
        try:
            mode = path.lstat().st_mode
        except FileNotFoundError:
            continue
        if stat.S_ISLNK(mode):
            findings.append(f"symlink:{relative}")
        elif not stat.S_ISREG(mode):
            findings.append(f"non-regular:{relative}")
        elif mode & (stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH):
            # Candidate retention independently rejects executable modes. Keep
            # the evaluator's filesystem-integrity result consistent so a
            # candidate cannot receive PASS and only fail at the write boundary.
            findings.append(f"executable-mode:{relative}")
    return sorted(set(findings))


def secret_findings(root: Path, baseline: str) -> list[str]:
    diff = git(root, "diff", "--unified=0", f"{baseline}..HEAD")
    return sorted(
        set(pattern.pattern for pattern in SECRET_DIFF_PATTERNS if pattern.search(diff))
    )


def parse_benchmark_output(
    output: str, baseline: str, candidate: str
) -> dict[str, Any]:
    raw = output.strip()
    if not raw:
        raise ValueError("Benchmark produced no JSON output.")
    payload = json.loads(raw)
    if not isinstance(payload, dict):
        raise ValueError("Benchmark output must be a JSON object.")
    candidate_better = payload.get("candidate_better")
    if not isinstance(candidate_better, bool):
        raise ValueError("Benchmark JSON must contain boolean candidate_better.")
    if payload.get("baseline_commit") != baseline:
        raise ValueError("Benchmark baseline_commit does not match RSI_BASELINE_COMMIT.")
    if payload.get("candidate_commit") != candidate:
        raise ValueError("Benchmark candidate_commit does not match RSI_CANDIDATE_COMMIT.")
    return payload


def _materialize_benchmark_source(
    root: Path, commit: str, role: str, directory: Path
) -> Path:
    if not re.fullmatch(r"[0-9a-f]{40}", commit):
        raise ValueError(f"{role} commit must be a full 40-character lowercase SHA.")
    relative = "development/nova-context-memory-optimization/context_packer.py"
    source = git(root, "show", f"{commit}:{relative}")
    if not source:
        raise RuntimeError(f"Context packer source is empty at {commit}.")
    path = directory / f"{role}-{commit}.py"
    path.write_text(source + "\n", encoding="utf-8")
    path.chmod(0o444)
    return path


def benchmark(
    root: Path,
    baseline: str,
    candidate: str,
    timeout: int,
    policy: dict[str, Any],
    *,
    profile_registry: dict[str, Any] | None = None,
) -> dict[str, Any]:
    raw = os.environ.get("RSI_BENCHMARK_COMMAND", "").strip()
    if not raw:
        return {"status": "BLOCKED", "reason": "RSI_BENCHMARK_COMMAND is not configured."}

    if profile_registry is None:
        return {
            "status": "BLOCKED",
            "reason": "Trusted benchmark profile registry was not supplied explicitly.",
        }
    if not isinstance(profile_registry, dict):
        return {
            "status": "BLOCKED",
            "reason": "Trusted benchmark profile registry is not a JSON object.",
        }

    selected = resolve_profile(profile_registry, changed_files(root, baseline), raw)
    if selected.get("status") != "READY":
        return {
            "status": "BLOCKED",
            "reason": selected.get("reason", "No approved task-specific benchmark profile matched."),
            "profile_id": selected.get("profile_id"),
        }
    command = selected["command"]

    input_dir = Path(tempfile.mkdtemp(prefix="nova-rsi-benchmark-input-"))
    try:
        try:
            baseline_file = _materialize_benchmark_source(root, baseline, "baseline", input_dir)
            candidate_file = _materialize_benchmark_source(root, candidate, "candidate", input_dir)
            input_dir.chmod(0o555)
        except (subprocess.CalledProcessError, ValueError, RuntimeError) as exc:
            return {
                "status": "BLOCKED",
                "reason": f"Could not materialize exact baseline/candidate benchmark sources: {exc}",
            }

        container_env = {
            "RSI_BASELINE_COMMIT": baseline,
            "RSI_CANDIDATE_COMMIT": candidate,
            "RSI_BASELINE_PACKER_FILE": f"/benchmark-input/{baseline_file.name}",
            "RSI_CANDIDATE_PACKER_FILE": f"/benchmark-input/{candidate_file.name}",
            "RSI_BENCHMARK_COMMAND": raw,
        }
        try:
            code, output, duration = run_sandboxed(
                command,
                root,
                timeout,
                extra_env=container_env,
                policy=policy,
                readonly_mounts=[(input_dir, "/benchmark-input")],
            )
        except subprocess.TimeoutExpired:
            return {
                "status": "FAIL",
                "reason": f"Benchmark exceeded {timeout}s timeout inside the Docker sandbox.",
            }
        except SandboxUnavailableError as exc:
            return {
                "status": "BLOCKED",
                "reason": f"Sandbox unavailable; benchmark was not run on the host: {exc}",
            }

        try:
            evidence = parse_benchmark_output(output, baseline, candidate)
        except (json.JSONDecodeError, ValueError) as exc:
            return {
                "status": "BLOCKED",
                "reason": f"Benchmark output contract invalid: {exc}",
                "exit_code": code,
                "duration_seconds": round(duration, 3),
                "output": output[-16000:],
            }

        if code != 0:
            return {
                "status": "FAIL",
                "reason": "Benchmark command returned a non-zero exit code.",
                "candidate_better": evidence["candidate_better"],
                "exit_code": code,
                "duration_seconds": round(duration, 3),
                "evidence": evidence,
            }

        return {
            "status": "PASS" if evidence["candidate_better"] else "FAIL",
            "candidate_better": evidence["candidate_better"],
            "exit_code": code,
            "duration_seconds": round(duration, 3),
            "evidence": evidence,
        }
    finally:
        try:
            input_dir.chmod(0o755)
        except OSError:
            pass
        shutil.rmtree(input_dir, ignore_errors=True)


def implementation_ready(policy: dict[str, Any]) -> bool:
    readiness = policy.get("implementation_readiness", {})
    return (
        readiness.get("status") == "READY"
        and readiness.get("require_explicit_ready") is True
        and readiness.get("promotion_blocked_until_ready") is True
    )


def evaluate(
    root: Path,
    baseline: str,
    policy: dict[str, Any],
    profile_registry: dict[str, Any] | None = None,
) -> dict[str, Any]:
    timeout = int(policy["evaluation"]["timeout_seconds"])
    candidate_commit = git(root, "rev-parse", "HEAD")

    if not implementation_ready(policy):
        return {
            "decision": "BLOCKED",
            "baseline_commit": baseline,
            "changed_files": changed_files(root, baseline),
            "results": [
                {
                    "name": "implementation-readiness",
                    "status": "BLOCKED",
                    "details": (
                        "RSI implementation is not declared READY in the protected policy. "
                        "No candidate may be accepted or promoted until all mandatory implementation "
                        "components are implemented and independently verified."
                    ),
                }
            ],
        }

    results: list[dict[str, Any]] = []

    paths = changed_files(root, baseline)
    protected = protected_changes(paths, policy)
    results.append({
        "name": "protected-scope",
        "status": "FAIL" if protected else "PASS",
        "details": protected or "Candidate remained inside allowed development scope.",
    })

    statuses = changed_statuses(root, baseline)
    deleted = [path for status, path in statuses if status.startswith("D")]
    results.append({
        "name": "deletion-protection",
        "status": "FAIL" if deleted else "PASS",
        "details": deleted or "Candidate did not delete tracked repository files.",
    })

    unsafe = unsafe_file_types(root, paths, baseline)
    results.append({
        "name": "filesystem-integrity",
        "status": "FAIL" if unsafe else "PASS",
        "details": unsafe or "No symlinks, type changes, renames, copies, or unsafe file modes found.",
    })

    leaks = secret_findings(root, baseline)
    results.append({
        "name": "secret-leak-detection",
        "status": "FAIL" if leaks else "PASS",
        "details": leaks or "No configured secret indicators found in candidate diff.",
    })

    commands = [
        ("git-diff-check", ["git", "diff", "--check", f"{baseline}..HEAD"], False),
        ("python-compilation", ["python", "-m", "compileall", "-q", "development"], True),
        (
            "rsi-unit-tests",
            [
                "python",
                "-m",
                "unittest",
                "discover",
                "-s",
                "development/nova-recursive-self-improvement/tests",
                "-p",
                "test_*.py",
                "-v",
            ],
            True,
        ),
    ]

    for name, command, sandboxed in commands:
        try:
            if sandboxed:
                code, output, duration = run_sandboxed(
                    command,
                    root,
                    timeout,
                    policy=policy,
                )
            else:
                # Pure Git diff inspection does not execute candidate code.
                code, output, duration = run(
                    command,
                    root,
                    timeout,
                    home=root / ".rsi-control-home",
                    policy=policy,
                )
            results.append({
                "name": name,
                "status": "PASS" if code == 0 else "FAIL",
                "exit_code": code,
                "duration_seconds": round(duration, 3),
                "output": output[-16000:],
                "execution_boundary": "docker-sandbox" if sandboxed else "trusted-host-read-only-inspection",
            })
        except SandboxUnavailableError as exc:
            results.append({
                "name": name,
                "status": "BLOCKED",
                "reason": f"Sandbox unavailable; candidate-controlled command was not run on the host: {exc}",
            })
        except subprocess.TimeoutExpired:
            results.append({
                "name": name,
                "status": "FAIL",
                "reason": f"Command exceeded {timeout}s timeout.",
            })

    if bool(policy["evaluation"]["require_benchmark"]):
        results.append({
            "name": "capability-benchmark",
            **benchmark(
                root,
                baseline,
                candidate_commit,
                timeout,
                policy,
                profile_registry=profile_registry,
            ),
        })

    statuses_only = [item["status"] for item in results]
    decision = (
        "FAIL"
        if "FAIL" in statuses_only
        else ("BLOCKED" if "BLOCKED" in statuses_only else "PASS")
    )
    return {
        "decision": decision,
        "baseline_commit": baseline,
        "changed_files": paths,
        "results": results,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--baseline", required=True)
    parser.add_argument("--policy", required=True)
    parser.add_argument("--profile-registry", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    root = Path.cwd().resolve()
    policy = json.loads(Path(args.policy).read_text(encoding="utf-8"))
    profile_registry = json.loads(Path(args.profile_registry).read_text(encoding="utf-8"))
    if not isinstance(policy, dict) or not isinstance(profile_registry, dict):
        raise ValueError("Trusted RSI policy and benchmark profile registry must be JSON objects.")
    result = evaluate(root, args.baseline, policy, profile_registry=profile_registry)
    Path(args.output).write_text(
        json.dumps(result, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0 if result["decision"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
