#!/usr/bin/env python3
"""Fail-closed Docker isolation for NOVA RSI candidate-controlled commands.

This adapter is a security boundary candidate, not by itself proof of complete
sandbox security. It requires a pre-pulled immutable image whose local image ID
matches protected policy, and it never falls back to host execution.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import selectors
import shutil
import socket
import subprocess
import tempfile
import time
from pathlib import Path
from typing import Any, Sequence


class SandboxUnavailableError(RuntimeError):
    """Raised when the configured isolation boundary cannot be established."""


_ALLOWED_ENV = frozenset(
    {
        "RSI_BASELINE_COMMIT",
        "RSI_CANDIDATE_COMMIT",
        "RSI_BENCHMARK_COMMAND",
        "RSI_BASELINE_PACKER_FILE",
        "RSI_CANDIDATE_PACKER_FILE",
    }
)
_IMAGE_REF_RE = re.compile(r"^python@sha256:[0-9a-f]{64}$")
_IMAGE_ID_RE = re.compile(r"^sha256:[0-9a-f]{64}$")


def _positive_int(mapping: dict[str, Any], key: str) -> int:
    value = mapping.get(key)
    if isinstance(value, bool) or not isinstance(value, int) or value <= 0:
        raise SandboxUnavailableError(f"Invalid protected sandbox limit: {key}.")
    return value


def _validated_image(policy: dict[str, Any]) -> tuple[str, str, dict[str, Any]]:
    sandbox = policy.get("sandbox")
    if not isinstance(sandbox, dict) or sandbox.get("runtime") != "docker":
        raise SandboxUnavailableError("Protected sandbox runtime must be Docker.")
    image = sandbox.get("image")
    expected_id = sandbox.get("expected_image_id")
    if not isinstance(image, str) or not _IMAGE_REF_RE.fullmatch(image):
        raise SandboxUnavailableError("Sandbox image must be pinned to an immutable SHA-256 digest.")
    if not isinstance(expected_id, str) or not _IMAGE_ID_RE.fullmatch(expected_id):
        raise SandboxUnavailableError("Expected sandbox image ID is missing or invalid.")
    if sandbox.get("platform") != "linux/amd64":
        raise SandboxUnavailableError("Only the independently specified linux/amd64 runtime is configured.")
    return image, expected_id, sandbox


def _host_env() -> dict[str, str]:
    """Minimal environment for the trusted Docker CLI, not the candidate."""
    allowed = {"PATH", "HOME", "LANG", "LC_ALL"}
    return {key: value for key, value in os.environ.items() if key in allowed}


def verify_image(policy: dict[str, Any], docker: str | None = None) -> None:
    image, expected_id, _ = _validated_image(policy)
    docker_executable = docker or shutil.which("docker")
    if not docker_executable:
        raise SandboxUnavailableError("Docker is unavailable; candidate execution is blocked.")

    try:
        inspect = subprocess.run(
            [docker_executable, "image", "inspect", "--format", "{{.Id}}", image],
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            timeout=10,
            check=False,
            env=_host_env(),
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise SandboxUnavailableError(f"Could not verify the sandbox image: {exc}") from exc

    actual_id = inspect.stdout.strip() if inspect.returncode == 0 else ""
    if actual_id != expected_id:
        raise SandboxUnavailableError(
            "Pinned sandbox image is absent or its image ID does not match protected policy; "
            "refusing host fallback."
        )


def build_docker_command(
    docker: str,
    policy: dict[str, Any],
    workspace: Path,
    command: Sequence[str],
    extra_env: dict[str, str] | None = None,
    readonly_mounts: Sequence[tuple[Path, str]] = (),
) -> list[str]:
    image, _expected_id, sandbox = _validated_image(policy)
    if not command or any(not isinstance(arg, str) or "\x00" in arg for arg in command):
        raise SandboxUnavailableError("Sandbox command must be a non-empty argument list.")

    workspace = workspace.resolve()
    if not workspace.is_dir():
        raise SandboxUnavailableError("Sandbox workspace must be an existing directory.")
    sources = [(workspace, "/workspace")]
    for source, target in readonly_mounts:
        resolved = source.resolve()
        if not resolved.is_dir():
            raise SandboxUnavailableError("A read-only sandbox input mount is not a directory.")
        if target != "/benchmark-input":
            raise SandboxUnavailableError("Unexpected extra sandbox mount target.")
        sources.append((resolved, target))
    for source, _target in sources:
        if "," in str(source):
            raise SandboxUnavailableError("Sandbox mount path contains a Docker mount delimiter.")

    supplied = extra_env or {}
    unknown = sorted(set(supplied) - _ALLOWED_ENV)
    if unknown:
        raise SandboxUnavailableError(
            f"Refusing non-allowlisted environment variables in sandbox: {unknown}"
        )
    for key, value in supplied.items():
        if not isinstance(value, str) or "\x00" in value:
            raise SandboxUnavailableError(f"Invalid sandbox environment value for {key}.")

    max_cpu = _positive_int(sandbox, "max_cpu_seconds")
    max_file_bytes = _positive_int(sandbox, "max_output_file_bytes")
    max_open_files = _positive_int(sandbox, "max_open_files")
    max_pids = _positive_int(sandbox, "max_pids")
    max_memory = sandbox.get("max_memory")
    max_cpus = sandbox.get("max_cpus")
    tmpfs_size = sandbox.get("tmpfs_size")
    if not all(isinstance(value, str) and value for value in (max_memory, max_cpus, tmpfs_size)):
        raise SandboxUnavailableError("Memory, CPU, and tmpfs limits are not configured.")

    args = [
        docker, "run", "--rm", "--pull=never",
        "--platform", sandbox["platform"],
        "--network=none",
        "--read-only",
        "--cap-drop=ALL",
        "--security-opt=no-new-privileges:true",
        "--ipc=private",
        "--user=65532:65532",
        "--pids-limit", str(max_pids),
        "--memory", max_memory,
        "--cpus", max_cpus,
        "--ulimit", f"cpu={max_cpu}:{max_cpu}",
        "--ulimit", f"fsize={max_file_bytes}:{max_file_bytes}",
        "--ulimit", f"nofile={max_open_files}:{max_open_files}",
        "--tmpfs", f"/tmp:rw,noexec,nosuid,nodev,size={tmpfs_size},mode=1777",
        "--workdir", "/workspace",
    ]
    for source, target in sources:
        args.extend(["--mount", f"type=bind,source={source},target={target},readonly"])

    container_env = {
        "PATH": "/usr/local/bin:/usr/bin:/bin",
        "HOME": "/tmp",
        "XDG_CONFIG_HOME": "/tmp",
        "XDG_CACHE_HOME": "/tmp",
        "LANG": "C.UTF-8",
        "LC_ALL": "C.UTF-8",
        "PYTHONUNBUFFERED": "1",
        "PYTHONNOUSERSITE": "1",
        "PYTHONDONTWRITEBYTECODE": "1",
        "PYTHONPYCACHEPREFIX": "/tmp/pycache",
        "GIT_CONFIG_NOSYSTEM": "1",
        "GIT_TERMINAL_PROMPT": "0",
    }
    container_env.update(supplied)
    for key, value in container_env.items():
        args.extend(["--env", f"{key}={value}"])
    args.extend([image, *command])
    return args


def _run_bounded(
    command: Sequence[str], timeout: int, max_output_bytes: int
) -> tuple[int, str, float]:
    started = time.monotonic()
    try:
        process = subprocess.Popen(
            list(command),
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            env=_host_env(),
            bufsize=0,
        )
    except OSError as exc:
        raise SandboxUnavailableError(f"Could not start Docker sandbox: {exc}") from exc
    assert process.stdout is not None
    output = bytearray()
    selector = selectors.DefaultSelector()
    selector.register(process.stdout, selectors.EVENT_READ)

    try:
        while selector.get_map():
            remaining = timeout - (time.monotonic() - started)
            if remaining <= 0:
                process.kill()
                process.wait()
                raise subprocess.TimeoutExpired(list(command), timeout, output=bytes(output))

            events = selector.select(min(0.1, remaining))
            if not events:
                continue
            for key, _mask in events:
                chunk = os.read(key.fd, 65536)
                if not chunk:
                    selector.unregister(key.fileobj)
                    continue
                available = max_output_bytes - len(output)
                if len(chunk) > available:
                    if available > 0:
                        output.extend(chunk[:available])
                    process.kill()
                    process.wait()
                    output.extend(b"\n[RSI sandbox output limit exceeded; process terminated.]\n")
                    return 125, output.decode("utf-8", errors="replace"), time.monotonic() - started
                output.extend(chunk)

        code = process.wait(timeout=max(0.1, timeout - (time.monotonic() - started)))
        return code, output.decode("utf-8", errors="replace"), time.monotonic() - started
    finally:
        selector.close()
        if process.poll() is None:
            process.kill()
            process.wait()
        process.stdout.close()


def _stop_container(docker: str, cidfile: Path) -> None:
    try:
        container_id = cidfile.read_text(encoding="utf-8").strip()
    except OSError:
        return
    if not re.fullmatch(r"[0-9a-f]{12,64}", container_id):
        return
    # A timed-out Docker client does not prove its container has stopped.
    # Kill the daemon-managed container explicitly before removing the cid file.
    for operation in ("kill", "rm",):
        try:
            subprocess.run(
                [docker, operation, "-f", container_id] if operation == "rm"
                else [docker, operation, container_id],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                timeout=10,
                check=False,
                env=_host_env(),
            )
        except (OSError, subprocess.TimeoutExpired):
            continue


def run_sandboxed(
    command: Sequence[str],
    cwd: Path,
    timeout: int,
    extra_env: dict[str, str] | None = None,
    *,
    policy: dict[str, Any],
    readonly_mounts: Sequence[tuple[Path, str]] = (),
) -> tuple[int, str, float]:
    if timeout <= 0:
        raise SandboxUnavailableError("Sandbox timeout must be positive.")
    image, _expected, sandbox = _validated_image(policy)
    docker = shutil.which("docker")
    if not docker:
        raise SandboxUnavailableError("Docker is unavailable; candidate execution is blocked.")
    verify_image(policy, docker=docker)
    docker_command = build_docker_command(
        docker,
        policy,
        cwd,
        command,
        extra_env,
        readonly_mounts,
    )
    max_output = _positive_int(sandbox, "max_output_bytes")
    with tempfile.TemporaryDirectory(prefix="nova-rsi-docker-control-") as control_dir:
        cidfile = Path(control_dir) / "container.cid"
        image_index = docker_command.index(image)
        docker_command[image_index:image_index] = ["--cidfile", str(cidfile)]
        try:
            result = _run_bounded(docker_command, timeout, max_output)
        except subprocess.TimeoutExpired:
            _stop_container(docker, cidfile)
            raise
        if result[0] == 125:
            _stop_container(docker, cidfile)
        return result


def self_test(policy: dict[str, Any]) -> dict[str, Any]:
    """Exercise key isolation properties on the actual Docker host."""
    with tempfile.TemporaryDirectory(prefix="nova-rsi-sandbox-smoke-") as temp:
        root = Path(temp)
        workspace = root / "workspace"
        workspace.mkdir()
        host_sentinel = root / "host-sentinel.txt"
        host_sentinel.write_text("host-only-sentinel", encoding="utf-8")
        workspace.chmod(0o755)

        code = (
            "from pathlib import Path; import socket,sys; "
            f"host=Path({str(host_sentinel)!r}); "
            "workspace=Path('/workspace'); "
            "assert not host.exists(), 'host sentinel is visible inside container'; "
            "assert (workspace/'input.txt').read_text(encoding='utf-8') == 'sandbox-input'; "
            "\ntry:\n (workspace/'write-probe.txt').write_text('forbidden')\n"
            "except OSError:\n pass\nelse:\n sys.exit(31)\n"
            "\ntry:\n s=socket.socket(socket.AF_INET,socket.SOCK_STREAM); s.settimeout(1); "
            "s.connect(('1.1.1.1',53)); s.close()\n"
            "except OSError:\n pass\nelse:\n sys.exit(32)\n"
            "print('sandbox-smoke-pass')"
        )
        (workspace / "input.txt").write_text("sandbox-input", encoding="utf-8")
        code_result = run_sandboxed(
            ["python", "-c", code],
            workspace,
            timeout=8,
            policy=policy,
        )
        code, output, duration = code_result
        if code != 0 or "sandbox-smoke-pass" not in output:
            return {
                "status": "FAIL",
                "exit_code": code,
                "duration_seconds": round(duration, 3),
                "output": output[-4000:],
            }
        if (workspace / "write-probe.txt").exists():
            return {"status": "FAIL", "reason": "Container wrote into read-only host workspace."}
        if not host_sentinel.exists():
            return {"status": "FAIL", "reason": "Host sentinel was unexpectedly changed or removed."}
        return {
            "status": "PASS",
            "checks": [
                "immutable image digest and image ID verified",
                "candidate workspace mounted read-only",
                "host sentinel path not visible inside container",
                "container network access denied",
                "sandbox process ran without host credentials in its environment",
            ],
            "duration_seconds": round(duration, 3),
            "output": output[-4000:],
        }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--policy", default="development/nova-recursive-self-improvement/rsi_policy.json")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    try:
        policy = json.loads(Path(args.policy).read_text(encoding="utf-8"))
        if args.self_test:
            result = self_test(policy)
            print(json.dumps(result, indent=2, sort_keys=True))
            return 0 if result.get("status") == "PASS" else 1
        parser.error("Specify --self-test.")
    except (OSError, json.JSONDecodeError, SandboxUnavailableError) as exc:
        print(json.dumps({"status": "BLOCKED", "reason": str(exc)}, sort_keys=True))
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
