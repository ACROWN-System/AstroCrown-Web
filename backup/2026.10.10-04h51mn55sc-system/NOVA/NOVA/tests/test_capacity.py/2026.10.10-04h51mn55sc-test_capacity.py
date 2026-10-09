import unittest
from datetime import datetime, timedelta, timezone

from NOVA.capacity import (
    capacity_economic_signal,
    capacity_opportunity,
    economic_net_value,
    extract_rate_limit_snapshot,
    resource_balance,
    split_capacity_dimensions,
)
from NOVA.health import _state_defaults, record_probe


class CapacityMemoryTests(unittest.TestCase):
    def test_groq_headers_are_extracted_with_remaining_and_reset(self):
        snapshot = extract_rate_limit_snapshot(
            "groq",
            {
                "x-ratelimit-limit-requests": "1000",
                "x-ratelimit-remaining-requests": "997",
                "x-ratelimit-reset-requests": "2m",
                "x-ratelimit-limit-tokens": "8000",
                "x-ratelimit-remaining-tokens": "7936",
                "x-ratelimit-reset-tokens": "7.5s",
            },
            observed_at="2026-10-08T00:00:00+00:00",
        )
        self.assertEqual(snapshot["measurement_state"], "OBSERVED")
        self.assertEqual(snapshot["metrics"]["requests"]["remaining"], 997)
        self.assertEqual(snapshot["metrics"]["tokens"]["remaining"], 7936)
        self.assertEqual(
            snapshot["estimated_next_reset_at"]["requests"],
            "2026-10-08T00:02:00+00:00",
        )


    def test_expiring_capacity_is_marked_as_actionable(self):
        now = datetime(2026, 10, 8, 12, 0, tzinfo=timezone.utc)
        snapshot = {
            "provider": "groq",
            "observed_at": now.isoformat(),
            "estimated_next_reset_at": {
                "requests": (now + timedelta(minutes=5)).isoformat()
            },
            "metrics": {
                "requests": {"limit": 100, "remaining": 80}
            },
        }
        opportunity = capacity_opportunity(
            snapshot,
            now=now,
            urgency_window_seconds=300,
            minimum_remaining_reserve_fraction=0.2,
            max_observation_age_seconds=900,
        )
        self.assertEqual(opportunity["state"], "EXPIRING_SOON")
        self.assertGreater(opportunity["priority"], 1.0)

    def test_expiring_capacity_below_protected_reserve_is_not_burned(self):
        now = datetime(2026, 10, 8, 12, 0, tzinfo=timezone.utc)
        snapshot = {
            "provider": "groq",
            "observed_at": now.isoformat(),
            "estimated_next_reset_at": {
                "requests": (now + timedelta(minutes=2)).isoformat()
            },
            "metrics": {
                "requests": {"limit": 100, "remaining": 10}
            },
        }
        opportunity = capacity_opportunity(
            snapshot,
            now=now,
            urgency_window_seconds=300,
            minimum_remaining_reserve_fraction=0.2,
        )
        self.assertEqual(opportunity["state"], "PROTECTED_RESERVE")
        self.assertEqual(opportunity["priority"], 0.0)


    def test_paid_expiring_capacity_requires_positive_economic_case(self):
        now = datetime(2026, 10, 8, 12, 0, tzinfo=timezone.utc)
        snapshot = {
            "provider": "paid",
            "observed_at": now.isoformat(),
            "estimated_next_reset_at": {
                "requests": (now + timedelta(minutes=2)).isoformat()
            },
            "metrics": {
                "requests": {"limit": 100, "remaining": 80}
            },
            "economics": {
                "free": False,
                "cash_cost_per_unit": 0.10,
                "renewal": {
                    "period_seconds": 3600,
                    "units_per_period": 100
                }
            }
        }
        signal = capacity_economic_signal(
            snapshot,
            task_units=1,
            expected_task_benefit=0.05,
            expected_task_value_asset="USD",
        )
        self.assertEqual(signal["state"], "NEGATIVE_NET_VALUE")
        self.assertEqual(signal["renewability"], "MODERATE")

    def test_free_expiring_capacity_is_positive_only_for_required_work(self):
        snapshot = {
            "provider": "free",
            "observed_at": "2026-10-08T12:00:00+00:00",
            "economics": {
                "free": True,
                "renewal": {
                    "period_seconds": 300,
                    "units_per_period": 5
                }
            }
        }
        signal = capacity_economic_signal(
            snapshot,
            task_units=1,
            expected_task_benefit=1,
        )
        self.assertEqual(signal["state"], "NON_NEGATIVE_FREE_RESOURCE")
        self.assertEqual(signal["renewability"], "FAST")
        self.assertEqual(
            signal["resource_opportunity"],
            "USABLE_IF_WORK_IS_ALREADY_REQUIRED",
        )

    def test_unknown_economics_do_not_boost_expiry_priority(self):
        now = datetime(2026, 10, 8, 12, 0, tzinfo=timezone.utc)
        snapshot = {
            "provider": "unknown",
            "observed_at": now.isoformat(),
            "estimated_next_reset_at": {
                "requests": (now + timedelta(minutes=2)).isoformat()
            },
            "metrics": {
                "requests": {"limit": 100, "remaining": 80}
            },
        }
        opportunity = capacity_opportunity(
            snapshot,
            now=now,
            urgency_window_seconds=300,
        )
        self.assertGreater(opportunity["priority"], 1.0)
        signal = capacity_economic_signal(snapshot, task_units=1, expected_task_benefit=1)
        self.assertEqual(signal["state"], "ECONOMICS_UNKNOWN")

    def test_call_allowance_is_not_total_resource(self):
        snapshot = extract_rate_limit_snapshot(
            "groq",
            {
                "x-ratelimit-limit-requests": "5",
                "x-ratelimit-remaining-requests": "4",
                "x-ratelimit-reset-requests": "10s",
            },
            observed_at="2026-10-08T00:00:00+00:00",
        )
        dimensions = split_capacity_dimensions(snapshot)
        self.assertEqual(dimensions["resources"], {})
        self.assertEqual(
            dimensions["call_allowances"]["requests"]["measurement_type"],
            "CALL_ALLOWANCE",
        )
        self.assertEqual(dimensions["call_allowances"]["requests"]["limit"], 5)

    def test_explicit_total_resource_is_separate_from_call_allowance(self):
        resource = resource_balance(
            name="credits",
            remaining=900,
            total=1000,
            unit="credits",
            renewal_period_seconds="24h",
        )
        self.assertEqual(resource["measurement_type"], "TOTAL_RESOURCE")
        self.assertEqual(resource["remaining"], 900)
        self.assertEqual(resource["total"], 1000)

    def test_economic_net_value_accounts_for_negative_effects_when_comparable(self):
        value = economic_net_value(
            expected_benefit=10,
            direct_cash_cost=2,
            opportunity_cost=1,
            negative_effects_cost=3,
            value_asset="USD",
        )
        self.assertEqual(value["state"], "POSITIVE")
        self.assertEqual(value["net_value"], 4)

    def test_non_comparable_missing_costs_do_not_create_false_positive(self):
        value = economic_net_value(
            expected_benefit=10,
            value_asset="USD",
        )
        self.assertEqual(value["state"], "BENEFIT_ONLY")
        self.assertFalse(value["comparable"])

    def test_missing_capacity_is_not_invented(self):
        snapshot = extract_rate_limit_snapshot("mistral", {})
        self.assertEqual(snapshot["measurement_state"], "NOT_EXPOSED")
        self.assertEqual(snapshot["metrics"], {})

    def test_capacity_is_persisted_in_target_and_history(self):
        state = _state_defaults()
        capacity = {
            "provider": "groq",
            "measurement_state": "OBSERVED",
            "metrics": {
                "requests": {"remaining": 997, "limit": 1000}
            },
        }
        observation = record_probe(
            state,
            namespace="ai-heart",
            provider="groq",
            credential_env="GROQ_API_KEY_01",
            requested_model="openai/gpt-oss-20b",
            actual_model="openai/gpt-oss-20b",
            api_status=200,
            authentication="PASS",
            response_valid=True,
            quality_status="PASS",
            latency_ms=100,
            error_class=None,
            error_detail=None,
            capacity=capacity,
        )
        self.assertEqual(observation["capacity"], capacity)
        target = state["targets"]["ai-heart:groq:openai/gpt-oss-20b"]
        self.assertEqual(target["last_capacity"], capacity)
        self.assertEqual(target["history"][-1]["capacity"], capacity)



    def test_mistral_specific_rate_limit_windows_and_query_cost_are_extracted(self):
        snapshot = extract_rate_limit_snapshot(
            "mistral",
            {
                "x-ratelimit-limit-req-minute": "4",
                "x-ratelimit-remaining-req-minute": "0",
                "x-ratelimit-limit-req-10-second": "2",
                "x-ratelimit-remaining-req-10-second": "0",
                "x-ratelimit-limit-tokens-minute": "5000000",
                "x-ratelimit-remaining-tokens-minute": "4999911",
                "x-ratelimit-limit-tokens-month": "1000000000000",
                "x-ratelimit-remaining-tokens-month": "999998798434",
                "x-ratelimit-tokens-query-cost": "52",
            },
            observed_at="2026-10-09T00:00:00+00:00",
        )

        self.assertEqual(snapshot["measurement_state"], "OBSERVED")
        self.assertEqual(snapshot["metrics"]["requests_per_minute"]["limit"], 4)
        self.assertEqual(snapshot["metrics"]["requests_per_minute"]["remaining"], 0)
        self.assertEqual(snapshot["metrics"]["requests_per_minute"]["window_seconds"], 60)
        self.assertEqual(snapshot["metrics"]["requests_per_10_seconds"]["remaining"], 0)
        self.assertEqual(snapshot["metrics"]["requests_per_10_seconds"]["window_seconds"], 10)
        self.assertEqual(snapshot["metrics"]["tokens_per_minute"]["remaining"], 4999911)
        self.assertEqual(snapshot["metrics"]["tokens_per_month"]["remaining"], 999998798434)
        self.assertEqual(snapshot["metrics"]["tokens_query_cost"]["value"], 52)
        self.assertEqual(snapshot["call_allowances"]["tokens_per_month"]["unit"], "tokens")

if __name__ == "__main__":
    unittest.main()
