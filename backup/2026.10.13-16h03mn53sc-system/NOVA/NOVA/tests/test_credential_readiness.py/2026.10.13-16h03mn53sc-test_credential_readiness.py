import os
import unittest
from unittest.mock import patch

from NOVA.credential_readiness import build_readiness_report, inspect_roster


class CredentialReadinessTests(unittest.TestCase):
    def test_missing_secret_is_required_not_configured(self):
        with patch.dict(os.environ, {}, clear=True):
            result = inspect_roster({"providers": [{"name": "test", "api_key_env": "TEST_KEY"}]})
        self.assertEqual(result["providers"][0]["status"], "REQUIRED_NOT_CONFIGURED")

    def test_configured_secret_is_not_marked_verified_without_live_probe(self):
        with patch.dict(os.environ, {"TEST_KEY": "secret"}):
            result = inspect_roster({"providers": [{"name": "test", "api_key_env": "TEST_KEY"}]})
        self.assertEqual(result["providers"][0]["status"], "CONFIGURED_NOT_VERIFIED")
        self.assertNotIn("secret", str(result))

    def test_account_and_api_secret_must_both_be_present(self):
        with patch.dict(os.environ, {"API_KEY": "secret"}, clear=True):
            result = inspect_roster({
                "providers": [{"name": "test", "api_key_env": "API_KEY", "account_id_env": "ACCOUNT_ID"}]
            })
        self.assertEqual(result["providers"][0]["status"], "REQUIRED_NOT_CONFIGURED")

    def test_gpu_candidates_are_reported_but_never_activated_by_key_presence(self):
        gpu_roster = {
            "providers": [],
            "candidates": [
                {"name": "nosana", "status": "candidate", "api_key_env": "NOSANA_GPU_API_KEY_01"},
                {"name": "huggingface_zerogpu", "status": "candidate", "api_key_env": "HF_ZEROGPU_TOKEN_01"},
            ],
        }
        with patch.dict(os.environ, {"NOSANA_GPU_API_KEY_01": "gpu-secret"}, clear=True):
            report = build_readiness_report({"providers": []}, gpu_roster)
        self.assertEqual(report["gpu"]["providers"], [])
        self.assertEqual(len(report["gpu"]["candidates"]), 2)
        self.assertEqual(report["gpu"]["candidates"][0]["activation_status"], "CANDIDATE_NOT_ACTIVATED")
        self.assertEqual(report["gpu"]["candidates"][0]["credential_status"], "CONFIGURED_NOT_VERIFIED")
        self.assertEqual(report["gpu"]["candidates"][1]["credential_status"], "REQUIRED_NOT_CONFIGURED")
        self.assertNotIn("gpu-secret", str(report))

    def test_combined_report_never_contains_secret_values(self):
        with patch.dict(os.environ, {"API_KEY": "secret-value", "GPU_KEY": "gpu-secret"}):
            result = build_readiness_report(
                {"providers": [{"name": "llm", "api_key_env": "API_KEY"}]},
                {"providers": [], "candidates": [{"name": "gpu", "api_key_env": "GPU_KEY"}]},
            )
        serialized = str(result)
        self.assertNotIn("secret-value", serialized)
        self.assertNotIn("gpu-secret", serialized)
        self.assertFalse(result["secret_values_exposed"])


if __name__ == "__main__":
    unittest.main()
