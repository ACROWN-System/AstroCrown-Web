#!/usr/bin/env python3
"""Commit-aware workload for provenance-preserving context packing.

The benchmark is deliberately narrow: it measures required-record retrieval
under a fixed character budget. It does not measure general intelligence.
"""

from __future__ import annotations

import contextlib
import copy
import io
import json
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Any, Callable

ROOT = Path(__file__).resolve().parents[3]
PACKER_PATH = "development/nova-context-memory-optimization/context_packer.py"
CASES_PATH = Path(__file__).with_name("context-packing-cases.json")
_SHA_RE = re.compile(r"^[0-9a-f]{40}$")


def validate_cases(cases: Any) -> list[dict[str, Any]]:
    """Fail closed when the reference workload cannot test evidence retrieval."""
    if not isinstance(cases, list) or not cases:
        raise ValueError("Benchmark corpus must contain a non-empty cases list.")

    seen_case_ids: set[str] = set()
    for case_index, case in enumerate(cases):
        if not isinstance(case, dict):
            raise ValueError(f"Benchmark case {case_index} must be an object.")
        case_id = case.get("case_id")
        if (
            not isinstance(case_id, str)
            or not case_id.strip()
            or "\n" in case_id
            or "\r" in case_id
            or case_id in seen_case_ids
        ):
            raise ValueError("Benchmark case identifiers must be unique, non-empty single-line strings.")
        seen_case_ids.add(case_id)

        query = case.get("query")
        if not isinstance(query, str) or not query.strip():
            raise ValueError(f"Benchmark case {case_id} needs a non-empty query.")
        budget = case.get("max_chars")
        if isinstance(budget, bool) or not isinstance(budget, int) or budget < 0:
            raise ValueError(f"Benchmark case {case_id} has an invalid character budget.")

        items = case.get("items")
        if not isinstance(items, list) or not items:
            raise ValueError(f"Benchmark case {case_id} must contain non-empty records.")
        seen_item_ids: set[str] = set()
        for item_index, item in enumerate(items):
            if not isinstance(item, dict):
                raise ValueError(f"Benchmark case {case_id} item {item_index} must be an object.")
            item_id = item.get("id")
            source = item.get("source")
            content = item.get("content")
            observed_at = item.get("observed_at")
            status = item.get("status")
            if not isinstance(item_id, str) or not item_id.strip():
                raise ValueError(f"Benchmark case {case_id} has an item without a valid id.")
            if item_id in seen_item_ids:
                raise ValueError(f"Benchmark case {case_id} contains duplicate item id {item_id}.")
            seen_item_ids.add(item_id)
            if (
                not isinstance(source, str)
                or not source.strip()
                or not isinstance(observed_at, str)
                or not observed_at.strip()
                or not isinstance(status, str)
                or not status.strip()
                or any("\n" in field or "\r" in field for field in (item_id, source, observed_at, status))
                or not isinstance(content, str)
                or not content.strip()
            ):
                raise ValueError(f"Benchmark case {case_id} contains invalid record content or provenance metadata.")

        required_ids = case.get("required_item_ids")
        if (
            not isinstance(required_ids, list)
            or not required_ids
            or any(not isinstance(item_id, str) or not item_id.strip() for item_id in required_ids)
        ):
            raise ValueError(f"Benchmark case {case_id} must identify at least one required record.")
        if len(required_ids) != len(set(required_ids)):
            raise ValueError(f"Benchmark case {case_id} contains duplicate required item ids.")
        missing = sorted(set(required_ids) - seen_item_ids)
        if missing:
            raise ValueError(f"Benchmark case {case_id} requires unknown item ids: {missing}.")

    return cases


def validate_corpus(payload: Any) -> list[dict[str, Any]]:
    """Validate the identity and schema of the reference corpus before running code."""
    if (
        not isinstance(payload, dict)
        or type(payload.get("schema_version")) is not int
        or payload.get("schema_version") != 1
        or payload.get("benchmark_id") != "nova-context-packing-v1"
    ):
        raise ValueError("Context-packing benchmark corpus identity or schema is invalid.")
    return validate_cases(payload.get("cases"))


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


def _selected_required_ids(result: Any, required_ids: set[str]) -> set[str]:
    """Return selected required IDs only from safely typed benchmark output."""
    if not isinstance(result, dict):
        return set()
    selected = result.get("selected_ids")
    if not isinstance(selected, list) or not all(isinstance(item_id, str) for item_id in selected):
        return set()
    return set(selected) & required_ids


def _case_metrics(
    result: Any, case: dict[str, Any], validation_errors: list[str]
) -> dict[str, Any]:
    # Derive metrics only from safely typed fields. Malformed candidate output
    # must become failed evidence, not an exception or a trusted numeric score.
    if not isinstance(result, dict):
        result = {}
    raw_selected = result.get("selected_ids")
    selected = (
        set(raw_selected)
        if isinstance(raw_selected, list) and all(isinstance(item_id, str) for item_id in raw_selected)
        else set()
    )
    context = result.get("context")
    required = set(case["required_item_ids"])
    return {
        "required_hits": len(selected & required),
        "required_total": len(required),
        "unrequired_records": len(selected - required),
        "characters": len(context) if isinstance(context, str) else 0,
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
    cases = validate_cases(cases)
    per_case: list[dict[str, Any]] = []
    baseline_totals = {"required_hits": 0, "required_total": 0, "unrequired_records": 0, "characters": 0}
    candidate_totals = {"required_hits": 0, "required_total": 0, "unrequired_records": 0, "characters": 0}
    baseline_integrity = True
    candidate_integrity = True
    no_case_regressions = True
    no_noise_regressions = True
    all_required_items_present = True

    for case in cases:
        items = case["items"]
        query = case["query"]
        budget = case["max_chars"]
        required = set(case["required_item_ids"])

        # Candidate code is untrusted. Give each implementation its own input
        # copy and validate both outputs against the untouched trusted corpus.
        # This prevents in-place record edits from changing the validator's
        # reference data or making an altered record appear provenance-preserving.
        trusted_items = copy.deepcopy(items)
        baseline_input = copy.deepcopy(trusted_items)
        candidate_input = copy.deepcopy(trusted_items)
        base_result = baseline_pack(baseline_input, query, budget)
        cand_result = candidate_pack(candidate_input, query, budget)
        base_errors = validate_result(base_result, trusted_items, budget)
        cand_errors = validate_result(cand_result, trusted_items, budget)
        base_metrics = _case_metrics(base_result, case, base_errors)
        cand_metrics = _case_metrics(cand_result, case, cand_errors)

        base_required_ids = _selected_required_ids(base_result, required)
        candidate_required_ids = _selected_required_ids(cand_result, required)
        missing_candidate_required_ids = sorted(required - candidate_required_ids)
        base_metrics["required_item_ids_selected"] = sorted(base_required_ids)
        cand_metrics["required_item_ids_selected"] = sorted(candidate_required_ids)
        cand_metrics["missing_required_item_ids"] = missing_candidate_required_ids
        cand_metrics["all_required_items_present"] = not missing_candidate_required_ids
        base_metrics["case_id"] = case["case_id"]
        cand_metrics["case_id"] = case["case_id"]
        for metric in ("required_hits", "required_total", "unrequired_records", "characters"):
            baseline_totals[metric] += int(base_metrics[metric] or 0)
            candidate_totals[metric] += int(cand_metrics[metric] or 0)

        # Compare required-record identity, not only the count of records hit.
        # Losing one mandatory record while substituting another is a regression,
        # even when the per-case number of hits stays constant.
        if not base_required_ids.issubset(candidate_required_ids):
            no_case_regressions = False
        if missing_candidate_required_ids:
            all_required_items_present = False
        if cand_metrics["unrequired_records"] > base_metrics["unrequired_records"]:
            no_noise_regressions = False
        baseline_integrity = baseline_integrity and not base_errors
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
        baseline_integrity
        and candidate_integrity
        and no_case_regressions
        and no_noise_regressions
        and all_required_items_present
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
            "baseline_reference_integrity": baseline_integrity,
            "candidate_integrity_and_budget": candidate_integrity,
            "no_per_case_required_evidence_regression": no_case_regressions,
            "no_unrequired_record_regression": no_noise_regressions,
            "all_required_items_present": all_required_items_present,
            "strict_improvement": strict_gain,
        },
        "per_case": per_case,
        "evidence": (
            "Fixed synthetic cases; required whole-record coverage and provenance/budget "
            "integrity. Scope is context packing only, not general intelligence."
        ),
    }


def _isolated_packer(
    commit: str, role: str, source_path: Path
) -> Callable[[list[dict[str, Any]], str, int], dict[str, Any]]:
    """Call one commit-pinned packer in a child process separate from the verifier."""
    def invoke(
        items: list[dict[str, Any]], query: str, max_chars: int
    ) -> dict[str, Any]:
        try:
            request = json.dumps(
                {"items": items, "query": query, "max_chars": max_chars},
                ensure_ascii=False,
                separators=(",", ":"),
                allow_nan=False,
            )
        except (TypeError, ValueError) as exc:
            raise RuntimeError("Benchmark input could not be serialized safely.") from exc

        command = [
            sys.executable,
            str(Path(__file__).resolve()),
            "--worker",
            commit,
            role,
            str(source_path),
        ]
        try:
            result = subprocess.run(
                command,
                input=request,
                text=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=30,
                check=False,
            )
        except (OSError, subprocess.TimeoutExpired) as exc:
            raise RuntimeError("Isolated benchmark implementation did not complete.") from exc
        if result.returncode != 0:
            raise RuntimeError("Isolated benchmark implementation exited unsuccessfully.")
        try:
            output = json.loads(result.stdout)
        except (json.JSONDecodeError, TypeError) as exc:
            raise RuntimeError("Isolated benchmark implementation returned invalid JSON.") from exc
        if not isinstance(output, dict):
            raise RuntimeError("Isolated benchmark implementation did not return a JSON object.")
        return output

    return invoke


def _worker_main(arguments: list[str]) -> int:
    """Worker entrypoint: run one untrusted packer, never the trusted verifier."""
    if len(arguments) != 3:
        return 2
    commit, role, source_name = arguments
    if not _SHA_RE.fullmatch(commit) or role not in {"baseline", "candidate"}:
        return 2
    source_path = Path(source_name)
    if source_path.name != f"{role}-{commit}.py":
        return 2

    try:
        request = json.loads(sys.stdin.read())
    except (json.JSONDecodeError, RecursionError):
        return 2
    if (
        not isinstance(request, dict)
        or not isinstance(request.get("items"), list)
        or not isinstance(request.get("query"), str)
        or isinstance(request.get("max_chars"), bool)
        or not isinstance(request.get("max_chars"), int)
        or request["max_chars"] < 0
    ):
        return 2

    try:
        source = source_path.read_text(encoding="utf-8")
    except OSError:
        return 2

    # Capture trusted serializer and original stdout before executing candidate
    # source. Candidate prints are discarded; only the worker's result goes to
    # the parent verifier's JSON channel.
    serialize_json = json.dumps
    trusted_stdout = sys.stdout
    namespace: dict[str, Any] = {"__name__": f"_context_packer_{commit[:12]}"}
    try:
        with contextlib.redirect_stdout(io.StringIO()):
            exec(compile(source, f"{commit}:{PACKER_PATH}", "exec"), namespace)
            packer = namespace.get("pack_context")
            if not callable(packer):
                return 2
            output = packer(request["items"], request["query"], request["max_chars"])
        encoded = serialize_json(
            output,
            ensure_ascii=False,
            separators=(",", ":"),
            allow_nan=False,
        )
        trusted_stdout.write(encoded + "\n")
        trusted_stdout.flush()
    except (Exception, RecursionError):
        return 2
    return 0


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
    if not source_path.is_file():
        raise RuntimeError(f"Required benchmark source snapshot is unavailable: {source_name}")
    # Do not exec candidate-controlled source inside the trusted benchmark
    # verifier. A separate process prevents it from monkeypatching validation
    # functions or other verifier globals in memory.
    return _isolated_packer(commit, role, source_path)


def main() -> int:
    baseline_commit = os.environ.get("RSI_BASELINE_COMMIT", "")
    candidate_commit = os.environ.get("RSI_CANDIDATE_COMMIT", "")
    if not _SHA_RE.fullmatch(baseline_commit) or not _SHA_RE.fullmatch(candidate_commit):
        raise ValueError("RSI_BASELINE_COMMIT and RSI_CANDIDATE_COMMIT must be exact full SHAs.")

    payload = json.loads(CASES_PATH.read_text(encoding="utf-8"))
    cases = validate_corpus(payload)
    baseline_pack = _load_packer(
        baseline_commit, "RSI_BASELINE_PACKER_FILE", "baseline"
    )
    candidate_pack = _load_packer(
        candidate_commit, "RSI_CANDIDATE_PACKER_FILE", "candidate"
    )
    try:
        result = compare_implementations(
            baseline_pack,
            candidate_pack,
            cases,
            baseline_commit,
            candidate_commit,
        )
    except (OSError, ValueError, RuntimeError, subprocess.SubprocessError):
        # A failed isolated baseline/candidate execution is not benchmark success.
        result = {
            "benchmark_id": "nova-context-packing-v1",
            "candidate_better": False,
            "baseline_commit": baseline_commit,
            "candidate_commit": candidate_commit,
            "status": "BLOCKED",
            "evidence": "Isolated benchmark execution did not yield a verifiable result.",
        }
    print(json.dumps(result, sort_keys=True, separators=(",", ":")))
    return 0


if __name__ == "__main__":
    try:
        if len(sys.argv) > 1 and sys.argv[1] == "--worker":
            raise SystemExit(_worker_main(sys.argv[2:]))
        raise SystemExit(main())
    except (OSError, ValueError, RuntimeError, json.JSONDecodeError, subprocess.SubprocessError) as exc:
        # The protected evaluator treats missing/invalid JSON as BLOCKED.
        raise SystemExit(f"BLOCKED: {exc}") from exc
