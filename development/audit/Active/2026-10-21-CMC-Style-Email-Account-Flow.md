# Active Navigation Plan — Familiar Email Account Entry (CMC-Inspired)

**Date:** 2026-10-21  
**Status:** IMPLEMENTED ON DRAFT BRANCH — automated visual-contract and account-flow checks PASS on code snapshot `9873353d2e814709b3473fb1829935ff8d4eb81f`; owner visual confirmation BLOCKED; production use BLOCKED  
**Repository:** ACROWN-System/AstroCrown-Web  
**Branch:** docs/provider-independent-wallet-auth-plan-2026-10-20  
**Parent PR:** [#141 — authentication architecture and optional-wallet lab](https://github.com/ACROWN-System/AstroCrown-Web/pull/141)

## 1. Objective

Replace the unusual username-plus-one-time-recovery-code-first interaction with a familiar, CMC-inspired **Log In / Sign Up** account dialog. The primary sign-up screen should request only the fields the owner specified: email, password, optional Referral ID, an independent optional email-news preference, and acceptance of the Terms of Use and Privacy Policy.

“CMC-inspired” means using a familiar account-entry pattern, not copying CoinMarketCap's branding, assets, or exact implementation. Do not add fake social identity-provider controls or a wallet prompt.

## 2. Owner direction and architecture reconciliation

On 2026-10-21, the owner explicitly requested an email/password account entry with optional referral ID and separate opt-in to receive AstroCrown crypto-universe news by email. This updates the immediate UI requirement from the earlier username-first prototype.

This UI request does not by itself qualify an email-delivery vendor or authorize a production dependency. The existing architecture decision requires that email not be the sole mandatory route forever; this prototype will use email/password as its familiar primary interaction, while future authenticator/recovery options remain a separately evaluated product decision. No external email delivery, account verification, password-reset email, newsletter subscription API, or production persistence may be implied to exist.

## 3. Requirements

- Show **Log In** and **Sign Up** as clear tabs.
- Sign Up fields: required email; required password; optional Referral ID.
- Newsletter/crypto-news preference is a separate, unchecked-by-default opt-in; account creation must not imply marketing consent.
- Terms acceptance is explicit and required for sign-up. The current policy links must resolve to clearly marked development drafts until legal and product review approves production policies.
- Log In uses email and password. Do not ask the user to memorise recovery codes during registration.
- Password reset UI must not pretend to send an email unless a real, qualified delivery mechanism exists. A development prototype should clearly disclose if password reset by email is unavailable.
- Browser preview remains disposable, in-memory, test-only. Never solicit real credentials, assets, wallet secrets or real newsletter consent in that preview.
- Local-only backend stores test accounts on loopback and records optional referral/newsletter consent and terms acceptance for testing. It is not production authentication.
- Preserve public browsing, the existing optional-wallet separation, no fake providers, no external dependency additions, and the $0/no-card constraint.
- Keep production root website unchanged and keep PR #141 in draft.

## 4. Acceptance criteria

| ID | Criterion | Evidence required | State |
|---|---|---|---|
| ACC-UX-EMAIL-001 | Log In / Sign Up structure and requested field labels render | Static guards + current-head headless Chrome flow; owner visual review remains open | PASS |
| ACC-UX-EMAIL-002 | Email/password registration and sign-in work in local and browser-preview modes | Current-head 11-test suite + headless Chrome local and memory-only journeys | PASS |
| ACC-UX-EMAIL-003 | Referral ID is optional, bounded, and recorded only as an unverified reference | Local API validation/storage tests + browser flow | PASS |
| ACC-UX-EMAIL-004 | Newsletter preference is separate, optional, unchecked by default, and timestamped only when opted in | Current-head local API and browser tests; no external mail sender | PASS |
| ACC-UX-EMAIL-005 | Terms acceptance is required; linked policy draft pages are served and clearly marked | Current-head API/static checks and local page serving tests; hosted HTML Preview navigation still needs owner visual confirmation | PASS |
| ACC-UX-EMAIL-006 | Sign-up and forgotten-password journey do not force recovery-code memorisation | Static guard + browser smoke flow; old code endpoint is removed from the new contract | PASS |
| ACC-UX-EMAIL-007 | Forgot-password does not claim email delivery when no mail mechanism exists | Browser flow and HTTP 501 contract test explicitly verify “no email was sent” | PASS |
| ACC-UX-EMAIL-008 | Loopback/origin, password hashing, sessions, no-wallet, and preview non-persistence boundaries remain intact | Current-head account workflow, static guards, and headless Chrome | PASS |
| ACC-UX-EMAIL-009 | Production/root homepage unchanged; changes remain in development and PR stays draft/unmerged | PR changed-file list and PR state | PASS |

## 5. Scope and boundaries

The change targets `development/index.html`, `development/account-continuity/prototype/account-ui.js`, `account-prototype.css`, the local prototype backend/tests/workflow assertions, README and auditable records. It does not implement production identity, real email verification/reset delivery, production mailing-list subscription, or legal approval.

A typed email address is personal data. The development preview therefore accepts invented values only; newsletter checkbox behavior is tested only as local consent-state handling. Production requires data-retention/deletion, lawful-basis/consent, delivery, abuse, incident, and account-recovery review before activation.

## 6. Method

1. Inspect existing repository conventions, account decision records, backend, tests and workflow guards.
2. Update the UI and local prototype with minimal code; do not add dependencies or provider calls.
3. Add regression tests for input validation, persistence of opt-in/terms/referral metadata, login behavior, and no accidental newsletter subscription or false email-sending claims.
4. Run relevant tests on the exact branch head and inspect all resulting checks.
5. Record remaining blockers honestly. Keep the PR in draft until full diff, security and promotion gates pass.

## 7. Impact analysis

**If implemented as specified:** new users can evaluate a familiar email/password flow without being confronted by a recovery-code ceremony or mandatory wallet; optional marketing consent and referral entry are visibly separated from authentication.

**If not implemented:** first-time users continue to encounter a username-centric flow and must negotiate one-time recovery codes immediately, increasing confusion and undermining trust.

**Residual risk:** this UX prototype cannot protect real user assets. Production account storage, email verification, email-based password reset, newsletter delivery/consent operations, policy approval and host/publishing qualification remain separate mandatory gates.


## 9. Implementation record (2026-10-21)

The draft branch now contains the following implementation changes:

- `development/index.html` opens the account modal with updated account-access framing.
- `development/account-continuity/prototype/account-ui.js` now renders Log In / Sign Up tabs, the requested email/password placeholders, optional Referral ID, independent unchecked-by-default newsletter preference, required policy acknowledgement, and the down-chevron **Or** expander. It no longer displays the one-time recovery-code registration flow.
- `account-prototype.css` uses a compact, clean light form inside the existing AstroCrown development theme.
- `server.py` uses email as the prototype account identifier, stores referral and consent metadata locally, retains salted PBKDF2 password hashes and loopback-only session controls, and explicitly returns a non-success status for password-reset email because no email delivery is configured.
- `tests/test_account_server.py`, `tests/browser_smoke.mjs`, and the prototype workflow were updated to check email registration/sign-in, consent separation, Terms acceptance, missing email delivery, no wallet requirement, and browser-preview non-persistence.
- Two development-only Terms/Privacy pages are linked. Both clearly identify themselves as unapproved drafts; the account prototype records terms-version acknowledgement only for test verification.
- README and previous account-flow records now distinguish the historical username/recovery-code prototype evidence from this new flow.

**Current verification result at code revision `a1b0ecbd1a2efcb4676360547363074c533cf13a`: automated implementation criteria PASS; owner visual confirmation of the HTML Preview remains outstanding.** The current-head account workflow completed syntax validation, all 11 loopback API tests, static UX/security guards, and the headless-Chrome local/browser-preview journeys. The browser test confirmed email sign-up/login, opt-in/terms/referral metadata handling, no email sent for forgotten password, no account API fetch in browser-preview mode, and page-memory loss after reload. These results apply to the identified revision only; prototype CI does not establish production authentication/security.

## 10. Outstanding decisions / blockers

- Production email verification and password-reset delivery are not implemented; no provider is selected. Any provider must be qualified against $0/no-card, security, privacy, domain, and operational requirements before use.
- Newsletter opt-in is stored only as a test preference; no external list or email sender is contacted.
- Referral values are syntactically checked but not resolved against a referral programme or rewarded.
- Production Terms of Use / Privacy Policy require review and approval; the linked drafts are not production legal documents.
- Production account persistence, rate limiting beyond the single-process test limiter, transport/session hardening, account export/deletion, recovery, security review and AUTH-001 publishing verification remain BLOCKED.

## 11. Evidence / closure

**Implementation revision tested:** `a1b0ecbd1a2efcb4676360547363074c533cf13a`  
**Pull request:** [#141 — Prototype familiar email account entry; retain optional wallet lab](https://github.com/ACROWN-System/AstroCrown-Web/pull/141) — OPEN / DRAFT / NOT MERGED.

Current-head GitHub Actions evidence:
- [Local Account Continuity Prototype Tests #41 — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/39649436502): syntax validation, **11/11 Python tests passed**, static UX/security guards, and headless Chrome passed both the localhost-backed flow and the browser-only preview flow. The browser log ended with: `PASS: email signup/login, referral and consent handling, reset-email disclosure, local backend guardrails, and memory-only browser preview.`
- [Local Wallet Authentication Prototype Tests #69 — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/39649436563): separate wallet-lab regression suite.
- [NOVA RSI Engine CI #721 — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/39649436390).
- [External Review Pipeline CI #282 — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/39649436671).
- [NOVA RSI CodeQL Security Analysis #292 — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/39649436413).

**Re-test result:** the automated test suite covers email normalization/sign-in, duplicate email, password validation, independent opt-in timestamp, optional referral identifier and invalid referral rejection, Terms acceptance/version, rate/origin/host/body controls, no false email reset success, no one-time recovery-code sign-up contract, no wallet prompt, no account API calls in browser-preview mode, and reload clearing the preview account.

**Remaining finding/limitation:** automated browser checks exercise local HTML and a simulated browser-preview adapter; they do not confirm the owner’s rendering in the external HTML-preview website. Owner visual confirmation of form fit, arrowhead, and links remains open. The flow must only be tested with invented values.

**Production closure: BLOCKED.** Email verification, email password-reset delivery, newsletter operations/unsubscribe, approved legal text, production hosting/database, hardened production authentication/recovery, security/privacy/legal review, and AUTH-001 publishing verification are not implemented. No claim of production readiness or protection of real assets is made.

## 12. Visual hierarchy refinement — 2026-10-22

### Owner decision

The owner asked to improve the visual UI before proceeding with production authentication work:

1. Place **Log In / Sign Up** as the first row in the account-content area.
2. Reserve a centered row of circular slots for future external-account logos that might support optional sign-in/sign-up if a provider is later selected and qualified.
3. Do not make those future-provider slots functional, and do not add fake provider buttons.
4. Make **Or** a static, non-clickable separator with a downward arrowhead directly underneath.
5. Use a broken/dashed gold line on both sides of “Or” to distinguish the optional-provider area from the email/password form.
6. Use the deep-space navy, layered card surfaces, subtle borders, and gold accents already present on AstroCrown market cards—not a contrasting white dialog theme.

### Implementation action

- `account-ui.js`: moved the tabs to the first row; made the environment disclosure part of the rendered flow; added three non-interactive circular logo placeholders; replaced the old “Or” toggle/button with a plain static divider; removed its click handler.
- `account-prototype.css`: switched the dialog and fields to AstroCrown's dark card palette; styled gold-active tabs, reserved circular provider-logo slots, dashed/repeating gold separator, and downward arrow. The divider uses `pointer-events:none` and has no button/link descendants.
- `index.html`: removed static introduction/disclosure from ahead of the tabs so the active mode is the first account-content row.
- `tests/browser_smoke.mjs` and the workflow's static guards: assert the tabs are first, three provider slots are present but are not controls, “Or” is a non-interactive `DIV`, the divider uses a broken line, and the arrow sits below the label.

### Acceptance status

| ID | Criterion | Evidence | State |
|---|---|---|---|
| ACC-UI-VIS-001 | Log In / Sign Up is the first row inside account content | Headless-browser DOM-order assertion | PASS |
| ACC-UI-VIS-002 | Three circular future-provider slots are reserved but not interactive | DOM assertion and static source check | PASS |
| ACC-UI-VIS-003 | “Or” is static, has no click handler, and shows a broken gold line with arrow beneath it | DOM assertions + CSS guard + browser computed style | PASS |
| ACC-UI-VIS-004 | Account dialog uses the AstroCrown dark card palette and gold highlights | CSS source contract passes; owner visual inspection in HTML Preview remains open | BLOCKED — owner confirmation pending |
| ACC-UI-VIS-005 | Email sign-up/login, consent/referral behavior and prototype warnings remain intact | 11 Python tests + end-to-end headless Chrome journey | PASS |

### Exact-snapshot re-test evidence — 2026-10-22

Automated checks completed successfully on source snapshot `9873353d2e814709b3473fb1829935ff8d4eb81f`:

- [Local Account Continuity Prototype Tests #51 — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/39657201903): Python/JavaScript syntax, 11/11 API tests, static UI/security checks, and headless Chrome for the localhost-backed and memory-only preview flows. The updated browser assertions verify tabs-first order, three non-interactive circular slots, a static non-clickable Or divider, a broken gold line and arrow placement underneath.
- [Local Wallet Authentication Prototype Tests #79 — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/39657201838).
- [NOVA RSI Engine CI #731 — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/39657202173).
- [External Review Pipeline CI #292 — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/39657201927).
- [NOVA RSI CodeQL Security Analysis #302 — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/39657202527).

The pinned HTML-preview revision `42864fd11adfacee86dec996dca3bd7d5887395f` was compared with the tested source snapshot. The homepage, account JavaScript, account CSS, Terms draft and Privacy draft have identical file blob SHAs in both revisions. README/audit-only commits do not alter the previewed UI assets.

**Owner visual confirmation remains BLOCKED.** The test suite verifies DOM order, non-interactivity and key computed styling, but does not replace the owner's own visual inspection in the external HTML Preview.

### Impact analysis

**If implemented:** the dialog gains a clearer hierarchy—mode selection first, future optional-provider area second, and a visually distinct email/password path below. Static placeholders make future provider support visible without suggesting that unconfigured authentication methods work.

**If not implemented:** the existing clickable “Or” behavior distracts from its role as a separator, the empty expansion panel adds confusing interaction, and the white dialog does not align with AstroCrown’s card-based visual system.

**Boundaries:** external providers remain unselected and unavailable; no logo slots should become clickable until a real integration has passed provider, cost, privacy, domain, and security qualification. This remains a development-only interface.

## 13. Owner-directed account heading and divider refinement — 2026-10-22

### Owner corrections

The owner identified three remaining visual issues:

1. Remove the redundant `ASTROCROWN · ACCOUNT ACCESS` kicker because the dialog title already says “AstroCrown account”.
2. Shape the broken gold lines so they taper at their outer ends, while retaining exactly two side-line elements: one left and one right of the separator.
3. Keep the “Or” label precisely centered in the divider row, with the arrowhead horizontally aligned beneath the label.

### Implementation

- `development/index.html`: removed the redundant kicker while preserving the dialog title and accessible `aria-labelledby` relationship.
- `development/account-continuity/prototype/account-prototype.css`: changed the divider row to a three-column grid (`1fr / auto / 1fr)) so unequal text or icon sizing cannot shift the center label; retained two and only two line elements; applied a gradient mask to taper their dashed gold appearance at both ends; retained a non-interactive divider and centered downward arrow.
- `development/account-continuity/prototype/tests/browser_smoke.mjs`: added checks for absence of the kicker, exactly two line elements, horizontal center alignment, arrow-to-label alignment, and taper styling in the browser.
- `.github/workflows/account-continuity-prototype-tests.yml`: strengthened static guards for the removed kicker, explicit three-column centering, and gradient taper.

### Acceptance status

| ID | Criterion | Evidence | State |
|---|---|---|---|
| ACC-UI-VIS-006 | The redundant account-access kicker is absent; “AstroCrown account” remains the sole dialog heading | Static source assertion and browser DOM assertion | PASS |
| ACC-UI-VIS-007 | Exactly two dashed line elements flank a precisely centered “Or” label, with the line pattern tapering at both outer ends | Browser DOM geometry assertions and computed-style assertion | PASS |
| ACC-UI-VIS-008 | The downward arrowhead is horizontally centered under the “Or” label | Browser bounding-box assertion | PASS |
| ACC-UI-VIS-009 | The divider remains a static, non-clickable separator and existing account security boundaries remain intact | Existing static guards and end-to-end browser tests | PASS |

The HTML Preview revision for this correction is pinned to `877ad2d3b2e4fd653b6f51b9248426f4ae4658a5`. It contains the updated homepage and divider styling; later audit/README-only commits do not change those previewed UI assets.

### CI evidence for the owner corrections

The account UI acceptance assertions passed on tested branch snapshot `47d875cd3271366eebe96209cbf85442f13a19aa`. The browser test verifies that the redundant kicker is absent, the dialog title remains, exactly two divider lines flank the “Or” label, the label is centered, the arrowhead aligns below it, and the line mask tapers the broken gold segments.

- [Local Account Continuity Prototype Tests #57 — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/39663622773): 11 Python tests plus headless-browser flows for local sign-up/login and the memory-only browser preview.
- [Local Wallet Authentication Prototype Tests #85 — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/39663622758): 17 Python tests plus the headless-browser wallet prototype journey.
- [NOVA RSI Engine CI #737 — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/39663622731): 131 tests.
- [External Review Pipeline CI #298 — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/39663622766): 11 tests.

**Owner visual confirmation remains open.** CI is required to verify the DOM assertions and existing account journeys; the owner’s visual inspection still determines whether the line taper and center spacing match the intended appearance.
