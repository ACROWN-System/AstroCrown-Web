#!/usr/bin/env python3
"""Controlled NOVA reasoning stage for newly changed external observations.

This stage runs only for pending, non-heart events. It requests one structured
analysis from an available LLM provider, stores the answer with provenance, and
maps the result to a safe autonomy boundary. It never directly executes an
arbitrary change described by the model.
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from typing import Any

try:
    from . import alerts
    from .health import (
        atomic_write_json,
        load_health_state,
        load_json,
        record_probe,
    )
    from .router import call_provider, order_providers
except ImportError:  # direct script execution
    import alerts
    from health import (
        atomic_write_json,
        load_health_state,
        load_json,
        record_probe,
    )
    from router import call_provider, order_providers


ROOT = Path(__file__).resolve().parent
HEALTH_POLICY_PATH = ROOT / "health_policy.json"
HEALTH_STATE_PATH = ROOT / "health_state.json"
WATCHLIST_PATH = ROOT / "watchlist.json"
ACTION_POLICY_PATH = ROOT / "action_policy.json"

REASONING_PROMPT_PREFIX = """You are NOVA's controlled operational reasoning stage.

Analyze ONE newly changed external operational annotation. Your job is to
determine whether it materially affects NOVA, what evidence supports that
conclusion, and what safe next action is appropriate.

Do not execute changes. Do not invent evidence. Do not claim access to systems
you did not receive in the input.

Return ONLY valid JSON with exactly these fields:
{
  "significance": "LOW|MEDIUM|HIGH|CRITICAL",
  "affected_areas": ["..."],
  "evidence": ["..."],
  "conclusion": "...",
  "recommended_actions": ["..."],
  "autonomy_level": "L0_OBSERVE|L1_ANALYZE|L2_REVERSIBLE_PROTECT|L3_CONTROLLED_CHANGE|L4_HIGH_IMPACT|L5_IRREVERSIBLE",
  "requires_human_gate": true,
  "confidence": 0.0
}
"""


def validate_reasoning_payload(content: Any) -> tuple[bool, str]:
    if not isinstance(content, str) or not content.strip():
        return False, "EMPTY_RESPONSE"
    try:
        payload = json.loads(content)
    except json.JSONDecodeError:
        return False, "INVALID_JSON"
    required = {
        "significance",
        "affected_areas",
        "evidence",
        "conclusion",
        "recommended_actions",
        "autonomy_level",
        "requires_human_gate",
        "confidence",
    }
    if set(payload) != required:
        return False, "SCHEMA_FIELDS_MISMATCH"
    if payload["significance"] not in {"LOW", "MEDIUM", "HIGH", "CRITICAL"}:
        return False, "INVALID_SIGNIFICANCE"
    if not isinstance(payload["affected_areas"], list) or not isinstance(payload["evidence"], list):
        return False, "INVALID_EVIDENCE_FIELDS"
    if not isinstance(payload["recommended_actions"], list) or not isinstance(payload["conclusion"], str):
        return False, "INVALID_CONCLUSION_FIELDS"
    if payload["autonomy_level"] not in {
        "L0_OBSERVE",
        "L1_ANALYZE",
        "L2_REVERSIBLE_PROTECT",
        "L3_CONTROLLED_CHANGE",
        "L4_HIGH_IMPACT",
        "L5_IRREVERSIBLE",
    }:
        return False, "INVALID_AUTONOMY_LEVEL"
    if not isinstance(payload["requires_human_gate"], bool):
        return False, "INVALID_GATE"
    if not isinstance(payload["confidence"], (int, float)) or not 0 <= payload["confidence"] <= 1:
        return False, "INVALID_CONFIDENCE"
    return True, "PASS"


def _watch_source_config(watchlist: dict[str, Any], source_name: str) -> dict[str, Any]:
    for source in watchlist.get("sources", []):
        if str(source.get("name") or source.get("url")) == source_name:
            return source
    return {}


def analyze_pending(root: Path) -> int:
    del root
    state = load_health_state(HEALTH_STATE_PATH)
    roster = load_json(ROOT / "roster.json", {"providers": []})
    policy = load_json(HEALTH_POLICY_PATH, {})
    watchlist = load_json(WATCHLIST_PATH, {"sources": []})
    action_policy = load_json(ACTION_POLICY_PATH, {})

    pending = [
        event for event in state.get("events", {}).values()
        if event.get("analysis_status") == "PENDING"
    ]
    if not pending:
        print(json.dumps({"status": "NO_PENDING_EVENTS"}))
        return 0

    active = [p for p in roster.get("providers", []) if p.get("status") == "active"]
    active = order_providers(active, state)
    if not active:
        print(json.dumps({"status": "BLOCKED", "reason": "No active AI providers.", "action": "WAIT_FOR_CREDENTIAL_CONFIGURATION"}))
        return 0

    latency_policy = policy.get("latency", {})
    failure_policy = policy.get("failure", {})
    processed = 0

    for event in pending:
        source = str(event.get("source"))
        memory_key = f"external-annotation:{source}"
        memory = state.get("observations", {}).get(memory_key, {})
        observation = memory.get("observation", {})
        prompt = REASONING_PROMPT_PREFIX + "\n\nSOURCE:\n" + json.dumps(
            {
                "source": source,
                "url": observation.get("url"),
                "content_excerpt": observation.get("content_excerpt"),
                "content_fingerprint": observation.get("content_fingerprint"),
            },
            indent=2,
            sort_keys=True,
        )

        response_text = None
        probes: list[dict[str, Any]] = []
        for provider in active:
            response_text, signal, attempts = call_provider(
                provider,
                prompt,
                validate_reasoning_payload,
            )
            probes.extend(attempts)
            if response_text:
                break
            if signal == "permanent":
                provider["status"] = "down"

        for probe in probes:
            record_probe(
                state,
                namespace="reasoning",
                provider=str(probe["provider"]),
                credential_env=str(probe["credential_env"]),
                requested_model=probe.get("requested_model"),
                actual_model=probe.get("actual_model"),
                api_status=probe.get("api_status"),
                authentication=str(probe.get("authentication", "UNKNOWN")),
                response_valid=bool(probe.get("response_valid")),
                quality_status=str(probe.get("quality_status", "NOT_APPLICABLE")),
                latency_ms=probe.get("latency_ms"),
                error_class=probe.get("error_class"),
                error_detail=probe.get("error_detail"),
                max_samples=int(latency_policy.get("max_samples_per_target", 24)),
                latency_degraded_multiplier=float(latency_policy.get("degraded_multiplier", 2.0)),
                latency_min_samples=int(latency_policy.get("minimum_samples_for_comparison", 4)),
                unacceptable_failure_streak=int(failure_policy.get("unacceptable_consecutive_failures", 3)),
            )

        if not response_text:
            event["analysis_status"] = "BLOCKED"
            event["block_reason"] = "No AI provider produced a valid reasoning response."
            continue

        try:
            analysis = json.loads(response_text)
        except json.JSONDecodeError:
            event["analysis_status"] = "BLOCKED"
            event["block_reason"] = "Reasoning provider returned invalid JSON."
            continue

        ok, reason = validate_reasoning_payload(response_text)
        if not ok:
            event["analysis_status"] = "BLOCKED"
            event["block_reason"] = reason
            continue

        source_config = _watch_source_config(watchlist, source)
        memory["analysis"] = analysis
        memory["analysis_fingerprint"] = memory.get("fingerprint")
        if source_config.get("analysis_valid_for_seconds") is not None:
            memory["analysis_valid_for_seconds"] = int(
                source_config["analysis_valid_for_seconds"]
            )

        significance = analysis["significance"]
        event["analysis_status"] = "ANALYZED"
        event["significance"] = significance
        event["autonomy_level"] = analysis["autonomy_level"]
        event["requires_human_gate"] = analysis["requires_human_gate"]
        event["confidence"] = analysis["confidence"]

        safe_actions = action_policy.get("external_event_actions", {}).get(
            significance,
            ["analyze", "human_gate"],
        )
        event["permitted_action_classes"] = safe_actions

        if significance in {"MEDIUM", "HIGH", "CRITICAL"}:
            severity = "urgent" if significance == "CRITICAL" else "notice"
            alerts.send_all_alerts(
                title=f"NOVA operational annotation: {source} — {significance}",
                body=json.dumps(analysis, indent=2, sort_keys=True),
                severity=severity,
            )
        processed += 1

    atomic_write_json(HEALTH_STATE_PATH, state)
    print(json.dumps({
        "status": "COMPLETE",
        "processed": processed,
        "pending_remaining": sum(
            1 for event in state.get("events", {}).values()
            if event.get("analysis_status") == "PENDING"
        ),
    }, indent=2, sort_keys=True))
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", default=".")
    parser.add_argument("--pending", action="store_true")
    args = parser.parse_args()
    if args.pending:
        return analyze_pending(Path(args.repo).resolve())
    parser.error("--pending is required for the controlled reasoning stage")
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
