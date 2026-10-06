import os
import sys
import unittest
from pathlib import Path

# Keep the test runnable both through unittest discovery and directly.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from evaluator import benchmark, implementation_ready, parse_benchmark_output, normalize_repo_path, safe_env


class EvaluatorBenchmarkTests(unittest.TestCase):
    ROOT = Path(__file__).resolve().parents[3]

    def setUp(self):
        self.previous_command = os.environ.get("RSI_BENCHMARK_COMMAND")

    def tearDown(self):
        if self.previous_command is None:
            os.environ.pop("RSI_BENCHMARK_COMMAND", None)
        else:
            os.environ["RSI_BENCHMARK_COMMAND"] = self.previous_command

    def test_incomplete_policy_blocks_operational_readiness(self):
        policy = {
            "implementation_readiness": {
                "status": "INCOMPLETE",
                "require_explicit_ready": True,
                "promotion_blocked_until_ready": True,
            }
        }
        self.assertFalse(implementation_ready(policy))

    def test_benchmark_requires_boolean_candidate_better(self):
        with self.assertRaises(ValueError):
            parse_benchmark_output(
                '{"candidate_better":"true"}', "baseline-sha", "candidate-sha"
            )

    def test_benchmark_passes_machine_verifiable_success(self):
        os.environ["RSI_BENCHMARK_COMMAND"] = (
            'python -c \'import json,os; print(json.dumps({"candidate_better": True, '
            '"baseline": os.environ["RSI_BASELINE_COMMIT"], '
            '"candidate": os.environ["RSI_CANDIDATE_COMMIT"]}))\''
        )
        result = benchmark(
            self.ROOT,
            "baseline-sha",
            "candidate-sha",
            30,
            {"sandbox": {"max_output_bytes": 32000}},
        )
        self.assertEqual(result["status"], "PASS")
        self.assertTrue(result["candidate_better"])
        self.assertEqual(result["evidence"]["baseline"], "baseline-sha")
        self.assertEqual(result["evidence"]["candidate"], "candidate-sha")

    def test_benchmark_fails_when_candidate_is_not_better(self):
        os.environ["RSI_BENCHMARK_COMMAND"] = (
            'python -c \'import json,os; print(json.dumps({"candidate_better": False, "baseline_commit": os.environ["RSI_BASELINE_COMMIT"], "candidate_commit": os.environ["RSI_CANDIDATE_COMMIT"]}))\''
        )
        result = benchmark(
            self.ROOT,
            "baseline-sha",
            "candidate-sha",
            30,
            {"sandbox": {"max_output_bytes": 32000}},
        )
        self.assertEqual(result["status"], "FAIL")


    def test_benchmark_requires_exact_commit_identifiers(self):
        with self.assertRaises(ValueError):
            parse_benchmark_output(
                '{"candidate_better":true,"baseline_commit":"wrong","candidate_commit":"candidate-sha"}',
                "baseline-sha",
                "candidate-sha",
            )

    def test_safe_env_strips_secrets_and_cloud_credentials(self):
        os.environ["AWS_ACCESS_KEY_ID"] = "blocked"
        env = safe_env({
            "RSI_BASELINE_COMMIT": "baseline-sha",
            "GITHUB_TOKEN": "should-not-pass",
            "CUSTOM_VALUE": "allowed",
        })
        self.assertNotIn("AWS_ACCESS_KEY_ID", env)
        self.assertNotIn("GITHUB_TOKEN", env)
        self.assertNotIn("CUSTOM_VALUE", env) if "custom_value" in env else None

    def test_repo_path_normalization_rejects_traversal(self):
        self.assertEqual(normalize_repo_path("../../.github/workflows/x.yml"), "")

if __name__ == "__main__":
    unittest.main()
