# Completed Navigation Plan — RSI Executable-Mode Consistency

**Date:** 2026-10-11  
**Status:** COMPLETED — evaluator now rejects executable candidate files before recording an evaluation PASS  
**Objective:** Align protected evaluation with the stricter retention check for changed-file executable permission bits.

## Mission and method

HAAN's [Foundational Mission and Collective Preservation](https://github.com/ACROWN-System/NOVA/blob/main/NOVA/HAAN-FOUNDATIONAL-MISSION-AND-COLLECTIVE-PRESERVATION.md) governs this work. Method: [AstroCrown Web Development & Audit Convention](../../DEVELOPMENT-AND-AUDIT-CONVENTION.md).

## Finding and remediation

The evaluator rejected symlinks, non-regular files, and Git mode-change summaries but did not explicitly inspect executable permission bits on a newly added regular file. The later retention verifier independently rejects executable file modes, so a candidate could otherwise receive inconsistent evidence: evaluation PASS followed by retention BLOCKED.

The evaluator's `unsafe_file_types` now rejects changed files with owner, group, or other execute bits. A regression test creates a newly added executable file and proves that filesystem-integrity evaluation reports `executable-mode:<path>`.

## Execution outcome

- AstroCrown-Web [PR #72](https://github.com/ACROWN-System/AstroCrown-Web/pull/72) merged as `866923a9fbcb173ba90adb508048faa4248b2690`.
- Tested PR head: `f41d5b067ee81af61a79b01fc405b8351bfd885f`.
- GitHub Actions [run #38093982235](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/38093982235): PASS.
- **86 RSI unit tests passed**; compilation, pinned image verification, and real Docker isolation/timeout-cleanup smoke testing also passed.
- RSI readiness remains `INCOMPLETE`, `promotion.allow_main` remains `false`, and the benchmark profile remains disabled and unapproved.

## Impact Analysis

**IF modified:** executable-mode candidates are rejected within the evaluator, keeping the evaluation result aligned with the retention boundary.

**IF not modified:** a candidate could appear to pass filesystem-integrity evaluation and only be rejected later by retention, weakening the accuracy of evaluation evidence.

## Handoff

Executable candidate artifacts remain disallowed. No runtime, credentials, provider, or repository-write permissions were changed.
