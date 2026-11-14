import json
import tempfile
import unittest
from pathlib import Path
from email.message import Message
from unittest.mock import patch

from NOVA.provider_qualification import classify, safe_headers, build_report, probe, openai_text, persist_heartbeat_report, render_markdown


class ProviderQualificationTests(unittest.TestCase):
    def test_payment_and_quota_errors_are_distinct(self):
        expected = {
            302: "REDIRECT_BLOCKED",
            401: "AUTH_REJECTED",
            402: "PAYMENT_REQUIRED_OR_CREDITS_EXHAUSTED",
            403: "ACCESS_DENIED_OR_POLICY",
            404: "ENDPOINT_OR_MODEL_NOT_FOUND",
            429: "RATE_LIMITED_OR_QUOTA_EXHAUSTED",
            503: "PROVIDER_SERVER_ERROR",
        }
        for code, status in expected.items():
            with self.subTest(code=code):
                self.assertEqual(classify(code), status)

    def test_only_allowlisted_rate_limit_headers_are_reported(self):
        headers = Message()
        headers["x-ratelimit-remaining"] = "15"
        headers["x-ratelimit-remaining-req-minute"] = "0"
        headers["retry-after"] = "2"
        headers["set-cookie"] = "not-for-report"
        headers["x-debug-info"] = "not-for-report"
        self.assertEqual(safe_headers(headers), {
            "x-ratelimit-remaining": "15",
            "x-ratelimit-remaining-req-minute": "0",
            "retry-after": "2",
        })


    def test_successful_http_with_missing_marker_is_not_mislabelled_as_auth_failure(self):
        class FakeResponse:
            status = 200
            headers = {"x-ratelimit-remaining": "7"}

            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc, tb):
                return False

            def read(self, size):
                return json.dumps({
                    "choices": [{"message": {"content": "ordinary response"}}],
                    "usage": {"prompt_tokens": 3, "completion_tokens": 4, "total_tokens": 7},
                }).encode("utf-8")

        with patch("NOVA.provider_qualification.urllib.request.build_opener") as opener:
            opener.return_value.open.return_value = FakeResponse()
            result = probe(
                "fixture", "llm_inference", "FIXTURE_KEY", "configured-value",
                "https://provider.invalid/v1/chat/completions", "POST",
                {"Authorization": "Bearer configured-value"}, b"{}", openai_text,
            )
        self.assertEqual(result["http_status"], 200)
        self.assertEqual(result["status"], "RESPONSE_VALID_MARKER_MISSING")
        self.assertTrue(result["response_shape_valid"])
        self.assertFalse(result["probe_marker_present"])
        self.assertNotIn("ordinary response", json.dumps(result))
        self.assertEqual(result["usage"]["total_tokens"], 7)

    def test_empty_configuration_skips_all_endpoints(self):
        with patch("NOVA.provider_qualification.urllib.request.build_opener") as opener:
            report = build_report({})
        opener.assert_not_called()
        self.assertTrue(all(
            row["status"].startswith("SKIPPED")
            or row["status"] == "BLOCKED_CONTRACT_UNVERIFIED"
            for row in report["results"]
        ))
        cloudflare = next(row for row in report["results"] if row["provider"] == "cloudflare")
        self.assertEqual(cloudflare["status"], "SKIPPED_ALREADY_QUALIFIED")
        self.assertEqual(cloudflare["lifecycle_status"], "ACTIVE")
        self.assertIsNone(cloudflare["http_status"])
        self.assertTrue(report["diagnostic_only"])
        self.assertFalse(report["production_roster_mutated"])
        self.assertFalse(report["secret_values_exposed"])

    def test_cloudflare_markdown_shows_skip_and_linked_qualification_evidence(self):
        report = build_report({})
        markdown = render_markdown(report)
        self.assertIn("SKIPPED_ALREADY_QUALIFIED", markdown)
        self.assertIn("https://github.com/ACROWN-System/NOVA/actions/runs/38350563789", markdown)
        self.assertIn("@cf/meta/llama-3.1-8b-instruct-fast", markdown)
        self.assertNotIn("Cloudflare inference is blocked until", markdown)
        cloudflare_line = next(line for line in markdown.splitlines() if "| cloudflare |" in line)
        self.assertIn("| not checked |", cloudflare_line)

    def test_mistral_is_not_probed_even_if_deferred_secret_is_present(self):
        # The value is a synthetic placeholder, never a real credential.
        with patch("NOVA.provider_qualification.urllib.request.build_opener") as opener:
            report = build_report({"MISTRAL_API_KEY_01": "placeholder-only"})
        opener.assert_not_called()
        self.assertFalse(any("mistral" in row["provider"].lower() for row in report["results"]))
        self.assertNotIn("MISTRAL_API_KEY_01", json.dumps(report))
        self.assertNotIn("placeholder-only", json.dumps(report))

    def test_cloudflare_qualification_uses_recorded_smoke_evidence_without_duplicate_request(self):
        env = {
            "CLOUDFLARE_API_KEY_01": "synthetic-token-placeholder",
            "CLOUDFLARE_ACCOUNT_ID": "synthetic-account-placeholder",
        }
        with patch("NOVA.provider_qualification.urllib.request.build_opener") as opener:
            report = build_report(env)
        opener.assert_not_called()
        row = next(row for row in report["results"] if row["provider"] == "cloudflare")
        self.assertEqual(row["status"], "SKIPPED_ALREADY_QUALIFIED")
        self.assertEqual(row["lifecycle_status"], "ACTIVE")
        self.assertIsNone(row["credential_configured"])
        self.assertEqual(
            row["credential_configuration_status"],
            "NOT_EXPOSED_TO_DIAGNOSTIC_BY_POLICY",
        )
        self.assertEqual(row["model"], "@cf/meta/llama-3.1-8b-instruct-fast")
        self.assertEqual(row["qualification_evidence_url"], "https://github.com/ACROWN-System/NOVA/actions/runs/38350563789")
        self.assertIsNone(row["http_status"])
        self.assertNotIn("synthetic-token-placeholder", json.dumps(report))
        self.assertNotIn("synthetic-account-placeholder", json.dumps(report))

    def test_github_token_is_not_probed_or_counted_as_inference_capacity(self):
        with patch("NOVA.provider_qualification.urllib.request.build_opener") as opener:
            report = build_report({"GitHub_Token": "example-value"})
        opener.assert_not_called()
        self.assertFalse(any(row["provider"] == "github_api" for row in report["results"]))
        self.assertFalse(report["github_token_is_inference_provider"])
        self.assertNotIn("example-value", json.dumps(report))

    def test_heartbeat_persistence_is_separate_from_provider_routing_targets(self):
        report = {
            "observed_at": "2026-10-12T00:00:00+00:00",
            "results": [{
                "provider": "groq",
                "provider_type": "llm_inference",
                "credential_env": "GROQ_API_KEY_01",
                "credential_configured": True,
                "lifecycle_status": "ACTIVE",
                "status": "RATE_LIMITED_OR_QUOTA_EXHAUSTED",
                "http_status": 429,
                "latency_ms": 50,
                "rate_limit_headers": {"x-ratelimit-remaining-req-minute": "0"},
                "usage": {},
                "response_shape_valid": None,
                "probe_marker_present": None,
            }]
        }
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "health_state.json"
            persist_heartbeat_report(report, str(path))
            saved = json.loads(path.read_text(encoding="utf-8"))
        self.assertIn("groq", saved["credential_health"])
        self.assertEqual(
            saved["credential_health"]["groq"]["latest"]["status"],
            "RATE_LIMITED_OR_QUOTA_EXHAUSTED",
        )
        self.assertEqual(saved["targets"], {})
        self.assertNotIn("GROQ_API_KEY_01_VALUE", json.dumps(saved))



if __name__ == "__main__":
    unittest.main()
