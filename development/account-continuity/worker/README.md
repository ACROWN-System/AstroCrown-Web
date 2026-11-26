# AstroCrown account staging Worker — qualification build

> **Genesis Programme amendment — 18 November 2026:** Genesis is not an ordinary registered-user account. Its primary wallet is the sole identity, authentication and recovery anchor and owns the ACROWN purchase entitlement. Additional chain-specific addresses may be grouped in the same primary wallet profile, but each requires a separate wallet-control proof before use. Genesis payments are accepted only from pre-registered addresses; no unlinked one-time payment source is allowed. These addresses cannot recover or administer the primary identity. The new same-origin `/api/genesis/*` API implements that wallet-native identity; old `/api/supporters/*` registration/login paths return HTTP 410. The gold DNA Genesis Member badge, unique public display name, public payment directory and explorer-link address disclosure are described in [GENESIS-WALLET-FIRST-IDENTITY-AND-MEMBER-EXPERIENCE.md](../../supporter-programme/GENESIS-WALLET-FIRST-IDENTITY-AND-MEMBER-EXPERIENCE.md). Ordinary AstroCrown account/passkey functionality documented below remains a separate product feature; it does not restore or recover a Genesis wallet identity.


**Status: public-access staging implementation is being qualified; remote staging is not yet deployed. This is not a production release or a completed commercial platform.**

This is an isolated Worker/D1 implementation path for the adopted passkey-first account model. It is separate from the Python loopback reference prototype.

## Included

- Same-origin Worker request handler; exact Host, Origin and RP ID binding; security headers; no CORS; public staging mode without a shared browser password; fail-closed if the rate-limit/acknowledgement-signing key is missing.
- D1 schema for ordinary accounts, WebAuthn credentials, one-use challenges, recovery-key verifiers, sessions, persistent rate-limit events and security audit.
- Discoverable WebAuthn registration and sign-in through pinned SimpleWebAuthn 14.0.3.
- One-time 256-bit offline recovery key; only a salted SHA-256 verifier is stored. Recovery requires a new passkey, consumes/rotates the key, deactivates old credentials, revokes prior sessions and records an audit event.
- Session tokens stored only as SHA-256 hashes; HttpOnly, SameSite=Strict cookies; Secure on HTTPS.
- Runtime diagnostics for the actual SimpleWebAuthn default algorithm list and native ML-DSA Web Crypto support.
- Restricted static build copies only the homepage, account UI assets, explicitly allowlisted account/legal pages, and the allowlisted Genesis Programme preview files and the gold DNA badge asset. It does not publish the rest of the repository, audit records, backups, or source files.
- The Genesis Programme preview is served at the same origin under `/supporters/` and linked from the homepage footer. It shows the intended Ethereum/Tron/Solana USD₮ mainnet scope and the illustrative multiplier model, but remains a display-only development preview: no real qualifying payments, entitlement activation, ACROWN purchase or payment service is enabled.
- Existing homepage/account UI are reused. The generated staging homepage is clearly marked as a live public test environment. Its mandatory first-visit notice explains that public submissions are visible to anyone, that accounts/data are disposable, and that only enabled test functionality may be used. The notice must be acknowledged through a same-origin API request before account APIs accept requests.

## Primary wallet account identity — implementation candidate added 26 November 2026

The active ordinary-account authentication path is being replaced with one primary identity wallet per account. The Worker now contains a dedicated primary-wallet registry and a one-use challenge lifecycle for Ethereum Mainnet (EIP-191), TRON Mainnet (TIP-191) and Solana Mainnet (Ed25519). Challenge messages are bound to the exact site origin, network, address, intent, nonce, request ID and short expiry. The server consumes each challenge before signature verification, checks the wallet proof using the shared chain verifier, and creates an ordinary account/session only after a valid proof. Raw signatures, private keys, seed phrases, balances, transactions, token approvals and payments are not stored or requested.

The staging account dialog now offers wallet-primary registration and sign-in for those three networks. It requires the current Terms and Privacy acknowledgement for registration, checks the chain/network where the injected wallet exposes verifiable mainnet information, and confirms the resulting account session through the account-status API. The User dashboard identifies the primary wallet as the identity/recovery anchor. Auxiliary transaction wallets remain a separate, not-yet-enabled feature; they cannot sign in or recover the account. Bitcoin authentication is not included in this increment because a separate BIP-322 proof implementation and verification suite is required.

**Qualification boundary:** this is a GitHub-hosted local Worker/D1 qualification candidate, not a remote Cloudflare deployment or a production account service. Ethereum, TRON and Solana signature code is reused from the separately qualified Genesis wallet verifier, but the new ordinary-account registration/session route still requires full local Worker/browser end-to-end tests, cross-wallet/provider coverage, physical-device testing, replay/race testing, and independent security review. The current UI does not support wallet selection when multiple providers for the same chain are injected; it fails closed and asks the user to leave one provider enabled. No remote D1 migration, Cloudflare deployment, billing action or payment activation has occurred. The page-entry status registry remains authoritative: the feature stays FOR DEVELOPMENT · READ ONLY until exact deployed assets and remote runtime are independently verified.

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

The normal qualification path is `.github/workflows/account-staging-worker-qualification.yml`, running on GitHub-hosted `ubuntu-24.04` with Node.js 22. It installs dependencies, runs Worker invariant and public-access/acknowledgement tests, builds the allowlisted site assets, checks the Worker bundle, applies the D1 schema locally to the ephemeral runner, launches the local Worker, and runs the Chrome virtual-authenticator registration/sign-in/recovery tests. It also verifies that the remote staging RP/origin/D1 identifiers remain fail-closed sentinels. This workflow does not deploy to Cloudflare or create remote resources.

Do not ask the owner to install Node.js/npm or run this qualification locally when the hosted workflow can provide the required evidence. Read the exact-commit Actions result and job steps instead. A passing hosted local-Worker test is not proof of remote Cloudflare runtime or real-authenticator compatibility.

## Optional local diagnostics — exception only

A local checkout may be used when a specific device, browser, physical authenticator, private file or reproducible failure cannot be tested through the hosted runner. Record why the hosted path is insufficient and request only the smallest necessary local action.

When a local diagnostic is justified, use a supported Node.js LTS and a preinstalled Chrome/Chromium browser. From this directory, run `npm install`, `npm run build:site`, `npx wrangler d1 migrations apply acrown-account-staging --local`, and `npx wrangler dev --local`. Wrangler displays a local URL and uses the localhost RP ID; it is not the remote staging URL. Do not treat local diagnostic output as remote integration evidence.

## Account 02 read-only preflight

Workflow: `.github/workflows/cloudflare-account02-readonly-preflight.yml`

Before any remote staging deployment, run this manually dispatched workflow on `main`. It reuses the existing `CLOUDFLARE_API_TOKEN_02` and `CLOUDFLARE_ACCOUNT_ID_02` settings and performs only HTTP GET requests. Successful authenticated GETs to the Account 02 Workers and D1 APIs verify that the account-scoped token can access the resources needed by deployment; the workflow does not call the user-scoped token-verification endpoint. It reports the `workers.dev` subdomain, existing Worker names, the reserved staging Worker presence, D1 database names/count, and the Workers account default usage model when available. It does not read payment methods, billing profiles, secret values, or modify any Cloudflare resource.

**Usage-model reporting:** the preflight records `default_usage_model` for audit visibility. This account-settings field reports a Workers usage-model setting; it does not expose the account's active subscription or payment methods. It is therefore not used by itself to decide whether a paid subscription or chargeable payment method exists. The deployment workflow instead requires the owner to explicitly confirm that Workers Free and D1 Free are in use, no Workers Paid subscription is active, no payment method is attached or required, and no paid product will be enabled.

The deployment script repeats the critical Worker-existence check before D1 provisioning. It also reads and records the Workers account default usage model for audit visibility, but does not treat that field as an authoritative subscription or payment-method check. The deployment still requires the explicit owner Free/no-card confirmation and performs no billing or payment-method changes. Cloudflare's Workers Editor role can deploy to an existing Worker but cannot create a new Worker. If `astrocrown-account-staging-staging` does not already exist, create an empty Worker with that exact name through the Cloudflare dashboard before rerunning deployment. Do not broaden the existing token to account-level Workers Admin merely to bypass this prerequisite.

The preflight deliberately does not determine whether Workers Free is selected or whether a payment method is attached. Confirm both in the Cloudflare dashboard before selecting the deployment workflow's Free/no-card confirmation. The read-only deployment token is not granted Billing Read and does not query billing endpoints.

## GitHub-hosted remote staging — prepared, not deployed or authorized

The preferred operating path is GitHub Actions on GitHub-hosted Ubuntu runners. A developer workstation is not required for dependency installation, tests, site builds, Worker dry-runs or the guarded remote deployment. The local script path remains available for exceptional diagnostics only.

Workflow: `.github/workflows/cloudflare-staging-deployment.yml`

The workflow is deliberately manual and restricted to the reviewed `main` branch. It has two separate confirmation inputs: one confirms the Workers Free/D1 Free and no-card conditions, and the other explicitly authorizes creation/use of the isolated staging database and deployment of the public staging Worker. Pushes, pull requests and CI runs never deploy remotely. A concurrency lock prevents overlapping staging deployments.

**Activation boundary:** this workflow file is already present on the repository's default `main` branch and is manually dispatchable there. It always checks out `main`, not a pull-request branch. The current PR #180 adds the corrected Account 02 variable binding and integrates the Supporter Programme at `/supporters/`; until PR #180 is reviewed and merged, a deployment from `main` will not include that latest same-origin integration and the current `main` workflow still uses the missing unsuffixed account variable. Merge PR #180 before attempting the integrated staging deployment. This workflow never deploys production and does not authorize the Supporter Programme's real-money payment activation.

### Existing GitHub credential configuration — inspected 15 November 2026

The repository and `cloudflare-staging` environment already exist. The current configuration was inspected through GitHub settings without revealing any secret values:

| Location | Existing item | Status |
|---|---|---|
| Repository Actions secret | `CLOUDFLARE_API_TOKEN_02` | Present; reused by the staging workflow |
| Repository Actions variable | `CLOUDFLARE_ACCOUNT_ID_02` | Present; referenced by the staging workflow |
| `cloudflare-staging` environment secret | `ASTROCROWN_RATE_LIMIT_HMAC_KEY` | Present |
| `cloudflare-staging` environment variable | `ASTROCROWN_STAGING_D1_DATABASE_ID` | Absent before the first D1 deployment; added after the workflow reports the created/verified UUID |
| `cloudflare-staging` environment reviewers | Required reviewers | None configured at inspection time |
| `cloudflare-staging` environment branch policy | Deployment branch restriction | One branch restriction is configured; it must continue to limit deployment to `main` |

The workflow deliberately reuses the existing `CLOUDFLARE_API_TOKEN_02` repository secret; no new Cloudflare API token is required. It reads the already-present account identifier from `vars.CLOUDFLARE_ACCOUNT_ID_02`. This avoids copying the account ID into another setting or asking the owner to disclose it in chat.

**Credential scope note:** a repository-level secret has a wider GitHub workflow visibility boundary than an environment-only secret. The token is referenced only by two reviewed, manually dispatched workflows on `main`: the GET-only Account 02 preflight and the separately authorized staging deployment. Keep all future references limited to these narrowly scoped workflows; the preflight never provisions or mutates Cloudflare resources. A stricter environment-only arrangement can be adopted later by adding the same existing token value to the `cloudflare-staging` environment and removing the repository-level copy after verifying the migration; this is a scope migration, not a request to generate a new token. The actual Cloudflare token permission scopes and Account 02 billing/plan state cannot be verified from GitHub settings.

The existing `ASTROCROWN_RATE_LIMIT_HMAC_KEY` stays in the protected `cloudflare-staging` environment. Do not add credentials or account identifiers to source files, logs, artifacts, or chat. The deployment script masks the HMAC value in Actions and supplies it to Wrangler through standard input.

No `ASTROCROWN_STAGING_D1_DATABASE_ID` is required for a genuinely first deployment. After the workflow creates the isolated database and reports its non-secret UUID, add that exact UUID as an environment variable in `cloudflare-staging` before any later deployment. If the reserved database already exists without a matching identity record, the script stops rather than adopting it by name.

Before an actual deployment, the owner must independently confirm in Cloudflare that the intended Account 02 is on Workers Free / D1 Free, that the action requires and attaches no payment method, and that no paid product will be enabled. GitHub configuration does not prove those Cloudflare account conditions.

### First deployment and persistent D1 identity

On the first authorized deployment, the script creates the reserved D1 database `acrown-account-staging` only if it is absent and the account has fewer than ten D1 databases. The hosted runner is ephemeral, so its local `.wrangler/` state does not persist across runs.

The first successful or partially completed deployment reports the D1 UUID as non-secret workflow output/summary. Before any subsequent deployment, add that exact UUID as the `ASTROCROWN_STAGING_D1_DATABASE_ID` variable in the `cloudflare-staging` GitHub environment. Later runs verify the UUID against Cloudflare and use that exact database; they never adopt an existing database by name alone. If the variable is absent but the reserved database already exists, the script stops safely rather than guessing.

The deployment script creates or uses one staging-only Cloudflare Worker secret, `RATE_LIMIT_HMAC_KEY`, supplied through the protected GitHub environment. It supports IP-based abuse limits and signs the short-lived staging-notice acknowledgement cookie. The Worker is explicitly configured for public staging; it serves the homepage without a shared browser password but rejects account/API access until a valid acknowledgement cookie is presented. The staging Worker name remains `astrocrown-account-staging-staging`; the script deploys only the `staging` Wrangler environment and does not create or delete Workers.

### What the workflow does and does not do

Before any Cloudflare API request or remote resource change, the script verifies both confirmation values, the account ID, token presence and the staging rate-limit/acknowledgement secret. It then performs local invariant tests, the allowlisted website build and Wrangler bundle dry-run on GitHub's hosted runner. The Cloudflare token and account ID are removed from those child processes.

Only after those checks pass does it read the configured workers.dev subdomain, verify/create the dedicated D1 database, apply the staging migration, deploy the staging Worker, install the staging rate-limit/acknowledgement secret and perform public-entry/acknowledgement smoke checks. If a later stage fails, resources are not automatically deleted; preserve the reported D1 UUID and reconcile the state deliberately.

The workflow never configures production, enables Workers Paid, adds a payment method, enables another paid product, or performs automatic cleanup. A successful workflow run is only initial deployment smoke evidence. It is not full remote browser/credential qualification, production approval, or evidence that not-yet-implemented features such as testnet transactions are operational.

Do not put the Cloudflare token in source files, Git history, workflow YAML, build variables, artifacts, issue comments or logs. Do not upload `.wrangler/` or the generated remote Wrangler configuration as an artifact.

## Test account safety

Use synthetic details only. Save the one-time recovery key offline when first displayed. Never use production credentials, personal recovery material, wallet seed phrases or real assets. Staging passkeys are tied to the staging RP ID and cannot be transferred to the production RP ID.

Production parity and the three independent cleanup passes plus the eight-day quarantine remain governed by the staging requirements document.


## Public staging access and notice acknowledgement

The staging homepage is intended to be publicly reachable so a visitor from any country can open the real AstroCrown staging application without a shared HTTP Basic Authentication password. `STAGING_ACCESS_MODE=public` is an explicit staging-only setting. The Worker fails closed if `RATE_LIMIT_HMAC_KEY` is absent or too short.

The first-visit popup posts the current notice version to `POST /api/staging/acknowledge`. The Worker validates the same-origin request and returns a 12-hour signed `HttpOnly; Secure; SameSite=Strict` cookie. All other staging API routes require that cookie; missing, modified, expired or wrong-version acknowledgements are rejected. The public homepage and static assets remain viewable before acknowledgement. Acknowledgement is a UX/policy gate, not proof that a person actually read the notice.

Passkey registration, sign-in and recovery retain their existing per-IP and per-account D1 rate limits. The site continues to use exact origin/RP checks, same-origin restrictions and server-side session authorization. Public staging must use only synthetic, disposable account data. Cloudflare Free quotas must be monitored; requests must fail closed on missing configuration or exhausted quotas and must never trigger a paid fallback. This access model does not itself enable blockchain transactions: a network and transaction feature must separately be allowlisted, qualified and identified as enabled before testers are instructed to use it.

This public mode is a limited-access application test, not a complete public production service. It does not make unfinished features operational, and it does not replace independent remote-browser qualification.
