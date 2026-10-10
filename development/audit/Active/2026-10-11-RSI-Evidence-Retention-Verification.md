# Completed Audit — RSI Evidence Verification Before Candidate Retention

**Date:** 2026-10-11  
**Status:** COMPLETED — this Active-path copy is retained as an archival mirror
**Canonical completed record:** [Completed audit](../Completed/2026-10-11-RSI-Evidence-Retention-Verification.md)
**Objective:** Prevent the privileged candidate-retention job from applying an unchecked or inconsistent artifact, and independently repeat candidate path/filesystem validation before opening a PR.

## Finding RSI-SEC-008

The write-capable `retain-qualified-candidate` job downloads `.rsi-evidence`, applies `candidate.patch`, stages all of `development/`, commits, pushes and opens a PR. The engine emits a SHA-256 manifest, but the retention job does not currently verify it. It also does not independently validate the downloaded patch and resulting worktree before staging. Although the upstream evaluator is the primary gate, the privileged retention boundary should not rely solely on an artifact transfer and a prior-job decision.

## Scope

- Add a protected evidence verifier that validates manifest schema, exact file inventory, file hashes, cycle and evaluator PASS decisions, baseline consistency, candidate payload, and protected patch scope/content.
- Revalidate applied worktree paths and file types using Git status after patch application, including newly added/untracked files.
- Run verification before patch application and again after application but before staging/commit.
- Set `persist-credentials: false` on the retention job checkout so repository credentials are not written to Git configuration before validation.
- Add deterministic unit tests for valid evidence, altered/missing files, missing hashes, non-PASS evidence, mismatched baseline, protected paths, unexpected files, and applied-worktree drift.
- Keep RSI blocked until readiness is legitimately changed through independent approval; this work does not change readiness or credentials.

## Acceptance criteria

- Retention fails before `git apply` if manifest integrity or decision/evidence checks fail.
- Retention fails before `git add`/commit if applied paths differ from the verified patch, are protected, deleted, symlinked or otherwise unsafe.
- All unit tests, compilation, pinned image verification, and Docker isolation smoke test pass.
- `implementation_readiness.status` stays INCOMPLETE, `promotion.allow_main` stays false, and the context-packing profile stays disabled/unapproved.

## Execution outcome

- AstroCrown-Web [PR #67](https://github.com/ACROWN-System/AstroCrown-Web/pull/67) merged as `25cf777fc045744eb9b6a77e39b0ff62c0a80ed7`.
- GitHub Actions [run #38090672817](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/38090672817) is the recorded CI evidence for this change.
- Protected `evidence_verifier.py` checks the exact evidence inventory, SHA-256 hashes, cycle/evaluator PASS decisions, baseline consistency, candidate payload, patch scope/content, required evaluator checks, usage telemetry, and cycle budget.
- The write-capable retention job verifies the artifact before introducing its `GH_TOKEN`; after applying the patch it rechecks the actual worktree paths and filesystem types before staging.
- Retention checkout disables persisted Git credentials. Patch application uses `git apply --check` and `git diff --check`.
- A real unified-diff parser defect was found and fixed: `changed_paths_from_patch` strips `a/` and `b/` prefixes and ignores `/dev/null`, while preserving traversal as unsafe.
- CI passed compilation, 79 RSI unit tests, immutable Docker image verification, and Docker isolation/timeout-cleanup smoke test.
- Readiness remains `implementation_readiness.status = INCOMPLETE`; `promotion.allow_main = false`; the production benchmark registry remains unapproved and the context-packing profile remains disabled.
- No secrets/credentials, billing, workflow permissions, or provider usage were changed by the reviewed work.

## Impact Analysis

**IF modified:** The privileged retention boundary now independently validates evidence and the actual patched worktree instead of relying only on the upstream pass result.

**IF not modified:** the identified trust, credential-egress, quota-accounting, artifact-retention, or supply-chain weakness would remain as documented in the findings above.

## Residual risks and handoff

The SHA-256 manifest checks content against its entries but is not a digital signature authenticating the producer. Confidence still depends on the trusted workflow, restricted job permissions, GitHub artifact handling, and isolated earlier evaluation. The retention stage remains unreachable while readiness is INCOMPLETE.

Keep the readiness and benchmark gates closed until all remaining required evidence and independent review gates are satisfied.
