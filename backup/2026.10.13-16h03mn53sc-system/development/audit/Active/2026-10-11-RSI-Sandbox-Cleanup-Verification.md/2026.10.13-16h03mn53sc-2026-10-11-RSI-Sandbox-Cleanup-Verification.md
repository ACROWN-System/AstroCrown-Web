# Completed Navigation Plan — RSI Sandbox Cleanup Verification

**Canonical completed record:** [Completed cleanup verification](../Completed/2026-10-11-RSI-Sandbox-Cleanup-Verification.md)

**Date:** 2026-10-11  
**Status:** COMPLETED — this Active-path copy is retained as an archival mirror; independent sandbox approval remains BLOCKED  
**Objective:** Ensure timeout/output-limit handling not only attempts to remove candidate containers, but also checks the Docker daemon reports no containers left for the invocation before considering cleanup complete.

## Mission and method

HAAN's [Foundational Mission and Collective Preservation](https://github.com/ACROWN-System/NOVA/blob/main/NOVA/HAAN-FOUNDATIONAL-MISSION-AND-COLLECTIVE-PRESERVATION.md) governs this work. Secure experimentation is a means serving the mission, not permission to accept unknown runtime state.

Method: [AstroCrown Web Development & Audit Convention](../../DEVELOPMENT-AND-AUDIT-CONVENTION.md) and the [RSI independent security review](../Completed/2026-10-11-RSI-Independent-Security-Review.md).

## Findings

1. Cleanup previously returned no status; Docker failures and timeouts could be swallowed while the evaluator proceeded with only the original timeout/output-limit result.
2. If a valid cidfile existed, cleanup stopped label discovery early, potentially overlooking another container carrying the same run label.
3. A successful cleanup decision needs an observable postcondition: Docker can query the unique run label and returns an empty set.

## Scope

1. Query all containers by the unique per-run label even when a cidfile is present.
2. Attempt kill/remove operations for all discovered IDs, using repeated checks to tolerate asynchronous removal.
3. Return an explicit cleanup success only when the Docker daemon confirms no containers remain for that label.
4. Convert an unconfirmed cleanup into `BLOCKED` via `SandboxUnavailableError` on both timeout and output-limit termination.
5. Add tests for cidfile plus additional labelled containers, absent/malformed cidfiles, persistent leftover containers, and timeout/output-limit fail-closed behavior.
6. Preserve current readiness and promotion safeguards. No provider calls, secret/billing changes, or workflow permission changes.

## Out of scope

- Claiming a Docker container eliminates kernel/daemon escape risk.
- Enabling any benchmark profile or changing RSI readiness.
- Broad changes to the retention workflow or credential boundary.

## Execution outcome

- AstroCrown-Web [PR #71](https://github.com/ACROWN-System/AstroCrown-Web/pull/71) merged as `088643ed4b2a984670bfd1eed0009de4f1d8403e`.
- GitHub Actions [run #38093812456](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/38093812456) passed: 85 RSI unit tests, compilation, pinned image verification, and real Docker isolation/timeout-cleanup smoke test.
- Residual Docker/kernel/daemon risks remain; readiness remains INCOMPLETE and the benchmark remains disabled/unapproved.

## Acceptance criteria

- Cleanup inspects the run label even with a valid cidfile.
- All discovered IDs are stopped/removed and a follow-up query is made.
- Inspection failure or a remaining run-labelled container makes cleanup return failure.
- Timeout and output-limit paths raise a blocking error when cleanup cannot be confirmed.
- RSI CI passes compilation, all unit tests, pinned image verification, and the actual Docker smoke test.
- Audit status distinguishes automated cleanup verification from independent sandbox approval.
