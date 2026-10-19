# Keyboard-Only and Responsive Accessibility Follow-up — Final Record

**Date:** 2026-10-20  
**Status:** TARGETED FINDINGS CLOSED — exact-code CI and browser regressions PASS; comprehensive accessibility acceptance remains BLOCKED  
**Repository:** ACROWN-System/AstroCrown-Web  
**Branch:** admin/announcement-band-editor-phase-1  
**PR:** #140  
**Verified code/test commit:** 55d3d105cf1902dced88e82c5089360c4a50adba  
**Scope:** development/admin/announcement-band-editor.html and development/admin/banner_backend/tests/browser_smoke.mjs

## 1. Objective and scope

Close the three source findings from the keyboard-only/responsive audit without expanding this development-only editor into an authenticated or publishable admin system. Preserve existing editor, carousel, schedule and draft-persistence behavior. Do not modify the root homepage or `_config.yml`.

The expected `development/NAVIGATION-PROTOCOL.md` and `development/NAVIGATION-PLAN-TEMPLATE.md` were previously checked and were unavailable. This record does not claim to have followed those unavailable files. The available `development/DEVELOPMENT-AND-AUDIT-CONVENTION.md` informed the evidence and retest record.

## 2. Findings and remediation

### F-KEY-01 — Inert resize controls: CLOSED

**Observed:** the eight resize handles were tabbable native buttons with pointer-only behavior. Keyboard activation did not resize.

**Change:** resize handles are now non-focusable visual `div` affordances hidden from the accessibility tree. The canvas label points keyboard users to the labelled Width and Height property fields. Pointer drag resizing remains available.

**Retest:** browser smoke asserts all eight handles remain present and are hidden from the accessibility tree, and that none introduces a button/tabindex focus stop. Existing pointer drag resizing passed. Keyboard dimension fields remain in the regular property form.

### F-KEY-02 — Dynamic layer/link focus loss: CLOSED

**Observed:** layer controls and scene-link controls are regenerated on updates, which could discard the focused node.

**Change:** layer selection, visibility and ordering handlers restore focus to the corresponding replacement control by stable element ID/action. Enabling a scene link moves focus to that scene's newly revealed Destination URL input. Disabling a link returns focus to its checkbox. If the focused layer was removed, focus falls back to an available layer selector.

**Retest:** the real-Chrome test uses CDP keyboard input to select a layer, hide/show an element, reorder two layers and restore their original order. It also verifies per-scene focus transitions when links are enabled/disabled, with link values kept independent.

### F-KEY-03 — Incomplete custom menu behavior: CLOSED

**Observed:** the custom surface declared `role="menu"` and `role="menuitem"`, but did not place focus into the menu or support its keyboard navigation model.

**Change:** Shift+F10/ContextMenu and pointer context-menu opening now focus the first menu item. ArrowUp/ArrowDown, Home and End move focus among available menu items. Escape closes the menu and restores focus to the corresponding canvas element. Context-menu placement measures the visible menu before clamping it to viewport bounds.

**Retest:** real-Chrome keyboard tests verify Shift+F10 opening, first-item focus, ArrowDown, Home and Escape/focus return.

## 3. Responsive/reflow evidence

The real Chrome smoke test emulates CSS viewport widths of **320, 390, 520, 620, 640, 760 and 950 CSS pixels**. At each width it asserts the requested viewport took effect and document horizontal scroll width does not exceed the viewport tolerance. At widths up to 620px it also checks the main editor uses one column; at widths up to 760px it checks the scheduling editor uses one column.

These are CSS viewport/reflow tests, **not actual browser zoom tests**. Actual 200%/400% zoom, full text-resize acceptance, a screen-reader/assistive-technology session, complete manual keyboard-only completion, and a full color-contrast audit remain **BLOCKED / not performed**. No comprehensive WCAG conformance claim is made.

## 4. Exact-commit verification

The following all passed on source/test commit `55d3d105cf1902dced88e82c5089360c4a50adba`:

- [Banner Backend Python Tests — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/39343605733): Python compilation, inline JavaScript `node --check`, all 24 standard-library unit/API tests and real headless-Chrome browser smoke test.
- [NOVA RSI Engine CI — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/39343605861).
- [External Review Pipeline CI — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/39343605761).
- [NOVA RSI CodeQL Security Analysis — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/39343605765).

The final browser log confirms pointer move/resize and band-height drag, persistence/reload/conflict handling, carousel and independent-link behavior, link focus transitions, keyboard menu navigation/focus return, scheduling branches, and the viewport/reflow checks above.

### Test-harness failure and correction

An intermediate run on commit `ddb60580870bde097b1b069e3fae894dd0b9fa24` failed because the test still expected eight native resize buttons after the implementation had intentionally converted the pointer-only handles to non-focusable `div` elements. The assertion was updated to verify the intended accessibility contract instead; the complete suite then passed on commit `55d3d105cf1902dced88e82c5089360c4a50adba`. This transient mismatch is recorded rather than represented as a product regression or hidden.

## 5. Impact analysis

**IF modified:** the editor no longer adds inert pointer-only resize handles to keyboard navigation; dynamic layer/link interactions preserve focus; the custom menu supports predictable focus and keyboard navigation; reflow evidence covers representative narrow/breakpoint viewports.

**IF not modified:** users would encounter inert focus stops, potential focus loss after regenerated controls, and menu roles without the corresponding keyboard/focus behavior. The former single-width overflow check would not establish behavior across the audited viewport set.

## 6. Boundaries and closure

- PR #140 remains **open and draft**; do not merge or promote as part of this block.
- No production root homepage or `_config.yml` change was made.
- The Python server remains loopback-only, unauthenticated and draft-only. No publish/activation behavior was added.
- The three findings above are closed for the tested behavior because the corrections and relevant regression tests passed on the exact code/test commit.
- Comprehensive accessibility acceptance is not closed: high-zoom, screen-reader, full contrast and full manual keyboard-only workflow evidence remain outstanding.
