import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from benchmark_dispatcher import resolve_profile


PACKER_PATH = "development/nova-context-memory-optimization/context_packer.py"
COMMAND = [
    "python",
    "development/nova-recursive-self-improvement/benchmarks/run_context_packing_benchmark.py",
]


def profile(enabled=True, command=None):
    return {
        "profile_id": "context-packing-test",
        "exact_changed_paths": [PACKER_PATH],
        "command": list(command if command is not None else COMMAND),
        "enabled": enabled,
        "review_status": "test-only",
    }


def config(*profiles):
    return {"schema_version": 1, "profiles": list(profiles)}


class BenchmarkDispatcherTests(unittest.TestCase):
    def test_exact_scope_and_matching_command_select_enabled_profile(self):
        result = resolve_profile(config(profile()), [PACKER_PATH], " ".join(COMMAND))
        self.assertEqual(result["status"], "READY")
        self.assertEqual(result["profile_id"], "context-packing-test")
        self.assertEqual(result["command"], COMMAND)
        self.assertEqual(result["scope"], [PACKER_PATH])

    def test_disabled_production_profile_remains_blocked(self):
        result = resolve_profile(config(profile(enabled=False)), [PACKER_PATH], " ".join(COMMAND))
        self.assertEqual(result["status"], "BLOCKED")
        self.assertIn("disabled", result["reason"])

    def test_mixed_scope_candidate_is_blocked(self):
        result = resolve_profile(
            config(profile()),
            [PACKER_PATH, "development/nova-ai-orchestration/README.md"],
            " ".join(COMMAND),
        )
        self.assertEqual(result["status"], "BLOCKED")
        self.assertIn("No unique benchmark profile", result["reason"])

    def test_unrelated_candidate_scope_is_blocked(self):
        result = resolve_profile(
            config(profile()),
            ["development/nova-ai-orchestration/router.py"],
            " ".join(COMMAND),
        )
        self.assertEqual(result["status"], "BLOCKED")

    def test_command_mismatch_is_blocked(self):
        result = resolve_profile(
            config(profile()),
            [PACKER_PATH],
            "python -c 'print(1)'",
        )
        self.assertEqual(result["status"], "BLOCKED")
        self.assertIn("does not exactly match", result["reason"])

    def test_missing_command_is_blocked(self):
        result = resolve_profile(config(profile()), [PACKER_PATH], "")
        self.assertEqual(result["status"], "BLOCKED")
        self.assertIn("not configured", result["reason"])

    def test_malformed_registry_is_blocked(self):
        for value in (None, [], {"schema_version": 2, "profiles": []}, {"schema_version": 1, "profiles": "bad"}):
            with self.subTest(value=value):
                result = resolve_profile(value, [PACKER_PATH], " ".join(COMMAND))
                self.assertEqual(result["status"], "BLOCKED")

    def test_duplicate_and_traversal_paths_are_blocked(self):
        for paths in (
            [PACKER_PATH, PACKER_PATH],
            ["development/../.github/workflows/nova-rsi.yml"],
            ["/etc/passwd"],
        ):
            with self.subTest(paths=paths):
                result = resolve_profile(config(profile()), paths, " ".join(COMMAND))
                self.assertEqual(result["status"], "BLOCKED")

    def test_ambiguous_multiple_profiles_are_blocked(self):
        result = resolve_profile(config(profile(), profile()), [PACKER_PATH], " ".join(COMMAND))
        self.assertEqual(result["status"], "BLOCKED")
        self.assertIn("No unique benchmark profile", result["reason"])


if __name__ == "__main__":
    unittest.main()
