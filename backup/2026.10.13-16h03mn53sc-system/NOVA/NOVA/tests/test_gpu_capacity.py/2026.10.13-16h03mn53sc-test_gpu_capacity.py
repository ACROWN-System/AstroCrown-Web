import unittest
from datetime import datetime, timedelta, timezone

from NOVA.gpu_capacity import (
    CURRENT_INTENDED_USE_MODE,
    DEFAULT_PLANNING_REFERENCE_GPU_MINUTES_PER_MONTH,
    build_capacity_report,
)


NOW = datetime(2026, 10, 13, 6, 0, tzinfo=timezone.utc)
EVIDENCE_URL = "https://example.org/provider-evidence"
FUTURE = (NOW + timedelta(days=7)).isoformat()
RECENT = (NOW - timedelta(hours=1)).isoformat()


def qualified_record(name="provider-a", minutes=12_000):
    return {
        "name": name,
        "display_name": name,
        "allocation_type": "dedicated",
        "qualification_use_mode": CURRENT_INTENDED_USE_MODE,
        "official_sources": [{"url": EVIDENCE_URL}],
        "advertised": {"status": "DOCUMENTED_THEORETICAL", "normalized_monthly_gpu_minutes": None},
        "qualification": {
            "account_eligibility": "VERIFIED",
            "free_without_payment_method": "VERIFIED",
            "intended_use_terms_compatible": "VERIFIED",
            "automated_access": "VERIFIED",
            "workload_compatibility": "VERIFIED",
            "data_handling_approved": "VERIFIED",
            "allocation_test": "PASS",
        },
        "recurring_capacity": {
            "status": "VERIFIED",
            "usable_gpu_minutes_per_month": minutes,
            "observed_at": RECENT,
            "valid_until": FUTURE,
            "evidence_urls": [EVIDENCE_URL],
        },
        "one_time_capacity": {
            "status": "UNVERIFIED",
            "gpu_minutes_available": None,
            "observed_at": None,
            "expires_at": None,
            "evidence_urls": [],
        },
        "usage_month_to_date": {
            "month": "2026-10",
            "status": "NOT_METERED",
            "completed_useful_gpu_minutes": None,
            "idle_gpu_minutes": None,
            "reserved_gpu_minutes": None,
        },
    }


def evidence(*providers):
    return {
        "schema_version": 1,
        "planning_reference_gpu_minutes_per_month": DEFAULT_PLANNING_REFERENCE_GPU_MINUTES_PER_MONTH,
        "intended_use_mode": CURRENT_INTENDED_USE_MODE,
        "providers": list(providers),
    }


class AggregateGpuCapacityTests(unittest.TestCase):
    def test_advertised_quota_is_never_counted_as_verified_capacity(self):
        candidate = qualified_record("huggingface_zerogpu")
        candidate["advertised"]["normalized_monthly_gpu_minutes"] = 150
        candidate["recurring_capacity"]["status"] = "UNVERIFIED"
        candidate["recurring_capacity"]["usable_gpu_minutes_per_month"] = None
        candidate["recurring_capacity"]["observed_at"] = None
        candidate["recurring_capacity"]["valid_until"] = None
        candidate["recurring_capacity"]["evidence_urls"] = []

        report = build_capacity_report(
            evidence(candidate),
            active_provider_names=set(),
            now=NOW,
        )

        self.assertEqual(report["known_advertised_gpu_minutes_per_30_day_month_not_counted"], 150)
        self.assertEqual(report["verified_active_recurring_gpu_minutes_per_month"], 0)
        self.assertEqual(
            report["difference_to_reference_after_verified_active_recurring_capacity_gpu_minutes_per_month"],
            DEFAULT_PLANNING_REFERENCE_GPU_MINUTES_PER_MONTH,
        )
        self.assertEqual(report["useful_work_and_allocation_usage_month_to_date"]["status"], "NO_ACTIVE_PROVIDERS")

    def test_fresh_fully_qualified_capacity_counts_only_when_active(self):
        report = build_capacity_report(
            evidence(qualified_record(minutes=24_000)),
            active_provider_names={"provider-a"},
            now=NOW,
        )

        self.assertEqual(report["verified_eligible_recurring_gpu_minutes_per_month"], 24_000)
        self.assertEqual(report["verified_active_recurring_gpu_minutes_per_month"], 24_000)
        self.assertEqual(
            report["difference_to_reference_after_verified_active_recurring_capacity_gpu_minutes_per_month"],
            62_400,
        )
        self.assertEqual(report["providers"][0]["status"], "OPERATIONAL_CAPACITY_VERIFIED")

    def test_qualified_but_not_activated_capacity_is_separated(self):
        report = build_capacity_report(
            evidence(qualified_record(minutes=10_000)),
            active_provider_names=set(),
            now=NOW,
        )

        self.assertEqual(report["verified_eligible_recurring_gpu_minutes_per_month"], 10_000)
        self.assertEqual(report["verified_active_recurring_gpu_minutes_per_month"], 0)
        self.assertEqual(report["providers"][0]["status"], "QUALIFIED_NOT_ACTIVE")

    def test_unknown_or_partial_gate_blocks_capacity(self):
        for gate in (
            "account_eligibility",
            "free_without_payment_method",
            "intended_use_terms_compatible",
            "automated_access",
            "workload_compatibility",
            "data_handling_approved",
            "allocation_test",
        ):
            with self.subTest(gate=gate):
                candidate = qualified_record()
                candidate["qualification"][gate] = "UNKNOWN"
                report = build_capacity_report(
                    evidence(candidate),
                    active_provider_names={"provider-a"},
                    now=NOW,
                )
                self.assertEqual(report["verified_active_recurring_gpu_minutes_per_month"], 0)
                self.assertEqual(report["providers"][0]["recurring_capacity"]["status"], "BLOCKED")

    def test_explicitly_disallowed_intended_use_excludes_provider(self):
        candidate = qualified_record("provider-a")
        candidate["qualification"]["intended_use_terms_compatible"] = "DISALLOWED"

        report = build_capacity_report(
            evidence(candidate),
            active_provider_names={"provider-a"},
            now=NOW,
        )

        self.assertEqual(report["providers"][0]["status"], "EXCLUDED")
        self.assertEqual(report["verified_active_recurring_gpu_minutes_per_month"], 0)
        self.assertIn(
            "intended_use_terms_compatible_disallowed",
            report["providers"][0]["recurring_capacity"]["reason_codes"],
        )

    def test_terms_unverified_for_noncommercial_rnd_block_without_assuming_disallowed(self):
        candidate = qualified_record("kaggle")
        candidate["qualification"]["intended_use_terms_compatible"] = "UNKNOWN"

        report = build_capacity_report(
            evidence(candidate),
            active_provider_names={"kaggle"},
            now=NOW,
        )

        self.assertEqual(report["providers"][0]["status"], "BLOCKED")
        self.assertNotEqual(report["providers"][0]["status"], "EXCLUDED")
        self.assertEqual(report["verified_active_recurring_gpu_minutes_per_month"], 0)

    def test_change_to_commercial_mode_requires_requalification(self):
        candidate = qualified_record()
        report = build_capacity_report(
            evidence(candidate),
            active_provider_names={"provider-a"},
            now=NOW,
            intended_use_mode="commercial_production",
        )

        self.assertEqual(report["verified_active_recurring_gpu_minutes_per_month"], 0)
        self.assertIn(
            "provider_terms_not_qualified_for_current_use_mode",
            report["providers"][0]["recurring_capacity"]["reason_codes"],
        )

    def test_stale_capacity_evidence_is_not_counted(self):
        candidate = qualified_record()
        candidate["recurring_capacity"]["valid_until"] = (NOW - timedelta(seconds=1)).isoformat()

        report = build_capacity_report(
            evidence(candidate),
            active_provider_names={"provider-a"},
            now=NOW,
        )

        self.assertEqual(report["verified_active_recurring_gpu_minutes_per_month"], 0)
        self.assertIn("capacity_evidence_expired", report["providers"][0]["recurring_capacity"]["reason_codes"])

    def test_future_observation_is_rejected(self):
        candidate = qualified_record()
        candidate["recurring_capacity"]["observed_at"] = (NOW + timedelta(minutes=1)).isoformat()

        report = build_capacity_report(
            evidence(candidate),
            active_provider_names={"provider-a"},
            now=NOW,
        )

        self.assertEqual(report["verified_active_recurring_gpu_minutes_per_month"], 0)
        self.assertIn(
            "capacity_observation_is_in_the_future",
            report["providers"][0]["recurring_capacity"]["reason_codes"],
        )

    def test_missing_or_non_https_evidence_is_rejected(self):
        candidate = qualified_record()
        candidate["recurring_capacity"]["evidence_urls"] = ["http://example.org/evidence"]

        report = build_capacity_report(
            evidence(candidate),
            active_provider_names={"provider-a"},
            now=NOW,
        )

        self.assertEqual(report["verified_active_recurring_gpu_minutes_per_month"], 0)
        self.assertIn(
            "capacity_evidence_sources_missing_or_invalid",
            report["providers"][0]["recurring_capacity"]["reason_codes"],
        )

    def test_one_time_minutes_are_separate_from_recurring_monthly_capacity(self):
        candidate = qualified_record()
        candidate["recurring_capacity"]["status"] = "UNVERIFIED"
        candidate["recurring_capacity"]["usable_gpu_minutes_per_month"] = None
        candidate["one_time_capacity"] = {
            "status": "VERIFIED",
            "gpu_minutes_available": 330,
            "observed_at": RECENT,
            "expires_at": FUTURE,
            "evidence_urls": [EVIDENCE_URL],
        }

        report = build_capacity_report(
            evidence(candidate),
            active_provider_names={"provider-a"},
            now=NOW,
        )

        self.assertEqual(report["verified_active_recurring_gpu_minutes_per_month"], 0)
        self.assertEqual(report["verified_active_one_time_gpu_minutes_available"], 330)
        self.assertEqual(report["verified_active_capacity_available_for_current_month_gpu_minutes"], 330)
        self.assertEqual(
            report["difference_to_reference_after_verified_active_recurring_capacity_gpu_minutes_per_month"],
            DEFAULT_PLANNING_REFERENCE_GPU_MINUTES_PER_MONTH,
        )
        self.assertEqual(
            report["difference_to_reference_after_verified_active_current_month_capacity_gpu_minutes"],
            DEFAULT_PLANNING_REFERENCE_GPU_MINUTES_PER_MONTH - 330,
        )

    def test_expired_one_time_credit_is_not_counted(self):
        candidate = qualified_record()
        candidate["recurring_capacity"]["status"] = "UNVERIFIED"
        candidate["recurring_capacity"]["usable_gpu_minutes_per_month"] = None
        candidate["one_time_capacity"] = {
            "status": "VERIFIED",
            "gpu_minutes_available": 330,
            "observed_at": RECENT,
            "expires_at": (NOW - timedelta(seconds=1)).isoformat(),
            "evidence_urls": [EVIDENCE_URL],
        }

        report = build_capacity_report(
            evidence(candidate),
            active_provider_names={"provider-a"},
            now=NOW,
        )

        self.assertEqual(report["verified_active_one_time_gpu_minutes_available"], 0)
        self.assertIn("capacity_evidence_expired", report["providers"][0]["one_time_capacity"]["reason_codes"])

    def test_unmetered_useful_work_remains_unknown_not_zero(self):
        report = build_capacity_report(
            evidence(qualified_record()),
            active_provider_names={"provider-a"},
            now=NOW,
        )
        usage = report["useful_work_and_allocation_usage_month_to_date"]
        self.assertEqual(usage["status"], "NOT_METERED_OR_INCOMPLETE")
        self.assertIsNone(usage["completed_useful_gpu_minutes"])

    def test_usage_aggregates_only_when_every_active_provider_is_covered(self):
        first = qualified_record("provider-a")
        second = qualified_record("provider-b")
        for provider, completed, idle, reserved in (
            (first, 10, 2, 3),
            (second, 20, 4, 5),
        ):
            provider["usage_month_to_date"] = {
                "month": "2026-10",
                "status": "VERIFIED",
                "observed_at": RECENT,
                "valid_until": FUTURE,
                "evidence_urls": [EVIDENCE_URL],
                "completed_useful_gpu_minutes": completed,
                "idle_gpu_minutes": idle,
                "reserved_gpu_minutes": reserved,
            }

        report = build_capacity_report(
            evidence(first, second),
            active_provider_names={"provider-a", "provider-b"},
            now=NOW,
        )
        usage = report["useful_work_and_allocation_usage_month_to_date"]
        self.assertEqual(usage["status"], "VERIFIED")
        self.assertEqual(usage["completed_useful_gpu_minutes"], 30)
        self.assertEqual(usage["idle_gpu_minutes"], 6)
        self.assertEqual(usage["reserved_gpu_minutes"], 8)

    def test_boolean_is_not_accepted_as_numeric_gpu_minutes(self):
        candidate = qualified_record()
        candidate["recurring_capacity"]["usable_gpu_minutes_per_month"] = True

        report = build_capacity_report(
            evidence(candidate),
            active_provider_names={"provider-a"},
            now=NOW,
        )

        self.assertEqual(report["verified_active_recurring_gpu_minutes_per_month"], 0)
        self.assertIn(
            "recurring_capacity_minutes_missing_or_not_positive",
            report["providers"][0]["recurring_capacity"]["reason_codes"],
        )

    def test_counting_rules_use_current_intended_use_not_commercial_rights(self):
        report = build_capacity_report(
            evidence(qualified_record()),
            active_provider_names=set(),
            now=NOW,
        )
        rules = " ".join(report["counting_rules"]).lower()
        self.assertIn("current intended-use mode", rules)
        self.assertNotIn("commercial-use-approved", rules)

    def test_planning_reference_is_provisional_and_feasibility_is_unvalidated(self):
        report = build_capacity_report(
            evidence(qualified_record()),
            active_provider_names=set(),
            now=NOW,
        )

        self.assertEqual(
            report["planning_reference_gpu_minutes_per_month"],
            DEFAULT_PLANNING_REFERENCE_GPU_MINUTES_PER_MONTH,
        )
        self.assertEqual(report["planning_reference_status"], "PROVISIONAL_UNVALIDATED")
        self.assertFalse(report["planning_reference_is_requirement"])
        self.assertEqual(report["reference_feasibility_status"], "NOT_ESTABLISHED")
        self.assertEqual(
            report["reference_comparison_status"],
            "REFERENCE_NOT_REACHED_BY_VERIFIED_ACTIVE_RECURRING_CAPACITY",
        )

    def test_planning_reference_can_be_changed_for_scenario_analysis(self):
        source = evidence(qualified_record("provider-a", minutes=120))
        source["planning_reference_gpu_minutes_per_month"] = 100

        report = build_capacity_report(
            source,
            active_provider_names={"provider-a"},
            now=NOW,
        )

        self.assertEqual(report["planning_reference_gpu_minutes_per_month"], 100)
        self.assertEqual(report["planning_reference_configuration_status"], "VALID")
        self.assertEqual(
            report["reference_comparison_status"],
            "REFERENCE_REACHED_BY_VERIFIED_ACTIVE_RECURRING_CAPACITY",
        )
        self.assertEqual(
            report["difference_to_reference_after_verified_active_recurring_capacity_gpu_minutes_per_month"],
            0,
        )

    def test_legacy_target_field_is_accepted_only_as_a_provisional_reference(self):
        source = evidence(qualified_record())
        source["target_gpu_minutes_per_month"] = 100
        source.pop("planning_reference_gpu_minutes_per_month")

        report = build_capacity_report(source, active_provider_names=set(), now=NOW)

        self.assertEqual(report["planning_reference_gpu_minutes_per_month"], 100)
        self.assertEqual(report["planning_reference_status"], "PROVISIONAL_UNVALIDATED")
        self.assertEqual(report["planning_reference_source"], "legacy_target_field")
        self.assertTrue(any("Legacy target_gpu_minutes_per_month" in item for item in report["warnings"]))


if __name__ == "__main__":
    unittest.main()
