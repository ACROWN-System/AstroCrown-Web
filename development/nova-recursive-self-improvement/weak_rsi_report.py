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
