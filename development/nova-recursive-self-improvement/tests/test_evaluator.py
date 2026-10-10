import os
import shlex
import sys
import unittest
from unittest.mock import patch
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from evaluator import (
    benchmark,
    evaluate,
    implementation_ready,
    normalize_repo_path,
    parse_benchmark_output,
    safe_env,
    unsafe_file_types,
    run as host_run,
)


class EvaluatorBenchmarkTests(unittest.TestCase):
    ROOT = Path(__file__).resolve().parents[3]

    def setUp(self):
        self.previous = {
            "RSI_BENCHMARK_COMMAND": os.environ.get("RSI_BENCHMARK_COMMAND"),
            "AWS_ACCESS_KEY_ID": os.environ.get("AWS_ACCESS_KEY_ID"),
        }

    def tearDown(self):
        for name, value in self.previous.items():
            if value is None:
                os.environ.pop(name, None)
            else:
                os.environ[name] = value

    def _run_benchmark_with_fake_sandbox(self, *args, **kwargs):
        def fake_sandbox(command, cwd, timeout, extra_env=None, *, policy=None, readonly_mounts=()):
            return host_run(command, cwd, timeout, extra_env=extra_env, policy=policy)

        def fake_git(root, *git_args):
            if git_args and git_args[0] == "show":
                return "def pack_context(items, query, max_chars):\n    return {}\n"
            if len(git_args) >= 2 and git_args[0] == "diff" and git_args[1] == "--name-only":
                return "development/nova-context-memory-optimization/context_packer.py"
            return ""

        command = shlex.split(os.environ["RSI_BENCHMARK_COMMAND"])
        profile_registry = {
            "schema_version": 1,
            "status": "INDEPENDENT_REVIEW_APPROVED",
            "profiles": [
                {
                    "profile_id": "context-packing-test",
                    "exact_changed_paths": [
                        "development/nova-context-memory-optimization/context_packer.py"
                    ],
                    "command": command,
                    "enabled": True,
                    "review_status": "INDEPENDENT_REVIEW_APPROVED",
                }
            ],
        }
        kwargs["profile_registry"] = profile_registry
        with patch("evaluator.git", side_effect=fake_git), patch(
            "evaluator.run_sandboxed", side_effect=fake_sandbox
        ):
            return benchmark(*args, **kwargs)

    def test_blocked_evaluator_evidence_records_schema_and_candidate_commit(self):
        candidate_commit = "b" * 40
        policy = {
            "evaluation": {"timeout_seconds": 10},
            "implementation_readiness": {
                "status": "INCOMPLETE",
                "require_explicit_ready": True,
                "promotion_blocked_until_ready": True,
            },
        }
        def fake_git(root, *args):
            return "c" * 40 if args and args[-1] == "HEAD^{tree}" else candidate_commit

        with patch("evaluator.git", side_effect=fake_git), patch(
            "evaluator.changed_files", return_value=[]
        ):
            result = evaluate(self.ROOT, "a" * 40, policy)

        self.assertEqual(result["decision"], "BLOCKED")
        self.assertEqual(result["schema_version"], 1)
        self.assertEqual(result["candidate_commit"], candidate_commit)
        self.assertEqual(result["candidate_tree"], "c" * 40)

    def test_passed_evaluator_evidence_records_exact_candidate_commit(self):
        candidate_commit = "b" * 40
        paths = ["development/sample.py"]
        policy = {
            "evaluation": {
                "timeout_seconds": 10,
                "require_benchmark": True,
            },
            "candidate_scope": {
                "allowed_prefixes": ["development/"],
                "protected_paths": [],
                "forbidden_path_fragments": [".env", ".git", "secret"],
            },
            "budget": {},
            "implementation_readiness": {
                "status": "READY",
                "require_explicit_ready": True,
                "promotion_blocked_until_ready": True,
            },
        }
        def fake_git(root, *args):
            return "c" * 40 if args and args[-1] == "HEAD^{tree}" else candidate_commit

        with patch("evaluator.git", side_effect=fake_git), patch(
            "evaluator.changed_files", return_value=paths
        ), patch(
            "evaluator.changed_statuses", return_value=[("A", paths[0])]
        ), patch(
            "evaluator.unsafe_file_types", return_value=[]
        ), patch(
            "evaluator.secret_findings", return_value=[]
        ), patch(
            "evaluator.run", return_value=(0, "ok", 0.01)
        ), patch(
            "evaluator.run_sandboxed", return_value=(0, "ok", 0.01)
        ), patch(
            "evaluator.benchmark", return_value={"status": "PASS"}
        ):
            result = evaluate(self.ROOT, "a" * 40, policy, profile_registry={"test": True})

        self.assertEqual(result["decision"], "PASS")
        self.assertEqual(result["schema_version"], 1)
        self.assertEqual(result["candidate_commit"], candidate_commit)
        self.assertEqual(result["candidate_tree"], "c" * 40)

    def test_incomplete_policy_blocks_operational_readiness(self):
        policy = {
            "implementation_readiness": {
                "status": "INCOMPLETE",
                "require_explicit_ready": True,
                "promotion_blocked_until_ready": True,
            }
        }
        self.assertFalse(implementation_ready(policy))

    def test_benchmark_requires_boolean_and_exact_commits(self):
        with self.assertRaises(ValueError):
            parse_benchmark_output(
                '{"candidate_better":"true","baseline_commit":"baseline-sha","candidate_commit":"candidate-sha"}',
                "baseline-sha",
                "candidate-sha",
            )
        with self.assertRaises(ValueError):
            parse_benchmark_output(
                '{"candidate_better":true,"baseline_commit":"wrong","candidate_commit":"candidate-sha"}',
                "baseline-sha",
                "candidate-sha",
            )

    def test_benchmark_passes_machine_verifiable_success(self):
        os.environ["RSI_BENCHMARK_COMMAND"] = (
            "python -c 'import json,os; print(json.dumps({"
            "\"candidate_better\": True, "
            "\"baseline_commit\": os.environ[\"RSI_BASELINE_COMMIT\"], "
            "\"candidate_commit\": os.environ[\"RSI_CANDIDATE_COMMIT\"]}))'"
        )
        result = self._run_benchmark_with_fake_sandbox(
            self.ROOT,
            "a" * 40,
            "b" * 40,
            30,
            {"sandbox": {"max_output_bytes": 32000}},
        )
        self.assertEqual(result["status"], "PASS")

    def test_benchmark_fails_when_candidate_is_not_better(self):
        os.environ["RSI_BENCHMARK_COMMAND"] = (
            "python -c 'import json,os; print(json.dumps({"
            "\"candidate_better\": False, "
            "\"baseline_commit\": os.environ[\"RSI_BASELINE_COMMIT\"], "
            "\"candidate_commit\": os.environ[\"RSI_CANDIDATE_COMMIT\"]}))'"
        )
        result = self._run_benchmark_with_fake_sandbox(
            self.ROOT,
            "a" * 40,
            "b" * 40,
            30,
            {"sandbox": {"max_output_bytes": 32000}},
        )
        self.assertEqual(result["status"], "FAIL")

    def test_safe_env_strips_secrets_and_cloud_credentials(self):
        os.environ["AWS_ACCESS_KEY_ID"] = "blocked"
        env = safe_env({
            "RSI_BASELINE_COMMIT": "baseline-sha",
            "GITHUB_TOKEN": "should-not-pass",
            "CUSTOM_VALUE": "allowed",
        })
        self.assertNotIn("AWS_ACCESS_KEY_ID", env)
        self.assertNotIn("GITHUB_TOKEN", env)
        self.assertEqual(env.get("CUSTOM_VALUE"), "allowed")

    def test_new_executable_file_fails_filesystem_integrity(self):
        import tempfile

        relative = "development/new_tool.py"
        with tempfile.TemporaryDirectory(prefix="nova-executable-mode-test-") as temp:
            root = Path(temp)
            file_path = root / relative
            file_path.parent.mkdir(parents=True)
            file_path.write_text("print('must not be retained')\n", encoding="utf-8")
            file_path.chmod(0o755)

            with patch(
                "evaluator.git",
                return_value=f" create mode 100755 {relative}",
            ):
                findings = unsafe_file_types(root, [relative], "a" * 40)

        self.assertIn(f"executable-mode:{relative}", findings)

    def test_repo_path_normalization_rejects_traversal_and_alternate_separators(self):
        self.assertEqual(normalize_repo_path("../../.github/workflows/x.yml"), "")
        self.assertEqual(
            normalize_repo_path(r"development\..\.github\workflows\x.yml"),
            "",
        )


if __name__ == "__main__":
    unittest.main()
