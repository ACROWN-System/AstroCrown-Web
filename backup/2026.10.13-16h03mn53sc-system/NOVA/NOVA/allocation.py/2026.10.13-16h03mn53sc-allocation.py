#!/usr/bin/env python3
"""Deterministic multi-resource allocation without live provider calls.

The allocator separates hard resource constraints from optimization signals. It
never invents missing cost, capacity, or benefit values and can operate entirely
on supplied observations, making it suitable for tests before credentials exist.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Mapping

from .capacity import capacity_economic_signal, capacity_opportunity, split_capacity_dimensions
from .health import observation_freshness


HEALTH_RANK = {"HEALTHY": 3, "DEGRADED": 2, "STALE": 1, "UNKNOWN": 0, "UNCONFIGURED": 0, "UNACCEPTABLE": -1}
QUALITY_RANK = {"PASS": 2, "VERIFIED": 2, "UNKNOWN": 0, "UNVERIFIED": 0, "FAIL": -1}


def _number(value: Any) -> float | None:
    try:
        if value is None:
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _mapping(value: Any) -> Mapping[str, Any]:
    return value if isinstance(value, Mapping) else {}


def _required_value(task: Mapping[str, Any], name: str) -> float:
    value = _number(task.get(name))
    return max(0.0, value or 0.0)


def _check_dimension_requirements(
    capacity: Mapping[str, Any],
    task: Mapping[str, Any],
) -> tuple[bool, list[str]]:
    dimensions = split_capacity_dimensions(capacity)
    reasons: list[str] = []

    required_calls = _required_value(task, "required_calls")
    required_tokens = _required_value(task, "required_tokens")
    allowances = _mapping(dimensions.get("call_allowances"))

    if required_calls > 0:
        observed = _mapping(allowances.get("requests"))
        remaining = _number(observed.get("remaining"))
        if remaining is not None and remaining < required_calls:
            return False, ["CALL_ALLOWANCE_INSUFFICIENT"]
        if remaining is None:
            reasons.append("CALL_ALLOWANCE_UNKNOWN")

    if required_tokens > 0:
        observed = _mapping(allowances.get("tokens"))
        remaining = _number(observed.get("remaining"))
        if remaining is not None and remaining < required_tokens:
            return False, ["TOKEN_ALLOWANCE_INSUFFICIENT"]
        if remaining is None:
            reasons.append("TOKEN_ALLOWANCE_UNKNOWN")

    resources = _mapping(dimensions.get("resources"))
    for name, required in _mapping(task.get("required_resources")).items():
        needed = _number(required)
        if needed is None or needed <= 0:
            continue
        observed = _mapping(resources.get(str(name)))
        remaining = _number(observed.get("remaining"))
        if remaining is not None and remaining < needed:
            return False, [f"TOTAL_RESOURCE_INSUFFICIENT:{name}"]
        if remaining is None:
            reasons.append(f"TOTAL_RESOURCE_UNKNOWN:{name}")

    return True, reasons


def evaluate_candidate(
    candidate: Mapping[str, Any],
    task: Mapping[str, Any],
    *,
    now: datetime | None = None,
    policy: Mapping[str, Any] | None = None,
) -> dict[str, Any]:
    """Evaluate one candidate without making a live call."""
    policy = policy or {}
    capacity = _mapping(candidate.get("capacity"))
    health = str(candidate.get("health_status") or "UNKNOWN")
    quality = str(candidate.get("quality_status") or "UNKNOWN")
    reasons: list[str] = []

    freshness_limit = _number(policy.get("maximum_health_observation_age_seconds"))
    health_observed_at = candidate.get("health_observed_at")
    freshness = observation_freshness(
        health_observed_at,
        fresh_for_seconds=freshness_limit,
        now=now,
    ) if freshness_limit is not None else "UNSPECIFIED"

    hard_eligible = health != "UNACCEPTABLE"
    if health == "STALE" or freshness == "STALE":
        hard_eligible = False
        reasons.append("HEALTH_EVIDENCE_STALE")
    if health in {"UNACCEPTABLE", "UNCONFIGURED"}:
        hard_eligible = False
        reasons.append(f"HEALTH_{health}")

    fits, fit_reasons = _check_dimension_requirements(capacity, task)
    hard_eligible = hard_eligible and fits
    reasons.extend(fit_reasons)

    opportunity = capacity_opportunity(
        capacity,
        now=now or datetime.now(timezone.utc),
        urgency_window_seconds=_number(policy.get("expiry_urgency_window_seconds")) or 300,
        minimum_remaining_reserve_fraction=_number(policy.get("minimum_remaining_reserve_fraction")) or 0.2,
        max_observation_age_seconds=_number(policy.get("maximum_capacity_observation_age_seconds")),
    )

    economics = capacity_economic_signal(
        capacity,
        task_units=_number(task.get("task_units")),
        expected_task_benefit=_number(task.get("expected_benefit")),
        expected_task_value_asset=str(task.get("value_asset") or "UNSPECIFIED"),
    )

    if opportunity.get("state") == "EXPIRING_SOON":
        economic_state = str(economics.get("state"))
        if economic_state == "NEGATIVE_NET_VALUE":
            reasons.append("EXPIRY_BOOST_BLOCKED_BY_NEGATIVE_ECONOMICS")
        elif economic_state in {"BENEFIT_UNKNOWN", "ECONOMICS_UNKNOWN", "ECONOMICS_PARTIAL"}:
            reasons.append("EXPIRY_BOOST_BLOCKED_BY_UNKNOWN_ECONOMICS")

    metrics = {
        "health": HEALTH_RANK.get(health, 0),
        "quality": QUALITY_RANK.get(quality, 0),
        "latency_ms": _number(candidate.get("latency_ms")),
        "expiry_priority": _number(opportunity.get("priority")) or 0.0,
        "economic_priority": _number(economics.get("priority_multiplier")) or 0.0,
        "negative_effects": _number(_mapping(capacity.get("economics")).get("negative_effects_cost")),
    }

    # Unknown economics/capacity never cause a positive optimization boost.
    if metrics["economic_priority"] < 0:
        hard_eligible = False
        reasons.append("NEGATIVE_ECONOMICS")
    if opportunity.get("state") == "EXPIRING_SOON" and metrics["economic_priority"] <= 0:
        metrics["expiry_priority"] = 0.0

    return {
        "provider": candidate.get("provider") or candidate.get("name"),
        "model": candidate.get("model"),
        "eligible": bool(hard_eligible),
        "health_status": health,
        "quality_status": quality,
        "freshness": freshness,
        "reasons": reasons,
        "metrics": metrics,
        "capacity_opportunity": opportunity,
        "economic_signal": economics,
    }


def dominates(left: Mapping[str, Any], right: Mapping[str, Any]) -> bool:
    """Return whether left is no worse and strictly better on comparable metrics."""
    if bool(left.get("eligible")) != bool(right.get("eligible")):
        return bool(left.get("eligible"))

    lm = _mapping(left.get("metrics"))
    rm = _mapping(right.get("metrics"))
    comparable = {
        "health": "higher",
        "quality": "higher",
        "latency_ms": "lower",
        "expiry_priority": "higher",
        "economic_priority": "higher",
        "negative_effects": "lower",
    }
    strictly_better = False
    compared = False
    for name, direction in comparable.items():
        lv = _number(lm.get(name))
        rv = _number(rm.get(name))
        if lv is None or rv is None:
            continue
        compared = True
        if direction == "higher":
            if lv < rv:
                return False
            strictly_better = strictly_better or lv > rv
        else:
            if lv > rv:
                return False
            strictly_better = strictly_better or lv < rv
    return compared and strictly_better


def pareto_frontier(evaluations: list[Mapping[str, Any]]) -> list[dict[str, Any]]:
    """Keep candidates not dominated by another candidate on known dimensions."""
    frontier: list[dict[str, Any]] = []
    for candidate in evaluations:
        if not candidate.get("eligible"):
            continue
        if any(dominates(other, candidate) for other in evaluations if other is not candidate):
            continue
        frontier.append(dict(candidate))
    return frontier


def select_resource_candidate(
    candidates: list[Mapping[str, Any]],
    task: Mapping[str, Any],
    *,
    now: datetime | None = None,
    policy: Mapping[str, Any] | None = None,
) -> dict[str, Any]:
    """Evaluate candidates and return a deterministic frontier-based selection."""
    evaluations = [evaluate_candidate(item, task, now=now, policy=policy) for item in candidates]
    frontier = pareto_frontier(evaluations)
    selected = frontier[0] if frontier else None
    if selected is not None:
        return {"status": "SELECTED", "selected": selected, "frontier": frontier, "evaluations": evaluations}
    return {"status": "NO_ELIGIBLE_CANDIDATE", "selected": None, "frontier": [], "evaluations": evaluations}

