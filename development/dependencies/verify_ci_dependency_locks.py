#!/usr/bin/env python3
"""Verify the exact source pin and SHA-256 wheel lock for pip-audit only."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "development/dependencies/requirements-pip-audit.txt"
LOCK = ROOT / "development/dependencies/requirements-pip-audit-py312-ubuntu24-x86_64.lock"
SOURCE_PATTERN = re.compile(r"^([A-Za-z0-9._-]+)==([^<>=!~;\\s]+)$")
LOCK_PATTERN = re.compile(r"^([A-Za-z0-9._-]+)==([^\\s]+) --hash=sha256:([0-9a-f]{64})$")


def canonicalize(name: str) -> str:
    return re.sub(r"[-_.]+", "-", name).lower()


def parse_source() -> dict[str, str]:
    pins = {}
    for line_number, raw in enumerate(SOURCE.read_text(encoding="utf-8").splitlines(), 1):
        line = raw.split("#", 1)[0].strip()
        if not line:
            continue
        match = SOURCE_PATTERN.fullmatch(line)
        if not match:
            raise SystemExit(f"{SOURCE}:{line_number}: expected exact package==version pin")
        name, version = match.groups()
        key = canonicalize(name)
        if key in pins:
            raise SystemExit(f"{SOURCE}:{line_number}: duplicate package {key}")
        pins[key] = version
    return pins


def parse_lock() -> dict[str, str]:
    text = LOCK.read_text(encoding="utf-8")
    if "Target: CPython 3.12, Ubuntu 24.04, x86_64; wheels only." not in text:
        raise SystemExit(f"{LOCK}: missing platform declaration")
    pins = {}
    for line_number, raw in enumerate(text.splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        match = LOCK_PATTERN.fullmatch(line)
        if not match:
            raise SystemExit(f"{LOCK}:{line_number}: lock entry lacks valid SHA-256")
        name, version, _digest = match.groups()
        key = canonicalize(name)
        if key in pins:
            raise SystemExit(f"{LOCK}:{line_number}: duplicate package {key}")
        pins[key] = version
    if not pins:
        raise SystemExit(f"{LOCK}: no package hashes found")
    return pins


def main() -> int:
    if len(sys.argv) > 1 and sys.argv[1] not in {"audit", "all"}:
        raise SystemExit("Usage: verify_ci_dependency_locks.py [audit|all]")
    source, locked = parse_source(), parse_lock()
    if source != locked:
        missing = sorted(set(source) - set(locked))
        extra = sorted(set(locked) - set(source))
        changed = sorted(
            f"{key}: source={source[key]} lock={locked[key]}"
            for key in set(source) & set(locked) if source[key] != locked[key]
        )
        raise SystemExit(f"Audit-tool lock drift: missing={missing}; extra={extra}; versions={changed}")
    print(f"Audit-tool lock verified: {len(locked)} exact pins, all with SHA-256 hashes.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
