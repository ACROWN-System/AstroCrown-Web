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
import urllib.parse
import urllib.request
from pathlib import Path

try:
    from . import alerts
    from .health import atomic_write_json, load_health_state, load_json, record_probe, utc_now
    from .capacity import annotate_probe
    from .gpu_capacity import DEFAULT_PLANNING_REFERENCE_GPU_MINUTES_PER_MONTH, build_capacity_report, load_capacity_evidence
except ImportError:  # Direct script execution
    import alerts
    from health import atomic_write_json, load_health_state, load_json, record_probe, utc_now
    from capacity import annotate_probe
    from gpu_capacity import DEFAULT_PLANNING_REFERENCE_GPU_MINUTES_PER_MONTH, build_capacity_report, load_capacity_evidence


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
        with urllib.request.build_opener(_NoRedirectHandler()).open(request, timeout=30) as response:
            response.read(65536)
            latency_ms = (time.perf_counter() - started) * 1000
            return response.status, "PASS", latency_ms, None, dict(response.headers)
    except urllib.error.HTTPError as exc:
        latency_ms = (time.perf_counter() - started) * 1000
        signal = "permanent" if exc.code in {401, 403, 404} else "transient"
        return exc.code, "FAIL", latency_ms, signal, dict(exc.headers or {})
    except Exception as exc:
        latency_ms = (time.perf_counter() - started) * 1000
        return None, "FAIL", latency_ms, type(exc).__name__, {}


class _NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    """Block redirects so a credential cannot be forwarded to another host."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


SAFE_CREDENTIAL_CHECK_HOSTS = {"api.nosana.com", "huggingface.co"}


def check_candidate_credential(provider: dict) -> dict:
    """Check only a documented, read-only provider credential endpoint."""
    name = str(provider.get("name", "unknown"))
    credential_env = str(provider.get("api_key_env", ""))
    credential = os.environ.get(credential_env, "").strip() if credential_env else ""
    base = {
        "provider": name,
        "credential_env": credential_env,
        "candidate_status": "CANDIDATE_NOT_ACTIVATED",
        "credential_configured": bool(credential),
        "auth_probe_status": "NOT_TESTED",
        "api_status": None,
        "latency_ms": None,
        "gpu_capacity_status": "UNVERIFIED",
        "available_credits": None,
        "observed_at": utc_now(),
    }
    if not credential:
        base["auth_probe_status"] = "REQUIRED_NOT_CONFIGURED"
        return base

    check = provider.get("credential_check")
    if not isinstance(check, dict):
        base["auth_probe_status"] = "BLOCKED_NO_PROVIDER_SPECIFIC_AUTH_ENDPOINT"
        return base

    url = check.get("url")
    method = str(check.get("method", "GET")).upper()
    auth_mode = check.get("auth")
    parsed = urllib.parse.urlsplit(url if isinstance(url, str) else "")
    allowed_hosts = set(check.get("expected_hosts", []))
    if (
        parsed.scheme != "https"
        or parsed.hostname not in SAFE_CREDENTIAL_CHECK_HOSTS
        or parsed.hostname not in allowed_hosts
        or parsed.username is not None
        or parsed.password is not None
        or parsed.query
        or parsed.fragment
        or method != "GET"
        or auth_mode != "bearer"
    ):
        base["auth_probe_status"] = "BLOCKED_UNSAFE_OR_UNSUPPORTED_ENDPOINT"
        return base

    request = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {credential}",
            "Accept": "application/json",
            "User-Agent": "NOVA-GPU-Credential-Heartbeat/1.0",
        },
        method="GET",
    )
    started = time.perf_counter()
    try:
        with urllib.request.build_opener(_NoRedirectHandler()).open(request, timeout=15) as response:
            status = int(response.status)
            raw = response.read(65537)
        base["api_status"] = status
        base["latency_ms"] = round((time.perf_counter() - started) * 1000, 3)
        if len(raw) > 65536:
            base["auth_probe_status"] = "RESPONSE_TOO_LARGE"
            return base
        try:
            payload = json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            base["auth_probe_status"] = "AUTHENTICATED_RESPONSE_NOT_JSON"
            return base
        if not isinstance(payload, dict):
            base["auth_probe_status"] = "AUTHENTICATED_RESPONSE_SHAPE_UNKNOWN"
            return base
        if not (200 <= status < 300):
            base["auth_probe_status"] = "HTTP_ERROR"
            return base

        base["auth_probe_status"] = "CREDENTIAL_AUTHENTICATED_READ_ONLY"
        # This adapter verifies credential/scope acceptance only.
        # Do not infer or persist credit balances from unverified response fields.
        if name == "huggingface_zerogpu":
            base["auth_probe_status"] = "TOKEN_AUTHENTICATED_GPU_QUOTA_UNVERIFIED"
        return base
    except urllib.error.HTTPError as exc:
        base["api_status"] = int(exc.code)
        base["latency_ms"] = round((time.perf_counter() - started) * 1000, 3)
        if exc.code == 401:
            base["auth_probe_status"] = "AUTH_REJECTED"
        elif exc.code == 402:
            base["auth_probe_status"] = "PAYMENT_REQUIRED_OR_CREDITS_EXHAUSTED"
        elif exc.code == 403:
            base["auth_probe_status"] = "SCOPE_OR_POLICY_DENIED"
        elif exc.code == 429:
            base["auth_probe_status"] = "RATE_LIMITED"
        elif 300 <= exc.code < 400:
            base["auth_probe_status"] = "REDIRECT_BLOCKED"
        else:
            base["auth_probe_status"] = "HTTP_ERROR"
        exc.close()
        return base
    except (TimeoutError, urllib.error.URLError, OSError) as exc:
        base["latency_ms"] = round((time.perf_counter() - started) * 1000, 3)
        base["auth_probe_status"] = "NETWORK_OR_TIMEOUT_" + type(exc).__name__
        return base


def remember_candidate_credentials(state: dict, reports: list[dict]) -> None:
    history_by_provider = state.get("gpu_candidate_credential_health")
    if not isinstance(history_by_provider, dict):
        history_by_provider = {}
    safe_fields = (
        "provider", "credential_env", "candidate_status", "credential_configured",
        "auth_probe_status", "api_status", "latency_ms", "gpu_capacity_status",
        "available_credits", "observed_at",
    )
    for report in reports:
        safe = {key: report[key] for key in safe_fields if key in report}
        name = str(safe.get("provider", "unknown"))
        previous = history_by_provider.get(name, [])
        if not isinstance(previous, list):
            previous = []
        history_by_provider[name] = (previous + [safe])[-12:]
    state["gpu_candidate_credential_health"] = history_by_provider


def run(root: Path) -> int:
    roster = load_json(root / "NOVA/gpu_roster.json", {"providers": []})
    policy = load_json(root / "NOVA/health_policy.json", {})
    state_path = root / "NOVA/health_state.json"
    state = load_health_state(state_path)

    providers = [
        p for p in roster.get("providers", [])
        if p.get("status", "active") != "disabled"
    ]

    # Capacity accounting is offline and evidence-gated; it never allocates a GPU.
    evidence_path = root / "NOVA/gpu_capacity_evidence.json"
    if evidence_path.is_file():
        capacity_evidence = load_capacity_evidence(evidence_path)
        missing_capacity_evidence = False
    else:
        capacity_evidence = {
            "schema_version": 1,
            "planning_reference_gpu_minutes_per_month": DEFAULT_PLANNING_REFERENCE_GPU_MINUTES_PER_MONTH,
            "providers": [],
        }
        missing_capacity_evidence = True
    active_provider_names = {
        str(provider.get("name", "")).strip()
        for provider in providers
        if isinstance(provider, dict) and str(provider.get("name", "")).strip()
    }
    capacity_summary = build_capacity_report(
        capacity_evidence,
        active_provider_names=active_provider_names,
    )
    if missing_capacity_evidence:
        capacity_summary["warnings"].append("GPU capacity evidence register is missing; no capacity can be qualified.")

    # Candidate key checks are read-only and do not activate a GPU provider.
    # Each adapter must be explicitly declared and host-allowlisted in the roster.
    candidate_credentials = [
        check_candidate_credential(p)
        for p in roster.get("candidates", [])
        if isinstance(p, dict)
    ]
    remember_candidate_credentials(state, candidate_credentials)

    if not providers:
        observed_at = utc_now()
        state["updated_at"] = observed_at
        state["last_gpu_heartbeat"] = {
            "observed_at": observed_at,
            "status": "UNCONFIGURED",
            "message": "No GPU providers are activated. Candidate credentials are monitored separately; authentication does not prove GPU allocation or remaining GPU quota.",
            "candidate_credentials": candidate_credentials,

            "aggregate_capacity": capacity_summary,
        }
        atomic_write_json(state_path, state)
        print(json.dumps(state["last_gpu_heartbeat"], indent=2, sort_keys=True))
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
        "candidate_credentials": candidate_credentials,

        "aggregate_capacity": capacity_summary,
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
