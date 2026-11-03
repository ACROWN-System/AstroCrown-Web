# AstroCrown account staging Worker — qualification build

**Status: local qualification build only. Not deployed, not approved for public onboarding, and not a production release.**

This is an isolated Worker/D1 implementation path for the adopted passkey-first account model. It is separate from the Python loopback reference prototype.

## Included

- Same-origin Worker request handler; exact Host, Origin and RP ID binding; security headers; no CORS; fail-closed staging access gate.
- D1 schema for ordinary accounts, WebAuthn credentials, one-use challenges, recovery-key verifiers, sessions, persistent rate-limit events and security audit.
- Discoverable WebAuthn registration and sign-in through pinned SimpleWebAuthn 14.0.3.
- One-time 256-bit offline recovery key; only a salted SHA-256 verifier is stored. Recovery requires a new passkey, consumes/rotates the key, deactivates old credentials, revokes prior sessions and records an audit event.
- Session tokens stored only as SHA-256 hashes; HttpOnly, SameSite=Strict cookies; Secure on HTTPS.
- Runtime diagnostics for the actual SimpleWebAuthn default algorithm list and native ML-DSA Web Crypto support.
- Restricted static build copies only the homepage, account UI assets, and explicitly allowlisted account/legal pages from development. It does not publish repository documentation, audit records, backups, or source files.
- Existing homepage/account UI are reused. The generated static homepage receives a visible synthetic-data banner and a runtime marker enabling same-origin Worker API requests.

## Deliberate limits

- Administrator role provisioning, EVM/SIWE wallet enrollment, privileged dashboard APIs and administrator actions are not enabled. This Worker creates ordinary user accounts only.
- In-app communications return an empty/disabled staging result. No email, SMS or identity provider is used.
- Feedback/case-portal entry points are replaced with an explicit not-enabled note in the staging asset build; no non-working case API is exposed.
- ML-DSA capability is not credential evidence. A real authenticator must register an ML-DSA credential, the server must store its actual COSE algorithm, and a later assertion must verify before the credential is described as post-quantum.
- This port has not yet had independent security review and does not replace the Python reference. Account API parity, runtime quota measurements and end-to-end regression tests remain required.

## Local qualification

Use a supported Node.js LTS, npm, and a preinstalled Chrome/Chromium browser. From this directory, run npm install, npm run build:site, npx wrangler d1 migrations apply acrown-account-staging --local, and npx wrangler dev --local. Wrangler displays the local URL. Local development uses the localhost RP ID; it is not the remote staging URL. The qualification workflow also runs a Chrome virtual-authenticator registration, discoverable sign-in, passkey-loss and offline-recovery test against the local Worker.

## Remote staging — not authorized or performed

The staging environment intentionally contains non-deployable sentinel values. Before remote deployment an operator must:

1. Verify actual Workers Free/D1 Free eligibility and no-card/payment-method requirements in the Cloudflare account. Do not enable Workers Paid, add a payment method, or activate any paid product.
2. Create a dedicated empty staging D1 database and replace only the staging database sentinel with its ID. Never bind production storage.
3. Select an exact staging hostname and set RP_ID to its hostname and EXPECTED_ORIGIN to its HTTPS origin.
4. Set independent staging-only secrets STAGING_ACCESS_CODE and RATE_LIMIT_HMAC_KEY through the provider secret interface. Never commit them.
5. Review free quotas, log retention and deletion behavior, then obtain explicit remote-deployment authorization.
6. Apply migrations and run real-browser registration, sign-in and recovery tests.

Do not run wrangler deploy until separately authorized. The all-zero D1 ID and invalid staging hostname are deliberate sentinels.

## Test account safety

Use synthetic details only. Save the one-time recovery key offline when first displayed. Never use production credentials, personal recovery material, wallet seed phrases or real assets. Staging passkeys are tied to the staging RP ID and cannot be transferred to the production RP ID.

Production parity and the three independent cleanup passes plus the eight-day quarantine remain governed by the staging requirements document.
