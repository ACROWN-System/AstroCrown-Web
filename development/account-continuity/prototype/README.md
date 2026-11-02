# AstroCrown email-account entry prototype

**Status: development test only — not production authentication.**

This prototype provides a familiar **Log In / Sign Up** account dialog in the development homepage. It uses the owner's requested email/password fields, optional Referral ID, separate optional crypto-news email preference, and required Terms of Use / Privacy Policy acceptance. It remains isolated under `development/`; the production/root homepage is unchanged.

## What you can test

- Open the homepage header's **Account** button.
- Switch between **Log In** and **Sign Up**.
- Create a test account using an invented email address and passphrase.
- See the success popup, close it without signing out, or choose **Open your dashboard**.
- Verify that a signed-in header control becomes a circular icon with no visible “Account” label.
- Open the **User dashboard** (`#account`), the shared member workspace for both regular users and administrators. It contains the currently implemented account/security/preferences modules and is the intended home for all member-facing services and personal transactions as those services are developed.
- The current account prototype does not yet implement financial transactions or the full AstroCrown service catalog. It must not display fake transactions or nonfunctional controls; future service modules belong in the same User dashboard for both roles.
- Return to the homepage and sign out.
- The **Administrator access** section and wallet-verification entry appear only when the server says the signed-in account already has the administrator role. Ordinary users do not see the section or button. The person first signs in to the ordinary User account; this entry then verifies an enrolled administrator wallet before opening the separate Administrator dashboard. The wallet signature does not create the account or grant the role.
- The button opens a confirmation dialog before any wallet request. Cancel does not request a wallet; Continue rechecks the server role/session, reuses a valid short-lived step-up when one exists, or proceeds to registered-wallet and signature-review steps. The separate `#admin` Administrator dashboard has a **Return to user dashboard** link. It is an additional workspace for administrative duties, not a replacement for the regular member workspace. This local administrator path must be tested on the loopback server, not the hosted memory-only preview.
- Enter or omit an optional Referral ID.
- Opt in or leave unchecked the independent crypto-news email preference.
- Accept or reject the required Terms of Use / Privacy Policy checkbox.
- Sign out and log back in with email and password.
- Open **Forgot password?**. With no mail transport configured, the form reports that no email was sent; with a configured secure SMTP transport, it submits a request without revealing whether an account exists.
- Open the separate [Security assurance page](security-assurance.html) to review controls, evidence and explicit production gaps.
- See the number of active local sign-in sessions. When more than one session exists, enter the current password to sign out the other sessions while keeping the current session active.
- Change the account password after confirming the current password and matching the new passphrase twice. The local server rotates the current session, signs out the other sessions and removes any administrator step-up.
- See which test preferences were recorded in local SQLite or the disposable browser-demo state.

The flow does **not** ask users to memorise one-time recovery codes at sign-up. The local prototype implements expiring, single-use email-verification and password-reset links. Tokens are stored only as hashes; verification links expire after 24 hours and reset links after 30 minutes. Completing a password reset invalidates every existing account session and administrator step-up. A Mailjet-specific SMTP configuration path and a persistent free-tier email budget are now implemented, but no Mailjet account, sending domain, credentials or live delivery has yet been qualified. Delivery remains disabled until an owner deliberately configures the provider. Newsletter delivery is still not implemented. Do not use real credentials or rely on this prototype for an account containing real assets.

The email-news checkbox is independent and unchecked by default. In this prototype, it records only a test preference; it does not subscribe anyone to a mailing list or send an email. Referral IDs are optional, stored as unverified test values, and do not trigger rewards or tracking.

The linked Terms of Use and Privacy Policy are **development drafts**, not approved production policies or legal advice. Their acceptance state is recorded only to test the UI/API contract. Production must replace these drafts after appropriate product, privacy and legal review.

Ordinary account access does not request a crypto wallet or a social sign-in provider. No fake Google/Apple/X/Facebook/LinkedIn/GitHub sign-in buttons are displayed.

## Direct browser preview (no installation)

Open the [AstroCrown development homepage in HTML Preview](https://html-preview.github.io/?url=https%3A%2F%2Fgithub.com%2FACROWN-System%2FAstroCrown-Web%2Fblob%2Fdocs%2Fprovider-independent-wallet-auth-plan-2026-10-20%2Fdevelopment%2Findex.html). Click **Account**, then **Sign Up**. This requires no Git checkout, Python runtime or server.

On the hosted preview origin, account interactions run in a browser-only demonstration adapter. It makes no account API requests and keeps the account, password hash, referral field and test consent values in page memory only. All of them disappear when the page reloads or when another tab is opened. This is an interaction harness, not real authentication.

The preview uses a third-party HTML proxy. Use invented email/passphrase/referral values only. Never enter a real password, personal email address, wallet secret, valuable recovery material or real marketing preference. Do not let your password manager save the test credentials.

The HTML Preview URL follows the active development branch so it reflects the latest account UI changes. The hosted preview is memory-only and simulates ordinary users only; it does not exercise the local SQLite account API, SMTP delivery, one-time email-action endpoints or server-enforced administrator wallet step-up. Its ordinary account must not show an administrator entry. Use the local loopback server for backend/admin regression testing and continue to use invented data.

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
4. Leave the crypto-news preference unchecked unless you are specifically testing the opt-in state. Newsletter messages are not sent. Verification email is sent only when the optional SMTP transport is explicitly configured.
5. Check the Terms of Use / Privacy Policy box. The pages are marked development drafts only.
6. Create the test account, sign out, and sign in again.
7. Test **Forgot password?**. Without an SMTP transport, the UI must clearly state that no reset email was sent. With a fake mail sender in automated tests, verify that the one-time link works without contacting an external provider.

## Register the administrator account (local prototype only)

There is no separate public **Sign Up as Administrator** form. Everyone first creates an ordinary User account. **Intended production process:** a current administrator who has the explicit `admin.roles.grant` permission grants the administrator role to that existing account; not every administrator has this permission, and the grantor cannot promote themselves or expand their own permissions. That role grant is distinct from wallet enrolment: the newly appointed administrator must prove control of their own wallet before using it for the wallet step-up. The appointment and wallet-enrolment workflows are not implemented in this local prototype. The current owner-operated CLI is only a local bootstrap/test adapter and must not be mistaken for the production role-grant process.

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
5. Refresh the browser page (or sign out and sign back in), then open **Account** and the shared User dashboard. The server-reported admin role makes the wallet-verification entry appear in a separate Administrator access section. This is an additional entry; the administrator retains the same User dashboard and member-facing features as an ordinary user. The role alone does not authorize the Administrator dashboard.
6. Click the administrator entry and choose **Continue**. The server rechecks the account role and session. Unless a valid admin step-up already exists, the newly appointed administrator must enrol/prove their own wallet if needed, then connect one of the registered wallets and review/sign the one-time message. The fresh wallet proof is required before opening the separate Administrator dashboard; it is not a blockchain transaction or a second ordinary account login. **Return to user dashboard** takes the administrator back to the normal member workspace without signing out or removing member access.
7. The same command can register another distinct, controlled public wallet for the account using the same email and a new audit reason. A maximum of three wallets is permitted. A fourth wallet, a duplicate wallet, or a previously revoked wallet is rejected.

To revoke the local administrator role and disable its enrolled wallets, use the same local database and a clear audit reason:

    py -3.12 .\development\account-continuity\prototype\provision_admin.py --actor "local-authorized-owner" revoke --email "admin@example.test" --reason "Owner-approved local administrator access revocation" --confirm "REVOKE LOCAL ADMIN"

Revocation returns that account to the ordinary `user` role, clears its administrator step-up sessions and leaves the ordinary account credentials intact. Refresh the account view; the administrator button should disappear.

This is only the owner-operated local-development process. It has no public admin-role endpoint and must not be treated as production identity verification, production owner authentication or the final Imperial HSIAN all-wallet-loss recovery process. Administrator status adds a separately authorized administrative workspace; it must never remove ordinary member services or silently grant extra personal transaction authority. The hosted HTML preview cannot persist this role or test the actual CLI; use the loopback server and its same SQLite database.

Stop the local server with **Ctrl+C**. The SQLite database is stored under your user profile unless you set `--db`; the clean-database command above uses a temporary Windows path.

## Feedback, grievances and independent case access

Open the local portal at:

    http://localhost:8766/account-continuity/prototype/cases.html

The portal supports:
- Submitting a grievance or suggestion with deterministic local intake classification, priority routing, a receipt, an ACR-XXXX-XXXX case reference and a separate high-entropy private access key.
- Opening an existing case with the reference and key, reading the submitter-visible timeline, downloading a copy of that public case history and adding information without an active account session.
- Viewing cases linked to the currently signed-in account as a convenience, without making that account session the only way to access them.
- Requesting recovery when the case key, reference, or both have been lost. The request has its own ACRR-XXXX-XXXX reference and private status key. A request can be made without an account login.
- A restricted administrator queue, public replies, internal notes, status changes, escalation, and case-access recovery review. The case administrator workspace appears only after the backend confirms both the server-assigned administrator role and a valid wallet step-up.

**Account separation:** Case rows store an optional account identifier as a non-foreign-key reference. Account deletion or termination does not cascade-delete a grievance. Each case access key is stored only as a SHA-256 hash. A case reference alone cannot disclose case contents. The independent credentials should be saved outside AstroCrown by the submitter.

**Lost reference and key:** The recovery request can be submitted with a case title/description, approximate date, contact route and explanation even when the original case reference is unknown. An authorized administrator must independently verify the claimant and match the request to a case. Approval rotates the case access key and returns the replacement key once to the administrator for delivery through a separately verified channel. The prototype does not send email/SMS, does not verify contact details automatically and does not guarantee recovery. Do not enter real personal or contact information.

**Independent review:** A grievance marked as concerning an administrator requires the administrator handling it to attest that they are not personally implicated. The same safeguard applies to replacement-key approval for such a case. The attestation is an auditable declaration, not machine proof that the reviewer is independent.

**Automation and timing:** Receipt generation, timestamps and first-pass triage are deterministic and local. Higher-priority grievances currently receive an indicative first substantive update target of 2 working days; other cases and suggestions receive 5 working days. These are development targets, not guaranteed resolution times. No AI provider receives the submission, no AI decides the merits, and no substantive grievance is automatically accepted or rejected. No external message notifications or file attachments are enabled.

Use the case portal and tests with invented details only. The current implementation is local SQLite development software, not a production complaint service. Production requires a deployed and hardened data service, protected administrator operations, independently tested recovery verification and delivery, retention/deletion rules, privacy/legal review and a published working contact route.

## Mailjet Free-tier transactional email

**Repository status:** the Mailjet provider configuration and local quota guard are implemented. The external Mailjet account, sender/domain verification, credentials and successful delivery remain **NOT CONFIGURED / NOT QUALIFIED**. No real email has been sent by CI. No provider account or paid plan was created.

### Free-tier limits and AstroCrown's own safety ceiling

Mailjet currently advertises its Free plan at $0/month with no credit card required, a maximum of 6,000 emails per month and 200 emails per day. The Free plan also lists 1,000 stored contacts. Mailjet's daily and monthly limits are separate and both apply. New accounts may initially be placed in a 10-emails-per-hour test mode until Mailjet verifies account information.

AstroCrown deliberately uses less than half of the published send allowance for account verification and password-reset messages:

| Window | Mailjet Free allowance | AstroCrown account-mail ceiling | Reserved outside account email |
|---|---:|---:|---:|
| Rolling 24 hours | 200 | 100 | At least 100 |
| Rolling 31 days | 6,000/month | 3,000 | At least 3,000 |

The application enforces both ceilings atomically in SQLite before SMTP submission. The reservation ledger survives process restarts and stores only a random reservation ID and timestamp—no recipient address, email body, token or credential. A submission attempt consumes one reservation even if the relay returns an ambiguous failure: the relay might have accepted the message before a connection timeout, so refunding could allow a duplicate attempt to exceed the budget. At either ceiling, the application fails closed and does not submit another message. There is no paid fallback, automatic upgrade, or overage request.

The daily guard is a rolling 24-hour window; the monthly guard is a rolling 31-day window. Mailjet describes its daily ceiling as a calendar-day limit and publishes a separate monthly limit, but its public Free-plan limit page does not define the monthly reset boundary. The application therefore uses the more conservative rolling windows instead of assuming a provider reset date. This caps AstroCrown account mail at no more than 3,000 in any 31-day span, including a full 31-day calendar month, while retaining at least half of the published plan allocation for other project email workloads. These counters only include messages submitted through this local account-email code. Sending from the Mailjet dashboard, another API key, another application or another integration is not included in this local ledger. Keep the Mailjet account dedicated to controlled AstroCrown email workloads and monitor the provider's aggregate dashboard; this guard cannot stop independent senders using the same Mailjet account.

### One-time Mailjet account setup

1. Create **one** Mailjet account and select the **Free** plan. Confirm the account shows $0/month and no payment method is required. Do not start a paid trial, choose a paid plan, add a card or enable an upgrade. Mailjet's free policy does not permit creating multiple free accounts for the same company/use case.
2. In **Account Settings → Senders & Domains**, add the sending domain you control. Complete Mailjet's domain ownership check using the exact DNS verification record it displays. If you cannot edit that domain's DNS, do not claim domain authentication is complete.
3. Set up the SPF and DKIM records shown by Mailjet. Merge Mailjet's SPF include into the existing SPF TXT record if one exists—do not publish multiple SPF records for the same domain. Publish the exact DKIM record/value supplied in the Mailjet dashboard. Add and validate a DMARC policy for the sending domain before production use.
4. In **Account Settings → SMTP and SEND API settings**, copy the Mailjet **API Key** and **Secret Key**. The API Key is the SMTP username; the Secret Key is the SMTP password. These are not the credentials used to sign in to the Mailjet website. Mailjet may show the secret only once; store it in a secure password manager.
5. Select a From address on the verified domain and enter that exact sender in the local environment. Mailjet requires ownership verification for a sender address or domain; successful account setup does not prove inbox placement.

Mailjet's documented SMTP endpoint is `in-v3.mailjet.com`, port `587`, using STARTTLS. The repository locks the Mailjet provider to those settings so a typo cannot silently switch it to an unencrypted or unrelated relay.

### Local PowerShell configuration

This enables sending only from the loopback-only prototype on the same computer. It does not make the GitHub Pages preview or public website a working account service. Open PowerShell in the repository root and set the variables there before starting the server:

    $env:ASTROCROWN_EMAIL_PROVIDER = "mailjet"
    $env:ASTROCROWN_MAILJET_API_KEY = Read-Host "Mailjet API Key"
    $secret = Read-Host "Mailjet Secret Key" -AsSecureString
    $env:ASTROCROWN_MAILJET_SECRET_KEY = [System.Net.NetworkCredential]::new("", $secret).Password
    $env:ASTROCROWN_MAILJET_FROM = "AstroCrown <no-reply@YOUR-VERIFIED-DOMAIN>"
    $env:ASTROCROWN_PUBLIC_BASE_URL = "http://localhost:8766"

Replace the placeholder From address with the exact sender you verified in Mailjet. Do not commit, paste into GitHub issues/PRs, screenshot, or print either key. These environment variables exist only in that PowerShell process environment. Start the local server:

    py -3.12 .\development\account-continuity\prototype\server.py --port 8766

Open exactly `http://localhost:8766/`. Email action links point back to localhost and can only be completed on that same computer while the server is running. Use an inbox you control for a deliberate live test; do not send to a stranger or an invented address that could belong to someone else. Check Mailjet's delivery events as well as the recipient inbox. A successful SMTP submission means the relay accepted the message, not that the recipient's provider placed it in the inbox.

To disable delivery in that PowerShell window:

    Remove-Item Env:ASTROCROWN_EMAIL_PROVIDER, Env:ASTROCROWN_MAILJET_API_KEY, Env:ASTROCROWN_MAILJET_SECRET_KEY, Env:ASTROCROWN_MAILJET_FROM, Env:ASTROCROWN_PUBLIC_BASE_URL -ErrorAction SilentlyContinue
    Remove-Variable secret -ErrorAction SilentlyContinue

The generic SMTP path remains available only when `ASTROCROWN_EMAIL_PROVIDER=smtp` is selected explicitly and its required `ASTROCROWN_SMTP_*` fields are configured. A provider is never inferred from an SMTP hostname. Do not set Mailjet and generic SMTP settings at the same time.

### What this does not activate

The account server still binds only to `127.0.0.1`, checks for the canonical localhost Host/Origin, and stores test accounts in a local SQLite file. The hosted HTML Preview uses disposable browser memory and makes no requests to this server. The current AstroCrown public website does not host this backend, the email-action page/API, or an account database. A public HTTPS application backend, durable shared database, protected secrets, reverse-proxy token-log redaction, asynchronous mail queue, monitoring, bounce/suppression handling and operational recovery must be built and qualified before external users can register or recover accounts.

Mailjet's free account can also begin in temporary test mode (10 messages/hour) until the provider completes its account review. Do not assume the advertised 200/day limit is immediately available. No code can bypass provider review, domain ownership verification, DNS propagation or provider-side restrictions.

## Data and security boundaries

- Local test data stays in the SQLite database on the computer running this server. The prototype uses Python standard-library components only and makes no external authentication or newsletter calls unless the optional SMTP transport is explicitly configured.
- Passwords are stored as PBKDF2-HMAC-SHA256 hashes with random salts; raw passwords are not stored.
- Session tokens are stored as hashes. Local sessions use an HttpOnly, SameSite=Strict cookie. The local HTTP cookie configuration is **not** a production HTTPS configuration.
- Email is the account identifier. The local prototype can verify ownership with an expiring, single-use token and reset passwords with a separate expiring, single-use token. Tokens are stored as SHA-256 hashes; raw tokens are sent only through the explicitly configured mail transport and are not written to the database or application logs. Email ownership remains unverified until the verification link is used. Password-reset completion revokes all sessions and administrator step-up state. Known and unknown password-reset requests receive the same status/body, but local SMTP submission is synchronous and response timing is not guaranteed to be indistinguishable.
- Terms acceptance and newsletter consent have timestamps/version metadata for prototype testing. No newsletter message is sent and the preference is not sent to an external service.
- A Referral ID is optional and unverified. No reward, association, or benefit is promised or applied.
- Requests are limited to the exact localhost Host/Origin, with a JSON size limit. Account registration, sign-in, password changes, session revocation and administrator wallet challenges use atomic SQLite-backed rate limits that survive application restarts; rate-limit subject identifiers are stored as SHA-256 digests, not raw email addresses or account IDs. Case-portal throttles remain in-process for this local prototype. The server binds only to `127.0.0.1`.
- Active local sessions are counted server-side. Signing out other sessions requires the current password, applies a bounded attempt limit, preserves the current session, and invalidates the other server-side session records.
- Password changes require the current password and matching confirmation, use a new random salt, rotate the current session, revoke every previous session and clear administrator step-up state. A minimal security audit event records the action and count of other sessions invalidated; it does not record passwords, tokens, IP addresses or device fingerprints.
- The prototype does not collect device fingerprints, IP history or user-agent labels.
- The local database stores a server-owned role defaulting to `user`; registration cannot self-assign `admin`. A local owner-operated CLI can provision an existing test account and up to three registered wallet addresses, with an audit reason and explicit confirmation. After a user explicitly requests admin access, the browser fetches only that account's registered wallet options, prompts the user to connect a wallet, checks the account/network match, displays the exact SIWE message, and requests a signature only after the user clicks the signing button. The backend binds the challenge to the account and ordinary session, rejects replay/cross-session/wrong-wallet attempts, and grants at most a ten-minute admin step-up. The separate admin dashboard exposes one additional privileged action: enrolling another public wallet after an already-verified admin session and a separate signature from the proposed wallet. The connected address and chain must match an unused address; enrollment ends the prior admin step-up. No wallet-removal UI, publishing, role-changing operation or other business-admin action is available. There is no public provisioning endpoint, production role administration, all-wallet-loss recovery, production hosting, production-qualified email delivery, newsletter delivery, or real passkey. Six built-in avatar glyphs remain available for the local test account; uploads and remote images are unsupported. See [User and Administrator Account Requirements](../USER-AND-ADMIN-ACCOUNT-REQUIREMENTS.md) for the long-term role and recovery model.
- This is a test harness, not a claim of full ASVS/NIST conformance, production-ready authentication, a formal security audit, or guaranteed recovery. The email-action routes are local prototype behavior; production still requires an approved HTTPS deployment, a provisioned and tested Mailjet account, domain authentication (SPF/DKIM/DMARC), abuse monitoring, delivery/bounce handling, proxy/access-log redaction for email-action query tokens, privacy review and operational recovery procedures.

## Production blockers

Before using an email/password account for real user assets, AstroCrown must implement and verify: production identity/account storage and secure hosting; production integration and qualification of the email transport for verification and password-reset links; an asynchronous mail queue and response-timing controls for account recovery; domain authentication and mail-delivery/bounce operations; production session review and revocation with appropriate reauthentication and device context; secure recovery alternatives and user notifications; newsletter consent history, unsubscribe, suppression and delivery operations; referral validation/abuse controls if referrals are activated; approved Terms of Use and Privacy Policy; retention/export/deletion and incident procedures; threat modelling, security testing, accessibility tests, and the project’s authoritative website/publishing verification.

Mailjet is the selected zero-cost provider candidate and its repository adapter is implemented, but the external account, sending domain, credentials and live delivery are not yet qualified. Newsletter sending remains disabled. Do not merge/deploy or describe the account subsystem as production-ready merely because prototype CI passes.


### Important distinction: local CLI versus intended administrator appointment

The local `provision_admin.py` command is a development-only owner/bootstrap test adapter. Its `--actor` string is an audit label, not an authenticated administrator identity or proof of a delegated permission. It currently grants the role and adds a test wallet together for the local end-to-end fixture.

The intended product workflow is different: an existing administrator with the explicit server-enforced `admin.roles.grant` permission appoints an existing user account; the new administrator then proves control of their own wallet in a separate enrolment step. An administrator without that permission cannot appoint another administrator. The role-grant permission and wallet step-up are independent: the role makes the entry visible, while the target's wallet signature is required to enter the Administrator dashboard. This in-product permissioned appointment and target-owned wallet enrolment are **not implemented yet**.
