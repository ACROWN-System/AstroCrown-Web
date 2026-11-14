# Completed Plan — RSI Repeat-State and Cycle Detection

**Status:** COMPLETED — implementation and CI verification passed  
**Date:** 2026-10-11 (Asia/Kolkata)  
**Repository:** `ACROWN-System/AstroCrown-Web`  
**Feature branch:** `rsi/repeat-state-detection-2026-10-11`  
**Pull request:** [#86 — diagnose repeated source states before readiness gate](https://github.com/ACROWN-System/AstroCrown-Web/pull/86)  
**Baseline commit:** `0cb13c88fbd8ba638b408732e5bada548ed45e7b`

## Objective and result

Implemented read-only RSI repeat-state diagnostics before the existing hard implementation-readiness gate. It compares native Git tree/blob IDs from recent scheduled/manual RSI runs on `main`, identifies exact repeated operational state and cycle length, and reports component-level stasis when one or more scopes have not changed.

No new `backup/*-system/` folder was created for this pass; the feature branch and PR retain its full change history.

## Implementation

- Added `development/nova-recursive-self-improvement/cycle_detector.py`.
- Added 11 tracked state scopes: RSI subsystem tree, context/memory subsystem tree, protected engine/evaluator/policy/profile/dispatcher/sandbox/evidence-verifier blobs, and both RSI workflow blobs.
- The diagnostic inspects at most 10 prior scheduled/manual runs on `main`, caches state per unique commit, and compares source scope IDs directly. It does not store a synthetic combined fingerprint.
- A sequence A → B → C → D → B returns `REPEATED_STATE`, the run that repeated, and cycle length 3. An adjacent repeat reports length 1. Component IDs are reported independently even when the full state differs.
- Missing token, API failure, malformed history, missing scopes, invalid IDs, or truncated trees produce `UNAVAILABLE`; that is not interpreted as no cycle.
- The workflow writes a step summary and JSON report before checking readiness. The JSON report is retained for 14 days only when a full-state repeat is detected.
- The diagnostic and report writers are non-blocking: unexpected diagnostic/output errors are reported as `UNAVAILABLE`/warnings and cannot bypass or mask the existing readiness gate.
- Added the detector to `rsi_policy.json` protected paths so future automated candidate patches cannot silently modify it.
- Updated the RSI README and implementation runbook.

## Verification evidence

GitHub Actions run [#38099243699](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/38099243699) completed successfully on PR head `fca22b8e21870976f9deac50274d3c627a1c2d0e`.

- Immutable pinned sandbox image verification: PASS.
- `python -m compileall -q development`: PASS.
- RSI unit-test suite: **120 tests passed**.
- Real Docker isolation smoke test: PASS; log contains `sandbox-smoke-pass`.
- A second run, [#38099240911](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/38099240911), also completed successfully.
- Test coverage includes cycle length 3 for A → B → C → D → B, adjacent repeated state, component-only stasis, malformed and truncated tree handling, filtering recent main-branch workflow runs, use of native Git commit/tree API objects, and non-blocking `UNAVAILABLE` behavior.
- PR diff scope: 7 files at the last CI run, with no backup snapshot changes.
- A source review confirmed the diagnostic precedes the implementation-readiness check and that the check itself remains present and unchanged in behavior.

## Protected boundaries verified

- `implementation_readiness.status` remains `INCOMPLETE`.
- `promotion.allow_main` remains `false`.
- Context-packing benchmark profile remains disabled and unapproved.
- No provider requests, secret changes, billing changes, readiness override, or promotion-authority changes were made.
- Read-only API access was limited to `contents: read` and `actions: read` in the diagnostic job.
- A repeat is evidence of tracked-state recurrence, not evidence that capability improved or degraded.

## Impact analysis

### IF modified

- RSI workflow history provides a direct signal for repeated source states and cycle length without needing a new dated system backup for each pass.
- Component-level stasis can point toward the subsystem that did not change, even when unrelated documentation or files changed.
- Missing history stays explicitly unknown instead of being silently reported as progress.

### IF not modified

- Repeated blocked passes or return-to-prior states would require manual comparison of commits and workflow runs.
- An absent recurrence signal could be mistaken for progress even when the system returned to an earlier operational state.

## Remaining limitation / handoff

- The PR CI proves the diagnostic and tests compile and pass; the live diagnostic step has not yet been observed executing inside a new protected `nova-rsi.yml` run on `main`.
- The autonomous RSI lifecycle remains correctly blocked by the existing `INCOMPLETE` readiness policy and unapproved benchmark/security review gates. This change does not attempt to enable it.
- After merge, the first scheduled/manual protected workflow run will exercise the diagnostic against live workflow history. If the GitHub UI shows an `UNAVAILABLE` result, inspect the reported limitation instead of interpreting it as no cycle.

