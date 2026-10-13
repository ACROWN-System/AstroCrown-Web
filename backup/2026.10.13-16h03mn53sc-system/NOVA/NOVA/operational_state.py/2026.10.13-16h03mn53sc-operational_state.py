#!/usr/bin/env python3
"""Load and publish NOVA runtime state without committing operational writes to main."""
from __future__ import annotations
import argparse
import copy
import json
import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Any

STATE_BRANCH = "nova-operational-state"
STATE_PATHS = ("NOVA/health_state.json", "NOVA/roster.json")


def _git(repo_root: Path, *args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(["git", *args], cwd=repo_root, text=True, capture_output=True, check=False)
    if check and result.returncode:
        detail = result.stderr.strip() or result.stdout.strip() or "no diagnostic"
        raise RuntimeError(f"git {' '.join(args[:3])} failed: {detail}")
    return result


def _ref_text(repo_root: Path, ref: str, path: str) -> str:
    return _git(repo_root, "show", f"{ref}:{path}").stdout


def _read_json_text(text: str, *, description: str) -> dict[str, Any]:
    try:
        value = json.loads(text)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"{description} is not valid JSON: {exc}") from exc
    if not isinstance(value, dict):
        raise RuntimeError(f"{description} must be a JSON object.")
    return value


def _write_json(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w", encoding="utf-8", dir=path.parent,
            prefix=".nova-state-", suffix=".tmp", delete=False
        ) as handle:
            temp_path = Path(handle.name)
            json.dump(value, handle, indent=2, sort_keys=True)
            handle.write("\n")
        os.replace(temp_path, path)
    finally:
        if temp_path is not None and temp_path.exists():
            temp_path.unlink()


def merge_dynamic_roster(
    repository_roster: dict[str, Any], persisted_roster: dict[str, Any]
) -> dict[str, Any]:
    """Use current main policy, overlaying only previously persisted DOWN markers."""
    merged = copy.deepcopy(repository_roster)
    current_providers = merged.get("providers")
    persisted_providers = persisted_roster.get("providers")
    if not isinstance(current_providers, list) or not isinstance(persisted_providers, list):
        raise RuntimeError("Both provider rosters must contain a providers array.")

    persisted_by_name = {
        provider.get("name"): provider
        for provider in persisted_providers
        if isinstance(provider, dict) and isinstance(provider.get("name"), str)
    }
    for provider in current_providers:
        if not isinstance(provider, dict):
            raise RuntimeError("The repository roster contains a non-object provider.")
        saved = persisted_by_name.get(provider.get("name"))
        if provider.get("status") == "active" and isinstance(saved, dict) and saved.get("status") == "down":
            provider["status"] = "down"
            provider.pop("marked_down_at", None)
            if isinstance(saved.get("marked_down_at"), str):
                provider["marked_down_at"] = saved["marked_down_at"]
    return merged


def load_operational_state(repo_root: Path, state_ref: str) -> None:
    health_state = _read_json_text(
        _ref_text(repo_root, state_ref, "NOVA/health_state.json"),
        description=f"{state_ref}:NOVA/health_state.json",
    )
    persisted_roster = _read_json_text(
        _ref_text(repo_root, state_ref, "NOVA/roster.json"),
        description=f"{state_ref}:NOVA/roster.json",
    )
    repository_roster = _read_json_text(
        (repo_root / "NOVA/roster.json").read_text(encoding="utf-8"),
        description="NOVA/roster.json from the current code checkout",
    )
    merged_roster = merge_dynamic_roster(repository_roster, persisted_roster)
    _write_json(repo_root / "NOVA/health_state.json", health_state)
    _write_json(repo_root / "NOVA/roster.json", merged_roster)
    print(f"Loaded NOVA operational state from {state_ref}.")


def publish_operational_state(repo_root: Path, state_ref: str, message: str) -> bool:
    """Commit changed state paths to the state branch, never to the code branch."""
    temp_root = Path(tempfile.mkdtemp(prefix="nova-operational-state-"))
    worktree_path = temp_root / "worktree"
    worktree_added = False
    try:
        _git(repo_root, "worktree", "add", "--detach", str(worktree_path), state_ref)
        worktree_added = True
        for relative_path in STATE_PATHS:
            destination = worktree_path / relative_path
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(repo_root / relative_path, destination)

        _git(worktree_path, "config", "user.name", "NOVA Autonomous Engine")
        _git(worktree_path, "config", "user.email", "nova@haan.system")
        _git(worktree_path, "add", "--", *STATE_PATHS)
        staged = _git(worktree_path, "diff", "--cached", "--quiet", check=False)
        if staged.returncode == 0:
            print("NOVA operational state is unchanged; no state commit needed.")
            return False
        if staged.returncode != 1:
            raise RuntimeError("Unable to inspect staged operational-state changes.")

        _git(worktree_path, "commit", "-m", message)
        _git(worktree_path, "push", "origin", f"HEAD:refs/heads/{STATE_BRANCH}")
        print(f"Published NOVA operational state to {STATE_BRANCH}.")
        return True
    finally:
        if worktree_added:
            _git(repo_root, "worktree", "remove", "--force", str(worktree_path), check=False)
        shutil.rmtree(temp_root, ignore_errors=True)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("load", "publish"))
    parser.add_argument("--repo-root", default=".")
    parser.add_argument("--state-ref", default=f"origin/{STATE_BRANCH}")
    parser.add_argument("--message", default="chore(nova): update operational state [skip ci]")
    args = parser.parse_args()
    root = Path(args.repo_root).resolve()
    try:
        if args.command == "load":
            load_operational_state(root, args.state_ref)
        else:
            publish_operational_state(root, args.state_ref, args.message)
    except (OSError, RuntimeError, subprocess.SubprocessError) as exc:
        print(f"NOVA operational-state persistence failed: {exc}")
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
