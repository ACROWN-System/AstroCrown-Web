#!/usr/bin/env python3
"""Verify that CI hash-lock package/version pins exactly match source pins.

The SHA-256 artifact checks themselves are enforced by pip's --require-hashes.
This standard-library-only check prevents the human-maintained version lists and
platform-specific hash locks from drifting apart.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
AUTH_REQUIREMENTS = ROOT / "development/auth-prototype/requirements.txt"
ACCOUNT_REQUIREMENTS = ROOT / "development/account-continuity/prototype/requirements.txt"
WALLET_LOCK = ROOT / "development/dependencies/requirements-wallet-auth-py312-ubuntu24-x86_64.lock"
ACCOUNT_LOCK = ROOT / "development/dependencies/requirements-account-continuity-py312-ubuntu24-x86_64.lock"

SOURCE_PATTERN = re.compile(r"^([A-Za-z0-9._-]+)==([^<>=!~;\s]+)$")
LOCK_PATTERN = re.compile(r"^([A-Za-z0-9._-]+)==([^\s]+) --hash=sha256:([0-9a-f]{64})$")


def canonicalize(name: str) -> str:
    return re.sub(r"[-_.]+", "-", name).lower()


def parse_source(paths: tuple[Path, ...]) -> dict[str, str]:
    pins: dict[str, str] = {}
    for path in paths:
        for line_number, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            line = raw.split("#", 1)[0].strip()
            if not line:
                continue
            match = SOURCE_PATTERN.fullmatch(line)
            if not match:
                raise SystemExit(f"{path}:{line_number}: expected an exact package==version pin: {line}")
            name, version = match.groups()
            key = canonicalize(name)
            if key in pins and pins[key] != version:
                raise SystemExit(f"Conflicting source pins for {key}: {pins[key]} and {version}")
            pins[key] = version
    return pins


def parse_lock(path: Path) -> dict[str, str]:
    text = path.read_text(encoding="utf-8")
    required_comments = (
        "Target: CPython 3.12, Ubuntu 24.04, x86_64; wheels only.",
        "Re-generate and review hashes before changing platform or Python ABI.",
    )
    for expected in required_comments:
        if expected not in text:
            raise SystemExit(f"{path}: missing target-scope declaration: {expected}")
    pins: dict[str, str] = {}
    for line_number, raw in enumerate(text.splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        match = LOCK_PATTERN.fullmatch(line)
        if not match:
            raise SystemExit(f"{path}:{line_number}: lock entry lacks a valid SHA-256 hash: {line}")
        name, version, digest = match.groups()
        if len(digest) != 64:
            raise SystemExit(f"{path}:{line_number}: invalid SHA-256 length")
        key = canonicalize(name)
        if key in pins:
            raise SystemExit(f"{path}:{line_number}: duplicate lock entry for {key}")
        pins[key] = version
    return pins


def verify(label: str, source_paths: tuple[Path, ...], lock_path: Path) -> None:
    source = parse_source(source_paths)
    locked = parse_lock(lock_path)
    if source != locked:
        missing = sorted(set(source) - set(locked))
        extra = sorted(set(locked) - set(source))
        mismatched = sorted(
            f"{name}: source={source[name]} lock={locked[name]}"
            for name in set(source) & set(locked)
            if source[name] != locked[name]
        )
        raise SystemExit(
            f"{label} dependency lock drift: missing={missing}; extra={extra}; versions={mismatched}"
        )
    print(f"{label}: {len(locked)} exact package pins match; every package has a SHA-256 hash.")


def main() -> int:
    target = sys.argv[1] if len(sys.argv) > 1 else "all"
    if target not in {"wallet", "account", "all"} or len(sys.argv) > 2:
        raise SystemExit("Usage: verify_ci_dependency_locks.py [wallet|account|all]")
    if target in {"wallet", "all"}:
        verify("wallet-auth", (AUTH_REQUIREMENTS,), WALLET_LOCK)
    if target in {"account", "all"}:
        verify("account-continuity", (AUTH_REQUIREMENTS, ACCOUNT_REQUIREMENTS), ACCOUNT_LOCK)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
