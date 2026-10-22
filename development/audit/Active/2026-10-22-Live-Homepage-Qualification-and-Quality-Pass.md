# Active Navigation Plan — Live Homepage Qualification and Quality Pass

**Date:** 2026-10-22  
**Status:** ACTIVE — persistent-investigation continuity is merged; the repeatable browser suite is merged; the header candidate is being evaluated on an isolated design branch.  
**Objective:** Evolve the AstroCrown homepage prototype into a polished and operable website through persistent, evidence-led refinement while preserving the $0/no-card preference, truthfulness about capabilities, and separation from production.

## Source of truth and exact baseline

- **Repository:** https://github.com/ACROWN-System/AstroCrown-Web
- **Main baseline after PR #145 merged:** `b3bad481cb20b69f9d0a05878e83e66168f54e80`
- **Current preview route:** https://acrown-system.github.io/AstroCrown-Web/preview/
- **Current preview source:** `preview/index.html` (blob SHA `62c107354dfa501dc4c29222dce88410528c5593`)
- **Account demo JavaScript:** `preview/account-ui.js` (blob SHA `c2c1775014d54949bdf1b6efb986f9145dcbe3b6`)
- **Account demo CSS:** `preview/account-prototype.css` (blob SHA `ffbd85057fc358c84331c2cf6ec47ef45bd3c67c`)
- **Repeatable browser suite:** `development/audit/tests/homepage_browser_smoke.py`
- **Browser workflow:** `.github/workflows/homepage-browser-smoke.yml`
- **PR #144:** merged as `be8dbea754924a439346f5dcde595b8f443da555`; final exact-head browser run [39770755613](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/39770755613).
- **PR #145:** merged as `b3bad481cb20b69f9d0a05878e83e66168f54e80`, carrying the persistence protocol and active work checkpoint onto current main.
- **PR #143:** closed as superseded; do not merge its stale branch.

The homepage assets were not changed by PR #144. It adds the test-only workflow and browser test suite. The production/public-root route and Pages publishing boundary remain separate.

## Preview safety boundary

The route is publicly accessible and has `noindex` metadata; no-index is not access control. The ribbon warns that data is illustrative, the account is browser-only, and real credentials must not be entered. Never use a real password, wallet seed phrase, private key, production credential, or unnecessary personal information in this preview. The account prototype does not establish production authentication, email verification/reset, newsletter delivery, persistent account storage, wallet connection, or a backend service. Do not convert a prototype pass into a production-ready claim.

## User observation and actual rendered evidence

The user opened the published route and reported that the page communicates its intended elements, feature placement and purpose, while color, size and styling remain visibly in development.

The exact Pages artifact from successful deployment run `39760680495` (artifact `12417792313`) was retrieved and rendered offline in Chromium. The local image is not the same as opening the live origin, but it is direct rendered evidence from the deployed artifact. The resulting full-page capture and desktop viewport were also inspected.

**Desktop observations (1440 px):**
- The top-to-bottom structure is present: warning ribbon, sticky header, discovery information bar, three hero cards, market context bar, directory/filter/pagination, ecosystem discovery cards, prototype warning and footer.
- The layout is readable and has a coherent deep-space/gold identity, but it remains a visual prototype: simple CSS gradients stand in for the specified layered space environment; some small labels are dense; current dimensions have not completed design approval.
- The header's mark is 40 px, while the active header requirement specifies a target of approximately 51 px in an approximately 59 px header. The current header is specified in CSS with a 62 px minimum and has a near-Deep-Space-Blue surface instead of a separate approved Space Blue.
- The information bar begins approximately 39 px below the header, versus the approximately 45 px target; its 53 px minimum height aligns with the requirement. The current 1 px border/divider is visually lighter than the old source's approximately 5 px specification. That specification is explicitly open to refinement after usability/accessibility evaluation, not an instruction to blindly implement a 5 px border.
- The hero-card row occupies a smaller proportion of the content width than the market-data bar and directory. This is consistent with the general information architecture but remains subject to visual hierarchy evaluation; no centering or percentage rule should be changed solely for symmetry.
- The mobile-smoke screenshot at 390×844 shows the top nav compressing to a “More” row and the search below; cards then stack vertically. There was no document-level horizontal overflow in the tested widths. The project remains desktop-first, so this is evidence for later mobile refinement, not a reason to derail the current desktop pass.

## Browser-route investigation and distinction between evidence types

In the assistant's own execution environment, direct Chromium navigation to the deployed HTTPS page, a local loopback HTTP server, and the extracted artefact's file URL were each blocked by `net::ERR_BLOCKED_BY_ADMINISTRATOR`; page-reader/raw-page attempts returned `DisabledError` or a prior DNS failure. These observations establish restrictions on those inspection paths, not that the published page is down. No restriction was bypassed.

A valid alternative succeeded on a GitHub-hosted runner, without relying on the user's browser: serve checked-out source on loopback, force `?account-preview-demo=1`, and abort every non-loopback request. This is now a repeatable repository test. It does not establish live-origin headers/cache or the state of production services.

### Final verified browser-test result on exact PR #144 head

**60 PASS · 0 FAIL · 0 BLOCKED.** Report/artifact: `homepage-browser-smoke-39770755613`, artifact ID `12422875139` (retention 7 days).

Verified paths include:
- page title, no-index metadata and visible preview safety warning;
- local stylesheet and account-script loading; unique DOM IDs;
- 24 illustrative assets with 12 rows per page;
- all six categories (All, AI, Gaming, Meme, RWA, DePIN, Stable), all five sort modes, both pagination pages and disabled boundary control;
- query threshold, matching suggestions, keyboard ArrowDown/Enter selection, no-match guidance;
- menu expanded state, mutual exclusion, click-away and Escape;
- favorite state, sample asset dialog and ecosystem concept dialog;
- disposable account demo notice, required field and minimum password validation, newsletter opt-in default off;
- synthetic `.invalid` account creation, sign-in, sign-out and erased state after reload in the runner's secure loopback context;
- password reset explicitly says no email is sent;
- no horizontal page overflow at widths 1440, 1280, 1024, 768, 390 and 320 px;
- screenshot begins at scrollY=0; no JavaScript exceptions, browser console errors, or non-loopback HTTP(S) requests.

Earlier offline `about:blank` testing correctly reported account creation as BLOCKED because that opaque origin exposed no Web Crypto. The loopback hosted-runner test resolved this context limitation, so the prior BLOCKED result is preserved as historical evidence rather than treated as an ongoing blocker for the disposable browser demo. It is **not** evidence of real-user authentication or live-origin headers.

Other exact-head checks for PR #144 all passed: External Review Pipeline CI, NOVA RSI Engine CI, and NOVA RSI CodeQL Security Analysis.

## Active requirements and discrepancies

The active section sources are under `development/index-section/`; shared conventions live under `development/index-reference/`. Extracted cross-section references are navigation aids, not separate approval authorities. Candidate/TBD items remain candidates.

1. **Header (R-005/R-019 and Colors reference):** palette requires a distinct intermediate AstroCrown Space Blue between Deep Space Blue `#081426` and Light Space Blue `#16345A`; the value has explicitly remained TBD pending hierarchy and contrast evaluation. Do not assign a HEX value from preference or arithmetic alone. Compare several candidates against adjacent palette colors, text/UI contrast, distinctness from card surfaces, and intended render states, then record the decision.
2. **Header geometry:** existing spec targets approximately 59 px total height and a logo around 51 px, with roughly 4 px top/bottom clearance; current CSS uses 62 px minimum height, 40 px SVG and 7 px vertical padding. Evaluate whether the target can be met with smaller padding and without clipping controls at supported desktop widths.
3. **Information bar (R-020):** target gap about 45 px and height about 53 px; current gap 39 px and height 53 px. Current border/divider are 1 px, while legacy detail says approximately 5 px. Evaluate hierarchy, content space, warning color semantics, readability, and responsive behavior before deciding thickness.
4. **Hero cards (R-021):** design dimensions from user-task and information density, not arbitrary percentages. The current row is about 82% of the main content; confirm the visual relationship with information bar and market workspace before changing it.
5. **Background (R-014–R-018/R-036):** the spec describes distinct deep-space, dimmed-object, planetary, rocky-planet, spiral-nebula and alpha-preserving foreground layers as requirements/candidates. The current page mainly uses CSS gradients. Inspect source status and intended asset compositing before choosing CSS, transparent artwork, static imagery, or motion. Keep any image/video generator commercial-use and $0 qualification separate from design exploration.
6. **Directory/scroll:** preserve native page scrolling and the specified scroll-handoff intent; verify implementation against R-012/R-013 before altering nested scroll behavior. Do not add a library to solve a behavior already achievable by simpler means.
7. **Data integrity:** sentiment, winners/losers, influence weights and market table numbers are illustrative. Do not call a single numeric aggregation “consensus” without documented provider-scale normalization, timestamps, disagreement/missing-source behavior and a tested method. Do not imply influence bars establish causation. Actual data-provider integration remains out of scope until separate rights, access, reliability, $0/no-card and provenance gates pass.

## Continuation plan — next concrete work

1. Revalidate current main, open PRs and latest workflow/deployment state before every new implementation. The latest verified main at this checkpoint refresh is `b3bad481cb20b69f9d0a05878e83e66168f54e80`.
2. PR #144's test foundation is merged; its final exact-head run [39770755613](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/39770755613) passed 60 checks. Inspect report/screenshot artifacts rather than relying on a green badge. Do not repeat the blocked navigation attempts as though they were new evidence.
3. PR #145 is merged; Section 19 is on main. PR #143 was superseded and remains closed.
4. **Current task:** review branch `design/header-space-blue-candidate-review-2026-10-22` and its candidate render/CI. The design record is `development/audit/Active/2026-10-22-Header-Space-Blue-Candidate-Evaluation.md`; candidate value is currently `#102947), and is not yet approved for the repository-wide palette.
5. If the header candidate passes the rendered screenshot, size, responsive, and interaction review, update the active palette/header records to distinguish prototype candidate from approved choice, and merge only after exact-head checks. If it does not pass, test another documented candidate.
6. After the header is settled, evaluate the information-bar gap/border and hero-row width. Then investigate background layers and transparent-asset options in a separate work unit.
7. Keep live HTTPS-origin headers/cache and production services distinct from loopback browser tests. The assistant execution environment's direct navigation is restricted; do not repeat blocked attempts unless the route or hypothesis changes.

## Session/resume log

- **2026-10-22:** Verified current main `b3bad481cb20b69f9d0a05878e83e66168f54e80`, PR #144 merged, PR #145 merged, PR #143 closed/superseded, and `development/` / `backup/` remain excluded from Pages publishing.
- **2026-10-22:** Main preview source remained `preview/index.html` blob SHA `62c107354dfa501dc4c29222dce88410528c5593` before the current isolated design candidate.
- **2026-10-22:** Began candidate evaluation using WCAG sRGB luminance/contrast calculations and a main-based branch. Preview candidate changes are not deployed. The next required evidence is the PR-hosted Chromium screenshot and exact-head browser report.
- **Unresolved:** User has not yet inspected a post-change live route, and actual deployed-origin header/cache behavior remains unverified. Do not ask the user to do repeated micro-checks while the CI artifact can answer the current question.

## Impact Analysis

**IF modified:** The homepage improves incrementally with exact test evidence, preserving the prototype's boundary and making every design change reversible and attributable.

**IF not modified:** Later work could repeat blocked routes, forget the already-proven test harness, accidentally promote placeholder market values into real claims, or change colors/dimensions without a traceable candidate decision.

## Verification and handoff

- Keep this plan under `development/audit/Active/` until the qualification scope is complete.
- Keep `development/` and `backup/` excluded from the public Pages artifact; never overwrite/delete dated backups.
- For each work block, record exact base/head SHA, changed paths, checks, result report/artifact, remaining alternatives, blockers, and one clear next action.
- Never equate test-source inspection, test workflow success, deployment success, or local rendered output with a different evidence class.
