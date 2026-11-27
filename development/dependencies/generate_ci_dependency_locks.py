#!/usr/bin/env python3
"""Regenerate/check the isolated Python audit-tool wheel lock.

Application account runtimes are implemented in the Cloudflare Worker.
The only remaining Python dependency set is the standalone CI audit tool.
"""
from __future__ import annotations

import argparse
import hashlib
import os
import platform
import subprocess
import sys
import tempfile
from pathlib import Path
from pip._vendor.packaging.utils import canonicalize_name, parse_wheel_filename

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "development/dependencies/requirements-pip-audit.txt"
LOCK = ROOT / "development/dependencies/requirements-pip-audit-py312-ubuntu24-x86_64.lock"


def require_supported_target() -> None:
    if sys.version_info[:2] != (3, 12):
        raise SystemExit(f"Expected CPython 3.12, got {sys.version.split()[0]}")
    if sys.platform != "linux" or platform.machine().lower() not in {"x86_64", "amd64"}:
        raise SystemExit(f"Expected Linux x86_64, got {sys.platform}/{platform.machine()}")
    fields = {}
    release = Path("/etc/os-release")
    if release.exists():
        for raw in release.read_text(encoding="utf-8").splitlines():
            if "=" in raw:
                key, value = raw.split("=", 1)
                fields[key] = value.strip().strip('"')
    if fields.get("ID") != "ubuntu" or fields.get("VERSION_ID") != "24.04":
        raise SystemExit("Expected Ubuntu 24.04; refusing to generate hashes for another platform.")


def build_lock(directory: Path) -> str:
    subprocess.run([
        sys.executable, "-m", "pip", "download",
        "--no-cache-dir", "--disable-pip-version-check",
        "--only-binary=:all:", "--dest", str(directory),
        "-r", str(SOURCE),
    ], check=True)
    wheels = {}
    for wheel in sorted(directory.glob("*.whl")):
        name, version, _build, _tags = parse_wheel_filename(wheel.name)
        key = canonicalize_name(name)
        if key in wheels:
            raise SystemExit(f"More than one target wheel downloaded for {key}")
        wheels[key] = (str(version), hashlib.sha256(wheel.read_bytes()).hexdigest())
    if not wheels:
        raise SystemExit("No audit-tool wheels were downloaded.")
    lines = [
        "# Exact artifact hashes generated from the target CI runner.",
        "# Target: CPython 3.12, Ubuntu 24.04, x86_64; wheels only.",
        "# CI-only security scanner lock; re-generate and review hashes before changing platform or Python ABI.",
    ]
    for name in sorted(wheels):
        version, digest = wheels[name]
        lines.append(f"{name}=={version} --hash=sha256:{digest}")
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="compare fresh wheel hashes without rewriting the lock")
    args = parser.parse_args()
    require_supported_target()
    with tempfile.TemporaryDirectory(prefix="astrocrown-audit-lock-") as temp:
        fresh = build_lock(Path(temp))
    if args.check:
        if LOCK.read_text(encoding="utf-8") != fresh:
            raise SystemExit(
                "Audit-tool wheel selection or hashes differ from the committed lock. "
                "Investigate the PyPI artifacts; do not automatically bless changed hashes."
            )
        print("Audit-tool wheel hashes match the committed lock.")
    else:
        LOCK.write_text(fresh, encoding="utf-8")
        print(f"Updated {LOCK}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
