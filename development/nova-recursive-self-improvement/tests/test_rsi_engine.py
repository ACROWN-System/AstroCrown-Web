import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from rsi_engine import (
    classify_decision,
    extract_candidate_payload,
    implementation_ready,
    load_policy,
    materialize_trusted_control_plane,
    normalize_repo_path,
    normalize_usage,
    validate_candidate_payload,
    validate_patch_content,
    validate_patch_paths,
)


class RsiEngineTests(unittest.TestCase):
    ROOT = Path(__file__).resolve().parents[3]

    def test_extract_json_candidate(self):
        payload = extract_candidate_payload(
            '{"candidate_id":"c1","hypothesis":"improve","rationale":"test","patch":"diff"}'
        )
        self.assertEqual(payload["candidate_id"], "c1")
        self.assertEqual(payload["patch"], "diff")

    def test_extract_diff_fallback(self):
        payload = extract_candidate_payload(
            """```diff
diff --git a/development/x.txt b/development/x.txt
--- a/development/x.txt
+++ b/development/x.txt
@@ -1 +1 @@
-old
+new
\`\`\`"""
        )
        self.assertIn("diff --git", payload["patch"])
        self.assertIn("--- a/development/x.txt", payload["patch"])
        self.assertIn("+++ b/development/x.txt", payload["patch"])

    def test_trusted_control_plane_is_copied_from_trusted_checkout(self):
        import tempfile
        import shutil
        import stat

        with tempfile.TemporaryDirectory(prefix="nova-control-plane-test-") as temp:
            root = Path(temp)
            trusted_dir = root / "trusted" / "development/nova-recursive-self-improvement"
            trusted_dir.mkdir(parents=True)
            candidate_dir = root / "candidate" / "development/nova-recursive-self-improvement"
            candidate_dir.mkdir(parents=True)
            filenames = (
                "evaluator.py",
                "benchmark_dispatcher.py",
                "sandbox_runtime.py",
                "rsi_policy.json",
                "benchmark_profiles.json",
            )
            for filename in filenames:
                (trusted_dir / filename).write_text(
                    f"trusted:{filename}", encoding="utf-8"
                )
                (candidate_dir / filename).write_text(
                    f"candidate-controlled:{filename}", encoding="utf-8"
                )

            control_dir = root / "trusted-control"
            copied = materialize_trusted_control_plane(root / "trusted", control_dir)
            self.assertEqual(set(copied), set(filenames))
            for filename, path in copied.items():
                self.assertEqual(
                    path.read_text(encoding="utf-8"),
                    f"trusted:{filename}",
                )
                self.assertFalse(
                    stat.S_IMODE(path.stat().st_mode) & stat.S_IWUSR,
                    f"{filename} must not be owner-writable",
                )
                self.assertNotIn(
                    "candidate-controlled",
                    path.read_text(encoding="utf-8"),
                )

    def test_rsi_workflow_is_restricted_to_main_ref(self):
        workflow = (
            self.ROOT / ".github/workflows/nova-rsi.yml"
        ).read_text(encoding="utf-8")
        readiness_job = workflow.split(
            "  implementation-readiness:", 1
        )[1].split("\n  budget-gate:", 1)[0]
        self.assertIn("if: github.ref == 'refs/heads/main'", readiness_job)

    def test_protected_paths_are_rejected(self):
        policy = load_policy(self.ROOT)
        errors = validate_patch_paths(
            [
                "development/nova-recursive-self-improvement/evaluator.py",
                "development/nova-ai-orchestration/example.py",
            ],
            policy,
        )
        self.assertTrue(errors)

    def test_incomplete_policy_blocks_rsi(self):
        policy = load_policy(self.ROOT)
        self.assertFalse(implementation_ready(policy))
        self.assertEqual(policy["implementation_readiness"]["status"], "INCOMPLETE")

    def test_path_traversal_is_rejected(self):
        self.assertEqual(normalize_repo_path("../../.github/workflows/x.yml"), "")
        policy = load_policy(self.ROOT)
        self.assertTrue(validate_patch_paths(["../../.github/workflows/x.yml"], policy))

    def test_candidate_contract_requires_exact_baseline(self):
        policy = load_policy(self.ROOT)
        patch = (
            "diff --git a/development/x b/development/x\\n"
            "--- a/development/x\\n"
            "+++ b/development/x\\n"
            "@@ -1 +1 @@\\n"
            "-a\\n+b\\n"
        )
        candidate = {
            "candidate_id": "c1",
            "baseline_commit": "different",
            "hypothesis": "improve",
            "rationale": "testable",
            "patch": patch,
        }
        self.assertTrue(validate_candidate_payload(candidate, "baseline", policy))
        candidate["baseline_commit"] = "baseline"
        self.assertFalse(validate_candidate_payload(candidate, "baseline", policy))

    def test_policy_defines_candidate_scope(self):
        policy = load_policy(self.ROOT)
        scope = policy["candidate_scope"]
        self.assertIn("development/", scope["allowed_prefixes"])
        self.assertIn(
            "development/nova-recursive-self-improvement/rsi_engine.py",
            scope["protected_paths"],
        )
        self.assertIn("secret", scope["forbidden_path_fragments"])
        self.assertEqual(
            policy["provider"]["default_base_url"],
            "https://inference.nosana.com/v1",
        )

    def test_secret_patterns_and_unsafe_patch_features_are_rejected(self):
        self.assertTrue(validate_patch_content("api_key = 'not-a-real-secret'"))
        self.assertTrue(validate_patch_content("GIT binary patch"))
        self.assertTrue(
            validate_patch_content(
                "rename from development/a\\nrename to development/b"
            )
        )

    def test_usage_is_normalized(self):
        usage = normalize_usage(
            {"prompt_tokens": 4000, "completion_tokens": 800, "total_tokens": 4800}
        )
        self.assertEqual(usage["total_tokens"], 4800)

    def test_usage_rejects_invalid_or_inconsistent_token_counts(self):
        invalid_cases = (
            {"prompt_tokens": -1, "completion_tokens": 10, "total_tokens": 9},
            {"prompt_tokens": True, "completion_tokens": 10, "total_tokens": 11},
            {"prompt_tokens": 1.5, "completion_tokens": 2, "total_tokens": 3},
            {"prompt_tokens": 10, "completion_tokens": 20, "total_tokens": 25},
            {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
            {"total_tokens": 0},
            {"prompt_tokens": "10", "completion_tokens": 2, "total_tokens": 12},
        )
        for raw_usage in invalid_cases:
            with self.subTest(raw_usage=raw_usage):
                self.assertIsNone(normalize_usage(raw_usage))

    def test_usage_derives_total_only_from_complete_valid_counts(self):
        usage = normalize_usage({"prompt_tokens": 100, "completion_tokens": 25})
        self.assertEqual(usage["total_tokens"], 125)
        self.assertIsNone(normalize_usage({"prompt_tokens": 100}))

    def test_missing_usage_is_not_fabricated(self):
        self.assertIsNone(normalize_usage(None))

    def test_decision_precedence(self):
        self.assertEqual(classify_decision(["PASS", "PASS"]), "PASS")
        self.assertEqual(classify_decision(["PASS", "BLOCKED"]), "BLOCKED")
        self.assertEqual(classify_decision(["BLOCKED", "FAIL"]), "FAIL")


if __name__ == "__main__":
    unittest.main()
