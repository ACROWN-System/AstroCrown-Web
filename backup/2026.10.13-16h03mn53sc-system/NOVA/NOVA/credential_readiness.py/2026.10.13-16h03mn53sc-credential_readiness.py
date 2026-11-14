#!/usr/bin/env python3
"""Inspect credential presence without exposing secret values or making live calls."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from typing import Any, Mapping


def _state_for_env(env_name: str) -> str:
    return "CONFIGURED_NOT_VERIFIED" if os.environ.get(env_name, "").strip() else "REQUIRED_NOT_CONFIGURED"


def _required_slots(provider: Mapping[str, Any]) -> list[str]:
    return [
        name for name in (
            str(provider.get("api_key_env") or ""),
            str(provider.get("account_id_env") or ""),
        )
        if name
    ]


def _credential_state(required: list[str]) -> str:
    if not required:
        return "UNKNOWN"
    states = [_state_for_env(name) for name in required]
    return (
        "CONFIGURED_NOT_VERIFIED"
        if all(state == "CONFIGURED_NOT_VERIFIED" for state in states)
        else "REQUIRED_NOT_CONFIGURED"
    )


def inspect_roster(roster: Mapping[str, Any]) -> dict[str, Any]:
    providers = []
    for provider in roster.get("providers", []):
        if not isinstance(provider, Mapping):
            continue
        required = _required_slots(provider)
        states = {name: _state_for_env(name) for name in required}
        providers.append({
            "provider": provider.get("name"),
            "lifecycle_status": provider.get("status", "active"),
            "required_environment_slots": required,
            "slot_states": states,
            # Historical compatibility: status means credential configuration,
            # not live health or activation eligibility.
            "status": _credential_state(required),
        })
    return {"providers": providers}


def inspect_gpu_roster(roster: Mapping[str, Any]) -> dict[str, Any]:
    providers = []
    for provider in roster.get("providers", []):
        if not isinstance(provider, Mapping):
            continue
        required = _required_slots(provider)
        states = {name: _state_for_env(name) for name in required}
        providers.append({
            "provider": provider.get("name"),
            "lifecycle_status": provider.get("status", "active"),
            "required_environment_slots": required,
            "slot_states": states,
            "credential_status": _credential_state(required),
        })

    candidates = []
    for provider in roster.get("candidates", []):
        if not isinstance(provider, Mapping):
            continue
        required = _required_slots(provider)
        states = {name: _state_for_env(name) for name in required}
        candidates.append({
            "provider": provider.get("name"),
            "activation_status": "CANDIDATE_NOT_ACTIVATED",
            "credential_status": _credential_state(required),
            "required_environment_slots": required,
            "slot_states": states,
            "activation_requirement": provider.get("activation_requirement"),
        })

    return {"providers": providers, "candidates": candidates}


def build_readiness_report(
    llm_roster: Mapping[str, Any],
    gpu_roster: Mapping[str, Any],
) -> dict[str, Any]:
    """Return presence status only; never return secret contents."""
    return {
        "llm": inspect_roster(llm_roster),
        "gpu": inspect_gpu_roster(gpu_roster),
        "live_verification_required": True,
        "secret_values_exposed": False,
    }


def _summary_markdown(report: Mapping[str, Any]) -> str:
    rows = [
        "# NOVA credential readiness",
        "",
        "Presence-only check. No secret values were returned, printed, or sent to providers.",
        "A configured slot is not proof of authentication, provider availability, zero-cost eligibility, or GPU capacity.",
        "",
        "| Scope | Provider | Lifecycle | Credential state | Required environment slots |",
        "|---|---|---|---|---|",
    ]
    for item in report.get("llm", {}).get("providers", []):
        rows.append(
            f"| LLM | {item.get('provider', 'unknown')} | {item.get('lifecycle_status', 'unknown')} "
            f"| {item.get('status', 'UNKNOWN')} | {', '.join(item.get('required_environment_slots', [])) or 'none'} |"
        )
    for item in report.get("gpu", {}).get("providers", []):
        rows.append(
            f"| GPU | {item.get('provider', 'unknown')} | {item.get('lifecycle_status', 'unknown')} "
            f"| {item.get('credential_status', 'UNKNOWN')} | {', '.join(item.get('required_environment_slots', [])) or 'none'} |"
        )
    for item in report.get("gpu", {}).get("candidates", []):
        rows.append(
            f"| GPU | {item.get('provider', 'unknown')} | CANDIDATE_NOT_ACTIVATED "
            f"| {item.get('credential_status', 'UNKNOWN')} | {', '.join(item.get('required_environment_slots', [])) or 'none'} |"
        )
    rows.extend([
        "",
        "Interpretation: CONFIGURED_NOT_VERIFIED means the named environment slot was non-empty in this workflow run. REQUIRED_NOT_CONFIGURED means it was empty. Neither status performs a live provider call. GPU candidates remain inactive even when their credentials exist.",
        "",
    ])
    return "\n".join(rows)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--llm-roster", default="NOVA/roster.json")
    parser.add_argument("--gpu-roster", default="NOVA/gpu_roster.json")
    parser.add_argument("--summary-file", default=os.environ.get("GITHUB_STEP_SUMMARY", ""))
    args = parser.parse_args()

    llm_roster = json.loads(Path(args.llm_roster).read_text(encoding="utf-8"))
    gpu_roster = json.loads(Path(args.gpu_roster).read_text(encoding="utf-8"))
    report = build_readiness_report(llm_roster, gpu_roster)
    print(json.dumps(report, indent=2, sort_keys=True))

    if args.summary_file:
        with Path(args.summary_file).open("a", encoding="utf-8") as handle:
            handle.write(_summary_markdown(report))
            handle.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
