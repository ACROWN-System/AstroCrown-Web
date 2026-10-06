#!/usr/bin/env python3
"""Non-mutating RSI configuration preflight.

The preflight validates all repository-controlled configuration before the first
external provider call. It intentionally does not print, test, or transmit the
secret value.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

from provider_client import ProviderConfig, ProviderError, validate_base_url


def load_policy(root: Path) -> dict:
    return json.loads(
        (root / "development/nova-recursive-self-improvement/rsi_policy.json")
        .read_text(encoding="utf-8")
    )


def check_non_secret_configuration(root: Path, policy: dict) -> list[str]:
    del root
    errors: list[str] = []
    provider = policy["provider"]

    base_url = os.environ.get(provider["base_url_env"], "").strip() or provider.get(
        "default_base_url", ""
    )
    model = os.environ.get(provider["model_env"], "").strip() or "auto"
    eligibility = os.environ.get("RSI_AI_COMMERCIAL_ELIGIBILITY", "").strip()
    benchmark_required = bool(policy["evaluation"]["require_benchmark"])
    benchmark_command = os.environ.get(
        policy["evaluation"]["benchmark_command_env"], ""
    ).strip()

    try:
        validate_base_url(base_url)
    except ProviderError as exc:
        errors.append(str(exc))

    if not model:
        errors.append("RSI_AI_MODEL may be a model identifier or 'auto'.")

    if eligibility != "PASS":
        errors.append("RSI_AI_COMMERCIAL_ELIGIBILITY must be exactly PASS before provider access.")

    if benchmark_required and not benchmark_command:
        errors.append("RSI_BENCHMARK_COMMAND is required by the protected RSI policy.")

    return errors


def run(root: Path, require_secret: bool) -> int:
    policy = load_policy(root)
    readiness = policy.get("implementation_readiness", {})
    if readiness.get("status") != "READY":
        print(json.dumps({
            "decision": "BLOCKED",
            "stage": "implementation-readiness",
            "status": readiness.get("status"),
            "next_boundary": "complete protected RSI implementation before provider configuration",
        }, indent=2, sort_keys=True))
        return 1

    errors = check_non_secret_configuration(root, policy)
    if errors:
        print(json.dumps({
            "decision": "BLOCKED",
            "stage": "non-secret-configuration",
            "errors": errors,
        }, indent=2, sort_keys=True))
        return 1

    api_key_env = policy["provider"]["api_key_env"]
    api_key_present = bool(os.environ.get(api_key_env, "").strip())
    if require_secret and not api_key_present:
        print(json.dumps({
            "decision": "BLOCKED",
            "stage": "provider-secret",
            "secret_env": api_key_env,
            "next_boundary": "add the provider API key as the protected GitHub Actions secret",
        }, indent=2, sort_keys=True))
        return 2

    if api_key_present:
        try:
            ProviderConfig.from_environment(
                base_url_env=policy["provider"]["base_url_env"],
                model_env=policy["provider"]["model_env"],
                api_key_env=api_key_env,
                default_base_url=policy["provider"].get("default_base_url"),
                timeout_seconds=int(policy["provider"].get("provider_timeout_seconds", 120)),
                max_response_bytes=int(policy["provider"].get("max_response_bytes", 262144)),
            )
        except ProviderError as exc:
            print(json.dumps({
                "decision": "BLOCKED",
                "stage": "provider-configuration",
                "error": str(exc),
            }, indent=2, sort_keys=True))
            return 1

    print(json.dumps({
        "decision": "PASS",
        "stage": "preflight",
        "provider_base_url": os.environ.get(
            policy["provider"]["base_url_env"],
            policy["provider"].get("default_base_url"),
        ),
        "model": os.environ.get(policy["provider"]["model_env"], "auto") or "auto",
        "provider_secret_present": api_key_present,
        "next_stage": "provider request",
    }, indent=2, sort_keys=True))
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", default=".")
    parser.add_argument("--require-secret", action="store_true")
    args = parser.parse_args()
    try:
        return run(Path(args.repo).resolve(), args.require_secret)
    except Exception as exc:
        print(f"RSI preflight blocked: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
