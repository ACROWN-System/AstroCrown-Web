# Active Architecture Plan — Authentication Separation and Optional Wallet Access

**Date:** 2026-10-21  
**Status:** ACTIVE — 2026-10-21 owner decision supersedes wallet-first proposal; ordinary account authentication is separate from optional wallet access; public/editor integration and deployment remain BLOCKED  
**Repository:** `ACROWN-System/AstroCrown-Web`  
**Working branch:** `docs/provider-independent-wallet-auth-plan-2026-10-20`  
**Related editor prototype:** [Draft PR #140 — Build development-only announcement editor with Python draft backend](https://github.com/ACROWN-System/AstroCrown-Web/pull/140)  
**Related account roadmap:** [Account Continuity and Privacy-Preserving Access Roadmap](../../account-continuity/ACCOUNT-CONTINUITY-AND-PRIVACY-PRESERVING-ACCESS-ROADMAP.md)  
**Related preserved editor requirements:** [Announcement-Band Editor Discovery Preservation](2026-10-17-Announcement-Band-Editor-Discovery-Preservation.md)

## 1. Objective

Record the owner's approved direction before selecting production hosting or implementing account sign-in: **separate ordinary AstroCrown account authentication from crypto-wallet access**. A wallet is optional except when a specific feature genuinely requires proof of wallet control. The earlier wallet-first direction is superseded. The isolated local SIWE experiment is retained only as a wallet-capability lab, not as the normal login flow.

The decision is set out in [Authentication Separation and Recovery Decision](2026-10-21-Authentication-Separation-and-Recovery-Decision.md). This document records constraints, gates and the ordered implementation path. It does not select a production authenticator, host, database or recovery vendor.

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


## 3. Authentication separation decision — 2026-10-21

### 3.1 Ordinary account access and wallet access are separate

- Ordinary account creation and sign-in must not prompt for, require, or depend on a crypto wallet. No wallet is required for account settings or features that do not genuinely need wallet control.
- Keep public browsing available without an account wherever the feature permits it.
- Treat account ID, authenticator, wallet address, person/benefit eligibility, account role and recovery capability as distinct. Wallet ownership does not assign a role or prove personhood.
- A wallet-only action must explain why wallet ownership is needed. Transaction signing is distinct from sign-in, and the interface must identify the action and any cost before the user approves a transaction.
- Do not require email, phone, centralized biometrics, or a single platform/provider as the sole ordinary-account access/recovery route.
- This is an architecture decision, not evidence that a replacement sign-in system has been implemented.

### 3.2 Ordinary-account authentication candidates

WebAuthn/passkeys are the leading candidate for evaluation, not yet a production-approved selection. Evaluate synced passkeys, device-bound passkeys and roaming hardware security keys; test browser/device support, RP-origin binding, credential lifecycle, accessibility, non-biometric unlock paths and loss of the passkey-sync provider. Passkey use may depend on the authenticator/platform for sync, so a platform account cannot be presumed universally available.

Do not make biometrics mandatory. Where a device uses biometrics to unlock a passkey, that is a local authenticator behavior; users must have an appropriate non-biometric route, such as a compatible PIN/password or security key. Keep standards-based WebAuthn as a candidate until its flows pass the repository's requirements and tests. If it does not meet the audience's access needs, evaluate a maintained non-wallet alternative rather than building custom cryptography.

The published W3C WebAuthn Level 3 Recommendation (2026-08-25) defines a standards-based web authentication API but does not certify AstroCrown's implementation: https://www.w3.org/TR/2026/REC-webauthn-3-20260825/.

### 3.3 Ordinary-account recovery

Design and test recovery before promoting account authentication. Initial candidates:

- **Multiple authenticators:** let people register and test at least two usable authenticators where feasible. Independence must be real; two methods that depend on the same lost device or locked-out platform account may fail together.
- **Single-use recovery codes:** candidate for a user-held offline fallback. Codes must be sufficiently unpredictable, shown once, stored server-side only in a non-reversible form, limited against guessing, single-use, revocable/rotatable, and absent from logs. Recovery must not automatically authorize role changes, sensitive-memory access, or payout changes.
- **Lost-all-credentials ceremony:** a privacy-preserving, accessible, auditable recovery process with risk-appropriate delay/cooldown, session/credential revocation, and safe re-enrollment. It must test social-engineering threats and explicitly state when recovery may be impossible. Do not default to identity documents, mandatory biometrics, or one email account as the universal answer.
- **Optional email/contact:** may be offered for user-chosen notifications or limited supplemental recovery after threat review, but is not a requirement, sole factor, or external-service dependency for basic access.
- **Privileged account recovery:** Owner/Security Administrator and publishing rights need stronger bootstrap/recovery rules, reauthentication and auditing. There is no first-login/first-wallet administrator rule.

The specific mix remains a candidate decision; this plan does not claim recovery is implemented.

### 3.4 Wallet-specific authentication and recovery

Keep the local EOA/SIWE experiment only as an isolated test of off-chain wallet proof for a feature that genuinely needs wallet control. It is not the ordinary sign-in prototype and must not be integrated as a universal gate.

Multiple independently controlled wallets may help preserve access to a wallet-specific feature. They do not automatically recover an ordinary account, account encryption keys, administrator privileges or payout destination. Two addresses derived from the same seed, controlled by the same compromised device or backed up by the same recovery material are not independent. Linking or unlinking a wallet requires an explicit, authenticated, auditable action. The basic EOA path can test message verification without application-controlled blockchain RPC; that does not approve a production protocol or dependency.

### 3.5 Backend, authorization and sessions

A backend and durable account/role storage may still be needed; separating wallet auth does not remove these responsibilities. Before production integration, implement and test:
- stable internal account IDs distinct from wallet addresses;
- explicit owner provisioning; no privilege-by-first-login;
- server-side role checks for every protected API action;
- challenge/session security for the selected authenticator, expiry, revocation, attempt limits and reauthentication for sensitive changes;
- audited authenticator enrollment/removal, recovery, role change, account suspension, publishing and rollback without unnecessary secrets in logs;
- export, backup and restore behavior with a replaceable storage boundary;
- no account-recovery shortcut to transfer funds, change payout destinations, or expose private/sensitive memory.

### 3.6 Public-content availability and publishing

Keep the public site independent from admin authentication and publishing availability. Public content must continue to render from the last known-good approved version during an admin/auth outage. A failed or unapproved edit must not be silently published or destroy the currently approved content. No public homepage, deployment config, secrets or production settings are changed by this plan.

## 4. Mandatory architecture and eligibility gates

Each criterion begins **BLOCKED** until evidence exists. An idea, a passing unit test, or successful login against a mock is not enough to mark the relevant production criterion PASS.

| ID | Mandatory criterion | Required evidence before implementation/promotion |
|---|---|---|
| AUTH-001 | Actual public source and deployment path is known | Reproduce the existing public build and identify the authoritative repository/branch, build command/output, deployment target, domain and publication path. |
| AUTH-002 | Ordinary sign-in works without a wallet | Register and sign in to a test account without an installed or connected wallet; verify ordinary routes do not trigger wallet prompts. |
| AUTH-003 | No mandatory email or hosted identity provider | Trace core account creation, sign-in and recovery to show that email, phone, and hosted identity-provider APIs are not required. Optional user-selected notification paths are separate. |
| AUTH-004 | Secure SIWE verification | Positive and negative tests for correct/incorrect domain and URI, chain ID, nonce, address, signature, expiration, not-before, reuse and malformed messages. |
| AUTH-005 | No privilege-by-first-login | Unconfigured/new wallet is not owner by default; initial owner is provisioned through a reviewed explicit procedure. |
| AUTH-006 | Backend authorization | Test each initial role against permitted and denied actions through both UI and direct API requests; account suspension and role revocation take effect. |
| AUTH-007 | Ordinary-account recovery remains separate from wallet recovery | Test a second authenticator, device/platform-provider loss, recovery-code use if selected, stolen recovery material, privileged recovery, and wallet loss without locking ordinary account access. |
| AUTH-008 | Session and web security | Verify secure cookie flags, CSRF defenses where applicable, expiration, logout/revocation, nonce replay resistance, rate limits and reauthentication for sensitive operations. |
| AUTH-009 | Data integrity and recovery | Concurrent-edit behavior, audit trail, backup verification, export and restore of a known-good account/role/published state. |
| AUTH-010 | Public resilience and safe publishing | Simulate admin/auth outage, bad draft, failed publication and rollback; public visitors continue to receive the last known-good approved content. |
| AUTH-011 | Portability and provider resilience | Establish a tested export/migration/restore path for hosting and storage; identify shared dependencies and failover limitations. |
| AUTH-012 | $0 eligibility | Verify actual service limits, terms, persistence, required payment method and failure behavior for selected hosting/storage. A stated free tier alone is not evidence. |
| AUTH-013 | Promotion gate | Review the complete diff; run appropriate offline security/unit/contract tests and real integration/browser tests on the exact candidate; record unresolved items as BLOCKED. |

Initial roles to test remain: **Owner/Security Administrator**, **Editor**, **Publisher**, and **Viewer/Auditor**. Their permission boundaries must be documented before implementation.

## 5. Ordered next actions

1. Keep this decision authoritative and the wallet lab optional. The SIWE prototype does not substitute for ordinary account authentication.
2. Verify the real public website and publishing source. Resolve AUTH-001 before setting WebAuthn's relying-party ID/origin or choosing a backend, database, route or migration strategy.
3. Write ordinary-account requirements and a threat/recovery matrix. Cover non-wallet login, non-biometric access, device and synced-provider loss, two authenticators, recovery codes, total credential loss, account takeover, privacy-network access and privileged-account recovery.
4. Evaluate WebAuthn/passkeys and practical fallback candidates. Verify browser/device coverage, dependency maintenance, credential portability, accessibility, $0/no-card constraints and recovery behavior. Do not lock into a vendor or platform ecosystem without evidence.
5. Prototype ordinary account authentication separately on localhost. Use synthetic accounts and no production data/secrets; test recovery before relying on the new login.
6. Qualify durable account/role storage and service-outage recovery. Reuse existing project conventions and avoid unnecessary architecture; document export/restore and keep public approved content independent of auth availability.
7. Only then revisit PR #140 integration. Enforce roles server-side and require wallet access only for explicit wallet-specific operations.
8. Review exact diffs and checks before any promotion. No automatic merge or deployment.

## 6. External contract references checked 2026-10-20

- ERC-4361 / Sign-In with Ethereum: https://eips.ethereum.org/EIPS/eip-4361 — off-chain message-based authentication; origin, URI, nonce, chain ID and time fields; validation guidance; optional resolution of additional chain data; replay/phishing considerations.
- EIP-191 / Signed Data Standard: https://eips.ethereum.org/EIPS/eip-191 — signed-message format used for ordinary Ethereum message signatures.
- EIP-1193 / Ethereum Provider JavaScript API: https://eips.ethereum.org/EIPS/eip-1193 — common interface between web applications and wallet providers. Treat providers as untrusted inputs; this interface is not itself a guarantee that the provider's own client/network dependencies are absent.
- ERC-1271 / Standard Signature Validation Method for Contracts: https://eips.ethereum.org/EIPS/eip-1271 — separate validation method for contract-account signatures; integration may depend on chain state and must not be described as RPC-independent.
- Repository gate: `development/DEVELOPMENT-AND-AUDIT-CONVENTION.md`, particularly sections 5–12 and 16–17.

## 7. Impact Analysis

**IF this decision is followed:** ordinary users will not be forced into crypto-wallet UX, and wallet loss/absence will not automatically block unrelated account access. Authenticator registration, wallet association, roles, recovery and publishing can be evaluated as separate trust boundaries. A user may still choose wallet authentication where it genuinely serves their feature.

**IF the prior wallet-first direction were retained:** unfamiliar wallet UX could make users distrust or abandon registration; lack of wallet support could block ordinary use; wallet compromise could spill into unrelated app access; and changing the model later could require account migration and recovery work.

## 8. Current result and stop condition

- Authentication direction: **OWNER-APPROVED — ordinary account authentication is separate from crypto-wallet access.**
- Former wallet-first proposal: **SUPERSEDED by the 2026-10-21 decision.**
- WebAuthn/passkeys: **LEADING CANDIDATE; not selected or implemented yet.** Portability, device support, non-biometric access and recovery remain to be tested.
- Recovery codes / multi-authenticator / total-loss recovery: **CANDIDATES; not implemented or approved.**
- Local EOA/SIWE prototype: **RETAINED AS OPTIONAL WALLET-CAPABILITY LAB ONLY; not ordinary account sign-in.** No real-wallet interaction is required for the current architecture decision.
- PR #140 editor: remains a separate development-only draft with no authentication/authorization; do not integrate until ordinary account auth and role boundaries are specified and tested.
- Public hostname, publication source, deployed artifact and DNS/CDN path: **AUTH-001 BLOCKED / UNVERIFIED.**
- Production authentication, account recovery, role storage, publishing, hosting and durable storage: **NOT IMPLEMENTED / NOT APPROVED.**
- Production changes: **NONE**.

The next implementation should prototype ordinary account authentication without a wallet, independently of the SIWE lab, and should include recovery tests before promotion. Keep all development work under `development/`; do not merge or deploy on the strength of wallet-lab CI alone.