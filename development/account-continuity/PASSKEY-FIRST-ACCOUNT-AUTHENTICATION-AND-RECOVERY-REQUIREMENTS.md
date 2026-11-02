# Passkey-First Account Authentication and Recovery Requirements

**Decision date:** 2026-11-03  
**Status:** OWNER-ACCEPTED DESIGN DIRECTION / IMPLEMENTATION NOT YET STARTED  
**Scope:** AstroCrown ordinary-user and administrator account authentication  
**Parent:** [PR #141 — account foundation](https://github.com/ACROWN-System/AstroCrown-Web/pull/141)  
**Related requirements:** [User and Administrator Account Requirements](USER-AND-ADMIN-ACCOUNT-REQUIREMENTS.md)

## 1. Adopted principle

Adopt a passwordless, public-key-based account model:

> **The user controls the authenticators that control the account. AstroCrown verifies proof of control; it does not possess the user's private authentication keys and has no staff password-reset or impersonation backdoor.**

This is an engineering requirement, not a claim of perfect security or formal certification. The design is aligned with the W3C WebAuthn standard, current OWASP Passkey Security guidance and relevant NIST SP 800-63B-4 guidance. Every applicable requirement must still be implemented, tested and reviewed before any conformance claim.

The old email/password-first direction is superseded. Email address, password, email verification, email reset links, SMS OTP, and a third-party identity provider are not required for registration, sign-in, authenticator management or account recovery.

## 2. Credential model

Each AstroCrown account receives a stable, random internal account ID. Account identity, sessions, roles and permissions remain independent of all authenticator identifiers.

### 2.1 Primary authenticator — WebAuthn

- Use WebAuthn discoverable public-key credentials (passkeys) for normal account registration and sign-in.
- The authenticator creates and retains the private key. AstroCrown stores only the credential ID, public key and minimum lifecycle/security metadata needed for verification and management.
- Require user verification for account authentication according to the approved policy. The user verifies locally through an authenticator-supported PIN, biometric or equivalent local mechanism. AstroCrown must never collect or store biometric samples, device PINs or private keys.
- Never transmit a reusable private secret to the application. Each authentication uses a fresh, server-generated challenge and a cryptographic assertion.
- Use an exact, narrowly scoped WebAuthn Relying Party ID and exact HTTPS-origin allowlist. WebAuthn registration and sign-in require a secure context; localhost is permitted for local development.
- Prefer discoverable credentials so an email address or username need not be submitted as an authentication secret. Any optional public account label must not become an authenticator or recovery factor.
- Default to privacy-preserving/minimal attestation. Do not collect device identity or globally identifying authenticator details without a separately justified and reviewed need.

### 2.2 Optional wallet authenticator — user-selected backup

- Users may choose to register a separately controlled cryptocurrency wallet as an additional account authenticator/recovery method. A wallet is optional; users do not need crypto to create or use an AstroCrown account.
- A wallet backup is not automatically independent merely because it has a different address or wallet-app name. Explain common-mode risk where credentials share a seed, device, cloud account or recovery channel.
- Wallet proof must use a fresh, purpose-bound, origin/domain-bound, expiring, single-use off-chain challenge. The signature must never be accepted as a blockchain transaction.
- No minimum balance, deposit, stake, proof-of-funds check, balance query or network transaction is allowed for authentication or recovery.
- Qualify each wallet-family signing protocol independently. The current local wallet verifier is EVM EOA / EIP-4361 (SIWE) only. Bitcoin/BIP-322, Solana/SIWS and contract-wallet verification are not implied or implemented by this decision.
- Wallet account recovery, ordinary account authentication and administrator step-up are distinct challenge purposes. A signature for one purpose must not be replayable or accepted for another.
- An administrator still needs an ordinary authenticated account session and the separately required fresh wallet step-up for privileged access. Wallet ownership does not create an account, grant a role or bypass permission checks.

### 2.3 Offline one-time recovery key

- Generate one high-entropy recovery secret using the operating system's cryptographically secure random-number generator (CSPRNG). Do not let a user choose words, names, dates, quotations or other predictable content.
- AstroCrown's internal target is at least **128 bits of uniformly random entropy**. NIST SP 800-63B-4 sets a minimum of 64 bits for saved recovery codes; 128 bits is the stricter project target, not a claim that NIST mandates 128 bits.
- Display the raw recovery secret once at enrollment and after an authorized replacement. Clearly instruct the user to save it offline in a secure place. Do not email, SMS, log, expose in analytics or retain the raw value.
- Store only a suitable one-way verifier for the recovery secret. Apply strict throttling, abuse detection, constant-time verification where applicable and safe failure behavior.
- The recovery key is single-use. On successful recovery, invalidate it immediately, revoke affected sessions/credentials as the recovery policy requires, and issue a replacement that is shown once to the user.
- A valid recovery key must open a restricted recovery ceremony to register a replacement WebAuthn authenticator and review/revoke lost credentials; it must not silently become a permanent reusable login token.
- Do not permit support staff, administrators, NOVA or a database operator to generate a replacement recovery key or bypass its proof. No operator override/backdoor is part of this model.

### 2.4 Multiple authenticators and lifecycle

- Support multiple separately registered WebAuthn authenticators so loss of one device does not force a weak recovery route. Encourage at least two independently controlled authentication methods, consistent with NIST guidance.
- Allow the authenticated user to add, name, inspect and revoke authenticators after fresh proof of control. Sensitive changes require recent authentication and, where appropriate, an additional step-up.
- Record credential binding, replacement, revocation and recovery events without storing private-key material, recovery secrets, biometric data or device PINs.
- A revoked, replaced, expired or compromised authenticator must not authorize new sessions. Existing sessions must be rotated or revoked according to the event and threat.
- If all authenticators and the offline recovery key are lost, the account may be permanently unrecoverable. Do not promise recovery by identity claims, email, SMS, support requests or administrator discretion.

## 3. WebAuthn protocol and server requirements

- Use a maintained, reviewed server-side WebAuthn relying-party library. Do not implement CBOR/COSE parsing, authenticator-data parsing, attestation or signature verification from scratch.
- Select the library only after checking current maintenance, security advisories, Python/runtime compatibility, dependency tree, license and whether it works without an external service. Pin and review the dependency.
- Generate at least 32 bytes of cryptographically random challenge data for each ceremony. Challenges must be single-use, short-lived and bound to the exact ceremony, intended account or pre-account enrollment context, RP ID, origin and server session.
- Verify the challenge, ceremony type, origin, RP ID hash, credential ownership, signature, user-presence/user-verification flags required by policy and all relevant extension/backup signals supported by the implementation.
- Maintain an exact origin allowlist. Reject unrecognized origins, cross-account credential use, expired challenges, reused challenges, malformed responses and invalid signatures. Fail closed.
- Apply server-side rate limits to account creation, discovery/authentication, recovery-code attempts, authenticator additions/removals and sensitive account changes. Keep responses from leaking whether an account or credential exists.
- Use secure first-party sessions after successful verification: rotate session identifiers, store only appropriately protected session verifiers, use HttpOnly/Secure/SameSite cookies in HTTPS production, protect state-changing requests against CSRF, and implement bounded session lifetimes and revocation.
- Protect the WebAuthn pages against script injection and supply-chain compromise. A private key remaining on the authenticator does not protect a user from a compromised application origin or malicious scripts that can misuse an authenticated session.
- Include negative tests for replay, challenge substitution, wrong account, wrong origin, wrong RP ID, expired challenge, invalid signature, missing user verification, credential revocation and concurrent/repeated recovery attempts.

## 4. $0-first and no-external-provider boundary

The account-authentication design must not require:

- paid identity/authentication SaaS;
- third-party login or OAuth identity provider;
- external authentication API;
- email delivery service;
- SMS or voice OTP provider;
- a paid blockchain RPC service;
- a paid analytics, telemetry or device-fingerprinting service.

The WebAuthn ceremony uses the browser's built-in WebAuthn API and a local/platform or roaming authenticator. The browser exchanges a challenge and signed result with **AstroCrown's own backend**. Those first-party requests are necessary and are not third-party authentication-provider calls. Account/session/database operations also necessarily use the first-party application service.

WebAuthn software specifications and a suitable open-source implementation library can be used without a paid authentication provider. A public production service still needs a secure HTTPS origin, a reachable and maintained backend, durable storage, backups and operations. These may be qualified against a $0-only hosting/domain plan, but continuous production availability or scale at $0 must not be promised without evidence.

Passkey synchronization is a separate choice. Some platform passkeys may synchronize through the user's device ecosystem/provider; that provider's account security and recovery then form part of the user's trust boundary. Where the browser/authenticator supports it, offer device-bound credentials or a user-owned FIDO2 hardware security key for users who do not want cloud-synced credentials. A physical hardware key may cost money to acquire; the project must not require users to buy one for ordinary account access.

The user's own device may perform local biometric/PIN verification. AstroCrown does not receive the biometric or PIN. Do not advertise the system as having zero external dependencies if a user deliberately chooses a synced passkey provider.

## 5. Data privacy and operator-access boundary

Public-key authentication means AstroCrown does not possess the private authentication key and cannot create a valid WebAuthn assertion for the user. It does **not**, by itself, prevent an authorized application/database operator from reading account data stored in plaintext.

Any promise that even AstroCrown operators cannot read particular user content requires a separate, designed and tested client-side/end-to-end encryption system with user-controlled encryption keys, key recovery decisions, metadata analysis and limitations documented. Do not make that promise as a consequence of WebAuthn alone.

Similarly, authentication does not eliminate the need for secure backend authorization, server-side role checks, least privilege, audit controls, session protection, secure deployment, vulnerability management or independent review.

## 6. Account and administrator boundaries

- The same passkey-first account identity is used for the ordinary User dashboard and, when separately authorized, the Administrator dashboard.
- The User dashboard remains available to administrators with the same member-facing capabilities as ordinary users.
- Administrator appointment and revocation remain server-enforced, separately permissioned operations. No passkey or wallet alone grants an administrator role.
- Privileged access requires a valid ordinary account session and the existing separately defined administrator step-up. Wallet signatures are purpose-bound and cannot replace the WebAuthn account-authentication flow unless a future, explicit policy decision defines that use.
- The owner/bootstrap and exceptional recovery authorities cannot silently impersonate users, mint credentials or override a user's recovery key.
- Account deletion, termination, member transactions and administrative operations remain separate from authenticator lifecycle and must be handled by their own explicit policies.

## 7. Migration from the legacy local prototype

The current PR #141 local account prototype was built around email/password, email-verification/reset tokens and an optional EVM/SIWE administrator step-up. That implementation is historical development behavior, not the adopted target authentication model.

This decision is documentation/design only. It does not silently convert the existing prototype, make it safe for real accounts, or authorize exposing it publicly. Before implementation:

1. Add WebAuthn registration, sign-in, credential lifecycle and recovery to the local prototype using a maintained library.
2. Add offline recovery-key generation, hashed storage, throttling, single-use enforcement and replacement tests.
3. Preserve stable account IDs, roles, permissions, sessions and dashboards while replacing email/password as the primary authenticator.
4. Keep the optional EVM/SIWE wallet verifier isolated and add wallet recovery only after purpose-specific tests. Do not refactor the current EVM-only disposable schema into a multichain schema as part of this first pass.
5. Remove or disable email/password login, email ownership verification and password-reset routes after WebAuthn acceptance tests pass. Do not leave two competing recovery systems active by accident.
6. Retain an email address only if a separate, explicitly optional contact/communications feature later needs it. It must not be an account identifier, login factor, recovery authority or way to bypass key proof.
7. Do not enable any provider, external API, paid service, production deployment or real-user onboarding as part of this local implementation step.

## 8. Acceptance evidence required before production

- WebAuthn registration and authentication pass positive and adversarial tests on supported browsers/authenticators.
- Exact RP ID/origin enforcement, fresh one-use challenges, replay rejection, user verification and credential revocation are proven by tests.
- Multiple authenticator enrollment, loss, removal, replacement and recovery behavior are tested end to end.
- Recovery secret entropy, one-time display, hashed storage, throttling, one-time consumption, invalidation and reissue are tested.
- Account role and dashboard behavior remain unchanged; wallet proof cannot create an account or self-appoint an administrator.
- No email/SMS/provider dependency is invoked during account creation, login or recovery. A network trace confirms only first-party AstroCrown API traffic and the browser/authenticator ceremony for the selected device configuration.
- A documented passkey-synchronization disclosure distinguishes device-bound and synced credentials.
- Dependency, threat-model, accessibility, browser-compatibility and independent security reviews are complete.
- Production HTTPS, durable data storage, backup/restore, incident response, privacy/legal review and publishing/deployment ownership are qualified separately.

## 9. Standards and references

- W3C, [Web Authentication: An API for accessing Public Key Credentials — Level 3](https://www.w3.org/TR/2026/REC-webauthn-3-20260825/), Recommendation published 2026-08-25.
- OWASP, [Passkey Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Passkey_Security_Cheat_Sheet.html). Use its relying-party, credential lifecycle, recovery, origin and library guidance.
- NIST, [SP 800-63B-4 — Authentication and Authenticator Management](https://csrc.nist.gov/pubs/sp/800/63/B/4/final), published July 2025. In particular, review authenticator binding/lifecycle and saved recovery-code requirements. Its saved-code minimum is 64 bits; AstroCrown's proposed 128-bit target is a project-selected margin.
- OWASP ASVS 5.0.0 for broader application security verification, session management, access control and secure implementation.

These references are design inputs. Their use does not establish certification, formal conformance or production security. Trace each adopted requirement to implementation and evidence.

## 10. Explicit exclusions

This decision does not authorize Astro-Wallet, a new wallet application, custody, seed-phrase collection, MPC/TSS, guardian recovery, asset portfolio, transaction/payment/swap/bridge systems, post-quantum cryptography, passkey-based transaction signing, or multi-chain wallet-schema refactoring. Those remain separate future decisions.
