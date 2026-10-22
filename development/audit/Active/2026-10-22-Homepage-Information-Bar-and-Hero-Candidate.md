# Homepage Information Bar and Hero Width — Candidate Evaluation

**Date:** 2026-10-22  
**Status:** CANDIDATE CHANGE — awaiting exact-head browser metrics and rendered screenshot review  
**Repository:** ACROWN-System/AstroCrown-Web  
**Branch:** `design/homepage-information-bar-hero-balance-2026-10-22`  
**Base:** `8f51ff4b7c03684e27b0add89327b4f39a57948c`  
**Preview:** https://acrown-system.github.io/AstroCrown-Web/preview/

## 1. Scope and boundaries

This work changes only the public homepage's development preview and its offline browser tests, plus this evidence record and the active continuation checkpoint. The public root publishing source, GitHub Pages configuration, account/backend, administrator authorization, wallet sign-in, live market data, AI/SI, GPU and payments remain untouched.

This is a candidate design iteration. The change is not accepted until the exact-head Playwright report and screenshots are inspected.

## 2. Evidence-based hypothesis

### Information bar

The current screenshot and exact source metrics record a desktop gap of 39 px from the header to the information bar, while active R-020.1 targets approximately 45 px. Increase only the desktop gap to 45 px. Keep the existing narrower-viewport overrides (25 px below 820 px and 18 px below 560 px) so the first viewport does not lose too much vertical space on small devices.

The active source record proposed an approximately 5 px warning-yellow border and divider, but that value is intentionally evaluable rather than immutable. At a 53 px total bar height, a 5 px border would consume substantial interior space. This candidate uses 2 px for the outside border and priority divider, increasing visual separation without adopting the heaviest proposal. The browser test asserts the rendered 2 px values, 53 px box height, and 78% width cap; screenshot review will decide whether the visual weight is balanced.

### Hero-card group

At the 1440 px reference viewport, the current hero section uses 82% of the available content width, while the market context strip and asset directory span most of that width. This produces an abrupt width change and leaves an unusually large empty right-hand area beside the discovery cards. The design requirements say the cards should be sized from information density and hierarchy, not arbitrary percentages. The 88% value is therefore a controlled candidate to test against the screenshot, not a final universal design rule.

Use `width: min(88%, 1320px)` at desktop; retain the current responsive behavior at widths up to 1320 px (88%), at 1100 px and below (100%), and preserve the two-column/one-column card stacking rules. Card content, minimum heights, column weights, content data, and destinations are unchanged.

## 3. Expected rendered assertions (1440 × 1000 CSS px)

- Header-to-information-bar gap: 45 px ±0.5 px.
- Information bar total height: 53 px ±0.5 px.
- Information bar width: 78% of the page-shell content width ±0.5 percentage points, with existing 1170 px cap unchanged.
- Outer border and priority divider: 2 px.
- Hero group width: 88% of content width ±0.5 percentage points, max 1320 px.
- Existing browser checks continue to validate key interactions, uniqueness of DOM IDs, no horizontal overflow at 1440, 1280, 1024, 768, 390 and 320 px, and no JavaScript/console/network-boundary errors.

## 4. Acceptance rules

- The exact PR head's Homepage Browser Smoke must pass all old and new assertions.
- Inspect desktop, full-page, and mobile screenshots; reject the candidate if border thickness competes with content, the larger cards feel unbalanced, the existing scroll rhythm is harmed, or responsive layout regresses.
- Check the machine-readable report for actual computed geometry rather than relying on source declarations alone.
- A green browser test does not mean the full design is approved, accessible in all contexts, live-data capable, or production-ready. Full contrast/keyboard/assistive-technology and actual live-origin checks remain separate gates.

## 5. Impact analysis

**If accepted:** the information bar matches its intended desktop breathing room, its outline becomes more visible, and the discovery cards align more comfortably with the rest of the content hierarchy.

**If rejected or not modified:** the current 39 px gap remains below the documented 45 px target, the bar's 1 px boundaries remain subtle, and the three-card row stays narrower than the context bar and directory. Those are aesthetic/usability trade-offs, not a functional outage.

## 6. Rollback and later work

All changes are isolated in this branch/PR and can be rejected without altering the main or production root. The next design candidate, only after reviewing this result, is to refine the layered background treatment/transparent artwork. Logo asset approval and all production-capacity/provider gates remain open.
