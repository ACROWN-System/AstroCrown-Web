# Completed Navigation Plan — RSI Sandbox Cleanup Verification

**Date:** 2026-10-11  
**Status:** COMPLETED — cleanup now requires observable confirmation; full independent sandbox approval remains BLOCKED  
**Objective:** Ensure timeout/output-limit handling checks that the Docker daemon reports no containers left for a sandbox invocation before considering cleanup complete.

## Mission and method

HAAN's [Foundational Mission and Collective Preservation](https://github.com/ACROWN-System/NOVA/blob/main/NOVA/HAAN-FOUNDATIONAL-MISSION-AND-COLLECTIVE-PRESERVATION.md) governs this work. Method: [AstroCrown Web Development & Audit Convention](../../DEVELOPMENT-AND-AUDIT-CONVENTION.md) and [Completed RSI independent security review](./2026-10-11-RSI-Independent-Security-Review.md).

## Findings and remediation

1. Cleanup formerly returned no status and swallowed Docker command errors; timeout/output-limit handling could not distinguish confirmed cleanup from an unresolved container.
2. A valid cidfile caused label discovery to stop early, potentially missing another container carrying the invocation's label.
3. Cleanup now queries the run label even when a cidfile exists, combines IDs found by either mechanism, attempts kill/remove operations, and queries the label again to verify that no containers remain.
4. If Docker inspection fails or a labelled container persists, cleanup returns failure. Timeout and output-limit paths turn that condition into `SandboxUnavailableError`, so the evaluator blocks instead of silently proceeding.

## Execution outcome

- AstroCrown-Web [PR #71](https://github.com/ACROWN-System/AstroCrown-Web/pull/71) merged as `088643ed4b2a984670bfd1eed0009de4f1d8403e`.
- Tested PR head: `58732bb6d86b88c5226a5bfd1623db1a990fcdea`.
- GitHub Actions [run #38093812456](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/38093812456): PASS.
- **85 RSI unit tests passed**; compilation, pinned image verification, and the actual Docker isolation/timeout-cleanup smoke test also passed.
- Regression coverage includes cidfile plus additional labelled containers, missing/malformed cidfiles, persistent containers, and timeout/output-limit fail-closed behavior.
- The production profile remains disabled/unapproved; RSI readiness remains `INCOMPLETE`, and `promotion.allow_main` remains `false`.

## Residual risks

The check proves only what the configured Docker daemon reports for the per-run label. It does not eliminate Docker/kernel/daemon compromise, a hostile host, image supply-chain risks, or every race involving a compromised runtime. Full independent sandbox approval remains BLOCKED.

## Impact Analysis

**IF modified:** timeout/output-limit cleanup has an explicit observable postcondition, and unresolved cleanup blocks evaluation.

**IF not modified:** the evaluator could fail without knowing whether all associated containers were removed, and cidfile presence could hide additional same-run containers.

## Handoff

Keep RSI readiness incomplete and the benchmark disabled until an independently evidenced threat-model review covers the remaining Docker and supply-chain boundaries.
