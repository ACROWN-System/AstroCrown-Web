#!/usr/bin/env python3
"""Read-only detection of repeated source states across recent NOVA RSI passes."""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

API_ROOT = "https://api.github.com"
SHA_RE = re.compile(r"^[0-9a-f]{40}$")
RUN_ID_RE = re.compile(r"^[0-9]+$")

# Compare native Git tree/blob IDs directly. No synthetic combined fingerprint is stored.
STATE_SCOPES: dict[str, tuple[str, str]] = {
    "rsi_subsystem_tree": ("development/nova-recursive-self-improvement", "tree"),
    "context_memory_subsystem_tree": ("development/nova-context-memory-optimization", "tree"),
    "rsi_engine_blob": ("development/nova-recursive-self-improvement/rsi_engine.py", "blob"),
    "evaluator_blob": ("development/nova-recursive-self-improvement/evaluator.py", "blob"),
    "rsi_policy_blob": ("development/nova-recursive-self-improvement/rsi_policy.json", "blob"),
    "benchmark_profiles_blob": ("development/nova-recursive-self-improvement/benchmark_profiles.json", "blob"),
    "benchmark_dispatcher_blob": ("development/nova-recursive-self-improvement/benchmark_dispatcher.py", "blob"),
    "sandbox_runtime_blob": ("development/nova-recursive-self-improvement/sandbox_runtime.py", "blob"),
    "evidence_verifier_blob": ("development/nova-recursive-self-improvement/evidence_verifier.py", "blob"),
    "rsi_workflow_blob": (".github/workflows/nova-rsi.yml", "blob"),
    "rsi_ci_workflow_blob": (".github/workflows/nova-rsi-ci.yml", "blob"),
}


class DiagnosticUnavailable(RuntimeError):
    """Raised when history is incomplete or cannot be verified."""


def fetch_json(url: str, token: str, *, timeout: int = 15) -> dict[str, Any]:
    request = Request(
        url,
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "NOVA-RSI-Repeat-State-Diagnostic",
        },
    )
    try:
        with urlopen(request, timeout=timeout) as response:
            payload = response.read(8 * 1024 * 1024 + 1)
    except (HTTPError, URLError, TimeoutError, OSError) as exc:
        raise DiagnosticUnavailable(
            f"GitHub API request failed: {type(exc).__name__}"
        ) from exc
    if len(payload) > 8 * 1024 * 1024:
        raise DiagnosticUnavailable("GitHub API response exceeded the 8 MiB safety limit.")
    try:
        result = json.loads(payload.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise DiagnosticUnavailable("GitHub API returned invalid JSON.") from exc
    if not isinstance(result, dict):
        raise DiagnosticUnavailable("GitHub API returned an unexpected response shape.")
    return result


def extract_scope_ids(tree_document: Any) -> dict[str, str]:
    if not isinstance(tree_document, dict):
        raise DiagnosticUnavailable("Git tree response is not an object.")
    if tree_document.get("truncated") is True:
        raise DiagnosticUnavailable("GitHub truncated a historical tree response.")
    entries = tree_document.get("tree")
    if not isinstance(entries, list):
        raise DiagnosticUnavailable("Git tree response has no valid entry list.")

    by_path: dict[str, dict[str, Any]] = {}
    for entry in entries:
        if not isinstance(entry, dict):
            raise DiagnosticUnavailable("Git tree contains a malformed entry.")
        if isinstance(entry.get("path"), str):
            by_path[entry["path"]] = entry

    result: dict[str, str] = {}
    for label, (path, expected_type) in STATE_SCOPES.items():
        entry = by_path.get(path)
        if entry is None:
            raise DiagnosticUnavailable(f"Required state scope is missing: {path}")
        if entry.get("type") != expected_type:
            raise DiagnosticUnavailable(f"Unexpected Git object type for scope: {path}")
        object_id = entry.get("sha")
        if not isinstance(object_id, str) or not SHA_RE.fullmatch(object_id):
            raise DiagnosticUnavailable(f"Invalid native Git object ID for scope: {path}")
        result[label] = object_id
    return result


def current_scope_ids(repo_root: Path, commit_sha: str) -> dict[str, str]:
    if not SHA_RE.fullmatch(commit_sha):
        raise DiagnosticUnavailable("Current workflow commit SHA is invalid.")
    try:
        head = subprocess.run(
            ["git", "rev-parse", "HEAD"], cwd=repo_root, check=True,
            capture_output=True, text=True, timeout=5,
        ).stdout.strip()
        if head != commit_sha:
            raise DiagnosticUnavailable("Checked-out HEAD differs from workflow commit SHA.")

        result: dict[str, str] = {}
        for label, (path, expected_type) in STATE_SCOPES.items():
            object_id = subprocess.run(
                ["git", "rev-parse", f"{commit_sha}:{path}"], cwd=repo_root,
                check=True, capture_output=True, text=True, timeout=5,
            ).stdout.strip()
            object_type = subprocess.run(
                ["git", "cat-file", "-t", object_id], cwd=repo_root,
                check=True, capture_output=True, text=True, timeout=5,
            ).stdout.strip()
            if object_type != expected_type or not SHA_RE.fullmatch(object_id):
                raise DiagnosticUnavailable(f"Invalid current Git object for scope: {path}")
            result[label] = object_id
        return result
    except (OSError, subprocess.SubprocessError) as exc:
        raise DiagnosticUnavailable("Could not read native Git objects from checkout.") from exc


def historical_scope_ids(
    repository: str, commit_sha: str, token: str,
    fetcher: Callable[[str, str], dict[str, Any]] = fetch_json,
) -> dict[str, str]:
    if not SHA_RE.fullmatch(commit_sha):
        raise DiagnosticUnavailable("Historical workflow run has an invalid commit SHA.")
    commit = fetcher(f"{API_ROOT}/repos/{repository}/git/commits/{commit_sha}", token)
    tree = commit.get("tree")
    if not isinstance(tree, dict) or not isinstance(tree.get("sha"), str):
        raise DiagnosticUnavailable("Historical commit response has no tree object.")
    root_tree_sha = tree["sha"]
    if not SHA_RE.fullmatch(root_tree_sha):
        raise DiagnosticUnavailable("Historical commit has an invalid root tree ID.")
    document = fetcher(
        f"{API_ROOT}/repos/{repository}/git/trees/{root_tree_sha}?recursive=1", token
    )
    return extract_scope_ids(document)


def recent_prior_runs(
    repository: str, token: str, current_run_id: str, max_prior_runs: int,
    fetcher: Callable[[str, str], dict[str, Any]] = fetch_json,
) -> list[dict[str, Any]]:
    if not RUN_ID_RE.fullmatch(current_run_id):
        raise DiagnosticUnavailable("Current workflow run ID is invalid.")
    if type(max_prior_runs) is not int or not 1 <= max_prior_runs <= 20:
        raise DiagnosticUnavailable("Historical run limit must be between 1 and 20.")
    url = (
        f"{API_ROOT}/repos/{repository}/actions/workflows/nova-rsi.yml/runs"
        "?per_page=100&branch=main"
    )
    response = fetcher(url, token)
    runs = response.get("workflow_runs")
    if not isinstance(runs, list):
        raise DiagnosticUnavailable("Actions API response has no workflow-run list.")

    eligible: list[dict[str, Any]] = []
    for run in runs:
        if not isinstance(run, dict):
            raise DiagnosticUnavailable("Workflow history contains a malformed run.")
        if str(run.get("id")) == current_run_id:
            continue
        if run.get("head_branch") != "main" or run.get("event") not in (
            "schedule", "workflow_dispatch"
        ):
            continue
        run_id = run.get("id")
        head_sha = run.get("head_sha")
        if not isinstance(run_id, int) or run_id < 1:
            raise DiagnosticUnavailable("Historical workflow run has an invalid ID.")
        if not isinstance(head_sha, str) or not SHA_RE.fullmatch(head_sha):
            raise DiagnosticUnavailable("Historical workflow run has an invalid head SHA.")
        eligible.append({
            "run_id": str(run_id),
            "head_sha": head_sha,
            "created_at": run.get("created_at", ""),
            "conclusion": run.get("conclusion"),
        })

    eligible.sort(key=lambda item: str(item.get("created_at", "")), reverse=True)
    return list(reversed(eligible[:max_prior_runs]))


def analyze_history(records: list[dict[str, Any]]) -> dict[str, Any]:
    if not records:
        raise DiagnosticUnavailable("No current RSI state record was supplied.")
    required_labels = set(STATE_SCOPES)
    for record in records:
        if not isinstance(record, dict) or not isinstance(record.get("state"), dict):
            raise DiagnosticUnavailable("RSI history contains a malformed state record.")
        state = record["state"]
        if set(state) != required_labels:
            raise DiagnosticUnavailable("An RSI state record is missing a required scope.")
        if any(not isinstance(value, str) or not SHA_RE.fullmatch(value) for value in state.values()):
            raise DiagnosticUnavailable("An RSI history record contains an invalid Git object ID.")
        if not isinstance(record.get("run_id"), str) or not record["run_id"]:
            raise DiagnosticUnavailable("An RSI history record has no run identifier.")

    current_index = len(records) - 1
    current = records[current_index]
    prior_index = next(
        (
            index for index in range(current_index - 1, -1, -1)
            if records[index]["state"] == current["state"]
        ),
        None,
    )

    component_repeats = []
    for label in STATE_SCOPES:
        prior_index_for_scope = next(
            (
                index for index in range(current_index - 1, -1, -1)
                if records[index]["state"][label] == current["state"][label]
            ),
            None,
        )
        if prior_index_for_scope is not None:
            prior = records[prior_index_for_scope]
            component_repeats.append({
                "scope": label,
                "object_id": current["state"][label],
                "repeat_of_run_id": prior["run_id"],
                "cycle_length_passes": current_index - prior_index_for_scope,
            })

    exact_repeat = prior_index is not None
    report: dict[str, Any] = {
        "status": "REPEATED_STATE" if exact_repeat else "NO_REPEAT_IN_WINDOW",
        "exact_repeat": exact_repeat,
        "history_window_passes": len(records),
        "current_run_id": current["run_id"],
        "current_head_sha": current.get("head_sha"),
        "current_state": current["state"],
        "component_repeats": component_repeats,
        "records": records,
        "limitations": [
            "No repeat within the bounded window does not prove improvement or rule out older cycles.",
            "Git object identity proves tracked-state identity, not capability quality or benchmark success.",
            "Readiness and promotion policy remain authoritative.",
        ],
    }
    if prior_index is not None:
        prior = records[prior_index]
        report["repeat_of_run_id"] = prior["run_id"]
        report["cycle_length_passes"] = current_index - prior_index
        report["message"] = (
            f"Exact operational state repeated from run {prior['run_id']} after "
            f"{report['cycle_length_passes']} RSI pass(es). This indicates state recurrence, "
            "not whether capability quality improved."
        )
    else:
        report["message"] = (
            "No exact full-state repeat was found in the bounded run window. "
            "This is not evidence that the latest state is an improvement."
        )
    return report


def unavailable_report(reason: str, current_run_id: str | None = None) -> dict[str, Any]:
    return {
        "status": "UNAVAILABLE",
        "exact_repeat": None,
        "current_run_id": current_run_id,
        "message": reason,
        "limitations": [
            "The state comparison is incomplete; do not interpret this as no repeat.",
            "Existing readiness and promotion gates remain unchanged.",
        ],
    }


def collect_report(
    repository: str, token: str, current_sha: str, current_run_id: str,
    repo_root: Path, max_prior_runs: int = 10,
    fetcher: Callable[[str, str], dict[str, Any]] = fetch_json,
) -> dict[str, Any]:
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repository):
        raise DiagnosticUnavailable("Repository identifier is malformed.")
    if not token:
        raise DiagnosticUnavailable("GH_TOKEN is unavailable; history cannot be compared.")
    current_state = current_scope_ids(repo_root, current_sha)
    prior_runs = recent_prior_runs(
        repository, token, current_run_id, max_prior_runs, fetcher
    )
    cache: dict[str, dict[str, str]] = {}
    records: list[dict[str, Any]] = []
    for run in prior_runs:
        sha = run["head_sha"]
        if sha not in cache:
            cache[sha] = historical_scope_ids(repository, sha, token, fetcher)
        records.append({**run, "state": cache[sha]})
    records.append({
        "run_id": current_run_id,
        "head_sha": current_sha,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "conclusion": None,
        "state": current_state,
    })
    report = analyze_history(records)
    report["repository"] = repository
    report["max_prior_runs"] = max_prior_runs
    report["native_state_scopes"] = {
        label: {"path": path, "object_type": kind}
        for label, (path, kind) in STATE_SCOPES.items()
    }
    return report


def render_summary(report: dict[str, Any]) -> str:
    lines = [
        "## NOVA RSI Repeat-State Diagnostic",
        "",
        f"**Result:** {report.get('status', 'UNAVAILABLE')}",
        "",
        str(report.get("message", "No diagnostic message was produced.")),
    ]
    if report.get("status") == "REPEATED_STATE":
        lines.extend([
            "",
            f"- Repeated from run: {report.get('repeat_of_run_id')}",
            f"- Cycle length: **{report.get('cycle_length_passes')} RSI pass(es)**",
        ])
    repeats = report.get("component_repeats")
    if isinstance(repeats, list) and repeats:
        lines.extend(["", "### Scopes unchanged from an earlier pass", "",
                      "| Scope | Previous run | Passes since repeat | Native Git object ID |",
                      "|---|---:|---:|---|"])
        for item in repeats:
            lines.append(
                f"| {item['scope']} | {item['repeat_of_run_id']} | "
                f"{item['cycle_length_passes']} | {item['object_id']} |"
            )
    lines.extend(["", "### Interpretation", ""])
    for limitation in report.get("limitations", []):
        lines.append(f"- {limitation}")
    lines.extend(["", "This diagnostic does not change readiness, candidate eligibility, or promotion permissions."])
    return "\n".join(lines)


def write_outputs(report: dict[str, Any], output_path: str | None) -> None:
    serialized = json.dumps(report, indent=2, sort_keys=True) + "\n"
    print(serialized, end="")
    if output_path:
        destination = Path(output_path)
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(serialized, encoding="utf-8")
    summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary_path:
        with open(summary_path, "a", encoding="utf-8") as summary:
            summary.write(render_summary(report) + "\n")
    output_file = os.environ.get("GITHUB_OUTPUT")
    if output_file:
        with open(output_file, "a", encoding="utf-8") as output:
            output.write(f"status={report.get('status', 'UNAVAILABLE')}\n")
            output.write(f"repeated={'true' if report.get('exact_repeat') is True else 'false'}\n")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", default=".")
    parser.add_argument("--repository", default=os.environ.get("GITHUB_REPOSITORY", ""))
    parser.add_argument("--current-sha", default=os.environ.get("GITHUB_SHA", ""))
    parser.add_argument("--current-run-id", default=os.environ.get("GITHUB_RUN_ID", ""))
    parser.add_argument("--max-prior-runs", type=int, default=10)
    parser.add_argument("--output", default=None)
    args = parser.parse_args(argv)
    try:
        report = collect_report(
            repository=args.repository,
            token=os.environ.get("GH_TOKEN", ""),
            current_sha=args.current_sha,
            current_run_id=args.current_run_id,
            repo_root=Path(args.repo_root),
            max_prior_runs=args.max_prior_runs,
        )
    except (DiagnosticUnavailable, ValueError) as exc:
        report = unavailable_report(str(exc), args.current_run_id or None)
    write_outputs(report, args.output)
    # This read-only diagnostic must never mask the existing readiness gate.
    return 0


if __name__ == "__main__":
    sys.exit(main())
