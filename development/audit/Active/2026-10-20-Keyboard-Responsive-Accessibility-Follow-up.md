# Active Plan — Keyboard-Only and Responsive Accessibility Follow-up

**Date:** 2026-10-20  
**Status:** AUDIT COMPLETE — remediation scoped for Block 5/5  
**Repository:** ACROWN-System/AstroCrown-Web  
**Branch:** admin/announcement-band-editor-phase-1  
**PR:** #140  
**Reviewed head:** 20d9ff5a98b2590e8dbedc7f658b39da1f855825  
**Source baseline:** development/admin/announcement-band-editor.html  
**Browser-test baseline:** development/admin/banner_backend/tests/browser_smoke.mjs

## 1. Objective

Audit keyboard-only editing and responsive/high-zoom evidence after the targeted fixes to the calendar, canvas semantics, and scheduling confirmation dialog. Identify verified gaps without expanding the feature scope or claiming inaccessible behavior is covered by pointer-based smoke tests.

## 2. Navigation protocol limitation

The expected `development/NAVIGATION-PROTOCOL.md` and `development/NAVIGATION-PLAN-TEMPLATE.md` have previously been checked and were unavailable. Do not claim to have followed those unavailable files. Continue using `development/DEVELOPMENT-AND-AUDIT-CONVENTION.md`, the active banner editor plans, and this record.

## 3. Audit method

Reviewed the current editor's responsive CSS, dynamic rendering, keydown/pointer handlers, calendar controls, layer controls, scene-link controls, context menu and browser smoke assertions. The targeted accessibility tests pass on code/test commit `1c653d4d044d5ba4c6a84c18a164d1a18614dcc4`; the current later PR-head commit changes documentation only. This was a source/test-coverage audit, not a complete manual keyboard or assistive-technology session.

## 4. Findings

### PASS — Responsive foundations exist

- CSS breakpoint rules exist at 950px, 760px, 620px and 520px.
- At 620px the main editor switches to one column; the scheduling layout switches to one column at 760px.
- The canvas has a 280px minimum width inside a horizontally scrollable canvas wrapper, so narrow preview content can scroll within the canvas region.
- Visible focus styling and reduced-motion preferences are present.

These observations confirm responsive mechanisms exist, not that every breakpoint or zoom mode has passed.

### FAIL — Resize handles are keyboard-focusable but activation is inert

The eight resize handles are native buttons with accessible names, but their only behavior is a `pointerdown` listener. They have no click or keyboard resize operation. Keyboard users can change Width/Height through the property fields, but the eight tabbable buttons themselves are no-op controls. Block 5 should either give the handles meaningful keyboard behavior or remove them from the keyboard tab order and expose them as pointer-only visual affordances, while preserving the property fields as the keyboard-accessible resizing interface.

### FAIL — Dynamic layer and scene-link updates may lose focus

- Layer selection, visibility, and ordering handlers call `render()`; `renderLayers()` replaces the layer controls' DOM. These handlers do not consistently restore focus after that replacement.
- Scene-link toggles call `renderSceneLinks()`, which replaces the scene-link controls. Enabling a link can therefore remove the focused checkbox without moving focus to the newly revealed Destination URL field.

Block 5 should preserve focus based on stable element/scene identity and move focus to the logical next control when one is revealed.

### FAIL — Custom context-menu keyboard interaction is incomplete

The canvas opens a custom container marked `role="menu"` with `role="menuitem"` children on context-menu/Shift+F10 keyboard invocation, but the handler does not move focus to the first item or implement menu arrow-key navigation. Either implement the required menu keyboard model and focus return, or simplify the structure to ordinary popover actions rather than claiming menu semantics.

### BLOCKED — Complete keyboard-only workflow

The browser smoke test currently includes real CDP key input for the Direction control and the confirmation dialog and date-button activation. The canvas arrow-movement check dispatches a synthetic `KeyboardEvent`; much of the remaining editing workflow is exercised with direct DOM actions or clicks. This is not evidence that a user can complete the entire workflow using physical keyboard navigation alone.

### BLOCKED — High-zoom and full responsive acceptance

The existing real-browser check verifies no horizontal document overflow at a 390px viewport only. It does not test the full breakpoint set, a narrow 320px viewport, actual browser zoom (e.g. 200%/400%), text resize/reflow, or focus visibility at high zoom. The very small calendar event marker text at narrow widths is a visual-review candidate but has not been established as a measured failure. A full contrast audit and a screen-reader session also remain unperformed.

## 5. Block 5 acceptance criteria

- Make resize handles meaningful keyboard controls or ensure they are not inert focus stops; keep dimensions adjustable through labelled property fields.
- Preserve keyboard focus through layer visibility/order/selection updates and scene-link enable/disable updates.
- Give the context-menu action surface coherent focus and keyboard behavior, or replace the menu roles with semantics matching the interaction.
- Extend the existing Chrome test for these cases and for representative 320/390/520/620/640/760/950px CSS viewport widths without adding browser dependencies.
- Clearly separate simulated narrow viewport evidence from actual browser zoom. If actual zoom or assistive technology cannot be tested with the current harness, leave it BLOCKED.
- Run all applicable workflows on the exact changed source/test commit and report failures rather than weakening assertions.

## 6. Impact Analysis

**IF corrected:** users who rely on a keyboard can use more of the editor without pointer-only controls or unexpected focus loss; additional viewport checks give evidence about reflow boundaries and overflow.

**IF not corrected:** the editor retains inert keyboard stops, uncertain focus continuity during dynamic updates, and incomplete context-menu keyboard behavior. Existing 390px smoke evidence would remain too narrow to claim responsive/high-zoom acceptance.

## 7. Scope boundary

No source or test code was changed during this audit block. PR #140 remains open and draft; do not merge or promote the local-only editor.