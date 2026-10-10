#!/usr/bin/env python3
"""Commit-aware workload for provenance-preserving context packing.

The benchmark is deliberately narrow: it measures required-record retrieval
under a fixed character budget. It does not measure general intelligence.
"""

from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any, Callable

ROOT = Path(__file__).resolve().parents[3]
PACKER_PATH = "development/nova-context-memory-optimization/context_packer.py"
CASES_PATH = Path(__file__).with_name("context-packing-cases.json")
_SHA_RE = re.compile(r"^[0-9a-f]{40}$")


def _render_record(item: dict[str, Any]) -> str:
    observed_at = item.get("observed_at", "undated")
    status = item.get("status", "unspecified")
    return (
        f"[id: {item['id']} | source: {item['source']} | "
        f"observed_at: {observed_at} | status: {status}]\n"
        f"{item['content']}"
    )


def _result(items: list[dict[str, Any]], selected: list[dict[str, Any]], budget: int) -> dict[str, Any]:
    context = "\n\n".join(_render_record(item) for item in selected)
    selected_ids = [item["id"] for item in selected]
    selected_set = set(selected_ids)
    all_ids = [item["id"] for item in items]
    return {
        "selected_ids": selected_ids,
        "dropped_ids": [item_id for item_id in all_ids if item_id not in selected_set],
        "context": context,
        "character_count": len(context),
        "max_chars": budget,
        "provenance": [
            {
                "id": item["id"],
                "source": item["source"],
                "observed_at": item.get("observed_at", "undated"),
                "status": item.get("status", "unspecified"),
            }
            for item in selected
        ],
    }


def baseline_first_fit(
    items: list[dict[str, Any]], query: str, max_chars: int
) -> dict[str, Any]:
    """Reference: use input order and keep only whole records that fit."""
    del query  # Reference intentionally does not use relevance.
    if isinstance(max_chars, bool) or not isinstance(max_chars, int) or max_chars < 0:
        raise ValueError("max_chars must be a non-negative integer.")
    selected: list[dict[str, Any]] = []
    for item in items:
        proposal = selected + [item]
        rendered = "\n\n".join(_render_record(record) for record in proposal)
        if len(rendered) <= max_chars:
            selected.append(item)
    return _result(items, selected, max_chars)


def validate_result(
    result: Any, items: list[dict[str, Any]], max_chars: int
) -> list[str]:
    """Validate exact whole-record preservation, provenance and budget compliance."""
    errors: list[str] = []
    if not isinstance(result, dict):
        return ["result is not a JSON-like object"]

    selected_ids = result.get("selected_ids")
    if not isinstance(selected_ids, list) or not all(isinstance(x, str) for x in selected_ids):
        return ["selected_ids must be a list of strings"]
    if len(selected_ids) != len(set(selected_ids)):
        errors.append("selected_ids contains duplicates")

    by_id = {item.get("id"): item for item in items if isinstance(item, dict)}
    if any(item_id not in by_id for item_id in selected_ids):
        errors.append("selected_ids contains an unknown item")
        return errors
    selected = [by_id[item_id] for item_id in selected_ids]
    expected_context = "\n\n".join(_render_record(item) for item in selected)
    if result.get("context") != expected_context:
        errors.append("context differs from the exact full records plus provenance headers")
    if result.get("character_count") != len(expected_context):
        errors.append("character_count does not match rendered context")
    if len(expected_context) > max_chars:
        errors.append("context exceeds the hard character budget")
    if result.get("max_chars") != max_chars:
        errors.append("reported max_chars differs from workload budget")

    expected_provenance = [
        {
            "id": item["id"],
            "source": item["source"],
            "observed_at": item.get("observed_at", "undated"),
            "status": item.get("status", "unspecified"),
        }
        for item in selected
    ]
    if result.get("provenance") != expected_provenance:
        errors.append("provenance metadata is missing, reordered, or changed")

    all_ids = [item["id"] for item in items]
    expected_dropped = [item_id for item_id in all_ids if item_id not in set(selected_ids)]
    if result.get("dropped_ids") != expected_dropped:
        errors.append("dropped_ids do not match items not selected")
    return errors


def _case_metrics(
    result: dict[str, Any], case: dict[str, Any], validation_errors: list[str]
) -> dict[str, Any]:
    selected = set(result.get("selected_ids", []))
    required = set(case["required_item_ids"])
    return {
        "required_hits": len(selected & required),
        "required_total": len(required),
        "unrequired_records": len(selected - required),
        "characters": result.get("character_count"),
        "integrity_pass": not validation_errors,
        "integrity_errors": validation_errors,
    }


def compare_implementations(
    baseline_pack: Callable[[list[dict[str, Any]], str, int], dict[str, Any]],
    candidate_pack: Callable[[list[dict[str, Any]], str, int], dict[str, Any]],
    cases: list[dict[str, Any]],
    baseline_commit: str,
    candidate_commit: str,
) -> dict[str, Any]:
    per_case: list[dict[str, Any]] = []
    baseline_totals = {"required_hits": 0, "required_total": 0, "unrequired_records": 0, "characters": 0}
    candidate_totals = {"required_hits": 0, "required_total": 0, "unrequired_records": 0, "characters": 0}
    candidate_integrity = True
    no_case_regressions = True
    no_noise_regressions = True

    for case in cases:
        items = case["items"]
        query = case["query"]
        budget = case["max_chars"]
        required = set(case["required_item_ids"])

        base_result = baseline_pack(items, query, budget)
        cand_result = candidate_pack(items, query, budget)
        base_errors = validate_result(base_result, items, budget)
        cand_errors = validate_result(cand_result, items, budget)
        base_metrics = _case_metrics(base_result, case, base_errors)
        cand_metrics = _case_metrics(cand_result, case, cand_errors)

        base_metrics["case_id"] = case["case_id"]
        cand_metrics["case_id"] = case["case_id"]
        for metric in ("required_hits", "required_total", "unrequired_records", "characters"):
            baseline_totals[metric] += int(base_metrics[metric] or 0)
            candidate_totals[metric] += int(cand_metrics[metric] or 0)

        if cand_metrics["required_hits"] < base_metrics["required_hits"]:
            no_case_regressions = False
        if cand_metrics["unrequired_records"] > base_metrics["unrequired_records"]:
            no_noise_regressions = False
        candidate_integrity = candidate_integrity and not cand_errors
        per_case.append(
            {
                "case_id": case["case_id"],
                "required_item_ids": sorted(required),
                "baseline": base_metrics,
                "candidate": cand_metrics,
            }
        )

    strict_gain = (
        candidate_totals["required_hits"] > baseline_totals["required_hits"]
        or (
            candidate_totals["required_hits"] == baseline_totals["required_hits"]
            and candidate_totals["unrequired_records"] < baseline_totals["unrequired_records"]
        )
    )
    candidate_better = (
        candidate_integrity
        and no_case_regressions
        and no_noise_regressions
        and strict_gain
    )
    return {
        "benchmark_id": "nova-context-packing-v1",
        "candidate_better": bool(candidate_better),
        "baseline_commit": baseline_commit,
        "candidate_commit": candidate_commit,
        "baseline": baseline_totals,
        "candidate": candidate_totals,
        "checks": {
            "candidate_integrity_and_budget": candidate_integrity,
            "no_per_case_required_evidence_regression": no_case_regressions,
            "no_unrequired_record_regression": no_noise_regressions,
            "strict_improvement": strict_gain,
        },
        "per_case": per_case,
        "evidence": (
            "Fixed synthetic cases; required whole-record coverage and provenance/budget "
            "integrity. Scope is context packing only, not general intelligence."
        ),
    }


def _load_packer(
    commit: str, env_name: str, role: str
) -> Callable[[list[dict[str, Any]], str, int], dict[str, Any]]:
    if not _SHA_RE.fullmatch(commit):
        raise ValueError("baseline and candidate commits must be full 40-character lowercase SHAs.")
    source_name = f"{role}-{commit}.py"
    source_path = Path(os.environ.get(env_name, ""))
    # These files are materialized by the protected host evaluator and mounted
    # read-only at this exact directory. Do not run git or trust a workspace path
    # supplied by candidate-controlled code.
    if source_path.parent != Path("/benchmark-input") or source_path.name != source_name:
        raise RuntimeError(f"{env_name} does not identify the expected immutable source snapshot.")
    try:
        source = source_path.read_text(encoding="utf-8")
    except OSError as exc:
        raise RuntimeError(f"Required benchmark source snapshot is unavailable: {source_name}") from exc
    ref = f"{commit}:{PACKER_PATH}"
    namespace: dict[str, Any] = {"__name__": f"_context_packer_{commit[:12]}"}
    exec(compile(source, ref, "exec"), namespace)
    function = namespace.get("pack_context")
    if not callable(function):
        raise RuntimeError(f"{ref} does not expose pack_context.")
    return function


def main() -> int:
    baseline_commit = os.environ.get("RSI_BASELINE_COMMIT", "")
    candidate_commit = os.environ.get("RSI_CANDIDATE_COMMIT", "")
    if not _SHA_RE.fullmatch(baseline_commit) or not _SHA_RE.fullmatch(candidate_commit):
        raise ValueError("RSI_BASELINE_COMMIT and RSI_CANDIDATE_COMMIT must be exact full SHAs.")

    payload = json.loads(CASES_PATH.read_text(encoding="utf-8"))
    if payload.get("benchmark_id") != "nova-context-packing-v1":
        raise ValueError("Unexpected context-packing benchmark identity.")
    baseline_pack = _load_packer(
        baseline_commit, "RSI_BASELINE_PACKER_FILE", "baseline"
    )
    candidate_pack = _load_packer(
        candidate_commit, "RSI_CANDIDATE_PACKER_FILE", "candidate"
    )
    result = compare_implementations(
        baseline_pack,
        candidate_pack,
        payload["cases"],
        baseline_commit,
        candidate_commit,
    )
    print(json.dumps(result, sort_keys=True, separators=(",", ":")))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, RuntimeError, json.JSONDecodeError, subprocess.SubprocessError) as exc:
        # The protected evaluator treats missing/invalid JSON as BLOCKED.
        raise SystemExit(f"BLOCKED: {exc}") from exc
