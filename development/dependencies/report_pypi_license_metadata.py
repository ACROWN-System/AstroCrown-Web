#!/usr/bin/env python3
"""Report publisher-declared PyPI license metadata for the exact locked wheels.

This does not make a legal determination. Missing or free-text license fields
remain NOASSERTION. The lock hash must match an artifact listed by PyPI.
"""
from __future__ import annotations

import argparse
import concurrent.futures
import datetime as dt
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

LOCK_LINE = re.compile(r"^([A-Za-z0-9._-]+)==([^\s]+) --hash=sha256:([0-9a-f]{64})$")


def canonicalize(name: str) -> str:
    return re.sub(r"[-_.]+", "-", name).lower()


def read_lock(path: Path) -> list[dict[str, str]]:
    entries = []
    seen = set()
    for line_number, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        match = LOCK_LINE.fullmatch(line)
        if not match:
            raise SystemExit(f"{path}:{line_number}: malformed package/hash lock row")
        name, version, digest = match.groups()
        key = canonicalize(name)
        if key in seen:
            raise SystemExit(f"{path}:{line_number}: duplicate package {key}")
        seen.add(key)
        entries.append({"name": key, "version": version, "sha256": digest})
    if not entries:
        raise SystemExit(f"No entries found in {path}")
    return entries


def fetch_package(entry: dict[str, str], timeout: int, retries: int) -> dict:
    name = urllib.parse.quote(entry["name"], safe=".-")
    version = urllib.parse.quote(entry["version"], safe=".-+")
    url = f"https://pypi.org/pypi/{name}/{version}/json"
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": "AstroCrown-Dependency-License-Metadata/1.0",
        },
    )
    last_error = None
    for attempt in range(retries + 1):
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                payload = json.loads(response.read().decode("utf-8"))
            break
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            last_error = exc
            if attempt >= retries:
                raise RuntimeError(f"PyPI metadata request failed for {entry['name']}=={entry['version']}: {exc}") from exc
            time.sleep(min(2 ** attempt, 8))
    else:
        raise RuntimeError(f"PyPI metadata request failed: {last_error}")

    urls = payload.get("urls", [])
    matches = [
        item for item in urls
        if (item.get("digests") or {}).get("sha256") == entry["sha256"]
    ]
    if len(matches) != 1:
        raise RuntimeError(
            f"{entry['name']}=={entry['version']}: expected exactly one PyPI file "
            f"with the locked SHA-256, found {len(matches)}"
        )
    artifact = matches[0]
    info = payload.get("info") or {}
    expression = info.get("license_expression")
    legacy_license = info.get("license")
    classifiers = sorted(
        value for value in (info.get("classifiers") or [])
        if value.startswith("License ::")
    )
    review_flags = []
    if expression and (" AND " in expression or " OR " in expression):
        review_flags.append("COMPOSITE_SPDX_EXPRESSION_REQUIRES_NOTICE_REVIEW")
    if any("Other/Proprietary License" in value for value in classifiers):
        review_flags.append("OTHER_OR_PROPRIETARY_CLASSIFIER_REQUIRES_MANUAL_REVIEW")
    if not expression and not legacy_license and classifiers:
        review_flags.append("CLASSIFIER_ONLY_LICENSE_SIGNAL_REQUIRES_SOURCE_REVIEW")
    if legacy_license:
        normalized_text = str(legacy_license).strip().casefold()
        canonical_text = {
            "mit", "apache-2.0", "apache 2.0", "apache license, version 2.0",
            "bsd-2-clause", "bsd-3-clause", "psf-2.0", "psfl", "mpl-2.0",
        }
        if normalized_text not in canonical_text:
            review_flags.append("NON_CANONICAL_OR_MIXED_LICENSE_TEXT_REQUIRES_SOURCE_REVIEW")
    if expression:
        status = "publisher SPDX license expression supplied; not independently verified"
    elif legacy_license and str(legacy_license).strip().casefold() not in {"unknown", "n/a", "none"}:
        status = "publisher free-text license supplied; not independently verified"
    elif classifiers:
        status = "publisher license classifier only; not independently verified"
    else:
        status = "NOASSERTION — publisher metadata contains no usable license declaration"
    return {
        **entry,
        "pypi_project_url": f"https://pypi.org/project/{name}/{version}/",
        "artifact_filename": artifact.get("filename"),
        "artifact_type": artifact.get("packagetype"),
        "artifact_upload_time": artifact.get("upload_time_iso_8601") or artifact.get("upload_time"),
        "artifact_yanked": artifact.get("yanked"),
        "pypi_artifact_sha256_match": True,
        "publisher_license_expression": expression,
        "publisher_license_text": legacy_license,
        "publisher_license_classifiers": classifiers,
        "license_review_status": status,
        "license_review_flags": review_flags,
        "legal_approval": "NOT ASSESSED",
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--lock", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--timeout", type=int, default=20)
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--retries", type=int, default=3)
    args = parser.parse_args()

    entries = read_lock(args.lock)
    results = []
    errors = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, min(args.workers, 8))) as executor:
        futures = {executor.submit(fetch_package, entry, args.timeout, args.retries): entry for entry in entries}
        for future in concurrent.futures.as_completed(futures):
            entry = futures[future]
            try:
                results.append(future.result())
            except Exception as exc:
                errors.append(f"{entry['name']}=={entry['version']}: {exc}")
    if errors:
        for error in sorted(errors):
            print(error, file=sys.stderr)
        raise SystemExit(f"License metadata report incomplete: {len(errors)} PyPI lookups failed.")

    results.sort(key=lambda item: item["name"])
    report = {
        "report_type": "publisher-declared PyPI license metadata; not a legal determination",
        "created_utc": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "source_lock": str(args.lock).replace("\\", "/"),
        "target_platform": "CPython 3.12 / Ubuntu 24.04 / x86_64 wheels",
        "package_count": len(results),
        "matched_artifact_hash_count": sum(item["pypi_artifact_sha256_match"] for item in results),
        "license_metadata_missing_count": sum(item["license_review_status"].startswith("NOASSERTION") for item in results),
        "license_review_flag_count": sum(len(item.get("license_review_flags", [])) for item in results),
        "license_review_flag_totals": {
            flag: sum(flag in item.get("license_review_flags", []) for item in results)
            for flag in sorted({flag for item in results for flag in item.get("license_review_flags", [])})
        },
        "legal_approval": "NOT ASSESSED — human license review is required before certification or redistribution claims",
        "packages": results,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(
        f"Matched {report['matched_artifact_hash_count']}/{len(results)} PyPI artifact hashes; "
        f"{report['license_metadata_missing_count']} package(s) have no usable publisher license declaration."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
