# AstroCrown passkey-first account prototype

**Status: local development test only — not production authentication, security certification or a production account service.**

The active local prototype now supports:
- WebAuthn passkey registration with discoverable credentials and required local user verification.
- Discoverable passkey sign-in without an email address, username prompt, password, SMS or external identity provider.
- A high-entropy, one-time offline recovery key, displayed once at initial registration and after successful recovery. Only a salted one-way verifier is stored.
- Recovery-key verification followed by replacement passkey registration. Successful recovery revokes all previous passkeys and account sessions, consumes the old recovery key and issues a replacement.
- Existing stable account IDs, local sessions, User dashboard, server-owned roles, separate Administrator dashboard and EVM/SIWE administrator step-up.

The current implementation is a local loopback prototype. It is not approved for real credentials, personal recovery material, real assets or public user onboarding. It does not provide production storage, hosting, backup/restore, independent security review or formal recovery operations.

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
- Open the hosted HTML preview to inspect layout only. It is explicitly non-authenticating and cannot create credentials.

## Install and run locally — Windows PowerShell

Use Python 3.12 and a current Chrome/Edge browser. From the repository root:

    py -3.12 -m pip install -r .\development\account-continuity\prototype\requirements.txt -r .\development\auth-prototype\requirements.txt
    py -3.12 .\development\account-continuity\prototype\server.py --port 8766 --db "$env:TEMP\acrown-passkey-demo.sqlite3"

Open exactly **http://localhost:8766/**. Do not open the HTML file directly or use 127.0.0.1, a LAN address, tunnel, forwarded port or public hostname. WebAuthn is bound to the exact local localhost RP ID and origin. The server binds only to 127.0.0.1.

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

The earlier email/password, verification-token, password-reset and Mailjet prototype code is retained only for historical regression tests. The default local server disables those routes and does not load an email sender. Test modules which explicitly enable the legacy email-authentication test flag exercise that retired implementation; it is not the current UX or an approved account recovery channel. Do not configure Mailjet or SMTP for account sign-in/recovery. Newsletter sending remains disabled.

The hosted HTML Preview is a third-party interface proxy. It cannot create passkeys or exercise the local SQLite backend. It must never be used for real authentication, recovery material or wallet secrets.

The linked Terms of Use and Privacy Policy remain **development drafts**, not approved production policies or legal advice.


## Data and security boundaries

- Local test data stays in the SQLite database on the computer running this server. The prototype uses Python standard-library components only and makes no external authentication or newsletter calls unless the optional SMTP transport is explicitly configured.
- Legacy prototype only: email/password credentials are stored using PBKDF2-HMAC-SHA256 hashes with random salts. This is not part of the adopted passkey-first account design.
- Session tokens are stored as hashes. Local sessions use an HttpOnly, SameSite=Strict cookie. The local HTTP cookie configuration is **not** a production HTTPS configuration.
- Legacy prototype only: email is the account identifier; local verification/reset tokens are single-use, expiry-bound and hashed. This email-based account model is superseded. The adopted target uses a stable internal account ID, WebAuthn public credential(s), optional wallet backup and one-time offline recovery key. Email is not a login or recovery factor.
- Terms acceptance and newsletter consent have timestamps/version metadata for prototype testing. No newsletter message is sent and the preference is not sent to an external service.
- A Referral ID is optional and unverified. No reward, association, or benefit is promised or applied.
- Requests are limited to the exact localhost Host/Origin, with a JSON size limit. Account registration, sign-in, password changes, session revocation and administrator wallet challenges use atomic SQLite-backed rate limits that survive application restarts; rate-limit subject identifiers are stored as SHA-256 digests, not raw email addresses or account IDs. Case-portal throttles remain in-process for this local prototype. The server binds only to `127.0.0.1`.
- Legacy prototype only: signing out other sessions requires the current password. The replacement must use fresh WebAuthn user verification, preserve the current session and revoke other server-side sessions.
- Legacy prototype only: password changes rotate/revoke sessions. The passkey-first replacement must implement credential addition/removal/replacement, recovery-key rotation, session rotation and revocation using fresh WebAuthn proof; no password-reset route remains in the target.
- The prototype does not collect device fingerprints, IP history or user-agent labels.
- The local database stores a server-owned role defaulting to `user`; registration cannot self-assign `admin`. The owner-operated CLI remains a development bootstrap/test adapter. In-product local role grants require an authenticated, wallet-step-up-verified administrator with `admin.roles.grant`; delegated permissions are limited to those explicitly assignable by that grantor. Role revocation separately requires `admin.roles.revoke`. Both operations record actor, target, permissions, reason and timestamp; self-grants and unauthorized permission delegation are rejected. A newly appointed account enrols its own first public wallet by signing a one-time message, then uses a separate fresh signature for the maximum ten-minute admin step-up. Up to three wallets are supported; adding an additional wallet still requires an existing wallet-verified admin session and another separate signature, and adding a wallet clears previous step-up states. Revocation disables the target's admin wallets and permissions while preserving ordinary account sessions. These are local prototype endpoints and not production identity, authority governance or all-wallet-loss recovery. There is no production hosting, production-qualified email delivery, newsletter delivery or real passkey. Six built-in avatar glyphs remain available for the local test account; uploads and remote images are unsupported. See [User and Administrator Account Requirements](../USER-AND-ADMIN-ACCOUNT-REQUIREMENTS.md) for the long-term role and recovery model.
- This is a test harness, not a claim of full ASVS/NIST conformance, production-ready authentication, a formal security audit, or guaranteed recovery. The email-action routes are legacy prototype behavior. The adopted WebAuthn/recovery-key flow is not yet implemented. Production requires an approved HTTPS deployment, exact RP ID/origin controls, maintained WebAuthn verification library, durable storage, authenticator lifecycle and recovery operations, privacy review and independent security testing. Email delivery is not an account-authentication prerequisite.

## Production blockers for the adopted passkey-first model

Before real-user onboarding, AstroCrown must implement and verify: WebAuthn registration/authentication with a maintained library; exact RP ID/origin validation, challenge freshness/replay protection and user verification; multiple authenticator management; offline recovery-key generation, hashed storage, throttling, single-use invalidation and reissue; secure first-party sessions and revocation; production HTTPS/backend/storage/backups; approved Terms of Use and Privacy Policy; retention/export/deletion and incident procedures; threat modelling, supply-chain/browser/accessibility testing and independent security review; and authoritative website/publishing verification. Email/SMS delivery is not required for account authentication or recovery.

Mailjet and the SMTP quota adapter are legacy artifacts for the superseded email/password flow. Do not configure or rely on them for account authentication/recovery. No passkey/recovery implementation or production deployment is qualified. Do not merge/deploy or describe the account subsystem as production-ready merely because prototype CI passes.


### Important distinction: local CLI versus intended administrator appointment

The local `provision_admin.py` command remains a development-only owner/bootstrap test adapter. Its `--actor` string is an audit label, not an authenticated administrator identity or proof of delegated permission. It can establish the first local administrator with an initial wallet and explicitly selected permissions; it is not the routine appointment mechanism.

The in-product local prototype now supports the separate workflow: an already-authenticated administrator with a fresh wallet step-up and explicit `admin.roles.grant` permission appoints an existing user account. It may assign only permissions that were explicitly made delegable by the grantor; newly assigned permissions are non-delegable by default. Revocation is separately gated by `admin.roles.revoke`, disables admin wallets and permissions, and preserves the target's ordinary account sessions. The newly appointed person enrols their own first wallet by signing a separate one-time message, then signs a second fresh challenge for administrator step-up. No wallet signature creates an account or grants the role. These are local-development capabilities only; production role governance, owner authentication, hosting and all-wallet-loss recovery remain outstanding.

## Deferred future wallet strategy — no current implementation

Astro-Wallet (AW) is a separate future product/research concept documented in [Astro-Wallet Strategy and Security Architecture](../../crypto-infrastructure/ASTRO-WALLET-STRATEGY-AND-SECURITY-ARCHITECTURE.md). It is **not** a dependency or scope item for the current account sign-in, User dashboard or Administrator dashboard work. The local wallet authentication lab remains EVM EOA/SIWE-only. No AW SDK, multichain wallet adapter, key-management/recovery system, asset portfolio or post-quantum feature is implemented.

The current EVM-specific wallet table and verifier are loopback prototype details, not a production multichain schema. To avoid a future account-system rebuild without prematurely implementing AW, keep stable AstroCrown account IDs, sessions and permissions independent of wallet addresses; keep EVM/SIWE logic inside the wallet-auth boundary; and require a separately reviewed, versioned wallet-credential migration before production persistence or support for additional wallet families. Do not change the current implementation to achieve this future seam now.
