import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from weak_rsi_report import collect_context, generate_report


class WeakRSIReportTests(unittest.TestCase):
    ROOT = Path(__file__).resolve().parents[3]

    def test_data_use_not_approved_blocks_before_any_provider_call(self):
        request_fn = Mock()
        result = generate_report(
            self.ROOT,
            provider="groq",
            data_use_eligibility="NOT_APPROVED",
            environ={"GROQ_API_KEY_01": "dummy-secret"},
            request_fn=request_fn,
        )
        request_fn.assert_not_called()
        self.assertEqual(result["decision"], "BLOCKED")
        self.assertEqual(result["provider_calls"], 0)
        self.assertFalse(result["source_changes_made"])
        self.assertNotIn("dummy-secret", json.dumps(result))

    def test_missing_selected_credential_blocks_without_fallback(self):
        request_fn = Mock()
        result = generate_report(
            self.ROOT,
            provider="gemini",
            data_use_eligibility="PASS_AFTER_REVIEW",
            environ={"GROQ_API_KEY_01": "groq-dummy"},
            request_fn=request_fn,
        )
        request_fn.assert_not_called()
        self.assertEqual(result["decision"], "BLOCKED")
        self.assertEqual(result["provider"], "gemini")
        self.assertEqual(result["provider_calls"], 0)
        self.assertNotIn("groq-dummy", json.dumps(result))

    def test_successful_provider_result_is_report_only_and_redacted(self):
        request_fn = Mock(return_value=({
            "choices": [{"message": {"content": "NO_CHANGE_RECOMMENDED. No patch produced."}}],
            "usage": {"prompt_tokens": 100, "completion_tokens": 10, "total_tokens": 110},
        }, "openai/gpt-oss-20b"))
        result = generate_report(
            self.ROOT,
            provider="groq",
            data_use_eligibility="PASS_AFTER_REVIEW",
            environ={"GROQ_API_KEY_01": "gsk_test_secret_value_123456"},
            request_fn=request_fn,
        )
        request_fn.assert_called_once()
        self.assertEqual(result["decision"], "HUMAN_REVIEW_REQUIRED")
        self.assertEqual(result["provider_calls"], 1)
        self.assertFalse(result["source_changes_made"])
        self.assertFalse(result["candidate_execution_performed"])
        self.assertFalse(result["pull_request_created"])
        self.assertFalse(result["merge_performed"])
        self.assertIn("untrusted until human-reviewed", result["report_markdown"])
        self.assertNotIn("gsk_test_secret_value_123456", json.dumps(result))
        self.assertEqual(result["usage"]["total_tokens"], 110)

    def test_context_reader_only_reads_explicit_allowlist(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            safe = root / "development/Prompt-Guide.md"
            safe.parent.mkdir(parents=True)
            safe.write_text("Approved public development notes.", encoding="utf-8")
            secrets = root / ".env"
            secrets.write_text("SECRET=dont-read-me", encoding="utf-8")
            context, included = collect_context(root)
        self.assertIn("Approved public development notes.", context)
        self.assertNotIn("dont-read-me", context)
        self.assertEqual(included, ["development/Prompt-Guide.md"])

    def test_provider_choice_is_allowlisted(self):
        with self.assertRaises(ValueError):
            generate_report(
                self.ROOT,
                provider="unknown",
                data_use_eligibility="PASS_AFTER_REVIEW",
                environ={},
                request_fn=Mock(),
            )


if __name__ == "__main__":
    unittest.main()
