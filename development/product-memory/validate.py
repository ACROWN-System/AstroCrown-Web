#!/usr/bin/env python3
"""Deterministic integrity validator for the AstroCrown Product Development Memory.

Uses only the Python standard library. Structural PASS does not assert that a
product claim is true; substantive evidence and owner approval remain separate.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
from datetime import date
from pathlib import Path
from urllib.parse import urlparse


REGISTER_FILES = {
    "capabilities": ("capabilities.json", "CAP"),
    "decisions": ("decisions.json", "DEC"),
    "research": ("research.json", "SRC"),
    "roadmap": ("roadmap.json", "RM"),
}

CAPABILITY_STATUSES = {
    "approved", "in_progress", "candidate", "research_required",
    "deferred", "blocked", "rejected", "superseded", "completed",
}
DECISION_STATUSES = {"accepted", "proposed", "rejected", "deferred", "superseded"}
RESEARCH_STATUSES = {
    "observed", "partial", "candidate", "conflicting",
    "stale", "superseded", "not_applicable",
}
ROADMAP_STATUSES = {
    "not_started", "in_progress", "blocked", "completed",
    "deferred", "candidate", "research_required",
}
EVIDENCE_KINDS = {"owner_direction", "repository_record", "external_research"}

FIELDS = {
    "capabilities": {
        "id", "title", "status", "created_at", "updated_at", "service_pillar",
        "problem", "user_benefit", "distinctive_value", "stage", "repeat_use",
        "distribution_mechanism", "dependencies", "evidence", "risks",
        "acceptance_criteria", "decision_ref", "uniqueness_claim", "notes",
    },
    "decisions": {
        "id", "title", "status", "created_at", "updated_at", "context",
        "decision", "rationale", "alternatives", "consequences", "if_modified",
        "if_not_modified", "capability_refs", "research_refs", "evidence",
        "verification", "owner_approval", "supersedes", "notes",
    },
    "research": {
        "id", "title", "status", "created_at", "updated_at", "publisher",
        "source_type", "source_url", "accessed_on", "claim_supported",
        "observations", "limitations", "supports_capabilities",
        "supports_decisions", "independent_verification", "license_note",
    },
    "roadmap": {
        "id", "title", "status", "created_at", "updated_at", "priority",
        "objective", "capability_refs", "decision_refs", "depends_on",
        "entry_gates", "exit_criteria", "blockers", "evidence", "notes",
    },
}

SOURCE_TYPES = {
    "official_product_documentation", "official_technical_documentation",
    "technical_specification", "competitor_product", "industry_research",
    "independent_evaluation", "official_policy",
}
PRIORITIES = {"launch_critical", "next", "exploratory"}


class RegisterError(ValueError):
    """Raised when a register contains duplicate JSON keys or malformed JSON."""


def _reject_duplicate_keys(pairs: list[tuple[str, object]]) -> dict[str, object]:
    result: dict[str, object] = {}
    for key, value in pairs:
        if key in result:
            raise RegisterError(f"duplicate JSON object key: {key!r}")
        result[key] = value
    return result


def _load_json(path: Path) -> object:
    try:
        return json.loads(
            path.read_text(encoding="utf-8"),
            object_pairs_hook=_reject_duplicate_keys,
        )
    except (OSError, json.JSONDecodeError, RegisterError) as exc:
        raise RegisterError(f"{path.name}: {exc}") from exc


def _normal_title(value: str) -> str:
    normalized = unicodedata.normalize("NFKC", value).casefold()
    return " ".join(re.sub(r"[^\w]+", " ", normalized, flags=re.UNICODE).split())


def _add(errors: list[str], where: str, message: str) -> None:
    errors.append(f"{where}: {message}")


def _string(
    record: dict[str, object], key: str, where: str, errors: list[str],
    *, nonempty: bool = True,
) -> str | None:
    value = record.get(key)
    if not isinstance(value, str) or (nonempty and not value.strip()):
        _add(errors, where, f"{key} must be a {'non-empty ' if nonempty else ''}string")
        return None
    return value


def _string_list(
    record: dict[str, object], key: str, where: str, errors: list[str],
    *, nonempty_list: bool = False, unique: bool = True,
) -> list[str]:
    value = record.get(key)
    if not isinstance(value, list) or (nonempty_list and not value):
        _add(errors, where, f"{key} must be a {'non-empty ' if nonempty_list else ''}list")
        return []
    if any(not isinstance(item, str) or not item.strip() for item in value):
        _add(errors, where, f"{key} items must be non-empty strings")
        return []
    if unique and len(value) != len(set(value)):
        _add(errors, where, f"{key} contains duplicate values")
    return value


def _valid_date(value: object) -> bool:
    if not isinstance(value, str):
        return False
    try:
        return date.fromisoformat(value).isoformat() == value
    except ValueError:
        return False


def _check_common(
    register: str,
    entries: list[object],
    prefix: str,
    errors: list[str],
) -> None:
    seen_ids: set[str] = set()
    seen_titles: set[str] = set()
    expected = FIELDS[register]
    for index, raw in enumerate(entries):
        where = f"{register}[{index}]"
        if not isinstance(raw, dict):
            _add(errors, where, "entry must be a JSON object")
            continue

        keys = set(raw)
        missing = expected - keys
        unknown = keys - expected
        if missing:
            _add(errors, where, f"missing fields: {', '.join(sorted(missing))}")
        if unknown:
            _add(errors, where, f"unknown fields (possible garbage): {', '.join(sorted(unknown))}")

        identifier = raw.get("id")
        if not isinstance(identifier, str) or not re.fullmatch(rf"{prefix}-\d{4}", identifier):
            _add(errors, where, f"id must match {prefix}-NNNN")
        elif identifier in seen_ids:
            _add(errors, where, f"duplicate identifier {identifier}")
        else:
            seen_ids.add(identifier)

        title = raw.get("title")
        if not isinstance(title, str) or not title.strip():
            _add(errors, where, "title must be a non-empty string")
        else:
            normalized = _normal_title(title)
            if normalized in seen_titles:
                _add(errors, where, f"duplicate normalized title {title!r}")
            seen_titles.add(normalized)

        for field in ("created_at", "updated_at"):
            if not _valid_date(raw.get(field)):
                _add(errors, where, f"{field} must be an ISO YYYY-MM-DD date")

        if _valid_date(raw.get("created_at")) and _valid_date(raw.get("updated_at")):
            if raw["updated_at"] < raw["created_at"]:
                _add(errors, where, "updated_at cannot precede created_at")


def _validate_evidence(
    entries: object, where: str, source_ids: set[str], errors: list[str]
) -> set[str]:
    used_sources: set[str] = set()
    if not isinstance(entries, list):
        _add(errors, where, "evidence must be a list")
        return used_sources
    for index, evidence in enumerate(entries):
        location = f"{where}.evidence[{index}]"
        if not isinstance(evidence, dict):
            _add(errors, location, "evidence item must be an object")
            continue
        if set(evidence) != {"kind", "reference"}:
            missing = {"kind", "reference"} - set(evidence)
            unknown = set(evidence) - {"kind", "reference"}
            if missing:
                _add(errors, location, f"missing fields: {', '.join(sorted(missing))}")
            if unknown:
                _add(errors, location, f"unknown fields: {', '.join(sorted(unknown))}")
        kind = evidence.get("kind")
        reference = evidence.get("reference")
        if kind not in EVIDENCE_KINDS:
            _add(errors, location, "kind must be owner_direction, repository_record or external_research")
        if not isinstance(reference, str) or not reference.strip():
            _add(errors, location, "reference must be a non-empty string")
            continue
        if kind == "external_research":
            if not re.fullmatch(r"SRC-\d{4}", reference):
                _add(errors, location, "external_research reference must be an SRC-NNNN id")
            elif reference not in source_ids:
                _add(errors, location, f"unresolved research reference {reference}")
            else:
                used_sources.add(reference)
    return used_sources


def _check_dag(
    nodes: set[str], edges: dict[str, list[str]], label: str, errors: list[str]
) -> None:
    visiting: set[str] = set()
    visited: set[str] = set()

    def visit(node: str, trail: list[str]) -> None:
        if node in visited:
            return
        if node in visiting:
            cycle = trail[trail.index(node):] + [node] if node in trail else trail + [node]
            _add(errors, label, "cycle detected: " + " -> ".join(cycle))
            return
        visiting.add(node)
        trail.append(node)
        for dependency in edges.get(node, []):
            if dependency in nodes:
                visit(dependency, trail)
        trail.pop()
        visiting.remove(node)
        visited.add(node)

    for node in sorted(nodes):
        visit(node, [])


def validate_directory(root: Path) -> list[str]:
    errors: list[str] = []
    registers: dict[str, list[dict[str, object]]] = {}

    for register, (filename, prefix) in REGISTER_FILES.items():
        path = root / filename
        if not path.is_file():
            _add(errors, str(path), "required register file is missing")
            continue
        try:
            document = _load_json(path)
        except RegisterError as exc:
            _add(errors, str(path), str(exc))
            continue
        if not isinstance(document, dict):
            _add(errors, filename, "register document must be an object")
            continue
        if set(document) != {"schema_version", "register", "entries"}:
            _add(errors, filename, "top-level fields must be exactly schema_version, register, entries")
        if document.get("schema_version") != 1:
            _add(errors, filename, "schema_version must equal 1")
        if document.get("register") != register:
            _add(errors, filename, f"register must equal {register!r}")
        entries = document.get("entries")
        if not isinstance(entries, list) or not entries:
            _add(errors, filename, "entries must be a non-empty list")
            continue
        registers[register] = [entry for entry in entries if isinstance(entry, dict)]
        _check_common(register, entries, prefix, errors)

    if set(registers) != set(REGISTER_FILES):
        return errors

    caps = registers["capabilities"]
    decisions = registers["decisions"]
    research = registers["research"]
    roadmap = registers["roadmap"]

    cap_ids = {r.get("id") for r in caps if isinstance(r.get("id"), str)}
    decision_ids = {r.get("id") for r in decisions if isinstance(r.get("id"), str)}
    source_ids = {r.get("id") for r in research if isinstance(r.get("id"), str)}
    roadmap_ids = {r.get("id") for r in roadmap if isinstance(r.get("id"), str)}

    all_ids: set[str] = set()
    for register, entries in registers.items():
        for record in entries:
            identifier = record.get("id")
            if isinstance(identifier, str):
                if identifier in all_ids:
                    _add(errors, register, f"identifier {identifier} is duplicated across registers")
                all_ids.add(identifier)

    cap_dependency_edges: dict[str, list[str]] = {}
    cap_roadmap_refs: set[str] = set()
    cap_decision_refs: set[str] = set()
    used_sources: set[str] = set()
    used_decisions: set[str] = set()

    for index, cap in enumerate(caps):
        where = f"capabilities[{index}]"
        for field in (
            "service_pillar", "problem", "user_benefit", "distinctive_value",
            "stage", "repeat_use", "distribution_mechanism", "notes",
        ):
            _string(cap, field, where, errors)
        for field in ("risks", "acceptance_criteria", "dependencies"):
            _string_list(cap, field, where, errors,
                         nonempty_list=field in {"risks", "acceptance_criteria"})
        deps = cap.get("dependencies", [])
        if not isinstance(deps, list):
            deps = []
        cap_dependency_edges[str(cap.get("id"))] = deps
        for dependency in deps:
            if dependency not in cap_ids:
                _add(errors, where, f"unknown capability dependency {dependency}")
        decision_ref = cap.get("decision_ref")
        if decision_ref is not None:
            if decision_ref not in decision_ids:
                _add(errors, where, f"unresolved decision_ref {decision_ref}")
            else:
                cap_decision_refs.add(decision_ref)
        status = cap.get("status")
        if status not in CAPABILITY_STATUSES:
            _add(errors, where, f"unsupported capability status {status!r}")
        if status in {"approved", "completed"}:
            if not decision_ref:
                _add(errors, where, f"{status} capability requires an accepted decision_ref")
            if not cap.get("evidence"):
                _add(errors, where, f"{status} capability requires evidence")
        if cap.get("uniqueness_claim") not in {"not_claimed", "unverified", "verified"}:
            _add(errors, where, "uniqueness_claim must be not_claimed, unverified or verified")
        used_sources |= _validate_evidence(cap.get("evidence"), where, source_ids, errors)

    _check_dag(cap_ids, cap_dependency_edges, "capability dependencies", errors)

    decision_edges: dict[str, list[str]] = {}
    for index, decision in enumerate(decisions):
        where = f"decisions[{index}]"
        for field in (
            "context", "decision", "rationale", "if_modified", "if_not_modified", "notes",
        ):
            _string(decision, field, where, errors)
        for field in ("alternatives", "consequences", "capability_refs", "research_refs", "verification", "supersedes"):
            _string_list(decision, field, where, errors,
                         nonempty_list=field in {"alternatives", "consequences", "verification"})
        for ref in decision.get("capability_refs", []):
            if ref not in cap_ids:
                _add(errors, where, f"unresolved capability reference {ref}")
        for ref in decision.get("research_refs", []):
            if ref not in source_ids:
                _add(errors, where, f"unresolved research reference {ref}")
            else:
                used_sources.add(ref)
        supersedes = decision.get("supersedes", [])
        decision_edges[str(decision.get("id"))] = supersedes if isinstance(supersedes, list) else []
        for ref in decision_edges[str(decision.get("id"))]:
            if ref not in decision_ids:
                _add(errors, where, f"unresolved superseded decision {ref}")
        approval = decision.get("owner_approval")
        if not isinstance(approval, dict) or set(approval) != {"approved", "recorded_on", "basis"}:
            _add(errors, where, "owner_approval must contain exactly approved, recorded_on and basis")
        else:
            if not isinstance(approval.get("approved"), bool):
                _add(errors, where, "owner_approval.approved must be boolean")
            if not _valid_date(approval.get("recorded_on")):
                _add(errors, where, "owner_approval.recorded_on must be ISO YYYY-MM-DD")
            if not isinstance(approval.get("basis"), str) or not approval.get("basis", "").strip():
                _add(errors, where, "owner_approval.basis must be non-empty")
        status = decision.get("status")
        if status not in DECISION_STATUSES:
            _add(errors, where, f"unsupported decision status {status!r}")
        if status == "accepted":
            if not isinstance(approval, dict) or approval.get("approved") is not True:
                _add(errors, where, "accepted decision requires explicit owner approval")
            if not decision.get("evidence"):
                _add(errors, where, "accepted decision requires evidence")
        if isinstance(approval, dict) and approval.get("approved") is True and status != "accepted":
            _add(errors, where, "owner-approved decision must use status 'accepted'")
        used_sources |= _validate_evidence(decision.get("evidence"), where, source_ids, errors)

    _check_dag(decision_ids, decision_edges, "decision supersession", errors)

    for index, source in enumerate(research):
        where = f"research[{index}]"
        for field in ("publisher", "source_type", "source_url", "accessed_on", "claim_supported", "license_note"):
            _string(source, field, where, errors)
        for field in ("observations", "limitations", "supports_capabilities", "supports_decisions"):
            _string_list(source, field, where, errors,
                         nonempty_list=field in {"observations", "limitations", "supports_capabilities"})
        if source.get("status") not in RESEARCH_STATUSES:
            _add(errors, where, f"unsupported research status {source.get('status')!r}")
        if source.get("source_type") not in SOURCE_TYPES:
            _add(errors, where, f"unsupported source_type {source.get('source_type')!r}")
        if not _valid_date(source.get("accessed_on")):
            _add(errors, where, "accessed_on must be ISO YYYY-MM-DD")
        parsed = urlparse(str(source.get("source_url", "")))
        if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
            _add(errors, where, "source_url must be a valid HTTPS URL without embedded credentials")
        if not isinstance(source.get("independent_verification"), bool):
            _add(errors, where, "independent_verification must be boolean")
        for ref in source.get("supports_capabilities", []):
            if ref not in cap_ids:
                _add(errors, where, f"unresolved supported capability {ref}")
        for ref in source.get("supports_decisions", []):
            if ref not in decision_ids:
                _add(errors, where, f"unresolved supported decision {ref}")

    for index, item in enumerate(roadmap):
        where = f"roadmap[{index}]"
        for field in ("objective", "notes"):
            _string(item, field, where, errors)
        for field in ("capability_refs", "decision_refs", "depends_on", "entry_gates", "exit_criteria", "blockers"):
            _string_list(item, field, where, errors,
                         nonempty_list=field in {"capability_refs", "entry_gates", "exit_criteria"})
        status = item.get("status")
        if status not in ROADMAP_STATUSES:
            _add(errors, where, f"unsupported roadmap status {status!r}")
        if item.get("priority") not in PRIORITIES:
            _add(errors, where, f"unsupported priority {item.get('priority')!r}")
        for ref in item.get("capability_refs", []):
            if ref not in cap_ids:
                _add(errors, where, f"unresolved capability reference {ref}")
            else:
                cap_roadmap_refs.add(ref)
        for ref in item.get("decision_refs", []):
            if ref not in decision_ids:
                _add(errors, where, f"unresolved decision reference {ref}")
            else:
                used_decisions.add(ref)
        for ref in item.get("depends_on", []):
            if ref not in roadmap_ids:
                _add(errors, where, f"unresolved roadmap dependency {ref}")
        if status == "completed" and not item.get("evidence"):
            _add(errors, where, "completed roadmap item requires evidence")
        used_sources |= _validate_evidence(item.get("evidence"), where, source_ids, errors)

    roadmap_edges: dict[str, list[str]] = {}
    for item in roadmap:
        deps = item.get("depends_on", [])
        roadmap_edges[str(item.get("id"))] = deps if isinstance(deps, list) else []
    _check_dag(roadmap_ids, roadmap_edges, "roadmap dependencies", errors)

    for cap_id in sorted(cap_ids - cap_roadmap_refs):
        _add(errors, "capabilities", f"{cap_id} is not connected to any roadmap item")
    for decision_id in sorted(decision_ids - cap_decision_refs - used_decisions):
        if not any(decision_id in refs for refs in decision_edges.values()):
            _add(errors, "decisions", f"{decision_id} is not connected to any capability or roadmap item")
    for source_id in sorted(source_ids - used_sources):
        _add(errors, "research", f"{source_id} is an orphan source not cited by another record")

    return errors


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--directory",
        type=Path,
        default=Path(__file__).resolve().parent,
        help="directory containing the four JSON registers (default: this script's directory)",
    )
    args = parser.parse_args(argv)
    errors = validate_directory(args.directory)
    if errors:
        print("Product memory validation FAIL")
        for error in errors:
            print(f"- {error}")
        return 1

    counts = []
    for register, (filename, _prefix) in REGISTER_FILES.items():
        document = _load_json(args.directory / filename)
        counts.append(f"{len(document['entries'])} {register}")
    print("Product memory validation PASS: " + ", ".join(counts) + "; references and dependency graphs are consistent.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
