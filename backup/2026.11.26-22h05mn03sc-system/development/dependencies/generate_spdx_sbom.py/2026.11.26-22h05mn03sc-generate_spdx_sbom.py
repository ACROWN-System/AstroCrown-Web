#!/usr/bin/env python3
"""Generate/check a conservative SPDX 2.3 SBOM from the exact CI wheel lock.

No third-party Python package is required. Package license fields stay
NOASSERTION until separately reviewed; PyPI classifiers are not legal advice.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_LOCK = ROOT / "development/dependencies/requirements-account-continuity-py312-ubuntu24-x86_64.lock"
DEFAULT_OUTPUT = ROOT / "development/dependencies/SBOM-Python-CI.spdx.json"
LOCK_LINE = re.compile(r"^([A-Za-z0-9._-]+)==([^\s]+) --hash=sha256:([0-9a-f]{64})$")


def canonicalize(name: str) -> str:
    return re.sub(r"[-_.]+", "-", name).lower()


def read_lock(path: Path) -> dict[str, dict[str, str]]:
    packages: dict[str, dict[str, str]] = {}
    for line_number, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        match = LOCK_LINE.fullmatch(line)
        if not match:
            raise SystemExit(f"{path}:{line_number}: invalid lock row or missing SHA-256: {line}")
        name, version, digest = match.groups()
        key = canonicalize(name)
        if key in packages:
            raise SystemExit(f"{path}:{line_number}: duplicate package: {key}")
        packages[key] = {"name": key, "version": version, "sha256": digest}
    if not packages:
        raise SystemExit(f"{path}: no packages found")
    return packages


def package_spdx_id(name: str) -> str:
    slug = re.sub(r"[^A-Za-z0-9.-]+", "-", name)
    return "SPDXRef-Package-" + slug


def build_document(lock_path: Path, packages: dict[str, dict[str, str]]) -> dict:
    lock_digest = hashlib.sha256(lock_path.read_bytes()).hexdigest()
    created = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    spdx_packages = []
    relationships = []
    for name in sorted(packages):
        item = packages[name]
        spdx_id = package_spdx_id(name)
        spdx_packages.append({
            "name": item["name"],
            "SPDXID": spdx_id,
            "versionInfo": item["version"],
            "downloadLocation": "NOASSERTION",
            "filesAnalyzed": False,
            "licenseConcluded": "NOASSERTION",
            "licenseDeclared": "NOASSERTION",
            "copyrightText": "NOASSERTION",
            "checksums": [{
                "algorithm": "SHA256",
                "checksumValue": item["sha256"],
            }],
            "externalRefs": [{
                "referenceCategory": "PACKAGE-MANAGER",
                "referenceType": "purl",
                "referenceLocator": f"pkg:pypi/{quote(item['name'], safe='.-')}@{quote(item['version'], safe='.+-')}",
            }],
            "sourceInfo": (
                "Exact SHA-256 digest recorded for the CPython 3.12, Ubuntu 24.04, "
                "x86_64 wheel selected by the corresponding pip --only-binary lock. "
                "The digest is an artifact-integrity identifier, not a publisher signature."
            ),
        })
        relationships.append({
            "spdxElementId": "SPDXRef-DOCUMENT",
            "relationshipType": "DESCRIBES",
            "relatedSpdxElement": spdx_id,
        })
    return {
        "spdxVersion": "SPDX-2.3",
        "dataLicense": "CC0-1.0",
        "SPDXID": "SPDXRef-DOCUMENT",
        "name": "AstroCrown Python CI dependencies — Ubuntu 24.04 / CPython 3.12 / x86_64",
        "documentNamespace": (
            "https://github.com/ACROWN-System/AstroCrown-Web/spdx/python-ci/"
            + lock_digest
        ),
        "creationInfo": {
            "created": created,
            "creators": ["Tool: AstroCrown Standard-Library SPDX Generator"],
            "comment": (
                "Inventory derived from the SHA-256-pinned, wheel-only account-continuity "
                "CI lock. License declarations and conclusions are intentionally NOASSERTION."
            ),
        },
        "packages": spdx_packages,
        "relationships": relationships,
    }


def check_document(document: dict, packages: dict[str, dict[str, str]]) -> None:
    if document.get("spdxVersion") != "SPDX-2.3":
        raise SystemExit("SBOM is not SPDX 2.3")
    sbom_packages = {}
    for package in document.get("packages", []):
        name = canonicalize(package.get("name", ""))
        checksums = package.get("checksums", [])
        digest = next((x.get("checksumValue") for x in checksums if x.get("algorithm") == "SHA256"), None)
        sbom_packages[name] = {
            "name": name,
            "version": package.get("versionInfo"),
            "sha256": digest,
        }
        if package.get("licenseDeclared") != "NOASSERTION" or package.get("licenseConcluded") != "NOASSERTION":
            raise SystemExit(f"{name}: do not make unreviewed SBOM license assertions")
    if sbom_packages != packages:
        missing = sorted(set(packages) - set(sbom_packages))
        extra = sorted(set(sbom_packages) - set(packages))
        mismatched = sorted(
            name for name in set(packages) & set(sbom_packages)
            if packages[name] != sbom_packages[name]
        )
        raise SystemExit(f"SBOM drift: missing={missing}, extra={extra}, mismatched={mismatched}")
    print(f"SPDX 2.3 SBOM matches all {len(packages)} locked package versions and SHA-256 digests.")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--lock", type=Path, default=DEFAULT_LOCK)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--check", action="store_true", help="check existing SPDX file against the lock")
    args = parser.parse_args()
    packages = read_lock(args.lock)
    if args.check:
        document = json.loads(args.output.read_text(encoding="utf-8"))
        check_document(document, packages)
    else:
        document = build_document(args.lock, packages)
        args.output.write_text(json.dumps(document, indent=2, sort_keys=False) + "\n", encoding="utf-8")
        print(f"Wrote SPDX 2.3 SBOM for {len(packages)} packages to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
