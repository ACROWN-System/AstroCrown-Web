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

### Block A — Ordinary account security lifecycle (first implementation block)

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

### Block B — Administrator role and permission authority

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

### Block C — Administrator wallet registry and step-up

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

### Block E — Dashboard parity and security assurance

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

At the reviewed baseline, the local Worker/D1 account lifecycle is qualified for its limited scope, but the account system is **not feature-complete, not remotely deployed and not production-ready**. The next code block is **Block A — Ordinary account security lifecycle**. Administrator role governance, administrator-wallet step-up, ordinary-user wallet backup, complete dashboard parity and deployed staging remain separate implementation and evidence gates.

This plan is a scope and sequencing record. Each block must be implemented, tested and reviewed against its own acceptance evidence before being marked complete.
