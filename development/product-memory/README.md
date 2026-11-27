# AstroCrown Product Development Memory

## Purpose

This directory is the durable, repository-backed memory of AstroCrown's product strategy and product-development reasoning. It preserves what AstroCrown intends to build, why a capability may be useful, what evidence supports it, which decisions have been accepted, which alternatives were considered, and how proposed work relates to implementation.

A new conversation or SI should be able to recover the important product-development state from these files and the linked authoritative records instead of relying on conversational history.

## Authority boundaries

This subsystem is a product-strategy and decision layer. It does not replace:

- `development/index-section/` — active homepage section requirements.
- `development/index-reference/` — shared homepage visual and interaction references.
- `development/account-continuity/` and `development/supporter-programme/` — account, wallet, Genesis and payment architecture.
- `development/verification/` — external standards, benchmarks, awards, listings, recognition and adoption-opportunity intelligence.
- `development/audit/` — actual audit activity, findings, evidence, remediation and re-test.
- `development/DEVELOPMENT-AND-AUDIT-CONVENTION.md` — engineering and evidence requirements.
- NOVA's context/memory and shared-knowledge architecture — NOVA operational memory and reuse.

The product memory links to those sources. It must not copy them into a second competing source of truth.

## Files

| File | Purpose |
|---|---|
| `PRODUCT-STRATEGY-AND-SERVICE-ARCHITECTURE.md` | Product identity, user value, service pillars, differentiators and staged strategy |
| `RECORD-GOVERNANCE.md` | Allowed record structure, lifecycle, evidence requirements and anti-garbage controls |
| `capabilities.json` | Capability and service proposals, value, repeat use, distribution, risks and acceptance criteria |
| `decisions.json` | Accepted/proposed/rejected decisions, alternatives, rationale, consequences and supersession |
| `research.json` | Dated external research sources and the exact claims each source supports |
| [Auditory–Visual Interaction Feedback Research Memorandum](ASTROCROWN-AUDITORY-VISUAL-INTERACTION-FEEDBACK-RESEARCH-2026-11-27.md) | Dated research synthesis explaining the AstroCrown design rationale, supporting evidence, limitations, potential human-performance and financial pathways, and a proposed validation experiment; not an independent audit or proof of profit improvement |
| `roadmap.json` | Ordered work packages, dependencies, entry gates, exit criteria and blockers |
| `validate.py` | Deterministic standard-library validator |
| `tests/` | Positive and negative regression tests for the records and validator |

## Operating model

1. Read this README and the strategy overview.
2. Retrieve only the capabilities, decisions, research records and roadmap items relevant to the task.
3. Check the linked authoritative requirements, implementation and audit records.
4. Record a new proposal as a candidate or research-required item; do not silently promote it.
5. Before changing an accepted decision, create a new decision record that explicitly supersedes it and explains the changed evidence and consequences.
6. Validate locally and run the exact CI checks before merging.
7. After implementation, link the code, audit and verification evidence rather than copying their full content into the product memory.

## Quality gate

Run from the repository root:

```sh
python -m py_compile development/product-memory/validate.py
python -m unittest discover -s development/product-memory/tests -p 'test_*.py' -v
python development/product-memory/validate.py
```

The validator is deliberately dependency-free. It rejects unknown fields, malformed records, duplicate JSON keys, duplicate identifiers/titles, unresolved references, ungrounded approvals, missing roadmap coverage and cycles in dependency or decision-supersession graphs.

Passing validation establishes structural integrity only. It does not prove the truth, usefulness, legality, feasibility or commercial value of a product idea. Those require substantive evidence and review.

## Initial status

The initial records distinguish the owner's approved priorities from future candidates. The Living Market Laboratory and Market Time Machine remain research candidates. No claim is made that either is globally unique or implemented. The first immediate priority remains the homepage and Genesis Programme experience.
