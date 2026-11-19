# Community Network Foundation — Engineering Qualification and Continuity Record

**Record:** CN-AUDIT-2026-11-19-001  
**Created:** 2026-11-19 (UTC)  
**Status:** IN PROGRESS — BACKEND FOUNDATION QUALIFIED; PRODUCT ACCEPTANCE BLOCKED  
**Repository:** `ACROWN-System/AstroCrown-Web`  
**Branch:** `feature/community-network-foundation-2026-11-19`  
**Candidate commit at record creation:** `71c10fdf3d949df06646eae229da8cd41e86686e`  
**Base:** `main` at `51da27b004c8f5aa94a37bd90a9521a61bedb565`  
**Related GitHub pull requests:** [#194 — Community API foundation](https://github.com/ACROWN-System/AstroCrown-Web/pull/194); [#170 — Native Community Network and Council requirements](https://github.com/ACROWN-System/AstroCrown-Web/pull/170)  
**Information handling:** INTERNAL — repository engineering evidence; synthetic test identities only  
**Execution environment:** GitHub-hosted Actions and connected GitHub repository operations. No owner workstation operation.

## 1. Outcome and scope

This record establishes what is actually implemented and qualified in the first native community backend slice, what was corrected during this work block, what remains incomplete against the accepted product direction, and the exact next engineering actions.

The objective is not to declare the social platform complete. It is to establish a durable, reviewable foundation on the existing AstroCrown account identity, avoid duplicate authentication, preserve server-side visibility boundaries, and prevent the first backend slice from being mistaken for a finished social/community experience.

Included in the current implementation candidate:

- D1 schema for community spaces, memberships, posts/replies, reactions, bookmarks, account block/mute controls, content reports and append-only moderation audit.
- Six seed communities, with an extensible taxonomy.
- Worker APIs for discovery, global/community feeds, community details, membership join/leave, posting/replies, reactions, bookmarks, reports, author deletion, account controls, community roles and hide/restore moderation.
- Existing AstroCrown account sessions as the write identity; platform community creation requires server-confirmed administrator authority and a fresh enrolled-wallet step-up.
- A real-browser Worker/D1 smoke path using disposable local D1 and synthetic identities.

Explicitly outside this slice and not delivered by it:

- Social/community frontend, navigation, profiles and complete browser user journeys.
- Private messaging/chat and communications.
- File/media attachments and content processing.
- Subgroups, topic channels, pinned posts, search/discovery ranking, quotations/reposts, non-binding polls, proposals, events and external-share cards.
- Membership approval/rejection and invitation delivery/acceptance workflows.
- Report review/decision lifecycle and appeals.
- Council election or binding governance functionality.

No production deployment, production D1 migration, public onboarding, payment, wallet transaction, mint, transfer or on-chain action is authorized by this work.

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

PR #194 current candidate at the time of the initial qualification:

- Branch: `feature/community-network-foundation-2026-11-19`
- Commit: `71c10fdf3d949df06646eae229da8cd41e86686e`
- Commit message: `fix(community): isolate author-side blocks in feeds`
- Parent: `2d86234774621c6fde6a0dfaa91fe83ec34f43d8`
- Base main commit: `51da27b004c8f5aa94a37bd90a9521a61bedb565`
- Five files changed in the pull request; the last code commit added one regression fix across the community API and Worker browser test.
- The pull request remained open, draft and unmerged.

The backend schema and route implementation live under:

- `development/account-continuity/worker/migrations/0006_community_social_foundation.sql`
- `development/account-continuity/worker/src/community.js`
- `development/account-continuity/worker/src/index.js`
- `development/account-continuity/worker/tests/community.test.mjs`
- `development/account-continuity/worker/tests/worker_browser_smoke.mjs`

The current `main` preview directory was inspected. It contains the existing homepage/account/Genesis/privacy assets, but no community page or social UI. The PR #194 changed-file list also contains no frontend/community page or account-navigation file. Therefore, the earlier conversation handoff's mention of a completed community page/account navigation is **not corroborated by the currently inspectable branch/source** and is not counted as delivered. It may represent work from another unmerged or unavailable branch; no attempt is made to infer that it exists.

## 5. Verification criteria and results

The project convention distinguishes static/source, unit, contract, integration and promotion evidence. These categories are not interchangeable. The following evidence is tied to the exact candidate commit above.

| ID | Criterion | Method and evidence | Result |
|---|---|---|---|
| CN-BE-001 | Community schema applies to an isolated disposable D1 database | Worker Qualification run `44426950857`, job `135234130183`; step “Apply local account and isolated Supporter Programme D1 schemas” passed; migration 0006 listed and applied | PASS |
| CN-BE-002 | Community API deterministic validation and Worker invariant tests pass | Same run/job; “Run Worker invariant tests” passed. The prior exact-head run reported 108 Worker tests, 108 passed, 0 failed | PASS |
| CN-BE-003 | Browser/API journey covers directory, global feed, post/reply persistence, reactions, bookmarks, duplicate report, membership, posting boundaries and author removal | Same run/job; Chrome browser smoke output explicitly reported PASS for these behaviors | PASS |
| CN-BE-004 | An author-side block hides direct post access and does not break the viewer's overall feed | Same run/job; browser smoke explicitly reported “feed isolation for author-side blocks”; direct access 404, global feed 200 and post omitted | PASS |
| CN-BE-005 | Community writes require an authenticated AstroCrown account session | Community browser journey ran after passkey registration and used the same account cookie/session; unauthenticated route and ordinary-role creation restrictions are also exercised in the Worker/API test path | PASS for exercised paths |
| CN-BE-006 | Community creation rejects ordinary account self-promotion and requires server-confirmed admin authorization | Browser smoke expected ordinary account community creation to return 403; platform admin callback derives role and step-up from Worker session summary | PASS for exercised paths |
| CN-BE-007 | Worker build/syntax and restricted site asset build remain valid | Same run/job; build, JavaScript syntax, Worker bundle checks and site-build tests all passed | PASS |
| CN-BE-008 | Mainline external-review, NOVA RSI and security-analysis CI gates complete on the candidate | Exact commit check runs listed below | PASS |
| CN-BE-009 | Current pull-request diff is integrated against the latest main | PR #194 metadata reported mergeable=true after checks | PASS for GitHub mergeability only; not an approval to merge |
| CN-BE-010 | Real production deployment, remote D1 migration, public onboarding or live payment behavior | Not performed and expressly unauthorized | N/A for this development-only qualification; production readiness remains BLOCKED |

### Exact-head CI evidence

Commit: `71c10fdf3d949df06646eae229da8cd41e86686e`

- Account Staging Worker Qualification: run [44426950857](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/44426950857) — success.
- External Review Pipeline CI: run [44426950520](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/44426950520) — success.
- NOVA RSI CodeQL Security Analysis: run [44426950663](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/44426950663) — success.
- NOVA RSI Engine CI: run [44426951029](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/44426951029) — success.
- CodeQL check run `135234487997` — success.

Worker Qualification job `135234130183` completed with every listed step successful, including dependency lock/install, Worker invariant tests, schema tests, site build, browser syntax/Worker bundle validation, local database migrations, Worker HTTP/browser smoke journey, read-only Cloudflare preflight checks, and fail-closed deployment configuration checks.

The browser log specifically recorded:

`PASS: authenticated community directory, global feed, post/reply persistence, reaction idempotency, bookmark toggling, duplicate-report prevention, community membership/posting boundaries, author removal, and feed isolation for author-side blocks.`

The same run also exercised passkey registration/sign-in, recovery rotation, session revocation, the EIP-4361/EIP-191 test-wallet enrollment and admin step-up flows using deterministic test-only keys. Those tests do not constitute physical hardware-key testing or a live production wallet interaction.

## 6. Finding CN-F-001 — author-side block could break a feed

**Affected files:** `src/community.js`, `tests/worker_browser_smoke.mjs`  
**Observed condition:** The post-detail visibility function hid a post where its author had blocked the viewer, but the feed SQL excluded only blocks/mutes initiated by the viewer. A post could therefore be selected into the feed and then fail during per-post visibility checking, causing an otherwise valid feed request to fail instead of omitting the hidden item.  
**Expected condition:** The feed query and direct post access must apply consistent block visibility semantics. A hidden item is omitted; it must not break unrelated items in the feed.  
**Impact:** Availability and privacy/visibility consistency for the affected viewer's feed. No evidence of cross-user data disclosure was established; direct access already failed closed.  
**Remediation:** Feed SQL now excludes both (a) viewer-side block/mute and (b) author-side block. A second synthetic local account authors a post and blocks the original viewer. The browser regression verifies direct detail remains 404 and global feed remains 200 while omitting the post.  
**Re-test:** Exact-head Worker Qualification run `44426950857` / job `135234130183` passed and emitted the explicit feed-isolation PASS line above.  
**Result:** CLOSED for this reproduced behavior, subject to future regression if visibility or block semantics change.

## 7. Open findings and product-completeness gaps

The following are not represented as passing merely because current CI is green. Severity is not assigned here because the repository convention requires a declared severity model before using severity labels.

### CN-G-001 — Request membership has no moderation decision workflow

The membership policy enum supports `request` and join creates `pending` membership, but the current API has no owner/moderator queue or approve/reject route. This leaves a request-policy community without a complete path from request to active membership or denial.

**Result:** FAIL for end-to-end completeness of the exposed request policy; open remediation. Do not present request-policy communities as operational until approval/rejection and audit behavior exist and are browser-tested.

### CN-G-002 — Invite-only/private membership has no invitation workflow

The schema/API allow `invite_only` and private visibility, while self-join is rejected. The candidate has no invitation creation, delivery, acceptance, expiry or revocation lifecycle.

**Result:** FAIL for end-to-end completeness of the exposed invite-only/private membership policy; open remediation. Do not create invite-only/private user communities as a functioning product capability until the complete authorized invitation lifecycle exists and is tested.

### CN-G-003 — Report handling ends at submission

Members can submit a report, and duplicate report submission is prevented. The candidate does not provide a report review queue, moderator resolution/dismissal actions, reporter-visible outcomes, appeal workflow or auditable case lifecycle.

**Result:** FAIL for complete moderation/report lifecycle; open remediation. Report submission must not be marketed as a full reporting/appeal system.

### CN-G-004 — Community owner transfer is not implemented

The API prevents the owner from leaving unless ownership is transferred, but there is no transfer-ownership route. This prevents orphaning a community, but also leaves ownership succession/exit incomplete.

**Result:** FAIL for complete community lifecycle; open remediation. Define transfer, acceptance, audit, concurrent-change and last-owner invariants before implementing.

### CN-G-005 — First-party social frontend is absent from the inspected candidate

No native community page, global social feed UI, community navigation, profile page, member directory UI or browser-visible post composer/feed interaction is included in PR #194. No UI/browser acceptance can be claimed from backend API tests.

**Result:** BLOCKED for product/UI acceptance. Build on the existing AstroCrown homepage/account design rather than a parallel login or disconnected prototype. Every displayed action must map to a tested API contract.

### CN-G-006 — Private chat and communications are not delivered

The existing account communications endpoint explicitly returns `available:false` and a staging-disabled message. PR #194 does not implement first-party private/group chat. This is a major requirement dependency, not a minor polish item.

**Result:** BLOCKED. Assess established, self-hostable protocols and the cost/operations/security model before selecting an implementation.

### CN-G-007 — Subgroups and channel structures are not usable

The database contains a parent-space relationship, but the API does not yet provide a complete create/list/archive/authorization lifecycle for subgroups or topic channels, and there is no UI.

**Result:** BLOCKED.

### CN-G-008 — Rich social interactions and discovery are not delivered

Quotations/reposts, tags/topics, search, chronological/followed/recommended feed selectors, pinned content, media attachments, poll/proposal/event flows and transparent ranking controls are not delivered by this PR.

**Result:** BLOCKED, each item to be decomposed into independently testable requirements before implementation.

### CN-G-009 — Public permalinks and share/preview safety are not qualified

The API's post representation may include a permalink field, but no first-party public post route/page or Open Graph/share-card implementation is included in this candidate. Private/restricted/deleted content must remain excluded from metadata and exports.

**Result:** BLOCKED. Do not treat a returned URL field as proof of a working or privacy-safe permalink.

### CN-G-010 — Security, privacy, accessibility and load acceptance remain broader than current tests

The focused Worker tests are useful but do not establish full ASVS v5.0.0 conformance, comprehensive XSS-safe rendering, keyboard/screen-reader support, responsive behavior, authorization across every community state transition, rate-limit effectiveness under load, backup/restore, retention/deletion or performance at scale. The repository's separate `SECURITY-BASELINE.md` lists SEC-001 through SEC-015 as UNVERIFIED.

**Result:** BLOCKED for overall security/accessibility/operational readiness. Use OWASP ASVS 5.0.0 as a versioned verification reference where applicable; do not claim certification or blanket conformance.

### CN-G-011 — Council elections and binding governance are intentionally not implemented

The requirements baseline expressly leaves constitutional rules unresolved. No election register, ballot, voting, tally, Councillor mandate or Council-seat implementation is included.

**Result:** BLOCKED pending explicit approved constitution and subsequent independent security/threat model. This is not a defect in the present backend slice; it is a hard sequencing boundary.

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

The exact push to candidate commit `71c10fdf3d949df06646eae229da8cd41e86686e` produced two extra completed failure runs:

- `44426941417`, workflow file `.github/workflows/python-ci-lock-refresh.yml`, event `push`, branch `feature/community-network-foundation-2026-11-19`, failed, zero jobs reported.
- `44426939649`, workflow file `.github/workflows/account-continuity-prototype-tests.yml`, event `push`, branch `feature/community-network-foundation-2026-11-19`, failed, zero jobs reported.

The workflow source inspected on the candidate branch does not explain these feature-branch push runs:

- `python-ci-lock-refresh.yml` declares `pull_request` with path filters, `schedule`, and `workflow_dispatch`; it has no `push` trigger.
- `account-continuity-prototype-tests.yml` declares `push` only for `branches: [main]` (and a separate pull_request trigger).

The connected workflow-job lookup returns an empty job array for each run. This establishes that the connector could not retrieve any job-level explanation; it does **not** establish the root cause. The anomaly may be a GitHub event/workflow reporting behavior, but that remains unverified. No trigger was broadened, no job was added just to make a red status disappear, and no blind rerun was performed.

**Result:** BLOCKED / UNEXPLAINED. Revisit only if a run with actual job/log evidence appears, GitHub exposes the event payload, or the anomaly affects required PR checks. The four PR-triggered qualification workflows listed above are separate and all passed.

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

1. Keep PR #170 as the canonical product requirement review; it is now current against `main` and mergeable, but still draft and unmerged.
2. Fix CN-G-001 and CN-G-002 before enabling request or invite-only/private membership options. Implement and test a complete membership state machine, with audit entries and race-safe transitions. Until then, either do not expose those policies for general use or fail closed with a clear unsupported-capability response; never accept a pending request that no moderator can process.
3. Complete report queue, moderator decision and appeal model (CN-G-003) before describing the report feature as fully operational.
4. Define community ownership transfer and succession (CN-G-004), with dual-confirmation or an equivalent safe transfer design, audit and last-owner invariants.
5. Build the native social frontend against the existing API, not a second account system. Begin with directory, community detail, chronological feed, post composer, replies, reactions, bookmarks, membership state and moderation affordances; no unbacked/inert buttons.
6. Resolve privacy-safe public permalinks and preview behavior before enabling external sharing.
7. Research private/group communications with Matrix and other mature options under exact project cost, licensing, data-control and operational constraints; do not choose a service solely because protocol code is open source.
8. Expand negative, security, accessibility, responsive, rate-limit, concurrency, load and backup/restore verification as corresponding product capabilities are implemented.
9. Keep polls/proposals separate from binding elections. Do not implement Council elections until the approved constitutional requirements are available.
10. Re-run the original regression and all required checks against each exact new commit. Preserve the current passing evidence; do not declare new code qualified until its own run is complete.

## 12. Closure and resumption checkpoint

**Current work-block result:** the backend foundation and the author-side-block feed regression passed the exact-head GitHub-hosted qualification and four PR workflows. The broader native community product is not complete and remains blocked by the findings in Section 7.

**Pull-request state:** PR #194 open, draft, unmerged. PR #170 open, draft, unmerged. No deployment or promotion performed.

**Current next action:** close the exposed-but-incomplete membership policy gap (CN-G-001/CN-G-002) with a minimal, audited, race-safe membership/invitation state machine, or remove unsupported modes from the currently enabled API surface until the state machine is delivered. Then add real-browser tests for owner/moderator approval, denial, invite acceptance, expiry/revocation, blocked/banned accounts, and concurrent state transitions.

On resumption, re-read this record, re-fetch the current PR heads and main head, and confirm no remote changes before modifying either branch. Do not repeat already-passing checks unless code or the relevant workflow changes.

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
