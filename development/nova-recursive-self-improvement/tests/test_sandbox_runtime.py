import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sandbox_runtime import (
    SandboxUnavailableError,
    _run_bounded,
    build_docker_command,
    run_sandboxed,
    _stop_container,
)


IMAGE = "python@sha256:34386ef0cb081344d7ec1c103ba398e6e9f64e9ab3a1509accc92a4e24a07258"
IMAGE_ID = "sha256:4f228bc1cbcfc794e4878312cfc241d368eff55a21c08d1e2bb263116c4ef524"
POLICY = {
    "sandbox": {
        "runtime": "docker",
        "image": IMAGE,
        "expected_image_id": IMAGE_ID,
        "platform": "linux/amd64",
        "max_output_bytes": 32000,
        "max_output_file_bytes": 67108864,
        "max_open_files": 256,
        "max_cpu_seconds": 120,
        "max_memory": "2g",
        "max_cpus": "2",
        "max_pids": 128,
        "tmpfs_size": "128m",
    }
}


class SandboxRuntimeTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="nova-sandbox-test-")
        self.root = Path(self.temp.name)
        self.workspace = self.root / "workspace"
        self.workspace.mkdir()

    def tearDown(self):
        self.temp.cleanup()

    def test_docker_command_enforces_required_boundary(self):
        command = build_docker_command(
            "docker",
            POLICY,
            self.workspace,
            ["python", "-c", "print('safe')"],
            extra_env={"RSI_BASELINE_COMMIT": "a" * 40},
            run_id="b" * 32,
        )
        joined = "\n".join(command)
        for required in (
            "--pull=never",
            "--platform",
            "--network=none",
            "--read-only",
            "--cap-drop=ALL",
            "--security-opt=no-new-privileges:true",
            "--ipc=private",
            "--user=65532:65532",
            "--pids-limit",
            "--memory",
            "--cpus",
            "--ulimit",
            "--tmpfs",
            "target=/workspace,readonly",
            "nova.rsi.run_id=" + "b" * 32,
            "RSI_BASELINE_COMMIT=" + "a" * 40,
        ):
            self.assertIn(required, joined)
        self.assertNotIn("GITHUB_TOKEN", joined)
        self.assertNotIn("AWS_ACCESS_KEY_ID", joined)

    def test_mutable_or_wrong_image_reference_is_rejected(self):
        policy = {"sandbox": dict(POLICY["sandbox"], image="python:3.12-slim")}
        with self.assertRaisesRegex(SandboxUnavailableError, "immutable SHA-256 digest"):
            build_docker_command("docker", policy, self.workspace, ["python", "-V"])

    def test_unapproved_environment_variables_fail_closed(self):
        with self.assertRaisesRegex(SandboxUnavailableError, "non-allowlisted"):
            build_docker_command(
                "docker",
                POLICY,
                self.workspace,
                ["python", "-V"],
                extra_env={"GITHUB_TOKEN": "must-not-enter"},
            )

    def test_path_with_mount_delimiter_is_rejected(self):
        awkward = self.root / "path,with,commas"
        awkward.mkdir()
        with self.assertRaisesRegex(SandboxUnavailableError, "mount delimiter"):
            build_docker_command("docker", POLICY, awkward, ["python", "-V"])

    def test_missing_docker_fails_closed_without_host_fallback(self):
        with patch("sandbox_runtime.shutil.which", return_value=None):
            with self.assertRaisesRegex(SandboxUnavailableError, "Docker is unavailable"):
                run_sandboxed(["python", "-V"], self.workspace, 5, policy=POLICY)

    def test_wrong_local_image_id_fails_closed(self):
        completed = subprocess.CompletedProcess(
            args=["docker", "image", "inspect"], returncode=0, stdout="sha256:" + "0" * 64 + "\n"
        )
        with patch("sandbox_runtime.shutil.which", return_value="/usr/bin/docker"), patch(
            "sandbox_runtime.subprocess.run", return_value=completed
        ):
            with self.assertRaisesRegex(SandboxUnavailableError, "does not match protected policy"):
                run_sandboxed(["python", "-V"], self.workspace, 5, policy=POLICY)

    def test_invalid_sandbox_run_id_is_rejected(self):
        with self.assertRaisesRegex(SandboxUnavailableError, "32-character lowercase hex"):
            build_docker_command(
                "docker",
                POLICY,
                self.workspace,
                ["python", "-V"],
                run_id="../unsafe",
            )

    def test_timeout_cleanup_uses_cidfile_and_still_discovers_labelled_containers(self):
        cidfile = self.root / "container.cid"
        cidfile.write_text("abcdef123456\n", encoding="utf-8")
        active = {"0123456789ab"}
        calls = []

        def fake_run(args, **kwargs):
            calls.append(args)
            if args[1:3] == ["ps", "-aq"]:
                return subprocess.CompletedProcess(args=args, returncode=0, stdout="\n".join(sorted(active)))
            if args[1:2] == ["rm"] and len(args) >= 4:
                active.discard(args[-1])
            return subprocess.CompletedProcess(args=args, returncode=0, stdout="")

        with patch("sandbox_runtime.subprocess.run", side_effect=fake_run):
            cleaned = _stop_container("/usr/bin/docker", cidfile, "c" * 32)

        self.assertTrue(cleaned)
        self.assertIn(["/usr/bin/docker", "kill", "abcdef123456"], calls)
        self.assertIn(["/usr/bin/docker", "rm", "-f", "abcdef123456"], calls)
        self.assertIn(["/usr/bin/docker", "kill", "0123456789ab"], calls)
        self.assertIn(["/usr/bin/docker", "rm", "-f", "0123456789ab"], calls)
        self.assertEqual(active, set())

    def test_timeout_cleanup_finds_container_when_cidfile_is_missing(self):
        cidfile = self.root / "missing-container.cid"
        run_id = "d" * 32
        active = {"0123456789ab"}
        calls = []

        def fake_run(args, **kwargs):
            calls.append(args)
            if args[1:3] == ["ps", "-aq"]:
                self.assertIn(f"label=nova.rsi.run_id={run_id}", args)
                return subprocess.CompletedProcess(args=args, returncode=0, stdout="\n".join(sorted(active)))
            if args[1:2] == ["rm"] and len(args) >= 4:
                active.discard(args[-1])
            return subprocess.CompletedProcess(args=args, returncode=0, stdout="")

        with patch("sandbox_runtime.subprocess.run", side_effect=fake_run):
            cleaned = _stop_container("/usr/bin/docker", cidfile, run_id)

        self.assertTrue(cleaned)
        self.assertIn(["/usr/bin/docker", "kill", "0123456789ab"], calls)
        self.assertIn(["/usr/bin/docker", "rm", "-f", "0123456789ab"], calls)
        self.assertEqual(active, set())

    def test_timeout_cleanup_uses_label_when_cidfile_is_malformed(self):
        cidfile = self.root / "malformed-container.cid"
        cidfile.write_text("not-a-container-id\n", encoding="utf-8")
        run_id = "e" * 32
        active = {"fedcba987654"}
        calls = []

        def fake_run(args, **kwargs):
            calls.append(args)
            if args[1:3] == ["ps", "-aq"]:
                return subprocess.CompletedProcess(args=args, returncode=0, stdout="\n".join(sorted(active)))
            if args[1:2] == ["rm"] and len(args) >= 4:
                active.discard(args[-1])
            return subprocess.CompletedProcess(args=args, returncode=0, stdout="")

        with patch("sandbox_runtime.subprocess.run", side_effect=fake_run):
            cleaned = _stop_container("/usr/bin/docker", cidfile, run_id)

        self.assertTrue(cleaned)
        self.assertIn(["/usr/bin/docker", "kill", "fedcba987654"], calls)
        self.assertIn(["/usr/bin/docker", "rm", "-f", "fedcba987654"], calls)
        self.assertEqual(active, set())

    def test_timeout_cleanup_fails_when_docker_cannot_confirm_removal(self):
        cidfile = self.root / "stuck-container.cid"
        cidfile.write_text("0123456789ab\n", encoding="utf-8")
        calls = []

        def fake_run(args, **kwargs):
            calls.append(args)
            if args[1:3] == ["ps", "-aq"]:
                return subprocess.CompletedProcess(args=args, returncode=0, stdout="0123456789ab\n")
            return subprocess.CompletedProcess(args=args, returncode=0, stdout="")

        with patch("sandbox_runtime.subprocess.run", side_effect=fake_run):
            cleaned = _stop_container("/usr/bin/docker", cidfile, "f" * 32)

        self.assertFalse(cleaned)

    def test_timeout_raises_blocked_error_if_container_cleanup_cannot_be_verified(self):
        cidfile_id = "0123456789ab"
        calls = []

        def fake_run(args, **kwargs):
            calls.append(args)
            if args[1:3] == ["image", "inspect"]:
                return subprocess.CompletedProcess(args=args, returncode=0, stdout=IMAGE_ID + "\n")
            if args[1:3] == ["ps", "-aq"]:
                return subprocess.CompletedProcess(args=args, returncode=0, stdout=cidfile_id + "\n")
            return subprocess.CompletedProcess(args=args, returncode=0, stdout="")

        timeout = subprocess.TimeoutExpired(["docker", "run"], 5, output=b"started")
        with patch("sandbox_runtime.shutil.which", return_value="/usr/bin/docker"), patch(
            "sandbox_runtime.subprocess.run", side_effect=fake_run
        ), patch("sandbox_runtime._run_bounded", side_effect=timeout):
            with self.assertRaisesRegex(SandboxUnavailableError, "could not confirm"):
                run_sandboxed(
                    ["python", "-c", "pass"],
                    self.workspace,
                    5,
                    policy=POLICY,
                    run_id="a" * 32,
                )

    def test_output_limit_returns_blocked_when_cleanup_unconfirmed(self):
        cidfile_id = "0123456789ab"

        def fake_run(args, **kwargs):
            if args[1:3] == ["image", "inspect"]:
                return subprocess.CompletedProcess(args=args, returncode=0, stdout=IMAGE_ID + "\n")
            if args[1:3] == ["ps", "-aq"]:
                return subprocess.CompletedProcess(args=args, returncode=0, stdout=cidfile_id + "\n")
            return subprocess.CompletedProcess(args=args, returncode=0, stdout="")

        with patch("sandbox_runtime.shutil.which", return_value="/usr/bin/docker"), patch(
            "sandbox_runtime.subprocess.run", side_effect=fake_run
        ), patch(
            "sandbox_runtime._run_bounded",
            return_value=(125, "[RSI sandbox output limit exceeded]", 0.2),
        ):
            with self.assertRaisesRegex(SandboxUnavailableError, "output limit was exceeded"):
                run_sandboxed(
                    ["python", "-c", "print('x')"],
                    self.workspace,
                    5,
                    policy=POLICY,
                    run_id="9" * 32,
                )

    def test_output_limit_terminates_producer_and_bounds_capture(self):
        code, output, _duration = _run_bounded(
            [sys.executable, "-c", "print('x' * 50000)"],
            timeout=5,
            max_output_bytes=100,
        )
        self.assertEqual(code, 125)
        self.assertLess(len(output.encode("utf-8")), 250)
        self.assertIn("output limit exceeded", output)


if __name__ == "__main__":
    unittest.main()
