# RSI Workflow Cleanup Finalizer — Navigation Plan

**Date:** 2026-10-11  
**Status:** ACTIVE — same-job finalizer and regression tests under verification  
**Objective:** Provide a last-resort, same-runner cleanup step after the RSI engine process fails, times out, or is cancelled, so cleanup does not depend exclusively on Python process handlers.

## Mission and method

HAAN's [Foundational Mission and Collective Preservation](https://github.com/ACROWN-System/NOVA/blob/main/NOVA/HAAN-FOUNDATIONAL-MISSION-AND-COLLECTIVE-PRESERVATION.md) governs this work. If the workflow loses certainty about residual sandbox resources, it must report failure rather than silently accept a potentially unclean runtime.

Method: [AstroCrown Web Development & Audit Convention](../../DEVELOPMENT-AND-AUDIT-CONVENTION.md) and the completed [RSI evaluator supervisor cleanup](../Completed/2026-10-11-RSI-Evaluator-Supervisor-Cleanup.md).

## Finding

The evaluator supervisor can clean up on normal exit, outer timeout, and ordinary monitoring errors. But if the entire RSI engine step or job is terminated externally, Python finalization handlers and the in-process supervisor may never execute. The workflow previously had no separate step to inspect and remove containers from that evaluation on the same runner.

## Scope

1. Generate a unique 32-character evaluation ID in an early workflow step and persist it through `GITHUB_ENV`.
2. Reuse that workflow-provided ID in `rsi_engine.py`; direct local calls without a provided ID continue to generate their own unique ID.
3. Label all sandbox containers for the evaluation with the shared ID.
4. Add a standalone `sandbox_runtime.py --cleanup-evaluation-id ID` CLI path that does not load policy/configuration and does not require provider credentials.
5. Add a same-job `if: always()` finalizer after the engine step and before evidence upload, with an explicit job-step timeout. Missing ID means the engine could not have started and is handled as a non-error; present but uncleanable labelled containers must fail the job.
6. Add regression tests for workflow ordering/conditional execution and for invoking cleanup without loading the sandbox policy.
7. Preserve the current permission boundary: this cleanup step has no provider key, GitHub write token, or repository write permissions.

## Out of scope

- Enabling RSI or the context-packing benchmark.
- Increasing workflow permissions or adding secrets.
- Claiming that an always-run step can recover from a destroyed/unavailable runner host; it is a same-runner best-effort finalizer.

## Acceptance criteria

- The generated evaluation ID is available to the engine and cleanup finalizer, but is not passed into the untrusted container environment.
- The finalizer is ordered after the RSI cycle and before evidence upload, uses `if: always()`, and is explicitly time-bounded.
- Cleanup can run without reading `rsi_policy.json`; Docker inspection/removal must be confirmed.
- Workflow regression tests prove ordering, the always condition, bounded timeout and the cleanup CLI invocation.
- RSI CI passes compilation, all tests, immutable image verification and real Docker tests.
- `implementation_readiness.status` remains `INCOMPLETE`, `promotion.allow_main` remains `false`, and the context-packing profile remains disabled/unapproved.
