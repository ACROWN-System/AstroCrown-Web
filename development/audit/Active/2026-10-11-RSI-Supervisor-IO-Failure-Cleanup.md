# RSI Supervisor I/O Failure Cleanup — Navigation Plan

**Date:** 2026-10-11  
**Status:** ACTIVE — unexpected supervisor-I/O failure paths under verification  
**Objective:** Ensure evaluator stdout/pipe failures cannot bypass process termination, evaluation-container cleanup, or bounded failure reporting.

## Mission and method

HAAN's [Foundational Mission and Collective Preservation](https://github.com/ACROWN-System/NOVA/blob/main/NOVA/HAAN-FOUNDATIONAL-MISSION-AND-COLLECTIVE-PRESERVATION.md) governs this work. If the trusted evaluator cannot be monitored, the result must be FAIL after confirmed cleanup or BLOCKED when termination/cleanup is uncertain.

Method: [AstroCrown Web Development & Audit Convention](../../DEVELOPMENT-AND-AUDIT-CONVENTION.md) and the [RSI evaluator supervisor cleanup plan](./2026-10-11-RSI-Evaluator-Supervisor-Cleanup.md).

## Findings

1. The secondary timeout-drain branch referenced the first timeout exception's output as `exc.output` without binding that exception name. It could fail when both timeout exceptions carried no output, before cleanup was reached.
2. An unexpected `OSError` or `ValueError` while reading the evaluator's output could escape the supervisor without terminating the process group or removing evaluation-labelled containers.
3. Bounded termination and cleanup must run even when evaluator output cannot be read; uncertainty must return BLOCKED, not wait indefinitely.

## Scope

1. Bind the first timeout exception explicitly and use its captured output only as a safe fallback.
2. Add an exception path for supervisor pipe/monitoring errors that kills the process group, bounds process wait/reap, and independently verifies evaluation-container cleanup.
3. Return FAIL only if process termination and container cleanup are confirmed; otherwise return BLOCKED.
4. Add regression tests for two timeout exceptions with no captured output and for a simulated output-pipe failure.
5. Preserve readiness and benchmark gates.

## Acceptance criteria

- No timeout branch references an unbound exception variable.
- Repeated timeout while draining output remains bounded and still invokes cleanup.
- An output-pipe error invokes process-group termination and label-based cleanup.
- Unconfirmed termination or cleanup returns BLOCKED.
- RSI CI passes compilation, all tests, pinned image verification, and actual Docker smoke testing.
- Readiness remains INCOMPLETE, `promotion.allow_main` remains false, and the context-packing profile remains disabled/unapproved.
