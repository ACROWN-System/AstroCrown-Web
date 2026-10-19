# Active Navigation Plan — Announcement Editor Accessibility Corrections

**Date:** 2026-10-20  
**Status:** ACTIVE — scoped remediation and regression verification  
**Repository:** ACROWN-System/AstroCrown-Web  
**Working branch:** admin/announcement-band-editor-phase-1  
**Parent PR:** #140  
**Baseline head:** 033e98486eb1a6e6e8ced3f6f938cd4f80dd293a

## 1. Objective

Correct three verified accessibility defects in the development-only banner editor without changing scheduling/business rules or production files:
1. Give the monthly date chooser a coherent, keyboard-operable accessible calendar model and expose useful event information.
2. Remove nested interactive semantics between the canvas element and its eight native resize buttons.
3. Contain keyboard focus in the open-ended schedule confirmation dialog and return focus to the relevant control when it closes.

## 2. Navigation protocol limitation

The expected `development/NAVIGATION-PROTOCOL.md` and `development/NAVIGATION-PLAN-TEMPLATE.md` have previously been checked and were unavailable. Do not claim to have followed unavailable files. Continue using `development/DEVELOPMENT-AND-AUDIT-CONVENTION.md`, the parent editor plans, and this plan.

## 3. Scope and preservation constraints

- Work only on `development/admin/announcement-band-editor.html`, its existing browser smoke test, and this audit plan.
- Reuse the existing Python/browser test harness; add no third-party dependencies.
- Preserve draft-only behavior, local-only server boundary, banner scheduling semantics, carousel behavior, and saved-state contract.
- Do not modify the root homepage, `_config.yml`, backend schedule schema, authentication, publishing, or deployment.
- Keep PR #140 open and draft. No merge or production promotion.

## 4. Acceptance criteria

- Calendar dates remain native buttons and expose meaningful accessible labels. Calendar navigation must be usable with the keyboard; event labels provide banner/time details to assistive technology. Calendar selection must still only fill the Open date and must not create a schedule.
- Canvas elements are keyboard-selectable/movable without using button semantics on an ancestor containing nested resize buttons. Resize buttons remain individually named; position/dimension fields remain available.
- The confirmation dialog traps Tab/Shift+Tab while open, handles Escape, and returns focus to the invocation control when cancelled/dismissed. The Confirm and Add a closing time branches preserve their existing focus destinations and do not regress scheduling behavior.
- Add browser regression assertions for the identified semantics and focus behavior; preserve existing browser and API tests.
- Run CI on the exact updated PR head. Report unrun or insufficient assistive-technology checks as BLOCKED, not PASS.

## 5. Verification method

Inspect exact source and prior smoke coverage, apply minimal source changes, add regression checks to the existing Chrome DevTools Protocol test, run JavaScript syntax validation and the workflow's Python/API/browser checks. Review the resulting diff and all statuses before declaring results.

## 6. Impact Analysis

**IF modified:** keyboard and assistive-technology users receive more consistent calendar, canvas, and dialog interaction patterns while retaining the existing editor workflow.

**IF not modified:** the editor keeps known semantic and keyboard-focus defects; its passing pointer/browser smoke test remains insufficient evidence for accessibility acceptance.

## 7. Current status

The previous focused review identified the three target defects. Remediation has not yet been performed. Complete this plan only after inspecting the changed diff and exact-head verification results.