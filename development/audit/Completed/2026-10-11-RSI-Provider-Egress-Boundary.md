# Completed Audit — RSI Provider Credential Egress Boundary

**Date:** 2026-10-11  
**Status:** COMPLETED — provider hostname allowlist and redirect rejection merged; no provider request was made
**Objective:** Prevent the configured Nosana API credential from being sent to an arbitrary HTTPS host or forwarded through a redirect controlled by the endpoint. Preserve provider flexibility through an explicit protected allowlist rather than an unrestricted URL.

## Findings

1. **RSI-SEC-005 — Provider endpoint host is unrestricted.** `validate_base_url` currently accepts any absolute HTTPS URL. Since the provider URL is a repository variable and the bearer credential is sensitive, a mistaken or malicious variable could send the key to a host outside the intended provider.
2. **RSI-SEC-006 — HTTP redirects are followed by the default URL opener.** Provider requests carry a bearer Authorization header. The client should not implicitly trust a redirect to another endpoint, even if URL handlers normally sanitize some sensitive headers.

## Scope

- Add an exact hostname allowlist in protected RSI provider policy; current approved endpoint host is `inference.nosana.com`.
- Validate the hostname using exact matching; reject URL user-info, query, fragments, unsupported ports and unapproved hosts.
- Make local HTTP endpoints an explicit test-only opt-in, never the runtime default.
- Disable HTTP redirects in the provider client so redirect responses fail closed.
- Add tests for disallowed HTTPS host, user-info/query/fragment, local HTTP policy, and attempted redirect credential forwarding.
- Update preflight, runtime provider configuration, tests and documentation to use the protected allowlist.
- Keep readiness INCOMPLETE and the provider key unchanged/unset.

## Acceptance criteria

- Production provider URLs must use HTTPS and exactly match a host in the protected allowlist.
- The current policy allows only `inference.nosana.com`.
- Redirect responses fail closed and no redirected request is sent.
- Local HTTP is allowed only when a caller explicitly opts into test mode.
- Full RSI CI and Docker sandbox smoke tests pass.
- No provider call is made as part of this work; no credential, billing or permission change is required.

## Execution outcome

- AstroCrown-Web [PR #65](https://github.com/ACROWN-System/AstroCrown-Web/pull/65) merged as `7fab45037edc4d20f790c3986443596ec6d77c4d`.
- GitHub Actions [run #38090019547](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/38090019547) is the recorded CI evidence for this change.
- Protected provider allowlist permits only `inference.nosana.com` for the current Nosana credential.
- Remote URLs require HTTPS on port 443; embedded credentials, query strings, fragments, malformed URLs and unapproved hosts are rejected.
- Redirect handling raises before urllib's default redirect handler runs; a test verified the redirect destination received no Authorization header.
- Local HTTP is test-only and requires explicit opt-in.
- CI passed compilation, 63 RSI unit tests, pinned-image verification, and Docker isolation/timeout-cleanup smoke tests.
- Readiness remains `implementation_readiness.status = INCOMPLETE`; `promotion.allow_main = false`; the production benchmark registry remains unapproved and the context-packing profile remains disabled.
- No secrets/credentials, billing, workflow permissions, or provider usage were changed by the reviewed work.

## Impact Analysis

**IF modified:** The protected allowlist and redirect rejection reduce the paths by which URL misconfiguration or endpoint-controlled redirects could send the bearer key away from the intended provider.

**IF not modified:** A provider URL misconfiguration or endpoint redirect would remain an avoidable way to expand the bearer credential's destination trust.

## Residual risks and handoff

The controls establish the configured destination, not the provider's overall safety. Additional providers require explicit policy changes and provider/credential review.

Keep the readiness and benchmark gates closed until all remaining required evidence and independent review gates are satisfied.
