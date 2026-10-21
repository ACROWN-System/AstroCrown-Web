# AstroCrown local account creation and sign-in prototype

**Status: local development test only — not production authentication.**

This prototype makes the homepage's **Account** button open a working local account-creation and sign-in dialog. It follows the account-continuity foundation merged in PR #132 and the owner-approved separation of ordinary account authentication from optional wallet access.

## What you can test

- Create an account with a username and password/passphrase.
- Sign out and sign back in.
- Set up and regenerate one-time recovery codes.
- Reset a forgotten password with one enabled, unused recovery code.
- Observe one-time recovery-code use and session revocation after password reset.

The ordinary-account prototype does **not** request a wallet, email, phone, Google/Apple/X/Facebook/LinkedIn account, or biometric. External provider integrations are not active in this local test; fake provider buttons are intentionally not shown. The account has no admin role. Passkeys, admin wallet enrollment, Imperial HSIAN recovery, production storage, notifications and the public site's account service are not implemented.

## Windows PowerShell: run locally

Use Python 3.12 from a terminal:

    git clone --branch docs/provider-independent-wallet-auth-plan-2026-10-20 --single-branch https://github.com/ACROWN-System/AstroCrown-Web.git AstroCrown-Account-Test
    cd .\AstroCrown-Account-Test
    py -3.12 .\development\account-continuity\prototype\server.py --port 8766

Open exactly **http://localhost:8766/**. In the page header, click **Account**, then choose **Sign in / Create account**. Do not open the HTML file directly, and do not use 127.0.0.1, a LAN address, tunnel, forwarded port or public hostname. The server accepts only the canonical localhost origin and binds to 127.0.0.1.

If you already have the repository checked out, switch to the branch above and pull its latest changes, then run the command from the repository root.

## Create a test account

1. Open **Account → Sign in / Create account → Create account**.
2. Enter a test-only username (3–24 letters, digits, dots, underscores or hyphens).
3. Use an invented passphrase of at least 15 characters. **Do not reuse a real or important password.**
4. Save or download the eight recovery codes shown after account creation. Each can be used once. Click **I have saved these codes** to enable recovery.
5. Sign out, sign in again, then test **Forgot password?** with one unused code.
6. Records persist locally. The default SQLite database is under your user profile: Windows: %USERPROFILE%\.acrown-account-prototype\accounts.sqlite3; Linux/macOS: ~/.acrown-account-prototype/accounts.sqlite3.

You can set a specific database path while testing:

    py -3.12 .\development\account-continuity\prototype\server.py --port 8766 --db "$env:TEMP\acrown-account-demo.sqlite3"

Use a different database filename for a clean test dataset. Stop the server with **Ctrl+C**.

## Data and security boundaries

- Data stays on the computer running this server. The account prototype uses only Python standard-library components and makes no external authentication calls.
- Passwords are stored as PBKDF2-HMAC-SHA256 hashes with random salts; raw passwords are not stored. Session tokens and recovery codes are stored only as hashes.
- Local sessions use an HttpOnly, SameSite=Strict cookie. The local HTTP cookie configuration is **not** a production HTTPS configuration.
- Requests are limited to the exact localhost Host/Origin, with a JSON size limit and basic attempt throttling. The server binds only to 127.0.0.1.
- No admin privileges, role management, real passkey, social-login integration, wallet association or production data are included.
- Homepage market figures remain illustrative demo data.
- This is a test harness, not a claim of full ASVS/NIST conformance, production-ready authentication, a formal security audit, or guaranteed recovery. Production needs separate security, recovery, accessibility, privacy/retention, provider/cost, hosting and promotion reviews.
