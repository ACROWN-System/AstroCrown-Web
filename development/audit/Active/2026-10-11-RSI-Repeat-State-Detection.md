# Active Plan — RSI Repeat-State and Cycle Detection

**Status:** ACTIVE  
**Created:** 2026-10-11 06:06 IST (UTC+05:30)  
**Repository:** `ACROWN-System/AstroCrown-Web`  
**Working branch:** `rsi/repeat-state-detection-2026-10-11`  
**Baseline commit:** `0cb13c88fbd8ba638b408732e5bada548ed45e7b`

## Objective

Add a low-cost, read-only diagnostic to RSI workflow runs that compares recent pass states using Git's native tree/blob IDs and explicitly detects repeated states and cycle lengths. The diagnostic must run before the existing implementation-readiness gate, including when RSI is correctly BLOCKED, so blocked/repeated runs produce visible evidence instead of an apparent endless loop.

## Source of truth and constraints

- Follow `development/Prompt-Guide.md`, `development/DEVELOPMENT-AND-AUDIT-CONVENTION.md`, and `development/nova-recursive-self-improvement/IMPLEMENTATION.md`.
- Preserve the current protected readiness state: `implementation_readiness.status = INCOMPLETE`.
- Preserve `promotion.allow_main = false`, the disabled/unapproved context-packing profile, provider/credential configuration, and the once-per-day RSI budget.
- This is diagnostic instrumentation, not authorization to activate RSI or self-approve the evaluator/sandbox.
- Use the feature branch and PR system. Do not create a new `backup/*-system` folder for this pass.

## Approach

1. Compare a bounded number of recent main-branch RSI workflow runs, using read-only Actions/Contents API permissions.
2. For each pass, obtain native Git object IDs for specific scopes: the full RSI subsystem tree, the context/memory-optimization tree, the protected RSI engine/evaluator/policy/profile-registry blobs, and the two RSI workflow blobs.
3. Compare the scope-ID vectors in memory; do not store or substitute a custom combined fingerprint.
4. Report exact whole-scope-vector repetition and per-component repeated IDs, nearest prior run, and cycle length. Label API/data problems as `UNAVAILABLE`; never interpret incomplete history as proof of no cycle.
5. Write a GitHub Actions step summary and JSON report. The diagnostic is warning-only and must not change existing readiness/promotion decisions.
6. Add deterministic tests for A → B → C → D → B, adjacent repeated state, component-only repetition, malformed API/history data, and API failure.
7. Protect the detector from future automated candidate patches. Keep the change narrowly scoped and verify with CI.
8. Move this plan to `Completed/` with exact evidence after checks pass.

## Acceptance criteria

- Recent-pass window is bounded (default 10 prior runs) to limit API cost.
- Comparisons use native object IDs of the declared scopes; timestamps and run IDs are metadata, not state identity.
- Sequence A → B → C → D → B identifies the repeat of B and cycle length 3.
- One identical state on consecutive runs identifies cycle length 1 without claiming benchmark quality regressed.
- Per-scope repeats can be reported even if another scope changed.
- Missing token, API throttling, missing commit/tree, malformed history, or truncated trees yield `UNAVAILABLE` and an explicit limitation, not a false `NEW_STATE`.
- Existing readiness gate remains hard-fail/blocked as before; diagnostics cannot authorize any downstream job.
- Automated RSI candidates cannot modify the detector.
- CI passes; no provider API call or secret value is needed for this diagnostic.

## Impact analysis

### IF modified

- Repeated or cycling RSI states become visible from workflow summaries even when implementation readiness remains BLOCKED.
- Investigation can target the earliest repeated run and the scopes that did not change.
- Branch/PR testing remains the delivery path; no backup duplication is required for each iteration.

### IF not modified

- Repeated workflow passes can continue producing similar BLOCKED results without an explicit local cycle analysis.
- Operators would need to manually compare source trees and recent run history to notice a return to an earlier state.

## Execution

- [x] Inspect main baseline, readiness policy, workflow, previous audit records, and current CI.
- [x] Create an isolated feature branch from the merged baseline.
- [ ] Implement the detector, tests, workflow step, and protection/documentation.
- [ ] Run deterministic tests and full RSI CI.
- [ ] Verify exact PR diff, unchanged readiness/benchmark gates, and read-only diagnostic behavior.
- [ ] Move to `Completed/`, open a PR, review CI, and merge if all checks pass.

## Explicit stop conditions

Stop before activation or promotion if the diagnostic would require broader token permissions, mutable external state, a secret-provider call, changing readiness, or weakening a protected gate. Report those as BLOCKED rather than bypassing them.
