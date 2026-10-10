# RSI Evaluator Executable-Mode Consistency — Navigation Plan

**Date:** 2026-10-11  
**Status:** ACTIVE — targeted filesystem-integrity consistency fix  
**Objective:** Ensure protected evaluation rejects candidate files with executable permission bits at evaluation time, matching the write-capable retention verifier.

## Mission and method

HAAN's [Foundational Mission and Collective Preservation](https://github.com/ACROWN-System/NOVA/blob/main/NOVA/HAAN-FOUNDATIONAL-MISSION-AND-COLLECTIVE-PRESERVATION.md) governs this work. An evaluation PASS must reflect the same mandatory filesystem constraints enforced before a candidate is retained.

Method: [AstroCrown Web Development & Audit Convention](../../DEVELOPMENT-AND-AUDIT-CONVENTION.md) and the completed [RSI security review](../Completed/2026-10-11-RSI-Independent-Security-Review.md).

## Finding

The evaluator's filesystem-integrity check rejected symlinks, non-regular files, and Git mode-change summaries, but its per-file filesystem check did not reject executable permission bits on a newly added file. The retention verifier separately rejects executable modes. Consequently, an executable new file could produce inconsistent evidence: evaluator results could say PASS, while retention correctly blocked it.

This is a consistency and evidence-quality issue. It does not bypass the write-capable retention verifier.

## Scope

1. Reject any changed regular file whose owner/group/other execute bit is set.
2. Add a deterministic regression test using a newly added executable file.
3. Preserve candidate scope, protected policy, readiness, and promotion gates.

## Out of scope

- Supporting executable candidates.
- Changing retention rules or repository permissions.
- Activating RSI or modifying credentials, billing, or provider settings.

## Acceptance criteria

- Executable changed paths are reported as filesystem-integrity findings.
- A regression test proves the evaluator rejects an executable new file even when Git summary says only `create mode 100755`.
- The RSI CI suite passes, including compilation, full tests, pinned image verification, and the Docker smoke test.
- RSI readiness remains `INCOMPLETE`, `promotion.allow_main` remains `false`, and the benchmark remains disabled/unapproved.
