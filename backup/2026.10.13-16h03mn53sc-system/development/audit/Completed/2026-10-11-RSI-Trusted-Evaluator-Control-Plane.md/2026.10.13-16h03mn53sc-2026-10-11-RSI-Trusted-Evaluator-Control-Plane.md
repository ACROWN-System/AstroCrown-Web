# Completed Audit — Trusted RSI Evaluator and Main-Ref Guard

**Date:** 2026-10-11  
**Status:** COMPLETED — trusted control-plane separation and main-ref guard merged; broader independent sandbox review remains BLOCKED
**Objective:** Ensure candidate-controlled source cannot supply the evaluator/dispatcher/sandbox implementation that judges it, and ensure the credential-bearing autonomous RSI workflow only runs from the protected main branch.

## Mission and source of truth

HAAN's foundational mission remains governing context. RSI is a means; it must not gain the ability to redefine its own acceptance boundary.

Method: `development/DEVELOPMENT-AND-AUDIT-CONVENTION.md`, the protected RSI implementation runbook, and existing evaluator/security tests.

## Findings

1. **RSI-SEC-003 — Evaluator code is loaded from the candidate worktree.** The engine creates a detached candidate worktree and then invokes `evaluator.py` located inside that same worktree. Path validation is intended to prevent evaluator modification, but this unnecessarily makes control-plane integrity depend on validation of candidate-supplied patch paths. The protected evaluator, dispatcher and sandbox adapter should instead be copied from the trusted baseline checkout to a separate host-side control directory; the candidate repository remains only the inspected/evaluated subject.
2. **RSI-SEC-004 — Manual workflow dispatch can select a non-main branch.** The autonomous workflow has `workflow_dispatch` and injects a provider credential in later jobs. The readiness job chain does not explicitly require the protected main ref. A future accidental or malicious dispatch from a branch could run that branch's workflow definition and repository code against configured credentials if its policy were changed.

## Scope

- Copy the trusted evaluator, benchmark dispatcher, and sandbox adapter from the engine's trusted checkout to a separate control directory outside the candidate worktree.
- Pass the trusted policy and benchmark profile registry explicitly to the evaluator; never source the registry or policy from candidate-controlled files for the evaluation decision.
- Retain candidate worktree as evaluator input and ensure the Docker sandbox only receives that worktree as its workspace mount.
- Add tests for the trusted control-file path/source selection and preserve existing evaluator protections.
- Add a main-ref condition to the first job in the RSI workflow so the dependency chain skips all subsequent jobs on other refs.
- Document residual risks and test evidence in a completed audit entry after CI passes.

## Out of scope

- Setting RSI readiness to READY.
- Enabling a benchmark profile or approving the context-packing workload.
- Modifying provider secrets, credentials, billing, branch protections, or workflow permissions.
- Claiming that the new separation resolves all Docker/kernel or GitHub Actions supply-chain risks.

## Acceptance criteria

- Evaluator, dispatcher, sandbox runtime, policy, and profile registry used for a cycle are loaded from the trusted repository checkout, not the candidate worktree.
- Candidate code and benchmark continue to execute only in the Docker sandbox with no host fallback.
- Non-main `workflow_dispatch` runs are blocked before the provider-secret boundary.
- All unit tests, compilation, immutable-image validation and Docker isolation/timeout-cleanup smoke tests pass.
- Readiness stays INCOMPLETE; `promotion.allow_main` stays false; the production benchmark registry/profile stay unapproved and disabled.

## Execution outcome

- AstroCrown-Web [PR #64](https://github.com/ACROWN-System/AstroCrown-Web/pull/64) merged as `f0d302429bc4a4c2270acaff48e66290d9c3d884`.
- GitHub Actions [run #38089860304](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/38089860304) is the recorded CI evidence for this change.
- Protected evaluator, dispatcher, sandbox adapter, RSI policy, and benchmark registry are copied from the trusted checkout to a separate control directory outside the candidate worktree.
- The evaluator receives explicit paths for trusted policy and benchmark registry.
- The workflow's first job requires `github.ref == 'refs/heads/main'`, so dependent credential-bearing jobs do not proceed for non-main dispatches.
- CI passed compilation, 58 RSI unit tests, pinned-image verification, and Docker isolation/timeout-cleanup smoke tests.
- Readiness remains `implementation_readiness.status = INCOMPLETE`; `promotion.allow_main = false`; the production benchmark registry remains unapproved and the context-packing profile remains disabled.
- No secrets/credentials, billing, workflow permissions, or provider usage were changed by the reviewed work.

## Impact Analysis

**IF modified:** Separating the control-plane files prevents the evaluated candidate worktree from supplying the evaluator and benchmark policy that judge it. The main-ref guard prevents feature-branch workflow definitions from proceeding toward the provider-secret boundary.

**IF not modified:** The evaluator acceptance boundary would continue to depend unnecessarily on candidate patch validation, and non-main workflow dispatch would still lack the early main-ref guard.

## Residual risks and handoff

This is not a third-party security certification. Docker daemon/kernel risks, GitHub Actions supply-chain risk, and broader evaluator integration still need independent review.

Keep the readiness and benchmark gates closed until all remaining required evidence and independent review gates are satisfied.
