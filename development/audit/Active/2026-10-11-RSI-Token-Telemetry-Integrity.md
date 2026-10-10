# RSI Token Usage Telemetry Integrity

**Date:** 2026-10-11  
**Status:** ACTIVE — validate provider token counts before budget accounting  
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
