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

## GitHub-hosted remote staging — prepared, not deployed or authorized

The preferred operating path is GitHub Actions on GitHub-hosted Ubuntu runners. A developer workstation is not required for dependency installation, tests, site builds, Worker dry-runs or the guarded remote deployment. The local script path remains available for exceptional diagnostics only.

Workflow: `.github/workflows/cloudflare-staging-deployment.yml`

The workflow is deliberately manual and restricted to the reviewed `main` branch. It has two separate confirmation inputs: one confirms the Workers Free/D1 Free and no-card conditions, and the other explicitly authorizes creation/use of the isolated staging database and deployment of the staging Worker. Pushes, pull requests and CI runs never deploy remotely. A concurrency lock prevents overlapping staging deployments.

**Activation boundary:** `workflow_dispatch` is available only after this workflow file is present on the repository's default branch. PR #141 remains a draft and this workflow does not merge it, publish the account implementation, or authorize production deployment. Until the reviewed branch is merged by an authorized maintainer, the workflow is prepared but cannot be used for remote deployment.

### One-time GitHub environment setup

After the workflow is present on `main`, create a GitHub Actions environment named `cloudflare-staging` under repository Settings → Environments. Restrict allowed deployment branches to `main`. Add the following environment secrets:

- `CLOUDFLARE_API_TOKEN_02` — the account-scoped Cloudflare token created for this account (D1 Read/Edit and Workers Editor only).
- `ASTROCROWN_STAGING_ACCESS_CODE` — a password-manager-generated random value of at least 32 characters. This is the HTTP Basic access code for the restricted staging site.
- `ASTROCROWN_RATE_LIMIT_HMAC_KEY` — a separate password-manager-generated random value of at least 32 characters.

Add this environment variable:

- `CLOUDFLARE_ACCOUNT_ID` — the 32-character Cloudflare account identifier.

Do not create these as repository-wide secrets. The workflow references them only from its final deployment step after the explicit authorization job succeeds. The deployment script removes the access-code and rate-limit secrets from all child-process environments, masks them in GitHub Actions, sends them to Wrangler through standard input, and never prints the access code. No credential or access-code artifact is uploaded.

For additional review, configure an environment required reviewer if a separate authorized reviewer is available. Environment branch restrictions are mandatory; a manual workflow trigger alone is not a substitute for controlling who can modify the deployment workflow.

### First deployment and persistent D1 identity

On the first authorized deployment, the script creates the reserved D1 database `acrown-account-staging` only if it is absent and the account has fewer than ten D1 databases. The hosted runner is ephemeral, so its local `.wrangler/` state does not persist across runs.

The first successful or partially completed deployment reports the D1 UUID as non-secret workflow output/summary. Before any subsequent deployment, add that exact UUID as the `ASTROCROWN_STAGING_D1_DATABASE_ID` variable in the `cloudflare-staging` GitHub environment. Later runs verify the UUID against Cloudflare and use that exact database; they never adopt an existing database by name alone. If the variable is absent but the reserved database already exists, the script stops safely rather than guessing.

The deployment script also creates or uses two staging-only Cloudflare Worker secrets: `STAGING_ACCESS_CODE` and `RATE_LIMIT_HMAC_KEY`. The values come from the protected GitHub environment secrets above. The staging Worker name remains `astrocrown-account-staging-staging`; the script deploys only the `staging` Wrangler environment and does not create or delete Workers.

### What the workflow does and does not do

Before any Cloudflare API request or remote resource change, the script verifies both confirmation values, the account ID, token presence, and both staging-only secret values. It then performs local invariant tests, the allowlisted website build and Wrangler bundle dry-run on GitHub's hosted runner. The Cloudflare token and account ID are removed from those child processes.

Only after those checks pass does it read the configured workers.dev subdomain, verify/create the dedicated D1 database, apply the staging migration, deploy the staging Worker, install the two staging secrets and perform initial remote smoke checks. If a later stage fails, resources are not automatically deleted; preserve the reported D1 UUID and reconcile the state deliberately.

The workflow never configures production, enables Workers Paid, adds a payment method, enables another paid product, or performs automatic cleanup. A successful workflow run is only initial deployment smoke evidence. It is not full remote browser/credential qualification, production approval, or permission to announce public account onboarding.

Do not put the Cloudflare token in source files, Git history, workflow YAML, build variables, artifacts, issue comments or logs. Do not upload `.wrangler/` or the generated remote Wrangler configuration as an artifact.

## Test account safety

Use synthetic details only. Save the one-time recovery key offline when first displayed. Never use production credentials, personal recovery material, wallet seed phrases or real assets. Staging passkeys are tied to the staging RP ID and cannot be transferred to the production RP ID.

Production parity and the three independent cleanup passes plus the eight-day quarantine remain governed by the staging requirements document.
