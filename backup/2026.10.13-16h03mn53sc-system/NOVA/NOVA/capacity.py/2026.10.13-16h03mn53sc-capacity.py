#!/usr/bin/env python3
"""Provider-neutral quota, credit, and renewal observation helpers.

Providers expose capacity differently. NOVA stores observations using common
names but preserves the provider-specific source and raw values. A missing
measurement is UNKNOWN, never assumed to be unlimited or zero-cost.
"""

from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from typing import Any, Mapping


def _number(value: Any) -> float | int | None:
    if value is None:
        return None
    try:
        number = float(str(value).strip())
    except (TypeError, ValueError):
        return None
    return int(number) if number.is_integer() else number


def _seconds(value: Any) -> float | None:
    if value is None:
        return None
    text = str(value).strip().lower()
    if not text:
        return None
    try:
        return float(text)
    except ValueError:
        pass
    total = 0.0
    matched = False
    for amount, unit in re.findall(r"(\d+(?:\.\d+)?)\s*([dhms])", text):
        matched = True
        multiplier = {"d": 86400, "h": 3600, "m": 60, "s": 1}[unit]
        total += float(amount) * multiplier
    return total if matched else None


def _header_lookup(headers: Mapping[str, Any]) -> dict[str, str]:
    return {str(k).lower(): str(v) for k, v in headers.items()}



def split_capacity_dimensions(
    snapshot: Mapping[str, Any] | None,
) -> dict[str, Any]:
    """Separate total resource observations from call/rate allowances.

    Rate-limit headers describe what may be consumed in a call/window; they are
    not authoritative evidence of the total resource pool. Total resources must
    come from explicit resource observations such as account/project balances,
    credits, GPU time, or provider-reported allocation records.
    """
    if not isinstance(snapshot, Mapping):
        return {"resources": {}, "call_allowances": {}}

    resources = snapshot.get("resources")
    allowances = snapshot.get("call_allowances")

    return {
        "resources": dict(resources) if isinstance(resources, Mapping) else {},
        "call_allowances": dict(allowances) if isinstance(allowances, Mapping) else {},
    }


def resource_balance(
    *,
    name: str,
    remaining: Any,
    total: Any = None,
    unit: str = "UNSPECIFIED",
    renewal_period_seconds: Any = None,
    expiration_at: str | None = None,
    source: str = "explicit_observation",
) -> dict[str, Any]:
    """Create a total-resource observation without confusing it with call limits."""
    balance = {
        "name": str(name),
        "remaining": _number(remaining),
        "total": _number(total),
        "unit": str(unit),
        "renewal_period_seconds": _seconds(renewal_period_seconds),
        "expiration_at": expiration_at,
        "source": source,
        "measurement_type": "TOTAL_RESOURCE",
    }
    return balance


def call_allowance(
    *,
    name: str,
    limit: Any,
    remaining: Any,
    window_seconds: Any = None,
    reset_after_seconds: Any = None,
    unit: str = "requests",
    source: str = "rate_limit_observation",
) -> dict[str, Any]:
    """Create a call/window allowance observation distinct from total resources."""
    allowance = {
        "name": str(name),
        "limit": _number(limit),
        "remaining": _number(remaining),
        "window_seconds": _seconds(window_seconds),
        "reset_after_seconds": _seconds(reset_after_seconds),
        "unit": str(unit),
        "source": source,
        "measurement_type": "CALL_ALLOWANCE",
    }
    return allowance


def extract_rate_limit_snapshot(
    provider: str,
    headers: Mapping[str, Any] | None = None,
    *,
    observed_at: str | None = None,
) -> dict[str, Any]:
    """Extract commonly available remaining/limit/reset fields from headers."""
    normalized = _header_lookup(headers or {})
    provider_name = provider.lower()

    generic_mapping = {
        "requests": (
            "x-ratelimit-limit-requests",
            "x-ratelimit-remaining-requests",
            "x-ratelimit-reset-requests",
            "requests",
            None,
        ),
        "tokens": (
            "x-ratelimit-limit-tokens",
            "x-ratelimit-remaining-tokens",
            "x-ratelimit-reset-tokens",
            "tokens",
            None,
        ),
    }

    metrics: dict[str, Any] = {}
    call_allowances: dict[str, Any] = {}

    if provider_name == "mistral":
        # Mistral uses window-qualified names; keep minute, short-window, and
        # monthly allowances separate instead of collapsing them into one quota.
        mappings = {
            "requests_per_minute": (
                "x-ratelimit-limit-req-minute",
                "x-ratelimit-remaining-req-minute",
                "x-ratelimit-reset-req-minute",
                "requests",
                60,
            ),
            "requests_per_10_seconds": (
                "x-ratelimit-limit-req-10-second",
                "x-ratelimit-remaining-req-10-second",
                "x-ratelimit-reset-req-10-second",
                "requests",
                10,
            ),
            "tokens_per_minute": (
                "x-ratelimit-limit-tokens-minute",
                "x-ratelimit-remaining-tokens-minute",
                "x-ratelimit-reset-tokens-minute",
                "tokens",
                60,
            ),
            "tokens_per_month": (
                "x-ratelimit-limit-tokens-month",
                "x-ratelimit-remaining-tokens-month",
                "x-ratelimit-reset-tokens-month",
                "tokens",
                None,
            ),
        }
    else:
        mappings = generic_mapping

    for metric, (limit_key, remaining_key, reset_key, unit, window_seconds) in mappings.items():
        present = any(k in normalized for k in (limit_key, remaining_key, reset_key))
        if not present:
            continue
        record = {
            "limit": _number(normalized.get(limit_key)),
            "remaining": _number(normalized.get(remaining_key)),
            "reset_after_seconds": _seconds(normalized.get(reset_key)),
            "window_seconds": window_seconds,
            "unit": unit,
            "source": "http_response_headers",
            "measurement_type": "CALL_ALLOWANCE",
        }
        metrics[metric] = record
        call_allowances[metric] = call_allowance(
            name=metric,
            limit=normalized.get(limit_key),
            remaining=normalized.get(remaining_key),
            window_seconds=window_seconds,
            reset_after_seconds=normalized.get(reset_key),
            unit=unit,
        )

    query_cost = _number(normalized.get("x-ratelimit-tokens-query-cost"))
    if query_cost is not None:
        metrics["tokens_query_cost"] = {
            "value": query_cost,
            "unit": "tokens",
            "source": "http_response_headers",
            "measurement_type": "REQUEST_USAGE",
        }

    retry_after = _seconds(normalized.get("retry-after"))
    if retry_after is not None:
        metrics["retry_after_seconds"] = retry_after

    snapshot = {
        "provider": provider,
        "observed_at": observed_at or datetime.now(timezone.utc).isoformat(),
        "measurement_state": "OBSERVED" if metrics else "NOT_EXPOSED",
        "metrics": metrics,
        "resources": {},
        "call_allowances": call_allowances,
    }

    if metrics:
        snapshot["estimated_next_reset_at"] = {}
        observed_dt = datetime.fromisoformat(snapshot["observed_at"])
        for metric, data in metrics.items():
            if not isinstance(data, dict):
                continue
            seconds = data.get("reset_after_seconds")
            if seconds is not None:
                snapshot["estimated_next_reset_at"][metric] = (
                    observed_dt + timedelta(seconds=float(seconds))
                ).isoformat()

    return snapshot



def _parse_time(value: Any) -> datetime | None:
    if not isinstance(value, str) or not value.strip():
        return None
    try:
        parsed = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)




def economic_net_value(
    *,
    expected_benefit: Any,
    direct_cash_cost: Any = None,
    opportunity_cost: Any = None,
    negative_effects_cost: Any = None,
    value_asset: str = "UNSPECIFIED",
) -> dict[str, Any]:
    """Compute net value only when all supplied monetary-like terms share a unit."""
    benefit = _number(expected_benefit)
    cost = _number(direct_cash_cost)
    opportunity = _number(opportunity_cost)
    negative = _number(negative_effects_cost)

    if benefit is None:
        return {
            "state": "BENEFIT_UNKNOWN",
            "net_value": None,
            "value_asset": value_asset,
            "comparable": False,
        }

    terms = [cost, opportunity, negative]
    if any(value is not None and value < 0 for value in terms):
        return {
            "state": "INVALID_NEGATIVE_COST",
            "net_value": None,
            "value_asset": value_asset,
            "comparable": False,
        }

    if cost is None and opportunity is None and negative is None:
        return {
            "state": "BENEFIT_ONLY",
            "net_value": benefit,
            "value_asset": value_asset,
            "comparable": False,
        }

    total_cost = sum(value or 0.0 for value in terms)
    net = benefit - total_cost
    return {
        "state": "POSITIVE" if net > 0 else "NON_POSITIVE",
        "net_value": net,
        "benefit": benefit,
        "direct_cash_cost": cost,
        "opportunity_cost": opportunity,
        "negative_effects_cost": negative,
        "value_asset": value_asset,
        "comparable": True,
    }


def capacity_economic_signal(
    snapshot: Mapping[str, Any] | None,
    *,
    task_units: float | int | None = None,
    expected_task_benefit: float | int | None = None,
    expected_task_value_asset: str = "UNSPECIFIED",
) -> dict[str, Any]:
    """Evaluate whether consuming observed capacity has a positive/known economic case.

    No benefit, cost, or renewal rate is inferred. Unknown economics produce a
    neutral signal and therefore cannot by themselves trigger additional work.
    """
    if not isinstance(snapshot, Mapping):
        return {
            "state": "UNKNOWN",
            "priority_multiplier": 0.0,
            "cash_cost": None,
            "resource_opportunity": None,
            "renewability": "UNKNOWN",
        }

    economics = snapshot.get("economics")
    if not isinstance(economics, Mapping):
        return {
            "state": "ECONOMICS_UNKNOWN",
            "priority_multiplier": 0.0,
            "cash_cost": None,
            "resource_opportunity": None,
            "renewability": "UNKNOWN",
        }

    free = economics.get("free")
    unit_cost = _number(economics.get("cash_cost_per_unit"))
    explicit_cost = _number(economics.get("cash_cost"))
    units = float(task_units) if task_units is not None else None
    cash_cost = explicit_cost
    if cash_cost is None and unit_cost is not None and units is not None:
        cash_cost = unit_cost * units

    renewal = economics.get("renewal")
    renewal_period = _number(renewal.get("period_seconds")) if isinstance(renewal, Mapping) else None
    replenishment = _number(renewal.get("units_per_period")) if isinstance(renewal, Mapping) else None
    if renewal_period is not None and renewal_period > 0:
        renewability = (
            "FAST" if renewal_period <= 300
            else "MODERATE" if renewal_period <= 3600
            else "SLOW"
        )
    else:
        renewability = "UNKNOWN"

    task_benefit = _number(expected_task_benefit)
    negative_effects = _number(economics.get("negative_effects_cost"))
    opportunity_cost = _number(economics.get("opportunity_cost"))
    net_value = economic_net_value(
        expected_benefit=task_benefit,
        direct_cash_cost=cash_cost,
        opportunity_cost=opportunity_cost,
        negative_effects_cost=negative_effects,
        value_asset=expected_task_value_asset,
    )

    if task_benefit is None:
        return {
            "state": "BENEFIT_UNKNOWN",
            "priority_multiplier": 0.0,
            "cash_cost": cash_cost,
            "resource_opportunity": "UNKNOWN",
            "renewability": renewability,
            "value_asset": expected_task_value_asset,
        }

    if net_value["comparable"] and float(net_value["net_value"]) <= 0:
        return {
            "state": "NEGATIVE_NET_VALUE",
            "priority_multiplier": -1.0,
            "cash_cost": cash_cost,
            "task_benefit": task_benefit,
            "net_value": net_value,
            "resource_opportunity": "DO_NOT_PREFER",
            "renewability": renewability,
            "value_asset": expected_task_value_asset,
        }

    if free is True or cash_cost == 0:
        return {
            "state": "NON_NEGATIVE_FREE_RESOURCE",
            "priority_multiplier": 1.0,
            "cash_cost": 0.0 if cash_cost is None else cash_cost,
            "task_benefit": task_benefit,
            "net_value": net_value,
            "resource_opportunity": "USABLE_IF_WORK_IS_ALREADY_REQUIRED",
            "renewability": renewability,
            "value_asset": expected_task_value_asset,
        }

    if cash_cost is not None:
        return {
            "state": "POSITIVE_NET_VALUE",
            "priority_multiplier": 1.0,
            "cash_cost": cash_cost,
            "task_benefit": task_benefit,
            "net_value": net_value,
            "resource_opportunity": "USABLE_IF_ALTERNATIVE_COST_IS_NOT_LOWER",
            "renewability": renewability,
            "value_asset": expected_task_value_asset,
        }

    return {
        "state": "ECONOMICS_PARTIAL",
        "priority_multiplier": 0.0,
        "cash_cost": cash_cost,
        "task_benefit": task_benefit,
        "net_value": net_value,
        "resource_opportunity": "UNKNOWN",
        "renewability": renewability,
        "value_asset": expected_task_value_asset,
    }

def capacity_opportunity(
    snapshot: Mapping[str, Any] | None,
    *,
    now: datetime | None = None,
    urgency_window_seconds: int | float = 300,
    minimum_remaining_reserve_fraction: float = 0.2,
    max_observation_age_seconds: int | float | None = None,
) -> dict[str, Any]:
    """Describe whether observed capacity should be used before its window resets/expires.

    This is an optimization signal, not a claim about provider truth. Only provider-
    exposed or explicitly supplied capacity is considered authoritative enough to
    influence scheduling. Unknown capacity never receives an artificial boost.
    """
    if not isinstance(snapshot, Mapping):
        return {
            "state": "UNKNOWN",
            "priority": 0.0,
            "seconds_to_deadline": None,
            "metric": None,
        }

    observed_at = _parse_time(snapshot.get("observed_at"))
    current = now or datetime.now(timezone.utc)
    if current.tzinfo is None:
        current = current.replace(tzinfo=timezone.utc)
    current = current.astimezone(timezone.utc)

    if observed_at is None:
        return {
            "state": "UNKNOWN",
            "priority": 0.0,
            "seconds_to_deadline": None,
            "metric": None,
        }

    age = (current - observed_at).total_seconds()
    if age < 0:
        return {
            "state": "UNKNOWN",
            "priority": 0.0,
            "seconds_to_deadline": None,
            "metric": None,
        }
    if max_observation_age_seconds is not None and age > float(max_observation_age_seconds):
        return {
            "state": "STALE",
            "priority": 0.0,
            "seconds_to_deadline": None,
            "metric": None,
            "observation_age_seconds": age,
        }

    deadlines: list[tuple[str, datetime]] = []
    direct_expiration = _parse_time(snapshot.get("expiration_at"))
    if direct_expiration is not None:
        deadlines.append(("expiration", direct_expiration))

    reset_map = snapshot.get("estimated_next_reset_at")
    if isinstance(reset_map, Mapping):
        for metric, value in reset_map.items():
            deadline = _parse_time(value)
            if deadline is not None:
                deadlines.append((str(metric), deadline))

    if not deadlines:
        return {
            "state": "AVAILABLE_UNKNOWN_DEADLINE",
            "priority": 0.0,
            "seconds_to_deadline": None,
            "metric": None,
            "observation_age_seconds": age,
        }

    positive_remaining: list[tuple[str, float, float | None, str]] = []

    # Rate-limit/call-allowance observations may have reset deadlines.
    for metric, data in (snapshot.get("metrics") or {}).items():
        if not isinstance(data, Mapping):
            continue
        remaining = _number(data.get("remaining"))
        limit = _number(data.get("limit"))
        if remaining is None or remaining <= 0:
            continue
        fraction = (float(remaining) / float(limit)) if limit and limit > 0 else None
        positive_remaining.append(
            (str(metric), float(remaining), fraction, "CALL_ALLOWANCE")
        )

    # Explicit total-resource observations (credits, GPU-hours, neurons, etc.)
    # may expire independently from call allowances.
    for metric, data in (snapshot.get("resources") or {}).items():
        if not isinstance(data, Mapping):
            continue
        remaining = _number(data.get("remaining"))
        total = _number(data.get("total"))
        if remaining is None or remaining <= 0:
            continue
        fraction = (float(remaining) / float(total)) if total and total > 0 else None
        positive_remaining.append(
            (str(metric), float(remaining), fraction, "TOTAL_RESOURCE")
        )

    if not positive_remaining:
        return {
            "state": "EXHAUSTED_OR_NOT_EXPOSED",
            "priority": 0.0,
            "seconds_to_deadline": None,
            "metric": None,
            "observation_age_seconds": age,
        }

    positive_deadlines = [(metric, deadline) for metric, deadline in deadlines if deadline >= current]
    if not positive_deadlines:
        return {
            "state": "WINDOW_ENDED",
            "priority": 0.0,
            "seconds_to_deadline": 0.0,
            "metric": None,
            "observation_age_seconds": age,
        }

    metric_deadlines = {
        metric_name: deadline for metric_name, deadline in positive_deadlines
    }
    eligible = []
    for resource_metric, remaining, fraction, dimension in positive_remaining:
        if resource_metric in metric_deadlines and (
            fraction is None or fraction > minimum_remaining_reserve_fraction
        ):
            eligible.append((resource_metric, remaining, fraction, dimension))

    # A direct expiration deadline may apply to the whole snapshot rather than
    # to one named metric, so retain it as a fallback when no metric-specific
    # deadline is available for the remaining resource.
    if not eligible and any(name == "expiration" for name, _ in positive_deadlines):
        for resource_metric, remaining, fraction, dimension in positive_remaining:
            if fraction is None or fraction > minimum_remaining_reserve_fraction:
                eligible.append((resource_metric, remaining, fraction, dimension))

    if not eligible:
        return {
            "state": "PROTECTED_RESERVE",
            "priority": 0.0,
            "seconds_to_deadline": None,
            "metric": None,
            "observation_age_seconds": age,
        }

    metric, deadline = min(
        (
            (name, deadline)
            for name, deadline in positive_deadlines
            if name in {item[0] for item in eligible} or name == "expiration"
        ),
        key=lambda item: item[1],
    )
    seconds_to_deadline = (deadline - current).total_seconds()

    if not eligible:
        return {
            "state": "PROTECTED_RESERVE",
            "priority": 0.0,
            "seconds_to_deadline": seconds_to_deadline,
            "metric": metric,
            "observation_age_seconds": age,
        }

    window = max(float(urgency_window_seconds), 1.0)
    if seconds_to_deadline <= window:
        urgency = max(0.001, 1.0 - (seconds_to_deadline / window))
        return {
            "state": "EXPIRING_SOON",
            "priority": 1.0 + urgency,
            "seconds_to_deadline": seconds_to_deadline,
            "metric": metric,
            "remaining": max(item[1] for item in eligible),
            "dimension": next(
                item[3] for item in eligible
                if item[1] == max(candidate[1] for candidate in eligible)
            ),
            "observation_age_seconds": age,
        }

    return {
        "state": "AVAILABLE",
        "priority": 0.0,
        "seconds_to_deadline": seconds_to_deadline,
        "metric": metric,
        "remaining": max(item[1] for item in eligible),
        "dimension": next(
            item[3] for item in eligible
            if item[1] == max(candidate[1] for candidate in eligible)
        ),
        "observation_age_seconds": age,
    }


def provider_capacity_opportunity(
    targets: Mapping[str, Any] | None,
    *,
    provider: str,
    namespace: str,
    now: datetime | None = None,
    urgency_window_seconds: int | float = 300,
    minimum_remaining_reserve_fraction: float = 0.2,
    max_observation_age_seconds: int | float | None = None,
    task_units: float | int | None = None,
    expected_task_benefit: float | int | None = None,
    expected_task_value_asset: str = "UNSPECIFIED",
    allow_required_work_reuse: bool = False,
) -> dict[str, Any]:
    """Return the strongest current expiry opportunity across a provider's targets."""
    if not isinstance(targets, Mapping):
        return capacity_opportunity(None)

    prefix = f"{namespace}:{provider}:"
    candidates = []
    for key, target in targets.items():
        if not str(key).startswith(prefix) or not isinstance(target, Mapping):
            continue
        snapshot = target.get("last_capacity")
        opportunity = capacity_opportunity(
            snapshot,
            now=now,
            urgency_window_seconds=urgency_window_seconds,
            minimum_remaining_reserve_fraction=minimum_remaining_reserve_fraction,
            max_observation_age_seconds=max_observation_age_seconds,
        )
        economics = capacity_economic_signal(
            snapshot,
            task_units=task_units,
            expected_task_benefit=expected_task_benefit,
            expected_task_value_asset=expected_task_value_asset,
        )
        opportunity["economic_signal"] = economics

        # Expiry pressure cannot create work. An already-required health
        # probe may, however, reuse capacity that would otherwise expire.
        if opportunity.get("state") == "EXPIRING_SOON":
            multiplier = float(economics.get("priority_multiplier", 0.0))
            if allow_required_work_reuse and economics.get("state") in {
                "ECONOMICS_UNKNOWN",
                "BENEFIT_UNKNOWN",
            }:
                opportunity["economic_signal"] = {
                    "state": "REQUIRED_WORK_EXPIRY_REUSE",
                    "priority_multiplier": 1.0,
                    "cash_cost": economics.get("cash_cost"),
                    "resource_opportunity": "REUSE_EXPIRING_CAPACITY_FOR_ALREADY_REQUIRED_WORK",
                    "renewability": economics.get("renewability", "UNKNOWN"),
                    "value_asset": expected_task_value_asset,
                    "comparable": False,
                }
                opportunity["priority"] = float(opportunity.get("priority", 0.0))
            else:
                opportunity["priority"] = (
                    float(opportunity.get("priority", 0.0)) * multiplier
                    if multiplier > 0
                    else 0.0
                )
        candidates.append((float(opportunity.get("priority", 0.0)), opportunity))

    if not candidates:
        return capacity_opportunity(None)
    return max(candidates, key=lambda item: item[0])[1]

def attach_resource_observations(
    snapshot: dict[str, Any],
    resources: Mapping[str, Any] | None,
) -> dict[str, Any]:
    """Attach explicitly observed total resources; never derive them from rate limits."""
    if not isinstance(resources, Mapping):
        return snapshot
    normalized: dict[str, Any] = {}
    for name, value in resources.items():
        if isinstance(value, Mapping):
            item = dict(value)
            item.setdefault("measurement_type", "TOTAL_RESOURCE")
            normalized[str(name)] = item
        else:
            normalized[str(name)] = {
                "remaining": _number(value),
                "measurement_type": "TOTAL_RESOURCE",
                "source": "explicit_observation",
            }
    snapshot["resources"] = normalized
    return snapshot


def merge_usage(
    quota_snapshot: dict[str, Any],
    usage: Mapping[str, Any] | None,
) -> dict[str, Any]:
    """Attach token/compute usage returned by the API without inventing missing values."""
    if not usage:
        return quota_snapshot
    normalized = {}
    for key, value in usage.items():
        if isinstance(value, (int, float)):
            normalized[str(key)] = value
        elif value is not None:
            numeric = _number(value)
            normalized[str(key)] = numeric if numeric is not None else str(value)
    if normalized:
        quota_snapshot["last_request_usage"] = normalized
    return quota_snapshot


def annotate_probe(
    probe: dict[str, Any],
    *,
    provider: str,
    headers: Mapping[str, Any] | None = None,
    usage: Mapping[str, Any] | None = None,
    resources: Mapping[str, Any] | None = None,
) -> dict[str, Any]:
    snapshot = extract_rate_limit_snapshot(provider, headers)
    snapshot = attach_resource_observations(snapshot, resources)
    snapshot = merge_usage(snapshot, usage)
    probe["capacity"] = snapshot
    return probe
