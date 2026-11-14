#!/usr/bin/env python3
"""Provider-agnostic economic accounting for NOVA.

Public service pricing is deliberately independent from the backend provider.
Free capacity reduces internal cost; it never changes the user's tariff.
Paid-provider costs are charged to the common operating pool.
"""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from typing import Any


def money(value: Any) -> Decimal:
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return Decimal("0")


def service_price(pricing_policy: dict[str, Any], service: str) -> dict[str, Any]:
    services = pricing_policy.get("services", {})
    record = services.get(service)
    if not isinstance(record, dict):
        raise KeyError(f"Unknown service: {service}")
    return record


def provider_cost(
    provider: dict[str, Any],
    *,
    input_tokens: int = 0,
    output_tokens: int = 0,
    units: Decimal | int | float = 0,
    gpu_hours: Decimal | int | float = 0,
) -> Decimal:
    pricing = provider.get("pricing", {})
    if pricing.get("free", False):
        return Decimal("0")

    unit = str(pricing.get("unit", "request"))
    if unit == "token":
        in_rate = money(pricing.get("input_per_million_tokens", 0))
        out_rate = money(pricing.get("output_per_million_tokens", 0))
        return (
            Decimal(input_tokens) * in_rate / Decimal(1_000_000)
            + Decimal(output_tokens) * out_rate / Decimal(1_000_000)
        )
    if unit == "gpu_hour":
        return Decimal(str(gpu_hours)) * money(pricing.get("per_gpu_hour", 0))
    if unit == "unit":
        return Decimal(str(units)) * money(pricing.get("per_unit", 0))
    return money(pricing.get("per_request", 0))


def record_transaction(
    state: dict[str, Any],
    *,
    service: str,
    public_price_amount: Decimal | int | float,
    public_price_asset: str,
    provider_name: str,
    provider_cost_amount: Decimal | int | float,
    provider_cost_asset: str,
    free_resource: bool,
    resource_usage: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Record revenue and internal backend cost without changing public price."""
    revenue = money(public_price_amount)
    cost = money(provider_cost_amount)
    contribution = revenue - cost

    entry = {
        "recorded_at": datetime.now(timezone.utc).isoformat(),
        "service": service,
        "public_price": {
            "amount": str(revenue),
            "asset": public_price_asset,
        },
        "provider": provider_name,
        "provider_cost": {
            "amount": str(cost),
            "asset": provider_cost_asset,
        },
        "free_resource": bool(free_resource),
        "operating_contribution": {
            "amount": str(contribution),
            "asset": public_price_asset if public_price_asset == provider_cost_asset else "MIXED",
        },
        "resource_usage": resource_usage or {},
    }

    state.setdefault("transactions", []).append(entry)
    state["transactions"] = state["transactions"][-1000:]
    state["operating_pool"] = str(
        money(state.get("operating_pool", "0")) + contribution
    )
    state["updated_at"] = entry["recorded_at"]
    return entry




def continuity_headroom(
    *,
    operating_pool: Decimal | int | float,
    projected_daily_paid_cost: Decimal | int | float,
    notice_period_days: int,
    replenishment_target: Decimal | int | float,
    emergency_reserve_ratio: Decimal | int | float = 1,
) -> dict[str, Any]:
    """Measure whether the operating pool can absorb a provider-cost transition."""
    pool = money(operating_pool)
    daily = money(projected_daily_paid_cost)
    replenishment = money(replenishment_target)
    reserve_ratio = money(emergency_reserve_ratio)

    if notice_period_days < 0:
        raise ValueError("notice_period_days cannot be negative")
    if reserve_ratio < 0:
        raise ValueError("emergency_reserve_ratio cannot be negative")

    notice_cost = daily * Decimal(notice_period_days)
    emergency_reserve = notice_cost * reserve_ratio
    required = notice_cost + replenishment + emergency_reserve
    coverage_ratio = (pool / required) if required > 0 else Decimal("Infinity")
    runway_days = (pool / daily) if daily > 0 else Decimal("Infinity")
    notice_funded = pool >= notice_cost
    replenishment_funded = pool >= notice_cost + replenishment
    fully_buffered = pool >= required

    return {
        "operating_pool": str(pool),
        "projected_daily_paid_cost": str(daily),
        "notice_period_days": notice_period_days,
        "notice_period_cost": str(notice_cost),
        "replenishment_target": str(replenishment),
        "emergency_reserve": str(emergency_reserve),
        "required_headroom": str(required),
        "coverage_ratio": "INFINITE" if required == 0 else str(coverage_ratio),
        "estimated_runway_days": "INFINITE" if daily == 0 else str(runway_days),
        "notice_period_funded": notice_funded,
        "replenishment_after_notice_funded": replenishment_funded,
        "fully_buffered": fully_buffered,
        "status": (
            "FULLY_BUFFERED"
            if fully_buffered
            else "NOTICE_AND_REPLENISHMENT_RISK"
            if replenishment_funded
            else "NOTICE_PERIOD_RISK"
            if notice_funded
            else "PAYMENT_OR_PRICING_RISK"
        ),
    }


def pricing_change_ready(
    *,
    operating_pool: Decimal | int | float,
    projected_daily_paid_cost: Decimal | int | float,
    notice_period_days: int,
    replenishment_target: Decimal | int | float,
    emergency_reserve_ratio: Decimal | int | float = 1,
) -> bool:
    return bool(
        continuity_headroom(
            operating_pool=operating_pool,
            projected_daily_paid_cost=projected_daily_paid_cost,
            notice_period_days=notice_period_days,
            replenishment_target=replenishment_target,
            emergency_reserve_ratio=emergency_reserve_ratio,
        )["fully_buffered"]
    )


def transition_status(
    state: dict[str, Any],
    *,
    projected_paid_cost: Decimal | int | float,
    replenish_target: Decimal | int | float,
    minimum_runway_ratio: Decimal | int | float = 1,
) -> str:
    """Classify continuity before switching from free capacity to paid resources."""
    pool = money(state.get("operating_pool", "0"))
    projected = money(projected_paid_cost)
    target = money(replenish_target)
    threshold = target * money(minimum_runway_ratio)

    if projected <= 0:
        return "NO_PAID_COST_REQUIRED"
    if pool >= threshold:
        return "CONTINUITY_FUNDED"
    if pool > 0:
        return "RUNWAY_WARNING"
    return "PAYMENT_BLOCKED"
