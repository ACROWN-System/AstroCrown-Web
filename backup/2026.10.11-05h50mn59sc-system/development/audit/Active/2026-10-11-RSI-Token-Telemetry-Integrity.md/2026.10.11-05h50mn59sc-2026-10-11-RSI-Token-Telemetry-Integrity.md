# Completed Audit — RSI Token Usage Telemetry Integrity

**Date:** 2026-10-11  
**Status:** COMPLETED — this Active-path copy is retained as an archival mirror
**Canonical completed record:** [Completed audit](../Completed/2026-10-11-RSI-Token-Telemetry-Integrity.md)
**Objective:** Ensure malformed, negative, non-integral, or internally inconsistent token usage cannot be normalized into apparently valid quota telemetry.

## Finding RSI-SEC-007

The proposer engine currently converts any numeric provider token field with `int(value)`. This accepts booleans as integers, truncates fractional values, accepts negative counts, and does not check whether `total_tokens` matches the reported prompt and completion counts. The cycle budget relies on this value to enforce its maximum reported-token budget; invalid telemetry must therefore be treated as unavailable so the existing required-telemetry gate blocks the cycle.

## Scope

- Accept only nonnegative integer token counts; explicitly reject booleans and fractional values.
- If a provider supplies malformed fields, treat the entire usage record as unavailable rather than partially trusting it.
- Derive total usage only when prompt and completion counts are both present.
- When all three counts are present, require total = prompt + completion.
- Reject a reported total of zero for an actual proposer request.
- Add deterministic tests for negative, boolean, fractional, inconsistent and zero telemetry.
- Preserve the current provider-token cycle budget and required-usage gate; do not call an external provider.

## Acceptance criteria

- Invalid telemetry normalizes to `None`, causing the existing `require_usage_telemetry` control to return BLOCKED.
- Correct OpenAI-compatible integer telemetry remains accepted.
- Full RSI CI, pinned-image validation and the real sandbox smoke test pass.
- RSI readiness stays INCOMPLETE; no secret, billing or permission changes.

## Execution outcome

- AstroCrown-Web [PR #66](https://github.com/ACROWN-System/AstroCrown-Web/pull/66) merged as `e7423ebee6d5063ed295000cd760ace36a4af46b`.
- GitHub Actions [run #38090168247](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/38090168247) is the recorded CI evidence for this change.
- Usage normalization now accepts only nonnegative integer token counts and rejects booleans, fractions, strings, negative values, zero totals, and inconsistent prompt/completion/total counts.
- Total usage is derived only when prompt and completion counts are both valid and present.
- Invalid or incomplete telemetry is unavailable and triggers the existing required-telemetry budget gate, rather than being coerced into apparent compliance.
- CI passed compilation, 65 RSI unit tests, pinned-image verification, and Docker isolation/timeout-cleanup smoke tests; no provider calls were made.
- Readiness remains `implementation_readiness.status = INCOMPLETE`; `promotion.allow_main = false`; the production benchmark registry remains unapproved and the context-packing profile remains disabled.
- No secrets/credentials, billing, workflow permissions, or provider usage were changed by the reviewed work.

## Impact Analysis

**IF modified:** Token budget enforcement no longer treats malformed or internally inconsistent usage reports as valid counts.

**IF not modified:** Invalid or inconsistent token counts could still appear compliant and make the per-cycle budget accounting unreliable.

## Residual risks and handoff

Provider-reported usage is still the source for this engine's accounting; billing records and other NOVA consumers of a shared provider account remain outside this counter.

Keep the readiness and benchmark gates closed until all remaining required evidence and independent review gates are satisfied.
