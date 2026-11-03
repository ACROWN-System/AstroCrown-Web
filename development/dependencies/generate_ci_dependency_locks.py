#!/usr/bin/env python3
"""Regenerate the platform-specific CI wheel locks using only pip + stdlib.

Run only on CPython 3.12 / Ubuntu 24.04 / x86_64. Downloads wheels but does
not install or execute them. Default mode writes both locks; --check verifies
that fresh PyPI-compatible wheel hashes still match committed locks.
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

ROOT = Path(__file__).resolve().parents[2]
AUTH_SOURCE = ROOT / "development/auth-prototype/requirements.txt"
ACCOUNT_SOURCE = ROOT / "development/account-continuity/prototype/requirements.txt"
LOCK_DIR = ROOT / "development/dependencies"
TARGETS = {
    "requirements-wallet-auth-py312-ubuntu24-x86_64.lock": [AUTH_SOURCE],
    "requirements-account-continuity-py312-ubuntu24-x86_64.lock": [AUTH_SOURCE, ACCOUNT_SOURCE],
}
SOURCE_LINE = re.compile(r"^([A-Za-z0-9._-]+)==([^<>=!~;\s]+)$")


def canonicalize(name: str) -> str:
    return re.sub(r"[-_.]+", "-", name).lower()


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


def build_lock(name: str, source_files: list[Path], wheel_dir: Path) -> str:
    expected = read_source_pins(source_files)
    command = [
        sys.executable, "-m", "pip", "download",
        "--no-cache-dir", "--disable-pip-version-check",
        "--no-deps", "--only-binary=:all:",
        "--dest", str(wheel_dir),
    ]
    for source in source_files:
        command.extend(["-r", str(source)])
    subprocess.run(command, check=True)

    wheels: dict[str, tuple[str, str]] = {}
    for wheel in sorted(wheel_dir.glob("*.whl")):
        # Parse the standard wheel filename: distribution-version-build-python-abi-platform.whl
        parts = wheel.name[:-4].split("-")
        if len(parts) < 5:
            raise SystemExit(f"Unexpected wheel filename: {wheel.name}")
        package_name, package_version = parts[0], parts[1]
        key = canonicalize(package_name)
        if key in wheels:
            raise SystemExit(f"More than one target wheel downloaded for {key}")
        wheels[key] = (
            package_version,
            hashlib.sha256(wheel.read_bytes()).hexdigest(),
        )
    if set(wheels) != set(expected):
        raise SystemExit(
            f"{name}: wheel/source package mismatch; missing={sorted(set(expected)-set(wheels))}; "
            f"extra={sorted(set(wheels)-set(expected))}"
        )

    lines = [
        "# Exact artifact hashes generated from the target CI runner.",
        "# Target: CPython 3.12, Ubuntu 24.04, x86_64; wheels only.",
        "# CI-only lock. Re-generate and review hashes before changing platform or Python ABI.",
    ]
    for package in sorted(expected):
        version, digest = wheels[package]
        if version != expected[package]:
            raise SystemExit(
                f"{name}: version mismatch for {package}: source={expected[package]}, wheel={version}"
            )
        lines.append(f"{package}=={version} --hash=sha256:{digest}")
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="compare fresh wheel hashes without writing files")
    args = parser.parse_args()
    require_supported_target()

    for filename, source_files in TARGETS.items():
        with tempfile.TemporaryDirectory(prefix="astrocrown-lock-") as temp:
            output = build_lock(filename, source_files, Path(temp))
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
