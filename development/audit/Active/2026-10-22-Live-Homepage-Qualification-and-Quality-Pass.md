# Active Navigation Plan — Live Homepage Qualification and Quality Pass

**Date:** 2026-10-22  
**Status:** ACTIVE — PR #150 merged as `632d2898e73ae8910bb425ceeb652c66277fa3ae`; all five pre-merge checks passed and its exact-head browser report is 77/77. SVG alpha, resource budgets, scroll fade, and desktop/full-page/mobile screenshots were verified. However, no post-merge Actions run has appeared for the new main SHA and the public Pages URL fetch is tool-blocked, so the new artwork's live publication is not yet independently confirmed. Current development scope remains the homepage and capacity readiness only.  
**Objective:** Evolve the AstroCrown homepage prototype into a polished and operable website through persistent, evidence-led refinement while preserving the $0/no-card preference, truthfulness about capabilities, and separation from production.

## Source of truth and exact baseline

- **Repository:** https://github.com/ACROWN-System/AstroCrown-Web
- **Main baseline after PR #147 merged:** `8f51ff4b7c03684e27b0add89327b4f39a57948c`
- **Current preview route:** https://acrown-system.github.io/AstroCrown-Web/preview/
- **Current preview source:** `preview/index.html` (blob SHA `878015793ec2551f208b25d8373c0143e92df5ee`)
- **Account demo JavaScript:** `preview/account-ui.js` (blob SHA `c2c1775014d54949bdf1b6efb986f9145dcbe3b6`)
- **Account demo CSS:** `preview/account-prototype.css` (blob SHA `ffbd85057fc358c84331c2cf6ec47ef45bd3c67c`)
- **Repeatable browser suite:** `development/audit/tests/homepage_browser_smoke.py` (source/initial-resource budgets and rendered header/bar/hero metrics; latest main blob `ac988229b088d8c4642d641f8893e55b5b162c74`).
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
- The header candidate has been refined and tested: `#102947` is the selected Space Blue; Chromium measures a 60 px desktop header, a 50×50 px mark, and 4.5 / 5.5 px top/bottom clearance. The tested exact head recorded 63 PASS / 0 FAIL / 0 BLOCKED. The inline SVG mark's final approved asset/version remains unresolved.
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

1. **Header (R-005/R-019 and Colors reference):** `#102947` is now selected for the header after six candidate calculations, rendered comparison and exact-head CI tests. Its nav-text contrast was measured at 11.57:1 and Gold at 10.47:1. Other surfaces, full contrast coverage, actual logo asset selection and complete assistive-technology review remain open.
2. **Header geometry:** current tested target is approximately 60 px header and 50 px logo, with 4.5 / 5.5 px top/bottom clearance at 1440 px. Header heights were measured at 1440, 1280, 1024, 768, 390 and 320 px; no document-level horizontal overflow was present, though complete responsive interaction testing remains open.
3. **Information bar (R-020):** tested preview candidate now measures 45 px from header to bar, 53 px total height, 2 px yellow outer border/divider, and 78% width at 1440 px. Screenshot review found the border more legible without crowding text. The 5 px legacy suggestion remains rejected for this candidate because it would be disproportionate to the bar height.
4. **Hero cards (R-021):** tested preview candidate uses 88% of the content width capped at 1,320 px. At the 1440 px desktop, the wider cards reduce the right-side empty space and better align with the market context/table hierarchy. Six viewport checks show no document-level overflow.
5. **Background (R-014–R-018/R-036):** the spec describes distinct deep-space, dimmed-object, planetary, rocky-planet, spiral-nebula and alpha-preserving foreground layers as requirements/candidates. The current page mainly uses CSS gradients. Inspect source status and intended asset compositing before choosing CSS, transparent artwork, static imagery, or motion. Keep any image/video generator commercial-use and $0 qualification separate from design exploration.
6. **Directory/scroll:** preserve native page scrolling and the specified scroll-handoff intent; verify implementation against R-012/R-013 before altering nested scroll behavior. Do not add a library to solve a behavior already achievable by simpler means.
7. **Data integrity:** sentiment, winners/losers, influence weights and market table numbers are illustrative. Do not call a single numeric aggregation “consensus” without documented provider-scale normalization, timestamps, disagreement/missing-source behavior and a tested method. Do not imply influence bars establish causation. Actual data-provider integration remains out of scope until separate rights, access, reliability, $0/no-card and provenance gates pass.

## Continuation plan — next concrete work

1. Revalidate current main, open PRs and latest workflow/deployment state before each implementation. The latest verified main base for PR #148 is `8f51ff4b7c03684e27b0add89327b4f39a57948c`; PR #148 remains isolated from the root publishing configuration.
2. PR #147 merged the static performance/resource budgets and provider-independent capacity transition plan. Its exact-head 69-check suite and post-merge Pages deployment/browser suite passed; evidence is recorded below.
3. **Current task:** verify the documented final PR #148 head reruns the 73-check homepage smoke with rendered geometry assertions and inspect its screenshots/report. If unchanged and successful, merge PR #148 as a preview-only change; immediately verify the Pages deployment and post-merge main browser artifact.
4. After PR #148 is accepted, evaluate the required deep-space/planet/nebula/alpha background layers (R-014–R-018/R-036) as a separate, size-budgeted visual asset experiment. Keep first-render independence and asset license/commercial-use provenance as hard gates.
5. Keep user account creation, admin authorization, wallet enrolment, live data, AI/SI calls and GPU services outside this work block. These should remain independent, optional service boundaries rather than dependencies of homepage rendering.
6. GitHub Pages remains a development-preview host; before a commercial launch, qualify a commercial host, no-card signup, crypto payment/top-up/renewal, cache and security headers, real-origin telemetry and concurrent-load/soak behavior. Maintain the 40/50/60/70% capacity warning/migration/protection thresholds in the scale-readiness plan, and do not treat loopback test timing as production evidence.

## Session/resume log

- **2026-10-22:** Verified current main `b3bad481cb20b69f9d0a05878e83e66168f54e80`, PR #144 merged, PR #145 merged, PR #143 closed/superseded, and `development/` / `backup/` remain excluded from Pages publishing.
- **2026-10-22:** Main preview source remained `preview/index.html` blob SHA `62c107354dfa501dc4c29222dce88410528c5593` before the current isolated design candidate.
- **2026-10-22:** PR #146 rendered candidate `#102947` on the exact preview source and passed 63 browser checks on head `ed59db8db95d7ff256ee0afa1e2db3a7bb4c4c84`: opaque surface, 60 px header, 50×50 px mark, clearances, text/Gold contrast, all existing interactions, and no horizontal overflow at six widths. Screenshot/report artifact from run `39786404575` was inspected. Later documentation commits changed the PR head, so this historical pass cannot substitute for the newest exact-head run.
- **2026-10-22:** Selected Space Blue and updated `development/index-section/HEADER.md` plus the Colors/Layout/Sizing/Visual Design reference records. The active logo asset/version and full accessibility review remain open. The candidate is not deployed until PR #146 is merged and Pages finishes deployment.
- **Unresolved:** User has not yet inspected a post-change live route, and actual deployed-origin header/cache behavior remains unverified. Do not ask the user to do repeated micro-checks while the CI artifact can answer the current question.

## Impact Analysis

**IF modified:** The homepage improves incrementally with exact test evidence, preserving the prototype's boundary and making every design change reversible and attributable.

**IF not modified:** Later work could repeat blocked routes, forget the already-proven test harness, accidentally promote placeholder market values into real claims, or change colors/dimensions without a traceable candidate decision.

## Verification and handoff

- Keep this plan under `development/audit/Active/` until the qualification scope is complete.
- Keep `development/` and `backup/` excluded from the public Pages artifact; never overwrite/delete dated backups.
- For each work block, record exact base/head SHA, changed paths, checks, result report/artifact, remaining alternatives, blockers, and one clear next action.
- Never equate test-source inspection, test workflow success, deployment success, or local rendered output with a different evidence class.


## Historical paused-session handoff — 2026-10-22, 18:31 IST (superseded by the later resumption entry below)

**The user explicitly asked to stop ongoing work and preserve a resume point. No further design work should be performed until resuming. PR #146 has not been merged; the live preview has not been updated by this candidate.**

### Verified at the interruption

- Current \`main\`: \`b3bad481cb20b69f9d0a05878e83e66168f54e80\` — \`Add persistent homepage investigation controls\`.
- PR #144 browser-test foundation is merged. Its earlier inspected run passed 60 checks.
- PR #145 persistent-investigation rules/checkpoint is merged. PR #143 is closed/superseded; no stale branch merge is pending.
- PR #146 remains OPEN and UNMERGED: https://github.com/ACROWN-System/AstroCrown-Web/pull/146
- PR #146 head at the interruption: \`0897bc876d69e230c123dfa1293b1446d485cd6a\`.
- Exact-head checks at that SHA all report success:
  - External Review Pipeline CI: run \`39787234387\`.
  - NOVA RSI Engine CI: run \`39787234459\`.
  - NOVA RSI CodeQL Security Analysis: run \`39787234161\`.
  - Homepage Browser Smoke: run \`39787234011\`, success.
- The exact-head browser artifact has been listed and remains available: artifact ID \`12429262961\`, name \`homepage-browser-smoke-39787234011\`. **It has not yet been downloaded/inspected**; this is the first pending action after resumption.
- A prior exact code/test-equivalent run, \`39786404575\`, was inspected and reported 63 PASS / 0 FAIL / 0 BLOCKED, including a 60 px header, 50×50 px logo mark, 4.5/5.5 px clearances and 11.57:1 navigation / 10.47:1 Gold contrast. Do not substitute that older report for inspection of artifact \`12429262961\`.

### Candidate under review

PR #146 branch: \`design/header-space-blue-candidate-review-2026-10-22\`.

Preview source at the latest verified head:
- \`preview/index.html\`: \`878015793ec2551f208b25d8373c0143e92df5ee\`.
- \`development/audit/tests/homepage_browser_smoke.py\`: \`ebc109899078cd2ffa97e5c510340e520cca9219\`.
- \`.github/workflows/homepage-browser-smoke.yml\`: \`cbc9bf8e8b5a738016977fd5bdbe1b54f734b88d\`.

The latest PR head also includes documentation updates recording selected Space Blue \`#102947\`, measured header geometry, and shared reference synchronization. No source changes were made after the last successful code/test-equivalent run apart from audit/reference documentation, but the newest report still must be inspected.

### First actions on resumption

1. Re-fetch \`main\`, PR #146's current head and state, latest Actions run list, and current Pages deployment state. Re-check because state may have advanced since pause.
2. Download and inspect artifact \`12429262961\` from run \`39787234011\`. Read the actual JSON test report and inspect desktop, full-page and mobile screenshots. Confirm exact test count and the header metric assertions.
3. Review the full PR #146 file diff, especially that changes remain limited to \`preview/index.html\` and development/audit documentation/test assertions; ensure no root homepage, publishing boundary, secret, or backup was modified.
4. If any newest test fails or the screenshot reveals a material defect, fix the isolated PR branch and re-test. If it passes, make an evidence-backed decision on merging the preview change; merging it will trigger a Pages deployment of the isolated \`/preview/\` route, not promote it to the root homepage.
5. After merge, verify the exact Pages deployment and preview route artifact. Keep real-origin browser/header/cache checks distinct from CI's loopback browser evidence.
6. Next design work after this header: reconcile the information-bar gap/border and hero-row width, then investigate layered background/transparent-assets alternatives. Keep logo asset approval, full accessibility, live market data, authentication, wallet connection and production readiness as separate unresolved scopes.

### Stop boundary

There is no active tool job known to be modifying the repository at this pause. Do not merge PR #146, change main, or launch additional iterations during handoff. Continue only after the user resumes the work.

## Latest resumption and deployment verification — 2026-10-22

The user resumed work and narrowed the current block to the public homepage only. Account creation, administrator authentication, wallet enrolment and the announcement editor are deferred. The objective is to improve the live test homepage while measuring page cost and designing a safe, provider-independent path to commercial hosting before quota pressure affects visitors.

- PR #146 merged via squash as a08220b66830b467a6be7fc93c403d5c84be02f2.
- Exact post-merge main preview browser run 39807222430 passed 63/63; artifact 12437958064 was downloaded. Its report states zero JavaScript exceptions, zero console errors and zero blocked non-loopback requests.
- Pages build/deployment run 39807222283 succeeded for the merged candidate. This establishes deployment of the current Pages source, not permission for commercial use or production readiness.
- OpenSSF Scorecard run 39807222453 failed because GitHub's GraphQL ListCommits query returned an internal error. The current attempt produced no project-specific Scorecard finding; do not count it as a passed assessment.
- Main baseline for this capacity work: a08220b66830b467a6be7fc93c403d5c84be02f2.
- The working branch for the next reviewable block is quality/homepage-capacity-readiness-2026-10-22.
- CI source-size measurement in run 39808627276: HTML 89,827 bytes; critical CSS+JS 33,885 bytes; total 123,712 bytes. The browser report passed 69/69 checks; decoded resource bytes were 123,712, initial transfer bytes were 124,612, resource entries were 2, and external HTTP(S) resources were zero. These were measured in loopback CI, not on the live origin.
- PR #147 initial test commit 19ec4e537940cbe3edc2fb3cfa1680943e658bb1 passed Homepage Browser Smoke, NOVA RSI CI, External Review Pipeline CI, and CodeQL; artifact 12437554803 was inspected. Documentation/test-suite reconciliation is being committed separately, so repeat the affected checks against that new head.
- Important policy discovery: GitHub Pages' official current guidance restricts free Pages hosting for an online business/commercial transactions/commercial SaaS. Keep Pages as an explicitly labelled development preview and qualify a distinct host before commercial launch.
- No account backend, admin authorization, production-root switch, live data source, paid plan, provider secret or payment rail was changed.
- PR #147 merged as `8f51ff4b7c03684e27b0add89327b4f39a57948c`; its exact-head smoke run `39809210762` passed 69/69 and artifact `12438498416` was inspected. Post-merge main smoke run `39809469612`, Pages deployment `39809468231`, and OpenSSF Scorecard `39809469429` completed successfully. These are test/deployment results, not evidence of production-origin latency or concurrent-load capacity.
- PR #148 code/test head `0b7d8b6ef17a44d607d006639b5166362cc60f10` passed Homepage Browser Smoke run `39812122166` (73/73). Artifact `12439334381` was downloaded and its JSON and desktop/full-page/390 px mobile screenshots were inspected. The report records a 45 px header-to-information gap, 53 px bar, 2 px borders, 78% bar width, 88% hero width, 123,677 decoded initial bytes, three resource entries including the no-content favicon, no external HTTP(S) requests, and no page/console errors.
- The earlier run `39810200236` was cancelled after remaining stuck in Chromium/system-dependency installation. The replacement workflow prefers the installed runner Chrome and retains the Playwright-managed fallback; the actual replacement browser-test step passed. PR #148's doc-only evidence update will need one fresh exact-head run before merge.
- PR #148 does not change root Pages source or publishing configuration. Real-origin performance/load tests remain for after a commercial candidate host has been qualified.

## Latest homepage status and durable resume point — 2026-10-22

- PR #149 merged as `f14bb4451d40db56ae454bcc3ef88e50f826b600`, refining the desktop information-bar gap (45 px), warning outline/divider (2 px), and hero-card width (88% capped at 1,320 px). Its exact-head and post-merge main browser suites both passed 73/73; artifact `12441221932` was inspected.
- PR #150 merged as `632d2898e73ae8910bb425ceeb652c66277fa3ae`, adding three authored transparent SVG background layers and workspace fade/reduced-motion behavior. All five pre-merge checks completed successfully on head `5ac802b96ea7cbeda8953c0076be34d325d1726a`. Browser run `39815672410` and artifact `12441024381` report **77 PASS, 0 FAIL, 0 BLOCKED**. Desktop, full-page and 390 px mobile screenshots were inspected.
- Exact browser metrics: Earth–Moon SVG 5,733 bytes; rocky planet 3,131 bytes; spiral nebula 3,423 bytes; total 12,287 bytes against a 24 KiB asset budget. Homepage HTML 93,354 bytes; critical CSS/JS 33,885 bytes; combined critical source 127,239 bytes. Initial decoded resources 139,526 bytes; estimated transfer bytes 141,326; six resource entries against a limit of eight; zero external HTTP(S) requests; no JavaScript exceptions or console errors. Chrome 155.0.8059.39 was used.
- Visual assessment: background art remains behind the introductory content without obscuring cards or text, and fades when the market directory becomes the primary reading area. At 390 px, the art stays decorative; prior six-viewport responsive checks remain clean.
- Current main SHA: `632d2898e73ae8910bb425ceeb652c66277fa3ae`.
- **Deployment uncertainty:** after PR #150 merged, a fresh Pages build/deployment and post-merge main browser workflow have not appeared in the available Actions API for SHA `632d2898e73ae8910bb425ceeb652c66277fa3ae`. The last successful Pages deployment is run `39814162227` for previous main SHA `f14bb4451d40db56ae454bcc3ef88e50f826b600`. Direct web inspection of `https://acrown-system.github.io/AstroCrown-Web/preview/` returned `DisabledError` from the inspection tool. Therefore **do not state that the new SVG artwork is live yet**. First establish deployment status or a controlled re-trigger, then verify the exact-main browser artifact/deployed origin.
- The site root and Pages publishing configuration have not been changed by PRs #149 or #150. They only affect `/preview/` source and its tests/docs.
- The scale-readiness plan from PR #147 remains on main: static-first public shell, budgets and telemetry, quota headroom triggers at 40/50/60/70%, cleared-net-revenue reserve before recurring paid costs, independent AI/SI/GPU workloads, and staged migration/rollback. GitHub Pages remains a development preview, not the approved commercial host; no-card signup, crypto payment/renewal, real-origin traffic/load capacity and stable revenue remain unqualified.
- OpenSSF Scorecard run `39814161549` on prior main SHA `f14bb4451d40db56ae454bcc3ef88e50f826b600` failed at GitHub GraphQL `ListCommits` with an internal error. It is a platform/tool failure, not a project-specific finding.
- Next work, in order: (1) re-establish the Pages deployment trigger/current status for main SHA `632d2898e73ae8910bb425ceeb652c66277fa3ae`; (2) inspect post-merge browser artifact/live preview if available; (3) continue the homepage-only visual pass while preserving the 160 KiB initial-resource cap; (4) qualify a commercial host before any public commercial deployment. Do not add account/admin implementations or live AI/GPU/data calls in this block.
