# Active Navigation Plan — Live Homepage Qualification and Quality Pass

**Date:** 2026-10-22  
**Status:** ACTIVE — published preview reviewed; repeatable browser tests are now in main; visual/design findings are open.  
**Objective:** Evolve the AstroCrown homepage prototype into a polished and operable website through persistent, evidence-led refinement while preserving the $0/no-card preference, truthfulness about capabilities, and separation from production.

## Source of truth and exact baseline

- **Repository:** https://github.com/ACROWN-System/AstroCrown-Web
- **Main baseline after the browser-test merge:** \`be8dbea754924a439346f5dcde595b8f443da555\`
- **Current preview route:** https://acrown-system.github.io/AstroCrown-Web/preview/
- **Current preview source:** \`preview/index.html\` (blob SHA \`62c107354dfa501dc4c29222dce88410528c5593\`)
- **Account demo JavaScript:** \`preview/account-ui.js\` (blob SHA \`c2c1775014d54949bdf1b6efb986f9145dcbe3b6\`)
- **Account demo CSS:** \`preview/account-prototype.css\` (blob SHA \`ffbd85057fc358c84331c2cf6ec47ef45bd3c67c\`)
- **Repeatable browser suite:** \`development/audit/tests/homepage_browser_smoke.py\`
- **Browser workflow:** \`.github/workflows/homepage-browser-smoke.yml\`
- **PR #144:** merged as \`be8dbea754924a439346f5dcde595b8f443da555\`; final exact-head browser run [39770755613](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/39770755613).

The homepage assets were not changed by PR #144. It adds the test-only workflow and browser test suite. The production/public-root route and Pages publishing boundary remain separate.

## Preview safety boundary

The route is publicly accessible and has \`noindex\` metadata; no-index is not access control. The ribbon warns that data is illustrative, the account is browser-only, and real credentials must not be entered. Never use a real password, wallet seed phrase, private key, production credential, or unnecessary personal information in this preview. The account prototype does not establish production authentication, email verification/reset, newsletter delivery, persistent account storage, wallet connection, or a backend service. Do not convert a prototype pass into a production-ready claim.

## User observation and actual rendered evidence

The user opened the published route and reported that the page communicates its intended elements, feature placement and purpose, while color, size and styling remain visibly in development.

The exact Pages artifact from successful deployment run \`39760680495\` (artifact \`12417792313\`) was retrieved and rendered offline in Chromium. The local image is not the same as opening the live origin, but it is direct rendered evidence from the deployed artifact. The resulting full-page capture and desktop viewport were also inspected.

**Desktop observations (1440 px):**
- The top-to-bottom structure is present: warning ribbon, sticky header, discovery information bar, three hero cards, market context bar, directory/filter/pagination, ecosystem discovery cards, prototype warning and footer.
- The layout is readable and has a coherent deep-space/gold identity, but it remains a visual prototype: simple CSS gradients stand in for the specified layered space environment; some small labels are dense; current dimensions have not completed design approval.
- The header's mark is 40 px, while the active header requirement specifies a target of approximately 51 px in an approximately 59 px header. The current header is specified in CSS with a 62 px minimum and has a near-Deep-Space-Blue surface instead of a separate approved Space Blue.
- The information bar begins approximately 39 px below the header, versus the approximately 45 px target; its 53 px minimum height aligns with the requirement. The current 1 px border/divider is visually lighter than the old source's approximately 5 px specification. That specification is explicitly open to refinement after usability/accessibility evaluation, not an instruction to blindly implement a 5 px border.
- The hero-card row occupies a smaller proportion of the content width than the market-data bar and directory. This is consistent with the general information architecture but remains subject to visual hierarchy evaluation; no centering or percentage rule should be changed solely for symmetry.
- The mobile-smoke screenshot at 390×844 shows the top nav compressing to a “More” row and the search below; cards then stack vertically. There was no document-level horizontal overflow in the tested widths. The project remains desktop-first, so this is evidence for later mobile refinement, not a reason to derail the current desktop pass.

## Browser-route investigation and distinction between evidence types

In the assistant's own execution environment, direct Chromium navigation to the deployed HTTPS page, a local loopback HTTP server, and the extracted artefact's file URL were each blocked by \`net::ERR_BLOCKED_BY_ADMINISTRATOR\`; page-reader/raw-page attempts returned \`DisabledError\` or a prior DNS failure. These observations establish restrictions on those inspection paths, not that the published page is down. No restriction was bypassed.

A valid alternative succeeded on a GitHub-hosted runner, without relying on the user's browser: serve checked-out source on loopback, force \`?account-preview-demo=1\`, and abort every non-loopback request. This is now a repeatable repository test. It does not establish live-origin headers/cache or the state of production services.

### Final verified browser-test result on exact PR #144 head

**60 PASS · 0 FAIL · 0 BLOCKED.** Report/artifact: \`homepage-browser-smoke-39770755613\`, artifact ID \`12422875139\` (retention 7 days).

Verified paths include:
- page title, no-index metadata and visible preview safety warning;
- local stylesheet and account-script loading; unique DOM IDs;
- 24 illustrative assets with 12 rows per page;
- all six categories (All, AI, Gaming, Meme, RWA, DePIN, Stable), all five sort modes, both pagination pages and disabled boundary control;
- query threshold, matching suggestions, keyboard ArrowDown/Enter selection, no-match guidance;
- menu expanded state, mutual exclusion, click-away and Escape;
- favorite state, sample asset dialog and ecosystem concept dialog;
- disposable account demo notice, required field and minimum password validation, newsletter opt-in default off;
- synthetic \`.invalid\` account creation, sign-in, sign-out and erased state after reload in the runner's secure loopback context;
- password reset explicitly says no email is sent;
- no horizontal page overflow at widths 1440, 1280, 1024, 768, 390 and 320 px;
- screenshot begins at scrollY=0; no JavaScript exceptions, browser console errors, or non-loopback HTTP(S) requests.

Earlier offline \`about:blank\` testing correctly reported account creation as BLOCKED because that opaque origin exposed no Web Crypto. The loopback hosted-runner test resolved this context limitation, so the prior BLOCKED result is preserved as historical evidence rather than treated as an ongoing blocker for the disposable browser demo. It is **not** evidence of real-user authentication or live-origin headers.

Other exact-head checks for PR #144 all passed: External Review Pipeline CI, NOVA RSI Engine CI, and NOVA RSI CodeQL Security Analysis.

## Active requirements and discrepancies

The active section sources are under \`development/index-section/\`; shared conventions live under \`development/index-reference/\`. Extracted cross-section references are navigation aids, not separate approval authorities. Candidate/TBD items remain candidates.

1. **Header (R-005/R-019 and Colors reference):** palette requires a distinct intermediate AstroCrown Space Blue between Deep Space Blue \`#081426\` and Light Space Blue \`#16345A\`; the value has explicitly remained TBD pending hierarchy and contrast evaluation. Do not assign a HEX value from preference or arithmetic alone. Compare several candidates against adjacent palette colors, text/UI contrast, distinctness from card surfaces, and intended render states, then record the decision.
2. **Header geometry:** existing spec targets approximately 59 px total height and a logo around 51 px, with roughly 4 px top/bottom clearance; current CSS uses 62 px minimum height, 40 px SVG and 7 px vertical padding. Evaluate whether the target can be met with smaller padding and without clipping controls at supported desktop widths.
3. **Information bar (R-020):** target gap about 45 px and height about 53 px; current gap 39 px and height 53 px. Current border/divider are 1 px, while legacy detail says approximately 5 px. Evaluate hierarchy, content space, warning color semantics, readability, and responsive behavior before deciding thickness.
4. **Hero cards (R-021):** design dimensions from user-task and information density, not arbitrary percentages. The current row is about 82% of the main content; confirm the visual relationship with information bar and market workspace before changing it.
5. **Background (R-014–R-018/R-036):** the spec describes distinct deep-space, dimmed-object, planetary, rocky-planet, spiral-nebula and alpha-preserving foreground layers as requirements/candidates. The current page mainly uses CSS gradients. Inspect source status and intended asset compositing before choosing CSS, transparent artwork, static imagery, or motion. Keep any image/video generator commercial-use and $0 qualification separate from design exploration.
6. **Directory/scroll:** preserve native page scrolling and the specified scroll-handoff intent; verify implementation against R-012/R-013 before altering nested scroll behavior. Do not add a library to solve a behavior already achievable by simpler means.
7. **Data integrity:** sentiment, winners/losers, influence weights and market table numbers are illustrative. Do not call a single numeric aggregation “consensus” without documented provider-scale normalization, timestamps, disagreement/missing-source behavior and a tested method. Do not imply influence bars establish causation. Actual data-provider integration remains out of scope until separate rights, access, reliability, $0/no-card and provenance gates pass.

## Continuation plan — next concrete work

1. Revalidate latest main, open PRs and the latest Pages/test run before acting. Current verified main baseline at this record's creation is \`be8dbea754924a439346f5dcde595b8f443da555\`.
2. Reconcile the persistent-investigation protocol in Section 19 of \`development/DEVELOPMENT-AND-AUDIT-CONVENTION.md\` onto the current main baseline. The earlier PR #143 was opened from the pre-#144 main and became stale after #144 merged; do not force-merge it blindly. Open a new current-base PR with the convention and this active record, then re-run exact-head checks.
3. Use the repeatable browser test from main before and after each visual refinement; inspect the artifact report and screenshot, not just a green workflow.
4. Evaluate Space Blue candidates with reproducible contrast/luminance and rendered comparison. Record the chosen candidate and rationale before editing the live preview.
5. Apply a small header refinement first (if evidence supports it): separate approved intermediate surface color, approximately 59 px total header and approximately 51 px mark, with a compact vertical layout that does not break navigation/search/account/wallet controls. Test at desktop widths and retain the public-root boundary.
6. Only after reviewing the header result, calibrate the information bar and hero row; then research layered background alternatives and content assets. Do not combine unrelated redesign work into one change.
7. Actual deployed HTTPS-origin observation and response-header/cache verification remain unavailable in the assistant execution environment. Keep them distinct from hosted-runner/source tests and use user observation only when it adds evidence unavailable to the tools.

## Impact Analysis

**IF modified:** The homepage improves incrementally with exact test evidence, preserving the prototype's boundary and making every design change reversible and attributable.

**IF not modified:** Later work could repeat blocked routes, forget the already-proven test harness, accidentally promote placeholder market values into real claims, or change colors/dimensions without a traceable candidate decision.

## Verification and handoff

- Keep this plan under \`development/audit/Active/\` until the qualification scope is complete.
- Keep \`development/\` and \`backup/\` excluded from the public Pages artifact; never overwrite/delete dated backups.
- For each work block, record exact base/head SHA, changed paths, checks, result report/artifact, remaining alternatives, blockers, and one clear next action.
- Never equate test-source inspection, test workflow success, deployment success, or local rendered output with a different evidence class.
