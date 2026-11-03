# Passkey-First Account Implementation Status and Release Boundary

**Review date:** 2026-11-04  
**Status:** CURRENT DEVELOPMENT IMPLEMENTATION / LOOPBACK-ONLY / NOT PRODUCTION  
**Repository:** `ACROWN-System/AstroCrown-Web`  
**Pull request:** [#141 — Passkey-first account foundation; optional wallet backup](https://github.com/ACROWN-System/AstroCrown-Web/pull/141)

## 1. Governing account decision

The only active account-authentication and recovery design is [Passkey-First Account Authentication and Recovery Requirements](../../account-continuity/PASSKEY-FIRST-ACCOUNT-AUTHENTICATION-AND-RECOVERY-REQUIREMENTS.md).

- WebAuthn passkeys are the primary account authenticator for ordinary users and administrators.
- Discoverable passkey sign-in does not require an email address, username prompt or password.
- Account recovery uses a high-entropy, user-held, single-use offline recovery key followed by replacement-passkey registration.
- Email addresses, email verification, email password-reset, SMS and hosted identity providers are not part of account registration, sign-in or recovery.
- Wallet authentication remains separate. The current EVM/SIWE implementation is used for administrator wallet enrollment and short-lived privileged step-up; it is not the ordinary account authenticator. Optional ordinary-account wallet backup remains unimplemented.
- Account identity, sessions, roles and permissions are independent of wallet addresses and passkey credential identifiers.

## 2. Current local prototype capabilities

The loopback prototype under `development/account-continuity/prototype/` currently includes:

- WebAuthn discoverable registration and sign-in, server-side challenge lifecycle, origin/RP checks, user-verification requirements and credential signature verification through the pinned open-source relying-party library.
- A one-time 256-bit offline recovery key, shown once; only a salted one-way verifier is stored. Successful recovery consumes the previous key, requires a replacement passkey, revokes prior passkeys and sessions, rotates the recovery key and records an audit event.
- Stable account identifiers, local sessions, the common User dashboard, server-owned roles and permissions, and a separate Administrator dashboard.
- Administrator wallet enrollment and privileged step-up through the isolated EVM/SIWE proof-of-control path.
- Private in-app Alerts and Messages, with recipient-scoped retrieval, acknowledgement/read state, bounded pagination and permission/audit controls. These are in-app communications, not email delivery.

The prototype is not an online public account service. It binds to loopback and uses a local SQLite database.

## 3. Experimental ML-DSA boundary

The local WebAuthn implementation negotiates ML-DSA algorithms ahead of classical fallbacks and can verify ML-DSA signatures on the server. Automated backend tests generate ephemeral ML-DSA keys and exercise genuine signature verification, including rejection of invalid challenges and modified signatures.

This is **not proof of browser, operating-system, platform-authenticator, synced-passkey or hardware-key interoperability**. The WebAuthn/CTAP ML-DSA mapping remains an Internet-Draft. Registration options advertising ML-DSA do not prove the authenticator selected it. A credential may be described as post-quantum only after a real authenticator registers an ML-DSA public key, the server verifies the ceremony, stores the actual algorithm and verifies a later authentication assertion with that key. Classical fallback credentials must be reported as classical.

## 4. Explicit exclusions and residual code boundary

No account-authentication or recovery behavior may depend on email, password, email verification, password-reset email, SMS, newsletter delivery, SMTP or a third-party identity provider. No production email sender is configured or selected.

Dormant email-oriented test/legacy code remains isolated in the development branch only; it is not a supported account feature and must not be enabled or configured for public users. Its removal is a separate code-pruning task with a dedicated regression review.

Astro-Wallet, custody, seed-phrase collection, generic multichain signing, payment/transaction execution, MPC/TSS, a production account API, public database, production session infrastructure and public onboarding are outside the current prototype's implemented scope.

## 5. Production readiness blockers

Before any real-user onboarding, the project still requires:

1. A verified public HTTPS deployment origin and exact production WebAuthn RP ID/origin policy.
2. Durable shared account storage, protected secrets, tested backup/restore and a documented incident/availability process.
3. Complete multi-authenticator enrollment/removal, session viewing/revocation, bounded session lifetimes and production cookie/CSRF/security-header controls.
4. A separately approved optional wallet-backup design, if retained, with chain-specific proof and recovery tests.
5. Approved Terms of Use and Privacy Policy, retention/export/deletion behavior, accessibility and cross-browser/device testing.
6. A threat-model review, independent security testing and an explicit production promotion decision.
7. Evidence that the chosen hosting and operating model can remain within the strict $0/no-card constraint without promising unsupported uptime or capacity.

## 6. Verification record

The implementation and its browser/API regression tests are maintained in PR #141. Current exact-head workflow results must be read from the PR's Checks tab and the linked GitHub Actions runs; a previous green result must not be carried forward to a later commit without checking that exact commit.

This is the current implementation/status summary. Earlier account-flow, email-provider and hosting experiments are not current product requirements or provider selections.