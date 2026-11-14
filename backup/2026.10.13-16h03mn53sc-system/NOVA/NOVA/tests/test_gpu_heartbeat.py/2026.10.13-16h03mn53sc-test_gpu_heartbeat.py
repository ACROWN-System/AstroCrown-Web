import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from NOVA.gpu_heartbeat import check_candidate_credential, run


class GPUCredentialHeartbeatTests(unittest.TestCase):
    HF_PROVIDER = {
        "name": "huggingface_zerogpu",
        "api_key_env": "HF_ZEROGPU_TOKEN_01",
        "status": "candidate",
        "credential_check": {
            "url": "https://huggingface.co/api/whoami-v2",
            "method": "GET",
            "auth": "bearer",
            "expected_hosts": ["huggingface.co"],
        },
    }

    def test_missing_candidate_key_is_reported_without_network(self):
        with patch.dict("os.environ", {}, clear=True), patch(
            "NOVA.gpu_heartbeat.urllib.request.build_opener"
        ) as opener:
            result = check_candidate_credential(self.HF_PROVIDER)
        opener.assert_not_called()
        self.assertEqual(result["auth_probe_status"], "REQUIRED_NOT_CONFIGURED")
        self.assertEqual(result["candidate_status"], "CANDIDATE_NOT_ACTIVATED")
        self.assertEqual(result["gpu_capacity_status"], "UNVERIFIED")

    def test_huggingface_read_only_probe_validates_token_without_logging_identity(self):
        class FakeResponse:
            status = 200

            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc, tb):
                return False

            def read(self, size):
                return json.dumps({"name": "private-account", "orgs": []}).encode("utf-8")

        with patch.dict("os.environ", {"HF_ZEROGPU_TOKEN_01": "token-secret"}, clear=True), patch(
            "NOVA.gpu_heartbeat.urllib.request.build_opener"
        ) as opener:
            opener.return_value.open.return_value = FakeResponse()
            result = check_candidate_credential(self.HF_PROVIDER)

        self.assertEqual(result["api_status"], 200)
        self.assertEqual(result["auth_probe_status"], "TOKEN_AUTHENTICATED_GPU_QUOTA_UNVERIFIED")
        self.assertTrue(result["credential_configured"])
        self.assertNotIn("private-account", json.dumps(result))
        self.assertNotIn("token-secret", json.dumps(result))
        self.assertEqual(result["gpu_capacity_status"], "UNVERIFIED")

    def test_nosana_read_only_auth_probe_does_not_infer_credit_balance(self):
        class FakeResponse:
            status = 200

            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc, tb):
                return False

            def read(self, size):
                return json.dumps({
                    "assignedCredits": 100,
                    "reservedCredits": 25,
                    "settledCredits": 35,
                    "email": "private@example.invalid",
                }).encode("utf-8")

        provider = {
            "name": "nosana",
            "api_key_env": "NOSANA_GPU_API_KEY_01",
            "credential_check": {
                "url": "https://api.nosana.com/credits/balance",
                "method": "GET",
                "auth": "bearer",
                "expected_hosts": ["api.nosana.com"],
            },
        }
        with patch.dict("os.environ", {"NOSANA_GPU_API_KEY_01": "nosana-secret"}, clear=True), patch(
            "NOVA.gpu_heartbeat.urllib.request.build_opener"
        ) as opener:
            opener.return_value.open.return_value = FakeResponse()
            result = check_candidate_credential(provider)

        self.assertEqual(result["auth_probe_status"], "CREDENTIAL_AUTHENTICATED_READ_ONLY")
        self.assertIsNone(result["available_credits"])
        self.assertNotIn("private@example.invalid", json.dumps(result))
        self.assertNotIn("nosana-secret", json.dumps(result))
        self.assertEqual(result["gpu_capacity_status"], "UNVERIFIED")

    def test_candidate_url_must_be_https_and_allowlisted(self):
        provider = {
            **self.HF_PROVIDER,
            "credential_check": {
                "url": "https://attacker.example/whoami",
                "method": "GET",
                "auth": "bearer",
                "expected_hosts": ["attacker.example"],
            },
        }
        with patch.dict("os.environ", {"HF_ZEROGPU_TOKEN_01": "token-secret"}, clear=True), patch(
            "NOVA.gpu_heartbeat.urllib.request.build_opener"
        ) as opener:
            result = check_candidate_credential(provider)
        opener.assert_not_called()
        self.assertEqual(result["auth_probe_status"], "BLOCKED_UNSAFE_OR_UNSUPPORTED_ENDPOINT")

    def test_heartbeat_workflows_run_on_narrow_health_code_changes_and_six_hour_schedule(self):
        root = Path(__file__).resolve().parents[2]
        llm = (root / ".github/workflows/nova_heartbeat.yml").read_text(encoding="utf-8")
        gpu = (root / ".github/workflows/nova_GPU_heartbeat.yml").read_text(encoding="utf-8")

        self.assertIn("cron: '0 */6 * * *'", llm)
        self.assertIn("cron: '0 */6 * * *'", gpu)
        self.assertIn("NOVA/provider_qualification.py", llm)
        self.assertIn("NOVA/router.py", llm)
        self.assertIn("NOVA/quality_gate.py", llm)
        self.assertIn("NOVA/reasoning.py", llm)
        self.assertIn("NOVA/health.py", llm)
        self.assertIn("NOVA/roster.json", llm)
        self.assertNotIn(".github/workflows/nova_heartbeat.yml", llm)
        self.assertIn("NOVA/gpu_heartbeat.py", gpu)
        self.assertIn("NOVA/gpu_roster.json", gpu)
        self.assertIn("NOVA/gpu_capacity.py", gpu)
        self.assertIn("NOVA/gpu_capacity_evidence.json", gpu)
        self.assertIn("NOVA/health.py", gpu)
        self.assertIn(".github/workflows/nova_GPU_heartbeat.yml", gpu)
        self.assertIn("branches: [main]", llm)
        self.assertIn("branches: [main]", gpu)
        self.assertNotIn("MISTRAL_API_KEY_01", llm)
        self.assertNotIn("CEREBRAS_API_KEY_01", llm)
        self.assertNotIn("GitHub_Token", llm)


    def test_empty_gpu_heartbeat_persists_candidate_health_without_activating_provider(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / "NOVA").mkdir()
            (root / "NOVA/gpu_roster.json").write_text(json.dumps({
                "providers": [],
                "candidates": [self.HF_PROVIDER],
            }), encoding="utf-8")
            (root / "NOVA/health_policy.json").write_text("{}", encoding="utf-8")
            with patch("NOVA.gpu_heartbeat.check_candidate_credential", return_value={
                "provider": "huggingface_zerogpu",
                "credential_env": "HF_ZEROGPU_TOKEN_01",
                "candidate_status": "CANDIDATE_NOT_ACTIVATED",
                "credential_configured": False,
                "auth_probe_status": "REQUIRED_NOT_CONFIGURED",
                "api_status": None,
                "latency_ms": None,
                "gpu_capacity_status": "UNVERIFIED",
                "available_credits": None,
                "observed_at": "2026-10-12T00:00:00+00:00",
            }):
                self.assertEqual(run(root), 0)
            state = json.loads((root / "NOVA/health_state.json").read_text(encoding="utf-8"))

        self.assertEqual(state["last_gpu_heartbeat"]["status"], "UNCONFIGURED")
        self.assertEqual(
            state["updated_at"],
            state["last_gpu_heartbeat"]["observed_at"],
        )
        self.assertEqual(
            state["last_gpu_heartbeat"]["aggregate_capacity"]["planning_reference_gpu_minutes_per_month"],
            86400,
        )
        self.assertEqual(
            state["last_gpu_heartbeat"]["aggregate_capacity"]["planning_reference_status"],
            "PROVISIONAL_UNVALIDATED",
        )
        self.assertFalse(
            state["last_gpu_heartbeat"]["aggregate_capacity"]["planning_reference_is_requirement"]
        )
        self.assertEqual(
            state["last_gpu_heartbeat"]["aggregate_capacity"]["reference_feasibility_status"],
            "NOT_ESTABLISHED",
        )
        self.assertEqual(
            state["last_gpu_heartbeat"]["aggregate_capacity"]["verified_active_recurring_gpu_minutes_per_month"],
            0,
        )
        self.assertEqual(
            state["last_gpu_heartbeat"]["candidate_credentials"][0]["auth_probe_status"],
            "REQUIRED_NOT_CONFIGURED",
        )
        self.assertIn("huggingface_zerogpu", state["gpu_candidate_credential_health"])
        self.assertEqual(state["gpu_candidate_credential_health"]["huggingface_zerogpu"][0]["candidate_status"],
                         "CANDIDATE_NOT_ACTIVATED")
        self.assertEqual(state["targets"], {})


if __name__ == "__main__":
    unittest.main()
