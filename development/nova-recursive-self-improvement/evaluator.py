#!/usr/bin/env python3
"""Protected evaluator for NOVA recursive self-improvement candidates."""

from __future__ import annotations

import argparse
import json
import os
import re
import shlex
import subprocess
import time
from pathlib import Path
from typing import Any


SECRET_DIFF_PATTERNS = [
    re.compile(r"BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY", re.IGNORECASE),
    re.compile(r"(?:api[_-]?key|access[_-]?token|auth[_-]?token)\s*[:=]", re.IGNORECASE),
]

def safe_env(extra: dict[str, str] | None = None) -> dict[str, str]:
    blocked = re.compile(
        r"(API[_-]?KEY|TOKEN|PASSWORD|SECRET|PRIVATE[_-]?KEY|AUTH)",
        re.IGNORECASE,
    )
    env = {
        "PATH": os.environ.get("PATH", ""),
        "HOME": str(Path.home()),
        "LANG": "C.UTF-8",
        "LC_ALL": "C.UTF-8",
        "PYTHONUNBUFFERED": "1",
        "GIT_TERMINAL_PROMPT": "0",
        "GIT_CONFIG_NOSYSTEM": "1",
    }
    if extra:
        for key, value in extra.items():
            if not blocked.search(key):
                env[key] = value
    return env


def run(
    command: list[str],
    cwd: Path,
    timeout: int,
    extra_env: dict[str, str] | None = None,
) -> tuple[int, str, float]:
    started = time.monotonic()
    result = subprocess.run(
        command,
        cwd=cwd,
        env=safe_env(extra_env),
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        timeout=timeout,
        check=False,
    )
    return result.returncode, result.stdout, time.monotonic() - started


def git(root: Path, *args: str) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=root,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=True,
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


def protected_changes(paths: list[str], policy: dict[str, Any]) -> list[str]:
    scope = policy["candidate_scope"]
    allowed_prefixes = tuple(scope["allowed_prefixes"])
    protected_paths = tuple(scope["protected_paths"])
    forbidden_fragments = tuple(scope["forbidden_path_fragments"])

    findings = []
    for path in paths:
        normalized = path.replace("\\", "/").lstrip("./")
        lowered = normalized.lower()

        if not any(normalized.startswith(prefix) for prefix in allowed_prefixes):
            findings.append(normalized)

        if any(normalized.startswith(prefix) for prefix in protected_paths):
            findings.append(normalized)

        if any(fragment.lower() in lowered for fragment in forbidden_fragments):
            findings.append(normalized)

    return sorted(set(findings))


def secret_findings(root: Path, baseline: str) -> list[str]:
    diff = git(root, "diff", "--unified=0", f"{baseline}..HEAD")
    findings = []
    for pattern in SECRET_DIFF_PATTERNS:
        if pattern.search(diff):
            findings.append(pattern.pattern)
    return findings


def parse_benchmark_output(output: str) -> dict[str, Any]:
    raw = output.strip()
    if not raw:
        raise ValueError("Benchmark produced no JSON output.")

    payload = json.loads(raw)
    if not isinstance(payload, dict):
        raise ValueError("Benchmark output must be a JSON object.")

    candidate_better = payload.get("candidate_better")
    if not isinstance(candidate_better, bool):
        raise ValueError("Benchmark JSON must contain boolean candidate_better.")

    return payload


def benchmark(
    root: Path,
    baseline: str,
    candidate: str,
    timeout: int,
) -> dict[str, Any]:
    raw = os.environ.get("RSI_BENCHMARK_COMMAND", "").strip()
    if not raw:
        return {
            "status": "BLOCKED",
            "reason": "RSI_BENCHMARK_COMMAND is not configured.",
        }

    command = shlex.split(raw)
    if not command:
        return {
            "status": "BLOCKED",
            "reason": "RSI_BENCHMARK_COMMAND is empty after parsing.",
        }

    try:
        code, output, duration = run(
            command,
            root,
            timeout,
            extra_env={
                "RSI_BASELINE_COMMIT": baseline,
                "RSI_CANDIDATE_COMMIT": candidate,
            },
        )
    except subprocess.TimeoutExpired:
        return {
            "status": "FAIL",
            "reason": f"Benchmark exceeded {timeout}s timeout.",
        }

    evidence: dict[str, Any]
    try:
        evidence = parse_benchmark_output(output)
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


def evaluate(root: Path, baseline: str, policy: dict[str, Any]) -> dict[str, Any]:
    timeout = int(policy["evaluation"]["timeout_seconds"])
    candidate_commit = git(root, "rev-parse", "HEAD")

    # Candidate evaluation must not inherit repository write/auth paths.
    subprocess.run(
        ["git", "config", "--local", "--unset-all", "credential.helper"],
        cwd=root,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=False,
    )
    subprocess.run(
        ["git", "remote", "remove", "origin"],
        cwd=root,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=False,
    )

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

    leaks = secret_findings(root, baseline)
    results.append({
        "name": "secret-leak-detection",
        "status": "FAIL" if leaks else "PASS",
        "details": leaks or "No configured secret indicators found in candidate diff.",
    })

    commands = [
        ("git-diff-check", ["git", "diff", "--check", f"{baseline}..HEAD"]),
        ("python-compilation", ["python", "-m", "compileall", "-q", "development"]),
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
        ),
    ]

    for name, command in commands:
        try:
            code, output, duration = run(command, root, timeout)
            results.append({
                "name": name,
                "status": "PASS" if code == 0 else "FAIL",
                "exit_code": code,
                "duration_seconds": round(duration, 3),
                "output": output[-16000:],
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
            **benchmark(root, baseline, candidate_commit, timeout),
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
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    root = Path.cwd().resolve()
    policy = json.loads(Path(args.policy).read_text(encoding="utf-8"))
    result = evaluate(root, args.baseline, policy)
    Path(args.output).write_text(
        json.dumps(result, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0 if result["decision"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
