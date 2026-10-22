# Homepage Information Bar and Hero Width — Candidate Evaluation

**Date:** 2026-10-22  
**Status:** VISUAL CANDIDATE VERIFIED on code/test head `0b7d8b6ef17a44d607d006639b5166362cc60f10`; a documentation-reconciled final-head retest is required before merge.  
**Repository:** ACROWN-System/AstroCrown-Web  
**Branch:** `design/homepage-information-bar-hero-balance-2026-10-22`  
**Base:** `8f51ff4b7c03684e27b0add89327b4f39a57948c`  
**Preview:** https://acrown-system.github.io/AstroCrown-Web/preview/

## 1. Scope and boundaries

This work changes only the public homepage's development preview and its offline browser tests, plus this evidence record and the active continuation checkpoint. The public root publishing source, GitHub Pages configuration, account/backend, administrator authorization, wallet sign-in, live market data, AI/SI, GPU and payments remain untouched.

This was a controlled candidate iteration. The exact-head Playwright report and desktop/full-page/mobile screenshots for code/test head `0b7d8b6ef17a44d607d006639b5166362cc60f10` have now been inspected. The visual candidate is accepted for the development preview, subject to the updated record/test head completing a fresh exact-head check before merge.

## 2. Evidence-based hypothesis

### Information bar

The current screenshot and exact source metrics record a desktop gap of 39 px from the header to the information bar, while active R-020.1 targets approximately 45 px. Increase only the desktop gap to 45 px. Keep the existing narrower-viewport overrides (25 px below 820 px and 18 px below 560 px) so the first viewport does not lose too much vertical space on small devices.

The active source record had proposed an approximately 5 px warning-yellow border/divider; at a 53 px bar height that could consume substantial interior space. The tested 2 px outline/divider is visible but does not overpower the bar content in the desktop image. The report confirms a 53 px box height, 2 px top border, and 2 px priority divider.

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

## 4. Exact code/test-head evidence and visual review

Run: [Homepage Browser Smoke 39812122166](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/39812122166)  
Artifact: [homepage-browser-smoke-39812122166, ID 12439334381](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/39812122166)

**73 PASS, 0 FAIL, 0 BLOCKED** on code/test head `0b7d8b6ef17a44d607d006639b5166362cc60f10`. The browser used runner-provided Google Chrome 156.0.8078.47. The JSON report records no page exceptions, no console errors, and no blocked non-loopback requests.

Rendered measurements at 1440 × 1000 CSS pixels:
- Header-to-information-bar gap: **45 px**.
- Information-bar height: **53 px**.
- Information-bar border/divider: **2 px / 2 px**.
- Information-bar width: **1,049.06 px (78% of 1,344.96 px content width)**.
- Hero section: **1,183.56 px (88% of content width), below the 1,320 px cap**.
- Homepage HTML source: 89,792 bytes; CSS: 10,294 bytes; JavaScript: 23,591 bytes; combined: **123,677 bytes**.
- Initial browser resource entries: 3 including the no-content favicon; decoded resource total: 123,677 bytes; recorded transfer bytes: 124,577; external HTTP(S) dependencies: zero.
- Responsive overflow and visibility checks passed at 1440, 1280, 1024, 768, 390 and 320 px.

**Screenshot review:** the desktop image has a clearer information-bar separation without making its content feel cramped. The discovery cards occupy more of the content width, reducing the large right-side gap and making their visual weight closer to the market workspace. The full-page screenshot preserves the section order and scroll rhythm. At 390 px, the information bar wraps onto multiple lines but remains legible, and the single-/multi-column cards remain within the viewport.

The prior run `39810200236` became stuck during Chromium/system-dependency installation and was later cancelled when the newer candidate run superseded it. This was setup/runner behavior, not a failed product assertion. The workflow now prefers the runner-provided Chrome and records its version, while retaining the Playwright-managed Chromium installation as a fallback. The successful report above is the product/browser result.

## 5. Remaining acceptance boundaries

A fresh exact-head browser run is still required after the following documentation/checkpoint-only commit. Merge only if that check stays green and no source/test files have changed since the reviewed code/test head. This evidence accepts the visual candidate for the development preview; it does not establish comprehensive accessibility, live-data capability, real-origin latency, commercial permission, or production readiness. Full contrast/keyboard/assistive-technology and actual live-origin checks remain separate gates.

## 5. Impact analysis

**If accepted:** the information bar matches its intended desktop breathing room, its outline becomes more visible, and the discovery cards align more comfortably with the rest of the content hierarchy.

**If rejected or not modified:** the current 39 px gap remains below the documented 45 px target, the bar's 1 px boundaries remain subtle, and the three-card row stays narrower than the context bar and directory. Those are aesthetic/usability trade-offs, not a functional outage.

## 6. Rollback and later work

All changes are isolated in this branch/PR and can be rejected without altering the main or production root. The next design candidate, only after reviewing this result, is to refine the layered background treatment/transparent artwork. Logo asset approval and all production-capacity/provider gates remain open.
