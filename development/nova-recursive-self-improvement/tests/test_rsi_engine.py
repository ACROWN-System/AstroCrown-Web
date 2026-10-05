import unittest

from rsi_engine import (
    classify_decision,
    extract_candidate_payload,
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
            "```diff\\ndiff --git a/development/x.txt b/development/x.txt\\n```"
        )
        self.assertIn("diff --git", payload["patch"])

    def test_protected_paths_are_rejected(self):
        errors = validate_patch_paths([
            "development/nova-recursive-self-improvement/evaluator.py",
            "development/nova-ai-orchestration/example.py",
        ])
        self.assertTrue(errors)

    def test_secret_patterns_are_rejected(self):
        errors = validate_patch_content("api_key = 'not-a-real-secret'")
        self.assertTrue(errors)

    def test_decision_precedence(self):
        self.assertEqual(classify_decision(["PASS", "PASS"]), "PASS")
        self.assertEqual(classify_decision(["PASS", "BLOCKED"]), "BLOCKED")
        self.assertEqual(classify_decision(["BLOCKED", "FAIL"]), "FAIL")


if __name__ == "__main__":
    unittest.main()
