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
import uuid
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
    run_id: str | None = None,
    evaluation_id: str | None = None,
) -> list[str]:
    image, _expected_id, sandbox = _validated_image(policy)
    run_id = run_id or uuid.uuid4().hex
    if not re.fullmatch(r"[0-9a-f]{32}", run_id):
        raise SandboxUnavailableError("Sandbox run identifier must be a 32-character lowercase hex token.")
    if evaluation_id is not None and not re.fullmatch(r"[0-9a-f]{32}", evaluation_id):
        raise SandboxUnavailableError("Sandbox evaluation identifier must be a 32-character lowercase hex token.")
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
        docker, "run", "--rm", "--init", "--pull=never",
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
        "--label", f"nova.rsi.run_id={run_id}",
    ]
    if evaluation_id is not None:
        args.extend(["--label", f"nova.rsi.evaluation_id={evaluation_id}"])
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


def _list_run_containers(docker: str, run_id: str) -> set[str] | None:
    """Return all container IDs for a run label, or None when inspection failed."""
    try:
        listed = subprocess.run(
            [docker, "ps", "-aq", "--filter", f"label=nova.rsi.run_id={run_id}"],
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            timeout=5,
            check=False,
            env=_host_env(),
        )
    except (OSError, subprocess.TimeoutExpired):
        return None
    if listed.returncode != 0:
        return None
    values = {value.strip() for value in listed.stdout.splitlines() if value.strip()}
    if any(not re.fullmatch(r"[0-9a-f]{12,64}", value) for value in values):
        return None
    return values


def _stop_container(docker: str, cidfile: Path, run_id: str) -> bool:
    """Stop/remove a run's containers and confirm none remain with its label."""
    if not re.fullmatch(r"[0-9a-f]{32}", run_id):
        return False

    container_ids: set[str] = set()
    try:
        container_id = cidfile.read_text(encoding="utf-8").strip()
    except OSError:
        container_id = ""
    if re.fullmatch(r"[0-9a-f]{12,64}", container_id):
        container_ids.add(container_id)

    # Always query the run label, even when cidfile is present. This catches
    # containers the Docker client created before writing cidfile and detects
    # unexpected duplicates associated with the same invocation.
    for attempt in range(3):
        discovered = _list_run_containers(docker, run_id)
        if discovered is not None:
            container_ids.update(discovered)
        if discovered or attempt == 2:
            break
        time.sleep(0.1)

    # A timed-out Docker client does not prove its container has stopped.
    # Kill/remove every ID found through either the cidfile or run label.
    for container_id in sorted(container_ids):
        for operation in ("kill", "rm"):
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
                pass

    # Do not silently report successful cleanup if the Docker daemon cannot
    # confirm that no containers remain. Retry to tolerate asynchronous rm.
    for attempt in range(3):
        remaining = _list_run_containers(docker, run_id)
        if remaining == set():
            return True
        if remaining:
            for container_id in sorted(remaining):
                for operation in ("kill", "rm"):
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
                        pass
        if attempt < 2:
            time.sleep(0.1)
    return False


def cleanup_evaluation_containers(
    evaluation_id: str,
    docker: str | None = None,
    *,
    wait_for_late_containers: bool = False,
) -> bool:
    """Remove and verify all containers tagged with one outer evaluation ID.

    This supervisor-level cleanup is used when the host evaluator process itself
    times out or dies before its in-process per-container cleanup handler can run.
    """
    if not re.fullmatch(r"[0-9a-f]{32}", evaluation_id):
        return False
    docker_executable = docker or shutil.which("docker")
    if not docker_executable:
        return False

    label = f"nova.rsi.evaluation_id={evaluation_id}"
    container_ids: set[str] = set()
    discovery_attempts = 11 if wait_for_late_containers else 3
    for attempt in range(discovery_attempts):
        try:
            listed = subprocess.run(
                [docker_executable, "ps", "-aq", "--filter", f"label={label}"],
                text=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                timeout=5,
                check=False,
                env=_host_env(),
            )
        except (OSError, subprocess.TimeoutExpired):
            listed = None
        if listed is not None and listed.returncode == 0:
            found = {
                value.strip()
                for value in listed.stdout.splitlines()
                if value.strip()
            }
            if all(re.fullmatch(r"[0-9a-f]{12,64}", value) for value in found):
                container_ids.update(found)
                if found:
                    break
            else:
                return False
        if attempt < discovery_attempts - 1:
            time.sleep(0.1)

    for container_id in sorted(container_ids):
        for operation in ("kill", "rm"):
            try:
                subprocess.run(
                    [docker_executable, operation, "-f", container_id]
                    if operation == "rm"
                    else [docker_executable, operation, container_id],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    timeout=10,
                    check=False,
                    env=_host_env(),
                )
            except (OSError, subprocess.TimeoutExpired):
                pass

    for attempt in range(3):
        try:
            remaining = subprocess.run(
                [docker_executable, "ps", "-aq", "--filter", f"label={label}"],
                text=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                timeout=5,
                check=False,
                env=_host_env(),
            )
        except (OSError, subprocess.TimeoutExpired):
            return False
        if remaining.returncode != 0:
            return False
        values = {value.strip() for value in remaining.stdout.splitlines() if value.strip()}
        if not values:
            return True
        if any(not re.fullmatch(r"[0-9a-f]{12,64}", value) for value in values):
            return False
        for container_id in sorted(values):
            for operation in ("kill", "rm"):
                try:
                    subprocess.run(
                        [docker_executable, operation, "-f", container_id]
                        if operation == "rm"
                        else [docker_executable, operation, container_id],
                        stdout=subprocess.PIPE,
                        stderr=subprocess.STDOUT,
                        timeout=10,
                        check=False,
                        env=_host_env(),
                    )
                except (OSError, subprocess.TimeoutExpired):
                    pass
        if attempt < 2:
            time.sleep(0.1)
    return False


def run_sandboxed(
    command: Sequence[str],
    cwd: Path,
    timeout: int,
    extra_env: dict[str, str] | None = None,
    *,
    policy: dict[str, Any],
    readonly_mounts: Sequence[tuple[Path, str]] = (),
    run_id: str | None = None,
    evaluation_id: str | None = None,
) -> tuple[int, str, float]:
    if timeout <= 0:
        raise SandboxUnavailableError("Sandbox timeout must be positive.")
    image, _expected, sandbox = _validated_image(policy)
    docker = shutil.which("docker")
    if not docker:
        raise SandboxUnavailableError("Docker is unavailable; candidate execution is blocked.")
    verify_image(policy, docker=docker)
    run_id = run_id or uuid.uuid4().hex
    if not re.fullmatch(r"[0-9a-f]{32}", run_id):
        raise SandboxUnavailableError("Sandbox run identifier must be a 32-character lowercase hex token.")
    evaluation_id = evaluation_id or os.environ.get("RSI_SANDBOX_EVALUATION_ID", "").strip() or None
    if evaluation_id is not None and not re.fullmatch(r"[0-9a-f]{32}", evaluation_id):
        raise SandboxUnavailableError("Sandbox evaluation identifier must be a 32-character lowercase hex token.")
    docker_command = build_docker_command(
        docker,
        policy,
        cwd,
        command,
        extra_env,
        readonly_mounts,
        run_id=run_id,
        evaluation_id=evaluation_id,
    )
    max_output = _positive_int(sandbox, "max_output_bytes")
    with tempfile.TemporaryDirectory(prefix="nova-rsi-docker-control-") as control_dir:
        cidfile = Path(control_dir) / "container.cid"
        image_index = docker_command.index(image)
        docker_command[image_index:image_index] = ["--cidfile", str(cidfile)]
        try:
            result = _run_bounded(docker_command, timeout, max_output)
        except subprocess.TimeoutExpired as exc:
            if not _stop_container(docker, cidfile, run_id):
                raise SandboxUnavailableError(
                    "Sandbox timed out, but Docker could not confirm that all run-labelled containers were removed."
                ) from exc
            raise
        if result[0] == 125 and not _stop_container(docker, cidfile, run_id):
            raise SandboxUnavailableError(
                "Sandbox output limit was exceeded, but Docker could not confirm that all run-labelled containers were removed."
            )
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

        # Exercise the real timeout path after the container has started, then
        # verify no daemon-managed container remains for its unique run label.
        timeout_run_id = uuid.uuid4().hex
        try:
            run_sandboxed(
                ["python", "-c", "import time; print('timeout-cleanup-ready', flush=True); time.sleep(30)"],
                workspace,
                timeout=5,
                policy=policy,
                run_id=timeout_run_id,
            )
            return {"status": "FAIL", "reason": "A sleeping sandbox command unexpectedly completed."}
        except subprocess.TimeoutExpired as exc:
            timeout_output = exc.output or b""
            if isinstance(timeout_output, bytes):
                timeout_output = timeout_output.decode("utf-8", errors="replace")
            if "timeout-cleanup-ready" not in timeout_output:
                return {"status": "FAIL", "reason": "Timeout test did not confirm the container command had started."}
        try:
            remaining = subprocess.run(
                ["docker", "ps", "-aq", "--filter", f"label=nova.rsi.run_id={timeout_run_id}"],
                text=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                timeout=10,
                check=False,
                env=_host_env(),
            )
        except (OSError, subprocess.TimeoutExpired) as exc:
            return {"status": "FAIL", "reason": f"Could not verify timeout cleanup: {exc}"}
        if remaining.returncode != 0:
            return {"status": "FAIL", "reason": "Docker could not verify timeout cleanup."}
        if remaining.stdout.strip():
            return {
                "status": "FAIL",
                "reason": "A sandbox container remained after the timeout cleanup path.",
                "remaining_container_ids": remaining.stdout.splitlines(),
            }
        # Exercise the outer-supervisor cleanup path independently of the
        # inner runner's cidfile handler: start a detached, evaluation-labelled
        # container and require the supervisor cleanup to discover and remove it.
        evaluation_id = uuid.uuid4().hex
        docker = shutil.which("docker")
        if not docker:
            return {"status": "FAIL", "reason": "Docker CLI disappeared before supervisor-cleanup test."}
        detached_command = build_docker_command(
            docker,
            policy,
            workspace,
            ["python", "-c", "import time; time.sleep(30)"],
            evaluation_id=evaluation_id,
        )
        run_index = detached_command.index("run")
        detached_command.insert(run_index + 1, "--detach")
        try:
            launched = subprocess.run(
                detached_command,
                text=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                timeout=10,
                check=False,
                env=_host_env(),
            )
        except (OSError, subprocess.TimeoutExpired) as exc:
            cleanup_evaluation_containers(
                evaluation_id, docker=docker, wait_for_late_containers=True
            )
            return {"status": "FAIL", "reason": f"Could not launch evaluation-labelled container: {exc}"}
        if launched.returncode != 0 or not re.fullmatch(r"[0-9a-f]{12,64}", launched.stdout.strip()):
            cleanup_confirmed = cleanup_evaluation_containers(
                evaluation_id, docker=docker, wait_for_late_containers=True
            )
            return {
                "status": "FAIL",
                "reason": "Docker did not return a valid detached container ID.",
                "cleanup_confirmed": cleanup_confirmed,
                "output": launched.stdout[-2000:],
            }
        if not cleanup_evaluation_containers(
            evaluation_id, docker=docker, wait_for_late_containers=True
        ):
            return {
                "status": "FAIL",
                "reason": "Supervisor-level cleanup could not confirm removal of all evaluation-labelled containers.",
            }
        return {
            "status": "PASS",
            "checks": [
                "immutable image digest and image ID verified",
                "candidate workspace mounted read-only",
                "host sentinel path not visible inside container",
                "container network access denied",
                "sandbox process ran without host credentials in its environment",
                "timed-out container was discovered by run label and removed",
                "supervisor removed an evaluation-labelled detached container",
            ],
            "duration_seconds": round(duration, 3),
            "output": output[-4000:],
        }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--policy", default="development/nova-recursive-self-improvement/rsi_policy.json")
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--cleanup-evaluation-id")
    args = parser.parse_args()
    try:
        # Cleanup does not need the sandbox policy or image: it only queries the
        # trusted Docker daemon for containers carrying the validated run label.
        # Keep this branch ahead of policy loading so it remains usable after a
        # failed or malformed candidate/evaluator configuration.
        if args.cleanup_evaluation_id is not None:
            cleaned = cleanup_evaluation_containers(
                args.cleanup_evaluation_id,
                wait_for_late_containers=True,
            )
            result = {
                "status": "PASS" if cleaned else "BLOCKED",
                "stage": "evaluation-container-cleanup",
                "cleanup_confirmed": cleaned,
            }
            print(json.dumps(result, indent=2, sort_keys=True))
            return 0 if cleaned else 2

        policy = json.loads(Path(args.policy).read_text(encoding="utf-8"))
        if args.self_test:
            result = self_test(policy)
            print(json.dumps(result, indent=2, sort_keys=True))
            return 0 if result.get("status") == "PASS" else 1
        parser.error("Specify --self-test or --cleanup-evaluation-id.")
    except (OSError, json.JSONDecodeError, SandboxUnavailableError) as exc:
        print(json.dumps({"status": "BLOCKED", "reason": str(exc)}, sort_keys=True))
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
