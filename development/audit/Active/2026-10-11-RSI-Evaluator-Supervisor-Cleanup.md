# RSI Evaluator Supervisor Cleanup — Navigation Plan

**Date:** 2026-10-11  
**Status:** ACTIVE — outer-timeout recovery implementation under verification  
**Objective:** Ensure a host-side timeout of the protected evaluator does not prevent Docker cleanup from running. Tag every candidate container with a unique outer evaluation identifier, terminate the evaluator process group on timeout, and have the outer supervisor independently remove/verify all containers tagged to that evaluation.

## Mission and method

HAAN's [Foundational Mission and Collective Preservation](https://github.com/ACROWN-System/NOVA/blob/main/NOVA/HAAN-FOUNDATIONAL-MISSION-AND-COLLECTIVE-PRESERVATION.md) governs this work. Uncertain runtime state must produce BLOCKED, not an inferred success.

Method: [AstroCrown Web Development & Audit Convention](../../DEVELOPMENT-AND-AUDIT-CONVENTION.md) and the completed [RSI cleanup verification review](../Completed/2026-10-11-RSI-Sandbox-Cleanup-Verification.md).

## Finding

The outer trusted process used a host `subprocess.run(timeout=...)` with a timeout similar to the inner Docker command timeout. If the outer timeout fired, the host could terminate the evaluator before its in-process `run_sandboxed` timeout handler completed. The outer layer did not have a stable label to find every container created in that evaluation. This can leave the outer control process uncertain about residual containers after evaluation termination.

## Scope

1. Assign a unique full evaluation identifier before launching the protected evaluator.
2. Supply it only to the trusted evaluator environment; the Docker adapter adds `nova.rsi.evaluation_id=<id>` to each sandbox container without exposing the identifier as a candidate-chosen setting.
3. Run the evaluator in a dedicated process group. On outer timeout, terminate the group, then use an independent Docker-label cleanup routine.
4. Make cleanup enumerate all containers with that evaluation label, kill/remove discovered IDs, and verify that none remain. Any uncertainty returns BLOCKED.
5. Use a brief bounded discovery grace for the outer supervisor to catch delayed container creation.
6. Add unit tests for process-group timeout handling, cleanup failure, normal-exit cleanup uncertainty, environment-to-label propagation, and multiple evaluation-labelled containers.
7. Extend the real Docker smoke test to launch a detached evaluation-labelled container and prove supervisor cleanup removes it without relying on the per-container cidfile handler.
8. Keep readiness and promotion gates unchanged.

## Out of scope

- Enabling RSI or the context-packing benchmark.
- Calling any external provider or changing credentials, secrets, billing, or workflow permissions.
- Claiming this removes Docker daemon/kernel or image supply-chain risks.

## Acceptance criteria

- Every Docker sandbox launched by the protected evaluator carries the unique outer evaluation ID label.
- The supervisor kills the evaluator process group on timeout and invokes independent label cleanup.
- Any persistent or uninspectable evaluation-labelled container makes cleanup return BLOCKED.
- The actual Docker CI smoke test verifies supervisor cleanup on a detached container as well as existing timeout cleanup.
- RSI CI passes compilation, all tests, pinned image verification, and the real Docker smoke test.
- `implementation_readiness.status` remains `INCOMPLETE`, `promotion.allow_main` remains `false`, and the benchmark remains disabled/unapproved.
