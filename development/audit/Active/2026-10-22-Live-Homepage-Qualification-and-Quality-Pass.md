# Active Navigation Plan — Live Homepage Qualification and Quality Pass

**Date:** 2026-10-22  
**Status:** ACTIVE — preview published; user confirms overall direction is understandable; detailed design and interaction verification remains open.  
**Objective:** Progress the AstroCrown homepage from a recognizable structural prototype toward a deliberate, polished and operable website, while preserving evidence, the $0/no-card constraint, and the separation between the test preview and the public root site.

## Mode and source of truth

**Mode:** Repository review, evidence-led design/interaction audit, alternative-path investigation, and additive changes through a reviewed pull request.  
**Repository:** https://github.com/ACROWN-System/AstroCrown-Web  
**Main baseline:** `919bd0e2ff50a6e8143bbf5c2f4ada06708cbb29`  
**Preview route:** https://acrown-system.github.io/AstroCrown-Web/preview/  
**Preview source:** `preview/index.html` (blob SHA at baseline: `62c107354dfa501dc4c29222dce88410528c5593`), with local demo assets in `preview/`.  
**Last recorded Pages deployment:** run [39760680495](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/39760680495), successful for the merge that published the preview route.

The test preview is a public GitHub Pages route with a no-index directive. No-index is not access control. Market values are illustrative and account behavior is browser-only/disposable. Never enter real passwords, wallet seed phrases, private keys, personal information, or production credentials in this demo. No real email verification, reset, newsletter delivery, account persistence, or backend service is established by the prototype.

## User observation and current evidence

The user's latest visual review establishes a useful qualitative baseline: the page communicates the intended elements, their future placement, and the website's purpose, but proportions, sizes and styling are visibly still in development. Treat that as an initial direction check—not approval of every element, interaction, or viewport.

**Important observation limitation:** In this session, attempts to open the exact deployed preview through the page-reading tool and to retrieve its raw GitHub source through that route returned `DisabledError`. An earlier direct network attempt in the same work context failed DNS resolution. These errors establish a limitation of those inspection routes; they do **not** prove that the deployed site is down or that a browser sees the same error. GitHub source and deployment records remain accessible through the repository connector. Do not claim to have visually inspected the rendered page unless a real rendering observation is obtained.

## Scope and preservation constraints

1. Use the deployed preview as the primary target for homepage design and behavior, with source and build evidence used to supplement—not impersonate—live browser observation.
2. Inspect active section requirements under `development/index-section/` and shared visual conventions under `development/index-reference/`; preserve candidate/approved/unresolved status.
3. Keep changes inside `preview/` for this qualification path unless an independently verified need justifies a separate change. Do not replace or repurpose the public root homepage or change Pages publishing settings as part of this pass.
4. Keep `development/` and `backup/` excluded from the root Pages artifact. Never overwrite or delete dated backups.
5. Maintain the explicit demo warning, no-index metadata, relative local asset links, illustrative-data labels, and browser-only account boundary.
6. Maintain the $0/no-payment-card preference. Do not add services, APIs, dependencies, account providers, or paid capacity without evidence and a separate eligibility decision.
7. Keep the homepage's intended information architecture as a working requirement baseline: background, header, discovery information bar, Fear & Greed consensus / winners and losers / influence map, market data bar, directory filter, directory, pagination, secondary discovery, and footer.
8. Do not prioritize mobile redesign ahead of the documented desktop-first path; still record any obvious overflow or broken controls encountered during supported viewport checks.
9. Do not promote the prototype to production based only on CI, source inspection, or a successful Pages deployment.

## Investigation paths

| Path | Initial state | Next evidence needed |
|---|---|---|
| User's rendered-page observation | Initial direction confirmed; fine visual critique remains incomplete | Collect specific feedback only at a meaningful acceptance point; do not use repeated user checks to replace feasible technical work |
| Live route via page-reading tool | BLOCKED by `DisabledError` in this session | Revisit if another supported browser/rendering route becomes available; distinguish tool failure from site failure |
| GitHub source and asset inspection | Available | Inspect HTML/CSS/JS, local paths, controls, content labels, keyboard/accessibility hooks, and consistency with active requirements |
| Build/deployment evidence | Last recorded deployment succeeded | Recheck current main and latest Pages run before any future release claim |
| Static and deterministic tests | Available to the extent source can be obtained | Add/run relevant checks for markup, links, handlers, accessibility declarations, and demo-only behavior |
| Browser interaction / responsive testing | Not yet verified by the assistant in a real rendered browser | Establish whether a supported real-browser route exists; otherwise record exact items that remain BLOCKED and do not call source inspection a functional pass |
| Historical sources/backups | Preserved, historical only | Consult only to resolve provenance or a material requirement ambiguity; do not use old snapshots as the default current specification |

## Completion conditions

1. Map active homepage requirements to current source elements and identify gaps, conflicts, and unresolved decisions.
2. Enumerate plausible design and implementation alternatives before choosing a change; prefer the smallest change that measurably improves clarity, visual hierarchy, quality, or operability.
3. Inspect each existing interaction and its failure/edge cases; test supported paths rather than assuming buttons work because handlers exist.
4. Verify accessibility fundamentals in source and with actual browser evidence where the environment permits: semantic controls, keyboard operation, visible focus, labels, dialog close paths, sensible focus handling, and reduced-motion/contrast concerns as applicable.
5. Preserve truthful demo boundaries and security properties; verify no accidental external requests, secrets, or real-data claims are introduced.
6. Record each finding with criterion, method, observed evidence, state (PASS / FAIL / N/A / BLOCKED), impact, remediation and retest.
7. Run checks against the exact candidate commit; inspect the whole diff and CI trigger coverage before considering merge or deployment.
8. If rendered-browser verification remains unavailable, leave it explicitly BLOCKED, document the alternative routes attempted, and continue the other useful work instead of stopping or pretending it passed.

## Interruption and resume

On resumption, first verify the current main SHA, the state of the preview route, open PRs and latest deployment. Then read this plan, inspect current source and checks, and continue from the first uncompleted item below. Do not assume commit/deployment state remains unchanged.

### Progress log

- **2026-10-22:** PR #142 was merged and the isolated `/preview/` route deployed without changing the root Pages publishing boundary. Deployment run 39760680495 completed successfully.
- **2026-10-22:** User inspected the exact live preview and reported that the composition communicates the direction, but sizing and styling are still clearly in development.
- **2026-10-22:** Re-attempted direct page-reader access and a raw-source route; both returned `DisabledError`. These attempts are recorded as route/tool failures, not as evidence that the site is unavailable.
- **2026-10-22:** Began checking this as a process flaw, not just a missing one-off attempt. PR #143 adds an explicit persistent-investigation and resume-checkpoint section to the development/audit convention; the PR remains subject to its exact-head checks and review. The source root and published preview files were not changed by that PR.
- **Not yet performed:** Full source-to-requirement mapping, full interaction inventory and edge-case verification, visual-system refinements, and a real rendered-browser interaction pass.
- **Current first next action:** Fetch the current `preview/index.html`, its local JavaScript/CSS dependencies, and the active section/reference documents; produce a source-to-requirement map and interaction inventory before editing design or behavior.
- **Next after that:** Test each available static/deterministic path, implement a small high-value refinement in an isolated preview change, and retest. Explore other authorized rendering routes if available; if none works, keep real-browser criteria BLOCKED.

## Impact Analysis

**IF modified:** The work gains a durable, evidence-specific continuation point, avoids repeating completed checks, and makes clear which conclusions are based on user observation, source, deployment logs, or actual rendered behavior. The homepage can improve without destabilizing the root site or blurring the prototype's demo boundary.

**IF not modified:** A new conversation or tool interruption could lose the exact verified point; source/deployment success could again be mistaken for behavioral verification; design changes could proceed without a traceable mapping to active requirements.

## Verification and handoff

- Verify the file remains in `development/audit/Active/` and is not included in the public Pages artifact.
- Verify all linked commit, PR, deployment and route references are exact.
- Update the progress log after material investigations and before any interruption.
- Move this item from `Active/` only when its scope is actually complete or explicitly superseded, preserving unresolved blockers and evidence.
