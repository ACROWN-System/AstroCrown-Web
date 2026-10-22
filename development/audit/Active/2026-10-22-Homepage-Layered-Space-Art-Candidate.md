# Homepage Layered Space Art — Alpha-Preserving Candidate

**Date:** 2026-10-22  
**Status:** DEVELOPMENT PREVIEW CANDIDATE — authored SVG assets and scroll-fade behavior are subject to exact-head browser review  
**Branch:** `design/homepage-layered-space-background-2026-10-22`  
**Scope:** homepage appearance and static assets only; public root and production publishing configuration are untouched.

## 1. Intent

Advance the existing CSS-only deep-space background toward the homepage requirements R-014 through R-018 and R-036 without adding external image dependencies, a paid service, raster assets, or remote requests.

The three transparent layers are original SVG source committed to this repository:
- `primitive-earth-moon.svg`: Earth illuminated from the left/rear, Moon with geometrically consistent upper-left light, a faint orbital structure and collision/debris remnants densest toward the lower-left.
- `rocky-planet.svg`: a rocky planetary body with a dark night-side, a smaller brighter right/day-side, atmospheric gas coloration and golden reflection around the upper-right limb.
- `spiral-nebula.svg`: a gold/orange/purple/blue spiral structure, central core and outward radial rays.

The asset source contains no external images, fonts, scripts or linked files. The introductory layer sits behind content, cannot receive pointer input, is removed from the accessibility tree, and begins to fade/translate away as the market workspace reaches the main reading area. CSS honors reduced-motion preferences.

## 2. Performance constraints

- Three SVG foreground assets combined: <= 24 KiB; each <= 12 KiB.
- Existing critical HTML/CSS/JS budget remains unchanged: HTML <= 112 KiB; CSS+JS <= 48 KiB.
- Total initial decoded resources remain <= 160 KiB and <= 8 resource entries; no off-origin HTTP(S) request is permitted in the test harness.
- The browser must prove each image is decoded, contains transparent pixels at its four corners and contains visible rendered artwork. An SVG extension alone is not evidence of alpha.
- No image is presented as live market data or as a product credential.

## 3. Acceptance checks

- XML parse + `viewBox` for all three SVG assets.
- Actual Chromium render of the three same-origin image files.
- Real-alpha corner probes and an artwork-visibility sample check.
- Scroll from top into the market workspace and back; assert the introductory layer fades in the workspace reading area and is restored on return.
- Existing 73 interaction/geometry checks, source budgets, no remote requests, page/console-error diagnostics and 1440/1280/1024/768/390/320 responsive checks must continue to pass.
- Inspect the exact-head desktop, full-page and mobile screenshots. Reject the change if background detail competes with text, the planets collide with controls/cards, the workspace fails to clear, or the decorative layers have opaque corners/halos.

A successful local/CI render does not establish full WCAG conformance, real-origin performance, multi-user capacity, or production readiness.

## 4. Rights and portability

These SVGs are authored from primitives and gradients directly in this repository; no third-party image or model output is incorporated. The repository's existing project licence applies. The asset source should remain independently reusable if the page later migrates hosts or the source artwork is replaced with properly licensed visual masters.

## 5. Impact analysis

**If accepted:** the page gains a layered planetary introduction and subtle atmospheric richness without an external media-provider dependency, and it can move foreground art out of the primary workspace area.

**If rejected:** revert only the preview SVG references/CSS and corresponding regression checks. The prior gradient-only page remains usable.

## 6. Remaining gates

Production hosting, commercial use of GitHub Pages (not approved for a commercial site), live data, account/authentication, AI/SI, GPU work, and payment integrations are outside this change. Keep the original SVGs and the resulting preview as design-only until screenshot/browser acceptance and separate production hosting/scale gates pass.
