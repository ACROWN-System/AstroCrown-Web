#!/usr/bin/env python3
"""Provider-independent public pricing and governed price recommendations."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any


def d(value: Any) -> Decimal:
    return Decimal(str(value))


def convert_price(
    amount: Decimal | int | float,
    *,
    rate_to_settlement: Decimal | int | float,
) -> Decimal:
    """Convert a reference amount using a verified external exchange rate."""
    return (d(amount) * d(rate_to_settlement)).quantize(Decimal("0.00000001"))


def recommend_price(
    current_price: Decimal | int | float,
    *,
    realized_cost_ratio: Decimal | int | float,
    target_margin_ratio: Decimal | int | float,
    max_change_ratio: Decimal | int | float = 0.10,
) -> dict[str, Any]:
    """Recommend, but never apply, a public-price change.

    The recommendation reacts to aggregate economics, not to the identity of the
    backend provider. This supports a non-perceived provider transition.
    """
    current = d(current_price)
    margin = d(target_margin_ratio)
    cost_ratio = d(realized_cost_ratio)

    target_revenue_ratio = Decimal("1") - margin
    if target_revenue_ratio <= 0:
        raise ValueError("target_margin_ratio must be below 1")

    ideal_multiplier = cost_ratio / target_revenue_ratio if target_revenue_ratio else Decimal("1")
    raw_multiplier = max(Decimal("0.50"), min(Decimal("2.00"), ideal_multiplier))
    bounded_delta = max(-d(max_change_ratio), min(d(max_change_ratio), raw_multiplier - Decimal("1")))
    recommended = current * (Decimal("1") + bounded_delta)

    if recommended == current:
        reason = "NO_CHANGE"
    elif recommended > current:
        reason = "ECONOMIC_SUSTAINABILITY_RISK"
    else:
        reason = "SUSTAINABILITY_MARGIN_AVAILABLE"

    return {
        "current_price": str(current),
        "recommended_price": str(recommended.quantize(Decimal("0.00000001"))),
        "reason": reason,
        "realized_cost_ratio": str(cost_ratio),
        "target_margin_ratio": str(margin),
        "bounded_change_ratio": str(bounded_delta),
        "provider_independent": True,
        "requires_approval": True,
    }



def create_quote(
    reference_amount: Decimal | int | float,
    *,
    rate_to_settlement: Decimal | int | float,
    settlement_asset: str,
    validity_seconds: int = 300,
) -> dict[str, Any]:
    """Create a provider-independent crypto quote with a fixed validity window."""
    if validity_seconds <= 0:
        raise ValueError("validity_seconds must be positive")
    created_at = datetime.now(timezone.utc)
    expires_at = created_at + timedelta(seconds=validity_seconds)
    settlement_amount = convert_price(
        reference_amount,
        rate_to_settlement=rate_to_settlement,
    )
    return {
        "reference_amount": str(d(reference_amount)),
        "settlement_amount": str(settlement_amount),
        "settlement_asset": settlement_asset,
        "created_at": created_at.isoformat(),
        "expires_at": expires_at.isoformat(),
        "validity_seconds": validity_seconds,
        "provider_independent": True,
        "backend_switch_must_not_reprice": True,
    }
