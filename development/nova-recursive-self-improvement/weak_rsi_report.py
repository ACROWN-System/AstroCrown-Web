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
