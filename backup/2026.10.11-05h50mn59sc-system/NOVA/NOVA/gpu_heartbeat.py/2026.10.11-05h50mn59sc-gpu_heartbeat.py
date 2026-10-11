#!/usr/bin/env python3
"""NOVA GPU heart.

Runs every six hours through nova_GPU_heartbeat.yml. It is intentionally
credential-independent at development stage: an unconfigured provider is
recorded as UNCONFIGURED rather than treated as a provider failure.

Provider-specific compute allocation tests belong behind explicit adapters once
credentials and provider API contracts are verified.
"""

from __future__ import annotations

import argparse
import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path

import alerts
from health import atomic_write_json, load_health_state, load_json, record_probe, utc_now
from capacity import annotate_probe


def request_health(provider: dict) -> tuple[int | None, str, float | None, str | None, dict]:
    api_key_env = provider.get("api_key_env", "")
    if not api_key_env:
        return None, "BLOCKED", None, "missing_api_key_env", {}

    api_key = os.environ.get(api_key_env, "").strip()
    if not api_key:
        return None, "BLOCKED", None, "credential_not_configured", {}

    url = provider.get("health_url")
    if not isinstance(url, str) or not url:
        return None, "BLOCKED", None, "health_url_not_configured", {}

    method = str(provider.get("health_method", "GET")).upper()
    headers = {"User-Agent": "NOVA-GPU-Heartbeat/1.0"}
    auth = provider.get("auth", {})
    if auth.get("type") == "bearer":
        headers["Authorization"] = f"Bearer {api_key}"
    elif auth.get("type") == "x-api-key":
        headers["X-API-Key"] = api_key
    else:
        return None, "BLOCKED", None, "unsupported_auth_type", {}

    request = urllib.request.Request(url, headers=headers, method=method)
    started = time.perf_counter()
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            response.read(65536)
            latency_ms = (time.perf_counter() - started) * 1000
            return response.status, "PASS", latency_ms, None, dict(response.headers)
    except urllib.error.HTTPError as exc:
        latency_ms = (time.perf_counter() - started) * 1000
        signal = "permanent" if exc.code in {401, 403, 404} else "transient"
        return exc.code, "FAIL", latency_ms, signal, dict(exc.headers or {})
    except Exception as exc:
        latency_ms = (time.perf_counter() - started) * 1000
        return None, "FAIL", latency_ms, str(exc), {}


def run(root: Path) -> int:
    roster = load_json(root / "NOVA/gpu_roster.json", {"providers": []})
    policy = load_json(root / "NOVA/health_policy.json", {})
    state_path = root / "NOVA/health_state.json"
    state = load_health_state(state_path)

    providers = [
        p for p in roster.get("providers", [])
        if p.get("status", "active") != "disabled"
    ]

    if not providers:
        state["last_gpu_heartbeat"] = {
            "observed_at": utc_now(),
            "status": "UNCONFIGURED",
            "message": "No GPU providers are configured yet; add verified providers and credentials later.",
        }
        atomic_write_json(state_path, state)
        print(json.dumps(state["last_gpu_heartbeat"], indent=2))
        return 0

    rotation_raw = os.environ.get("NOVA_GPU_PROVIDER_ROTATION_INDEX", "0") or "0"
    try:
        rotation = int(rotation_raw)
    except ValueError:
        rotation = 0
    offset = rotation % len(providers)
    ordered = providers[offset:] + providers[:offset]

    latency_policy = policy.get("latency", {})
    failure_policy = policy.get("failure", {})
    results = []

    for provider in ordered:
        status, auth_status, latency_ms, error, response_headers = request_health(provider)
        probe_context = {
            "provider": provider["name"],
            "credential_env": str(provider.get("api_key_env", "")),
            "requested_model": None,
            "actual_model": None,
            "api_status": status,
        }
        annotate_probe(probe_context, provider=provider["name"], headers=response_headers)
        observation = record_probe(
            state,
            namespace="gpu-heart",
            provider=str(provider["name"]),
            credential_env=str(provider.get("api_key_env", "")),
            requested_model=None,
            actual_model=None,
            api_status=status,
            authentication="PASS" if auth_status == "PASS" else auth_status,
            response_valid=(
                auth_status == "PASS"
                and status is not None
                and 200 <= status < 300
            ),
            quality_status="NOT_APPLICABLE",
            latency_ms=latency_ms,
            error_class=error,
            error_detail=error,
            max_samples=int(latency_policy.get("max_samples_per_target", 24)),
            latency_degraded_multiplier=float(
                latency_policy.get("degraded_multiplier", 2.0)
            ),
            latency_min_samples=int(
                latency_policy.get("minimum_samples_for_comparison", 4)
            ),
            unacceptable_failure_streak=int(
                failure_policy.get("unacceptable_consecutive_failures", 3)
            ),
        )
        observation["capacity"] = probe_context.get("capacity", {})
        results.append(observation)

        # A healthy provider closes the health pulse successfully. Degraded or
        # failed providers remain eligible for ordinary fallback on future pulses.
        if observation["health_status"] == "HEALTHY":
            break

    worst = "HEALTHY"
    for observation in results:
        if observation["health_status"] == "UNACCEPTABLE":
            worst = "UNACCEPTABLE"
            break
        if observation["health_status"] == "DEGRADED":
            worst = "DEGRADED"

    state["last_gpu_heartbeat"] = {
        "observed_at": utc_now(),
        "status": worst,
        "first_provider": ordered[0].get("name"),
        "attempts": len(results),
        "results": results,
    }
    atomic_write_json(state_path, state)

    if worst == "UNACCEPTABLE":
        alerts.send_all_alerts(
            title="NOVA GPU heart: provider health is unacceptable",
            body=json.dumps(state["last_gpu_heartbeat"], indent=2, sort_keys=True),
            severity="urgent",
        )

    print(json.dumps(state["last_gpu_heartbeat"], indent=2, sort_keys=True))
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", default=".")
    args = parser.parse_args()
    return run(Path(args.repo).resolve())


if __name__ == "__main__":
    raise SystemExit(main())
