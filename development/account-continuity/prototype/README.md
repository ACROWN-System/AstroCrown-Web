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

Open the [AstroCrown development homepage in HTML Preview](https://html-preview.github.io/?url=https%3A%2F%2Fgithub.com%2FACROWN-System%2FAstroCrown-Web%2Fblob%2F4d84af1b6faac6d450f5f633920d87959401e9c6%2Fdevelopment%2Findex.html). Click **Account**, then **Sign Up**. This requires no Git checkout, Python runtime or server.

On the hosted preview origin, account interactions run in a browser-only demonstration adapter. It makes no account API requests and keeps the account, password hash, referral field and test consent values in page memory only. All of them disappear when the page reloads or when another tab is opened. This is an interaction harness, not real authentication.

The preview uses a third-party HTML proxy. Use invented email/passphrase/referral values only. Never enter a real password, personal email address, wallet secret, valuable recovery material or real marketing preference. Do not let your password manager save the test credentials.

The URL is pinned to the draft revision containing the latest account UI hierarchy: Log In / Sign Up first, three non-interactive future-provider logo circles, the static broken-gold “Or” divider with a down arrow, and the dark AstroCrown card styling. Its relative CSS/JavaScript and policy pages resolve from the same revision.

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

Stop the local server with **Ctrl+C**. The SQLite database is stored under your user profile unless you set `--db`; the clean-database command above uses a temporary Windows path.

## Data and security boundaries

- Local test data stays in the SQLite database on the computer running this server. The prototype uses Python standard-library components only and makes no external authentication or newsletter calls.
- Passwords are stored as PBKDF2-HMAC-SHA256 hashes with random salts; raw passwords are not stored.
- Session tokens are stored as hashes. Local sessions use an HttpOnly, SameSite=Strict cookie. The local HTTP cookie configuration is **not** a production HTTPS configuration.
- Email is the account identifier in this UX prototype, but ownership is not verified and there is no password-reset email. Do not use it for real account access.
- Terms acceptance and newsletter consent have timestamps/version metadata for prototype testing. No newsletter message is sent and the preference is not sent to an external service.
- A Referral ID is optional and unverified. No reward, association, or benefit is promised or applied.
- Requests are limited to the exact localhost Host/Origin, with a JSON size limit and basic in-process attempt throttling. The server binds only to `127.0.0.1`.
- The local database stores a server-owned role defaulting to `user`; registration cannot self-assign `admin`. A local owner-operated CLI can provision an existing test account and up to three registered wallet addresses, with an audit reason and explicit confirmation. After a user explicitly requests admin access, the browser fetches only that account's registered wallet options, prompts the user to connect a wallet, checks the account/network match, displays the exact SIWE message, and requests a signature only after the user clicks the signing button. The backend binds the challenge to the account and ordinary session, rejects replay/cross-session/wrong-wallet attempts, and grants at most a ten-minute admin step-up. The separate admin console exposes one additional privileged action only: enrolling another public wallet after an already-verified admin session and a separate signature from the proposed wallet. Enrollment ends the prior admin step-up. No wallet-removal UI, publishing, role-changing operation or other business-admin action is available. There is no public provisioning endpoint, production role administration, all-wallet-loss recovery, production hosting, email verification/reset delivery, newsletter delivery, or real passkey. Six built-in avatar glyphs remain available for the local test account; uploads and remote images are unsupported. See [User and Administrator Account Requirements](../USER-AND-ADMIN-ACCOUNT-REQUIREMENTS.md) for the long-term role and recovery model.
- This is a test harness, not a claim of full ASVS/NIST conformance, production-ready authentication, a formal security audit, or guaranteed recovery.

## Production blockers

Before using an email/password account for real user assets, AstroCrown must implement and verify: production identity/account storage and secure hosting; email ownership verification; email password-reset delivery with expiring, single-use reset links and session revocation; secure recovery alternatives and user notifications; newsletter consent history, unsubscribe, suppression and delivery operations; referral validation/abuse controls if referrals are activated; approved Terms of Use and Privacy Policy; retention/export/deletion and incident procedures; threat modelling, security testing, accessibility tests, and the project’s authoritative website/publishing verification.

No email-delivery or newsletter provider has been selected or qualified under the project's $0/no-card rule. Do not merge/deploy or describe the account subsystem as production-ready merely because prototype CI passes.
