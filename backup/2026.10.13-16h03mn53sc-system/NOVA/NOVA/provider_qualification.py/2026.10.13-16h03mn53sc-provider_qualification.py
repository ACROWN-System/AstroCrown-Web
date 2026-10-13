"""Bounded, secret-safe diagnostic probes; never mutates NOVA production state."""
import json
import os
import re
import socket
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

MARKER = "NOVA_PROBE_OK"
MAX_BYTES = 65536
TIMEOUT = 18
HEADERS_OK = {"retry-after", "ratelimit-limit", "ratelimit-remaining",
              "ratelimit-reset", "x-ratelimit-limit", "x-ratelimit-remaining",
              "x-ratelimit-reset", "x-ratelimit-limit-requests",
              "x-ratelimit-remaining-requests", "x-ratelimit-limit-tokens",
              "x-ratelimit-remaining-tokens", "x-ratelimit-limit-req-minute",
              "x-ratelimit-remaining-req-minute", "x-ratelimit-reset-req-minute",
              "x-ratelimit-limit-req-10-second", "x-ratelimit-remaining-req-10-second",
              "x-ratelimit-reset-req-10-second", "x-ratelimit-limit-tokens-minute",
              "x-ratelimit-remaining-tokens-minute", "x-ratelimit-reset-tokens-minute",
              "x-ratelimit-limit-tokens-month", "x-ratelimit-remaining-tokens-month",
              "x-ratelimit-reset-tokens-month"}


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def classify(status):
    if 300 <= status < 400:
        return "REDIRECT_BLOCKED"
    if status == 401:
        return "AUTH_REJECTED"
    if status == 402:
        return "PAYMENT_REQUIRED_OR_CREDITS_EXHAUSTED"
    if status == 403:
        return "ACCESS_DENIED_OR_POLICY"
    if status == 404:
        return "ENDPOINT_OR_MODEL_NOT_FOUND"
    if status == 429:
        return "RATE_LIMITED_OR_QUOTA_EXHAUSTED"
    if status >= 500:
        return "PROVIDER_SERVER_ERROR"
    return "HTTP_ERROR"


def safe_headers(headers):
    result = {}
    if not headers:
        return result
    for key, value in headers.items():
        key = str(key).lower()
        value = str(value).strip()
        if key in HEADERS_OK and len(value) <= 80 and re.fullmatch(r"[A-Za-z0-9.,:/_+-]+", value):
            result[key] = value
    return result


def openai_text(payload):
    try:
        return payload["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError):
        return None


def gemini_text(payload):
    try:
        return "".join(part.get("text", "") for part in payload["candidates"][0]["content"]["parts"])
    except (KeyError, IndexError, TypeError, AttributeError):
        return None


def probe(name, kind, env_name, credential, url, method, headers, body, validator):
    base = {"provider": name, "provider_type": kind, "credential_env": env_name,
            "credential_configured": bool(credential), "http_status": None,
            "latency_ms": None, "rate_limit_headers": {}, "usage": {},
            "response_shape_valid": None, "probe_marker_present": None}
    if not credential:
        base["status"] = "SKIPPED_MISSING_CREDENTIAL"
        return base

    request = urllib.request.Request(url, data=body, method=method, headers={
        "Accept": "application/json", "User-Agent": "NOVA-Provider-Qualification/1.0",
        **headers,
    })
    start = time.monotonic()
    opener = urllib.request.build_opener(NoRedirect())
    try:
        with opener.open(request, timeout=TIMEOUT) as response:
            code = int(response.status)
            base["http_status"] = code
            base["rate_limit_headers"] = safe_headers(response.headers)
            raw = response.read(MAX_BYTES + 1)
        base["latency_ms"] = int((time.monotonic() - start) * 1000)
        if len(raw) > MAX_BYTES:
            base["status"] = "RESPONSE_TOO_LARGE"
            return base
        try:
            payload = json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            base["status"] = "INVALID_JSON_RESPONSE"
            return base
        if not isinstance(payload, dict):
            base["status"] = "INVALID_RESPONSE_SHAPE"
            return base
        text = validator(payload)
        base["response_shape_valid"] = isinstance(text, str)
        base["probe_marker_present"] = bool(isinstance(text, str) and MARKER in text)
        if not isinstance(text, str):
            base["status"] = "INVALID_RESPONSE_SHAPE"
        elif base["probe_marker_present"]:
            base["status"] = "PASS"
        else:
            base["status"] = "RESPONSE_VALID_MARKER_MISSING"
        usage = payload.get("usage") or payload.get("usageMetadata") or {}
        if isinstance(usage, dict):
            for out_key, possible_keys in {
                "input_tokens": ("prompt_tokens", "promptTokenCount"),
                "output_tokens": ("completion_tokens", "candidatesTokenCount"),
                "total_tokens": ("total_tokens", "totalTokenCount"),
            }.items():
                for key in possible_keys:
                    value = usage.get(key)
                    if isinstance(value, int) and not isinstance(value, bool) and value >= 0:
                        base["usage"][out_key] = value
                        break
        return base
    except urllib.error.HTTPError as exc:
        base["http_status"] = int(exc.code)
        base["status"] = classify(int(exc.code))
        base["latency_ms"] = int((time.monotonic() - start) * 1000)
        base["rate_limit_headers"] = safe_headers(exc.headers)
        exc.close()
        return base
    except (TimeoutError, socket.timeout):
        base["status"] = "TIMEOUT"
        base["latency_ms"] = int((time.monotonic() - start) * 1000)
        return base
    except (urllib.error.URLError, OSError):
        base["status"] = "NETWORK_ERROR"
        base["latency_ms"] = int((time.monotonic() - start) * 1000)
        return base
    except Exception:
        # Avoid exception strings because upstream errors may contain request data.
        base["status"] = "PROBE_INTERNAL_ERROR"
        base["latency_ms"] = int((time.monotonic() - start) * 1000)
        return base


def chat_body(model, token_field="max_tokens", reasoning_effort=None):
    body = {"model": model, "messages": [{"role": "user",
        "content": "Reply exactly with this marker and nothing else: " + MARKER}],
        token_field: 64 if reasoning_effort else 32, "temperature": 0, "stream": False}
    if reasoning_effort:
        body["reasoning_effort"] = reasoning_effort
    return json.dumps(body,
        separators=(",", ":")).encode("utf-8")


def build_report(environ=None):
    env = os.environ if environ is None else environ
    rows = []
    groq = env.get("GROQ_API_KEY_01", "").strip()
    gemini = env.get("GEMINI_API_KEY_01", "").strip()

    for name, key_env, key, url, model, token_field, reasoning_effort in [
        ("groq", "GROQ_API_KEY_01", groq,
         "https://api.groq.com/openai/v1/chat/completions", "openai/gpt-oss-20b", "max_completion_tokens", "low"),
    ]:
        rows.append(probe(name, "llm_inference", key_env, key, url, "POST",
            {"Authorization": "Bearer " + key, "Content-Type": "application/json"},
            chat_body(model, token_field, reasoning_effort), openai_text))

    gemini_body = json.dumps({"contents": [{"parts": [{"text":
        "Reply exactly with this marker and nothing else: " + MARKER}]}],
        "generationConfig": {"temperature": 0, "maxOutputTokens": 16}},
        separators=(",", ":")).encode("utf-8")
    rows.append(probe("gemini", "llm_inference", "GEMINI_API_KEY_01", gemini,
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent",
        "POST", {"x-goog-api-key": gemini, "Content-Type": "application/json"},
        gemini_body, gemini_text))

    # A separate bounded, manual smoke test verified the model's exact structured
    # JSON response contract. Do not duplicate that live request from this diagnostic;
    # the source evidence is recorded in NOVA/roster.json.
    rows.append({
        "provider": "cloudflare", "provider_type": "llm_inference",
        "credential_env": "CLOUDFLARE_API_KEY_01+CLOUDFLARE_ACCOUNT_ID",
        # This diagnostic intentionally does not receive Cloudflare secrets. None
        # means "not checked here", not "missing" (the production heartbeat verifies separately).
        "credential_configured": None,
        "credential_configuration_status": "NOT_EXPOSED_TO_DIAGNOSTIC_BY_POLICY",
        "model": "@cf/meta/llama-3.1-8b-instruct-fast",
        "status": "SKIPPED_ALREADY_QUALIFIED", "http_status": None,
        "latency_ms": None, "rate_limit_headers": {}, "usage": {},
        "response_shape_valid": None, "probe_marker_present": None,
        "lifecycle_status": "ACTIVE",
        "qualification_evidence_url": "https://github.com/ACROWN-System/NOVA/actions/runs/38350563789",
    })

    lifecycle = {"groq": "ACTIVE", "gemini": "ACTIVE"}
    for row in rows:
        row.setdefault("lifecycle_status", lifecycle.get(row["provider"], "UNKNOWN"))

    report = {"observed_at": datetime.now(timezone.utc).isoformat(), "diagnostic_only": True,
        "production_roster_mutated": False, "secret_values_exposed": False,
        "github_token_is_inference_provider": False, "results": rows}
    return report


def persist_heartbeat_report(report, path):
    """Persist sanitized credential health separately from the live routing namespace."""
    from NOVA.health import atomic_write_json, load_health_state

    state = load_health_state(Path(path))
    diagnostic_map = state.get("credential_health")
    if not isinstance(diagnostic_map, dict):
        diagnostic_map = {}

    allowed_fields = (
        "provider", "provider_type", "credential_env", "credential_configured",
        "model", "qualification_evidence_url", "credential_configuration_status",
        "lifecycle_status", "status", "http_status", "latency_ms",
        "rate_limit_headers", "usage",
        "response_shape_valid", "probe_marker_present",
    )
    safe_results = {}
    for row in report.get("results", []):
        if not isinstance(row, dict) or not isinstance(row.get("provider"), str):
            continue
        safe = {key: row[key] for key in allowed_fields if key in row}
        safe["observed_at"] = report.get("observed_at")
        previous = diagnostic_map.get(row["provider"], {})
        history = previous.get("history", []) if isinstance(previous, dict) else []
        if not isinstance(history, list):
            history = []
        history.append(safe)
        diagnostic_map[row["provider"]] = {"latest": safe, "history": history[-12:]}
        safe_results[row["provider"]] = safe

    state["credential_health"] = diagnostic_map
    state["last_llm_key_heartbeat"] = {
        "observed_at": report.get("observed_at"),
        "diagnostic_only": True,
        "production_roster_mutated": False,
        "results": safe_results,
    }
    state["updated_at"] = report.get("observed_at")
    atomic_write_json(Path(path), state)


def render_markdown(report):
    lines = [
        "# NOVA provider qualification",
        "",
        "Bounded non-sensitive diagnostic requests are sent only to eligible configured endpoints. Cloudflare's selected model has already passed a bounded live JSON-contract smoke test; this diagnostic deliberately skips a duplicate Cloudflare inference request. No credential values, response text, or raw error bodies are logged.",
        "A pass does not prove remaining quota, $0 eligibility, commercial rights, or production capacity.",
        "",
        "| Provider | Type | Model | Lifecycle | Credential slot | Configured | Result | HTTP | Shape valid | Marker | Latency ms | Usage | Evidence |",
        "|---|---|---|---|---|---|---|---:|---|---|---:|---|---|",
    ]
    for row in report.get("results", []):
        usage = ", ".join("{}={}".format(k, v) for k, v in sorted(row.get("usage", {}).items())) or "unavailable"
        evidence = "[live smoke run]({})".format(row["qualification_evidence_url"]) if row.get("qualification_evidence_url") else "—"
        lines.append("| {provider} | {provider_type} | {model} | {lifecycle} | {credential_env} | {configured} | {status} | {http} | {shape} | {marker} | {latency} | {usage} | {evidence} |".format(
            provider=row["provider"], provider_type=row["provider_type"],
            model=row.get("model", "—"),
            lifecycle=row.get("lifecycle_status", "UNKNOWN"),
            credential_env=row["credential_env"],
            configured=("yes" if row.get("credential_configured") is True
                        else "no" if row.get("credential_configured") is False
                        else "not checked"),
            status=row["status"], http=row["http_status"] if row["http_status"] is not None else "—",
            shape=row.get("response_shape_valid"), marker=row.get("probe_marker_present"),
            latency=row["latency_ms"] if row["latency_ms"] is not None else "—",
            usage=usage, evidence=evidence))
    lines.extend([
        "",
        "Mistral is excluded from the provider qualification environment by the current operator decision.",
        "Cloudflare's @cf/meta/llama-3.1-8b-instruct-fast structured JSON contract was verified by the bounded manual smoke run linked in its row. This diagnostic deliberately skips a duplicate live request.",
        "GitHub-managed authentication is not treated as an AI-provider key. GitHub Actions uses a separate short-lived GITHUB_TOKEN; Codex integration is tested through its own authorized path.",
        "The diagnostic never changes provider roster, persisted down markers, routing or billing settings. When called from the heartbeat, a sanitized diagnostic snapshot is stored outside provider-routing targets.",
    ])
    return "\n".join(lines) + "\n"


def main():
    report = build_report()
    if os.environ.get("NOVA_PERSIST_HEALTH_STATE", "").strip().lower() == "true":
        state_path = os.environ.get("NOVA_HEALTH_STATE_PATH", "NOVA/health_state.json")
        persist_heartbeat_report(report, state_path)
    print(json.dumps(report, indent=2, sort_keys=True))
    summary_path = os.environ.get("GITHUB_STEP_SUMMARY", "").strip()
    if summary_path:
        with open(summary_path, "a", encoding="utf-8") as out:
            out.write(render_markdown(report))


if __name__ == "__main__":
    main()
