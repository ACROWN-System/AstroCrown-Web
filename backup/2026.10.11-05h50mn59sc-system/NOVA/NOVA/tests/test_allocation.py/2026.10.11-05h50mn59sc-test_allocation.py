import unittest
from datetime import datetime, timezone

from NOVA.allocation import dominates, evaluate_candidate, pareto_frontier, select_resource_candidate


class AllocationTests(unittest.TestCase):
    def setUp(self):
        self.now = datetime(2026, 10, 8, 12, 0, tzinfo=timezone.utc)

    def snapshot(self):
        return {
            "observed_at": self.now.isoformat(),
            "resources": {
                "credits": {"remaining": 900, "total": 1000, "unit": "credits", "measurement_type": "TOTAL_RESOURCE"}
            },
            "call_allowances": {
                "requests": {"remaining": 4, "limit": 5, "reset_after_seconds": 120, "measurement_type": "CALL_ALLOWANCE"},
                "tokens": {"remaining": 9000, "limit": 10000, "reset_after_seconds": 60, "measurement_type": "CALL_ALLOWANCE"}
            },
            "estimated_next_reset_at": {
                "requests": "2026-10-08T12:02:00+00:00"
            },
            "economics": {
                "free": True,
                "renewal": {"period_seconds": 60, "units_per_period": 5},
                "negative_effects_cost": 0
            }
        }

    def test_task_must_fit_both_resource_and_call_dimensions(self):
        candidate = {
            "provider": "A",
            "health_status": "HEALTHY",
            "quality_status": "PASS",
            "health_observed_at": self.now.isoformat(),
            "capacity": self.snapshot(),
        }
        task = {
            "required_calls": 5,
            "required_tokens": 1000,
            "required_resources": {"credits": 100},
        }
        result = evaluate_candidate(candidate, task, now=self.now)
        self.assertFalse(result['eligible'])
        self.assertIn('CALL_ALLOWANCE_INSUFFICIENT', result['reasons'])

    def test_unknown_economics_do_not_turn_expiry_into_extra_priority(self):
        candidate = {
            "provider": "A",
            "health_status": "HEALTHY",
            "quality_status": "PASS",
            "health_observed_at": self.now.isoformat(),
            "capacity": {
                **self.snapshot(),
                "economics": None,
            },
        }
        task = {'required_calls': 1, 'required_tokens': 100}
        result = evaluate_candidate(candidate, task, now=self.now)
        self.assertEqual(result['metrics']['expiry_priority'], 0.0)

    def test_negative_effects_are_compared_without_making_them_a_universal_weight(self):
        better = {
            "eligible": True,
            "metrics": {"health": 3, "quality": 2, "latency_ms": 100, "expiry_priority": 0, "economic_priority": 1, "negative_effects": 0},
        }
        worse = {
            "eligible": True,
            "metrics": {"health": 2, "quality": 2, "latency_ms": 200, "expiry_priority": 0, "economic_priority": 1, "negative_effects": 1},
        }
        self.assertTrue(dominates(better, worse))

    def test_pareto_frontier_keeps_non_dominated_tradeoffs(self):
        fast = {'eligible': True, 'provider': 'fast', 'metrics': {'health': 3, 'quality': 1, 'latency_ms': 50}}
        high_quality = {'eligible': True, 'provider': 'quality', 'metrics': {'health': 3, 'quality': 2, 'latency_ms': 100}}
        frontier = pareto_frontier([fast, high_quality])
        self.assertEqual({x['provider'] for x in frontier}, {'fast', 'quality'})

    def test_selector_returns_frontier_without_inventing_a_single_weighted_score(self):
        candidates = [
            {'provider': 'A', 'health_status': 'HEALTHY', 'quality_status': 'PASS', 'health_observed_at': self.now.isoformat(), 'latency_ms': 100, 'capacity': self.snapshot()},
            {'provider': 'B', 'health_status': 'HEALTHY', 'quality_status': 'PASS', 'health_observed_at': self.now.isoformat(), 'latency_ms': 150, 'capacity': {**self.snapshot(), 'economics': {'free': False, 'cash_cost': 1, 'negative_effects_cost': 0}}},
        ]
        result = select_resource_candidate(candidates, {'required_calls': 1, 'required_tokens': 100}, now=self.now)
        self.assertEqual(result['status'], 'SELECTED')
        self.assertTrue(result['frontier'])


if __name__ == '__main__':
    unittest.main()
