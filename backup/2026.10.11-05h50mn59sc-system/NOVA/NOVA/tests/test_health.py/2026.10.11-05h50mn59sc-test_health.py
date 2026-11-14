import unittest
from datetime import datetime, timedelta, timezone

from NOVA.health import (
    _state_defaults,
    fingerprint,
    observation_freshness,
    provider_health_status,
    record_probe,
    remember_observation,
    reusable_analysis,
)


class HealthTests(unittest.TestCase):
    def test_fingerprint_ignores_transport_noise(self):
        left = {"value": 1, "observed_at": "2026-10-07T00:00:00Z", "latency_ms": 100}
        right = {"value": 1, "observed_at": "2026-10-07T01:00:00Z", "latency_ms": 900}
        self.assertEqual(fingerprint(left), fingerprint(right))

    def test_unconfigured_probe_does_not_count_as_failure(self):
        state = _state_defaults()
        observation = record_probe(
            state, namespace="gpu-heart", provider="test",
            credential_env="TEST_GPU_API_KEY_01", requested_model=None, actual_model=None,
            api_status=None, authentication="BLOCKED", response_valid=False,
            quality_status="NOT_APPLICABLE", latency_ms=None,
            error_class="credential_not_configured", error_detail="Credential is not configured.",
            max_samples=24, latency_degraded_multiplier=2.0,
            latency_min_samples=4, unacceptable_failure_streak=3,
        )
        self.assertEqual(observation["health_status"], "UNCONFIGURED")
        self.assertEqual(state["targets"]["gpu-heart:test:-"]["failure_streak"], 0)

    def test_latency_degradation_is_detected_after_baseline(self):
        state = _state_defaults()
        kwargs = dict(
            namespace="ai-heart", provider="test", credential_env="TEST_AI_API_KEY_01",
            requested_model="model-a", actual_model="model-a", api_status=200,
            authentication="PASS", response_valid=True, quality_status="PASS",
            error_class=None, error_detail=None, max_samples=24,
            latency_degraded_multiplier=2.0, latency_min_samples=4,
            unacceptable_failure_streak=3,
        )
        for latency in (100, 110, 105, 108):
            record_probe(state, latency_ms=latency, **kwargs)
        observation = record_probe(state, latency_ms=250, **kwargs)
        self.assertEqual(observation["health_status"], "DEGRADED")
        self.assertTrue(observation["latency_degraded"])


    def test_observation_freshness_is_explicit_and_temporal(self):
        now = datetime(2026, 10, 8, 12, 0, tzinfo=timezone.utc)
        observed = (now - timedelta(minutes=30)).isoformat()
        self.assertEqual(
            observation_freshness(observed, fresh_for_seconds=3600, now=now),
            "FRESH",
        )
        self.assertEqual(
            observation_freshness(observed, fresh_for_seconds=1200, now=now),
            "STALE",
        )
        self.assertEqual(
            observation_freshness(observed, fresh_for_seconds=None, now=now),
            "UNSPECIFIED",
        )

    def test_stale_observation_does_not_reuse_analysis(self):
        state = _state_defaults()
        observed_at = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
        remember_observation(
            state,
            namespace="external-annotation",
            source="source",
            observation={"headline": "A"},
            analysis={"decision": "monitor"},
            fresh_for_seconds=3600,
        )
        state["observations"]["external-annotation:source"]["observed_at"] = observed_at
        self.assertIsNone(
            reusable_analysis(
                state,
                namespace="external-annotation",
                source="source",
                current_observation={"headline": "A"},
                now=datetime.now(timezone.utc),
            )
        )

    def test_stale_provider_health_is_not_reported_as_current(self):
        state = _state_defaults()
        old = (datetime.now(timezone.utc) - timedelta(hours=8)).isoformat()
        record_probe(
            state,
            namespace="ai-heart",
            provider="test",
            credential_env="TEST_AI_API_KEY_01",
            requested_model="model-a",
            actual_model="model-a",
            api_status=200,
            authentication="PASS",
            response_valid=True,
            quality_status="PASS",
            latency_ms=100,
            error_class=None,
            error_detail=None,
        )
        target = state["targets"]["ai-heart:test:model-a"]
        target["last_observation"]["observed_at"] = old
        self.assertEqual(
            provider_health_status(
                state,
                provider="test",
                namespace="ai-heart",
                max_observation_age_seconds=6 * 3600,
            ),
            "STALE",
        )

    def test_changed_observation_preserves_prior_analysis(self):
        state = _state_defaults()
        remember_observation(
            state, namespace="external-annotation", source="source",
            observation={"headline": "A"}, analysis={"decision": "monitor"},
        )
        second = remember_observation(
            state, namespace="external-annotation", source="source", observation={"headline": "A"},
        )
        self.assertTrue(second["unchanged_from_previous"])
        self.assertEqual(second["analysis"], {"decision": "monitor"})
        third = remember_observation(
            state, namespace="external-annotation", source="source", observation={"headline": "B"},
        )
        self.assertEqual(third["analysis_history"][-1]["analysis"], {"decision": "monitor"})

    def test_reusable_analysis_requires_same_fingerprint(self):
        state = _state_defaults()
        observation = {"headline": "A"}
        remember_observation(
            state, namespace="external-annotation", source="source",
            observation=observation, analysis={"decision": "monitor"}, valid_for_seconds=3600,
        )
        reused = reusable_analysis(
            state, namespace="external-annotation", source="source",
            current_observation=observation, now=datetime.now(timezone.utc),
        )
        self.assertEqual(reused, {"decision": "monitor"})
        self.assertIsNone(
            reusable_analysis(
                state, namespace="external-annotation", source="source",
                current_observation={"headline": "B"},
            )
        )



    def test_allowlisted_response_headers_are_persisted_in_health_history(self):
        state = _state_defaults()
        response_headers = {
            "mistral-correlation-id": "corr-test-123",
            "x-ratelimit-limit-req-minute": "4",
            "x-ratelimit-remaining-req-minute": "0",
        }
        observation = record_probe(
            state,
            namespace="ai-heart",
            provider="mistral",
            credential_env="TEST_MISTRAL_KEY",
            requested_model="mistral-small-latest",
            actual_model=None,
            api_status=429,
            authentication="UNKNOWN",
            response_valid=False,
            quality_status="NOT_APPLICABLE",
            latency_ms=100,
            error_class="transient",
            error_detail='{"code":"1300","type":"rate_limited"}',
            response_headers=response_headers,
        )
        target = state["targets"]["ai-heart:mistral:mistral-small-latest"]
        self.assertEqual(observation["response_headers"], response_headers)
        self.assertEqual(target["last_observation"]["response_headers"], response_headers)
        self.assertEqual(target["history"][-1]["response_headers"], response_headers)

if __name__ == "__main__":
    unittest.main()
