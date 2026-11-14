#!/usr/bin/env python3
"""Provider-neutral crypto payment intents with human-gated settlement.

NOVA can prepare and validate a payment without being permitted to transfer
funds automatically. A future verified blockchain adapter can implement the
actual settlement boundary under explicit governance.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


def create_payment_intent(
    state: dict[str, Any],
    *,
    beneficiary_id: str,
    destination: str,
    network: str,
    asset: str,
    amount: str,
    invoice_reference: str,
) -> dict[str, Any]:
    intent = {
        "id": f"pay-{len(state.setdefault('payment_intents', [])) + 1:08d}",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "beneficiary_id": beneficiary_id,
        "destination": destination,
        "network": network,
        "asset": asset,
        "amount": amount,
        "invoice_reference": invoice_reference,
        "status": "HUMAN_GATE_REQUIRED",
        "irreversible": True,
    }
    state["payment_intents"].append(intent)
    return intent


def validate_payment_intent(
    intent: dict[str, Any],
    *,
    expected_network: str,
    expected_asset: str,
    expected_destination: str,
) -> tuple[bool, str]:
    if intent.get("network") != expected_network:
        return False, "NETWORK_MISMATCH"
    if intent.get("asset") != expected_asset:
        return False, "ASSET_MISMATCH"
    if intent.get("destination") != expected_destination:
        return False, "DESTINATION_MISMATCH"
    if str(intent.get("amount", "")).strip() == "":
        return False, "AMOUNT_MISSING"
    return True, "PASS"


def settle_payment(*args: Any, **kwargs: Any) -> tuple[bool, str]:
    """Refuse autonomous settlement until a verified payment adapter is supplied."""
    del args, kwargs
    return False, "HUMAN_GATE_REQUIRED_NO_VERIFIED_ADAPTER"
