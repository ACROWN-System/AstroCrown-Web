#!/usr/bin/env python3
"""Fail-closed verification of RSI evidence before privileged candidate retention."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import stat
import subprocess
from pathlib import Path
from typing import Any

from rsi_engine import (
    changed_paths_from_patch,
    implementation_ready,
    load_policy,
    validate_candidate_payload,
    validate_patch_content,
    validate_patch_paths,
    normalize_usage,
)


_REQUIRED_EVIDENCE = {"candidate.patch", "cycle.json", "evaluation.json"}
_ALLOWED_EVIDENCE_FILES = frozenset(_REQUIRED_EVIDENCE)
_SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
_GIT_SHA_RE = re.compile(r"^[0-9a-f]{40}$")
_REQUIRED_EVALUATION_RESULTS = {
    "protected-scope",
    "deletion-protection",
    "filesystem-integrity",
    "secret-leak-detection",
    "git-diff-check",
    "python-compilation",
    "rsi-unit-tests",
    "capability-benchmark",
}


class EvidenceVerificationError(RuntimeError):
    """Raised when an RSI evidence package cannot be trusted for retention."""


def _read_regular_file(path: Path, description: str) -> bytes:
    try:
        mode = path.lstat().st_mode
    except OSError as exc:
        raise EvidenceVerificationError(f"{description} is missing or inaccessible.") from exc
    if not stat.S_ISREG(mode):
        raise EvidenceVerificationError(f"{description} must be a regular, non-symlink file.")
    try:
        return path.read_bytes()
    except OSError as exc:
        raise EvidenceVerificationError(f"{description} could not be read.") from exc


def _read_json(path: Path, description: str) -> dict[str, Any]:
    try:
        payload = json.loads(_read_regular_file(path, description).decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise EvidenceVerificationError(f"{description} is not valid UTF-8 JSON.") from exc
    if not isinstance(payload, dict):
        raise EvidenceVerificationError(f"{description} must contain a JSON object.")
    return payload


def _verify_manifest(evidence_dir: Path) -> dict[str, str]:
    if evidence_dir.is_symlink() or not evidence_dir.is_dir():
        raise EvidenceVerificationError("Evidence directory is missing or is a symlink.")

    manifest = _read_json(evidence_dir / "manifest.json", "Evidence manifest")
    if manifest.get("schema_version") != 1:
        raise EvidenceVerificationError("Evidence manifest schema version is unsupported.")
    hashes = manifest.get("evidence_sha256")
    if not isinstance(hashes, dict):
        raise EvidenceVerificationError("Evidence manifest has no valid SHA-256 map.")

    expected: dict[str, str] = {}
    for name, digest in hashes.items():
        if (
            not isinstance(name, str)
            or not name
            or Path(name).name != name
            or name in {".", "..", "manifest.json"}
            or "/" in name
            or "\\" in name
            or not isinstance(digest, str)
            or not _SHA256_RE.fullmatch(digest)
        ):
            raise EvidenceVerificationError("Evidence manifest contains an unsafe entry.")
        expected[name] = digest

    if set(expected) != _ALLOWED_EVIDENCE_FILES:
        raise EvidenceVerificationError("Evidence manifest file inventory is not the exact approved set.")

    actual: set[str] = set()
    for entry in evidence_dir.iterdir():
        if entry.name == "manifest.json":
            continue
        try:
            mode = entry.lstat().st_mode
        except OSError as exc:
            raise EvidenceVerificationError("Evidence inventory could not be inspected.") from exc
        if not stat.S_ISREG(mode):
            raise EvidenceVerificationError("Evidence inventory contains a non-regular file.")
        actual.add(entry.name)

    if actual != set(expected):
        raise EvidenceVerificationError("Evidence manifest does not match the complete file inventory.")

    for name, digest in expected.items():
        actual_digest = hashlib.sha256(
            _read_regular_file(evidence_dir / name, f"Evidence file {name}")
        ).hexdigest()
        if actual_digest != digest:
            raise EvidenceVerificationError(f"Evidence hash mismatch for {name}.")

    return expected


def verify_evidence(
    evidence_dir: Path,
    repo_root: Path,
    *,
    expected_baseline: str | None = None,
    policy: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Verify package integrity, gate decisions, budgets, and candidate scope."""
    repo_root = repo_root.resolve()
    if not evidence_dir.is_absolute():
        evidence_dir = repo_root / evidence_dir
    if evidence_dir.is_symlink():
        raise EvidenceVerificationError("Evidence directory must not be a symlink.")
    evidence_dir = evidence_dir.resolve()
    if evidence_dir == repo_root or repo_root not in evidence_dir.parents:
        raise EvidenceVerificationError("Evidence directory must be a distinct subdirectory of the repository.")
    file_hashes = _verify_manifest(evidence_dir)

    trusted_policy = policy if policy is not None else load_policy(repo_root)
    if not isinstance(trusted_policy, dict) or not implementation_ready(trusted_policy):
        raise EvidenceVerificationError("Trusted RSI policy is not READY; candidate retention is blocked.")

    cycle = _read_json(evidence_dir / "cycle.json", "RSI cycle evidence")
    evaluation = _read_json(evidence_dir / "evaluation.json", "Protected evaluator evidence")
    if cycle.get("decision") != "PASS":
        raise EvidenceVerificationError("RSI cycle evidence does not record PASS.")
    result = cycle.get("result")
    if not isinstance(result, dict) or result.get("decision") != "PASS":
        raise EvidenceVerificationError("RSI cycle result does not record PASS.")
    if evaluation.get("decision") != "PASS":
        raise EvidenceVerificationError("Protected evaluator evidence does not record PASS.")

    baseline = cycle.get("baseline_commit")
    candidate_commit = result.get("candidate_commit")
    if not isinstance(expected_baseline, str) or not _GIT_SHA_RE.fullmatch(expected_baseline):
        raise EvidenceVerificationError("Trusted expected baseline must be supplied as a full Git commit SHA.")
    if not isinstance(baseline, str) or not _GIT_SHA_RE.fullmatch(baseline):
        raise EvidenceVerificationError("RSI baseline is not a full Git commit SHA.")
    if baseline != expected_baseline:
        raise EvidenceVerificationError("Cycle baseline does not match the trusted workflow baseline.")
    if evaluation.get("baseline_commit") != baseline:
        raise EvidenceVerificationError("Evaluator baseline does not match cycle baseline.")
    if not isinstance(candidate_commit, str) or not _GIT_SHA_RE.fullmatch(candidate_commit):
        raise EvidenceVerificationError("Candidate commit is not a full Git commit SHA.")

    candidate = cycle.get("candidate")
    if not isinstance(candidate, dict):
        raise EvidenceVerificationError("RSI cycle evidence has no candidate object.")
    evaluated_candidate = result.get("candidate")
    if not isinstance(evaluated_candidate, dict) or evaluated_candidate != candidate:
        raise EvidenceVerificationError("The evaluated candidate object does not match the retained candidate object.")
    evaluator_exit_code = result.get("evaluator_exit_code")
    if isinstance(evaluator_exit_code, bool) or evaluator_exit_code != 0:
        raise EvidenceVerificationError("The protected evaluator process did not exit successfully.")
    if candidate.get("baseline_commit") != baseline:
        raise EvidenceVerificationError("Candidate baseline does not match the cycle baseline.")
    payload_errors = validate_candidate_payload(candidate, baseline, trusted_policy)
    if payload_errors:
        raise EvidenceVerificationError("Candidate payload failed protected validation.")

    try:
        patch_text = _read_regular_file(evidence_dir / "candidate.patch", "Candidate patch").decode("utf-8")
    except UnicodeDecodeError as exc:
        raise EvidenceVerificationError("Candidate patch must be UTF-8 text.") from exc
    candidate_patch = candidate.get("patch")
    if not isinstance(candidate_patch, str) or patch_text.rstrip("\n") != candidate_patch.rstrip("\n"):
        raise EvidenceVerificationError("Standalone patch does not match the candidate recorded in cycle evidence.")

    paths = changed_paths_from_patch(patch_text)
    if not paths:
        raise EvidenceVerificationError("Candidate patch contains no verifiable changed paths.")
    if validate_patch_paths(paths, trusted_policy):
        raise EvidenceVerificationError("Candidate patch failed protected path validation.")
    if validate_patch_content(patch_text):
        raise EvidenceVerificationError("Candidate patch failed protected content validation.")

    evaluator_paths = evaluation.get("changed_files")
    if (
        not isinstance(evaluator_paths, list)
        or any(not isinstance(path, str) for path in evaluator_paths)
        or sorted(set(evaluator_paths)) != sorted(set(paths))
    ):
        raise EvidenceVerificationError("Evaluator changed-file set does not match the candidate patch.")

    results = evaluation.get("results")
    if not isinstance(results, list):
        raise EvidenceVerificationError("Evaluator evidence has no result list.")
    result_names: list[str] = []
    for item in results:
        if not isinstance(item, dict) or item.get("status") != "PASS" or not isinstance(item.get("name"), str):
            raise EvidenceVerificationError("Evaluator evidence contains a non-PASS or malformed result.")
        result_names.append(item["name"])
    if set(result_names) != _REQUIRED_EVALUATION_RESULTS or len(result_names) != len(_REQUIRED_EVALUATION_RESULTS):
        raise EvidenceVerificationError("Evaluator evidence omits, duplicates, or adds an unrecognized required check.")

    usage = cycle.get("proposer_usage")
    normalized_usage = normalize_usage(usage)
    if cycle.get("proposer_usage_verified") is not True or normalized_usage is None or usage != normalized_usage:
        raise EvidenceVerificationError("Provider token-usage telemetry is not verified.")
    max_tokens = trusted_policy.get("budget", {}).get("max_total_tokens_per_cycle")
    if isinstance(max_tokens, bool) or not isinstance(max_tokens, int) or normalized_usage["total_tokens"] > max_tokens:
        raise EvidenceVerificationError("Provider token-usage telemetry exceeds or invalidates the protected budget.")

    budget = cycle.get("budget")
    if not isinstance(budget, dict):
        raise EvidenceVerificationError("Cycle budget accounting is missing.")
    for used_key, max_key in (
        ("proposer_calls_used", "max_proposer_calls_per_cycle"),
        ("candidate_attempts_used", "max_candidate_attempts_per_cycle"),
    ):
        used = budget.get(used_key)
        limit = trusted_policy.get("budget", {}).get(max_key)
        if (
            isinstance(used, bool)
            or not isinstance(used, int)
            or used < 0
            or isinstance(limit, bool)
            or not isinstance(limit, int)
            or used > limit
        ):
            raise EvidenceVerificationError(f"Cycle budget accounting failed for {used_key}.")
    if budget.get("proposer_calls_used") != 1 or budget.get("candidate_attempts_used") != 1:
        raise EvidenceVerificationError("A passing candidate must account for exactly one proposer call and one candidate attempt.")

    return {
        "status": "PASS",
        "baseline_commit": baseline,
        "candidate_commit": candidate_commit,
        "verified_evidence_files": len(file_hashes),
        "candidate_changed_paths": paths,
        "candidate_patch_sha256": file_hashes["candidate.patch"],
        "checks": [
            "manifest and exact evidence inventory verified",
            "cycle and protected evaluator decisions both PASS",
            "candidate payload and patch integrity verified",
            "protected candidate scope/content verified",
            "evaluator changed-file set matches patch",
            "required evaluator checks all PASS",
            "provider usage telemetry and cycle budgets verified",
        ],
    }


def verify_applied_worktree(
    repo_root: Path,
    expected_paths: list[str],
    policy: dict[str, Any],
    *,
    ignored_paths: tuple[str, ...] = (),
) -> dict[str, Any]:
    """Revalidate the actual worktree after git apply, before staging or commit."""
    result = subprocess.run(
        ["git", "status", "--porcelain=v1", "-z", "--untracked-files=all"],
        cwd=repo_root,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if result.returncode != 0:
        raise EvidenceVerificationError("Could not inspect the applied candidate worktree.")

    actual_paths: set[str] = set()
    statuses: list[tuple[str, str]] = []
    for record in result.stdout.split(b"\0"):
        if not record:
            continue
        if len(record) < 4 or record[2:3] != b" ":
            raise EvidenceVerificationError("Git returned an unrecognized worktree status record.")
        try:
            status_code = record[:2].decode("ascii")
            relative = record[3:].decode("utf-8")
        except UnicodeDecodeError as exc:
            raise EvidenceVerificationError("Candidate worktree contains a non-UTF-8 path.") from exc
        if "R" in status_code or "C" in status_code or "U" in status_code:
            raise EvidenceVerificationError("Candidate worktree contains a rename, copy, or unmerged path.")
        if any(relative == ignored or relative.startswith(ignored.rstrip("/") + "/") for ignored in ignored_paths):
            continue
        actual_paths.add(relative)
        statuses.append((status_code, relative))

    expected = set(expected_paths)
    if actual_paths != expected:
        raise EvidenceVerificationError("Applied worktree path set differs from the verified candidate patch.")
    path_errors = validate_patch_paths(sorted(actual_paths), policy)
    if path_errors:
        raise EvidenceVerificationError("Applied worktree contains protected or out-of-scope paths.")

    for status_code, relative in statuses:
        if "D" in status_code:
            raise EvidenceVerificationError("Candidate worktree contains a deletion.")
        path = repo_root / relative
        try:
            mode = path.lstat().st_mode
        except OSError as exc:
            raise EvidenceVerificationError("A changed candidate path is missing.") from exc
        if not stat.S_ISREG(mode):
            raise EvidenceVerificationError("Candidate worktree contains a symlink or non-regular file.")
        if mode & (stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH):
            raise EvidenceVerificationError("Candidate retention does not permit executable file modes.")

    return {"status": "PASS", "verified_changed_paths": sorted(actual_paths)}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", default=".")
    parser.add_argument("--evidence-dir", default=".rsi-evidence")
    parser.add_argument("--expected-baseline", required=True)
    parser.add_argument("--check-applied", action="store_true")
    args = parser.parse_args()
    repo_root = Path(args.repo).resolve()
    evidence_dir = Path(args.evidence_dir)
    if not evidence_dir.is_absolute():
        evidence_dir = repo_root / evidence_dir
    try:
        result = verify_evidence(
            evidence_dir,
            repo_root,
            expected_baseline=args.expected_baseline,
        )
        if args.check_applied:
            try:
                evidence_relative = evidence_dir.relative_to(repo_root).as_posix()
            except ValueError as exc:
                raise EvidenceVerificationError("Evidence directory must be inside the repository.") from exc
            result["applied_worktree"] = verify_applied_worktree(
                repo_root,
                result["candidate_changed_paths"],
                load_policy(repo_root),
                ignored_paths=(evidence_relative,),
            )
        print(json.dumps(result, indent=2, sort_keys=True))
        return 0
    except (EvidenceVerificationError, OSError, json.JSONDecodeError) as exc:
        print(json.dumps({"status": "BLOCKED", "reason": str(exc)}, sort_keys=True))
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
