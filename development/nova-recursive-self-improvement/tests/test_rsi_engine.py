import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from rsi_engine import (
    classify_decision,
    extract_candidate_payload,
    implementation_ready,
    load_policy,
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

    def test_missing_usage_is_not_fabricated(self):
        self.assertIsNone(normalize_usage(None))

    def test_decision_precedence(self):
        self.assertEqual(classify_decision(["PASS", "PASS"]), "PASS")
        self.assertEqual(classify_decision(["PASS", "BLOCKED"]), "BLOCKED")
        self.assertEqual(classify_decision(["BLOCKED", "FAIL"]), "FAIL")


if __name__ == "__main__":
    unittest.main()
