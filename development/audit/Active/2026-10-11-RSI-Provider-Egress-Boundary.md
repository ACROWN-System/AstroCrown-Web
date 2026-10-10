# RSI Provider Credential Egress Boundary

**Date:** 2026-10-11  
**Status:** ACTIVE — enforce provider host allowlist and reject HTTP redirects  
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
