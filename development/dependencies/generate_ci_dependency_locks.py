#!/usr/bin/env python3
"""Regenerate the platform-specific CI wheel locks using only pip + stdlib.

Run only on CPython 3.12 / Ubuntu 24.04 / x86_64. Downloads wheels but does
not install or execute them. App test locks are closed package lists; the
scanner lock resolves the complete dependency closure from its direct source pin.
"""
from __future__ import annotations

import argparse
import hashlib
import os
import platform
import re
import subprocess
import sys
import tempfile
from pathlib import Path
from pip._vendor.packaging.utils import canonicalize_name, parse_wheel_filename

ROOT = Path(__file__).resolve().parents[2]
AUTH_SOURCE = ROOT / "development/auth-prototype/requirements.txt"
ACCOUNT_SOURCE = ROOT / "development/account-continuity/prototype/requirements.txt"
AUDIT_TOOL_SOURCE = ROOT / "development/dependencies/requirements-pip-audit.txt"
LOCK_DIR = ROOT / "development/dependencies"
TARGETS = {
    "requirements-wallet-auth-py312-ubuntu24-x86_64.lock": {
        "sources": [AUTH_SOURCE],
        "include_dependencies": False,
    },
    "requirements-account-continuity-py312-ubuntu24-x86_64.lock": {
        "sources": [AUTH_SOURCE, ACCOUNT_SOURCE],
        "include_dependencies": False,
    },
    "requirements-pip-audit-py312-ubuntu24-x86_64.lock": {
        "sources": [AUDIT_TOOL_SOURCE],
        "include_dependencies": True,
    },
}
SOURCE_LINE = re.compile(r"^([A-Za-z0-9._-]+)==([^<>=!~;\\s]+)$")


def canonicalize(name: str) -> str:
    return canonicalize_name(name)


def require_supported_target() -> None:
    if sys.version_info[:2] != (3, 12):
        raise SystemExit(f"Expected CPython 3.12, got {sys.version.split()[0]}")
    if sys.platform != "linux" or platform.machine().lower() not in {"x86_64", "amd64"}:
        raise SystemExit(f"Expected Linux x86_64, got {sys.platform}/{platform.machine()}")
    os_release = Path("/etc/os-release")
    if os_release.exists():
        fields = {}
        for raw in os_release.read_text(encoding="utf-8").splitlines():
            if "=" in raw:
                key, value = raw.split("=", 1)
                fields[key] = value.strip().strip('"')
        if fields.get("ID") != "ubuntu" or fields.get("VERSION_ID") != "24.04":
            raise SystemExit(
                "Expected Ubuntu 24.04; refusing to generate hashes for an unqualified platform."
            )


def read_source_pins(files: list[Path]) -> dict[str, str]:
    pins: dict[str, str] = {}
    for path in files:
        for line_number, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            line = raw.split("#", 1)[0].strip()
            if not line:
                continue
            match = SOURCE_LINE.fullmatch(line)
            if not match:
                raise SystemExit(f"{path}:{line_number}: expected package==exact-version: {line}")
            name, version = match.groups()
            key = canonicalize(name)
            if key in pins and pins[key] != version:
                raise SystemExit(f"Conflicting exact versions for {key}: {pins[key]} / {version}")
            pins[key] = version
    return pins


def build_lock(name: str, source_files: list[Path], wheel_dir: Path, include_dependencies: bool) -> str:
    expected = read_source_pins(source_files)
    command = [
        sys.executable, "-m", "pip", "download",
        "--no-cache-dir", "--disable-pip-version-check",
        "--only-binary=:all:",
        "--dest", str(wheel_dir),
    ]
    if not include_dependencies:
        command.append("--no-deps")
    for source in source_files:
        command.extend(["-r", str(source)])
    subprocess.run(command, check=True)

    wheels: dict[str, tuple[str, str]] = {}
    for wheel in sorted(wheel_dir.glob("*.whl")):
        package_name, package_version, _build, _tags = parse_wheel_filename(wheel.name)
        key = canonicalize(package_name)
        if key in wheels:
            raise SystemExit(f"More than one target wheel downloaded for {key}")
        wheels[key] = (
            str(package_version),
            hashlib.sha256(wheel.read_bytes()).hexdigest(),
        )

    missing_direct = sorted(set(expected) - set(wheels))
    if missing_direct:
        raise SystemExit(f"{name}: required direct package wheels missing: {missing_direct}")
    if not include_dependencies and set(wheels) != set(expected):
        raise SystemExit(
            f"{name}: wheel/source package mismatch; missing={missing_direct}; "
            f"extra={sorted(set(wheels)-set(expected))}"
        )
    for package, source_version in expected.items():
        wheel_version, _digest = wheels[package]
        if wheel_version != source_version:
            raise SystemExit(
                f"{name}: version mismatch for {package}: source={source_version}, wheel={wheel_version}"
            )

    lines = [
        "# Exact artifact hashes generated from the target CI runner.",
        "# Target: CPython 3.12, Ubuntu 24.04, x86_64; wheels only.",
        "# This is a CI-only lock. Re-generate and review hashes before changing platform or Python ABI.",
    ]
    for package in sorted(wheels):
        version, digest = wheels[package]
        lines.append(f"{package}=={version} --hash=sha256:{digest}")
    return "\\n".join(lines) + "\\n"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="compare fresh wheel hashes without writing files")
    args = parser.parse_args()
    require_supported_target()

    for filename, target in TARGETS.items():
        with tempfile.TemporaryDirectory(prefix="astrocrown-lock-") as temp:
            output = build_lock(
                filename,
                target["sources"],
                Path(temp),
                target["include_dependencies"],
            )
        lock_path = LOCK_DIR / filename
        if args.check:
            existing = lock_path.read_text(encoding="utf-8")
            if existing != output:
                raise SystemExit(
                    f"{filename}: fresh artifact hashes differ from the committed lock. "
                    "Review the PyPI artifact change before updating."
                )
            print(f"{filename}: fresh wheel hashes match the committed lock.")
        else:
            lock_path.write_text(output, encoding="utf-8")
            print(f"Updated {lock_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
