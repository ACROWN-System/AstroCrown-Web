#!/usr/bin/env python3
"""Verify pip-audit JSON and CycloneDX reports cover every exact hashed lock entry."""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

LOCK_PATTERN = re.compile(r"^([A-Za-z0-9._-]+)==([^\s]+) --hash=sha256:([0-9a-f]{64})$")


def canonicalize(name: str) -> str:
    return re.sub(r"[-_.]+", "-", name).lower()


def read_lock(path: Path) -> dict[str, str]:
    packages: dict[str, str] = {}
    for line_number, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        match = LOCK_PATTERN.fullmatch(line)
        if not match:
            raise SystemExit(f"{path}:{line_number}: invalid hashed lock entry: {line}")
        name, version, _digest = match.groups()
        key = canonicalize(name)
        if key in packages:
            raise SystemExit(f"{path}:{line_number}: duplicate package {key}")
        packages[key] = version
    if not packages:
        raise SystemExit(f"{path}: empty lock")
    return packages


def compare(label: str, expected: dict[str, str], actual: dict[str, str]) -> None:
    missing = sorted(set(expected) - set(actual))
    extra = sorted(set(actual) - set(expected))
    mismatched = sorted(
        f"{name}: lock={expected[name]} report={actual[name]}"
        for name in set(expected) & set(actual)
        if expected[name] != actual[name]
    )
    if missing or extra or mismatched:
        raise SystemExit(
            f"{label} report does not cover the exact lock: "
            f"missing={missing}; extra={extra}; versions={mismatched}"
        )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--lock", type=Path, required=True)
    parser.add_argument("--vulnerability-report", type=Path, required=True)
    parser.add_argument("--cyclonedx-report", type=Path, required=True)
    args = parser.parse_args()

    expected = read_lock(args.lock)
    audit = json.loads(args.vulnerability_report.read_text(encoding="utf-8"))
    dependencies = audit.get("dependencies")
    if not isinstance(dependencies, list):
        raise SystemExit("pip-audit JSON does not contain a dependency list")
    vulnerability_packages: dict[str, str] = {}
    vulnerability_count = 0
    for item in dependencies:
        name = canonicalize(item["name"])
        if name in vulnerability_packages:
            raise SystemExit(f"pip-audit JSON contains duplicate package {name}")
        vulnerability_packages[name] = str(item["version"])
        vulnerability_count += len(item.get("vulns") or [])
    compare("pip-audit JSON", expected, vulnerability_packages)

    bom = json.loads(args.cyclonedx_report.read_text(encoding="utf-8"))
    if bom.get("bomFormat") != "CycloneDX":
        raise SystemExit("CycloneDX report has an unexpected bomFormat")
    components = bom.get("components")
    if not isinstance(components, list):
        raise SystemExit("CycloneDX report has no components list")
    cyclonedx_packages: dict[str, str] = {}
    for item in components:
        name = canonicalize(item["name"])
        if name in cyclonedx_packages:
            raise SystemExit(f"CycloneDX report contains duplicate package {name}")
        cyclonedx_packages[name] = str(item.get("version", ""))
    compare("CycloneDX", expected, cyclonedx_packages)

    print(
        f"Audit evidence complete: {len(expected)} locked packages appear exactly once "
        f"in both reports; known vulnerabilities reported: {vulnerability_count}."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
