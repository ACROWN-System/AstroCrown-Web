# AstroCrown email-account entry prototype

**Status: development test only — not production authentication.**

This prototype provides a familiar **Log In / Sign Up** account dialog in the development homepage. It uses the owner's requested email/password fields, optional Referral ID, separate optional crypto-news email preference, and required Terms of Use / Privacy Policy acceptance. It remains isolated under `development/`; the production/root homepage is unchanged.

## What you can test

- Open the homepage header's **Account** button.
- Switch between **Log In** and **Sign Up**.
- Create a test account using an invented email address and passphrase.
- See the success popup, close it without signing out, or choose **Open your account**.
- Verify that a signed-in header control becomes a circular icon with no visible “Account” label.
- Open the modular account hub, review the current test account/preferences, return to the homepage, and sign out.
- The **Administrator access** section and single **Open administrator dashboard** button appear only when the server says the signed-in account already has the administrator role. Ordinary users do not see the section or button.
- The button opens a confirmation dialog before any wallet request. Cancel does not request a wallet; Continue rechecks the server role/session, reuses a valid short-lived step-up when one exists, or proceeds to registered-wallet and signature-review steps. The separate `#admin` dashboard has a **Return to your account** link. This local administrator path must be tested on the loopback server, not the hosted memory-only preview.
- Enter or omit an optional Referral ID.
- Opt in or leave unchecked the independent crypto-news email preference.
- Accept or reject the required Terms of Use / Privacy Policy checkbox.
- Sign out and log back in with email and password.
- Open **Forgot password?** and verify the honest disabled-state message.
- Open the separate [Security assurance page](security-assurance.html) to review controls, evidence and explicit production gaps.
- See which test preferences were recorded in local SQLite or the disposable browser-demo state.

The flow does **not** ask users to memorise one-time recovery codes at sign-up. Email verification, secure email-based password reset, email delivery, and newsletter delivery have **not been implemented**. The Forgot password view explicitly states that no email was sent. Do not use real credentials or rely on this prototype for an account containing real assets.

The email-news checkbox is independent and unchecked by default. In this prototype, it records only a test preference; it does not subscribe anyone to a mailing list or send an email. Referral IDs are optional, stored as unverified test values, and do not trigger rewards or tracking.

The linked Terms of Use and Privacy Policy are **development drafts**, not approved production policies or legal advice. Their acceptance state is recorded only to test the UI/API contract. Production must replace these drafts after appropriate product, privacy and legal review.

Ordinary account access does not request a crypto wallet or a social sign-in provider. No fake Google/Apple/X/Facebook/LinkedIn/GitHub sign-in buttons are displayed.

## Direct browser preview (no installation)

Open the [AstroCrown development homepage in HTML Preview](https://html-preview.github.io/?url=https%3A%2F%2Fgithub.com%2FACROWN-System%2FAstroCrown-Web%2Fblob%2F7cac6b3e103d613469ab208b07409dba5b1a22fc%2Fdevelopment%2Findex.html). Click **Account**, then **Sign Up**. This requires no Git checkout, Python runtime or server.

On the hosted preview origin, account interactions run in a browser-only demonstration adapter. It makes no account API requests and keeps the account, password hash, referral field and test consent values in page memory only. All of them disappear when the page reloads or when another tab is opened. This is an interaction harness, not real authentication.

The preview uses a third-party HTML proxy. Use invented email/passphrase/referral values only. Never enter a real password, personal email address, wallet secret, valuable recovery material or real marketing preference. Do not let your password manager save the test credentials.

The URL is pinned to source commit `7cac6b3e103d613469ab208b07409dba5b1a22fc`, which includes the current development-only account UI and administrator-entry confirmation dialog. Relative assets and policy pages resolve from that same revision. The hosted preview is memory-only and simulates ordinary users only; it does not exercise the local SQLite account API or server-enforced administrator wallet step-up. Its ordinary account must not show an administrator entry. Use the local loopback server for backend/admin regression testing and continue to use invented data.

## Windows PowerShell: run locally

Use Python 3.12 from a terminal:

    git clone --branch docs/provider-independent-wallet-auth-plan-2026-10-20 --single-branch https://github.com/ACROWN-System/AstroCrown-Web.git AstroCrown-Account-Test
    cd .\AstroCrown-Account-Test
    py -3.12 .\development\account-continuity\prototype\server.py --port 8766

Open exactly **http://localhost:8766/** and click **Account**. Do not open the HTML file directly, and do not use `127.0.0.1`, a LAN address, tunnel, forwarded port or public hostname. The server accepts only the canonical localhost origin and binds to `127.0.0.1`.

If you already have a checkout, switch to the branch above and pull its latest changes, then run the command from the repository root.

For a clean dataset without old username-based test records, use a separate database file:

    py -3.12 .\development\account-continuity\prototype\server.py --port 8766 --db "$env:TEMP\acrown-account-email-demo.sqlite3"

Existing local SQLite records belong to earlier development prototypes; do not assume they have verified email addresses or usable recovery.

## Create a test account

1. Click **Account**, then choose **Sign Up**.
2. Enter an invented email address (for example, `test@example.test`) and a passphrase of at least 15 characters.
3. Optionally enter a Referral ID. The prototype only validates and records the value; it does not provide a referral reward.
4. Leave the crypto-news preference unchecked unless you are specifically testing the opt-in state. No emails will be sent in either case.
5. Check the Terms of Use / Privacy Policy box. The pages are marked development drafts only.
6. Create the test account, sign out, and sign in again.
7. Test **Forgot password?**. The UI must tell you that no reset email was sent and password reset is not enabled.

## Register the administrator account (local prototype only)

There is no separate public **Sign Up as Administrator** form. The administrator must first create an ordinary account, and an authorized local owner must then register that existing account in the local database. The server stores the `admin` role against the account identified by its email; a public wallet address is separately enrolled for the administrator step-up. This is what allows `/api/account/status` to report the admin role and makes the **Open administrator dashboard** button appear in the account hub.

1. Create the account using the regular **Sign Up** flow above. Use the exact email address you will pass to the provisioning command. Use invented test details only.
2. Keep the local server running. Open a **second PowerShell terminal** in the repository root. Install the pinned wallet-verification dependencies once, if they are not already available:

       py -3.12 -m pip install -r .\development\auth-prototype\requirements.txt

   This installs open-source packages for the local verification prototype; it does not call a paid AI/API provider or consume provider quota.
3. Run the owner-operated provisioning command, replacing the email, public wallet address and chain ID with the values intended for this **local test**:

       $AdminEmail = "admin@example.test"
       $AdminWallet = Read-Host "Administrator public wallet address (never a secret)"
       $AdminChainId = [int](Read-Host "Matching development/test network chain ID")
       py -3.12 .\development\account-continuity\prototype\provision_admin.py --actor "local-authorized-owner" grant --email $AdminEmail --wallet $AdminWallet --chain-id $AdminChainId --reason "Owner-approved initial local administrator provisioning" --confirm "GRANT LOCAL ADMIN"

   Use a **public address only**. Never enter a seed phrase, private key, password or recovery secret. Use a disposable test wallet and the matching development/test network for testing. The chain ID must match the network the wallet will use during the step-up. The `--actor` option is an audit label, not an independent proof of operator identity; the prototype relies on authorized access to the local computer and database.
4. If you started the server with a custom database using `--db`, pass that exact same `--db "PATH"` argument to `provision_admin.py`, before the `grant` subcommand. Otherwise, both scripts use the default database under your user profile. **Do not provision a different database from the one the server is using.**
5. Refresh the browser page (or sign out and sign back in), then open **Account** and your account hub. The server-reported admin role should make **Open administrator dashboard** appear. This only identifies the account as an administrator; it does not yet authorize the administrator dashboard.
6. Click the button and choose **Continue**. The server rechecks the account role and session. Unless a valid admin step-up already exists, connect one of the registered wallets and review/sign the one-time message. The fresh wallet proof is required before opening the dashboard; it is not a blockchain transaction.
7. The same command can register another distinct, controlled public wallet for the account using the same email and a new audit reason. A maximum of three wallets is permitted. A fourth wallet, a duplicate wallet, or a previously revoked wallet is rejected.

To revoke the local administrator role and disable its enrolled wallets, use the same local database and a clear audit reason:

    py -3.12 .\development\account-continuity\prototype\provision_admin.py --actor "local-authorized-owner" revoke --email "admin@example.test" --reason "Owner-approved local administrator access revocation" --confirm "REVOKE LOCAL ADMIN"

Revocation returns that account to the ordinary `user` role, clears its administrator step-up sessions and leaves the ordinary account credentials intact. Refresh the account view; the administrator button should disappear.

This is only the owner-operated local-development process. It has no public admin-role endpoint and must not be treated as production identity verification, production owner authentication or the final Imperial HSIAN all-wallet-loss recovery process. The hosted HTML preview cannot persist this role or test the actual CLI; use the loopback server and its same SQLite database.

Stop the local server with **Ctrl+C**. The SQLite database is stored under your user profile unless you set `--db`; the clean-database command above uses a temporary Windows path.

## Feedback, grievances and independent case access

Open the local portal at:

    http://localhost:8766/account-continuity/prototype/cases.html

The portal supports:
- Submitting a grievance or suggestion with deterministic local intake classification, priority routing, a receipt, an ACR-XXXX-XXXX case reference and a separate high-entropy private access key.
- Opening an existing case with the reference and key, reading the submitter-visible timeline and adding information without an active account session.
- Viewing cases linked to the currently signed-in account as a convenience, without making that account session the only way to access them.
- Requesting recovery when the case key, reference, or both have been lost. The request has its own ACRR-XXXX-XXXX reference and private status key. A request can be made without an account login.
- A restricted administrator queue, public replies, internal notes, status changes, escalation, and case-access recovery review. The case administrator workspace appears only after the backend confirms both the server-assigned administrator role and a valid wallet step-up.

**Account separation:** Case rows store an optional account identifier as a non-foreign-key reference. Account deletion or termination does not cascade-delete a grievance. Each case access key is stored only as a SHA-256 hash. A case reference alone cannot disclose case contents. The independent credentials should be saved outside AstroCrown by the submitter.

**Lost reference and key:** The recovery request can be submitted with a case title/description, approximate date, contact route and explanation even when the original case reference is unknown. An authorized administrator must independently verify the claimant and match the request to a case. Approval rotates the case access key and returns the replacement key once to the administrator for delivery through a separately verified channel. The prototype does not send email/SMS, does not verify contact details automatically and does not guarantee recovery. Do not enter real personal or contact information.

**Independent review:** A grievance marked as concerning an administrator requires the administrator handling it to attest that they are not personally implicated. The same safeguard applies to replacement-key approval for such a case. The attestation is an auditable declaration, not machine proof that the reviewer is independent.

**Automation and timing:** Receipt generation, timestamps and first-pass triage are deterministic and local. Higher-priority grievances currently receive an indicative first substantive update target of 2 working days; other cases and suggestions receive 5 working days. These are development targets, not guaranteed resolution times. No AI provider receives the submission, no AI decides the merits, and no substantive grievance is automatically accepted or rejected. No external message notifications or file attachments are enabled.

Use the case portal and tests with invented details only. The current implementation is local SQLite development software, not a production complaint service. Production requires a deployed and hardened data service, protected administrator operations, independently tested recovery verification and delivery, retention/deletion rules, privacy/legal review and a published working contact route.

## Data and security boundaries

- Local test data stays in the SQLite database on the computer running this server. The prototype uses Python standard-library components only and makes no external authentication or newsletter calls.
- Passwords are stored as PBKDF2-HMAC-SHA256 hashes with random salts; raw passwords are not stored.
- Session tokens are stored as hashes. Local sessions use an HttpOnly, SameSite=Strict cookie. The local HTTP cookie configuration is **not** a production HTTPS configuration.
- Email is the account identifier in this UX prototype, but ownership is not verified and there is no password-reset email. Do not use it for real account access.
- Terms acceptance and newsletter consent have timestamps/version metadata for prototype testing. No newsletter message is sent and the preference is not sent to an external service.
- A Referral ID is optional and unverified. No reward, association, or benefit is promised or applied.
- Requests are limited to the exact localhost Host/Origin, with a JSON size limit and basic in-process attempt throttling. The server binds only to `127.0.0.1`.
- The local database stores a server-owned role defaulting to `user`; registration cannot self-assign `admin`. A local owner-operated CLI can provision an existing test account and up to three registered wallet addresses, with an audit reason and explicit confirmation. After a user explicitly requests admin access, the browser fetches only that account's registered wallet options, prompts the user to connect a wallet, checks the account/network match, displays the exact SIWE message, and requests a signature only after the user clicks the signing button. The backend binds the challenge to the account and ordinary session, rejects replay/cross-session/wrong-wallet attempts, and grants at most a ten-minute admin step-up. The separate admin dashboard exposes one additional privileged action: enrolling another public wallet after an already-verified admin session and a separate signature from the proposed wallet. The connected address and chain must match an unused address; enrollment ends the prior admin step-up. No wallet-removal UI, publishing, role-changing operation or other business-admin action is available. There is no public provisioning endpoint, production role administration, all-wallet-loss recovery, production hosting, email verification/reset delivery, newsletter delivery, or real passkey. Six built-in avatar glyphs remain available for the local test account; uploads and remote images are unsupported. See [User and Administrator Account Requirements](../USER-AND-ADMIN-ACCOUNT-REQUIREMENTS.md) for the long-term role and recovery model.
- This is a test harness, not a claim of full ASVS/NIST conformance, production-ready authentication, a formal security audit, or guaranteed recovery.

## Production blockers

Before using an email/password account for real user assets, AstroCrown must implement and verify: production identity/account storage and secure hosting; email ownership verification; email password-reset delivery with expiring, single-use reset links and session revocation; secure recovery alternatives and user notifications; newsletter consent history, unsubscribe, suppression and delivery operations; referral validation/abuse controls if referrals are activated; approved Terms of Use and Privacy Policy; retention/export/deletion and incident procedures; threat modelling, security testing, accessibility tests, and the project’s authoritative website/publishing verification.

No email-delivery or newsletter provider has been selected or qualified under the project's $0/no-card rule. Do not merge/deploy or describe the account subsystem as production-ready merely because prototype CI passes.
