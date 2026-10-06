import os
import sys
import unittest
from pathlib import Path

# Keep the test runnable both through unittest discovery and directly.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from evaluator import benchmark, parse_benchmark_output


class EvaluatorBenchmarkTests(unittest.TestCase):
    ROOT = Path(__file__).resolve().parents[3]

    def setUp(self):
        self.previous_command = os.environ.get("RSI_BENCHMARK_COMMAND")

    def tearDown(self):
        if self.previous_command is None:
            os.environ.pop("RSI_BENCHMARK_COMMAND", None)
        else:
            os.environ["RSI_BENCHMARK_COMMAND"] = self.previous_command

    def test_benchmark_requires_boolean_candidate_better(self):
        with self.assertRaises(ValueError):
            parse_benchmark_output('{"candidate_better":"true"}')

    def test_benchmark_passes_machine_verifiable_success(self):
        os.environ["RSI_BENCHMARK_COMMAND"] = (
            "python -c "import json,os; "
            "print(json.dumps({'candidate_better': True, "
            "'baseline': os.environ['RSI_BASELINE_COMMIT'], "
            "'candidate': os.environ['RSI_CANDIDATE_COMMIT']}))""
        )
        result = benchmark(self.ROOT, "baseline-sha", "candidate-sha", 30)
        self.assertEqual(result["status"], "PASS")
        self.assertTrue(result["candidate_better"])
        self.assertEqual(result["evidence"]["baseline"], "baseline-sha")
        self.assertEqual(result["evidence"]["candidate"], "candidate-sha")

    def test_benchmark_fails_when_candidate_is_not_better(self):
        os.environ["RSI_BENCHMARK_COMMAND"] = (
            "python -c "import json; "
            "print(json.dumps({'candidate_better': False}))""
        )
        result = benchmark(self.ROOT, "baseline-sha", "candidate-sha", 30)
        self.assertEqual(result["status"], "FAIL")


if __name__ == "__main__":
    unittest.main()
