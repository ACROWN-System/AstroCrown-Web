# AstroCrown passkey-first account prototype

**Status: local development test only — not production authentication, security certification or a production account service.**

The active local prototype now supports:
- Experimental ML-DSA-first WebAuthn registration negotiation (ML-DSA-65, -44 and -87), followed by EdDSA, ES256 and RS256 compatibility fallbacks. The server verifier accepts the same allow-list and records the actual credential COSE algorithm for each new/replacement passkey.
- The User dashboard reports active credentials actually recorded with an ML-DSA algorithm; advertising an algorithm is not treated as evidence that a browser/authenticator used it.
- A dedicated automated regression test now generates ephemeral ML-DSA-44/65/87 keys and verifies genuine signatures through the server's WebAuthn authentication verifier, including rejection of wrong challenges and modified signatures. This qualifies backend verification only; it does not establish real browser or authenticator interoperability.
- WebAuthn passkey registration with discoverable credentials and required local user verification.
- Discoverable passkey sign-in without an email address, username prompt, password, SMS or external identity provider.
- A high-entropy, one-time offline recovery key, displayed once at initial registration and after successful recovery. Only a salted one-way verifier is stored.
- Recovery-key verification followed by replacement passkey registration. Successful recovery revokes all previous passkeys and account sessions, consumes the old recovery key and issues a replacement.
- Existing stable account IDs, local sessions, User dashboard, server-owned roles, separate Administrator dashboard and EVM/SIWE administrator step-up.

The default account server remains a local loopback prototype. A separate temporary HTTPS runner is provided for browser testing with synthetic details and a disposable account database. Neither mode is production authentication, public account hosting or approval to use personal credentials, recovery material or real assets. Durable storage, backup/restore, independent security review and formal recovery operations remain production blockers.

See [Passkey-First Account Authentication and Recovery Requirements](../PASSKEY-FIRST-ACCOUNT-AUTHENTICATION-AND-RECOVERY-REQUIREMENTS.md) for the complete adopted design and acceptance requirements.

## What you can test

- Create a new account with a WebAuthn passkey, without entering email, password or phone details.
- Save the generated account identifier and offline recovery key when the success screen displays them. The page blocks continuing until the user confirms that the key was saved.
- Sign out and sign in again through the authenticator's discoverable passkey prompt; no account identifier is submitted to the sign-in endpoint.
- Open the common **User dashboard**, inspect passkey and recovery-key status, update the supported built-in avatar and sign out.
- Recover an account from the sign-in page using the account identifier and the unused offline recovery key. Register a replacement passkey, save the newly issued recovery key, and verify that the prior passkey and sessions were revoked.
- Confirm that the old recovery key cannot start another recovery and that the new one can.
- Confirm that ordinary account sign-in and recovery do not request a wallet, balance, blockchain transaction, email, SMS or external identity service.
- Confirm that the optional wallet backup for ordinary account recovery is **not yet implemented**. The separate EVM/SIWE wallet path currently serves only administrator enrollment and step-up.
- Confirm that administrator role visibility, permissioned appointment/revocation, and the separate administrator-wallet step-up remain server-enforced and cannot be granted by passkey registration.
- Open the hosted HTML preview for layout inspection only. For real browser passkey registration, sign-in and recovery, use the separate [Temporary HTTPS live-test procedure](LIVE-HTTPS-TEST-ENVIRONMENT.md).

## Temporary HTTPS diagnostic — not the staging website

For a short-lived diagnostic browser WebAuthn ceremony over HTTPS, the [temporary Quick Tunnel procedure](LIVE-HTTPS-TEST-ENVIRONMENT.md) remains available. It proves the local backend can complete a ceremony on a temporary HTTPS hostname, but it is NOT the production-parity staging website and is not the target deployment architecture. The preferred next build is a deployed staging environment using the same runtime, application artifact, database model, migrations, security controls and release path intended for public production; see [Production-Parity Staging Architecture](../PRODUCTION-PARITY-STAGING-AND-THREE-PASS-CLEANUP-REQUIREMENTS.md).

This diagnostic uses only invented test details and a brand-new passkey created for its temporary hostname. Do not enter production account data, personal recovery keys, wallet secrets or real assets. Cloudflare processes traffic at its public edge. The random URL is public at the network layer and the access code is a temporary test gate, not a production access system. The diagnostic is optional and does not satisfy the production-parity staging requirement.

## Install and run locally — Windows PowerShell

Use Python 3.12 and a current Chrome/Edge browser. From the repository root:

    py -3.12 -m pip install -r .\development\account-continuity\prototype\requirements.txt -r .\development\auth-prototype\requirements.txt
    py -3.12 .\development\account-continuity\prototype\server.py --port 8766 --db "$env:TEMP\acrown-passkey-demo.sqlite3"

Open exactly **http://localhost:8766/** for the local-only option. Do not expose this local-only command through a tunnel; use the separate guarded HTTPS runner instead. WebAuthn is bound to the localhost RP ID and the server binds only to 127.0.0.1.

The Python requirements include the pinned open-source WebAuthn relying-party library and the separately pinned EVM/SIWE library used by administrator tests. Installation retrieves packages from the configured Python package index; runtime authentication does not call a paid identity provider or external authentication API. The hosted HTML preview remains read-only.

## First account creation and recovery-key custody

1. Click **Account**, then **Sign Up**.
2. Accept the displayed development Terms/Privacy acknowledgement. Referral ID is optional.
3. Select **Create account with passkey** and complete the browser/device authenticator prompt. The local server verifies the response before creating the account.
4. The success screen displays a randomly generated account identifier and one-time recovery key. Save both securely and offline before continuing. The key is not available again after leaving that screen.
5. Do not email, message, photograph into shared cloud albums, paste into support requests or share the recovery key. Do not use a personal/main wallet's recovery phrase as this recovery key.
6. Sign out and use **Sign in with passkey**. The browser should offer the discoverable credential without requiring an email or account identifier.
7. To recover after losing the passkey, select **Recover account with offline key**, enter the account identifier and unused recovery key, then register a replacement passkey. Recovery consumes the old key, deactivates every previous passkey, revokes all existing sessions and issues a replacement recovery key. Save the new key before continuing.
8. Loss of all passkeys and the recovery key can mean permanent account loss. There is no staff, administrator, email or SMS override.

## Administrator dashboard (local prototype only)

Administrator functionality remains separate from ordinary sign-in. A passkey establishes the ordinary account session; it does not grant an administrator role. Existing owner-operated local bootstrap and permissioned appointment/revocation remain in place. Administrator entry additionally requires the existing registered EVM wallet to sign a fresh SIWE step-up challenge. No transaction or minimum balance is required.

The optional wallet authenticator for ordinary account recovery is not yet connected to the account-level passkey/recovery flow. Do not treat the administrator wallet step-up as an ordinary user's backup authenticator.

## Retained legacy implementation

The active account journey is passkey-first. It does not request an email address, password or phone number, and does not include email verification, email password-reset, newsletter delivery or an outbound email service. Do not add email or an external identity provider as an account-access or recovery dependency.


The hosted HTML Preview is a third-party interface proxy. It cannot create passkeys or exercise the local SQLite backend. It must never be used for real authentication, recovery material or wallet secrets.

The linked Terms of Use and Privacy Policy remain **development drafts**, not approved production policies or legal advice.


## Data and security boundaries

- Local account data stays in the SQLite database on the computer running this server. The default passkey-first runtime uses the pinned open-source WebAuthn library plus Python's standard library and the separately pinned SIWE library for the admin-wallet lab. It does not load an email sender or call an external authentication provider.
- Account authentication is based on verified WebAuthn public-key credentials; account identity is a stable internal identifier, not an email address.
- Session tokens are randomly generated and stored only as hashes. Local sessions use an HttpOnly, SameSite=Strict cookie. The local HTTP cookie configuration is **not** a production HTTPS configuration.
- Recovery is performed through the single-use offline recovery-key ceremony and replacement-passkey registration. Email is not a login or recovery factor.
- Terms acceptance and newsletter consent have timestamps/version metadata for prototype testing. No newsletter message is sent and the preference is not sent to an external service.
- A Referral ID is optional and unverified. No reward, association, or benefit is promised or applied.
- Requests are limited to the exact localhost Host/Origin, with a JSON size limit. Passkey registration/sign-in verification, recovery-key options/completion and administrator wallet challenges use persistent SQLite-backed rate limits; rate-limit subjects are stored as SHA-256 digests. Case-portal throttles remain in-process for this local prototype. The server binds only to `127.0.0.1`.
- Passkey registration creates a local user session only after server verification. Recovery creates a replacement passkey, disables previous passkeys, consumes the previous recovery key, revokes existing sessions and issues a replacement recovery key. The current UI does not yet provide standalone multi-passkey enrollment/removal or a device/session-management screen.
- Password-change, password-reset and email-verification journeys are not part of the active account interface or authentication model.
- The prototype does not collect device fingerprints, IP history or user-agent labels.
- The local database stores a server-owned role defaulting to `user`; passkey registration cannot self-assign `admin`. The owner-operated CLI remains a development bootstrap/test adapter. In-product local role grants require an authenticated, wallet-step-up-verified administrator with `admin.roles.grant`; delegated permissions are limited to those explicitly assignable by that grantor. Role revocation separately requires `admin.roles.revoke`. Both operations record actor, target, permissions, reason and timestamp; self-grants and unauthorized permission delegation are rejected. A newly appointed account enrols its own first public administrator wallet by signing a one-time message, then uses a separate fresh signature for the maximum ten-minute admin step-up. Up to three admin wallets are supported. These admin-wallet credentials are not yet an ordinary user's backup authenticator. Six built-in avatar glyphs are available; uploads and remote images are unsupported. See [User and Administrator Account Requirements](../USER-AND-ADMIN-ACCOUNT-REQUIREMENTS.md) for the long-term role/governance boundary.
- This is a test harness, not a claim of full ASVS/NIST conformance, production-ready authentication, a formal security audit or guaranteed recovery. The local WebAuthn passkey registration/discoverable sign-in and offline recovery-key replacement flows are implemented and covered by API tests and a virtual-authenticator browser test; some API tests mock the cryptographic verdict to isolate server lifecycle behavior. Production still requires HTTPS, public RP ID/origin review, durable storage, backup/restore, multiple-authenticator lifecycle UI, privacy/legal review, independent security testing and operational recovery procedures.

## Production blockers for the adopted passkey-first model

Before real-user onboarding, AstroCrown must additionally qualify: production HTTPS and the final RP ID/origin; durable shared storage, backup/restore and operational incident handling; multiple passkey enrollment/removal and secure session management; the optional user-controlled wallet-backup path if adopted for release; approved Terms/Privacy and retention/export/deletion operations; accessibility and cross-browser/device testing; supply-chain/threat-model assessment and independent security review; and the authoritative website/publishing route. The current local recovery-key/passkey prototype is not a substitute for those production controls. Email/SMS delivery is not required for account authentication or recovery.

No email-delivery provider is selected or required for account authentication or recovery. The passkey/recovery implementation remains local-only and is not a qualified production deployment. Do not merge/deploy or describe the account subsystem as production-ready merely because prototype CI passes.


### Important distinction: local CLI versus intended administrator appointment

The local `provision_admin.py` command remains a development-only owner/bootstrap test adapter. Its `--actor` string is an audit label, not an authenticated administrator identity or proof of delegated permission. It can establish the first local administrator with an initial wallet and explicitly selected permissions; it is not the routine appointment mechanism.

The in-product local prototype now supports the separate workflow: an already-authenticated administrator with a fresh wallet step-up and explicit `admin.roles.grant` permission appoints an existing user account. It may assign only permissions that were explicitly made delegable by the grantor; newly assigned permissions are non-delegable by default. Revocation is separately gated by `admin.roles.revoke`, disables admin wallets and permissions, and preserves the target's ordinary account sessions. The newly appointed person enrols their own first wallet by signing a separate one-time message, then signs a second fresh challenge for administrator step-up. No wallet signature creates an account or grants the role. These are local-development capabilities only; production role governance, owner authentication, hosting and all-wallet-loss recovery remain outstanding.

## Deferred future wallet strategy — no current implementation

Astro-Wallet (AW) is a separate future product/research concept documented in [Astro-Wallet Strategy and Security Architecture](../../crypto-infrastructure/ASTRO-WALLET-STRATEGY-AND-SECURITY-ARCHITECTURE.md). It is **not** a dependency or scope item for the current account sign-in, User dashboard or Administrator dashboard work. The local wallet authentication lab remains EVM EOA/SIWE-only. No AW SDK, multichain wallet adapter, key-management/recovery system or asset portfolio is implemented. The separate local passkey prototype now has experimental server-side ML-DSA negotiation and algorithm recording; that is not an Astro-Wallet feature and does not prove current browser/authenticator support or formal interoperability.

The current EVM-specific wallet table and verifier are loopback prototype details, not a production multichain schema. To avoid a future account-system rebuild without prematurely implementing AW, keep stable AstroCrown account IDs, sessions and permissions independent of wallet addresses; keep EVM/SIWE logic inside the wallet-auth boundary; and require a separately reviewed, versioned wallet-credential migration before production persistence or support for additional wallet families. Do not change the current implementation to achieve this future seam now.


## Private communications (local prototype only)

The signed-in member can use the header bell to open the private **Alerts** and **Messages** inbox. The destination is selected explicitly by the sender; the system does not classify message text. Alerts remain pending until acknowledged. Messages use read/unread state. An administrator-role revocation creates a recipient-only Alert tied to its source audit record. Each destination is loaded independently in pages of 50, with a stable cursor to reach older records; unread counts cover the recipient's full inbox, not only the currently loaded page.

An administrator can send a one-recipient in-app communication only when the account has the separate **admin.messages.send** permission and the current administrator session has passed wallet step-up. That permission is not implied by the Administrator role. The current sending form lets the authorized administrator choose Alerts or Messages, then enter the member's AC- Account Identifier, subject and text. This local implementation uses no email, SMS, push service or external provider and is subject to server-side limits. Every administrator send is linked to a same-transaction governance audit event; the audit stores sender, recipient, destination and length metadata, not the private subject or body.

This is not a user-to-user chat/DM service. Threaded conversations, replies, group/broadcast messaging, attachments, external delivery and user-to-user sends are not implemented. Communication records are explanatory content and cannot grant authority or override backend role/session/audit state.

Relevant local API routes:
- GET /api/account/communications — compatibility list of the authenticated recipient's latest 100 communications.
- POST /api/account/communications/page — load one Alerts or Messages page (50 records) using an optional stable cursor; both records and cursor are scoped to the authenticated recipient.
- POST /api/account/communications/state — mark a Message read or acknowledge an Alert for the authenticated recipient only.
- POST /api/admin/communications/send — send one Alert or Message to an existing account, requiring the distinct administrator permission and wallet-verified session.

See User and Administrator Account Requirements, section 21, for the governing boundary and production-release requirements.


## Experimental ML-DSA passkey profile — $0 local preparation

The local relying party offers ML-DSA-65, ML-DSA-44 and ML-DSA-87 first, retaining EdDSA, ES256 and RS256 as fallbacks. The server passes the same allow-list to registration verification, records the algorithm encoded in each newly verified credential, and counts only credentials actually recorded as ML-DSA in the User dashboard.

**Standards boundary:** NIST FIPS 204 is the finalized ML-DSA signature standard. The WebAuthn/CTAP mapping in `draft-vitap-ml-dsa-webauthn-05` is an active IETF Internet-Draft, not a final standard. Its requested COSE identifiers (-48, -49 and -50) are shown as TBD. AstroCrown treats these as an experimental local profile. Server-library support does not demonstrate browser, OS, platform authenticator, synced-passkey provider or physical FIDO2 key support. An authenticator may select a classical fallback. Never claim a user has a post-quantum passkey unless the stored credential algorithm is actually ML-DSA and real registration and authentication proofs have been verified.

ML-DSA keys and signatures are larger than classical passkeys. Cross-browser, hardware-key, transport and synced-credential interoperability remain unproven. This work adds no paid identity provider, external runtime API or paid AI/provider call.

References: [NIST FIPS 204](https://csrc.nist.gov/pubs/fips/204/final) · [IETF ML-DSA for Web Authentication draft 05](https://datatracker.ietf.org/doc/html/draft-vitap-ml-dsa-webauthn-05) · [py_webauthn v3.0.1](https://github.com/duo-labs/py_webauthn/releases/tag/v3.0.1) · [Authentication Assurance Benchmark](../AUTHENTICATION-ASSURANCE-BENCHMARK.md) · [Certification and Recognition Roadmap](../CERTIFICATION-AND-RECOGNITION-ROADMAP.md)


## CI dependency integrity

The two prototype test workflows install Python dependencies from committed SHA-256 wheel locks under `development/dependencies/`. Before installation, the standard-library verifier compares each lock's exact package/version set with its source requirements file(s). Installation uses pip hash-checking mode (`--require-hashes`) and rejects source distributions (`--only-binary=:all:`).

These locks are intentionally scoped to CPython 3.12 on Ubuntu 24.04 x86_64, matching the pinned GitHub Actions runners. They are not universal Windows, macOS, ARM or alternate-Python lockfiles. Re-generate and review the selected wheel hashes before changing the runner OS, architecture or Python ABI. Production dependency approval remains a separate review and is not implied by CI hash verification.
