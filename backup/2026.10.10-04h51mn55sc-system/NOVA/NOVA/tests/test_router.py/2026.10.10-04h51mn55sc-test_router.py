import json
import os
import unittest
from email.message import Message
from io import BytesIO
import urllib.error
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import MagicMock, patch

from NOVA.health import _state_defaults
from NOVA.router import (
    advance_scheduled_probe_rotation,
    call_openai_compatible,
    classify_http_error,
    diagnostic_http_headers,
    health_order_providers,
    scheduled_probe_provider_order,
)


def provider(name: str, status: str = "active") -> dict:
    return {"name": name, "status": status}


class RouterRotationTests(unittest.TestCase):
    def setUp(self):
        self.providers = [
            provider("groq"),
            provider("gemini"),
            provider("cerebras"),
            provider("test_provider_d"),
            provider("cloudflare"),
        ]
        self.state = _state_defaults()

    def test_stale_provider_is_deprioritized_when_age_boundary_is_enabled(self):
        old = (datetime.now(timezone.utc) - timedelta(hours=8)).isoformat()
        self.state["targets"]["ai-heart:groq:model"] = {
            "health_status": "HEALTHY",
            "last_observation": {"observed_at": old},
        }

        ordered = health_order_providers(
            self.providers[:2],
            self.state,
            max_observation_age_seconds=6 * 3600,
        )

        self.assertEqual([item["name"] for item in ordered], ["gemini", "groq"])

    def test_order_providers_accepts_task_context_without_live_credentials(self):
        ordered = health_order_providers(
            self.providers[:2],
            self.state,
            max_observation_age_seconds=6 * 3600,
        )
        self.assertEqual(len(ordered), 2)

    def test_scheduled_provider_is_first_even_when_degraded(self):
        self.state["provider_rotation"]["ai-heart"]["next_index"] = 1
        self.state["targets"]["ai-heart:gemini:model"] = {"health_status": "UNACCEPTABLE"}
        self.state["targets"]["ai-heart:groq:model"] = {"health_status": "DEGRADED"}

        ordered = scheduled_probe_provider_order(self.providers, self.state)

        self.assertEqual(
            [item["name"] for item in ordered],
            ["gemini", "cerebras", "test_provider_d", "cloudflare", "groq"],
        )

    def test_rotation_advances_to_next_unprobed_provider(self):
        rotation = self.state["provider_rotation"]["ai-heart"]

        with patch.dict(os.environ, {"NOVA_ADVANCE_PROVIDER_ROTATION": "true"}):
            scheduled = scheduled_probe_provider_order(self.providers, self.state)[0]
            self.assertEqual(scheduled["name"], "groq")

            probed = ["groq", "cerebras", "cloudflare", "gemini"]
            advance_scheduled_probe_rotation(
                self.state, self.providers, scheduled, probed
            )

        self.assertEqual(rotation["next_provider"], "test_provider_d")
        self.assertEqual(rotation["next_index"], 3)
        self.assertEqual(rotation["last_probe_providers"], probed)

    def test_rotation_continues_without_retesting_previous_heartbeat_probes(self):
        rotation = self.state["provider_rotation"]["ai-heart"]
        rotation["next_provider"] = "test_provider_d"
        rotation["last_probe_providers"] = ["groq", "cerebras", "cloudflare", "gemini"]

        ordered = scheduled_probe_provider_order(self.providers, self.state)
        self.assertEqual(ordered[0]["name"], "test_provider_d")

    def test_rotation_falls_back_to_next_active_after_scheduled_provider_is_down(self):
        rotation = self.state["provider_rotation"]["ai-heart"]
        rotation["next_provider"] = "test_provider_d"
        self.providers[4]["status"] = "down"

        with patch.dict(os.environ, {"NOVA_ADVANCE_PROVIDER_ROTATION": "true"}):
            scheduled = scheduled_probe_provider_order(self.providers, self.state)[0]
            self.assertEqual(scheduled["name"], "test_provider_d")

            self.providers[0]["status"] = "down"
            advance_scheduled_probe_rotation(
                self.state, self.providers, scheduled, ["test_provider_d"]
            )

        self.assertEqual(rotation["next_provider"], "gemini")
        self.assertEqual(rotation["next_index"], 0)

    def test_legacy_index_state_remains_supported(self):
        rotation = self.state["provider_rotation"]["ai-heart"]
        rotation["next_index"] = 2
        rotation["next_provider"] = None

        ordered = scheduled_probe_provider_order(self.providers, self.state)

        self.assertEqual(ordered[0]["name"], "cerebras")


    def test_http_error_preserves_original_body_and_classifies_case_insensitively(self):
        headers = Message()
        error = urllib.error.HTTPError(
            "https://api.mistral.ai/v1/chat/completions",
            429,
            "Too Many Requests",
            headers,
            BytesIO(b'{"message":"Rate Limit Exceeded","type":"rate_limited","code":"1300"}'),
        )

        signal, body = classify_http_error(error)

        self.assertEqual(signal, "transient")
        self.assertIn("Rate Limit Exceeded", body)

    def test_diagnostic_http_headers_are_allowlisted_and_case_insensitive(self):
        headers = Message()
        headers["Retry-After"] = "12"
        headers["X-RateLimit-Remaining-Requests"] = "0"
        headers["X-Request-Id"] = "req-123"
        headers["Mistral-Correlation-Id"] = "mistral-corr-123"
        headers["X-Kong-Request-Id"] = "kong-req-123"
        headers["X-RateLimit-Limit-Req-Minute"] = "0"
        headers["X-RateLimit-Remaining-Req-Minute"] = "0"
        headers["Authorization"] = "Bearer DO_NOT_LOG"
        headers["Set-Cookie"] = "session=DO_NOT_PERSIST"

        diagnostic = diagnostic_http_headers(headers)

        self.assertEqual(diagnostic["retry-after"], "12")
        self.assertEqual(diagnostic["x-ratelimit-remaining-requests"], "0")
        self.assertEqual(diagnostic["x-request-id"], "req-123")
        self.assertEqual(diagnostic["mistral-correlation-id"], "mistral-corr-123")
        self.assertEqual(diagnostic["x-kong-request-id"], "kong-req-123")
        self.assertEqual(diagnostic["x-ratelimit-limit-req-minute"], "0")
        self.assertEqual(diagnostic["x-ratelimit-remaining-req-minute"], "0")
        self.assertNotIn("authorization", diagnostic)
        self.assertNotIn("set-cookie", diagnostic)
        self.assertNotIn("DO_NOT_LOG", repr(diagnostic))
        self.assertNotIn("DO_NOT_PERSIST", repr(diagnostic))

    def test_mistral_429_probe_records_rate_limit_headers_without_secrets(self):
        headers = Message()
        headers["Retry-After"] = "12"
        headers["X-RateLimit-Limit-Req-Minute"] = "4"
        headers["X-RateLimit-Remaining-Req-Minute"] = "0"
        headers["Mistral-Correlation-Id"] = "mistral-request-123"
        headers["X-Kong-Request-Id"] = "mistral-request-123"
        headers["Authorization"] = "Bearer DO_NOT_LOG"
        error = urllib.error.HTTPError(
            "https://api.mistral.ai/v1/chat/completions",
            429,
            "Too Many Requests",
            headers,
            BytesIO(b'{"message":"rate limit exceeded","type":"rate_limited","code":"1300"}'),
        )
        mistral = {
            "name": "mistral",
            "api_key_env": "TEST_MISTRAL_KEY",
            "base_url": "https://api.mistral.ai/v1/chat/completions",
            "models": ["mistral-small-latest"],
        }

        with patch.dict(os.environ, {"TEST_MISTRAL_KEY": "test-key"}):
            with patch("NOVA.router.urllib.request.urlopen", side_effect=error):
                _, _, probes = call_openai_compatible(mistral, "test prompt")

        probe = probes[0]
        self.assertEqual(probe["api_status"], 429)
        self.assertIn('"code":"1300"', probe["error_detail"])
        self.assertEqual(probe["response_headers"]["retry-after"], "12")
        self.assertEqual(
            probe["response_headers"]["x-ratelimit-remaining-req-minute"], "0"
        )
        self.assertEqual(
            probe["response_headers"]["mistral-correlation-id"], "mistral-request-123"
        )
        self.assertNotIn("authorization", probe["response_headers"])
        self.assertNotIn("test-key", repr(probe))
        self.assertEqual(
            probe["capacity"]["metrics"]["requests_per_minute"]["remaining"], 0
        )


    def test_groq_gpt_oss_uses_bounded_completion_token_budget(self):
        response_payload = {
            "model": "openai/gpt-oss-120b",
            "choices": [{
                "message": {
                    "content": json.dumps({
                        "nova_health": "OK",
                        "ack": "NOVA_HEALTH_PROBE",
                    })
                }
            }],
        }
        response = MagicMock()
        response.__enter__.return_value = response
        response.status = 200
        response.headers = Message()
        response.read.return_value = json.dumps(response_payload).encode("utf-8")
        groq = {
            "name": "groq",
            "api_key_env": "TEST_GROQ_KEY",
            "base_url": "https://api.groq.com/openai/v1/chat/completions",
            "models": ["openai/gpt-oss-120b"],
        }

        with patch.dict(os.environ, {"TEST_GROQ_KEY": "test-key"}):
            with patch(
                "NOVA.router.urllib.request.urlopen", return_value=response
            ) as urlopen:
                content, signal, probes = call_openai_compatible(
                    groq, 'Return only the expected NOVA health JSON.'
                )

        request = urlopen.call_args.args[0]
        sent = json.loads(request.data.decode("utf-8"))
        self.assertEqual(signal, "success")
        self.assertEqual(probes[0]["api_status"], 200)
        self.assertIsNotNone(content)
        self.assertEqual(sent["max_completion_tokens"], 256)
        self.assertEqual(sent["reasoning_effort"], "low")
        self.assertNotIn("max_tokens", sent)
        self.assertEqual(sent["response_format"]["type"], "json_schema")
        self.assertNotIn("test-key", repr(probes))

class DeferredProviderRosterTests(unittest.TestCase):
    def test_mistral_is_deferred_and_not_in_live_health_workflows(self):
        repository_root = Path(__file__).resolve().parents[2]
        nova_root = Path(__file__).resolve().parents[1]

        roster = json.loads((nova_root / "roster.json").read_text(encoding="utf-8"))
        active_names = {item.get("name") for item in roster.get("providers", [])}
        self.assertNotIn("mistral", active_names)

        deferred = {
            item.get("name"): item
            for item in roster.get("deferred_providers", [])
        }
        self.assertEqual(deferred["mistral"]["status"], "DEFERRED")

        for workflow_name in (
            "nova_heartbeat.yml",
            "nova_probe_scheduler.yml",
        ):
            workflow = (
                repository_root / ".github" / "workflows" / workflow_name
            ).read_text(encoding="utf-8")
            self.assertNotIn("MISTRAL_API_KEY_01", workflow, workflow_name)

        # A previously persisted queue may still mention Mistral. Scheduler
        # normalization must rebuild it from the current active provider roster.
        state = _state_defaults()
        rotation = state["provider_rotation"]["ai-heart"]
        rotation["next_provider"] = "mistral"
        rotation["probe_queue"] = [
            "mistral", "groq", "gemini", "cerebras", "cloudflare"
        ]
        ordered = scheduled_probe_provider_order(roster["providers"], state)
        self.assertNotIn("mistral", [item["name"] for item in ordered])
        self.assertNotIn("mistral", rotation["probe_queue"])


if __name__ == "__main__":
    unittest.main()
