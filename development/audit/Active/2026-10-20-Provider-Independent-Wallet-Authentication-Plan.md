# Active Architecture Plan — Provider-Independent Wallet Authentication

**Date:** 2026-10-20  
**Status:** ACTIVE — architecture direction recorded; implementation BLOCKED pending source/deployment discovery and verification  
**Repository:** `ACROWN-System/AstroCrown-Web`  
**Working branch:** `docs/provider-independent-wallet-auth-plan-2026-10-20`  
**Related editor prototype:** [Draft PR #140 — Build development-only announcement editor with Python draft backend](https://github.com/ACROWN-System/AstroCrown-Web/pull/140)  
**Related account roadmap:** [Account Continuity and Privacy-Preserving Access Roadmap](../../account-continuity/ACCOUNT-CONTINUITY-AND-PRIVACY-PRESERVING-ACCESS-ROADMAP.md)  
**Related preserved editor requirements:** [Announcement-Band Editor Discovery Preservation](2026-10-17-Announcement-Band-Editor-Discovery-Preservation.md)

## 1. Objective

Record the agreed direction before selecting production hosting or implementing sign-in for the announcement-band editor: **wallet-first, provider-independent authentication with multiple independently controlled wallets for recovery, no mandatory email, and no blockchain RPC, external identity-provider or wallet-relay dependency in the basic externally owned account (EOA) sign-in path.**

This is a documentation and architecture-planning change. It does not implement account creation, authentication, wallet linking, recovery, role enforcement, storage, publishing, deployment or failover.

## 2. Navigation, source of truth and boundaries

- The current `main` commit inspected for this plan is `27162a5f8ea91b6c51e9c928851d0da0f1ee6ead`.
- The announcement editor in PR #140 is a development-only prototype. Its own PR description explicitly says its Python service has no authentication or authorization, binds to loopback, is unsafe to expose over a network, and does not publish or activate content. Do not deploy it or treat it as a production authentication baseline.
- The current `_config.yml` excludes `development/` from the public output. The inspected root tree has no root `index.html` and no identified announcement production deployment workflow. The actual live domain, authoritative source branch/repository, build process, deployment target, DNS/CDN arrangement and public publishing path remain **BLOCKED / unverified**. Verify those facts before choosing the backend or connecting the editor to any public deployment.
- The repository's `development/DEVELOPMENT-AND-AUDIT-CONVENTION.md` applies. Its sections on evidence, result states, candidate eligibility, external contract gates, and the development/public boundary must be followed. The expected active paths `development/NAVIGATION-PROTOCOL.md` and `development/NAVIGATION-PLAN-TEMPLATE.md` were not found in the inspected tree; this record does not claim to have used them.
- Existing backups and archives are immutable. No path within `backup/` is in scope.

### 2.1 Publication-path discovery — 2026-10-20

Read-only inspection was performed against the repository metadata, the `main` tree at commit `27162a5f8ea91b6c51e9c928851d0da0f1ee6ead`, `README.md`, `_config.yml`, available branch names, and the complete workflow-file list in that tree.

Observed evidence:

- Repository metadata reports `default_branch: main`, `has_pages: true`, `homepage: null`, and a public repository. `has_pages: true` indicates the Pages feature flag/state in repository metadata; alone it does **not** disclose the publishing source, current custom domain, successful deployment or accessible live content.
- The inspected `main` tree has no root `index.html`, no root `CNAME`, and no root deployment manifest for another named web host.
- The six `.github/workflows/` files at that commit are `external-review-pipeline-ci.yml`, `media-generator-tests.yml`, `nova-credential-readiness.yml`, `nova-rsi-ci.yml`, `nova-rsi-codeql.yml`, and `ossf-scorecard.yml`. None of their names or inspected content establishes a homepage build/deployment workflow.
- `_config.yml` excludes `development/`, `backup/`, and internal workflow/support paths from Jekyll output. The current homepage prototype is at `development/index.html`, so it is deliberately excluded from the expected root public output.
- The repository's advertised homepage field is empty, and no custom-domain file was found in the inspected `main` tree. This does not rule out a domain configured only in GitHub Pages settings or through another publishing system.
- The Pages settings/API endpoint could not be accessed through the available read-only GitHub connector. A direct test from this execution environment also could not resolve the candidate URL `https://acrown-system.github.io/AstroCrown-Web/`; the environment reported a DNS-resolution failure. That result is a limitation of this test environment, **not evidence that the public website is down**.
- Public web search did not identify an authoritative AstroCrown website/domain tied to this repository. Search absence is not proof that no public domain exists.

Result: **AUTH-001 = BLOCKED**. The authoritative public hostname/URL, actual Pages source branch and directory or external host, build/deployment settings, custom domain/DNS/CDN and current public artifact have not been verified. We did not reproduce a live public build.

Next evidence required: open the repository's **Settings → Pages** and identify the exact publishing source (branch/folder or Actions workflow), the displayed site URL/custom domain, and any linked external deployment provider. Share the authoritative public URL so its live response and content can be checked. If the current public site comes from another repository or service, that source becomes part of the audit scope. Do not infer or configure a replacement deployment based only on the repository name.


## 3. Working architecture decision

### 3.1 Basic sign-in path

Use an open, off-chain wallet message-authentication standard—**ERC-4361 / Sign-In with Ethereum (SIWE)** is the leading protocol candidate—for sign-in by standard EOAs.

Expected flow:

1. The application backend creates a cryptographically unpredictable, short-lived, single-use challenge and a SIWE message bound to the exact trusted production origin.
2. The user selects a compatible browser wallet and reviews/signs the plain-language message. The login must not submit a blockchain transaction or charge gas.
3. The application backend validates the full message, configured origin and URI, address, configured chain ID, issue/expiry times, nonce and EOA signature. It rejects expired, reused, malformed, mismatched-origin and invalid signatures.
4. Only after successful verification does the backend establish a protected application session and load the roles associated with the existing internal account record.
5. Application authorization is enforced by the backend on every protected action and API route. A wallet address proves control of that key; it does not automatically make the address an administrator, publisher or owner.

For ordinary EOA message signatures, signature recovery can be performed locally/off-chain by the application verifier. SIWE allows the service to fetch optional extra information from a blockchain or other source, but such resolution is **not required for the basic sign-in flow**. The user's selected wallet software may have its own internal dependencies; AstroCrown must not introduce a direct RPC or relay requirement into its baseline verifier.

### 3.2 Wallet connectivity and optional adapters

- Prefer an available browser-wallet provider using the standard EIP-1193 provider interface. Do not require one wallet brand.
- Do not require a WalletConnect-like relay, external wallet-relay service, ENS lookup, balances, token ownership checks or any other blockchain read just to sign in.
- Mobile/deep-link connection, contract-account signatures, ENS display names, and other optional wallet capabilities must be separate adapters, not dependencies of the baseline.
- Support for smart-contract wallets through ERC-1271 is **deferred** until its chain-state verification needs, RPC alternatives, privacy impact and failure behavior are documented and tested. Do not misrepresent that path as RPC-independent.
- Do not generate, request, transmit, store or recover users' private keys or seed phrases.

### 3.3 Wallet-only recovery

- Do not require an email address, email OTP, phone number or external identity account for registration, normal login or recovery.
- Permit an account to register multiple wallets as authenticators. Linking a new wallet requires an authenticated existing account plus proof of control of the new wallet, or an explicitly approved recovery procedure.
- Users should register a genuinely independent backup before relying on it: a second address derived from the same seed, wallet instance or compromised device is not a genuinely independent recovery factor.
- Recovery must be an explicit, logged state transition. It must not silently transfer an account to the first wallet that signs in, allow a newly linked wallet to escalate privileges, or bypass server-side authorization.
- For ordinary accounts, a separately secured registered backup wallet is the initial candidate recovery path. For owner/security-administrator accounts, evaluate a stronger multi-wallet authorization rule for recovery and changes to privileged roles. The precise threshold, lockout delay and emergency path remain **candidate requirements**, to be tested against usability and catastrophic-loss scenarios before implementation.
- Explain privately to users that linking wallet addresses associates them within AstroCrown; do not publish this association or use it for unrelated cross-site tracking.

### 3.4 Backend, roles and sessions

Wallet-only authentication removes the identity-provider/email/RPC/relay dependencies from the baseline login protocol; it does **not** remove the need for an application backend, durable account/role storage, secure hosting or a recovery plan.

Required controls include:

- Explicitly configured initial owner provisioning. Never use “the first wallet to sign in becomes administrator.”
- An internal stable account identifier linked to one or more verified wallet addresses, with role grants stored separately from wallet proof.
- Server-side role checks for each API operation; direct endpoint calls must not bypass UI controls.
- Short-lived single-use authentication challenges, origin/URI validation, replay protection, attempt/rate limits, and clear failure handling.
- Secure session cookies (`Secure`, `HttpOnly`, suitable `SameSite`), session rotation/revocation, CSRF protection where applicable, logout, expiry and reauthentication for sensitive actions.
- Auditable wallet-link/unlink, recovery, role-change, publishing, rollback and account-suspension events without logging signatures/challenges or sensitive data unnecessarily.
- A maintainable and replaceable storage boundary, portable exports, verified backups and a rehearsed restoration path. Avoid introducing a broad microservice or provider-abstraction framework unless an observed requirement justifies it.

### 3.5 Public-content availability and publishing

- Keep the public site independent of the administrator login service. The public renderer should consume only validated, explicitly approved published content.
- If authentication, admin hosting or publishing is unavailable, continue serving the last known-good public announcement/content. Administrative changes may be rejected or safely queued; they must never be silently lost or published without authorization.
- A hosting/storage failover strategy is a separate requirement from wallet sign-in. Before choosing infrastructure, document shared failure dependencies, a data export/restore route and a tested move to an alternative provider. Do not promise invisible failover until it has been demonstrated.
- No public homepage, `_config.yml`, deployment, secret or production setting is changed by this plan.

## 4. Mandatory architecture and eligibility gates

Each criterion begins **BLOCKED** until evidence exists. An idea, a passing unit test, or successful login against a mock is not enough to mark the relevant production criterion PASS.

| ID | Mandatory criterion | Required evidence before implementation/promotion |
|---|---|---|
| AUTH-001 | Actual public source and deployment path is known | Reproduce the existing public build and identify the authoritative repository/branch, build command/output, deployment target, domain and publication path. |
| AUTH-002 | No identity-provider dependency in the baseline | A traced sign-in request shows no OAuth/SSO provider or vendor identity API is required. |
| AUTH-003 | No app-controlled blockchain RPC or relay in EOA sign-in | Integration test of message creation, signing and EOA verification succeeds with application-side RPC/relay calls disabled. Distinguish this from external dependencies internal to a user's wallet software. |
| AUTH-004 | Secure SIWE verification | Positive and negative tests for correct/incorrect domain and URI, chain ID, nonce, address, signature, expiration, not-before, reuse and malformed messages. |
| AUTH-005 | No privilege-by-first-login | Unconfigured/new wallet is not owner by default; initial owner is provisioned through a reviewed explicit procedure. |
| AUTH-006 | Backend authorization | Test each initial role against permitted and denied actions through both UI and direct API requests; account suspension and role revocation take effect. |
| AUTH-007 | Multi-wallet recovery without email | Test wallet linking, independent backup registration, primary-wallet loss, revoked/compromised wallet, recovery authorization and privileged-account recovery without email or RPC dependencies in the EOA path. |
| AUTH-008 | Session and web security | Verify secure cookie flags, CSRF defenses where applicable, expiration, logout/revocation, nonce replay resistance, rate limits and reauthentication for sensitive operations. |
| AUTH-009 | Data integrity and recovery | Concurrent-edit behavior, audit trail, backup verification, export and restore of a known-good account/role/published state. |
| AUTH-010 | Public resilience and safe publishing | Simulate admin/auth outage, bad draft, failed publication and rollback; public visitors continue to receive the last known-good approved content. |
| AUTH-011 | Portability and provider resilience | Establish a tested export/migration/restore path for hosting and storage; identify shared dependencies and failover limitations. |
| AUTH-012 | $0 eligibility | Verify actual service limits, terms, persistence, required payment method and failure behavior for selected hosting/storage. A stated free tier alone is not evidence. |
| AUTH-013 | Promotion gate | Review the complete diff; run appropriate offline security/unit/contract tests and real integration/browser tests on the exact candidate; record unresolved items as BLOCKED. |

Initial roles to test remain: **Owner/Security Administrator**, **Editor**, **Publisher**, and **Viewer/Auditor**. Their permission boundaries must be documented before implementation.

## 5. Ordered next actions

1. **Verify the real public website and publishing source.** Resolve AUTH-001 before choosing a serverless platform, database, domain routing or migration strategy.
2. **Write an exact wallet-auth contract and candidate record.** Record the SIWE message rules, supported EOA signature format, origin configuration, server-side nonce/session contract, wallet connection assumptions, licensing/dependencies, cost/no-card eligibility, limitations and tests. Evaluate candidates using the repository's existing candidate-evaluation template—no numerical scores.
3. **Prototype the smallest isolated EOA sign-in verifier locally.** No public exposure, real users, secrets, publishing connection or production persistence. Demonstrate it needs no app-controlled RPC, external IdP, email or relay.
4. **Test recovery and authorization before editor integration.** Test at least two independently controlled wallet identities, all initial role boundaries, direct API denial, wallet linking/revocation, recovery and administrator bootstrapping.
5. **Qualify backend hosting/storage and failure recovery independently.** Use the deployment facts from Step 1. Reject any candidate whose mandatory cost, persistence, authentication or recovery requirements are FAIL; retain BLOCKED status if evidence is missing.
6. **Integrate the verified auth core with the existing editor only after the gates pass.** Keep it under `development/`, preserve draft-only behavior, and separately build/verify explicit publishing and rollback.
7. **Rehearse outage and alternate-provider recovery**, then obtain the target repository's required review and exact-commit CI before any production promotion.

## 6. External contract references checked 2026-10-20

- ERC-4361 / Sign-In with Ethereum: https://eips.ethereum.org/EIPS/eip-4361 — off-chain message-based authentication; origin, URI, nonce, chain ID and time fields; validation guidance; optional resolution of additional chain data; replay/phishing considerations.
- EIP-191 / Signed Data Standard: https://eips.ethereum.org/EIPS/eip-191 — signed-message format used for ordinary Ethereum message signatures.
- EIP-1193 / Ethereum Provider JavaScript API: https://eips.ethereum.org/EIPS/eip-1193 — common interface between web applications and wallet providers. Treat providers as untrusted inputs; this interface is not itself a guarantee that the provider's own client/network dependencies are absent.
- ERC-1271 / Standard Signature Validation Method for Contracts: https://eips.ethereum.org/EIPS/eip-1271 — separate validation method for contract-account signatures; integration may depend on chain state and must not be described as RPC-independent.
- Repository gate: `development/DEVELOPMENT-AND-AUDIT-CONVENTION.md`, particularly sections 5–12 and 16–17.

## 7. Impact Analysis

**IF this plan is followed:** authentication will be designed around wallet ownership and AstroCrown-controlled permissions rather than delegating account identity to an external provider. The basic EOA login path can avoid mandatory email delivery, third-party identity, app-controlled blockchain RPC and wallet relays. Recovery, server authority, hosting, storage and public publishing remain explicit separately tested concerns.

**IF this plan is not followed:** the editor risks acquiring accidental dependencies on hosted login, email, chain RPC, relays or a specific wallet library before the actual public deployment and recovery requirements are understood. Provider outage, email takeover, first-user privilege escalation, unsafe wallet linking and unavailable published content may then require expensive architectural rework.

## 8. Current result and stop condition

- Architecture direction: **RECORDED AS THE WORKING DIRECTION** from the owner's instruction.
- Existing editor authentication: **NOT IMPLEMENTED**.
- Production deployment source: **BLOCKED / UNVERIFIED**.
- SIWE library, backend host and durable storage candidates: **NOT SELECTED**.
- Auth, role, recovery, provider-independence, $0 and production resilience criteria: **BLOCKED pending tests**.
- Production changes: **NONE**.

Do not implement or deploy the login flow until AUTH-001 is resolved, the exact contract is written, mandatory candidates are eligible, and the necessary negative, integration, recovery and authorization tests are passing.