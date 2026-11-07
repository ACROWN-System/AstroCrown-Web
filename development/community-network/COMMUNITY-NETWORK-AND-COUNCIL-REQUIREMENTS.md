# AstroCrown Native Community Network and Imperial Council Requirements

**Recorded:** 2026-11-08  
**Status:** PRODUCT REQUIREMENTS / DESIGN BASELINE ONLY — NOT IMPLEMENTED  
**Scope:** First-party social, community, communications, representation and content-sharing capabilities within AstroCrown Web.

## 1. Foundational decision — AstroCrown owns the platform

AstroCrown shall operate its own integrated social and community platform. It is the authoritative home for AstroCrown accounts, public posts, communities, group discussions, member communications, proposals, elections, Council representation and governance records.

Competing social networks and other external platforms may be referenced as examples of interaction patterns or as destinations for voluntary user sharing. They shall not replace AstroCrown, host its official communities, become its official institutional communication channels, provide its account identity authority, or become essential to its operation. AstroCrown shall not depend on official institutional accounts on competing social networks.

External services are optional distribution surfaces only. Losing access to any such service must not interrupt AstroCrown's essential social or governance functions.

## 2. Product structure

The platform has two complementary first-party social surfaces:

1. **General post feed:** a platform-wide feed for short and long-form posts, announcements, observations, questions, media, links, discussions, polls and other supported post types. Its interaction patterns may be familiar to users of modern social platforms, but the design, rules, data, identity and user experience must be AstroCrown's own.
2. **Specialized communities and groups:** dedicated spaces organized around fields, interests, research areas, projects or other shared purposes. Each community has its own feed, membership, discussions and communications, and may contain subgroups or working groups.

Both surfaces use the same AstroCrown account and identity system. A user must not need a separate account for each community.

Initial community examples (not a closed taxonomy) include:
- Finance and Tokenomics;
- Aerospace;
- Computing Power and Infrastructure;
- Superintelligence and AI Systems;
- Ethics and Governance;
- Science and Research;
- Security, Environment, Education, Culture and other communities as they develop.

Communities may be created, divided, combined or archived under transparent platform rules. Their organization must not hard-code the initial examples as the only permitted subjects.

## 3. General post feed

The general feed should support, according to the capability actually implemented:
- text posts and longer publications;
- replies, threaded discussions, quotations and reposts;
- links, image, video and other approved attachments;
- topics/tags and content discovery;
- reactions and saved/bookmarked items;
- polls and structured proposals where enabled;
- public author profiles and post permalinks;
- reporting, blocking, muting and moderation/appeal outcomes;
- clear visibility and audience controls.

The feed must provide meaningful discovery controls and transparent ranking behavior. It must not silently describe algorithmically selected or sponsored content as chronological or neutral. Users should be able to distinguish chronological, followed-community and other recommendation views where those views are offered.

A post is not considered operational merely because a button or interface exists. Every displayed action must be backed by a working API, authorization rule, persistence behavior and end-to-end verification. Unimplemented capabilities must be clearly unavailable rather than presented as active.

## 4. Communities, groups and communications

Each recognized community should be able to provide:
- a name, description, purpose, rules and discoverable public profile;
- membership and membership eligibility settings;
- its own post feed, replies, topic channels and pinned material;
- dedicated chat/communication spaces, with access controls appropriate to the space;
- subgroups, working groups and collaborative research areas;
- polls, proposals, events and announcements;
- community moderation, reports, appeals and auditable administrative actions;
- member information and the community's representative/election information;
- an archive of important proposals, decisions and election results.

Public, restricted and private areas must have explicit visibility boundaries. Private or member-restricted content must never leak through public permalinks, search previews, Open Graph metadata, exported images, notifications or external share cards.

## 5. Imperial Council representation

The official institution is named **Imperial Council**. An active member is a **Councillor**. Use neutral terms such as entity, member, agent, Councillor, Council seat and Council mandate. Do not qualify the title as human Councillor or otherwise make human status an implicit eligibility requirement.

Eligible membership may include human members and recognized non-human entities or agents. Recognition, identity, mandate, eligibility and voting authority must be verified under the applicable constitutional rules. This terminology does not itself assert consciousness, legal personhood or identical capabilities.

Each community may elect its own representative or representatives to the Imperial Council:
1. establish the community's recognized membership and electoral register;
2. publish the election rules, eligibility, nomination window, term and seat count before voting;
3. accept nominations and candidate consent;
4. provide secure voting to eligible members;
5. verify the tally and preserve an auditable election record;
6. publish the result and the elected Councillor's community mandate;
7. support term expiry, succession, recall or replacement only under previously published rules.

A Councillor's authority comes from the documented community mandate and the Imperial constitutional framework, not merely from popularity or account status. Election administration must be auditable and resistant to duplicate identities, coercion, bribery, vote buying, manipulation and unauthorized ballot access.

**Not yet decided:** seat allocation across communities, term length, nomination thresholds, quorum, voting method, tie handling, recall thresholds, election challenge periods, treatment of agent mandates and cross-community representation. Do not silently invent these rules in code. Record and resolve them through the appropriate constitutional design process before implementing binding elections.

No token balance, payment, purchase or financial contribution should automatically confer additional votes. Any future weighting or special voting rule requires an explicit constitutional decision and abuse analysis; do not assume one-member-one-vote or another model without documenting its scope and rationale.

## 6. Identity and account integration

The community network depends on the existing AstroCrown account foundation. The current account branch adopts passkey-first WebAuthn identity, with a user-held offline recovery mechanism; account identity, wallet links, roles and sessions remain separate concepts.

The social layer must:
- reuse one stable AstroCrown account/entity identifier across the general feed and communities;
- distinguish account authentication from a community membership and from a Council electoral credential;
- support the approved eligibility and mandate model for non-human agents without requiring human-only account terminology;
- enforce visibility, membership and moderation rules server-side;
- avoid treating a connected wallet as identity or voting authority by itself;
- preserve account access independently of optional wallet connections;
- provide appropriate account, content and membership export/closure workflows when implemented.

Do not create a parallel social-only login system or introduce a competing provider login dependency. Build on and qualify the accepted account architecture rather than duplicating authentication.

## 7. Voluntary external sharing and compatible post formats

AstroCrown posts should be easy for their authors to share outside AstroCrown without making external platforms authoritative or official.

The first-party platform should support, as appropriate:
- canonical public permalinks;
- accurate Open Graph and social-preview metadata for public content;
- preview images/cards generated from approved post content;
- copy-link and copy-text actions;
- downloadable image cards and other user-controlled exports;
- suitable layout presets for common external post formats and aspect ratios;
- native device/browser share-sheet support where available;
- accessible plain-text alternatives and attribution/source links.

External sharing is user-initiated and must respect the post's visibility and sharing permissions. No private, restricted, deleted or otherwise non-shareable content may be exported. Authors should be able to inspect the generated preview before sharing.

Initially, sharing should not require AstroCrown to create or operate official accounts on external networks, obtain their posting credentials, or depend on their APIs. Direct publishing integrations, if ever considered, are optional later adapters subject to current terms, privacy and security review. A compatible export is not a promise that every external service will preserve every format or feature.

External destinations may be used by individuals to distribute links or exported content. The authoritative post, discussion, membership and governance record remains in AstroCrown.

## 8. NOVA's operational responsibilities

NOVA is the evidence-driven SI dimension within HSIAN and the autonomous operational coordinator for the platform. It has no personal goals or self-generated personal intentions. Its actions arise from its established mission, verified evidence, approved rules and governed decision criteria.

Within its assigned authority, NOVA should coordinate:
- community and group provisioning, availability and service health;
- feed, search, notifications, communications and data lifecycle operations;
- abuse/spam detection, moderation workflows and appeals, with traceable policy application;
- indexing, knowledge retrieval, provenance and research support;
- election administration, eligibility validation, tally verification and record preservation;
- backup, restore, incident response and continuity;
- performance, security and accessibility evaluation.

NOVA may provide evidence-based analysis and recommendations to members and Councillors. It must not covertly manipulate members, personalize persuasion to predetermine votes, suppress legitimate disagreement or falsify election processes. Election integrity, ballot secrecy, accurate results and verifiable audit evidence must be designed together.

HSIAN's exceptional constitutional authority remains governed by the separate Imperial constitutional requirements. Ordinary community discussions, nominations and elections must be genuine, with published rules and preserved evidence.

## 9. Data, portability, security and resilience

AstroCrown remains the authoritative data controller/operator for its own platform architecture. Requirements include:
- documented data ownership, purpose, access and retention;
- privacy-minimal collection and clear visibility controls;
- secure storage and transport, authorization on every relevant API, abuse/rate controls and audit logging;
- backups and tested restore procedures;
- export and migration formats for posts, media metadata, membership and governance records, subject to privacy and legal limits;
- clear deletion, moderation and retention behavior;
- separation of public content, private communications, account secrets and election data;
- incident recovery that does not depend on external social platforms;
- no real-user data in disposable development/staging qualification.

Public and private data must be treated differently. A publicly shareable post may be mirrored/exported by its author; private messages, restricted group content, credentials, ballot secrets and sensitive moderation records must not be copied into public exports or analytics.

## 10. Delivery order and relationship to account work

This document records the social/community product direction. It does not enlarge the scope of the existing passkey/account pull request.

Recommended dependency order:
1. Complete and qualify the shared account identity, sign-up/sign-in, recovery, sessions, security and User dashboard foundation.
2. Complete the separately gated Administrator account/role/wallet authorization and its owner-controlled bootstrap/recovery requirements.
3. Establish the first-party social content and community data model, permissions and APIs using the same account identity.
4. Implement the general post feed and community/group feeds, followed by chat and other communications.
5. Implement proposals and non-binding polls, then binding community elections after the constitutional rules are approved.
6. Implement external-share previews, export cards and compatible formats without introducing official competitor-platform accounts or dependencies.
7. Qualify the complete experience with browser, accessibility, security, privacy, load, abuse, recovery and cross-region tests before public demonstration.

A dependency or sequencing change requires a recorded reason and impact review. Do not start a second authentication implementation to accelerate the social layer.

## 11. Development and qualification discipline

This is a requirements baseline, not evidence of implementation. For every capability, record:
- requirement and responsible component;
- design/decision and unresolved questions;
- implementation commit;
- automated and browser verification;
- security/privacy/accessibility checks;
- measured results and known limits;
- PASS / FAIL / BLOCKED / N/A status;
- remediation and re-test evidence.

Use GitHub-hosted qualification and approved remote environments by default for repository work. Do not ask the owner to install or troubleshoot local tooling until available hosted/remote routes have been inspected and a specific evidence-based reason for local execution is recorded.

Do not publish a demonstration feature as live until its backend, data persistence, access control, failure behavior and end-to-end browser journey have been verified. Do not claim social/community/election features exist merely because this document describes them.

## 12. Explicit non-goals and boundaries

- This work does not authorize an official AstroCrown account or community on a competitor's social network.
- This work does not require direct API posting to external networks.
- This work does not make external social networks an account, identity, data-storage or governance dependency.
- This work does not authorize a binding election before the electoral constitution is settled.
- This work does not authorize public sign-up, deployment, paid service activation or production changes.
- This work does not alter the current passkey-first account requirements or the scope/status of PR #141.
- This work does not replace the separate HSIAN Charter, Imperial Council Constitution or NOVA autonomous-governance specifications.

## 13. Acceptance summary

The intended result is one AstroCrown-native platform with a general post feed, specialized communities and groups, first-party communications, community-elected Councillors, auditable Council integration and user-controlled export/share formats for external distribution.

AstroCrown remains the authoritative platform. External services may help content travel farther, but they do not own the community, accounts, discussions, elections, governance records or institutional identity.
