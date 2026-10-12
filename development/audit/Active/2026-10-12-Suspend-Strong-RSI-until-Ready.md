# Active Navigation Plan — Suspend Strong RSI Until Fully Operational

**Date:** 2026-10-12  
**Status:** ACTIVE until suspension, regression checks, and documentation are merged.  
**Objective:** Stop all scheduled Strong RSI workflow execution until every prerequisite needed for a genuine, publicly defensible Strong RSI is complete and independently verified.

## Decision

Strong RSI must remain inactive rather than waking monthly only to stop at an INCOMPLETE readiness gate. Preserve its workflow as a dormant template outside `.github/workflows/`; no scheduled or manual GitHub Actions event may invoke it during suspension. Keep implementation code, tests, protected policy, and missing-requirements list for future completion.

## Acceptance criteria

1. `.github/workflows/nova-rsi.yml` is absent from the active workflow directory after merge.
2. The previous full workflow is preserved under `development/nova-recursive-self-improvement/suspended/`, outside GitHub Actions workflow discovery.
3. Tests require the workflow to be inactive and validate the preserved template's monthly schedule, monthly budget, PASS-only candidate retention, and fail-closed gates.
4. Protected policy states `strong_rsi_safety.lifecycle_status = SUSPENDED`; `implementation_readiness.status` stays `INCOMPLETE`.
5. README, implementation runbook, operating modes, automation guide, and audit plan explain that monthly Strong RSI is suspended and may not be presented as operational.
6. Document objective reactivation criteria; do not activate based solely on time passing or a model's own assertions.
7. Weak RSI remains available via its separate manual report-only workflow. It does not confer Strong RSI readiness.
8. Update/delete operations are limited to the single workflow file and relevant tests/policy/docs; do not change active application code or provider routing.
9. Run RSI tests, Python compilation, security checks/CI, and inspect final diff and readiness status.
10. On completion, move this plan into `development/audit/Completed/`.

## Reactivation gates

Before returning any Strong RSI workflow to `.github/workflows/`, require all of the following:
- current protected readiness review approves every mandatory design, implementation, evaluation, and operational component;
- reviewed and explicitly approved provider terms/data-use eligibility for the exact task and data;
- configured repository-scoped Groq key, verified by secret-safe readiness reporting; current provider model/rate limits and cost headroom are documented;
- approved, task-matched, reproducible benchmark with baseline, candidate, corpus and independent review evidence;
- benchmark/evaluator registry approval backed by an actual review trail, not only an approval string;
- verified pinned sandbox and runner threat model, no candidate network/secrets, bounded resources/outputs/time, cleanup evidence, and residual-risk review;
- zero mandatory regressions and strict measurable benchmark improvement against the exact baseline;
- evidence verifier covers complete artifacts/manifest, exact baseline SHA, patch scope and actual post-apply tree;
- candidate retention successfully opens a human-reviewed PR under the least-privilege GitHub App token; direct main writes and auto-merge remain off;
- repository branch protections/required checks and live end-to-end test verified;
- public description is evidence-bounded and does not claim optimality or guaranteed non-degradation beyond the measured workload;
- documented rollback and stop conditions, plus final human release decision.

## Navigation targets

- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/.github/workflows/nova-rsi.yml
- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/nova-recursive-self-improvement/rsi_policy.json
- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/nova-recursive-self-improvement/rsi_engine.py
- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/nova-recursive-self-improvement/evaluator.py
- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/nova-recursive-self-improvement/benchmark_dispatcher.py
- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/nova-recursive-self-improvement/evidence_verifier.py
- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/nova-recursive-self-improvement/sandbox_runtime.py
- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/nova-recursive-self-improvement/GITHUB-AUTOMATION-SETUP.md

## Impact Analysis

**IF modified:** scheduled provider calls and routine runner consumption stop completely; strong mode cannot be mistaken for operational; all design/code/readiness work remains preserved for an evidence-led reactivation.

**IF not modified:** the workflow continues spending runner time each month to produce a blocked result, creating a false appearance of scheduled autonomous operation without meeting the stated Strong RSI objective.

## Verification

- Check active workflow path is absent in the final candidate diff and only the dormant template remains.
- Run the RSI test suite and compile checks; ensure tests no longer rely on the inactive workflow file at its former path.
- Confirm policy readiness is still INCOMPLETE, Strong lifecycle SUSPENDED, Weak workflow still manual-only/read-only.
- Confirm code/telemetry does not invoke Strong RSI from any other workflow.
