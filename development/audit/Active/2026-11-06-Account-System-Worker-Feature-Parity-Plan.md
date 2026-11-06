# AstroCrown Account System — Worker Feature-Parity Plan

**Review date:** 2026-11-06  
**Status:** SCOPE RECORDED / CURRENT WORKER CORE QUALIFICATION PASSED / FULL ACCOUNT FEATURE PARITY NOT IMPLEMENTED / REMOTE STAGING NOT DEPLOYED  
**Repository:** `ACROWN-System/AstroCrown-Web`  
**Parent work:** [PR #141 — Passkey-first account foundation](https://github.com/ACROWN-System/AstroCrown-Web/pull/141)  
**Baseline branch head reviewed:** `267fe4a9f034fbfd994faaf114f3d893913f68e3`

## 1. Purpose

Continue the account system as a complete, coherent product capability rather than treating account creation and ordinary sign-in as the entire deliverable. The scope includes account registration and recovery, wallet connection/authentication, the shared User dashboard, the separately gated Administrator dashboard, credential/session lifecycle, account security, privacy, auditability and production-shaped staging.

This plan records the verified gaps between the broader local reference prototype and the narrower JavaScript Worker/D1 qualification port. It does not authorize a merge, a provider commitment, a Cloudflare deployment, paid services, public onboarding or the use of real account data.

## 2. Governing decisions retained

1. **Passkey-first account identity.** WebAuthn discoverable passkeys are the primary authenticator for ordinary and administrator accounts. Email, password, SMS, hosted identity providers and email-based recovery are not required and must not be reintroduced as account dependencies.
2. **Recovery is independent of wallet ownership.** The account receives a high-entropy, single-use offline recovery key. Its raw value is displayed once; only a salted one-way verifier is stored. Successful recovery consumes the previous key, requires a replacement passkey, revokes prior account sessions/credentials as defined by the recovery policy, and issues a replacement key once.
3. **Wallet connection is not account creation or account authentication by itself.** A normal account must work without connecting a wallet. A wallet signature is an off-chain, fresh, purpose-bound proof; it is not a transaction, balance check, deposit, stake or permission grant.
4. **Ordinary-user wallet backup is optional and separate.** The accepted passkey-first requirements permit a user-selected wallet as an additional authenticator, but this account-level wallet-backup path is not implemented yet. It must have its own challenge purpose and recovery rules and must not be conflated with administrator wallet step-up.
5. **Administrator authority is server-owned.** A user account can receive an administrator role only through a separately authorized, audited role-governance operation. A passkey or wallet signature cannot self-appoint an administrator. Roles and permissions remain separate from account identity and wallet addresses.
6. **One shared User dashboard, one separately gated Administrator dashboard.** An administrator retains ordinary User dashboard access. The Administrator entry is shown only when the backend confirms the role; entering the separate Administrator dashboard additionally requires the enrolled administrator-wallet proof and current server authorization.
7. **Strict $0/no-card qualification.** No paid plan, billing method, paid identity/email provider, commercial RPC or other paid dependency may be activated as part of this work. Missing quota, account eligibility or configuration must fail closed.

The controlling requirements remain:
- `development/account-continuity/PASSKEY-FIRST-ACCOUNT-AUTHENTICATION-AND-RECOVERY-REQUIREMENTS.md`
- `development/account-continuity/USER-AND-ADMIN-ACCOUNT-REQUIREMENTS.md`
- `development/account-continuity/NOVA-ADMINISTRATIVE-SMART-ACCOUNT-SECURITY-SPEC.md`

The future NOVA administrative operations smart account is a distinct transaction-enforcement system. It is not a substitute for an external administrator identity wallet or the user's own optional wallet backup, and its production/on-chain activation remains separately gated.

## 3. Verified implementation baseline

### 3.1 Worker/D1 qualification port

At the reviewed baseline, the Worker has passed local Wrangler/Workerd and virtual-authenticator browser qualification for:
- passkey account registration and discoverable sign-in;
- exact configured origin/RP checks, user verification and one-use/expiring WebAuthn challenges;
- one-time offline recovery-key issuance, consumption, rotation and replacement-passkey registration;
- revocation of prior passkeys and account sessions during recovery;
- first-party HttpOnly session cookies, rate-limit records, security headers and a basic security-audit table;
- the shared homepage and basic User dashboard, built from an allowlisted asset set;
- avatar selection and account status/security summary;
- actual ML-DSA-44 virtual-credential registration and later assertion verification in the local qualification runtime, with the stored COSE algorithm reported as `-48`.

Latest exact-head CI observed for the baseline:
- [Account Staging Worker Qualification #99](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/42112663512) — PASS.
- [Local Wallet Authentication Prototype Tests #651](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/42112663520) — PASS.
- [External Review Pipeline CI #926](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/42112663563) — PASS.
- [NOVA RSI Engine CI #1414](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/42112663556) — PASS.
- [NOVA RSI CodeQL Security Analysis #947](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/42112663509) — PASS.

These checks establish the tested local qualification scope only. They do not qualify a deployed Cloudflare Worker, physical authenticators, all browsers/devices or a production security posture.

### 3.1.1 Block A browser qualification — PASS (local only)

The complete ordinary-account security lifecycle was verified by the GitHub-hosted **Account Staging Worker Qualification #176**:
- [Run #176](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/42122679471) — **PASS**.
- Chrome virtual-authenticator assertions passed for account creation and sign-in, fresh security step-up, additional passkey enrollment on a separate authenticator, passkey label update and revocation, last-passkey protection, recovery-key rotation, rejection of the superseded recovery key, concurrent session listing and revocation, and passkey-loss recovery/replacement sign-in.
- The run also passed all Worker invariant checks, restricted asset build, JavaScript/Worker bundle validation, all three local D1 migrations, local HTTP/origin checks, manual deployment-workflow parsing and remote fail-closed sentinel checks.
- [Local Wallet Authentication Prototype Tests #691](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/42122679444) — **PASS**.
- [External Review Pipeline CI #966](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/42122679562) — **PASS**.
- [NOVA RSI Engine CI #1454](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/42122679446) — **PASS**.
- CodeQL run #987 was still in progress at the time this record was updated; it is not counted as a pass.

This is a GitHub-hosted local Worker/D1 qualification using disposable synthetic test data and Chrome virtual authenticators. It is **not** a remote Cloudflare deployment, physical-device cross-browser qualification, independent penetration test, certification, or production approval.

### 3.2 Capabilities present only in the local reference prototype

The Python reference prototype includes broader development-only account and administrator functionality, including:
- a common User dashboard and separate Administrator dashboard;
- server-owned administrator role appointment and revocation with distinct permissions and audit events;
- EVM/EIP-4361 SIWE administrator-wallet enrolment and fresh session step-up;
- up to three enrolled administrator wallets, with any one active enrolled wallet sufficient for that step-up;
- a shared header wallet connection prompt that is invoked only after the user chooses administrator access or another wallet-dependent action;
- in-app Alerts and Messages and case-management routes.

Those capabilities are not thereby available in the Worker deployment. The Python prototype is a regression/reference implementation, not a deployable Worker backend.

### 3.3 Explicit Worker gaps

The Worker/D1 port currently:
- restricts `auth_accounts.role` to `user` and returns ordinary-user-only role state;
- hard-codes administrator wallet counts/authorization as absent and rejects `/api/admin/*` endpoints;
- has no D1 administrator wallet registry, permission/delegation tables or role governance operations;
- has no ordinary-user wallet-backup enrollment/verification path;
- does not yet provide add/name/list/revoke management for multiple passkeys;
- reports active session count but does not provide session listing or user-directed session revocation;
- does not provide passkey-confirmed security step-up for sensitive credential/session changes;
- disables staging communications and case/feedback routes by design.

The current UI's dashboard/security copy accurately marks some of these as not implemented. It must not be changed to imply a control works until the corresponding backend and end-to-end tests exist.

## 4. Ordered implementation blocks

### Block A — Ordinary account security lifecycle (local qualification passed)

Port a complete user-controlled security center to Worker/D1 while preserving the passkey-first authority:
- list active passkeys with privacy-minimal metadata and user-chosen labels;
- add another passkey only after fresh proof from an existing account authenticator and bind the new registration to the current account/session;
- revoke a selected passkey after fresh proof, preventing removal of the last usable authenticator unless a separately accepted recovery-safe path exists;
- list the account's own active sessions using only necessary metadata; allow revocation of other sessions while preserving the current session;
- provide explicit sign-out/revoke-current-session behavior;
- permit user-authorized recovery-key replacement only after fresh passkey proof, show the new key once, invalidate the old key immediately and never expose the stored verifier;
- write sanitized security-audit events for credential binding/removal, recovery-key replacement, session revocation and relevant failures;
- use short-lived, one-use, account- and session-bound challenges/step-up grants, strict throttling and fail-closed behavior.

Acceptance must include real-browser virtual-authenticator tests for adding a second credential, cancellation, duplicate registration, invalid/replayed/expired challenges, revocation, last-authenticator protection, session revocation and recovery-key rotation. Do not add device fingerprinting, unnecessary IP history or user-agent tracking merely to label sessions.

### Block B — Administrator role and permission authority (RBAC core qualified locally; owner bootstrap remains gated)

**Hosted evidence:** [Account Staging Worker Qualification #198](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/42147751078) passed the Worker/D1 role-governance integration sequence on 2026-11-06. It verified ordinary-user self-promotion denial, authorized grant, self-grant rejection, duplicate-grant rejection, explicit delegation checks, non-delegable default on newly assigned permissions, the separate revocation permission, role/wallet revocation, preservation of ordinary account sessions, target-only revocation notices, notice acknowledgement ownership and database-enforced append-only audit rows. The same commit passed [Local Wallet Authentication Prototype Tests #702](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/42147751121), [External Review Pipeline CI #977](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/42147751202), [NOVA RSI Engine CI #1465](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/42147751058) and [NOVA RSI CodeQL #998](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/42147751119).

**Test boundary:** the role-governance browser fixture seeded a synthetic already-verified administrator wallet session directly into the disposable Wrangler local D1 database. That tests RBAC independently; it does not qualify a real EVM signature, a deployed wallet enrollment API or a production root administrator. No fixture endpoint exists in the Worker and no remote D1 was used.

**Still blocked within Block B:** an authorized, auditable first-administrator bootstrap and its recovery/continuity boundary are not implemented in the Worker. No public or unauthenticated bootstrap endpoint may be added. Production role appointment must remain closed until the owner-controlled bootstrap is separately specified and qualified. Real wallet proof is Block C.

#### First-administrator bootstrap and exceptional wallet recovery — owner-controlled design gate

The current owner-operated `provision_admin.py` utility is a **local SQLite development/test adapter only**. Its `--actor` argument is an audit label, and its typed confirmation phrase is an operator-error guard; neither proves the identity or authority of the person running it. It must not be repurposed as a remote D1/Cloudflare bootstrap mechanism.

The production-shaped bootstrap must satisfy all of the following before any implementation is enabled:

- The target must already be an ordinary AstroCrown account with a stable `AC-` account identifier and an active passkey session. Bootstrap must not create an account and an administrator role in one public registration flow.
- The bootstrap authority must be defined separately from the target account's administrator role and wallet. No first-login-wins rule, public bootstrap route, client-supplied role flag, connected-wallet-only promotion or ordinary `admin.roles.grant` bypass is permitted.
- The owner/Imperial HSIAN authority must be independently established. A protected GitHub Actions environment with an explicitly designated reviewer is a possible operator gate, but repository review alone is not cryptographic owner proof. A separate one-time owner-controlled signature must bind the exact target account, proposed administrator wallet, chain, bootstrap purpose, environment, request identifier and expiry. Neither gate alone is sufficient.
- The operation must be one-time, idempotent and fail closed. It must verify that no initial bootstrap has already been consumed, reject conflicting/previously revoked wallet addresses, write the role and append-only audit evidence atomically, and leave no partial role/permission state if verification fails. A durable singleton bootstrap-consumed record is required.
- The initial permission set must be explicitly approved. An administrator role does **not** automatically include `admin.roles.grant`; the default permission set is empty unless the owner explicitly approves specific permission identifiers and any delegation rights.
- Role assignment and administrator-wallet enrollment remain separate ceremonies. The target must prove control of the proposed wallet through the existing server-issued EVM/SIWE challenge, then complete a separate fresh signature for the ten-minute administrator session. The owner bootstrap signature itself must not silently create an active admin session.
- No wallet seed phrase, private key, recovery phrase or raw secret may be requested or stored. The present Worker adapter uses EIP-4361/EIP-191 message signatures; it performs no balance check, deposit or blockchain transaction and therefore does not claim proof of funds or a transaction. Any different chain or transaction-based enrollment requirement must be specified and cost-reviewed separately before implementation.
- All-wallet-loss recovery is not bootstrap replay. When an administrator still has a role but every wallet ever registered for that account is inactive, the Worker now blocks passkey-only replacement enrollment, reports `adminWalletRecoveryRequired`, and disables the administrator-entry control while preserving ordinary User-account access. A new wallet must be restored only through a separately approved owner recovery operation; old revoked addresses must not be reactivated and all prior admin step-up state must be invalidated.
- A formally revoked administrator role is not restored by wallet recovery. Whether a later, separately authorized role reappointment with historical inactive wallet records may use the same recovery ceremony remains an explicit governance decision; the current Worker conservatively blocks self-service enrollment in that state.
- The exceptional recovery authority must remain separate from routine administrator appointment. Monitoring-driven role removal, wallet revocation, notification and asset-protection responses are separate NOVA capabilities and are not implied by this local all-wallet-loss gate.

**Current release gate:** the exact-head browser qualification [Account Staging Worker Qualification #276](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/42154118357) exercised the inactive-history case. With the ordinary passkey session still valid, all prior admin-wallet records were marked inactive in the disposable local D1 fixture; the Worker rejected a new enrollment challenge with HTTP 409 and an owner-authorized recovery explanation, while the User dashboard kept the account available and disabled the Administrator entry. This proves the negative self-service boundary only; it does not implement or qualify the owner recovery mechanism.

Port the existing permission model only after its provisioning/trust boundary is independently reviewed:
- support ordinary and administrator roles in persistent storage without allowing public self-assignment;
- use stable AstroCrown account identifiers to target existing accounts;
- require distinct, server-checked permissions for role grant and role revocation;
- permit delegation only of explicitly delegable permissions; newly granted permissions remain non-delegable unless the grant explicitly says otherwise;
- reject self-grant, unauthorized escalation, conflicting/replayed requests and unauthorized permission delegation;
- preserve the target's ordinary account and User dashboard after administrator-role revocation;
- record actor, target, reason, effective permission changes and timestamp in an append-only governance audit trail;
- define and test the authorized initial administrator bootstrap and recovery boundary before exposing any production appointment operation.

No ordinary user, passkey registration, wallet connection or wallet signature can create an administrator role.

### Block C — Administrator wallet registry and step-up (local qualification passed; deployment/bootstrap gated)

**Hosted evidence:** [Account Staging Worker Qualification #229](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/42149830004) passed the real EVM wallet lifecycle using deterministic test-only accounts in the GitHub-hosted runner and ephemeral Wrangler local D1 database. It verified exact EIP-4361 message binding, EIP-191 EOA recovery, rejection of a wrong signer, consumption/replay rejection after invalid signatures, first-wallet enrollment, a separate fresh administrator-session signature, ten-minute expiry, additional wallet enrollment only after renewed step-up, a three-wallet maximum, fourth-wallet rejection, individual wallet revocation, last-wallet protection, ending administrator-only access without signing out of the ordinary account, and immutable wallet audit.

The same exact revision passed [Local Wallet Authentication Prototype Tests #718](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/42149830035), [External Review Pipeline CI #993](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/42149830000), [NOVA RSI Engine CI #1481](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/42149829848), and [NOVA RSI CodeQL #1014](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/42149830352).

**Adapter boundary:** this is EOA-only EVM/EIP-191 verification performed locally with message recovery; no RPC, on-chain transaction, balance check or funds are used. Contract-wallet ERC-1271, Bitcoin/BIP-322, Solana/SIWS and other wallet families are not included. The test-only private keys never enter Worker code or configuration.

**Dashboard and all-wallet-loss UI integration evidence:** [Account Staging Worker Qualification #276](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/42154118357) passed the complete GitHub-hosted local browser sequence, including the shared homepage header Wallet control, explicit Administrator access confirmation, exact-message signature-review dialog, server-verified dashboard entry, additional-wallet enrollment through the same header control, per-wallet revocation controls, preserving the currently authorizing wallet when another is revoked, and ending admin step-up without signing out of the ordinary account. The same run seeded the disposable D1 fixture with administrator wallet history but zero active wallets, verified HTTP 409 for attempted passkey-only replacement, and verified the User dashboard's owner-recovery warning and disabled admin entry. This is a scoped UI and negative recovery-boundary pass, not the implementation of owner recovery or full dashboard parity.

**Other exact-revision checks:** [Local Wallet Authentication Prototype Tests #734](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/42152828150), [External Review Pipeline CI #1009](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/42152828144), [NOVA RSI Engine CI #1497](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/42152828126), and [NOVA RSI CodeQL #1030](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/42152828133) all passed.

**Release boundary:** the first-administrator bootstrap is still not implemented, no remote D1 exists, and no real account has been appointed as administrator. The qualified local UI path runs only against synthetic accounts and a seeded test role. The overall User/Administrator dashboard parity, role-management UI click-through coverage, communications, and production onboarding remain incomplete; these APIs are not a deployable public administrator service.



Port the existing EVM/SIWE implementation as a separate wallet-authentication boundary:
- show the wallet connection prompt only after the user explicitly requests Administrator access or another wallet-dependent feature;
- use the same homepage header Wallet control for the connection step;
- first require an already-authenticated account and server-assigned administrator role;
- enroll the first wallet only for that already-appointed administrator account; require a separate fresh signature for the administrator session step-up;
- allow up to three separately enrolled administrator wallets, with any one active registered wallet able to prove control for a fresh step-up;
- re-check connected address and chain before requesting a signature; bind challenges to the account, session, domain, chain, exact purpose and expiry; enforce one-time use;
- never submit a blockchain transaction, query balance, require funds, request a seed phrase/private key or treat connection alone as proof of authority;
- support explicit end-admin-access and server-side wallet revocation paths, with account-level alerts where an authorized administrator wallet/role is revoked.

EVM/SIWE is the first adapter only. Bitcoin/BIP-322, Solana/SIWS, contract wallets and other families remain separately qualified work; one EVM implementation must not be labelled multi-chain.

### Block D — Optional ordinary-user wallet backup

Keep this separately scoped from administrator wallets. Implement only after a chain-specific proof and recovery threat model passes review:
- user opt-in, no wallet requirement and no disruption to passkey-only account use;
- separate table/credential purpose from administrator wallets;
- fresh, origin/domain-bound, chain-bound, expiring, one-use off-chain signature challenge;
- no balance, payment, transaction, stake or provider fee requirement;
- clear explanation of shared seed/device/cloud recovery risks;
- user-controlled add/remove/revoke and safe account recovery tests;
- no cross-purpose replay into administrator step-up.

The EVM adapter may be evaluated first, but the account-level optional wallet-backup path must not be described as implemented until the complete lifecycle is present and tested.

### Block E — Dashboard parity and security assurance (partial UI integration locally qualified)

**Scoped qualification:** the administrator entry/step-up path has been integrated with the existing homepage header Wallet control and separate Administrator dashboard shell. [Account Staging Worker Qualification #259](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/42152828129) passed real browser interactions for role-confirmed entry, wallet signature review, first/additional wallet enrollment, wallet-list revocation controls, continued access through a different registered wallet, and admin-only logout while preserving the User session. The ordinary-account browser lifecycle and the Worker API governance tests also passed in the same run.

This does not complete Block E. The following remain separate coverage and implementation work: full account/profile/service parity, explicit dashboard click-through tests for the role grant/revoke forms and revocation notice, accurate communications/case availability, complete assurance-page parity, and the remaining account features listed below.

Complete the product-facing areas against the same authoritative backend state:
- common User dashboard available to every signed-in member, including administrators;
- account/profile overview, referral attribution state, account services, wallet status (only when actually enrolled), recovery status, security status and privacy controls;
- Administrator entry visible only from server-confirmed role state and never for an ordinary user;
- separately routed Administrator dashboard with only server-authorized permissions and a clear step-up expiry/end-access state;
- role-revocation notice in the User dashboard while preserving ordinary account access;
- accurate display of passkeys, authenticator algorithm, recovery key state and active sessions without overclaiming certification or post-quantum support;
- security assurance page that distinguishes implemented controls, tested controls, blocked controls and future research;
- no disabled communications, case portal, wallet or admin controls presented as active features.

### Block F — Production-shaped staging and release qualification

Only after the Worker/D1 lifecycle and UI parity tests pass:
- preserve one same-origin application/API architecture and one release artifact;
- use separate staging database, secrets, access gate and exact WebAuthn RP ID/origin;
- retain synthetic, disposable staging data only;
- prove migrations, export/restore, quota/CPU behavior, rate limits, session/cookie controls, wrong-origin rejection and cleanup;
- verify the real Cloudflare account's free/no-card entitlement and measured free-tier behavior before any deployment authorization;
- run real deployed-browser checks and record the actual artifact hash and runtime;
- keep the guarded deployment workflow main-only, manual and separately authorized;
- complete all three cleanup passes and applicable provider-retention quarantine before any later production promotion.

## 5. Non-regression and safety rules

- Immutable historical backup snapshots must never be modified, deleted, renamed, compacted or overwritten. They are not a cleanup target.
- Preserve the Python reference implementation and compare its behavior with the Worker contract; do not silently drop broader working local behavior.
- Do not enable dormant email/password or outbound email code as a shortcut.
- Do not expose admin or wallet UI before the API and permission checks exist; every displayed control must have a tested server action.
- Do not log raw credentials, signatures, passkey responses, recovery keys, cookies, secrets, private message bodies or request bodies.
- Do not add user tracking or collect device biometrics/PINs, wallet seed phrases or private keys.
- No merge, main-branch publication, remote D1 creation, account Worker deployment, production DNS/domain change, billing method, paid service or public account onboarding is authorized by this plan.
- If a technical requirement cannot be met within the $0/no-card constraint or current provider capability, record it as BLOCKED instead of silently selecting a paid substitute or weakening security.

## 6. Current release boundary

The local Worker/D1 ordinary-account security lifecycle (**Block A**), RBAC core (**Block B**), EOA EVM/SIWE administrator-wallet enrollment and ten-minute step-up (**Block C**), scoped shared-header/Administrator UI integration (**Block E**) and negative all-wallet-loss self-service recovery boundary have passed their exact-head GitHub-hosted local qualification. The all-wallet-loss safeguard is implemented, but its owner-authorized recovery operation is not. The first-administrator bootstrap and its independent owner proof remain blocked; no real account has yet been appointed administrator, and no remote D1 or deployment exists. The next work is to complete the owner-controlled bootstrap/recovery design gate and the remaining Block E dashboard/API parity and click-through tests; Block D optional ordinary-user wallet backup and Block F deployed staging remain separate gates. The overall account system is still **not feature-complete, not remotely deployed and not production-ready**.

This plan is a scope and sequencing record. Each block must be implemented, tested and reviewed against its own acceptance evidence before being marked complete.
