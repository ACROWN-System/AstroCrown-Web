# RSI Evidence Artifact Verification Before Candidate Retention

**Date:** 2026-10-11  
**Status:** ACTIVE — verify evidence package and revalidate candidate patch in the write-capable job  
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
