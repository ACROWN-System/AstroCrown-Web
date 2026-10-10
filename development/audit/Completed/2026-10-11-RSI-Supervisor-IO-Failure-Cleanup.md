# Completed Navigation Plan — RSI Supervisor I/O Failure Cleanup

**Date:** 2026-10-11  
**Status:** COMPLETED — unexpected output-monitoring failures now trigger bounded termination and independent container cleanup; full independent sandbox approval remains BLOCKED  
**Objective:** Make evaluator output-pipe and timeout-drain failures use the same process-termination and labelled-container cleanup boundary as ordinary timeouts.

## Finding and remediation

Review found two edge cases in the new evaluator supervisor:
1. The repeated-timeout output fallback referenced the first timeout output through a variable that was not bound; it could fail when both timeout exceptions carried no output.
2. An unexpected `OSError` or `ValueError` while communicating with the evaluator could escape without terminating the evaluator process group and verifying container cleanup.

The implementation now explicitly binds the first timeout exception, uses safe captured-output fallbacks, and catches output monitoring failures. On such failure it terminates the evaluator process group, bounds process reaping, independently cleans and verifies all evaluation-labelled containers, and returns FAIL only when cleanup and termination are confirmed. Otherwise it returns BLOCKED.

## Execution outcome

- AstroCrown-Web [PR #76](https://github.com/ACROWN-System/AstroCrown-Web/pull/76) merged as `2dc7f54880c4d9fc5490d59fba9693b7ef52fe68`.
- Tested PR head: `b0558d7854f03e399e5983f3c3cfc1863d542966`.
- GitHub Actions [run #38094680673](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/38094680673/job/114338041663) passed: **96 RSI tests**, compilation, pinned image verification, and the real Docker smoke test.
- Regression tests cover no-output repeated timeouts and output-pipe failure while confirming that cleanup is invoked.

## Impact Analysis

**IF modified:** rare process-monitoring failures no longer bypass bounded process termination and supervisor-level container cleanup.

**IF not modified:** the supervisor could raise unexpectedly or reference missing exception state before cleanup, leaving the outer lifecycle without verified cleanup evidence.

## Residual risks and handoff

These fixes improve fail-closed behavior but do not eliminate Docker daemon/kernel, hostile-host, or image supply-chain risks. Keep RSI readiness `INCOMPLETE`, `promotion.allow_main = false`, and the context-packing profile disabled/unapproved until independent review is evidenced.
