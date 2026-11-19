# Community Network Foundation — Engineering Qualification and Continuity Record

**Record:** CN-AUDIT-2026-11-19-001  
**Created:** 2026-11-19; revised after voluntary ownership-transfer API and Chrome UI qualification (UTC)
**Status:** BACKEND + COMMUNITY FRONTEND + REPORT REVIEW + VOLUNTARY OWNER TRANSFER QUALIFIED; NOT PRODUCT OR PRODUCTION READY
**Repository:** `ACROWN-System/AstroCrown-Web`  
**Branch:** `feature/community-network-foundation-2026-11-19`  
**Qualified code/UI commit:** `af93971d1635b80b8ab81e98d740a5c4d8646f4a`
**Base:** `main` at `51da27b004c8f5aa94a37bd90a9521a61bedb565`  
**Related GitHub pull requests:** [#194 — Community API foundation](https://github.com/ACROWN-System/AstroCrown-Web/pull/194); [#170 — Native Community Network and Council requirements](https://github.com/ACROWN-System/AstroCrown-Web/pull/170)  
**Information handling:** INTERNAL — repository engineering evidence; synthetic test identities only  
**Execution environment:** GitHub-hosted Actions and connected GitHub repository operations. No owner workstation operation.

## 1. Outcome and scope

This record covers the first qualified backend foundation, the first native Community homepage slice, a constrained moderator report-review slice and a voluntary successor-accepted ownership-transfer slice. It does not declare the complete AstroCrown social/community product finished.

Delivered and qualified on code/UI commit `af93971d1635b80b8ab81e98d740a5c4d8646f4a`:

- D1 schema and authenticated Worker APIs for community discovery, global/community feeds, post/reply persistence, reactions, bookmarks, block/mute, reports, membership and moderation audit.
- Manager-reviewed request membership: pending requests, manager-only queue, approve/reject decisions, conditional updates and audit events.
- Account-bound private-community invitations: manager issuance, invitee inbox, accept/decline, issuer/manager revocation, expiry reconciliation and audit records. An invitation grants no access until its intended AstroCrown account accepts it.
- Ban-safe invitation acceptance: ban eligibility is checked inside the same D1 batch transaction as the invitation transition, audit event and membership activation.
- Corrected author-side block feed isolation. Hidden posts are omitted from feeds and direct reads remain denied without breaking unrelated feed items.
- A one-statement feed hydrator. A 20-post page retrieves post fields, author/community information, counts and viewer flags in one D1 statement, retaining server-side membership, visibility, moderation and block predicates. A unit regression fails if the route returns to per-post D1 reads.
- Report submission and duplicate-report prevention; reporter-only status lookup; community-scoped moderator queues; global queue restricted to a platform admin with active step-up; atomic `open → in_review → resolved/dismissed` transitions; mandatory reason and audit event.
- Voluntary ownership handover: the active owner proposes transfer to an existing active member; only that intended account can accept or decline; the proposer can cancel; a single pending proposal is allowed per community; acceptance demotes the former owner to ordinary member and promotes the successor in one D1 transaction. A unique partial index enforces one active owner. The original creator attribution remains unchanged.
- First-party Community section in the canonical `development/index.html`: global feed, six seeded community links, post composer, replies, reactions, bookmarks, report submission, join/request/leave, request review, invitation acceptance, report review, My reports, ownership-proposal inbox/outbox, owner proposal form, successor accept/decline and owner cancellation.
- Reuses the existing AstroCrown passkey/account session. No separate social identity, password or login system was added.
- Worker staging and static Pages build allowlists include only the two explicit Community assets. The standalone static preview injects a no-backend marker and presents a read-only explanation; account-backed Community behavior is confined to connected Worker staging.
- Real Chrome tests verify the homepage, six seeded links, asset delivery, membership/invitation/API journeys, private-content isolation, report review through visible controls, ownership proposal/acceptance/decline/cancellation through visible controls and server-refreshed roles.

Still not delivered: report appeals and evidence-retention policy; emergency owner recovery when the owner loses access or becomes unavailable; an approved automatic expiry policy for pending ownership proposals; manager invitation issuance from the homepage UI; full community creation/settings UI; member profiles/search; private/group chat; media uploads; subgroups/channels; public share cards/permalink safety; polls/proposals/events; binding elections; complete accessibility/performance/load/backup qualification.

No production deployment, remote D1 migration, public onboarding, payment, wallet transaction, mint, transfer or on-chain action was performed. PR #194 and PR #170 remain drafts and unmerged.

## 2. Governing product requirements and decisions

The complete product baseline is recorded in PR #170 at:

`development/community-network/COMMUNITY-NETWORK-AND-COUNCIL-REQUIREMENTS.md`

PR #170 is an open draft and has not been merged. Its branch, `docs/native-community-network-2026-11-08`, was refreshed against the current `main` on 2026-11-19. The refresh commit is `8f9a3696a31eb5b8281ed2e01e5f5a6b31e84e29`; comparison with `main` reports 3 commits ahead and 0 behind; PR #170 reports mergeable=true. The requirements document is therefore available for review, but it is not yet part of `main`.

Product rules applied to this audit:

1. AstroCrown owns the authoritative first-party social, community, communication and governance platform. Other networks are, at most, optional user-controlled distribution surfaces; they are not official communities, institutional channels, identity authorities or operational dependencies.
2. The social layer reuses the existing AstroCrown account/entity identity. It must not create a parallel social login.
3. The general post feed and specialized communities/groups are distinct but integrated product surfaces.
4. Initial community subjects include Finance and Tokenomics; Aerospace; Computing Power and Infrastructure; Superintelligence and AI Systems; Ethics and Governance; and Science and Research. This list is not a closed taxonomy.
5. Public, restricted and private visibility must be enforced server-side. Restricted/private content must not leak through permalinks, search, metadata, notifications or exported/share content.
6. The official institution is the Imperial Council and its active members are Councillors. Eligibility of recognized entities/agents and all binding election rules remain subject to the appropriate constitutional decisions.
7. Seat allocation, terms, nominations, quorum, voting method, tie handling, recall, challenge windows, agent mandates and cross-community representation are not settled by this implementation. No binding election or voting weight is to be invented in code. Token holdings, payments or purchases must not automatically confer votes.
8. A feature is not live merely because a route or control exists. Its server behavior, persistence, authorization, privacy, user experience and end-to-end evidence must be tested.
9. The existing project limits remain in force: no paid service, production activation or real financial/on-chain action.

## 3. Preservation and safety boundaries

- No files under `backup/` were intentionally changed.
- No production/public site files were intentionally changed by PR #194.
- No production Worker or remote database was deployed or migrated.
- All browser/API regression fixtures use synthetic account identifiers, random local session tokens and a disposable Wrangler local D1 database.
- No real user account, private recovery key, production wallet key, payment credential or treasury secret was used.
- GitHub-hosted CI was used instead of asking the owner to install or run development tools locally.
- Neither PR #194 nor PR #170 was merged. Both remain drafts.
- The work did not create, accept or transmit any real wallet transaction and did not interact with mainnet financial rails.

## 4. Candidate and exact implementation state

- Repository: `ACROWN-System/AstroCrown-Web`
- PR: [#194 — Community API foundation and first-party homepage interface](https://github.com/ACROWN-System/AstroCrown-Web/pull/194)
- Branch: `feature/community-network-foundation-2026-11-19`
- Exact qualified code/UI commit: `af93971d1635b80b8ab81e98d740a5c4d8646f4a`
- Base branch: `main`; PR #194 is open, draft and unmerged.
- At this code/UI commit, PR #194 was 36 commits ahead and 0 behind `main`; GitHub reported mergeable=true. This is not an instruction or approval to merge.
- Product requirements: [PR #170 — Native Community Network and Council requirements](https://github.com/ACROWN-System/AstroCrown-Web/pull/170), synchronized against current main, still draft, unmerged and mergeable.
- No force push, merge or production promotion was performed.

Principal implementation paths:

- `development/account-continuity/worker/migrations/0006_community_social_foundation.sql`
- `development/account-continuity/worker/migrations/0007_community_membership_invitations.sql`
- `development/account-continuity/worker/migrations/0008_community_ownership_transfers.sql`
- `development/account-continuity/worker/src/community.js`
- `development/account-continuity/worker/src/index.js`
- `development/account-continuity/worker/tests/community.test.mjs`
- `development/account-continuity/worker/tests/worker_browser_smoke.mjs`
- `development/account-continuity/worker/scripts/build-staging-site.mjs`
- `development/account-continuity/prototype/account-ui.js`
- `development/index.html`
- `development/community-network/community-network.css`
- `development/community-network/community-network.js`
- `scripts/build-cloudflare-pages.mjs`
- `scripts/test-cloudflare-pages-build.mjs`

The staging build copies Community assets into the connected Worker environment. The standalone static Pages preview copies the same CSS/JS under its explicit allowlist but injects `window.ASTROCROWN_COMMUNITY_STATIC_PREVIEW = true`; the UI then suppresses account/publishing controls and all API calls and displays a read-only explanation. This avoids presenting a nonfunctional static bundle as a live social service.

The Community UI uses DOM element creation and `textContent` for server-derived post, reply, member, transfer and community text; it does not interpolate these values into `innerHTML`. Ownership controls are displayed only to authenticated users; the proposal form is shown only when the server-loaded community detail says the current account is the active owner. The API remains authoritative and rechecks roles and membership on every transition.

The Community feed uses one set-based SELECT rather than a loop calling `visiblePost()` and `postView()` once per returned item. Existing indexes cover global/community feed ordering, parent/reply lookup, reaction lookup, bookmark lookup and membership checks. This reduces D1 request/round-trip overhead without lowering the page size and closes the identified 50-query-per-invocation risk for a 20-post page; it does not remove daily row quotas.

Ownership transfer uses active membership roles as the authority. `created_by_account_id` remains historical creator attribution and is not mutated by handover. The acceptance batch checks the intended recipient, active community, current owner and successor membership; demotes the former owner before promoting the successor to satisfy the single-active-owner partial index; and records an audit event. All statements run in one D1 batch. One pending proposal per community is enforced by a partial unique index. There is currently no automatic expiry for a pending ownership proposal; the owner may cancel and the successor may decline.

The six seeded initial public spaces are the initial taxonomy only; the taxonomy remains extensible. Request/invite-only membership policies have server-side workflows rather than dead-end status values. Report submission, moderation transitions and reporter-visible outcomes also have a defined backend/UI path; appeals and owner-loss recovery remain open.

## 5. Verification criteria and results

All results below are tied to exact code/UI commit `af93971d1635b80b8ab81e98d740a5c4d8646f4a`; earlier green checks from prior commits are not substituted for this candidate.

| ID | Criterion | Method / evidence | Result |
|---|---|---|---|
| CN-Q-001 | Community migrations apply on isolated D1 | Account Staging Worker Qualification, run `44433801075`, job `135257497863`; migrations 0006 and 0007 applied | PASS |
| CN-Q-002 | Worker/API invariant and schema tests pass | Same qualification job; 110 Worker invariant tests and 3 schema tests passed | PASS |
| CN-Q-003 | Feed page hydration avoids N+1 D1 subrequests | 20-post unit test asserts exactly one D1 statement and verifies post fields, viewer flags, block and membership filters | PASS |
| CN-Q-004 | Global/community feeds, posts, replies, reactions, bookmarks, reports, membership and deletion work through Chrome against local Worker/D1 | Same qualification job; browser smoke reported the full authenticated Community API journey | PASS |
| CN-Q-005 | Request membership has a manager decision path | Chrome: pending request, no posting while pending, manager-only queue, approval grants access, rejection removes posting access | PASS |
| CN-Q-006 | Invite-only membership is account-bound and fail-closed | Chrome: invitee inbox, decline, accept, private member/owner read access, non-member 404, revocation, expiry, re-invitation; banned invitee receives 403 and invitation remains pending | PASS |
| CN-Q-007 | Author-side block hides the author's content without breaking unrelated feed items | Two-account browser regression: direct post 404, global feed 200, blocked author's post omitted | PASS |
| CN-Q-008 | Canonical homepage renders Community interface | Chrome verified Community section, six seeded community links, navigation and logged-out composer/login boundary | PASS |
| CN-Q-009 | Worker staging delivers Community CSS and JavaScript | Browser fetched both asset paths and verified HTTP 200 and expected source markers | PASS |
| CN-Q-010 | Static Pages preview publishes assets without falsely enabling service | Cloudflare Pages Static Preview Build run `44433801056`; strict asset manifest and tests passed; static-only marker prevents account/API operations | PASS |
| CN-Q-011 | Report moderation API lifecycle is authorized and auditable | Chrome API journey exercises reporter status, duplicate report, unauthorized user denial, community queue, platform-wide queue restriction, open→in_review→resolved/dismissed, mandatory reasons and duplicate-final-decision rejection | PASS |
| CN-Q-012 | Report moderation controls work in the actual Community UI | Chrome selected Aerospace as its owner, opened Review reports, started and resolved a report, then signed in as the reporter and confirmed the outcome in My reports | PASS |
| CN-Q-013 | Shared AstroCrown passkey account/session is reused | Community checks the existing `/api/account/status`; the same passkey session is used, with no second identity/login | PASS for tested integration |
| CN-Q-014 | Security and external pipeline gates complete | CodeQL, NOVA RSI Engine CI and External Review Pipeline all succeeded on the exact code/UI commit | PASS |
| CN-Q-015 | Production deployment, public onboarding, remote D1 migration and real financial/on-chain behavior | Not performed; expressly outside authorization | NOT PERFORMED |
| CN-Q-016 | Voluntary owner transfer API and transactional invariants | Account Staging Worker Qualification, run `44440670380`; Chrome local D1 journey verifies non-owner denial, active-member successor requirement, one pending transfer, pending-owner leave denial, intended-successor-only acceptance, former-owner demotion, decline, cancellation and no replay | PASS |
| CN-Q-017 | Ownership transfer controls work in the actual Community UI | Same Chrome run: current owner proposes through the form; successor accepts through incoming proposals; former owner declines a later proposal; current owner cancels a third proposal; server-loaded role controls update after acceptance | PASS |

### Exact-head hosted workflow evidence

Candidate code/UI commit: `af93971d1635b80b8ab81e98d740a5c4d8646f4a`

- Account Staging Worker Qualification: [run 44440670380](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/44440670380) — success.
- Cloudflare Pages Static Preview Build: [run 44440670394](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/44440670394) — success.
- NOVA RSI CodeQL Security Analysis: [run 44440670395](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/44440670395) — success.
- NOVA RSI Engine CI: [run 44440670603](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/44440670603) — success.
- External Review Pipeline CI: [run 44440670460](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/44440670460) — success.
- CodeQL check `135280672530` — success.
- Python CodeQL check `135280415235` — success.

Worker Qualification completed all steps, including dependency lock/install, Worker invariant tests, schema tests, staging-site build, browser/Worker bundle validation, local D1 migrations, HTTP/Chrome smoke, manual deployment workflow parsing, read-only Cloudflare preflight checks and fail-closed remote-environment verification.

The Worker invariant test output reported `# tests 110`, `# pass 110`, `# fail 0`; the schema suite reported 3 passed and 0 failed. The 20-post feed regression asserted a single D1 statement.

The browser log included these success markers:

`PASS: canonical homepage publishes the native Community section, six seeded community links, scoped staging CSS/JS assets, unauthenticated composer boundary and navigation.`

`PASS: authenticated Community backend/API journeys, report submission and status transitions, request approval/rejection, private invitations and isolation, posting boundaries, author removal, and author-side-block feed isolation.`

`PASS: Chrome report moderation UI: owner opens community queue, starts review, resolves with reason, and reporter sees the final outcome in My reports.`

`PASS: Chrome ownership UI: owner proposes to an active member, successor accepts, former owner declines a later proposal, and current owner cancels another proposal.`

The same qualification also completed the existing account/passkey/recovery and local admin-wallet test flows using synthetic credentials/test wallets only. No real payment or on-chain action was performed.

The standalone Pages build intentionally remains a static read-only visual preview. A passing static build does not imply a live community backend is connected.

## 6. Finding CN-F-001 — author-side block could break a feed

**Affected files:** `src/community.js`, `tests/worker_browser_smoke.mjs`  
**Observed condition:** The post-detail visibility function hid a post where its author had blocked the viewer, but the feed SQL excluded only blocks/mutes initiated by the viewer. A post could therefore be selected into the feed and then fail during per-post visibility checking, causing an otherwise valid feed request to fail instead of omitting the hidden item.  
**Expected condition:** The feed query and direct post access must apply consistent block visibility semantics. A hidden item is omitted; it must not break unrelated items in the feed.  
**Impact:** Availability and privacy/visibility consistency for the affected viewer's feed. No evidence of cross-user data disclosure was established; direct access already failed closed.  
**Remediation:** Feed SQL now excludes both (a) viewer-side block/mute and (b) author-side block. A second synthetic local account authors a post and blocks the original viewer. The browser regression verifies direct detail remains 404 and global feed remains 200 while omitting the post.  
**Re-test:** Exact-head Worker Qualification run `44426950857` / job `135234130183` passed and emitted the explicit feed-isolation PASS line above.  
**Result:** CLOSED for this reproduced behavior, subject to future regression if visibility or block semantics change.

## 6.1 Finding CN-F-002 — per-post D1 reads could exceed the Free-tier query budget

**Affected file:** `development/account-continuity/worker/src/community.js`  
**Observed condition:** `listFeed()` first selected post IDs, then awaited `visiblePost()` and `postView()` for each returned item. This performed multiple D1 calls per post. At the default 20-item page size, a global feed could exceed Cloudflare Workers Free's 50 D1 queries per Worker invocation.  
**Expected condition:** Feed visibility, author/community details, like/reply counts, viewer reaction/bookmark flags and block filters should be returned by one bounded set-based query.  
**Impact:** A feed could work in local tests but fail on a real Workers Free invocation as it approaches/exceeds the per-invocation query budget; it also created unnecessary round-trip latency and row-read overhead.  
**Remediation:** The feed now fetches all page fields in one SQL statement, with correlated count/EXISTS expressions and the same server-side community status, active membership, post visibility, deletion/moderation and block/mute predicates. Existing feed, reply, reaction, bookmark and membership indexes are retained.  
**Re-test:** On exact candidate `73eebc4434cbf4e59bf4814e70c95ab6a6742ed6`, the Worker invariant suite passed 109/109 tests; its new 20-post unit regression asserts one D1 statement. The actual local D1/Chrome Worker qualification also passed, run `44431752410`.  
**Result:** CLOSED for the reproduced query-count problem. Daily row-read/write quota and real-user traffic performance remain operational qualification items; one SQL statement does not mean one row read.

## 7. Open findings and product-completeness gaps

The original backend review identified request and invite-only membership as incomplete. Those two findings are now closed for the API paths and browser scenarios specified below. The following broader product gaps remain open.

### CN-G-001 — Request membership decision workflow

**Status: CLOSED for the defined request-membership lifecycle.** Owners/moderators can list pending requests and approve/reject them; state changes are conditional, audit-backed and tested in Chrome. Pending membership does not grant posting access; rejected membership remains non-active. This does not establish a complete notification or appeal process for declined requests.

### CN-G-002 — Private/invite-only membership lifecycle

**Status: CLOSED for the defined invitation lifecycle.** Manager issuance, recipient inbox, accept/decline, issuer/manager revocation, expiry reconciliation and re-invitation after expiry are implemented and tested. Invitations are account-bound; access is activated only after the intended account accepts; a non-member receives 404 for private content/feed. The implementation currently uses a **7-day technical expiry default**. That duration is not a constitutional or finalized public product policy; it must be approved or changed before enabling the private/invitation product publicly. Invitation creation is API-backed but is not yet exposed as a complete manager UI in the homepage.

### CN-G-003 — Report review, decisions and appeals

**Status: PARTIALLY CLOSED — report submission, manager queue, decisions and reporter outcome are implemented and browser-tested.** Members can submit a report; duplicate reports are prevented; a reporter can see their own status; community owners/moderators can review reports for their community; an unscoped queue requires an active platform-admin wallet session. The state machine supports `open → in_review → resolved` or `open → in_review → dismissed`; transitions are conditional, require a reason and create moderation audit records. The Chrome test uses the actual visible queue controls and confirms that the reporter sees the final decision.

**Still open:** appeals, appeal authority, deadline, evidence-retention/deletion rules, escalation/independent review and whether any specific finding should cause content to be hidden or removed. The current report decision does not automatically remove content. These are product/governance policies; do not invent defaults or enable appeals until approved.

### CN-G-004 — Community owner transfer and succession

**Status: PARTIALLY CLOSED — voluntary owner-proposed, successor-accepted transfer is implemented and exact-head browser-tested.** The active community owner can propose a handover to an existing active member by AstroCrown account identifier. The intended successor alone can accept or decline. The current owner retains control until acceptance and can cancel while the proposal is pending. A single pending transfer per community is enforced. Acceptance uses one D1 batch: it verifies the current owner and successor, demotes the former owner to ordinary-member privilege, promotes the successor, and records an audit event. A partial unique index prevents more than one active owner. The original `created_by_account_id` is preserved as historical creator attribution. Chrome verified proposal, acceptance, a later decline and cancellation through the actual Community UI controls.

**Still open:** there is no automatic expiry for a pending ownership proposal; the current design leaves it pending until the owner cancels or the successor declines/accepts. The policy for any timeout must be explicitly approved. There is also no emergency owner recovery or transfer path for an inaccessible/deceased/abandoned owner account; do not invent an admin override or constitutional succession rule before that authority is approved.

### CN-G-005 — First-party Community frontend

**Status: PARTIALLY CLOSED — initial homepage, moderation and ownership-transfer UI delivered and exact-head browser-tested; full product UI remains open.** The canonical development homepage includes navigation, a global feed, six seeded spaces, post composition, replies, reactions, bookmarks, report submission, join/request/leave, manager review of requests, invitation acceptance, a community-scoped report-review queue, decision-reason entry, reporter-only My reports, incoming/outgoing ownership proposals, owner proposal form, successor accept/decline and owner cancellation. Chrome verified the report-review and complete voluntary ownership-transfer user journeys. The UI reuses the existing passkey session and has responsive layouts and keyboard focus indicators.

Still missing are member profiles, comprehensive member/community search, community creation/settings, manager invitation issuance, appeal UI, emergency owner recovery and full mobile/screen-reader testing and accessibility audit.

The static Pages preview is deliberately disconnected and read-only. Account-backed behavior is tested only on the connected Worker staging build.

### CN-G-006 — Private chat and communications

Private and group chat are not implemented. The account communications endpoint remains staging-disabled.

**Status: OPEN.** Evaluate Matrix and other mature protocols with no-card cost, licensing, encryption/key recovery, abuse controls, hosting, backup and operational ownership before selecting a solution.

### CN-G-007 — Subgroups and topic channels

A parent-space relationship exists in the schema, but no complete subgroup/channel create, list, archive, permission or UI lifecycle is delivered.

**Status: OPEN.**

### CN-G-008 — Rich interactions and discovery

Quotations/reposts, tags/topics, feed search and ranking modes, pinned content, media attachments, non-binding polls, proposals and events are not delivered. Keep these independently specified and tested; do not conflate non-binding polls with Council elections.

**Status: OPEN.**

### CN-G-009 — Public permalinks and share/preview safety

A permalink value in an API response does not prove that a public page, canonical metadata or preview is implemented. No complete public post route/share-card system has been qualified. Private, restricted, deleted or moderated content must not leak through metadata, search, notifications, link unfurling or exports.

**Status: OPEN.** Keep external sharing user-controlled and optional.

### CN-G-010 — Broader security, privacy, accessibility and operations acceptance

The present tests do not establish blanket OWASP ASVS 5.0.0 conformance, full WCAG 2.2 AA, exhaustive XSS/CSRF coverage, keyboard/screen-reader acceptance, responsive browser matrix, rate-limit effectiveness under load, concurrency/load performance, retention/deletion policy or backup/restore evidence. Repository security-baseline items SEC-001 through SEC-015 remain separately UNVERIFIED unless individually evidenced.

**Status: OPEN.** Extend verification per feature; do not make certification claims.

### CN-G-011 — Council elections and binding governance

No elections, ballots, seat allocation, Councillor mandate or binding voting behavior is included. Constitutional rules remain unresolved.

**Status: BLOCKED pending approved constitutional requirements and an independent election threat model.** This is an intentional sequencing boundary, not a defect in this slice.

## 8. Reuse and comparable-system review

The purpose of this review is to reuse established behavior and avoid creating unnecessary bespoke protocols. The following sources were checked on 2026-11-19; this is a design-pattern comparison, not a claim that any external product has been independently audited here.

| Candidate/reference | Verified characteristics | Useful pattern to adapt | Reason not to copy or adopt wholesale now |
|---|---|---|---|
| [Discourse](https://github.com/discourse/discourse) | Its official repository describes an open-source community discussion platform with built-in real-time chat, themes/plugins, Rails API, Ember frontend, PostgreSQL and Redis; its repository states GPL-2.0-or-later licensing | Mature category/community discussions, full forum UI, chat, themes, accessibility focus and broad moderation ecosystem are useful product benchmarks | Its stack and deployment model do not map directly to the existing Cloudflare Worker/D1 architecture. GPL-2.0-or-later obligations require legal review before code reuse or derivative distribution. Reuse documented interaction patterns, not copied source |
| [Lemmy](https://github.com/LemmyNet/lemmy) | Official repository describes a federated, self-hostable discussion/link platform built with Rust/Actix/Diesel/TypeScript and AGPL-3.0; includes separate site administrators/community moderators, reports/moderation, post/comment removal/restoration, community/site bans and transfer tools | Clear separation of platform-wide and community-level authority; report triage; explicit moderator actions; safe community transfer/ownership lifecycle | Federation and self-hosted server stack are not current product requirements or Worker/D1 drop-ins. AGPL-3.0 requires legal review before code reuse/derivative distribution. Reuse behavior patterns, not copied source |
| [Matrix Client-Server specification](https://spec.matrix.org/unstable/client-server-api/index.html) | Defines explicit room membership states (unrelated, knocking, invited, joined, banned), join rules and per-room power levels for moderator/admin operations | A complete, explicit membership state machine and granular room permissions; valuable reference for chat/group communication design | Matrix is a protocol, not a free managed chat service or a ready-made Worker/D1 module. A homeserver, client, operations, moderation, encryption/key management, abuse controls and backup model still need qualification. Evaluate a separate self-hosted Matrix service only if a verified $0/no-card option fits long-term control and privacy requirements |
| [W3C ActivityPub Recommendation](https://www.w3.org/TR/activitypub/) | Standard client-to-server and server-to-server APIs for decentralized social networking based on ActivityStreams 2.0 | Optional future interoperability/export boundary if AstroCrown explicitly chooses federation later | Federation is not required for the current product; it expands trust, moderation, privacy, abuse and delivery complexity. Do not make it a dependency or silently turn third-party servers into authoritative homes |
| [OWASP ASVS 5.0.0](https://asvs.owasp.org/) | Current stable release is 5.0.0 and provides testable web-application security requirements | Use versioned, requirement-level security criteria for the UI/API/security test plan | It is a verification standard, not an implementation framework or proof of compliance by itself |

### Reuse conclusion

Keep the existing AstroCrown account identity, Worker, D1 migration pattern, server-side authorization and hosted browser qualification. Borrow mature behavior/state-machine concepts from Discourse, Lemmy and Matrix, and keep ActivityPub as an optional future interoperability decision. Do not introduce a second social login, copy GPL/AGPL source into the repository, bolt on a managed third-party community product, or add a new service without a verified $0/no-card/operational-control assessment.

The request-membership and invite-only membership options now have explicit, audited state transitions and browser coverage; the report workflow has an open/review/final-decision lifecycle; and voluntary ownership transfer now has proposal, acceptance, decline, cancellation, role-demotion and audit states. Continue treating authorization, membership, moderation and ownership as state machines rather than isolated endpoints. Remaining moderation work is appeals and evidence policy; remaining ownership work is pending-transfer expiry policy and recovery when the active owner becomes unavailable.

### Cloudflare D1 Free-tier constraints and query qualification (verified 2026-11-19)

Cloudflare's official D1 pages, last updated 2026-10-30, specify these Workers Free allowances:

- 5 million rows read per day.
- 100,000 rows written per day.
- 5 GB total D1 storage across the account.
- 10 D1 databases per account and a 500 MB maximum per Free database.
- 50 D1 queries per Worker invocation on Free (the Paid plan's listed limit is 1,000).
- A 30-second maximum query/batch duration.

Cloudflare's changelog states that since 2026-09-01 Free-plan queries fail after daily row-read or row-write limits are exceeded, with query operations unavailable until the daily reset at 00:00 UTC; stored data is not affected. These are actual service limits, not merely soft usage targets.

The Community feed previously risked exceeding the 50-query per invocation limit by doing per-post reads. The one-statement feed hydrator closes that specific failure mode. It does **not** prove that a real traffic profile fits the daily 5M-row-read / 100K-row-write quotas. Before public activation, add/verify daily row usage monitoring and alerting, review query-plan/index effectiveness, control abuse with rate limits, and test realistic feed/reaction/report traffic. Do not promise unlimited free operation. Use the free tier as a controlled bootstrap/qualification path and reassess provider economics if product usage/revenue materially grows.

The invitation-inbox expiry reconciler reads at most 100 expired invitations and queues two statements per row (up to 200 statements) in one batch. Cloudflare's D1 Limits page demonstrates that a batch of 2,000 statements counts as one query against the per-invocation query limit. The D1 Database API documents that batch statements run sequentially in one transaction and that any failure aborts/rolls back the full batch. No claim is made that the 2,000-statement example is a guaranteed universal batch maximum; the current code's local 100-row cap bounds this specific operation.

Sources:
- [Cloudflare D1 Pricing](https://developers.cloudflare.com/d1/platform/pricing/) — 5M rows read/day, 100K rows written/day, 5 GB total storage and database counts.
- [Cloudflare D1 Limits](https://developers.cloudflare.com/d1/platform/limits/) — database size, query-per-invocation and 30-second limits; batch statement example.
- [Cloudflare D1 Database Worker API](https://developers.cloudflare.com/d1/worker-api/d1-database/) — transactional `batch()` semantics.
- [Cloudflare D1 Free-tier daily query enforcement changelog, 2026-09-01](https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/).

## 9. Workflow anomaly — two push runs with no jobs

The exact push to qualified code/UI commit `af93971d1635b80b8ab81e98d740a5c4d8646f4a` produced two completed failures with empty job arrays:

- `44440664065`, `.github/workflows/python-ci-lock-refresh.yml`, event `push`, zero retrievable jobs.
- `44440662593`, `.github/workflows/account-continuity-prototype-tests.yml`, event `push`, zero retrievable jobs.

The inspected workflow source does not match these feature-branch push events: the Python lock-refresh workflow has PR path filters, schedule and workflow_dispatch but no push trigger; the prototype test workflow limits push to `main`. The connected job lookup returned empty arrays. That establishes only that no job-level explanation is available; it does not prove GitHub's internal root cause.

No trigger was broadened and no fake job was added to suppress the red indicator. The five PR-triggered qualification workflows listed in Section 5 are separately green on the exact code/UI commit. Keep this anomaly classified as **UNEXPLAINED / NOT A PRODUCT TEST FAILURE** unless a run with job/log evidence identifies its cause.

## 10. Alternatives and decisions

| Alternative | Decision | Basis |
|---|---|---|
| Continue with AstroCrown's existing Worker/D1 and account identity | SELECTED for this backend slice | Existing code, migration and CI are already present; avoids duplicated authentication and a new hosting dependency |
| Adopt Discourse wholesale | DEFERRED / NOT SELECTED | Excellent mature behavior reference, but server stack/resource/deployment and GPL review do not fit as a drop-in |
| Adopt Lemmy wholesale | DEFERRED / NOT SELECTED | Strong moderation/transfer reference, but federated architecture, stack and AGPL review are not a drop-in |
| Use Matrix protocol/client for chat | CANDIDATE FOR RESEARCH | Mature membership and permission state model; hosting, operational burden, no-cost terms, privacy, encryption and user experience still need qualification |
| Implement ActivityPub federation now | NOT SELECTED | Not a current requirement; adds a substantial external trust/delivery surface |
| Implement Council elections in this PR | REJECTED / BLOCKED | Constitutional requirements remain unresolved; implementing assumptions would create governance risk |
| Merge either draft PR now | NOT AUTHORIZED | Owner approval is required; PR #194 also has material product gaps |
| Use production/real payment/on-chain data to test | PROHIBITED BY CURRENT SCOPE | Not necessary for this development foundation and outside authorization |

## 11. Remediation plan and next sequence

1. Obtain product approval for the current 7-day invitation expiry default or replace it with an explicitly approved policy before activating private communities publicly.
2. Define the appeal authority, timing, escalation, evidence-retention and deletion rules before implementing report appeals. The current report queue, decisions and reporter-visible outcomes are implemented; do not add policy defaults silently.
3. Decide whether a pending community ownership proposal needs an automatic expiry. The present voluntary flow has explicit owner cancellation and successor decline/acceptance, but no automatic timeout. Define a recovery/authority path for an inaccessible or abandoned owner before implementing emergency succession or platform-admin override.
4. Complete manager UI for invitation issuance and private-community management; complete community creation/settings through the existing authorized platform-admin step-up, not client role assertions.
5. Extend the Community UI with member profiles, search/discovery, subgroups/channels, pinned posts and additional interaction models only after each is specified and backed by a tested API.
6. Research chat with Matrix and other mature options; qualify protocol, self-hosting, licensing, no-card cost, encryption/key recovery, abuse operations, data sovereignty and backups before adopting a new service.
7. Complete permalink/preview safety before external sharing. Keep external networks non-authoritative and optional.
8. Before public deployment on D1 Free, add/verify monitoring and alerts for daily row reads and writes, check the 5M-read / 100K-write / 5GB aggregate quotas and per-database 500MB limit, and test representative traffic. The feed's N+1 subrequest risk is closed, but quota and throughput qualification remains open.
9. Expand security, privacy, accessibility, responsive, load, rate-limit, concurrency and backup/restore tests. Record each criterion separately; passing the current CI suite is not blanket certification.
10. Keep polls/proposals distinct from binding elections. Do not implement Council elections until the approved constitution and election threat model are available.
11. Re-run all relevant tests against each exact new commit. Preserve existing passing evidence and avoid repeating unrelated checks when neither the code nor workflow changed.

## 12. Closure and resumption checkpoint

**Current qualified code/UI snapshot:** `af93971d1635b80b8ab81e98d740a5c4d8646f4a`. The Community backend, request membership decisions, private invitation lifecycle including ban-safe transactional acceptance, author-side-block feed isolation, one-statement 20-post feed hydration, first-party homepage UI, report moderation API/UI and voluntary ownership-transfer API/UI all pass exact-head GitHub-hosted tests.

**Ownership transfer boundary:** the voluntary handover path is qualified, but an automatic timeout for pending proposals and emergency recovery if the active owner becomes unavailable are not implemented. Current creator attribution is preserved. No admin/constitutional override has been invented.

**Pull-request state at the qualified code/UI snapshot:** PR #194 open, draft, unmerged and mergeable; 36 commits ahead and 0 behind `main`. PR #170 open, draft, unmerged and mergeable. Neither has been merged. No production deployment or promotion was performed. This audit revision is documentation-only; fetch the live branch head before making any further code change.

**Next highest-value work:** define ownership proposal timeout and owner-loss recovery policy; complete manager invitation issuance and community settings UI; define appeal authority/evidence policy before adding appeals; then extend profiles/search/accessibility/permalink safety. The 7-day invitation expiry remains a release policy decision. Daily D1 Free row quotas must be monitored and load-qualified before public activation; the one-query feed regression addresses the distinct per-invocation query budget.

On resumption, fetch the current main and PR heads, read this record, compare the branch before editing, and continue from the exact head. Do not repeat the already-passing backend/browser/static checks unless a relevant file or workflow changes. If a rule requires owner/constitutional approval, stop at that boundary rather than silently inventing policy.

## 13. References

- [NIST SP 800-218 SSDF v1.1](https://csrc.nist.gov/pubs/sp/800/218/final).
- [OWASP ASVS 5.0.0](https://asvs.owasp.org/).
- [ISO/IEC 25010:2023](https://committee.iso.org/standard/78176.html).
- [Discourse source repository and license](https://github.com/discourse/discourse).
- [Lemmy source repository and license](https://github.com/LemmyNet/lemmy).
- [Matrix Client-Server specification](https://spec.matrix.org/unstable/client-server-api/index.html).
- [W3C ActivityPub Recommendation](https://www.w3.org/TR/activitypub/).
- [Cloudflare D1 Pricing](https://developers.cloudflare.com/d1/platform/pricing/).
- [Cloudflare D1 Limits](https://developers.cloudflare.com/d1/platform/limits/).
- [Cloudflare D1 Database Worker API](https://developers.cloudflare.com/d1/worker-api/d1-database/).
- [Cloudflare D1 Free-tier daily query enforcement changelog, 2026-09-01](https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/).

This record is an engineering qualification and continuity artifact. It is not legal advice, security certification, production approval or evidence that unimplemented product capabilities exist.
