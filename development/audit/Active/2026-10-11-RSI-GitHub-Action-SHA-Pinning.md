# Completed Audit — Immutable GitHub Actions References

**Date:** 2026-10-11  
**Status:** COMPLETED — this Active-path copy is retained as an archival mirror
**Canonical completed record:** [Completed audit](../Completed/2026-10-11-RSI-GitHub-Action-SHA-Pinning.md)
**Objective:** Reduce tag-movement risk in the RSI workflows by pinning every externally maintained GitHub Action to a full commit SHA verified from that action repository's official Git reference API, while documenting the human-readable release tag.

## Finding RSI-SEC-009

Both RSI workflows currently reference third-party Actions by moving major-version tags (`@v4`, `@v6`). Major tags are convenient but may be moved to new commits without this repository's review. Pinning to immutable full commit SHAs makes the consumed action revision explicit and reviewable.

## Verified refs

Observed on 2026-10-11 via the official GitHub repository refs API:
- `actions/checkout` `v4` → `11d5960a326750d5838078e36cf38b85af677262`
- `actions/setup-python` `v6` → `ece7cb06caefa5fff74198d8649806c4678c61a1`
- `actions/upload-artifact` `v4` → `ea165f8d65b6e75b540449e92b4886f43607fa02`
- `actions/download-artifact` `v4` → `d3f86a106a0bac45b974a628896c90dbdf5c8093`

## Scope

- Replace tag references with the complete commit SHAs above in both `.github/workflows/nova-rsi-ci.yml` and `.github/workflows/nova-rsi.yml`.
- Keep a concise `# vN` comment for discoverability.
- Verify no external action remains tag-pinned in these workflows.
- Run full RSI CI, pinned Docker image checks, and the isolation/timeout-cleanup smoke test.

## Out of scope

- Changing any workflow permissions, secret exposure, trigger conditions, or readiness gates.
- Updating an action to a new version; this change pins the exact commit currently resolved by the tags.
- Enabling RSI or making provider calls.

## Acceptance criteria

- Every external Action in the two RSI workflows uses a full 40-character commit SHA.
- Human-readable release tag comments match the official ref resolved for each SHA.
- All workflow checks pass; readiness remains INCOMPLETE, promotion.allow_main remains false, and the benchmark remains disabled/unapproved.

## Execution outcome

- AstroCrown-Web [PR #68](https://github.com/ACROWN-System/AstroCrown-Web/pull/68) merged as `19442608adb065e92a898aa7ae94e3c58a7496b5`.
- GitHub Actions [run #38090761808](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/38090761808) is the recorded CI evidence for this change.
- `actions/checkout` v4 is pinned to `11d5960a326750d5838078e36cf38b85af677262`.
- `actions/setup-python` v6 is pinned to `ece7cb06caefa5fff74198d8649806c4678c61a1`.
- `actions/upload-artifact` v4 is pinned to `ea165f8d65b6e75b540449e92b4886f43607fa02`.
- `actions/download-artifact` v4 is pinned to `d3f86a106a0bac45b974a628896c90dbdf5c8093`.
- These SHAs matched the official GitHub tag refs queried on 2026-10-11. CI passed compilation, 79 RSI unit tests, pinned-image verification and Docker isolation/timeout-cleanup smoke test.
- Readiness remains `implementation_readiness.status = INCOMPLETE`; `promotion.allow_main = false`; the production benchmark registry remains unapproved and the context-packing profile remains disabled.
- No secrets/credentials, billing, workflow permissions, or provider usage were changed by the reviewed work.

## Impact Analysis

**IF modified:** Workflow files now identify the exact action implementations consumed, rather than relying on mutable major-version tags.

**IF not modified:** the identified trust, credential-egress, quota-accounting, artifact-retention, or supply-chain weakness would remain as documented in the findings above.

## Residual risks and handoff

Pinned commits are not a proof that upstream actions are free of vulnerabilities. Future updates still require ref verification and review of the new commit.

Keep the readiness and benchmark gates closed until all remaining required evidence and independent review gates are satisfied.
