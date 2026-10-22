# Header Space Blue — Candidate Evaluation and Prototype Decision

**Date:** 2026-10-22  
**Status:** Approved for the homepage header prototype as AstroCrown Space Blue `#102947`; exact-head Chromium interaction, geometry and contrast checks pass. Broader site accessibility review and approval of the logo asset/version remain open.  
**Scope:** Header surface only; this does not decide market-card, information-bar, or full environment-layer colors.

## Problem statement

The active visual requirement (R-005/R-019.2) requires three semantically distinct blue levels:

- AstroCrown Deep Space Blue: `#081426` (environment layer).
- AstroCrown Space Blue: formerly TBD (opaque header/navigation surface).
- AstroCrown Light Space Blue: `#16345A` (structural border/demarcation).

The old header used `rgba(8, 20, 38, .97)`, essentially the Deep Space Blue color blended with the page behind it. That did not explicitly establish the distinct opaque UI surface required by the specification.

## Method

1. Retained multiple candidates rather than treating the arithmetic midpoint as automatically correct.
2. Calculated sRGB relative luminance and contrast ratios using the WCAG formula. References:
   - W3C, [Understanding SC 1.4.3 Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
   - W3C, [Understanding SC 1.4.11 Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).
3. Checked that every candidate channel is strictly between the corresponding Deep Space and Light Space channels; this is a preliminary palette-range guard, not sufficient evidence of visual acceptability.
4. Compared the candidate's text-color contrast and adjacent-surface luminance distinction.
5. Applied one candidate to the isolated Pages preview and required the existing Playwright suite to rerun. The CI artifact screenshot is the visual evidence for this iteration.
6. Kept the change local to the preview and did not change the root publishing boundary.

For sRGB, the W3C relative-luminance calculation linearizes each 8-bit channel and combines the normalized red/green/blue components with weights 0.2126 / 0.7152 / 0.0722. The contrast ratio is `(Llighter + 0.05) / (Ldarker + 0.05)`. Contrast is not a complete design-quality measure; the rendered surface hierarchy, focus states, and all relevant text/control states still need inspection.

## Candidate results

Ratios below are reproducible from the values in this table and use WCAG relative luminance. They are not declarations that every use of a color passes a complete WCAG audit.

| Candidate | Existing palette token? | Contrast vs Deep `#081426` | Contrast vs Light `#16345A` | Warm white `#FFF7E0` on candidate | Gold `#FFD700` on candidate | Initial assessment |
|---|---|---:|---:|---:|---:|---|
| `#0B192C` | Yes, `--space-850` | 1.045:1 | 1.406:1 | 16.50:1 | 12.59:1 | Close to Deep Space; likely insufficiently distinct on the dark side |
| `#10233B` | Yes, `--space-800` (currently unused) | 1.164:1 | 1.262:1 | 14.81:1 | 11.29:1 | Balanced luminance separation, but darker/less visibly distinct from Deep |
| `#0D223A` | No | 1.148:1 | 1.280:1 | 15.02:1 | 11.46:1 | Dark candidate; conservative but still subtle against Deep |
| `#102947` | No; explicit `--space-blue` candidate | 1.256:1 | 1.170:1 | 13.73:1 | 10.47:1 | Stronger visible shift from the dark environment; text contrast remains high |
| `#112D4D` | No | 1.323:1 | 1.111:1 | 13.03:1 | 9.94:1 | More prominent blue, but increasingly close in luminance to Light Space |
| `#12304F` | No | 1.372:1 | 1.071:1 | 12.57:1 | 9.59:1 | Brightest candidate; too close in luminance to Light Space to be the first choice |

## Accepted decision for the homepage header prototype

Use `#102947` as the selected Space Blue for the homepage header and dark navigation surface, for these reasons:

- Every RGB channel remains between the existing Deep Space and Light Space channel values.
- It produces more luminance separation from Deep Space than the existing unused `#10233B` token, while retaining high text contrast (13.73:1 for Warm White and 10.47:1 for Gold in this calculation).
- It is not the brightest of the tested options, leaving room for the Light Space Blue border to remain the lighter structural level.
- The header is made opaque and its bottom line uses a partially transparent Light Space Blue treatment, reflecting the intent of R-019.2.
- This choice is supported by candidate comparison, not by arithmetic midpoint alone.

These numerical results cannot establish whether the surface looks sufficiently distinct at real size. The selected value can be changed if later evidence contradicts this decision, but a future change must record its hypothesis, comparison and re-test evidence. This is a reviewed prototype palette decision; it is not a blanket statement that the entire site is accessible or production-ready.

## Related geometry experiment

R-019.1/R-019.3 target approximately 59 px header height and approximately 51 px logo height, with about 4 px top/bottom clearance. The existing implementation measured at approximately 62 px minimum height with a 40 px SVG. This iteration uses a 60 px minimum and 50 px SVG, with 4 px vertical header padding. The 1 px border means the inner box geometry and rendered logo clearance must still be verified from Chromium layout metrics; approximate figures in the source are not treated as exact pixel equations.

## Acceptance gates

- [x] Candidate is rendered on the same captured preview source in Chromium (PR #146, exact-head run [39786404575](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/39786404575)).
- [x] CI screenshot begins at the top and all existing browser tests pass (63 PASS / 0 FAIL / 0 BLOCKED on commit `ed59db8db95d7ff256ee0afa1e2db3a7bb4c4c84`).
- [x] Header geometry measured at 1440, 1280, 1024, 768, 390 and 320 px; logo width/height and top/bottom clearance measured at 1440 px.
- [x] No document-level horizontal overflow is present at all six tested viewport widths.
- [ ] Full responsive keyboard/pointer interaction sweep for menus, search, account and wallet still requires follow-up; current smoke checks visibility at all six widths and exercises interactions at desktop width.
- [x] The rendered desktop screenshot shows a distinct intermediate blue surface and a more legible star mark without overwhelming the gold controls.
- [x] Existing user observation remains a baseline; the updated header still needs publication to the isolated live preview before any live-origin visual observation can be claimed.
- [x] Updated the active header requirement and the shared Colors, Layout, Sizing and Visual Design cross-reference records with the selected value and test evidence.

## Out of scope

No root homepage, account architecture, market-data source, API, login service, third-party runtime dependency, external image, paid resource, secret, workflow credential, DNS setting or backup was changed. The production site and production authentication are not qualified by this change.
