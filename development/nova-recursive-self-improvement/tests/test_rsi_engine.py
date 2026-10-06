import sys
import unittest
from pathlib import Path

# Keep the test runnable both through unittest discovery and directly.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from rsi_engine import (
    classify_decision,
    extract_candidate_payload,
    load_policy,
    normalize_usage,
    validate_patch_content,
    validate_patch_paths,
)


class RsiEngineTests(unittest.TestCase):
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
```"""
        )
        self.assertIn("diff --git", payload["patch"])
        self.assertIn("--- a/development/x.txt", payload["patch"])
        self.assertIn("+++ b/development/x.txt", payload["patch"])

    def test_protected_paths_are_rejected(self):
        policy = load_policy(Path(__file__).resolve().parents[3])
        errors = validate_patch_paths(
            [
                "development/nova-recursive-self-improvement/evaluator.py",
                "development/nova-ai-orchestration/example.py",
            ],
            policy,
        )
        self.assertTrue(errors)

    def test_policy_defines_candidate_scope(self):
        policy = load_policy(Path(__file__).resolve().parents[3])
        scope = policy["candidate_scope"]
        self.assertIn("development/", scope["allowed_prefixes"])
        self.assertIn(
            "development/nova-recursive-self-improvement/rsi_engine.py",
            scope["protected_paths"],
        )
        self.assertIn("secret", scope["forbidden_path_fragments"])

    def test_secret_patterns_are_rejected(self):
        errors = validate_patch_content("api_key = 'not-a-real-secret'")
        self.assertTrue(errors)

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
