# Active Navigation Plan — AstroCrown Product Development Memory

**Date:** 2026-11-20  
**Status:** ACTIVE — repository implementation and PR verification in progress  
**Repository:** https://github.com/ACROWN-System/AstroCrown-Web  
**Current implementation branch base:** `e1a374fac74d8bc02c33dec8efc25b1c83504c3a` (after verified PR #191 merge; the initial read-only reconnaissance began at `51da27b004c8f5aa94a37bd90a9521a61bedb565`).  
**Branch:** `feature/astrocrown-product-development-memory-2026-11-20-v2`

## Objective

Establish a durable, repository-backed AstroCrown Product Development Memory that preserves the strategic intent, product/service architecture, candidate capabilities, research evidence, accepted decisions, alternatives, rationale, dependencies, roadmap and verification state across conversations and SI providers.

The memory must complement—not replace—the established product requirements, audit, verification, NOVA context/memory, account, Genesis and Community records.

It must reject malformed, duplicated, unsupported or cyclic entries through deterministic, dependency-free validation and CI. It must not silently promote candidates, rewrite decision history, or turn an unsupported idea into an approved requirement.

## Scope

1. Inspect and preserve the existing development index before modification.
2. Establish the Product Development Memory directory and governance.
3. Seed only decisions explicitly approved by the owner; classify other recent product ideas as candidates or research-required.
4. Implement strict register validation, duplicate/garbage-entry checks, reference integrity and cycle detection.
5. Add deterministic tests for both valid and invalid examples.
6. Add a narrowly scoped, read-only CI workflow.
7. Review the exact pull-request diff and exact-head CI, remediate any useful findings, then merge only when the evidence supports it.
8. Verify the merged content directly on `main`.

## Roadmap

- [x] https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/README.md
- [x] https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/DEVELOPMENT-AND-AUDIT-CONVENTION.md
- [x] https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/audit/README.md
- [x] https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/verification/README.md
- [x] https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/nova-context-memory-optimization/README.md
- [x] https://github.com/ACROWN-System/NOVA/blob/main/NOVA/ROOT-CAUSE-PREVENTION-AND-SHARED-KNOWLEDGE-GOVERNANCE.md
- [x] https://github.com/ACROWN-System/AstroCrown-Web/tree/main/development/product-memory/ (implemented on the review branch; awaiting merge)
- [x] https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/product-memory/RECORD-GOVERNANCE.md (implemented on the review branch; awaiting merge)
- [x] https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/product-memory/validate.py (implemented; exact-head CI pending)
- [x] https://github.com/ACROWN-System/AstroCrown-Web/tree/main/development/product-memory/tests/ (21+ positive/negative regression tests; exact count to be confirmed by CI)
- [x] https://github.com/ACROWN-System/AstroCrown-Web/blob/main/.github/workflows/product-memory-validation.yml (read-only, path-scoped, SHA-pinned workflow)
- [ ] Product Development Memory pull request — not yet opened

## Navigation-methodology availability finding

The saved continuation material supplied for this work contains the operating principles and the explicit direction to locate and read the canonical `NAVIGATION-PROTOCOL.md` and `NAVIGATION-PLAN-TEMPLATE.md`. However, the complete protocol is a placeholder in the stored continuation file, and the previously referenced `ASDBradford-HAAN/NOVA-Core` repository and its paths now return 404. Current accessible trees for `ACROWN-System/AstroCrown-Web` and `ACROWN-System/NOVA` also do not contain those canonical navigation files.

Therefore this plan does **not** claim that the unavailable canonical protocol/template has been reviewed or that every rule in it has been verified. Execution uses the currently accessible AstroCrown Development & Audit Convention, the documented Active/Completed audit-record structure, and the supplied continuation instructions as a clearly identified fallback. Do not create or modify a substitute Navigation Protocol as part of this objective.

## Initial discoveries, evidence, decisions and actions

### Discovery:

AstroCrown already has dedicated systems for homepage requirements, external verification intelligence, concrete audit activity, prompt methodology and NOVA memory optimization. A new product-memory system must connect to these sources without duplicating them.

#### Evidence:

- `development/index-section/README.md` identifies the active homepage section requirements.
- `development/verification/README.md` identifies the verification-intelligence subsystem and its distinction from audit records.
- `development/audit/README.md` identifies audit records, tests, evidence and templates.
- `development/Prompt-Guide.md` defines prompt construction and evaluation as a separate layer.
- `development/nova-context-memory-optimization/README.md` distinguishes working context, reusable knowledge, task history, decisions, research and verification evidence.
- `development/DEVELOPMENT-AND-AUDIT-CONVENTION.md` requires traceability, evidence states and independent inspection of AI-generated changes.

### Decision:

Create one concise product-memory hub with structured registers and links to existing authoritative records. Do not copy whole audit, verification, homepage, Genesis, account or NOVA records into the new registers.

### Action:

Created this Active Navigation Plan and an additive timestamped backup of the pre-change `development/README.md` at:

`backup/2026.11.20-17h47mn26sc-system/development/README.md`

The source and backup were retrieved from the branch and their contents will be compared during final verification.

---

### Discovery:

Recent conversation proposals include useful product directions but not all are approved product requirements.

#### Evidence:

The owner approved creation of the Product Development Memory. The six service pillars, Living Market Laboratory, Market Time Machine, shareable research, embeddable widgets and other product differentiators were proposed in discussion; these proposals have not all received independent competitive, legal, data, feasibility or cost qualification.

### Decision:

Record the memory system and its quality controls as owner-approved. Preserve all other unapproved ideas with explicit candidate/research-required status. Do not claim that the Living Market Laboratory is globally unique or that any proposed capability is implemented.

### Action:

Seed registers with evidence provenance, status, alternatives, rationale, dependencies, risks and validation conditions. Link back to authoritative sources rather than treating the conversation as a sufficient evidence source.

## Quality gates

- JSON duplicate keys rejected.
- Unknown fields and missing mandatory fields rejected.
- IDs and normalized titles unique within and across registers.
- Every cross-register reference resolves.
- Dependency and supersession graphs are acyclic.
- A candidate/research-required item cannot be silently promoted to approved.
- Approved decisions require explicit owner-approval provenance, evidence, rationale, alternatives and impact analysis.
- External research references include exact URL, publisher/source identity, access date, supported claim and limitations.
- Contradictory or stale records remain visible; no automatic overwrite or silent supersession.
- Deterministic tests cover both valid and deliberately invalid inputs.
- CI uses only Python standard library, pinned actions and read-only permissions.
- Exact PR head and merge result are independently verified.

## IF modified

AstroCrown gains a portable source of product intent and decision rationale, a structured record of what is approved versus merely proposed, and a deterministic quality gate against malformed entries, duplicates, dangling references, dependency loops and decision-history cycles. Future SIs can recover relevant product context from Git without replaying the entire conversational history.

## IF not modified

Product strategy and important design rationale remain fragmented across conversations and subsystem documents. New SIs may repeat research, confuse candidate ideas with approved requirements, lose why alternatives were rejected, introduce duplicate or contradictory entries, or create circular dependencies and regressions.


### Discovery:

PR #191 was verified and merged after review found a material TIP-6963 lifecycle defect. The product-memory branch initially based on the pre-merge main commit would therefore have been one commit behind and could have included the unrelated PR history if merged carelessly.

#### Evidence:

- PR #191 merged as `e1a374fac74d8bc02c33dec8efc25b1c83504c3a` after all five exact-head checks passed.
- The original product-memory branch compared as behind/diverged after that merge.
- The product-memory files were re-created on a new branch directly from the new main commit; the new branch comparison reports 13 intended changed files, 0 commits behind.

### Decision:

Do not merge the old branch. Use `feature/astrocrown-product-development-memory-2026-11-20-v2` based directly on the merged main commit.

### Action:

Recreated the 13 intended product-memory changes on the new branch. Verified the timestamped backup matches the pre-change `development/README.md` byte-for-byte. No Genesis PR files are included in the Product Development Memory diff.

---

### Discovery:

Repository-relative evidence paths must resolve from the repository root rather than from `development/product-memory/` where the JSON registers are stored.

#### Evidence:

The first validator draft used the register directory as the base for resolving repository-relative evidence. Code review identified that this would reject valid paths such as `development/index-section/README.md` during the real CI run.

### Decision:

Separate the register directory from the repository root in the validator. The CLI derives the repository root from the validator's location; unit tests may inject a temporary repository root.

### Action:

Updated the validator and added a positive regression test proving a valid repository-relative file resolves, while the existing negative test continues to reject a missing file.

### Discovery:

The first PR-specific validation runs exposed genuine quality gaps. The initial unit test run failed because the f-string ID regex interpreted the quantifier braces as an f-string expression; once the baseline fixture was brought under the controlled service-pillar taxonomy, this defect was isolated and corrected. The next run passed all unit tests but rejected the committed data because CAP-0011 (embeddable widgets) was not connected to any roadmap work package.

#### Evidence:

- The failing test run showed all four valid fixture IDs rejected, with the fixture's legacy `research` service-pillar value also outside the controlled taxonomy.
- The subsequent run showed 22/22 unit tests passing but the register validator rejecting orphan CAP-0011.
- The fixed exact-head run passed 22/22 tests and register validation after the regex and fixture corrections, and after CAP-0011 was linked to RM-0007.

### Decision:

Do not weaken schema or orphan checks to obtain a green result. Correct the validator bug, align the fixture to the approved taxonomy, and connect the orphan capability to its actual roadmap package.

### Action:

Applied the regex quantifier fix, changed the fixture to `research_discovery`, linked CAP-0011 to the developer/integration roadmap package RM-0007, and confirmed the dedicated workflow passed.

---

### Discovery:

Further source review identified edge cases not represented in the first fixtures: non-string IDs and status values could reach set operations or membership checks; malformed IPv6-style URLs could raise during hostname parsing; recursive graph traversal could hit Python's recursion limit on very long acyclic chains; and completed states only required some evidence, not evidence of actual repository implementation/testing.

#### Evidence:

The validator source was inspected directly after the 22-test pass. These were code-level findings; they had not all been observed as production failures.

### Decision:

Make validation fail closed for malformed values and malformed URLs, replace recursive cycle traversal with iterative topological validation, and require repository evidence before a capability or roadmap package can be marked completed.

### Action:

Updated `validate.py`, added seven regression tests (29 total), and updated `RECORD-GOVERNANCE.md` to document the additional gates. The new exact-head workflow is pending.
 
---

## Verification and closure

This plan remains ACTIVE until the exact PR head passes all required checks, the full diff has been reviewed, the PR is merged, and the relevant files plus merge commit are independently confirmed on `main`. Any failure remains FAIL or BLOCKED until root cause and corrective verification are recorded.
