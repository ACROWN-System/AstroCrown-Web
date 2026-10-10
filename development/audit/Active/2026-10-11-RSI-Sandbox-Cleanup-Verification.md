# RSI Sandbox Cleanup Verification — Navigation Plan

**Date:** 2026-10-11  
**Status:** ACTIVE — cleanup confirmation and failure-path tests under review  
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

## Acceptance criteria

- Cleanup inspects the run label even with a valid cidfile.
- All discovered IDs are stopped/removed and a follow-up query is made.
- Inspection failure or a remaining run-labelled container makes cleanup return failure.
- Timeout and output-limit paths raise a blocking error when cleanup cannot be confirmed.
- RSI CI passes compilation, all unit tests, pinned image verification, and the actual Docker smoke test.
- Audit status distinguishes automated cleanup verification from independent sandbox approval.
