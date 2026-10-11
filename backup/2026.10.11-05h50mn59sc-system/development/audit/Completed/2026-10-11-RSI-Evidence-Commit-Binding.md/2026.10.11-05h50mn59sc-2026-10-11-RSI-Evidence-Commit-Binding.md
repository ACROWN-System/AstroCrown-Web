# Completed Navigation Plan — RSI Evidence Commit and Tree Binding

**Date:** 2026-10-11  
**Status:** COMPLETED — evaluator/cycle commit and tree provenance checks merged; independent security approval remains BLOCKED  
**Objective:** Bind evidence reports to the exact candidate commit and prove the staged retention tree is the same Git tree that the isolated candidate evaluator examined.

## Mission and method

HAAN's [Foundational Mission and Collective Preservation](https://github.com/ACROWN-System/NOVA/blob/main/NOVA/HAAN-FOUNDATIONAL-MISSION-AND-COLLECTIVE-PRESERVATION.md) governs this work. Evidence must describe the exact candidate evaluated, and a retention job cannot infer equivalence only from matching path names.

Method: [AstroCrown Web Development & Audit Convention](../../DEVELOPMENT-AND-AUDIT-CONVENTION.md) and the completed [RSI independent security review](./2026-10-11-RSI-Independent-Security-Review.md).

## Findings and remediation

### RSI-EVIDENCE-001 — Evaluator candidate identity was not independently cross-checked

The cycle report recorded the candidate commit, but the evaluator report did not independently report its own candidate checkout SHA. The verifier could not compare both reports.

**Remediation — PR #81:** evaluator evidence now contains schema version 1 and the full candidate commit SHA on both BLOCKED and normal return paths. The evidence verifier strictly requires integer cycle schema version 3 and evaluator schema version 1, verifies full lowercase commit IDs, and requires evaluator/cycle candidate commit equality.

### RSI-EVIDENCE-002 — Applied retention tree was not compared with the evaluated source tree

The write-capable retention step reapplied the candidate patch and checked paths/modes, but did not compare the resulting index tree with the tree that was tested.

**Remediation — PR #82:** the engine stores the candidate tree SHA in the cycle result; the protected evaluator independently records its tree SHA; the evidence verifier requires exact equality. The retention workflow stages the intended development changes and invokes Git's tree-writing validation before creating the candidate commit. Unstaged changes or a mismatched tree fail closed.

## Execution outcomes

- AstroCrown-Web [PR #81](https://github.com/ACROWN-System/AstroCrown-Web/pull/81) merged as 0d0fce5575a69a92629961934e38da50c7999292.
- CI [run #38095491875](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/38095491875) passed **103 RSI tests**, compilation, pinned-image verification, and actual Docker isolation/finalizer smoke testing.
- AstroCrown-Web [PR #82](https://github.com/ACROWN-System/AstroCrown-Web/pull/82) merged as 92f635b79fe8d981e14c6b085cd30e219ad100bc.
- CI [run #38095741210](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/38095741210) passed **106 RSI tests**, compilation, pinned-image verification, and actual Docker isolation/finalizer smoke testing.
- Tests cover malformed cycle/evaluator schema types, candidate commit/tree mismatches, exact staged-tree reproduction, mismatched staged-tree rejection, and retention workflow ordering.

## Impact Analysis

**IF modified:** evidence packages must bind cycle/evaluator decisions to the same commit/tree, and the actual staged tree in the write-capable retention job must reproduce that tested tree before a candidate commit can be made.

**IF not modified:** reports could agree on paths and a plausible commit ID without proving that the staged source tree being retained was identical to the source tree tested in isolation.

## Remaining limitations

Commit/tree equality is a provenance consistency check, not evidence that the benchmark itself is valid or independent. The manifest is a consistency mechanism, not a cryptographic signature from an independent reviewer. The Docker/kernel/daemon and image supply-chain residual risks remain open. Full independent security approval remains BLOCKED.

## Handoff

Keep implementation_readiness.status = INCOMPLETE, promotion.allow_main = false, and the context-packing profile disabled/unapproved. Do not promote this subsystem based solely on these code/tests or registry state strings.
