# Bind RSI Retention Evidence to the Exact Workflow Baseline

**Date:** 2026-10-11  
**Status:** ACTIVE — require exact baseline commit before privileged patch application  
**Objective:** Ensure the privileged retention job only applies an artifact whose evaluator cycle used the exact Git commit selected by the trusted workflow run.

## Finding RSI-SEC-010

The evidence verifier checks that the cycle baseline equals the baseline recorded by its evaluator evidence, but it does not compare either value with the actual `GITHUB_SHA` selected by the workflow run. A self-consistent artifact could therefore describe a different baseline from the one on which the privileged retention job applies the patch. `git apply --check` and path-set validation are useful, but they do not establish that the candidate was evaluated against the same commit.

## Scope

- Require an explicit expected baseline SHA in the evidence verifier.
- Reject missing, malformed, or mismatched baseline values before patch application.
- Pass `GITHUB_SHA` to both the pre-apply and post-apply verifier calls.
- Update verifier tests to supply the trusted expected baseline and add tests for missing/invalid/mismatched baseline values.
- Document the exact-baseline requirement.

## Acceptance criteria

- No retention verification passes without the explicit expected 40-character lowercase baseline SHA.
- Cycle baseline, evaluator baseline, and workflow expected baseline must agree.
- Both verifier invocations in the retention job use the same `GITHUB_SHA`.
- RSI CI passes compilation, all tests, pinned-image checks, and Docker isolation/timeout-cleanup smoke test.
- Readiness remains INCOMPLETE and main promotion stays disabled.
