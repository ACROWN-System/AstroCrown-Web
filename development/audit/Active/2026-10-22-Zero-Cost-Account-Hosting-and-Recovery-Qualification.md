# Active Qualification Record — Zero-Cost Account Hosting, Email, and Recovery

**Date:** 2026-10-22  
**Status:** RESEARCH / QUALIFICATION IN PROGRESS — no production provider approved  
**Repository:** `ACROWN-System/AstroCrown-Web`  
**Working branch:** `docs/provider-independent-wallet-auth-plan-2026-10-20`  
**Related PR:** [#141 — Prototype familiar email account entry; retain optional wallet lab](https://github.com/ACROWN-System/AstroCrown-Web/pull/141)  
**Related decision:** [Authentication Separation and Recovery Decision](2026-10-21-Authentication-Separation-and-Recovery-Decision.md)  
**Related roadmap:** [Account Continuity and Privacy-Preserving Access Roadmap](../../account-continuity/ACCOUNT-CONTINUITY-AND-PRIVACY-PRESERVING-ACCESS-ROADMAP.md)

## 1. Purpose and correction to the previous assumption

Continue looking for an operational account and recovery system under the owner's strict **$0-only / no-card** policy. Do not infer that a capability is impossible merely because one commonly used vendor, plan, or deployment model cannot provide it.

This record broadens the candidate set. It does not claim that a free tier is permanent, that a provider signup has been completed, that an actual payment-card requirement has been tested in the owner's account, or that production authentication is approved.

The current PR #141 remains a development-only draft. No live account service, database, sender domain, email provider, production route, or secret was provisioned or changed by this research.

## 2. Confirmed current external facts

### 2.1 PHP critical security release — 2026-10-21

The PHP project released these security updates on 2026-10-21 for two critical unauthenticated remote-code-execution vulnerabilities:

- **CVE-2026-109618** — out-of-memory handling / internal state corruption.
- **CVE-2026-109619** — stale global state / use-after-free.

Official fixed releases are:

- PHP 8.5.12
- PHP 8.4.27
- PHP 8.3.36
- PHP 8.2.35

Official sources:
- https://www.php.net/archive/2026.php#2026-10-21-5
- https://news-web.php.net/php.announce/513
- https://thephp.foundation/blog/2026/10/21/todays-php-security-release-and-how-were-strengthening-php-security/
- https://www.enisa.europa.eu/news/joint-statement-on-critical-php-vulnerabilities

There is no complete workaround documented by PHP; updating is the safe remediation. PHP 8.1 and older no longer receive upstream PHP-project updates; vendor backports must be established explicitly. PHP 8.2 reaches end of life on 2026-12-31, so do not select it for a new long-lived deployment.

**Architecture interpretation:** the vulnerabilities are serious and require patch discipline, but they do not prove that PHP is unusable. A PHP candidate remains eligible only where the actual runtime is a currently supported, patched version and the operator can keep it patched. Verify the deployed runtime, not just the language declared by an application. The current AstroCrown repository evidence does not establish that the authoritative public site is PHP-hosted or affected.

### 2.2 Resend free transactional-email candidate

Resend's currently published Free plan lists 3,000 emails/month and a limit of 100/day. Its Terms of Service state that its Free Tier does not require billing information. Official sources:

- https://resend.com/pricing
- https://resend.com/legal/terms-of-service
- https://resend.com/docs/dashboard/domains/introduction

This is a credible candidate for verification and account-recovery mail and invalidates the earlier blanket implication that production user-directed email cannot be explored under the no-card constraint.

**Still BLOCKED pending qualification:** successful account signup without billing information in the actual chosen account; sender-domain control and DNS verification; current terms and permitted use; API delivery to an unrelated test recipient; bounce/failure handling; retention and privacy review; limits and abuse controls. Free-tier limits/features can change or be withdrawn, so isolate the mail sender behind a replaceable adapter. Do not send real-user mail during qualification.

### 2.3 Cloudflare Workers and D1 as a persistent-backend candidate

Official Cloudflare documentation currently lists these Workers Free limits:
- 100,000 incoming requests per day;
- 10 ms CPU time per invocation;
- 128 MB memory.

Official source: https://developers.cloudflare.com/workers/platform/limits/

Cloudflare D1's current published Workers Free plan limits include:
- 5 million rows read per day;
- 100,000 rows written per day;
- 5 GB total included account storage and 500 MB maximum for one free database;
- free-tier daily read/write enforcement, with queries failing after the applicable daily limit until the reset.

Official sources:
- https://developers.cloudflare.com/d1/platform/pricing/
- https://developers.cloudflare.com/d1/platform/limits/
- https://developers.cloudflare.com/d1/reference/faq/
- https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/

Cloudflare Email Service is not a free arbitrary-recipient sender: arbitrary-recipient outbound email requires Workers Paid; free sending is limited to verified destination addresses. Source: https://developers.cloudflare.com/email-service/

**No-card evidence:** Cloudflare's official Workers workshop explicitly says a free Cloudflare account can be created without a credit card: https://developers.cloudflare.com/labs/workers. This establishes a documented no-card path, rather than leaving it as an assumption. The owner's existing account's precise plan, current deployment permissions, and whether the intended app can remain within free limits still require operational verification.

**Architecture interpretation:** Workers + D1 is a credible low-traffic persistence candidate for an early prototype, but not approved yet. Quotas must fail closed and visibly, database backup/export/restore must be exercised, and authentication crypto must fit the Free CPU budget. In particular, do not assume that a password-hashing configuration that works in the local Python server will fit a Worker request; measure CPU behavior and choose a maintained, appropriate implementation. The Workers Free limit is a hard engineering constraint, not a reason to silently weaken password hashing or rate limits.

### 2.4 GitHub Pages is only the static-host layer

GitHub documents that Pages does not support server-side PHP, Python, or other server-side languages. Source: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site

Keep the homepage portable as static assets, but provide a separately deployable authentication API and durable account store. Do not try to turn the static Pages origin into an account database.

### 2.5 Decentralized content hosting is not automatically an account database

IPFS's own documentation distinguishes content addressing from guaranteed persistence. Availability depends on nodes retaining content, and long-term storage commonly requires a node or pinning arrangement whose operator bears storage costs. IPFS also documents that DHT queries are public and can reveal which content identifiers are requested.

Sources:
- https://docs.ipfs.tech/concepts/persistence/
- https://docs.ipfs.tech/concepts/privacy-and-encryption/
- https://docs.ipfs.tech/how-to/pin-files/

Therefore, P2P/agent/swarm architectures remain worth investigating for public assets, signed public records, replication, or user-controlled encrypted exports. They are not a drop-in trusted authority for private accounts, sessions, password reset, role authorization, or recovery. Any such design still needs an explicit model for persistence, key custody, write authorization, conflict resolution, abuse resistance, deletion, and availability. No specific free swarm/agent network is selected by this record.

### 2.6 Deno Deploy — secondary runtime candidate; strict no-card limits unresolved

Deno Deploy's current pricing page lists a Free plan with 1 million inbound requests/month, 20 GiB egress, 10 active CPU-hours/month, 1 GiB Deno KV storage, 1 million KV read units/month, and 500,000 KV write units/month. Source: https://deno.com/deploy/pricing

However, Deno's official changelog states that organisations can only use restricted Free-plan limits until the organisation is verified by linking a credit card. Source: https://docs.deno.com/deploy/changelog/

Therefore, do not assume that Deno's full published free quotas are available under the strict no-card rule. Keep it as a secondary candidate only if current documentation and/or an actual no-card account test proves the remaining restrictions and quotas are sufficient. Its current free tier also lists only one day of log retention, no reliability SLA, and no DPA on the pricing comparison; assess suitability and data obligations before storing real accounts. Deno KV is a platform-specific storage adapter, so keep export and migration requirements explicit.

### 2.7 Render and Vercel — screened, not selected

Render's current official free-deployment guide explicitly says Free instances are not for production applications. It also states that a Free web service has an ephemeral filesystem, local SQLite data can be lost on restart/spin-down/redeploy, and Free Postgres databases expire 30 days after creation. Source: https://render.com/docs/free. This excludes the documented free combination as a durable primary account store; it may still serve short-lived tests if data-loss behaviour is expected.

Vercel's official Hobby plan is intended for personal projects and its current guidance describes non-commercial-use limits. Source: https://vercel.com/docs/plans/hobby. Do not select it for AstroCrown without first resolving eligibility under the project's commercial/product intent and current terms.

These are evidence-based dispositions, not declarations that the vendors' paid services or every possible configuration are unusable.

### 2.8 GUN / SEA — decentralized user-owned graph-data candidate

GUN describes itself as a distributed graph database that synchronizes data across participating peers. Its documented SEA/User system uses public/private-key cryptographic identity and lets a user write to their own graph without a central application server. Browser peers can persist a subset of graph data locally (localStorage/IndexedDB) and synchronize through WebRTC/WebSockets or relays. Official sources:
- https://gun.eco/docs/Introduction
- https://gun.eco/docs/Auth
- https://gun.eco/docs/SEA
- https://gun.eco/docs/Todo-Dapp
- https://github.com/amark/gun

This directly merits a bounded prototype because it could make some user-owned profile/preferences data portable across client deployments without requiring AstroCrown to operate one central database for every user. It should not be dismissed merely because the main UI is on GitHub Pages.

However, the same project documentation contains important limitations: GUN account usernames are not guaranteed to be globally unique; peers may be offline and data may become unavailable if no participating peer retains it; and its illustrative 3-friend recovery mechanism can still lock users out if they did not configure friends/backups. GUN's documentation explicitly cautions not to use that recovery model for banking applications. The browser-based security model also requires strict XSS/dependency hygiene; a compromised client can steal a user's password or private key.

**Candidate boundary:** qualify GUN for *public or low-risk user-controlled profile/preferences, encrypted exports, and peer-synchronization experiments*. Do not use it as the sole authority for administrator privileges, publication rights, paid entitlements, financial assets, account suspension or recovery of all privileged data. A compromised/unavailable peer must not be able to grant roles; user ownership of a graph is not equivalent to AstroCrown's authorization. Avoid putting email addresses, session tokens, password-reset secrets or plaintext private data into public graph paths. Define deletion, replication, spam/abuse and loss-of-all-keys behaviour before any production use.

GUN has a useful offline-first model, but no measured availability, abuse protection, deterministic data-retention guarantee or AstroCrown security qualification has yet been established. Its inclusion is a *test candidate*, not a provider selection or proof that operational hosting costs become zero.

### 2.9 Hypercore / Hyperswarm and Nostr — useful complementary primitives, not turnkey hosting

Hypercore is documented as a signed, Merkle-tree-verified, distributed append-only log. Its API requires storage and replication peers; it is a data-distribution primitive, not a managed, globally available account service. Official source: https://github.com/holepunchto/hypercore

Nostr defines signed events and relay-client interactions, and some event types can represent profile metadata. It can be a candidate for a user-controlled public profile or public, signed statements, but relays can have differing support and data-retention practices; deletion requests are not guaranteed to remove every copy. Official sources:
- https://github.com/nostr-protocol/nips
- https://github.com/nostr-protocol/nips/blob/master/01.md
- https://github.com/nostr-protocol/nips/blob/master/09.md

**Candidate boundary:** test these only for use cases where signed replication is valuable. They do not remove the need for private-key protection, robust key recovery, role authorization, spam resistance, deletion/privacy policy, peer/relay discovery, backups, and a documented fallback when the user's chosen peers disappear.

### 2.10 What "hosting-agnostic / swarm" can and cannot mean

A distributed design can avoid dependence on any *one* host if it has multiple independently operated peers and a replication protocol. It cannot guarantee persistent storage, CPU, outbound email, or reachability at zero cost unless someone contributes those resources and continues to do so. A volunteer/agent swarm can be part of the resource pool but is not itself proof of uptime, privacy, authorization correctness, or funding.

For AstroCrown, the promising hybrid to test is:
1. Static frontend remains mirrorable.
2. A replaceable, minimum central API provides rate-limited transactions where a canonical decision is necessary (e.g., administrator role and publishing approvals), while durable account data can be evaluated separately.
3. A user-controlled decentralized data layer may sync explicitly consented, non-sensitive settings/profiles and encrypted exports.
4. Identity/recovery uses an established cryptographic scheme and multiple independently held recovery methods; it does not depend on a public relay being permanently online.
5. The account continues to work when a relay/peer, email provider, or one hosting provider is unavailable; failure and migration behaviour is tested.

This hybrid remains a design hypothesis. Do not implement a central-plus-decentralized dual-write path until ownership, consistency, deletion, key lifecycle, backup/restore, and recovery tests define which store is authoritative for each datum.

## 3. Account routes to compare

### Route A — Preserve the familiar email/password UI, add a qualified sender

- Keep the current familiar Log In / Sign Up interaction as the UI baseline.
- Use a mail-provider adapter rather than hard-coding a sender vendor into account logic.
- Qualify a no-billing-information free email sender for address verification and short-lived, single-use recovery links.
- Hash reset tokens before persistence; expire and consume them atomically; rate-limit issuance and redemption; revoke existing sessions after a successful credential reset.
- Never disclose whether an address exists from a public reset-request response.
- Keep newsletter consent independent from authentication and recovery; never subscribe by default.
- Treat email as one recovery route, not proof that a user is a real-world person or an administrator.

**Risk to resolve:** a free email plan is a third-party dependency and can change. The system must not make data migration or authentication design inseparable from one email provider.

### Route B — Make email non-essential to account continuity

- Evaluate maintained standards-based passkeys/WebAuthn with multiple independently held authenticators.
- Evaluate a clearly explained offline fallback and the recovery ceremony for losing all routine authenticators.
- Permit email as an optional, separately verified contact or recovery channel where appropriate; do not make an unverified email the sole proof of ownership.
- Preserve an account's stable internal identifier independently from email addresses, wallets, and administrative roles.
- Do not claim that a passkey alone solves total loss: recovery, enrollment, revocation, and account takeover must be tested too.

This route needs the authoritative relying-party domain and a maintained WebAuthn implementation. It is a candidate for qualification, not a completed feature. It must not silently replace the email/password UI that is currently being reviewed.

### Route C — Portable self-hostable backend, including patched PHP as an option

- Compare the existing Python-standard-library prototype against a small PHP/PDO implementation and a Worker-based implementation using the same API contract and behavioral tests.
- Test PHP only on a supported patched runtime; for the 2026-10-21 advisory, use 8.5.12, 8.4.27, or 8.3.36 or later applicable vendor-patched builds. Prefer a runtime with a longer supported horizon than PHP 8.2.
- Require a durable database, protected server-side secrets, secure HTTPS cookie configuration, abuse/rate limits, logging that excludes credentials, verified outbound delivery if email is selected, backup/restore, and a documented patch/update owner.
- Keep deployment adapters separate from the UI and account domain logic. Use a documented API contract and routine SQL export/migration so the application can be moved to a different host.
- Do not select an anonymous/free shared PHP host just because PHP and MySQL are advertised. Test the actual runtime version, persistence, data retention, transport security, no-card signup, acceptable-use terms, export, backup, and operational limits.

### Route D — Local-first and decentralized support

- Keep public static assets mirrorable.
- Consider client-side generation of recovery material and locally encrypted user exports.
- Evaluate P2P replication only for use cases where data ownership, revocation, deletion, confidentiality, consistency and availability have explicit solutions.
- Do not place plaintext credentials, session tokens, email addresses, recovery secrets or private-memory data in public content-addressed storage.
- Do not interpret the presence of an AI/SI agent swarm as evidence that it supplies free durable hosting or an accountable authorization authority.

## 4. Proposed architecture principles

1. **Portable contract first:** the browser speaks to a documented versioned account API. The frontend must not depend on direct database access or provider-specific identity SDKs.
2. **Pluggable persistence and mail:** isolate storage and notification delivery behind tested interfaces. Do not add a second unneeded abstraction framework if two small adapters suffice.
3. **$0/no-card is a hard gate:** test actual signup, deploy and sustained operation. No trial credit, paid-plan upgrade, card, paid email route, or implicit billing fallback.
4. **Fail securely under quotas:** when storage, rate, compute, or delivery limits are reached, refuse the affected operation safely and explain the next safe step. Never downgrade authentication security silently.
5. **No false claims:** distinguish tests, local prototype, provider qualification, staging operation, and production readiness.
6. **Evidence-first recovery:** test the user's exact loss scenarios, including inbox unavailable, forgotten password, lost device, revoked authenticator, expiry/reuse of recovery token, active-session revocation, and total loss of routine authenticators.
7. **No premature deployment:** AUTH-001, the authoritative public domain/publishing source, stays BLOCKED until actual origin and deployment evidence are available.

## 5. Qualification work, in dependency order

| ID | Action | Acceptance evidence | Initial status |
|---|---|---|---|
| ZCA-001 | Verify authoritative public host/domain/publishing path | Repository, DNS/CDN, and served-artifact evidence agree | BLOCKED |
| ZCA-002 | Qualify a free email sender with no billing information | Actual onboarding, domain verification, send to controlled test inbox, delivery/failure evidence | NOT TESTED |
| ZCA-003 | Qualify Workers Free + D1 | No-card deploy path, API contract tests, quota-safe failure, database export/restore, CPU budget test | NOT TESTED |
| ZCA-004 | Compare portable PHP/Python/Worker backend adapters | Same behavioral/negative tests and migration/export test; runtime patch status recorded | NOT TESTED |
| ZCA-005 | Compare email recovery and multi-authenticator recovery | Threat model, owner acceptance, maintained implementation, end-to-end and negative regression suite | BLOCKED |
| ZCA-006 | Validate operations | Backup/restore, account deletion/export, secret rotation, abuse/rate limits, incident/recovery procedure | BLOCKED |
| ZCA-007 | Promotion | Exact-head CI, browser/accessibility/security/privacy/legal review, AUTH-001 resolution | BLOCKED |

## 6. Immediate recommendation

Do not select a single platform in advance. Run the lowest-cost, evidence-producing qualification in this order:

1. Confirm the real public hostname and deploy path before configuring any relying-party origin.
2. Verify Resend's actual free/no-billing signup and sender-domain requirements without sending mail to real users.
3. Build a small account API proof against Workers + D1 while respecting the 10 ms Worker CPU cap and the enforced daily D1 limits.
4. Reuse the same contract/tests to measure whether the existing Python server or a patched PHP implementation offers a simpler portable deployment path.
5. Compare email recovery with passkey/multi-authenticator recovery before committing to an account lifecycle.

No result above authorizes merging PR #141, deploying authentication, configuring production secrets, or upgrading to a paid tier.

## 7. Impact analysis

**IF this qualification succeeds:** AstroCrown can move from a disposable UI/local demo toward persistent user accounts while keeping the homepage portable, the account API replaceable, the budget at $0, and user recovery explicit.

**IF this work is skipped:** the project risks making an early provider choice, treating a disposable demonstration as an operational account, weakening authentication to fit an execution limit, or shipping a recovery path that users cannot actually use.

The governing principle remains: constraints are investigated and tested, not declared impossible prematurely; security and recoverability are not compromised merely to achieve a free deployment.
