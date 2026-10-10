import os
import shlex
import sys
import unittest
from unittest.mock import patch
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from evaluator import (
    benchmark,
    implementation_ready,
    normalize_repo_path,
    parse_benchmark_output,
    safe_env,
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
            "profiles": [
                {
                    "profile_id": "context-packing-test",
                    "exact_changed_paths": [
                        "development/nova-context-memory-optimization/context_packer.py"
                    ],
                    "command": command,
                    "enabled": True,
                    "review_status": "test-only",
                }
            ],
        }
        kwargs["profile_registry"] = profile_registry
        with patch("evaluator.git", side_effect=fake_git), patch(
            "evaluator.run_sandboxed", side_effect=fake_sandbox
        ):
            return benchmark(*args, **kwargs)

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

    def test_repo_path_normalization_rejects_traversal(self):
        self.assertEqual(normalize_repo_path("../../.github/workflows/x.yml"), "")


if __name__ == "__main__":
    unittest.main()
