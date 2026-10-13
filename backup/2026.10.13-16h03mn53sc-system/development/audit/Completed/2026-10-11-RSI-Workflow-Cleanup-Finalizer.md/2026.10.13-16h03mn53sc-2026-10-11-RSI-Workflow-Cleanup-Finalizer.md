# Completed Navigation Plan — RSI Workflow Cleanup Finalizer

**Date:** 2026-10-11  
**Status:** COMPLETED — same-job cleanup finalizer and exact CLI smoke test merged; independent sandbox approval remains BLOCKED  
**Objective:** Provide a last-resort, same-runner cleanup step after the RSI engine process fails, times out, or is cancelled, without relying solely on Python handlers.

## Mission and method

HAAN's [Foundational Mission and Collective Preservation](https://github.com/ACROWN-System/NOVA/blob/main/NOVA/HAAN-FOUNDATIONAL-MISSION-AND-COLLECTIVE-PRESERVATION.md) governs this work. If the workflow loses certainty about residual sandbox resources, it must report failure rather than silently accept a potentially unclean runtime.

Method: [AstroCrown Web Development & Audit Convention](../../DEVELOPMENT-AND-AUDIT-CONVENTION.md) and the completed [RSI evaluator supervisor cleanup](./2026-10-11-RSI-Evaluator-Supervisor-Cleanup.md).

## Finding and remediation

The evaluator supervisor can clean up on normal exit, outer timeout, and ordinary monitoring errors. But if the entire RSI engine step or job is terminated externally, Python finalization handlers and the in-process supervisor may never execute. The workflow previously had no separate step to inspect and remove containers from that evaluation on the same runner.

The merged change:
- generates a unique 32-character evaluation ID early in the RSI job and persists it in `GITHUB_ENV`;
- makes `rsi_engine.py` reuse that ID, so the engine, evaluator, inner sandbox and workflow finalizer share one label;
- adds a standalone `sandbox_runtime.py --cleanup-evaluation-id ID` entry point that does not read the sandbox policy or require provider credentials;
- adds a same-job `if: always()` cleanup step after the RSI cycle and before evidence upload;
- sets the cycle step timeout to 21 minutes and the overall job timeout to 25 minutes, preserving time for a three-minute cleanup step and the evidence upload;
- makes failure to confirm removal fail the job rather than passing silently.

## Execution outcome

- AstroCrown-Web [PR #79](https://github.com/ACROWN-System/AstroCrown-Web/pull/79) merged as `ff1938cd1b1dc1c3a6b98053729d4c4bb19c1f6a`.
- Tested code-change commit: `626cdef823567cb616a2b9158d9735a11391830b`.
- GitHub Actions [run #38095114681](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/38095114681) passed **98 RSI unit tests**, compilation, pinned image digest/image ID verification, and the real Docker isolation smoke test.
- The real smoke test started a detached evaluation-labelled container, invoked the same standalone cleanup CLI the workflow finalizer invokes, required structured success, and independently verified the evaluation label inventory was empty.
- Workflow regression tests confirm the cleanup finalizer ordering, `if: always()`, 3-minute step deadline, 21-minute cycle deadline and 25-minute job deadline.
- The separate autonomous RSI workflow was not activated; its protected readiness gate remains INCOMPLETE.

## Impact Analysis

**IF modified:** the same workflow job has an independent last-resort cleanup attempt after ordinary cycle failure/cancellation, including when the Python supervisor did not get to run its handlers. A cycle-step timeout leaves bounded time for cleanup.

**IF not modified:** cleanup relied exclusively on Python handlers. If the engine step was terminated outside its handled exceptions, evaluation-labelled containers could remain without a same-job finalizer. A job-level timeout equal to the cycle timeout could also prevent subsequent cleanup from getting execution time.

## Residual risks and handoff

This remains a same-runner best-effort finalizer. It cannot recover if the entire runner host is destroyed or becomes unreachable, and it still relies on the Docker daemon accurately reporting container state.

Keep RSI readiness `INCOMPLETE`, `promotion.allow_main = false`, and the context-packing benchmark disabled/unapproved until the remaining independent benchmark, evaluator and sandbox threat-model review is evidenced.
