#!/usr/bin/env python3
"""Evidence-led external reviewer prioritization and conversion measurement.

Scores prioritize research effort; they are not probabilities. Conversion
rates use completed, comparable outreach outcomes and Wilson confidence
intervals. Missing or immature outcomes are never counted as failures.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from collections import defaultdict
from datetime import date
from pathlib import Path
from typing import Any

FACTOR_WEIGHTS: dict[str, int] = {
    "relevant_independent_review_history": 30,
    "technical_scope_fit": 20,
    "observable_collaboration_followthrough": 15,
    "incentive_alignment": 15,
    "recent_activity_availability": 10,
    "participation_friction": 10,
}
MINIMUM_EVIDENCE_COVERAGE = 70.0
MINIMUM_COMPARABLE_OUTCOMES = 30
VALID_EVENTS = ("replied", "accepted", "completed", "qualified_independent_review")


def _is_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def score_candidate(candidate: dict[str, Any]) -> dict[str, Any]:
    """Return a weighted evidence-fit score, separate from conversion probability.

    Each numeric score must have at least one source/evidence reference. Unknown
    factors remain unknown and reduce evidence coverage; they are not zeroes.
    """
    supplied = candidate.get("factor_scores")
    if not isinstance(supplied, dict):
        raise ValueError("candidate.factor_scores must be an object")

    observed_weight = 0
    weighted_score = 0.0
    factors: dict[str, Any] = {}

    for factor, weight in FACTOR_WEIGHTS.items():
        item = supplied.get(factor)
        if item is None:
            factors[factor] = {"status": "UNKNOWN", "weight": weight}
            continue
        if not isinstance(item, dict):
            raise ValueError(f"{factor} must be an object or absent")
        value = item.get("score")
        evidence = item.get("evidence", [])
        if value is None:
            factors[factor] = {"status": "UNKNOWN", "weight": weight}
            continue
        if not _is_number(value) or not 0 <= value <= 5:
            raise ValueError(f"{factor}.score must be a number from 0 to 5")
        if not isinstance(evidence, list) or not evidence or any(
            not isinstance(ref, str) or not ref.strip() for ref in evidence
        ):
            raise ValueError(f"{factor}.score requires at least one non-empty evidence reference")
        observed_weight += weight
        weighted_score += weight * (float(value) / 5.0)
        factors[factor] = {
            "status": "EVIDENCED",
            "weight": weight,
            "score_0_to_5": float(value),
            "evidence": evidence,
        }

    coverage = observed_weight
    score = weighted_score / observed_weight * 100.0 if observed_weight else None
    rankable = coverage >= MINIMUM_EVIDENCE_COVERAGE and score is not None
    return {
        "candidate_id": candidate.get("candidate_id"),
        "ranking_status": "RANKABLE_WITH_RECORDED_EVIDENCE" if rankable else "INSUFFICIENT_EVIDENCE_FOR_RANKING",
        "fit_score_percent": round(score, 2) if rankable else None,
        "provisional_fit_score_percent": round(score, 2) if score is not None else None,
        "evidence_coverage_percent": round(coverage, 2),
        "fit_score_is_not_probability": True,
        "factors": factors,
        "hard_gates": candidate.get("hard_gates", {}),
    }


def validate_record(record: dict[str, Any]) -> None:
    required_text = ("id", "route", "scope", "sent_date")
    for key in required_text:
        if not isinstance(record.get(key), str) or not record[key].strip():
            raise ValueError(f"outreach record requires non-empty {key}")
    try:
        date.fromisoformat(record["sent_date"])
    except ValueError as exc:
        raise ValueError(f"{record['id']}: sent_date must be YYYY-MM-DD") from exc

    if not isinstance(record.get("closed"), bool):
        raise ValueError(f"{record['id']}: closed must be boolean")
    for event in VALID_EVENTS:
        value = record.get(event)
        if value is not None and not isinstance(value, bool):
            raise ValueError(f"{record['id']}: {event} must be true, false, or null")

    forecast = record.get("forecast_valid_review_percent")
    if forecast is not None and (not _is_number(forecast) or not 0 <= forecast <= 100):
        raise ValueError(f"{record['id']}: forecast_valid_review_percent must be from 0 to 100 or null")

    if record.get("accepted") is not None and record.get("replied") is not True:
        raise ValueError(f"{record['id']}: acceptance is only observed after a reply")
    if record.get("completed") is not None and record.get("accepted") is not True:
        raise ValueError(f"{record['id']}: completion is only observed after scope acceptance")
    if record.get("qualified_independent_review") is not None and record.get("completed") is not True:
        raise ValueError(f"{record['id']}: review quality is only observed after completion")

    if record["closed"]:
        if record.get("replied") is None:
            raise ValueError(f"{record['id']}: a closed outreach needs a known response outcome")
        if record.get("replied") is True and record.get("accepted") is None:
            raise ValueError(f"{record['id']}: a closed replied outreach needs a known acceptance outcome")
        if record.get("accepted") is True and record.get("completed") is None:
            raise ValueError(f"{record['id']}: a closed accepted task needs a known completion outcome")
        if record.get("completed") is True and record.get("qualified_independent_review") is None:
            raise ValueError(f"{record['id']}: a completed review needs a known quality/independence result")


def wilson_interval(successes: int, trials: int, z: float = 1.96) -> dict[str, float] | None:
    """Return the two-sided Wilson score interval as percentages."""
    if trials < 0 or successes < 0 or successes > trials:
        raise ValueError("require 0 <= successes <= trials")
    if trials == 0:
        return None
    p = successes / trials
    z2 = z * z
    denominator = 1 + z2 / trials
    center = (p + z2 / (2 * trials)) / denominator
    margin = z * math.sqrt((p * (1 - p) / trials) + (z2 / (4 * trials * trials))) / denominator
    return {
        "lower_percent": round(max(0.0, center - margin) * 100.0, 4),
        "upper_percent": round(min(1.0, center + margin) * 100.0, 4),
    }


def _rate(rows: list[dict[str, Any]], predicate: Any) -> dict[str, Any]:
    known = [row for row in rows if predicate(row)[0]]
    successes = sum(1 for row in known if predicate(row)[1])
    trials = len(known)
    pct = (successes / trials * 100.0) if trials else None
    interval = wilson_interval(successes, trials)
    if trials == 0:
        status = "NO_ELIGIBLE_OUTCOMES"
    elif trials < MINIMUM_COMPARABLE_OUTCOMES:
        status = "DESCRIPTIVE_ONLY_LOW_SAMPLE_NOT_CALIBRATED"
    else:
        status = "HISTORICAL_RATE_AVAILABLE_REQUIRES_OUT_OF_SAMPLE_CALIBRATION"
    return {
        "successes": successes,
        "trials": trials,
        "observed_rate_percent": round(pct, 4) if pct is not None else None,
        "wilson_95_percent_interval": interval,
        "status": status,
    }


def _stage_predicate(field: str, eligible: Any) -> Any:
    def predicate(row: dict[str, Any]) -> tuple[bool, bool]:
        if not eligible(row):
            return False, False
        value = row.get(field)
        return value is not None, value is True
    return predicate


def summarize_cohort(rows: list[dict[str, Any]]) -> dict[str, Any]:
    for row in rows:
        validate_record(row)
    ids = [row["id"] for row in rows]
    if len(ids) != len(set(ids)):
        raise ValueError("outreach record IDs must be unique within the ledger")

    replied_yes = lambda row: row.get("replied") is True
    accepted_yes = lambda row: row.get("accepted") is True
    completed_yes = lambda row: row.get("completed") is True

    stages = {
        "reply_given_outreach": _rate(rows, _stage_predicate("replied", lambda _row: True)),
        "acceptance_given_reply": _rate(rows, _stage_predicate("accepted", replied_yes)),
        "completion_given_acceptance": _rate(rows, _stage_predicate("completed", accepted_yes)),
        "qualified_independent_evidence_given_completion": _rate(
            rows, _stage_predicate("qualified_independent_review", completed_yes)
        ),
        "end_to_end_qualified_review_given_closed_outreach": _rate(
            rows,
            lambda row: (
                row.get("closed") is True,
                row.get("qualified_independent_review") is True,
            ),
        ),
    }

    forecasted_closed = [
        row for row in rows
        if row.get("closed") is True and row.get("forecast_valid_review_percent") is not None
    ]
    brier = None
    if forecasted_closed:
        squared_errors = []
        for row in forecasted_closed:
            forecast = row["forecast_valid_review_percent"] / 100.0
            observed = 1.0 if row.get("qualified_independent_review") is True else 0.0
            squared_errors.append((forecast - observed) ** 2)
        brier = round(sum(squared_errors) / len(squared_errors), 6)

    return {
        "route": rows[0]["route"] if rows else None,
        "scope": rows[0]["scope"] if rows else None,
        "records_in_cohort": len(rows),
        "stages": stages,
        "forecast_validation": {
            "matured_forecasts": len(forecasted_closed),
            "brier_score_0_best_1_worst": brier,
            "status": (
                "NOT_TESTABLE_WITHOUT_MATURED_FORECASTS"
                if not forecasted_closed
                else "DESCRIPTIVE_ONLY_LOW_SAMPLE_NOT_CALIBRATED"
                if len(forecasted_closed) < MINIMUM_COMPARABLE_OUTCOMES
                else "FORECAST_ERROR_MEASURED_CALIBRATION_STILL_REQUIRES_REVIEW"
            ),
        },
        "rule": "Observed rates are not calibrated predictions; fit scores are not probabilities.",
    }


def analyze_ledger(ledger: dict[str, Any]) -> dict[str, Any]:
    if ledger.get("schema_version") != 1:
        raise ValueError("unsupported ledger schema_version")
    records = ledger.get("outreach_records")
    if not isinstance(records, list):
        raise ValueError("ledger.outreach_records must be a list")
    for record in records:
        if not isinstance(record, dict):
            raise ValueError("each outreach record must be an object")
        validate_record(record)
    ids = [row["id"] for row in records]
    if len(ids) != len(set(ids)):
        raise ValueError("outreach record IDs must be globally unique")

    cohorts: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    for row in records:
        cohorts[(row["route"], row["scope"])].append(row)

    cohort_summaries = [
        summarize_cohort(cohorts[key])
        for key in sorted(cohorts)
    ]
    return {
        "schema_version": 1,
        "measurement_policy": {
            "minimum_comparable_outcomes_before_historical_rate_reporting": MINIMUM_COMPARABLE_OUTCOMES,
            "minimum_evidence_coverage_for_ranked_fit_score_percent": MINIMUM_EVIDENCE_COVERAGE,
            "unknown_outcomes_are_not_failures": True,
            "historical_rates_are_not_called_calibrated_without_out_of_sample_validation": True,
        },
        "cohorts": cohort_summaries,
        "planning_scenarios": ledger.get("planning_scenarios", []),
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ledger", type=Path, required=True, help="path to external-review ledger JSON")
    parser.add_argument("--candidate", type=Path, help="optional JSON file with one candidate factor_scores object")
    args = parser.parse_args(argv)

    try:
        ledger = json.loads(args.ledger.read_text(encoding="utf-8"))
        report = analyze_ledger(ledger)
        if args.candidate:
            candidate = json.loads(args.candidate.read_text(encoding="utf-8"))
            report["candidate_score"] = score_candidate(candidate)
        print(json.dumps(report, indent=2, sort_keys=True))
        return 0
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        print(f"external-review pipeline error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
