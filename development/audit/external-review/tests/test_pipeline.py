import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve()
sys.path.insert(0, str(HERE.parents[1]))

import pipeline  # noqa: E402


class CandidateScoringTests(unittest.TestCase):
    def _factor(self, score, evidence=None):
        return {"score": score, "evidence": evidence or ["https://example.org/evidence"]}

    def test_full_evidence_produces_rankable_fit_score_not_probability(self):
        candidate = {
            "candidate_id": "reviewer-a",
            "factor_scores": {
                key: self._factor(4) for key in pipeline.FACTOR_WEIGHTS
            },
        }
        result = pipeline.score_candidate(candidate)
        self.assertEqual(result["ranking_status"], "RANKABLE_WITH_RECORDED_EVIDENCE")
        self.assertEqual(result["fit_score_percent"], 80.0)
        self.assertTrue(result["fit_score_is_not_probability"])
        self.assertEqual(result["evidence_coverage_percent"], 100.0)

    def test_unknown_factors_reduce_coverage_without_becoming_zeroes(self):
        result = pipeline.score_candidate({
            "candidate_id": "reviewer-b",
            "factor_scores": {
                "technical_scope_fit": self._factor(5),
                "relevant_independent_review_history": {"score": None, "evidence": []},
            },
        })
        self.assertEqual(result["ranking_status"], "INSUFFICIENT_EVIDENCE_FOR_RANKING")
        self.assertIsNone(result["fit_score_percent"])
        self.assertEqual(result["evidence_coverage_percent"], 20.0)
        self.assertEqual(
            result["factors"]["relevant_independent_review_history"]["status"],
            "UNKNOWN",
        )

    def test_numeric_rating_requires_evidence(self):
        with self.assertRaisesRegex(ValueError, "requires at least one"):
            pipeline.score_candidate({
                "candidate_id": "reviewer-c",
                "factor_scores": {"technical_scope_fit": {"score": 5, "evidence": []}},
            })


class ConversionMeasurementTests(unittest.TestCase):
    def record(self, record_id, **overrides):
        base = {
            "id": record_id,
            "route": "direct_email",
            "scope": "one_gate",
            "sent_date": "2026-10-11",
            "closed": False,
            "replied": None,
            "accepted": None,
            "completed": None,
            "qualified_independent_review": None,
            "forecast_valid_review_percent": None,
        }
        base.update(overrides)
        return base

    def test_empty_cohort_has_no_invented_percentage(self):
        result = pipeline.summarize_cohort([])
        rate = result["stages"]["reply_given_outreach"]
        self.assertIsNone(rate["observed_rate_percent"])
        self.assertEqual(rate["status"], "NO_ELIGIBLE_OUTCOMES")

    def test_open_outreach_is_not_counted_as_failure(self):
        result = pipeline.summarize_cohort([self.record("pending-1")])
        self.assertEqual(result["stages"]["reply_given_outreach"]["trials"], 0)
        self.assertEqual(
            result["stages"]["end_to_end_qualified_review_given_closed_outreach"]["trials"],
            0,
        )

    def test_conditional_stage_denominators_are_correct(self):
        rows = [
            self.record("declined", closed=True, replied=True, accepted=False),
            self.record(
                "completed",
                closed=True,
                replied=True,
                accepted=True,
                completed=True,
                qualified_independent_review=True,
                forecast_valid_review_percent=75,
            ),
            self.record("pending", replied=None),
        ]
        result = pipeline.summarize_cohort(rows)
        stages = result["stages"]
        self.assertEqual(stages["reply_given_outreach"]["successes"], 2)
        self.assertEqual(stages["reply_given_outreach"]["trials"], 2)
        self.assertEqual(stages["acceptance_given_reply"]["successes"], 1)
        self.assertEqual(stages["acceptance_given_reply"]["trials"], 2)
        self.assertEqual(stages["completion_given_acceptance"]["trials"], 1)
        self.assertEqual(stages["end_to_end_qualified_review_given_closed_outreach"]["successes"], 1)
        self.assertEqual(stages["end_to_end_qualified_review_given_closed_outreach"]["trials"], 2)
        self.assertEqual(result["forecast_validation"]["matured_forecasts"], 1)
        self.assertIn("LOW_SAMPLE", result["forecast_validation"]["status"])

    def test_user_scenario_is_not_incorporated_into_observed_rates(self):
        ledger = {
            "schema_version": 1,
            "outreach_records": [self.record("pending")],
            "planning_scenarios": [{
                "probability_percent": 0.0001,
                "status": "UNVALIDATED_PLANNING_SCENARIO",
            }],
        }
        result = pipeline.analyze_ledger(ledger)
        self.assertEqual(result["planning_scenarios"][0]["probability_percent"], 0.0001)
        self.assertIsNone(result["cohorts"][0]["stages"]["reply_given_outreach"]["observed_rate_percent"])

    def test_wilson_interval_exposes_uncertainty_for_one_observation(self):
        interval = pipeline.wilson_interval(0, 1)
        self.assertEqual(interval["lower_percent"], 0.0)
        self.assertGreater(interval["upper_percent"], 70.0)
        self.assertLess(interval["upper_percent"], 85.0)

    def test_invalid_stage_order_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "only observed after a reply"):
            pipeline.validate_record(self.record("invalid", accepted=True, replied=False))

    def test_duplicate_ids_are_rejected(self):
        row = self.record("duplicate")
        with self.assertRaisesRegex(ValueError, "globally unique"):
            pipeline.analyze_ledger({"schema_version": 1, "outreach_records": [row, row]})

    def test_closed_no_reply_outreach_can_count_as_no_end_to_end_conversion(self):
        row = self.record("expired", closed=True, replied=False)
        result = pipeline.summarize_cohort([row])
        rate = result["stages"]["end_to_end_qualified_review_given_closed_outreach"]
        self.assertEqual(rate["trials"], 1)
        self.assertEqual(rate["successes"], 0)
        self.assertIsNotNone(rate["wilson_95_percent_interval"])


if __name__ == "__main__":
    unittest.main()
