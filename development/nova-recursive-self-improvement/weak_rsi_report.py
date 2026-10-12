#!/usr/bin/env python3
"""Manual-only Weak RSI report. It must never modify or execute candidate code."""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Mapping

from provider_client import ProviderConfig, ProviderError, chat_completion, _request

CONTEXT_FILES = (
    "development/nova-recursive-self-improvement/README.md",
    "development/nova-recursive-self-improvement/rsi_policy.json",
    "development/nova-recursive-self-improvement/IMPLEMENTATION.md",
    "development/nova-recursive-self-improvement/CAPABILITY-BENCHMARK-PROTOCOL.md",
    "development/nova-recursive-self-improvement/STRONG-RSI-AND-COLLECTIVE-RESILIENCE.md",
    "development/DEVELOPMENT-AND-AUDIT-CONVENTION.md",
    "development/Prompt-Guide.md",
    "development/nova-context-memory-optimization/README.md",
    "development/gpu-infrastructure/README.md",
    "development/ai-media-generator/README.md",
)
MAX_CONTEXT_CHARS = 12000
MAX_REPORT_CHARS = 18000
MAX_OUTPUT_TOKENS = 1200




def build_prompt(context: str, included_paths: list[str], baseline_commit: str) -> list[dict[str, str]]:
    system = """You are Weak RSI, a human-in-the-loop development reviewer.
You may only create a decision-support report. You cannot modify files, generate an executable patch, run tests, create a branch, open a pull request, or merge code. Do not request secrets, user data, or credentials.
Base every observation on supplied repository text and list the exact paths supporting it. Do not claim tests were run, a benchmark passed, or an improvement was demonstrated unless the supplied evidence actually establishes that.
Prefer NO_CHANGE when there is no narrow, testable improvement with a defensible chance of preserving security, privacy, reliability, compatibility, performance, evidence integrity, and operability. Never claim the system is globally optimal. A no-change recommendation only means no safe improvement was justified from this bounded review.
Distinguish facts, hypotheses, required verification, and unknowns. A human must decide whether any proposal is implemented."""
    user = f"""Review the current development architecture for one useful, evidence-supported improvement opportunity.

Baseline commit: {baseline_commit}
Documents supplied: {json.dumps(included_paths)}

Return a concise Markdown report with these sections:
1. Result: NO_CHANGE_RECOMMENDED or HUMAN_REVIEW_CANDIDATE
2. Evidence-backed observations with exact paths
3. At most one bounded improvement hypothesis, or explicitly none
4. Acceptance criteria including zero mandatory regressions
5. Required verification and rollback
6. Risks and uncertainties
7. Human decision required

Rules:
- Do not produce a patch, runnable code, mutation command, or instructions to bypass gates.
- Do not equate a suggestion with a verified improvement.
- Do not say the system is globally optimal or fully secure.
- If evidence is insufficient or a safe test cannot be specified, recommend NO_CHANGE.
- Never invent missing context, quota, test results, provider status, or licensing facts.

Repository context follows:
{context}
"""
    return [{"role": "system", "content": system}, {"role": "user", "content": user}]



def _call_provider(
    provider: str,
    api_key: str,
    messages: list[dict[str, str]],
    request_fn: Callable[..., Any] | None = None,
) -> tuple[str, str, dict[str, Any] | None]:
    if provider == "groq":
        config = ProviderConfig(
            base_url="https://api.groq.com/openai/v1",
            model="openai/gpt-oss-20b",
            api_key=api_key,
            timeout_seconds=45,
            max_response_bytes=131072,
            allowed_hosts=("api.groq.com",),
        )
        if request_fn is None:
            payload, model = chat_completion(config, messages, MAX_OUTPUT_TOKENS, temperature=0.0)
        else:
            payload, model = request_fn(provider, config, messages)
    elif provider == "gemini":
        config = ProviderConfig(
            base_url="https://generativelanguage.googleapis.com/v1beta/openai",
            model="gemini-3.1-flash-lite",
            api_key=api_key,
            timeout_seconds=45,
            max_response_bytes=131072,
            allowed_hosts=("generativelanguage.googleapis.com",),
        )
        if request_fn is None:
            payload = _request(
                config,
                "POST",
                "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
                {
                    "model": config.model,
                    "messages": messages,
                    "temperature": 0,
                    "max_tokens": MAX_OUTPUT_TOKENS,
                    "stream": False,
                },
            )
        else:
            payload, _ = request_fn(provider, config, messages)
        model = config.model or "gemini-3.1-flash-lite"
    else:
        raise ProviderError("Weak RSI provider choice is not allowlisted.")

    choices = payload.get("choices") if isinstance(payload, dict) else None
    first = choices[0] if isinstance(choices, list) and choices else None
    message = first.get("message") if isinstance(first, dict) else None
    text = message.get("content") if isinstance(message, dict) else None
    if not isinstance(text, str) or not text.strip():
        raise ProviderError("Weak RSI provider returned no textual report.")

    usage_raw = payload.get("usage")
    usage: dict[str, Any] | None = None
    if isinstance(usage_raw, dict):
        safe_usage: dict[str, int] = {}
        for output_name, input_name in (
            ("input_tokens", "prompt_tokens"),
            ("output_tokens", "completion_tokens"),
            ("total_tokens", "total_tokens"),
        ):
            value = usage_raw.get(input_name)
            if isinstance(value, int) and not isinstance(value, bool) and value >= 0:
                safe_usage[output_name] = value
        usage = safe_usage or None
    return text[:MAX_REPORT_CHARS], model, usage


def _sanitize_report(text: str, credentials: list[str]) -> str:
    safe = text
    for credential in credentials:
        if credential:
            safe = safe.replace(credential, "[REDACTED]")
    safe = re.sub(
        r"(?i)\b(?:gsk_|AIza|ghp_|github_pat_|mstrl_)[A-Za-z0-9_-]{8,}\b",
        "[REDACTED_CREDENTIAL_PATTERN]",
        safe,
    )
    return safe[:MAX_REPORT_CHARS]


def collect_context(repo_root: Path, max_chars: int = MAX_CONTEXT_CHARS) -> tuple[str, list[str]]:
    if max_chars < 1:
        raise ValueError("Context budget must be positive.")
    chunks: list[str] = []
    used = 0
    included: list[str] = []
    for relative in CONTEXT_FILES:
        remaining = max_chars - used
        if remaining <= 0:
            break
        path = repo_root / relative
        if not path.is_file():
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except (OSError, UnicodeError):
            continue
        text = text[:remaining]
        if text:
            chunks.append(f"\n===== {relative} =====\n{text}")
            used += len(text)
            included.append(relative)
    return "".join(chunks), included


def generate_report(repo_root: Path, provider: str, data_use_eligibility: str,
                    environ: Mapping[str, str] | None = None,
                    request_fn: Callable[..., Any] | None = None) -> dict[str, Any]:
    env = os.environ if environ is None else environ
    if provider not in {"groq", "gemini"}:
        raise ValueError("Provider must be groq or gemini.")
    key_env = {"groq": "GROQ_API_KEY_01", "gemini": "GEMINI_API_KEY_01"}[provider]
    key = env.get(key_env, "").strip()
    report: dict[str, Any] = {
        "observed_at": datetime.now(timezone.utc).isoformat(),
        "mode": "WEAK_RSI_MANUAL_HUMAN_IN_THE_LOOP",
        "provider": provider,
        "credential_env": key_env,
        "credential_configured": bool(key),
        "provider_calls": 0,
        "source_changes_made": False,
        "candidate_execution_performed": False,
        "pull_request_created": False,
        "merge_performed": False,
        "decision": "BLOCKED",
        "baseline_commit": "UNKNOWN",
        "documents_reviewed": [],
        "usage": None,
        "model": None,
        "report_markdown": "",
        "reason": None,
    }
    if data_use_eligibility != "PASS_AFTER_REVIEW":
        report["reason"] = "Provider data-use/commercial terms were not explicitly approved for this manual run."
        report["report_markdown"] = "# Weak RSI — blocked before provider call\n\nNo request was made. Review the selected provider's current terms first.\n"
        return report
    if not key:
        report["reason"] = "Selected provider credential is not configured."
        report["report_markdown"] = f"# Weak RSI — blocked\n\nCredential slot {key_env} is missing; no request was made.\n"
        return report

    try:
        baseline = subprocess.run(
            ["git", "-C", str(repo_root), "rev-parse", "HEAD"],
            check=True, capture_output=True, text=True, timeout=5,
        ).stdout.strip()
    except (OSError, subprocess.SubprocessError):
        baseline = "UNKNOWN"
    context, included = collect_context(repo_root)
    report["baseline_commit"] = baseline
    report["documents_reviewed"] = included
    messages = build_prompt(context, included, baseline)
    try:
        output, model, usage = _call_provider(provider, key, messages, request_fn=request_fn)
    except Exception as exc:
        report["reason"] = "One bounded provider call failed or returned unusable content: " + type(exc).__name__
        report["report_markdown"] = "# Weak RSI — blocked\n\nThe request did not return a usable report. No retry/fallback or repository change occurred.\n"
        return report

    output = _sanitize_report(output, [key])
    report["decision"] = "HUMAN_REVIEW_REQUIRED"
    report["provider_calls"] = 1
    report["model"] = model
    report["usage"] = usage
    report["report_markdown"] = (
        "# Weak RSI — human-in-the-loop report\n\n"
        + "- Observed: " + report["observed_at"] + "\n"
        + "- Baseline commit: " + baseline + "\n"
        + "- Provider/model: " + provider + " / " + model + "\n"
        + "- Token usage: " + json.dumps(usage, sort_keys=True) + "\n"
        + "- No files changed; no candidate executed; no PR created or merged.\n"
        + "- A NO_CHANGE recommendation is not proof of global optimality.\n\n"
        + "## Model-generated review (untrusted until human-reviewed)\n\n"
        + output + "\n"
    )
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", required=True)
    parser.add_argument("--provider", choices=("groq", "gemini"), required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    eligibility = os.environ.get("WEAK_RSI_DATA_USE_ELIGIBILITY", "")
    report = generate_report(
        Path(args.repo_root).resolve(),
        provider=args.provider,
        data_use_eligibility=eligibility,
    )
    Path(args.output).write_text(report.get("report_markdown", ""), encoding="utf-8")
    # Workflow logs receive metadata only, never the model report or credential.
    print(json.dumps({key: value for key, value in report.items() if key != "report_markdown"},
                     indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
