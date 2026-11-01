# Mailjet Free-tier transactional email qualification

**Review date:** 2026-11-01  
**Repository:** `ACROWN-System/AstroCrown-Web`  
**Branch:** `docs/provider-independent-wallet-auth-plan-2026-10-20`  
**PR:** [#141 — Prototype familiar email account entry; retain optional wallet lab](https://github.com/ACROWN-System/AstroCrown-Web/pull/141)  
**Decision:** Mailjet Free selected as the first $0/no-card provider candidate for account verification and password-reset email.  
**Status:** **ADAPTER IMPLEMENTED / EXTERNAL ACCOUNT AND DELIVERY NOT YET QUALIFIED / PRODUCTION BLOCKED**

## 1. Provider evidence

Mailjet's current official Free-plan documentation states:

- $0 Free plan, available without a credit card.
- 6,000 emails/month.
- 200 emails per calendar day.
- Up to 1,000 stored contacts.
- The daily and monthly sending limits apply independently; the monthly allowance does not permit exceeding the daily allowance.

Sources:
- [Mailjet Free-plan limits](https://documentation.mailjet.com/hc/en-us/articles/19154256993051-Understanding-Mailjet-Free-Plan-Limits)
- [Mailjet subscription management and Free-plan terms](https://documentation.mailjet.com/hc/en-us/articles/8625025643803-Mailjet-Subscription-Management)

Mailjet may place a new account in temporary Test Mode with a 10-messages/hour limit pending review of account details. Its official guidance says that replying to the provider's verification email with the requested information is the process for lifting that temporary limit; choosing a different subscription does not bypass verification:
- [Mailjet blocked or limited account guidance](https://documentation.mailjet.com/hc/en-us/articles/360042624754-Blocked-or-Limited-Account-Reasons-and-How-to-Restore-Full-Functionality)

Mailjet's documented SMTP relay is `in-v3.mailjet.com`. The supported submission ports include 587 and 465. SMTP credentials are the API Key as username and Secret Key as password:
- [Mailjet SMTP relay configuration](https://dev.mailjet.com/docs/smtp-relay/configuration)
- [Mailjet SMTP parameter guidance](https://documentation.mailjet.com/hc/en-us/articles/360043229473-How-can-I-configure-my-SMTP-parameters)

Mailjet recommends sender/domain verification and domain authentication. The exact SPF and DKIM record values are generated for the sender domain in the account settings; they must be taken from the actual account and published in DNS. A DMARC policy should also be configured before production use:
- [Mailjet domain verification and SPF/DKIM](https://dev.mailjet.com/docs/email-api/getting-started/verify-your-domain)
- [Mailjet SPF/DKIM validation](https://dev.mailjet.com/docs/email-api/senders-domains/spf-dkim-validation)
- [Mailjet sender/domain registration](https://dev.mailjet.com/docs/email-api/senders-domains/create-sender)

## 2. AstroCrown quota reserve

To protect capacity for other AstroCrown email workloads and avoid unplanned paid use, the account-email subsystem is capped below half of the published Free allocation:

| Window | Mailjet Free allowance | Account-email ceiling | Capacity reserved |
|---|---:|---:|---:|
| Daily | 200 per calendar day | 100 per rolling 24 hours | At least 100 |
| Monthly | 6,000 per month | 3,000 per rolling 31 days | At least 3,000 |

The Mailjet documentation explicitly calls the daily cap a calendar-day allowance, but the Free-plan limit page does not specify the monthly counter's exact reset boundary. The application therefore uses separate, conservative rolling windows: a rolling 24-hour ceiling and a rolling 31-day ceiling. The 31-day window covers a full 31-day calendar month and avoids assuming an unverified provider reset date.

The SQLite quota ledger is persistent and checked atomically before network submission. It records only a random reservation identifier and timestamp. A reservation is not refunded after ambiguous send failures because the provider may have accepted the message before the connection failed. When either internal threshold is reached, the application declines to submit more account email. It does not upgrade the provider plan or fall back to a paid service.

**Scope limitation:** this ledger measures only email submissions routed through this account-email code. Messages sent from the Mailjet dashboard, other API keys, integrations or services do not appear in it. The Mailjet account's aggregate usage must therefore be monitored separately and should not be shared with uncontrolled senders.

## 3. Repository implementation

Changes on this branch:

- `development/account-continuity/prototype/email_delivery.py`: explicit `ASTROCROWN_EMAIL_PROVIDER=mailjet` selection; fixed Mailjet host, port 587 and STARTTLS; API Key/Secret Key mapping; generic SMTP retained only as an explicitly selected alternative; mixed/partial/unknown provider configurations fail closed.
- `development/account-continuity/prototype/email_delivery.py`: persistent SQLite quota reservations, 100 per rolling 24 hours and 3,000 per rolling 31 days.
- `development/account-continuity/prototype/server.py`: quota reservation is required before account verification or reset email is submitted; startup output reports configured transport separately from actual connection/inbox verification and shows internal usage.
- `development/account-continuity/prototype/tests/test_email_delivery.py`: Mailjet configuration, TLS selection, missing/mixed provider configuration, quota-window and persistence tests.
- `development/account-continuity/prototype/tests/test_account_server.py`: integration test verifies the account server refuses a second message once the configured daily account-email ceiling has been reached.
- `development/account-continuity/prototype/README.md`: no-card Mailjet setup, sender/domain/DNS qualification, secure environment configuration, limits and production blockers.

Automated tests use a fake mailer. They do not create a Mailjet account, use real credentials, contact Mailjet, or send any message to an inbox.

## 4. External setup still required

The repository cannot establish ownership of an external domain or create credentials on the owner's behalf. The following items remain **BLOCKED**:

1. Owner creates one Mailjet account and explicitly chooses the $0 Free plan; no card, paid trial, upgrade or second free account.
2. Owner verifies a sender address/domain. For production-quality domain authentication, owner publishes the exact account-provided verification, SPF and DKIM DNS records and configures DMARC. No DNS values are guessed or invented here.
3. Owner stores the API Key and Secret Key in a secure password manager or the eventual backend's secret store. Secrets must never be committed, pasted into PR discussion, or exposed to browser JavaScript.
4. Owner responds to any Mailjet temporary-account review request. The provider may retain the 10/hour test restriction until its review is complete.
5. A controlled live test is sent only to an inbox the owner controls; provider acceptance, provider-reported delivery, and inbox receipt are checked separately. SMTP acceptance alone is not proof of inbox delivery.

The README contains PowerShell instructions for an isolated localhost test after the owner has the provider credentials. Do not use real user details or production credentials in the local development prototype.

## 5. Why the complete account service is not operational yet

The current account server is deliberately loopback-only and binds to `127.0.0.1`; it uses a local SQLite database. The GitHub Pages / HTML preview is a memory-only demonstration and does not call the account API, serve email-action routes, or persist real user accounts. Setting Mailjet credentials cannot turn that preview into a public account service.

Production blockers remain:

- A deployed, hardened HTTPS account/API backend and durable database.
- Protected server-side Mailjet secrets and dedicated workload accounting.
- Asynchronous email queue/retry behavior, delivery/bounce/suppression monitoring and abuse controls.
- Reverse-proxy/access-log redaction for one-time email tokens in query strings.
- Production session, recovery, administrator provisioning/recovery and incident procedures.
- Approved Terms of Use and Privacy Policy, privacy/retention/deletion decisions, accessibility assessment and independent security review.
- Final public publishing and operational acceptance tests.

## 6. Promotion boundary

This is a provider qualification and development implementation record, not an email-service certification. PR #141 remains draft, open, unmerged and undeployed. No production website files, Pages settings, DNS records, provider accounts, GitHub secrets, or backups were changed. Promotion requires owner-controlled provider setup, passing exact-head CI, manual live-email evidence and completion of the separate production backend/security/privacy gates.
