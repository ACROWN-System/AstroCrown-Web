# Completed Navigation Plan — RSI Evaluator Supervisor Cleanup

**Date:** 2026-10-11  
**Status:** COMPLETED — outer-timeout process-group recovery and evaluation-labelled cleanup merged; independent sandbox approval remains BLOCKED  
**Objective:** Ensure a host-side timeout of the protected evaluator cannot silently leave candidate containers running when the evaluator's own cleanup handler does not complete.

## Mission and method

HAAN's [Foundational Mission and Collective Preservation](https://github.com/ACROWN-System/NOVA/blob/main/NOVA/HAAN-FOUNDATIONAL-MISSION-AND-COLLECTIVE-PRESERVATION.md) governs this work. Uncertain runtime state must produce BLOCKED, not an inferred success.

Method: [AstroCrown Web Development & Audit Convention](../../DEVELOPMENT-AND-AUDIT-CONVENTION.md) and the completed [RSI sandbox cleanup verification](./2026-10-11-RSI-Sandbox-Cleanup-Verification.md).

## Finding and remediation

The outer host process ran the trusted evaluator with a timeout comparable to inner Docker command timeouts. If that outer timeout terminated the evaluator before its in-process cleanup handler finished, the host lacked an independent evaluation-level identifier for locating all containers from that evaluation.

The protected RSI engine now:
- assigns a unique 32-character evaluation identifier to each protected evaluation;
- supplies it only to the trusted evaluator environment;
- adds `nova.rsi.evaluation_id=<id>` to every sandbox container created within that evaluation, in addition to the per-command run ID;
- runs the evaluator in a dedicated process group and kills the group when the host-side timeout fires;
- bounds the second output-drain and process-reap attempts;
- independently searches for all containers carrying the evaluation label, attempts to kill/remove them, and verifies that no container remains;
- returns BLOCKED if process termination or container cleanup cannot be confirmed.

The Docker smoke test also launches a detached evaluation-labelled container and verifies that the supervisor cleanup removes it without relying on the inner cidfile handler.

## Execution outcome

- AstroCrown-Web [PR #75](https://github.com/ACROWN-System/AstroCrown-Web/pull/75) merged as `6889085e80cd08b29ae5924dfce9932e8f0efc2a`.
- Tested code-change commit: `302d6f90b122ee918214a743f93527ec7848e49d`; the later commit only updated the audit plan.
- GitHub Actions [run #38094554904](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/38094554904/job/114337667734) passed: **94 RSI tests**, compilation, pinned image verification, and real Docker isolation/supervisor cleanup.
- The real smoke test reported both `timed-out container was discovered by run label and removed` and `supervisor removed an evaluation-labelled detached container`.

## Impact Analysis

**IF modified:** the trusted outer process can independently find and remove containers after an evaluator timeout, and the cleanup path has bounded waits and an observable postcondition.

**IF not modified:** if the evaluator process were terminated before running its own cleanup, the outer controller could lose track of containers launched during the evaluation and return an ambiguous failure.

## Residual risks and handoff

This improves recovery under the trusted CI runner model; it does not eliminate Docker daemon/kernel compromise, hostile-host risk, or image supply-chain vulnerabilities. Keep RSI readiness `INCOMPLETE`, `promotion.allow_main = false`, and the context-packing benchmark disabled/unapproved until the remaining independent threat-model review is evidenced.
