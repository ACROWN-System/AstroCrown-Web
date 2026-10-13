import unittest
from datetime import datetime, timezone

from NOVA.health import _state_defaults
from NOVA.capacity import provider_capacity_opportunity
from NOVA.probe_scheduler import (
    reschedule_after_probes,
    select_probe_candidate,
)


def providers():
    return [
        {"name": "A", "status": "active"},
        {"name": "B", "status": "active"},
        {"name": "C", "status": "active"},
        {"name": "D", "status": "active"},
    ]


class RollingProbeSchedulerTests(unittest.TestCase):
    def test_expiring_provider_is_pulled_forward_and_checked_provider_moves_to_end(self):
        state = _state_defaults()
        roster = providers()

        # The normal ring has just completed D at 18:00, so the next cycle is
        # A 00:00, B 06:00, C 12:00, D 18:00.
        reschedule_after_probes(
            state,
            roster,
            ["D"],
            completed_at=datetime(2026, 10, 8, 18, 0, tzinfo=timezone.utc),
            interval_seconds=6 * 3600,
        )

        state["targets"]["ai-heart:C:model"] = {
            "health_status": "HEALTHY",
            "last_capacity": {
                "provider": "C",
                "observed_at": "2026-10-08T20:50:00+00:00",
                "expiration_at": "2026-10-08T21:00:00+00:00",
                "metrics": {},
                "resources": {
                    "credits": {
                        "remaining": 100,
                        "total": 100,
                        "unit": "credits",
                        "measurement_type": "TOTAL_RESOURCE",
                    }
                },
                "call_allowances": {},
            },
        }

        decision = select_probe_candidate(
            roster,
            state,
            now=datetime(2026, 10, 8, 20, 55, tzinfo=timezone.utc),
        )

        self.assertEqual(decision["provider"], "C")
        self.assertEqual(decision["reason"], "EXPIRY_REALLOCATION")
        self.assertTrue(decision["preempted"])

        # C is completed at 21:00. The rolling ring becomes C 21:00 -> A 03:00
        # -> B 09:00 -> D 15:00 -> C 21:00.
        reschedule_after_probes(
            state,
            roster,
            ["C"],
            completed_at=datetime(2026, 10, 8, 21, 0, tzinfo=timezone.utc),
            interval_seconds=6 * 3600,
        )

        schedule = state["provider_rotation"]["ai-heart"]["probe_schedule"]
        queue = state["provider_rotation"]["ai-heart"]["probe_queue"]
        self.assertEqual(queue, ["A", "B", "D", "C"])
        self.assertEqual(schedule["A"], "2026-10-09T03:00:00+00:00")
        self.assertEqual(schedule["B"], "2026-10-09T09:00:00+00:00")
        self.assertEqual(schedule["D"], "2026-10-09T15:00:00+00:00")
        self.assertEqual(schedule["C"], "2026-10-09T21:00:00+00:00")

    def test_expiry_does_not_preempt_when_normal_check_is_before_expiration(self):
        state = _state_defaults()
        roster = providers()
        reschedule_after_probes(
            state,
            roster,
            ["D"],
            completed_at=datetime(2026, 10, 8, 18, 0, tzinfo=timezone.utc),
            interval_seconds=6 * 3600,
        )
        state["targets"]["ai-heart:C:model"] = {
            "health_status": "HEALTHY",
            "last_capacity": {
                "provider": "C",
                "observed_at": "2026-10-08T20:50:00+00:00",
                "expiration_at": "2026-10-09T13:00:00+00:00",
                "metrics": {},
                "resources": {
                    "credits": {
                        "remaining": 100,
                        "total": 100,
                        "measurement_type": "TOTAL_RESOURCE",
                    }
                },
            },
        }

        decision = select_probe_candidate(
            roster,
            state,
            now=datetime(2026, 10, 8, 20, 55, tzinfo=timezone.utc),
        )

        self.assertEqual(decision["provider"], "A")
        self.assertEqual(decision["reason"], "SCHEDULED_PENDING")
        self.assertFalse(decision["preempted"])

    def test_required_health_work_can_reuse_expiring_total_resource_without_inventing_cash_value(self):
        targets = {
            "ai-heart:C:model": {
                "last_capacity": {
                    "provider": "C",
                    "observed_at": "2026-10-08T20:50:00+00:00",
                    "expiration_at": "2026-10-08T21:00:00+00:00",
                    "metrics": {},
                    "resources": {
                        "credits": {
                            "remaining": 100,
                            "total": 100,
                            "measurement_type": "TOTAL_RESOURCE",
                        }
                    },
                }
            }
        }
        opportunity = provider_capacity_opportunity(
            targets,
            provider="C",
            namespace="ai-heart",
            now=datetime(2026, 10, 8, 20, 55, tzinfo=timezone.utc),
            allow_required_work_reuse=True,
        )

        self.assertEqual(opportunity["state"], "EXPIRING_SOON")
        self.assertEqual(
            opportunity["economic_signal"]["state"],
            "REQUIRED_WORK_EXPIRY_REUSE",
        )
        self.assertGreater(opportunity["priority"], 1.0)
        self.assertEqual(opportunity["dimension"], "TOTAL_RESOURCE")


if __name__ == "__main__":
    unittest.main()
