# RSI Evidence Commit Binding — Navigation Plan

**Date:** 2026-10-11  
**Status:** ACTIVE — strict evidence schema and candidate-commit binding under verification  
**Objective:** Prevent a write-capable retention verifier from accepting a cycle report and protected evaluator report that refer to different candidate commits or unsupported/malformed schema versions.

## Mission and method

HAAN's [Foundational Mission and Collective Preservation](https://github.com/ACROWN-System/NOVA/blob/main/NOVA/HAAN-FOUNDATIONAL-MISSION-AND-COLLECTIVE-PRESERVATION.md) governs this work. Evidence must be verifiable against the exact candidate that was evaluated; the evidence package cannot authorize itself by merely containing a plausible SHA.

Method: [AstroCrown Web Development & Audit Convention](../../DEVELOPMENT-AND-AUDIT-CONVENTION.md) and the completed [RSI independent security review](../Completed/2026-10-11-RSI-Independent-Security-Review.md).

## Findings

1. The RSI cycle records the candidate commit SHA in `cycle.json`, but the protected evaluator output did not independently record its candidate checkout SHA. The retention verifier therefore could not prove both decisions referred to the same candidate checkout.
2. The evidence verifier checked SHA format and baseline equality, but did not enforce supported schema versions for the cycle and evaluator JSON reports.
3. The manifest already has strict integer schema validation. The cycle/evaluator records should apply the same bool/float-resistant version check.

## Scope

1. Make the protected evaluator emit a schema version and its exact `git rev-parse HEAD` candidate commit on both BLOCKED and regular paths.
2. Require cycle schema version exactly integer 3 and evaluator schema version exactly integer 1; reject booleans, floats, missing values and unsupported versions.
3. Require evaluator candidate commit to be a full 40-character lowercase Git SHA and exactly match the cycle's candidate commit SHA.
4. Add tests for commit mismatch, malformed schema types, and evaluator JSON evidence on both blocked and successful paths.
5. Preserve the existing fail-closed policy, independent-review and retention gates.

## Out of scope

- Changing RSI readiness, promotion permissions, benchmark registry approval, or profile enablement.
- Invoking an AI provider or changing credentials, secrets, billing, or workflow permissions.
- Treating matching commit fields alone as proof that benchmark results are valid; it is one provenance check in a wider evidence contract.

## Acceptance criteria

- Both evaluator return paths include `schema_version: 1` and the exact candidate commit SHA.
- Evidence verification rejects a cycle schema other than integer 3, an evaluator schema other than integer 1, or a mismatch between the cycle and evaluator candidate SHAs.
- Regression tests demonstrate all fail-closed paths and preserve the valid-evidence PASS case.
- Full RSI CI passes compilation, all tests, pinned image verification and real Docker isolation/finalizer smoke tests.
- `implementation_readiness.status` remains `INCOMPLETE`, `promotion.allow_main` remains `false`, and the context-packing profile remains disabled and unapproved.
