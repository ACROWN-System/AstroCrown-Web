"""Fail-closed, task-specific benchmark profile selection for NOVA RSI."""

from __future__ import annotations

import re
import shlex
from typing import Any


_SHA_RE = re.compile(r"^[0-9a-f]{40}$")


def resolve_profile(
    config: Any,
    changed_paths: list[str],
    configured_command: str,
) -> dict[str, Any]:
    """Select a single benchmark only for an exact approved changed-file set.

    The profile registry is protected by RSI candidate-path policy. Unknown,
    mixed, malformed, disabled, or command-mismatched scopes return BLOCKED.
    """
    if not isinstance(config, dict) or config.get("schema_version") != 1:
        return {"status": "BLOCKED", "reason": "Benchmark profile registry schema is invalid."}
    if config.get("status") != "INDEPENDENT_REVIEW_APPROVED":
        return {
            "status": "BLOCKED",
            "reason": "Benchmark registry is not explicitly approved by independent review.",
        }

    profiles = config.get("profiles")
    if not isinstance(profiles, list):
        return {"status": "BLOCKED", "reason": "Benchmark profile registry has no profile list."}

    if not isinstance(changed_paths, list) or not changed_paths:
        return {"status": "BLOCKED", "reason": "Candidate changed-file set is empty or invalid."}
    if any(not isinstance(path, str) or not path or path.startswith("/") or ".." in path.split("/") for path in changed_paths):
        return {"status": "BLOCKED", "reason": "Candidate changed-file set contains an unsafe path."}
    if len(changed_paths) != len(set(changed_paths)):
        return {"status": "BLOCKED", "reason": "Candidate changed-file set contains duplicates."}

    try:
        configured = shlex.split(configured_command, posix=True)
    except ValueError as exc:
        return {"status": "BLOCKED", "reason": f"Configured benchmark command is malformed: {exc}"}
    if not configured:
        return {"status": "BLOCKED", "reason": "RSI_BENCHMARK_COMMAND is not configured."}

    changed = set(changed_paths)
    matches: list[dict[str, Any]] = []
    for profile in profiles:
        if not isinstance(profile, dict):
            return {"status": "BLOCKED", "reason": "Benchmark profile entry is malformed."}
        expected = profile.get("exact_changed_paths")
        command = profile.get("command")
        profile_id = profile.get("profile_id")
        if (
            not isinstance(profile_id, str)
            or not profile_id
            or not isinstance(expected, list)
            or not expected
            or any(not isinstance(path, str) or not path for path in expected)
            or not isinstance(command, list)
            or not command
            or any(not isinstance(arg, str) or not arg for arg in command)
        ):
            return {"status": "BLOCKED", "reason": "Benchmark profile has invalid fields."}
        if changed == set(expected) and len(expected) == len(changed):
            matches.append(profile)

    if len(matches) != 1:
        return {
            "status": "BLOCKED",
            "reason": "No unique benchmark profile matches the exact candidate changed-file set.",
        }

    profile = matches[0]
    if profile.get("review_status") != "INDEPENDENT_REVIEW_APPROVED":
        return {
            "status": "BLOCKED",
            "reason": f"Benchmark profile {profile['profile_id']} lacks explicit independent-review approval.",
            "profile_id": profile["profile_id"],
        }
    if profile.get("enabled") is not True:
        return {
            "status": "BLOCKED",
            "reason": f"Benchmark profile {profile['profile_id']} is disabled pending independent review.",
            "profile_id": profile["profile_id"],
        }
    if configured != profile["command"]:
        return {
            "status": "BLOCKED",
            "reason": "Configured benchmark command does not exactly match the selected protected profile.",
            "profile_id": profile["profile_id"],
        }

    return {
        "status": "READY",
        "profile_id": profile["profile_id"],
        "command": list(profile["command"]),
        "scope": list(profile["exact_changed_paths"]),
        "review_status": profile.get("review_status", "unspecified"),
    }
