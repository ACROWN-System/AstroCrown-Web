#!/usr/bin/env python3
"""Observe external operational annotations without invoking an AI model.

Watched sources are configured in NOVA/watchlist.json. Meaningful content is
fingerprinted after transport noise is removed. A transient fetch failure does
not overwrite the last successful observation.

A future reasoning stage can call reusable_analysis() and avoid an AI call when
the same meaningful source content has already been analyzed and its validity
window has not expired.
"""

from __future__ import annotations

import argparse
import json
import re
import urllib.error
import urllib.request
from pathlib import Path

try:
    from .health import (
        atomic_write_json,
        fingerprint,
        load_json,
        load_health_state,
        remember_observation,
        reusable_analysis,
        utc_now,
    )
except ImportError:  # direct script execution from the NOVA directory
    from health import (
        atomic_write_json,
        fingerprint,
        load_json,
        load_health_state,
        remember_observation,
        reusable_analysis,
        utc_now,
    )

DEFAULT_WATCHLIST = {"schema_version": 1, "sources": []}


def fetch_text(url: str, max_bytes: int, timeout: int) -> tuple[int | None, str, str | None]:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "NOVA-Operational-Observer/1.0",
            "Accept": "text/html,application/xhtml+xml,text/plain,application/json,*/*;q=0.8",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            payload = response.read(max_bytes + 1)
            if len(payload) > max_bytes:
                payload = payload[:max_bytes]
            return response.status, payload.decode("utf-8", errors="replace"), None
    except urllib.error.HTTPError as exc:
        try:
            body = exc.read(max_bytes).decode("utf-8", errors="replace")
        except Exception:
            body = ""
        return exc.code, body, f"HTTP {exc.code}"
    except Exception as exc:
        return None, "", str(exc)


def normalize_content(content: str) -> str:
    content = re.sub(r"(?is)<(script|style|noscript).*?>.*?</\1>", " ", content)
    content = re.sub(r"(?is)<[^>]+>", " ", content)
    content = re.sub(r"\s+", " ", content)
    return content.strip()


def observe_source(source: dict, state: dict, *, timeout: int, max_bytes: int) -> dict:
    name = source.get("name") or source.get("url")
    url = source.get("url")
    if not isinstance(url, str) or not url:
        return {"source": name, "status": "BLOCKED", "reason": "Source has no URL."}

    status, raw, error = fetch_text(url, max_bytes, timeout)
    if error and not raw:
        return {
            "source": name,
            "url": url,
            "status": "ERROR",
            "http_status": status,
            "fetch_error": error,
        }

    normalized = normalize_content(raw)
    observation = {
        "url": url,
        "http_status": status,
        "content_fingerprint": fingerprint(normalized),
        "content_excerpt": normalized[:4000],
    }
    valid_for = source.get("analysis_valid_for_seconds")
    fresh_for = source.get("observation_fresh_for_seconds")
    previous_analysis = reusable_analysis(
        state,
        namespace="external-annotation",
        source=str(name),
        current_observation=observation,
    )
    memory = remember_observation(
        state,
        namespace="external-annotation",
        source=str(name),
        observation=observation,
        valid_for_seconds=int(valid_for) if valid_for is not None else None,
        fresh_for_seconds=int(fresh_for) if fresh_for is not None else None,
    )

    if memory["unchanged_from_previous"] and previous_analysis is not None:
        analysis_action = "REUSE_PRIOR_ANALYSIS"
    elif memory["unchanged_from_previous"]:
        analysis_action = "NO_CHANGE_NO_ANALYSIS"
    else:
        analysis_action = "ANALYSIS_REQUIRED"
        state.setdefault("events", {})[memory["fingerprint"]] = {
            "event_type": "external-annotation-change",
            "source": str(name),
            "observed_at": memory["observed_at"],
            "fingerprint": memory["fingerprint"],
            "analysis_status": "PENDING",
            "action_status": "PENDING_POLICY_DECISION",
            "risk_level": source.get("risk_level", "UNKNOWN"),
        }

    return {
        "source": name,
        "url": url,
        "status": "UNCHANGED" if memory["unchanged_from_previous"] else "CHANGED",
        "analysis_action": analysis_action,
        "http_status": status,
        "fingerprint": memory["fingerprint"],
    }


def run(root: Path) -> int:
    watchlist = load_json(root / "NOVA/watchlist.json", DEFAULT_WATCHLIST)
    state_path = root / "NOVA/health_state.json"
    state = load_health_state(state_path)

    results = []
    for source in watchlist.get("sources", []):
        if not source.get("enabled", True):
            continue
        results.append(
            observe_source(
                source,
                state,
                timeout=int(source.get("timeout_seconds", 15)),
                max_bytes=int(source.get("max_bytes", 262144)),
            )
        )

    state["last_annotation_scan"] = {
        "observed_at": utc_now(),
        "results": results,
    }
    atomic_write_json(state_path, state)

    print(json.dumps(state["last_annotation_scan"], indent=2, sort_keys=True))
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", default=".")
    args = parser.parse_args()
    return run(Path(args.repo).resolve())


if __name__ == "__main__":
    raise SystemExit(main())
