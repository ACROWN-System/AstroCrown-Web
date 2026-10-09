#!/usr/bin/env python3
"""Credential readiness inspection without exposing secret values or making live calls."""

from __future__ import annotations

import os
from typing import Any, Mapping


def _state_for_env(env_name: str) -> str:
    return "CONFIGURED_NOT_VERIFIED" if os.environ.get(env_name, "").strip() else "REQUIRED_NOT_CONFIGURED"


def inspect_roster(roster: Mapping[str, Any]) -> dict[str, Any]:
    providers = []
    for provider in roster.get("providers", []):
        env_name = str(provider.get("api_key_env") or "")
        account_env = str(provider.get("account_id_env") or "")
        required = [name for name in (env_name, account_env) if name]
        states = {_name: _state_for_env(_name) for _name in required}
        providers.append({
            "provider": provider.get("name"),
            "required_environment_slots": required,
            "slot_states": states,
            "status": (
                "CONFIGURED_NOT_VERIFIED"
                if required and all(state == "CONFIGURED_NOT_VERIFIED" for state in states.values())
                else "REQUIRED_NOT_CONFIGURED"
                if required
                else "UNKNOWN"
            ),
        })
    return {"providers": providers}


def inspect_gpu_roster(roster: Mapping[str, Any]) -> dict[str, Any]:
    providers = []
    for provider in roster.get("providers", []):
        env_name = str(provider.get("api_key_env") or "")
        state = _state_for_env(env_name) if env_name else "UNKNOWN"
        providers.append({
            "provider": provider.get("name"),
            "required_environment_slots": [env_name] if env_name else [],
            "slot_states": {env_name: state} if env_name else {},
            "status": state,
        })
    return {"providers": providers}


def build_readiness_report(
    llm_roster: Mapping[str, Any],
    gpu_roster: Mapping[str, Any],
) -> dict[str, Any]:
    """Return configuration readiness only; credentials are never returned."""
    return {
        "llm": inspect_roster(llm_roster),
        "gpu": inspect_gpu_roster(gpu_roster),
        "live_verification_required": True,
        "secret_values_exposed": False,
    }

