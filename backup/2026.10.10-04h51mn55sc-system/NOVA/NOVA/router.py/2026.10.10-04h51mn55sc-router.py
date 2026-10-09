#!/usr/bin/env python3
"""NOVA AI heart: live provider/model health probe with failover.

The AI heart always performs a live probe; it never suppresses the probe because
the last observation was identical. Non-heart observations use fingerprinted
memory elsewhere so expensive reasoning calls can be reused when appropriate.
"""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Mapping

try:
    from . import alerts  # package execution
    from .health import (
        atomic_write_json,
        load_health_state,
        load_json,
        provider_health_status,
        record_probe,
    )
    from .capacity import annotate_probe, provider_capacity_opportunity
    from .probe_scheduler import select_probe_candidate, reschedule_after_probes
except ImportError:  # direct script execution
    import alerts
    from health import (
        atomic_write_json,
        load_health_state,
        load_json,
        provider_health_status,
        record_probe,
    )
    from capacity import annotate_probe, provider_capacity_opportunity
    from probe_scheduler import select_probe_candidate, reschedule_after_probes
ROOT = Path(__file__).resolve().parent
ROSTER_PATH = ROOT / "roster.json"
HEALTH_POLICY_PATH = ROOT / "health_policy.json"
HEALTH_STATE_PATH = ROOT / "health_state.json"

COMMON_HEADERS = {
    "Content-Type": "application/json",
    "User-Agent": "NOVA-AI-Heartbeat/1.0",
}

PERMANENT_ERROR_MARKERS = [
    "decommissioned",
    "deprecated",
    "no longer supported",
    "no longer available",
    "has been retired",
    "model_not_found",
    "does not exist",
]

HEALTH_PROMPT = (
    'NOVA live health probe. Respond with ONLY this JSON object, with no markdown: '
    '{"nova_health":"OK","ack":"NOVA_HEALTH_PROBE"}'
)


def load_roster() -> dict[str, Any]:
    return json.loads(ROSTER_PATH.read_text(encoding="utf-8"))


def save_roster(roster: dict[str, Any]) -> None:
    atomic_write_json(ROSTER_PATH, roster)


def get_env(name: str) -> str:
    return os.environ.get(name, "").strip().strip('"').strip("'")


def classify_http_error(exc: urllib.error.HTTPError) -> tuple[str, str]:
    """Classify an HTTP error without destroying the provider's original message."""
    try:
        body = exc.read().decode("utf-8", errors="ignore")
    except Exception:
        body = ""
    normalized_body = body.lower()
    if exc.code == 404 or any(
        marker in normalized_body for marker in PERMANENT_ERROR_MARKERS
    ):
        return "permanent", body
    return "transient", body


# Allowlisted response headers only: never persist arbitrary headers that might
# contain credentials or unrelated provider/account metadata.
HTTP_DIAGNOSTIC_HEADER_NAMES = (
    "retry-after",
    "ratelimit-limit",
    "ratelimit-remaining",
    "ratelimit-reset",
    "x-ratelimit-limit",
    "x-ratelimit-remaining",
    "x-ratelimit-reset",
    "x-ratelimit-limit-requests",
    "x-ratelimit-remaining-requests",
    "x-ratelimit-reset-requests",
    "x-ratelimit-limit-tokens",
    "x-ratelimit-remaining-tokens",
    "x-ratelimit-reset-tokens",
    # Mistral-specific rate-limit headers documented in real responses.
    "x-ratelimit-limit-req-minute",
    "x-ratelimit-remaining-req-minute",
    "x-ratelimit-reset-req-minute",
    "x-ratelimit-limit-req-10-second",
    "x-ratelimit-remaining-req-10-second",
    "x-ratelimit-reset-req-10-second",
    "x-ratelimit-limit-tokens-minute",
    "x-ratelimit-remaining-tokens-minute",
    "x-ratelimit-reset-tokens-minute",
    "x-ratelimit-limit-tokens-month",
    "x-ratelimit-remaining-tokens-month",
    "x-ratelimit-reset-tokens-month",
    "x-ratelimit-tokens-query-cost",
    "mistral-correlation-id",
    "x-kong-request-id",
    "x-request-id",
    "request-id",
)


def diagnostic_http_headers(headers: Any) -> dict[str, str]:
    """Return a small allowlisted set of response headers useful for diagnosis."""
    if headers is None:
        return {}
    try:
        items = headers.items()
    except AttributeError:
        return {}
    normalized = {str(name).lower(): str(value) for name, value in items}
    return {
        name: normalized[name]
        for name in HTTP_DIAGNOSTIC_HEADER_NAMES
        if name in normalized
    }


def validate_health_payload(content: Any) -> tuple[bool, str]:
    if not isinstance(content, str) or not content.strip():
        return False, "EMPTY_RESPONSE"
    try:
        payload = json.loads(content)
    except json.JSONDecodeError:
        return False, "INVALID_JSON"
    if payload.get("nova_health") != "OK":
        return False, "HEALTH_MARKER_MISSING"
    if payload.get("ack") != "NOVA_HEALTH_PROBE":
        return False, "HEALTH_ACK_MISSING"
    return True, "PASS"


def call_openai_compatible(provider: dict[str, Any], prompt: str, validator=validate_health_payload) -> tuple[str | None, str, list[dict[str, Any]]]:
    api_key = get_env(provider["api_key_env"])
    if not api_key:
        return None, "unconfigured", [{
            "provider": provider["name"],
            "credential_env": provider["api_key_env"],
            "requested_model": None,
            "actual_model": None,
            "api_status": None,
            "authentication": "NOT_CONFIGURED",
            "response_valid": False,
            "quality_status": "NOT_APPLICABLE",
            "latency_ms": None,
            "error_class": "credential_not_configured",
            "error_detail": "Credential is not configured.",
        }]

    base_url = provider["base_url"]
    if "account_id_env" in provider:
        account_id = get_env(provider["account_id_env"])
        if not account_id:
            return None, "unconfigured", [{
                "provider": provider["name"],
                "credential_env": provider["api_key_env"],
                "requested_model": None,
                "actual_model": None,
                "api_status": None,
                "authentication": "BLOCKED",
                "response_valid": False,
                "quality_status": "NOT_APPLICABLE",
                "latency_ms": None,
                "error_class": "account_id_not_configured",
                "error_detail": "Required account identifier is not configured.",
            }]
        base_url = base_url.format(CF_ACCOUNT_ID=account_id)

    headers = {**COMMON_HEADERS, "Authorization": f"Bearer {api_key}"}
    probes: list[dict[str, Any]] = []

    for model in provider["models"]:
        data = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0,
            "max_tokens": 64,
        }
        if provider["name"] == "groq":
            # GPT-OSS is a reasoning model; use Groq's current completion-token
            # field and a bounded low-effort health probe instead of max_tokens.
            # This is a request-contract correction; live success still requires
            # verification against the account's current API behavior.
            if model.startswith("openai/gpt-oss-"):
                data.pop("max_tokens", None)
                data["max_completion_tokens"] = 256
                data["reasoning_effort"] = "low"
            data["response_format"] = {
                "type": "json_schema",
                "json_schema": {
                    "name": "nova_health_probe",
                    "strict": True,
                    "schema": {
                        "type": "object",
                        "properties": {
                            "nova_health": {"type": "string", "enum": ["OK"]},
                            "ack": {"type": "string", "enum": ["NOVA_HEALTH_PROBE"]}
                        },
                        "required": ["nova_health", "ack"],
                        "additionalProperties": False
                    }
                }
            }
        req = urllib.request.Request(
            base_url,
            data=json.dumps(data).encode("utf-8"),
            headers=headers,
            method="POST",
        )
        started = time.perf_counter()

        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                raw = response.read()
                latency_ms = (time.perf_counter() - started) * 1000
                result = json.loads(raw.decode("utf-8"))
                choices = result.get("choices")
                message = choices[0].get("message") if isinstance(choices, list) and choices else None
                content = message.get("content") if isinstance(message, dict) else None
                valid, quality = validator(content)
                actual_model = result.get("model") or model
                probe = {
                    "provider": provider["name"],
                    "credential_env": provider["api_key_env"],
                    "requested_model": model,
                    "actual_model": actual_model,
                    "api_status": response.status,
                    "authentication": "PASS",
                    "response_valid": valid,
                    "quality_status": quality,
                    "latency_ms": latency_ms,
                    "error_class": None if valid else "response_contract",
                    "error_detail": None if valid else quality,
                }
                annotate_probe(
                    probe,
                    provider=provider["name"],
                    headers=response.headers,
                    usage=result.get("usage") if isinstance(result.get("usage"), dict) else None,
                )
                probe["response_headers"] = diagnostic_http_headers(response.headers)
                probes.append(probe)
                if valid:
                    return content, "success", probes
                # A provider responded but failed NOVA's deterministic health contract.
                # Try its remaining models before falling back to another provider.
        except urllib.error.HTTPError as exc:
            latency_ms = (time.perf_counter() - started) * 1000
            signal, body = classify_http_error(exc)
            probes.append({
                "provider": provider["name"],
                "credential_env": provider["api_key_env"],
                "requested_model": model,
                "actual_model": None,
                "api_status": exc.code,
                "authentication": "FAIL" if exc.code in {401, 403} else "UNKNOWN",
                "response_valid": False,
                "quality_status": "NOT_APPLICABLE",
                "latency_ms": latency_ms,
                "error_class": signal,
                "error_detail": body[:400],
                "response_headers": diagnostic_http_headers(exc.headers),
                "capacity": annotate_probe(
                    {
                        "provider": provider["name"],
                    },
                    provider=provider["name"],
                    headers=exc.headers,
                ).get("capacity"),
            })
            print(
                f"[{provider['name']}] HTTP {exc.code} on model '{model}' "
                f"({signal}): {body[:200]} "
                f"diagnostic_headers={diagnostic_http_headers(exc.headers)}"
            )
        except Exception as exc:
            latency_ms = (time.perf_counter() - started) * 1000
            probes.append({
                "provider": provider["name"],
                "credential_env": provider["api_key_env"],
                "requested_model": model,
                "actual_model": None,
                "api_status": None,
                "authentication": "UNKNOWN",
                "response_valid": False,
                "quality_status": "NOT_APPLICABLE",
                "latency_ms": latency_ms,
                "error_class": "exception",
                "error_detail": str(exc)[:400],
            })
            print(f"[{provider['name']}] Exception on model '{model}': {exc}")

    if not probes:
        return None, "transient", []
    if any(probe["error_class"] == "permanent" for probe in probes):
        return None, "permanent", probes
    return None, "quality_or_transient", probes


def call_gemini(provider: dict[str, Any], prompt: str, validator=validate_health_payload) -> tuple[str | None, str, list[dict[str, Any]]]:
    api_key = get_env(provider["api_key_env"])
    if not api_key:
        return None, "unconfigured", [{
            "provider": provider["name"],
            "credential_env": provider["api_key_env"],
            "requested_model": None,
            "actual_model": None,
            "api_status": None,
            "authentication": "NOT_CONFIGURED",
            "response_valid": False,
            "quality_status": "NOT_APPLICABLE",
            "latency_ms": None,
            "error_class": "credential_not_configured",
            "error_detail": "Credential is not configured.",
        }]

    headers = {**COMMON_HEADERS, "x-goog-api-key": api_key}
    probes: list[dict[str, Any]] = []

    for model in provider["models"]:
        url = f"{provider['base_url']}/{model}:generateContent"
        data = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0,
                "maxOutputTokens": 64,
                "responseMimeType": "application/json",
                "responseSchema": {
                    "type": "OBJECT",
                    "properties": {
                        "nova_health": {"type": "STRING", "enum": ["OK"]},
                        "ack": {"type": "STRING", "enum": ["NOVA_HEALTH_PROBE"]}
                    },
                    "required": ["nova_health", "ack"],
                    "propertyOrdering": ["nova_health", "ack"]
                }
            },
        }
        req = urllib.request.Request(
            url,
            data=json.dumps(data).encode("utf-8"),
            headers=headers,
            method="POST",
        )
        started = time.perf_counter()
        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                raw = response.read()
                latency_ms = (time.perf_counter() - started) * 1000
                result = json.loads(raw.decode("utf-8"))
                candidates = result.get("candidates")
                parts = (
                    candidates[0].get("content", {}).get("parts", [])
                    if isinstance(candidates, list) and candidates
                    else []
                )
                content = parts[0].get("text") if parts and isinstance(parts[0], dict) else None
                valid, quality = validator(content)
                probe = {
                    "provider": provider["name"],
                    "credential_env": provider["api_key_env"],
                    "requested_model": model,
                    "actual_model": model,
                    "api_status": response.status,
                    "authentication": "PASS",
                    "response_valid": valid,
                    "quality_status": quality,
                    "latency_ms": latency_ms,
                    "error_class": None if valid else "response_contract",
                    "error_detail": None if valid else quality,
                }
                annotate_probe(
                    probe,
                    provider=provider["name"],
                    headers=response.headers,
                    usage=result.get("usageMetadata")
                    if isinstance(result.get("usageMetadata"), dict)
                    else None,
                )
                probes.append(probe)
                if valid:
                    return content, "success", probes
        except urllib.error.HTTPError as exc:
            latency_ms = (time.perf_counter() - started) * 1000
            signal, body = classify_http_error(exc)
            probes.append({
                "provider": provider["name"],
                "credential_env": provider["api_key_env"],
                "requested_model": model,
                "actual_model": None,
                "api_status": exc.code,
                "authentication": "FAIL" if exc.code in {401, 403} else "UNKNOWN",
                "response_valid": False,
                "quality_status": "NOT_APPLICABLE",
                "latency_ms": latency_ms,
                "error_class": signal,
                "error_detail": body[:400],
                "response_headers": diagnostic_http_headers(exc.headers),
            })
            print(
                f"[{provider['name']}] HTTP {exc.code} on model '{model}' "
                f"({signal}): {body[:200]} "
                f"diagnostic_headers={diagnostic_http_headers(exc.headers)}"
            )
        except Exception as exc:
            latency_ms = (time.perf_counter() - started) * 1000
            probes.append({
                "provider": provider["name"],
                "credential_env": provider["api_key_env"],
                "requested_model": model,
                "actual_model": None,
                "api_status": None,
                "authentication": "UNKNOWN",
                "response_valid": False,
                "quality_status": "NOT_APPLICABLE",
                "latency_ms": latency_ms,
                "error_class": "exception",
                "error_detail": str(exc)[:400],
            })
            print(f"[{provider['name']}] Exception on model '{model}': {exc}")

    if any(probe["error_class"] == "permanent" for probe in probes):
        return None, "permanent", probes
    return None, "quality_or_transient", probes


def call_provider(provider: dict[str, Any], prompt: str, validator=validate_health_payload) -> tuple[str | None, str, list[dict[str, Any]]]:
    if provider["kind"] == "gemini":
        return call_gemini(provider, prompt, validator)
    return call_openai_compatible(provider, prompt, validator)


def rotate_starting_provider(providers: list[dict[str, Any]], start_index: int = 0) -> list[dict[str, Any]]:
    if not providers:
        return providers
    offset = int(start_index) % len(providers)
    return providers[offset:] + providers[:offset] if offset else providers


def health_order_providers(
    providers: list[dict[str, Any]],
    state: dict[str, Any],
    *,
    max_observation_age_seconds: int | float | None = None,
) -> list[dict[str, Any]]:
    preferred, degraded = [], []
    for provider in providers:
        status = provider_health_status(
            state,
            provider=provider["name"],
            namespace="ai-heart",
            max_observation_age_seconds=max_observation_age_seconds,
        )
        (degraded if status in {"DEGRADED", "UNACCEPTABLE", "STALE"} else preferred).append(provider)
    return preferred + degraded


def order_providers(
    providers: list[dict[str, Any]],
    state: dict[str, Any],
    *,
    max_observation_age_seconds: int | float | None = None,
    task: Mapping[str, Any] | None = None,
) -> list[dict[str, Any]]:
    """Order providers by health first, then exploit imminent capacity windows."""
    ordered = health_order_providers(
        providers,
        state,
        max_observation_age_seconds=max_observation_age_seconds,
    )
    policy = load_json(ROOT / "capacity_policy.json", {})
    allocation = policy.get("runtime_allocation", {})
    urgency = float(allocation.get("urgency_window_seconds", 300))
    reserve = float(allocation.get("minimum_remaining_reserve_fraction", 0.2))
    capacity_age = allocation.get("maximum_capacity_observation_age_seconds")

    ranked = []
    for position, provider in enumerate(ordered):
        status = provider_health_status(
            state,
            provider=provider["name"],
            namespace="ai-heart",
            max_observation_age_seconds=max_observation_age_seconds,
        )
        opportunity = provider_capacity_opportunity(
            state.get("targets"),
            provider=provider["name"],
            namespace="ai-heart",
            urgency_window_seconds=urgency,
            minimum_remaining_reserve_fraction=reserve,
            max_observation_age_seconds=(
                int(capacity_age) if capacity_age is not None else None
            ),
            task_units=task.get("task_units") if isinstance(task, Mapping) else None,
            expected_task_benefit=task.get("expected_benefit") if isinstance(task, Mapping) else None,
            expected_task_value_asset=(
                str(task.get("value_asset") or "UNSPECIFIED")
                if isinstance(task, Mapping)
                else "UNSPECIFIED"
            ),
        )
        ranked.append((status, float(opportunity.get("priority", 0.0)), position, provider))

    # Expiry-aware scheduling only reorders within the set of providers that
    # are not currently unacceptable/degraded. Health remains a hard preference.
    preferred = [item for item in ranked if item[0] not in {"DEGRADED", "UNACCEPTABLE", "STALE"}]
    fallback = [item for item in ranked if item[0] in {"DEGRADED", "UNACCEPTABLE", "STALE"}]
    preferred.sort(key=lambda item: (-item[1], item[2]))
    fallback.sort(key=lambda item: (-item[1], item[2]))
    return [item[3] for item in preferred + fallback]


def scheduled_probe_provider_order(
    providers: list[dict[str, Any]],
    state: dict[str, Any],
    *,
    max_observation_age_seconds: int | float | None = None,
) -> list[dict[str, Any]]:
    """Select the scheduled provider, or preempt for a real expiry opportunity."""
    decision = select_probe_candidate(providers, state)
    rotation = state.setdefault("provider_rotation", {}).setdefault("ai-heart", {})
    rotation["last_selection_decision"] = decision
    selected_name = decision.get("provider")
    if not selected_name:
        return []

    selected = next(
        (provider for provider in providers if provider.get("name") == selected_name),
        None,
    )
    if selected is None:
        return []

    remaining = [
        provider for provider in providers
        if provider.get("name") != selected_name
    ]
    return [selected] + health_order_providers(
        remaining,
        state,
        max_observation_age_seconds=max_observation_age_seconds,
    )


def advance_scheduled_probe_rotation(
    state: dict[str, Any],
    providers: list[dict[str, Any]],
    scheduled_provider: dict[str, Any] | None,
    probed_provider_names: list[str] | None = None,
) -> None:
    """Move checked providers to the end and rebuild the rolling 6h schedule."""
    if not providers or get_env("NOVA_ADVANCE_PROVIDER_ROTATION").lower() not in {"1", "true", "yes"}:
        return

    # The scheduler intentionally uses the providers actually checked, not
    # only the originally selected provider. Every checked provider therefore
    # moves to the back of the ring.
    probed = list(dict.fromkeys(probed_provider_names or []))
    if not probed and scheduled_provider:
        probed = [str(scheduled_provider.get("name"))]

    reschedule_after_probes(
        state,
        providers,
        probed,
        completed_at=datetime.now(timezone.utc),
    )


def intelligent_router(prompt: str) -> tuple[str, dict[str, Any]]:
    print(f"[{datetime.now(timezone.utc).isoformat()}] NOVA AI Heart Pulse Initiated...")
    roster = load_roster()
    policy = load_json(HEALTH_POLICY_PATH, {})
    state = load_health_state(HEALTH_STATE_PATH)
    active_roster = [p for p in roster["providers"] if p["status"] == "active"]
    freshness_policy = policy.get("freshness", {})
    heart_max_age = freshness_policy.get("heart_observation_max_age_seconds")
    active = scheduled_probe_provider_order(
        active_roster,
        state,
        max_observation_age_seconds=(
            int(heart_max_age) if heart_max_age is not None else None
        ),
    )
    scheduled_provider = active[0] if active else None

    latency_policy = policy.get("latency", {})
    failure_policy = policy.get("failure", {})
    all_probes: list[dict[str, Any]] = []
    probed_provider_names: list[str] = []

    for provider in active:
        print(f"Trying provider: {provider['name']}")
        text, signal, probes = call_provider(provider, prompt)
        if probes and provider["name"] not in probed_provider_names:
            probed_provider_names.append(provider["name"])

        for probe in probes:
            probe_role = (
                "scheduled_probe"
                if scheduled_provider and provider["name"] == scheduled_provider["name"]
                else "failover_probe"
            )
            observation = record_probe(
                state,
                namespace="ai-heart",
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
                capacity=probe.get("capacity") if isinstance(probe.get("capacity"), dict) else None,
                response_headers=(
                    probe.get("response_headers")
                    if isinstance(probe.get("response_headers"), dict)
                    else None
                ),
                probe_role=probe_role,
                max_samples=int(latency_policy.get("max_samples_per_target", 24)),
                latency_degraded_multiplier=float(latency_policy.get("degraded_multiplier", 2.0)),
                latency_min_samples=int(latency_policy.get("minimum_samples_for_comparison", 4)),
                unacceptable_failure_streak=int(failure_policy.get("unacceptable_consecutive_failures", 3)),
            )
            all_probes.append(observation)
            if observation["health_status"] == "UNACCEPTABLE":
                alerts.send_all_alerts(
                    title=f"NOVA AI heart: {provider['name']} health is unacceptable",
                    body=json.dumps(observation, indent=2, sort_keys=True),
                    severity="urgent",
                )

        if text:
            advance_scheduled_probe_rotation(
                state,
                roster["providers"],
                scheduled_provider,
                probed_provider_names,
            )
            atomic_write_json(HEALTH_STATE_PATH, state)

            summary = {
                "heart": "AI",
                "status": "HEALTHY",
                "provider": provider["name"],
                "probes": all_probes,
                "action": "MAINTAIN",
            }
            return f"[ROUTED via {provider['name'].upper()}] {text}", summary

        if signal == "permanent":
            print(f"[{provider['name']}] Permanent model/provider failure detected — marking provider DOWN.")
            provider["status"] = "down"
            provider["marked_down_at"] = datetime.now(timezone.utc).isoformat()
            save_roster(roster)

            remaining = [p for p in roster["providers"] if p["status"] == "active"]
            analysis = alerts.generate_comparative_analysis(
                roster, provider["name"], remaining
            )
            severity = "urgent" if len(remaining) <= 2 else "notice"
            alerts.send_all_alerts(
                title=f"NOVA roster alert: {provider['name']} appears permanently unavailable",
                body=analysis,
                severity=severity,
            )

    if scheduled_provider:
        advance_scheduled_probe_rotation(
            state,
            roster["providers"],
            scheduled_provider,
            probed_provider_names,
        )
    atomic_write_json(HEALTH_STATE_PATH, state)

    summary = {
        "heart": "AI",
        "status": "FAILED",
        "provider": None,
        "probes": all_probes,
        "action": "FAILOVER_EXHAUSTED",
    }
    return "CRITICAL FAULT: All roster providers unresponsive this cycle.", summary


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test-alert":
        roster = load_roster()
        remaining = [p for p in roster["providers"] if p["status"] == "active"]
        analysis = alerts.generate_comparative_analysis(roster, "test-provider", remaining)
        alerts.send_all_alerts(
            title="[TEST] NOVA roster alert simulation",
            body=analysis,
            severity="urgent",
            force_all_channels=True,
        )
        print("Test alert dispatched to every configured channel.")
        raise SystemExit(0)

    test_prompt = HEALTH_PROMPT
    system_state, summary = intelligent_router(test_prompt)

    # README is documentation, not operational memory. Scheduled heartbeats persist
    # structured state only, preventing unbounded documentation churn.
    print(json.dumps(summary, indent=2, sort_keys=True))
    print("NOVA AI heart state synced to structured health memory.")
