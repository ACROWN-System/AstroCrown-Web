# AstroCrown account staging Worker — qualification build

**Status: hosted qualification build; remote staging deployment remains prepared but not deployed, approved for public onboarding, or a production release.**

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

## Account security lifecycle — local qualification passed; not deployed

The Worker branch now contains an implementation candidate for the ordinary-account security centre. It adds opaque passkey/session references, user-managed passkey labels and additional passkey enrollment/revocation, session listing/revocation, and one-time recovery-key rotation. Sensitive operations require a fresh WebAuthn assertion and a short-lived, purpose-bound, single-use grant tied to the active account session. The normal revoke path refuses to remove the last active passkey; session controls preserve the current session.

The related API surface is:
- `GET /api/account/security`
- `POST /api/account/security/step-up/options` and `/verify`
- `POST /api/account/security/passkeys/add/options` and `/verify`
- `POST /api/account/security/passkeys/rename` and `/revoke`
- `POST /api/account/security/sessions/revoke`
- `POST /api/account/security/recovery/rotate`

The User dashboard exposes these controls only when the authenticated backend explicitly advertises them. Additional passkey enrollment is a two-gesture flow: the first click performs fresh passkey step-up and prepares a short-lived registration challenge; a second explicit click opens the authenticator ceremony directly from the user gesture. This is necessary to avoid losing WebAuthn user activation across asynchronous network requests.

**Qualification evidence:** [Account Staging Worker Qualification #176](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/42122679471) passed the full Chrome virtual-authenticator lifecycle. The run verified account creation/sign-in, the security step-up, a second passkey on an independent authenticator, naming and revocation, final-passkey protection, passkey-bound session invalidation, recovery-key rotation and prior-key rejection, multiple sessions and other-session revocation, and recovery/replacement sign-in. The local D1 migrations, Worker invariants, restricted asset build and fail-closed deployment sentinels also passed.

**Maturity boundary:** this is only a GitHub-hosted local Worker/D1 qualification with disposable synthetic data and virtual authenticators. It is not a remote Cloudflare deployment, cross-browser/physical-authenticator qualification, independent penetration test, certification, or approval for real users. The staging account remains synthetic-test-only.

## Administrator role governance — RBAC core qualified locally; first-admin bootstrap remains blocked

The Worker/D1 port now has a separate server-owned administrator role registry, explicit permission records, active EVM-wallet registry storage, an append-only governance audit table, and target-owned revocation notices. Account identity remains independent of roles and wallet addresses.

The role APIs are:
- `POST /api/admin/roles/grant` — requires a current wallet-verified session with `admin.roles.grant`
- `POST /api/admin/roles/revoke` — requires a current wallet-verified session with the separate `admin.roles.revoke`
- `GET /api/admin/status` — requires a server-assigned role and current enrolled-wallet step-up
- `POST /api/account/administrator-notice/acknowledge` — acknowledges only the signed-in account's own revocation notice

Permission assignment is allowlisted. A grantor can delegate only permissions explicitly marked delegable; newly assigned permissions are non-delegable by default. Self-grant, duplicate appointment, unauthorized escalation and self-revocation are rejected. Role revocation disables administrator wallets and session step-up, removes permissions and role, preserves ordinary account sessions, and creates a target-only notice. Governance audit rows have database triggers preventing UPDATE and DELETE.

**Qualification evidence:** [Account Staging Worker Qualification #198](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/42147751078) passed the local D1 role-governance integration sequence. The test seeded a synthetic already-wallet-verified administrator session directly into the disposable Wrangler local D1 database to isolate RBAC. It did not test real wallet signature verification or create a public bootstrap mechanism.

**Current boundary:** real EVM/SIWE wallet enrollment, administrator step-up and a negative all-wallet-loss self-service recovery gate are locally qualified under Block C. The Worker has no public self-appointment route. If an account still has its admin role but all previously enrolled wallets are inactive, a passkey-only request for a replacement wallet is rejected with HTTP 409; the User dashboard clearly reports owner-authorized recovery required and disables the admin-entry control while preserving ordinary account access. The owner-authorized bootstrap and exceptional recovery operations themselves remain unimplemented. The current owner CLI is local SQLite test tooling only; its actor label and confirmation phrase are not proof of production owner authority. No remote D1, Cloudflare deployment or real-user administrative service is enabled.

## EVM administrator wallet enrollment and step-up — local qualification passed; not deployed

The Worker now exposes:
- `GET /api/admin/wallet-options`
- `POST /api/admin/wallet-enrollment-challenge` and `/verify`
- `POST /api/admin/wallet-challenge` and `/verify`
- `POST /api/admin/wallet-revoke`
- `POST /api/admin/wallet-logout`

The first enrollment requires an already-appointed administrator role, an authenticated ordinary passkey session, and a fresh SIWE/EIP-191 signature. Enrollment alone does not grant Administrator access: a second purpose-bound signature creates a separate administrator session of no more than ten minutes. Further wallet enrollment requires an already active wallet-verified session. Up to three unique active EVM EOA wallets may be enrolled; the last active wallet cannot be removed while the role remains assigned. Ending administrator access preserves ordinary account sign-in. Challenges are stored with account/session/purpose/address/chain bindings, expire after five minutes, and are consumed before signature verification so invalid signatures cannot reuse the challenge. Wallet actions have separate append-only audit evidence.

**Qualification evidence:** [Account Staging Worker Qualification #229](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/42149830004) passed the complete local EVM lifecycle with deterministic test-only keys, EIP-191 recovery, replay rejection, separate enrollment and step-up, three-wallet cap, wallet revocation and admin-session logout.

**Adapter boundary:** EOA-only EVM/EIP-191 recovery is implemented. There is no RPC, balance check, transaction, deposit, stake or funds requirement. ERC-1271 contract wallets and other wallet families are not yet supported.

**Administrator UI and all-wallet-loss boundary qualification:** [Account Staging Worker Qualification #276](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/42154118357) passed the real browser flow through the shared homepage header Wallet control, explicit access confirmation, signature review, separate ten-minute step-up, additional-wallet enrollment, wallet-list revocation controls, and ending administrator access while preserving ordinary sign-in. It also verified that historical administrator wallet records with zero active wallets cannot be replaced using only an ordinary passkey session: the Worker returns HTTP 409, the User dashboard shows the owner-recovery requirement and keeps the ordinary account available. The same exact-head revision passed [Local Wallet Authentication Prototype Tests #743](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/42154118395), [External Review Pipeline CI #1018](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/42154118387), [NOVA RSI Engine CI #1506](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/42154118540), and [NOVA RSI CodeQL #1039](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/42154118354). The Worker asset build includes the shared homepage, account UI and administrator-wallet UI.

**Maturity boundary:** this is still only a GitHub-hosted local Worker/D1 qualification using disposable synthetic data. The first-administrator bootstrap is not implemented; no remote D1 or real account administrator authority exists. This is partial dashboard integration, not complete User/Administrator dashboard parity; the role-management forms and full communications/service surfaces need separate end-to-end qualification. Do not present this as a deployed or production administrator service.

## Deliberate limits

- The real EVM/SIWE enrollment and step-up APIs and a limited header-wallet/Administrator dashboard journey are locally qualified but not remotely deployed. The authorized first-administrator bootstrap, full dashboard parity, role-management UI click-through tests and administrator communications actions remain incomplete. Until bootstrap and dashboard parity are qualified, RBAC operations cannot be used by public member accounts.
- In-app communications return an empty/disabled staging result. No email, SMS or identity provider is used.
- Feedback/case-portal entry points are replaced with an explicit not-enabled note in the staging asset build; no non-working case API is exposed.
- ML-DSA capability is not credential evidence. A real authenticator must register an ML-DSA credential, the server must store its actual COSE algorithm, and a later assertion must verify before the credential is described as post-quantum.
- This port has not yet had independent security review and does not replace the Python reference. Account API parity, runtime quota measurements and end-to-end regression tests remain required.

## Automated qualification — GitHub-hosted first

The normal qualification path is `.github/workflows/account-staging-worker-qualification.yml`, running on GitHub-hosted `ubuntu-24.04` with Node.js 22. It installs dependencies, runs Worker invariant tests, builds the restricted site assets, checks the Worker bundle, applies the D1 schema locally to the ephemeral runner, launches the local Worker, and runs the Chrome virtual-authenticator registration/sign-in/recovery tests. It also verifies that the remote staging RP/origin/D1 identifiers remain fail-closed sentinels. This workflow does not deploy to Cloudflare or create remote resources.

Do not ask the owner to install Node.js/npm or run this qualification locally when the hosted workflow can provide the required evidence. Read the exact-commit Actions result and job steps instead. A passing hosted local-Worker test is not proof of remote Cloudflare runtime or real-authenticator compatibility.

## Optional local diagnostics — exception only

A local checkout may be used when a specific device, browser, physical authenticator, private file or reproducible failure cannot be tested through the hosted runner. Record why the hosted path is insufficient and request only the smallest necessary local action.

When a local diagnostic is justified, use a supported Node.js LTS and a preinstalled Chrome/Chromium browser. From this directory, run `npm install`, `npm run build:site`, `npx wrangler d1 migrations apply acrown-account-staging --local`, and `npx wrangler dev --local`. Wrangler displays a local URL and uses the localhost RP ID; it is not the remote staging URL. Do not treat local diagnostic output as remote integration evidence.

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
