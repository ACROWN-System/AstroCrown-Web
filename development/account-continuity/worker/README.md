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

## Remote staging — prepared, not deployed or authorized

A guarded remote setup script is provided. It runs only from a local checkout when **both** explicit confirmation variables and the Cloudflare account credentials are present. It first runs the local tests, restricted asset build and Wrangler dry run. It then:

- Reads the account's existing workers.dev subdomain; it does not create or modify the account subdomain.
- Creates the dedicated staging D1 database only if there is no database with the reserved staging name and no prior local deployment-state record. If one already exists without matching state, it stops instead of adopting or overwriting it.
- Generates two random staging-only secrets and keeps the access code/rate-limit key in ignored local files. They are not written to Git. The Worker is deployed only with the exact HTTPS origin/RP ID derived from the account subdomain and the staging Worker name.
- Applies only the staging D1 migration, deploys only the `staging` Wrangler environment, sets only the staging secrets, then checks the staging URL, homepage, account status, ML-DSA-44 support and wrong-Origin rejection.
- Never configures a production database or environment, never enables a paid product, never adds a payment method, and never automatically deletes a resource if a later check fails.

**Nothing is deployed by CI or by this chat.** Before using the script, verify in the Cloudflare dashboard that this account is eligible for Workers Free and D1 Free, that no payment method/card is required or attached, and that you will not enable Workers Paid or any paid product. Cloudflare documents that a Workers API token and account ID are required for GitHub/CLI deployments, and documents separate D1 database and workers.dev subdomain APIs. The script uses those APIs only after the confirmations below.

From a local checkout, set these environment variables in the same terminal (never commit them):

- `CLOUDFLARE_API_TOKEN`: account-scoped API token with Workers Scripts Read/Write and D1 Read/Write permissions.
- `CLOUDFLARE_ACCOUNT_ID`: the 32-character account identifier.
- `ASTROCROWN_CONFIRM_WORKERS_FREE_NO_CARD=I_CONFIRMED_WORKERS_FREE_NO_CARD`: only after you have verified the account's plan/payment-method conditions.
- `ASTROCROWN_CONFIRM_REMOTE_STAGING_DEPLOY=I_AUTHORIZE_ASTROCROWN_STAGING_DEPLOY`: only when you explicitly authorize creating the isolated staging database and deploying the staging Worker.

Then run `npm install` and `npm run deploy:staging`. On Windows PowerShell, use `$env:NAME = 'value'` for each variable before running the command. The script displays a random HTTP Basic access code on successful completion and stores it in `.wrangler/staging-access-code.txt` (ignored by Git). The staging username is `staging`. Treat that code as a private test gate and use synthetic account details only. Deleting that local ignored file before a future deployment causes a new access code to be generated.

If the workers.dev subdomain is not already configured, the script stops and asks for it to be enabled in the Cloudflare dashboard; it will not create or change it automatically. A deployment run that creates the D1 database is a persistent remote resource; no cleanup is automatic because database deletion and provider Time Travel/retention must be handled under the three-pass cleanup procedure.

The staging environment's checked-in all-zero D1 ID and invalid hostname remain deliberate sentinels. The script writes an ignored temporary Wrangler config with the exact account-specific D1 ID and hostname; never commit that generated config or any files under `.wrangler/`.

## Test account safety

Use synthetic details only. Save the one-time recovery key offline when first displayed. Never use production credentials, personal recovery material, wallet seed phrases or real assets. Staging passkeys are tied to the staging RP ID and cannot be transferred to the production RP ID.

Production parity and the three independent cleanup passes plus the eight-day quarantine remain governed by the staging requirements document.
