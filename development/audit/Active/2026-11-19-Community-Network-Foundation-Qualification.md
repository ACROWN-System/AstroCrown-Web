# Community Network Foundation — Engineering Qualification and Continuity Record

**Record:** CN-AUDIT-2026-11-19-001  
**Created:** 2026-11-19; revised after frontend qualification on 2026-11-19 (UTC)
**Status:** BACKEND + INITIAL FRONTEND SLICE QUALIFIED ON EXACT HEAD; NOT PRODUCT OR PRODUCTION READY
**Repository:** `ACROWN-System/AstroCrown-Web`  
**Branch:** `feature/community-network-foundation-2026-11-19`  
**Candidate commit at record revision:** `22764679870d69c27554dcb115e77e6892216ca4`
**Base:** `main` at `51da27b004c8f5aa94a37bd90a9521a61bedb565`  
**Related GitHub pull requests:** [#194 — Community API foundation](https://github.com/ACROWN-System/AstroCrown-Web/pull/194); [#170 — Native Community Network and Council requirements](https://github.com/ACROWN-System/AstroCrown-Web/pull/170)  
**Information handling:** INTERNAL — repository engineering evidence; synthetic test identities only  
**Execution environment:** GitHub-hosted Actions and connected GitHub repository operations. No owner workstation operation.

## 1. Outcome and scope

This record now covers the first qualified backend foundation **and the first native Community homepage slice**. It does not declare the complete AstroCrown social/community product finished.

Delivered and qualified on the exact candidate commit:

- D1 schema and authenticated Worker APIs for community discovery, global/community feeds, post/reply persistence, reactions, bookmarks, block/mute, reports, membership and moderation audit.
- Manager-reviewed request membership: pending requests, manager-only queue, approve/reject decisions, conditional updates and audit events.
- Account-bound private-community invitations: manager issuance, invitee inbox, accept/decline, issuer/manager revocation, expiry reconciliation and audit records. An invitation grants no access until its intended AstroCrown account accepts it.
- Corrected author-side block feed isolation. Hidden posts are omitted from feeds and direct reads remain denied without breaking unrelated feed items.
- First-party Community section in the canonical `development/index.html`: global feed, six seeded community links, group feed, post composer, replies, reactions, bookmarks, report submission, join/request/leave actions, request review and invitation acceptance.
- Reuses the existing AstroCrown passkey/account session. No separate social identity, password or login system was added.
- Worker staging and static Pages build allowlists now include only the two explicit Community assets. The standalone static preview injects a no-backend marker and presents a read-only explanation; account-backed Community behavior remains confined to the connected Worker staging environment.
- Real Chrome tests verify the rendered homepage section, six seeded links, staging CSS/JavaScript delivery, unauthenticated composer boundary, navigation, backend API journeys and private-content isolation.

Not delivered: private/group chat, file or media uploads, member profile pages, full member search, complete moderation case review and appeals, community owner transfer, invitations issued from the homepage UI, full community creation/settings UI, subgroups/channels, public share cards/permalink safety, polls/proposals/events, binding elections, complete accessibility/performance/load/backup qualification.

No production deployment, remote D1 migration, public onboarding, payment, wallet transaction, mint, transfer or on-chain action was performed. Both relevant pull requests remain drafts and unmerged.

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
- Exact qualified candidate: `22764679870d69c27554dcb115e77e6892216ca4`
- Base branch: `main`; PR remains open, draft and unmerged.
- Product requirements: [PR #170 — Native Community Network and Council requirements](https://github.com/ACROWN-System/AstroCrown-Web/pull/170), synchronized against current main, still draft and unmerged.
- No force push, merge or production promotion was performed.

Principal implementation paths:

- `development/account-continuity/worker/migrations/0006_community_social_foundation.sql`
- `development/account-continuity/worker/migrations/0007_community_membership_invitations.sql`
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

The staging build copies the Community assets into the connected Worker environment. The standalone static Pages preview copies the same CSS/JS under its explicit allowlist but injects `window.ASTROCROWN_COMMUNITY_STATIC_PREVIEW = true`; the UI then suppresses account/publishing controls and all API calls and displays a read-only explanatory state. This avoids presenting a nonfunctional static bundle as a live social service.

The Community UI uses DOM element creation and `textContent` for server-derived post, reply, member and community text; it does not interpolate untrusted post data into `innerHTML`. The account UI emits an edge-triggered account-status event so Community refreshes only when authentication changes, not on unrelated status refreshes.

The six seeded initial public spaces are the initial taxonomy only; the taxonomy is intended to remain extensible. Request/invite-only membership policies are now backed by server workflows rather than dead-end status values.

## 5. Verification criteria and results

All results below are tied to exact candidate `22764679870d69c27554dcb115e77e6892216ca4`; earlier green checks from prior commits are not substituted for this candidate.

| ID | Criterion | Method / evidence | Result |
|---|---|---|---|
| CN-Q-001 | Community migrations apply on isolated D1 | Account Staging Worker Qualification, run `44430616998`; local migration step applied migrations 0006 and 0007 | PASS |
| CN-Q-002 | Worker/API invariant and schema tests pass | Same qualification job; 108 Worker invariant tests passed and 3 schema tests passed | PASS |
| CN-Q-003 | Global/community feed, posts, replies, reactions, bookmarks, reports, membership and deletion work through Chrome against the local Worker/D1 | Same qualification job; browser smoke reported the full authenticated Community API journey | PASS |
| CN-Q-004 | Request-based membership has a complete manager decision path | Chrome browser journey: pending request, no posting while pending, manager-only request queue, approve grants access, rejection removes posting access | PASS |
| CN-Q-005 | Invite-only membership is account-bound and fail-closed | Chrome browser journey: invitee inbox, decline, accept, private member/owner read access, non-member 404, revocation, expiry, and re-invitation after expiry | PASS |
| CN-Q-006 | Author-side block hides the author's content but cannot break unrelated feed items | Two-account browser regression: direct post 404, overall feed 200, blocked author's post omitted | PASS |
| CN-Q-007 | Canonical homepage renders native Community interface | Chrome waited for Community section and all six seeded community links; verified Community navigation and logged-out composer/login boundary | PASS |
| CN-Q-008 | Worker staging delivers the Community CSS and JavaScript | Browser fetches both explicit asset paths and verifies 200 plus expected source markers; the app executes sufficiently to populate the six-community directory | PASS |
| CN-Q-009 | Static Pages preview publishes assets without falsely enabling the service | Cloudflare Pages Static Preview Build run `44430616751`; strict asset manifest and tests passed; static-only marker ensures no account/API operations | PASS |
| CN-Q-010 | Shared AstroCrown passkey session is reused | Canonical account UI emits authentication changes; Community checks `/api/account/status`; no second identity or password system | PASS for tested integration |
| CN-Q-011 | Security and external pipeline gates complete | CodeQL `44430616782`, NOVA RSI Engine CI `44430616851`, External Review Pipeline `44430616870` all succeeded | PASS |
| CN-Q-012 | Production deployment, public onboarding, remote D1 migration and real financial/on-chain behavior | Not performed; expressly outside authorization | NOT PERFORMED |

### Exact-head hosted workflow evidence

Candidate: `22764679870d69c27554dcb115e77e6892216ca4`

- Account Staging Worker Qualification: [run 44430616998](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/44430616998) — success.
- Cloudflare Pages Static Preview Build: [run 44430616751](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/44430616751) — success.
- NOVA RSI CodeQL Security Analysis: [run 44430616782](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/44430616782) — success.
- NOVA RSI Engine CI: [run 44430616851](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/44430616851) — success.
- External Review Pipeline CI: [run 44430616870](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/44430616870) — success.

Worker Qualification includes dependency installation/lock checks, Worker invariant tests, schema tests, staging-site build, browser bundle validation, local D1 migrations, HTTP/Chrome smoke, read-only Cloudflare preflight and fail-closed deployment configuration checks. No live deployment action was authorized or performed.

The browser log includes these success markers:

`PASS: canonical homepage publishes the native Community section, six seeded community links, scoped staging CSS/JS assets, unauthenticated composer boundary and navigation.`

`PASS: authenticated community directory/feed, post/reply, reactions/bookmarks/reports, request approval/rejection, private invitation inbox/acceptance/revocation/expiry, private-content isolation, posting boundaries, author removal, and author-side-block feed isolation.`

The standalone Pages build intentionally remains a static read-only visual preview. A passing static build does not imply a live community backend is connected there.

## 6. Finding CN-F-001 — author-side block could break a feed

**Affected files:** `src/community.js`, `tests/worker_browser_smoke.mjs`  
**Observed condition:** The post-detail visibility function hid a post where its author had blocked the viewer, but the feed SQL excluded only blocks/mutes initiated by the viewer. A post could therefore be selected into the feed and then fail during per-post visibility checking, causing an otherwise valid feed request to fail instead of omitting the hidden item.  
**Expected condition:** The feed query and direct post access must apply consistent block visibility semantics. A hidden item is omitted; it must not break unrelated items in the feed.  
**Impact:** Availability and privacy/visibility consistency for the affected viewer's feed. No evidence of cross-user data disclosure was established; direct access already failed closed.  
**Remediation:** Feed SQL now excludes both (a) viewer-side block/mute and (b) author-side block. A second synthetic local account authors a post and blocks the original viewer. The browser regression verifies direct detail remains 404 and global feed remains 200 while omitting the post.  
**Re-test:** Exact-head Worker Qualification run `44426950857` / job `135234130183` passed and emitted the explicit feed-isolation PASS line above.  
**Result:** CLOSED for this reproduced behavior, subject to future regression if visibility or block semantics change.

## 7. Open findings and product-completeness gaps

The original backend review identified request and invite-only membership as incomplete. Those two findings are now closed for the API paths and browser scenarios specified below. The following broader product gaps remain open.

### CN-G-001 — Request membership decision workflow

**Status: CLOSED for the defined request-membership lifecycle.** Owners/moderators can list pending requests and approve/reject them; state changes are conditional, audit-backed and tested in Chrome. Pending membership does not grant posting access; rejected membership remains non-active. This does not establish a complete notification or appeal process for declined requests.

### CN-G-002 — Private/invite-only membership lifecycle

**Status: CLOSED for the defined invitation lifecycle.** Manager issuance, recipient inbox, accept/decline, issuer/manager revocation, expiry reconciliation and re-invitation after expiry are implemented and tested. Invitations are account-bound; access is activated only after the intended account accepts; a non-member receives 404 for private content/feed. The implementation currently uses a **7-day technical expiry default**. That duration is not a constitutional or finalized public product policy; it must be approved or changed before enabling the private/invitation product publicly. Invitation creation is API-backed but is not yet exposed as a complete manager UI in the homepage.

### CN-G-003 — Report handling ends at submission

Members can submit reports and duplicate submissions are prevented, but there is no complete moderator case queue, decision/dismissal workflow, reporter-visible case outcome, evidence-retention policy or appeal process.

**Status: OPEN — report submission is not a complete moderation system.**

### CN-G-004 — Community owner transfer is not implemented

The system prevents the owner from leaving without a transfer, but no successor invitation/acceptance, concurrent transfer guard or complete succession lifecycle is present.

**Status: OPEN — owner succession and transfer must be implemented and tested before describing community lifecycle as complete.**

### CN-G-005 — First-party Community frontend

**Status: PARTIALLY CLOSED — initial homepage interface delivered and exact-head browser-tested; full product UI remains open.** The canonical development homepage now includes navigation, a global feed, six seeded spaces, post composition, replies, reactions, bookmarks, reports, join/request/leave, manager review of requests and invitation acceptance. The UI reuses the passkey account state and has responsive layouts and keyboard focus indicators. It does not yet include member profiles, comprehensive member/community search, community creation/settings, manager invitation issuance, report case triage/appeals, complete mobile/screen-reader testing or a full accessibility audit.

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

The immediate reusable correction is to treat membership, moderation and ownership as complete state machines rather than one-off endpoints. The current `request` and `invite_only` options are premature until those state transitions exist.

## 9. Workflow anomaly — two push runs with no jobs

The earlier candidate push produced two completed failures with no retrievable jobs:

- `44426941417`, `.github/workflows/python-ci-lock-refresh.yml`, event `push`, zero jobs.
- `44426939649`, `.github/workflows/account-continuity-prototype-tests.yml`, event `push`, zero jobs.

The inspected source did not match those feature-branch push events: the Python lock-refresh workflow has PR path filters, schedule and workflow_dispatch but no push trigger; the prototype test workflow limits push to `main`. The connected job lookup returned empty arrays. That proves only that no job-level reason was available; it does not prove GitHub's internal root cause.

No trigger was broadened and no fake job was added to suppress the red indicator. The PR-triggered qualification workflows listed in Section 5 are separately green on the current exact head. Keep this anomaly classified as **UNEXPLAINED / NOT A PRODUCT TEST FAILURE** unless a run with job/log evidence identifies its cause.

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
2. Implement report triage, moderator decisions, auditable case lifecycle and an appeal policy only after the appeal authority, deadlines and evidence-retention rules are explicit.
3. Implement safe community-owner transfer/succession with successor acceptance, concurrency controls, immutable audit events and real-browser tests.
4. Complete manager UI for invitation issuance and private-community management; complete community creation/settings through the existing authorized platform-admin step-up, not client role assertions.
5. Extend the Community UI with member profiles, search/discovery, subgroups/channels, pinned posts and additional interaction models only after each is specified and backed by a tested API.
6. Research chat with Matrix and other mature options; qualify protocol, self-hosting, licensing, no-card cost, encryption/key recovery, abuse operations, data sovereignty and backups before adopting a new service.
7. Complete permalink/preview safety before external sharing. Keep external networks non-authoritative and optional.
8. Expand security, privacy, accessibility, responsive, load, rate-limit, concurrency and backup/restore tests. Record each criterion separately; passing the current CI suite is not blanket certification.
9. Keep polls/proposals distinct from binding elections. Do not implement Council elections until the approved constitution and election threat model are available.
10. Re-run all relevant tests against each exact new commit. Preserve existing passing evidence and avoid repeating unrelated checks when neither the code nor workflow changed.

## 12. Closure and resumption checkpoint

**Current work-block result:** the Community backend foundation, request membership decisions, private invitation lifecycle, author-side-block feed isolation and first-party homepage UI all pass exact-head GitHub-hosted tests on `22764679870d69c27554dcb115e77e6892216ca4`.

**Pull-request state:** PR #194 open, draft, unmerged; PR #170 open, draft, unmerged. GitHub reports PR #194 mergeable, but merge is not authorized. No production deployment or promotion was performed.

**Next highest-value work:** complete report-case moderation and owner transfer only after their decision/appeal/succession rules are explicit; meanwhile improve manager invitation UI, profiles/search, accessibility and privacy-safe permalink behavior. The 7-day invitation expiry remains a release policy decision.

On resumption, fetch the current main and PR heads, read this record, compare the branch before editing, and continue from the exact new head. Do not repeat the already-passing backend/browser/static checks unless a relevant file or workflow changes. If a rule requires owner/constitutional approval, stop at that boundary rather than silently inventing policy.

## 13. References

- AstroCrown product requirements: [PR #170](https://github.com/ACROWN-System/AstroCrown-Web/pull/170).
- AstroCrown backend foundation: [PR #194](https://github.com/ACROWN-System/AstroCrown-Web/pull/194).
- [NIST SP 800-218 SSDF v1.1](https://csrc.nist.gov/pubs/sp/800/218/final).
- [OWASP ASVS 5.0.0](https://asvs.owasp.org/).
- [ISO/IEC 25010:2023](https://committee.iso.org/standard/78176.html).
- [Discourse source repository and license](https://github.com/discourse/discourse).
- [Lemmy source repository and license](https://github.com/LemmyNet/lemmy).
- [Matrix Client-Server specification](https://spec.matrix.org/unstable/client-server-api/index.html).
- [W3C ActivityPub Recommendation](https://www.w3.org/TR/activitypub/).

This record is an engineering qualification and continuity artifact. It is not legal advice, security certification, production approval or evidence that unimplemented product capabilities exist.
