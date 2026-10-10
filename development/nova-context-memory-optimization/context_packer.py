"""Deterministic, provenance-preserving context packing for NOVA.

This is a development-stage implementation candidate. It selects whole source
records under a hard character budget; it does not summarize or rewrite evidence.
"""

from __future__ import annotations

import re
from typing import Any

_TOKEN_RE = re.compile(r"[a-z0-9]+(?:[-'][a-z0-9]+)*")
_STOP_WORDS = frozenset(
    {
        "a", "an", "and", "are", "as", "at", "be", "by", "for", "from",
        "in", "into", "is", "it", "of", "on", "or", "that", "the", "this",
        "to", "was", "were", "with",
    }
)


def _terms(text: str) -> set[str]:
    return {
        term
        for term in _TOKEN_RE.findall(text.casefold())
        if term not in _STOP_WORDS
    }


def _validated_items(items: list[dict[str, Any]]) -> list[dict[str, str]]:
    if not isinstance(items, list):
        raise ValueError("items must be a list of records.")

    normalized: list[dict[str, str]] = []
    seen: set[str] = set()
    for index, item in enumerate(items):
        if not isinstance(item, dict):
            raise ValueError(f"item {index} must be an object.")
        for field in ("id", "source", "content"):
            value = item.get(field)
            if not isinstance(value, str) or not value.strip():
                raise ValueError(f"item {index} requires non-empty string {field}.")
        record: dict[str, str] = {}
        for field in ("id", "source"):
            value = item[field].strip()
            if "\n" in value or "\r" in value:
                raise ValueError(f"item {index} {field} must not contain line breaks.")
            record[field] = value
        if record["id"] in seen:
            raise ValueError(f"duplicate item id: {record['id']}")
        seen.add(record["id"])

        for field, fallback in (("observed_at", "undated"), ("status", "unspecified")):
            value = item.get(field, fallback)
            if not isinstance(value, str) or not value.strip():
                raise ValueError(f"item {index} {field} must be a non-empty string.")
            if "\n" in value or "\r" in value:
                raise ValueError(f"item {index} {field} must not contain line breaks.")
            record[field] = value.strip()
        record["content"] = item["content"]
        normalized.append(record)
    return normalized


def render_item(item: dict[str, str]) -> str:
    """Render metadata and full content without changing the source record."""
    return (
        f"[id: {item['id']} | source: {item['source']} | "
        f"observed_at: {item['observed_at']} | status: {item['status']}]\n"
        f"{item['content']}"
    )


def pack_context(
    items: list[dict[str, Any]], query: str, max_chars: int
) -> dict[str, Any]:
    """Select relevant whole records deterministically within max_chars.

    The score is marginal unique query-term coverage per rendered character.
    Ties preserve source input order. An empty query deliberately falls back to
    stable input-order packing rather than pretending to know relevance.
    """
    if not isinstance(query, str):
        raise ValueError("query must be a string.")
    if isinstance(max_chars, bool) or not isinstance(max_chars, int) or max_chars < 0:
        raise ValueError("max_chars must be a non-negative integer.")

    records = _validated_items(items)
    original_ids = [item["id"] for item in records]
    if max_chars == 0 or not records:
        return {
            "selected_ids": [],
            "dropped_ids": original_ids,
            "context": "",
            "character_count": 0,
            "max_chars": max_chars,
            "provenance": [],
        }

    query_terms = _terms(query)
    selected: list[dict[str, str]] = []
    remaining = list(enumerate(records))
    covered_terms: set[str] = set()
    used_chars = 0

    while remaining:
        ranked: list[tuple[float, int, int, dict[str, str], set[str], str]] = []
        for original_index, item in remaining:
            block = render_item(item)
            projected = used_chars + (2 if selected else 0) + len(block)
            if projected > max_chars:
                continue
            terms = _terms(item["content"])
            if query_terms:
                marginal = terms & (query_terms - covered_terms)
                if not marginal:
                    continue
                score = len(marginal) / max(len(block), 1)
                ranked.append((-score, -len(marginal), original_index, item, terms, block))
            else:
                ranked.append((0.0, 0, original_index, item, terms, block))

        if not ranked:
            break
        ranked.sort(key=lambda entry: (entry[0], entry[1], entry[2]))
        _, _, original_index, chosen, terms, block = ranked[0]
        selected.append(chosen)
        used_chars += (2 if len(selected) > 1 else 0) + len(block)
        covered_terms.update(terms)
        remaining = [(idx, item) for idx, item in remaining if idx != original_index]

        if not query_terms:
            # Empty-query fallback should preserve input order and must not
            # begin ranking by metadata emitted in the context.
            break

    rendered = "\n\n".join(render_item(item) for item in selected)
    selected_ids = [item["id"] for item in selected]
    selected_set = set(selected_ids)
    return {
        "selected_ids": selected_ids,
        "dropped_ids": [item_id for item_id in original_ids if item_id not in selected_set],
        "context": rendered,
        "character_count": len(rendered),
        "max_chars": max_chars,
        "provenance": [
            {
                "id": item["id"],
                "source": item["source"],
                "observed_at": item["observed_at"],
                "status": item["status"],
            }
            for item in selected
        ],
    }
