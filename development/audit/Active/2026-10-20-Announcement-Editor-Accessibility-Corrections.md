# Accessibility Corrections — Announcement Band Editor

**Date:** 2026-10-20  
**Status:** COMPLETE — targeted fixes and browser regression checks PASS; comprehensive assistive-technology review remains BLOCKED  
**Repository:** ACROWN-System/AstroCrown-Web  
**Working branch:** admin/announcement-band-editor-phase-1  
**Parent PR:** [#140 — Build development-only announcement editor with Python draft backend](https://github.com/ACROWN-System/AstroCrown-Web/pull/140)  
**Verified code/test commit:** `1c653d4d044d5ba4c6a84c18a164d1a18614dcc4`

## 1. Scope

Correct the three confirmed accessibility defects in the development-only banner editor without changing its scheduling/business rules or production boundary:

1. Calendar semantics and event information for assistive technology.
2. Canvas element semantics where eight native resize buttons are nested inside the element container.
3. Keyboard focus containment and restoration for the open-ended schedule confirmation dialog.

Files changed in this scoped increment:
- `development/admin/announcement-band-editor.html`
- `development/admin/banner_backend/tests/browser_smoke.mjs`
- This audit/plan record.

The root homepage, `_config.yml`, backend schedule schema, dependencies, authentication, publishing, and deployment were not changed.

## 2. Criteria

- Calendar dates retain native button semantics and meaningful labels, including scheduled banner names and event times. Keyboard activation selects an Open date but does not create a schedule.
- A canvas element containing interactive resize handles does not itself expose button semantics. The individual resize buttons remain named, and keyboard/property alternatives remain available.
- Tab and Shift+Tab remain within the confirmation dialog, including when focus is programmatically outside it. Escape dismisses the dialog without changing schedules. Dialog actions return focus to the correct follow-up control.
- Existing save/reload, conflict, scene, URL, schedule, and responsive smoke coverage remains passing.
- Keep PR #140 open and in draft. No production promotion is authorized.

## 3. Navigation protocol limitation

The expected `development/NAVIGATION-PROTOCOL.md` and `development/NAVIGATION-PLAN-TEMPLATE.md` were previously checked and were unavailable. This record does not claim to have followed those unavailable files. The available `development/DEVELOPMENT-AND-AUDIT-CONVENTION.md` and the existing editor plans were used instead.

## 4. Remediation

### Calendar

The previous markup applied `role="gridcell"` directly to native date buttons while the container declared `role="grid"`, without the required row hierarchy. The calendar now uses a labelled group containing ordinary native date buttons instead of claiming an incomplete ARIA grid pattern. The selected day uses `aria-pressed`, and each date's accessible label includes the scheduled event details already represented by the event markers. The calendar still only fills the Open date field when activated.

### Canvas element

The parent canvas element now exposes group semantics rather than button semantics while it contains eight native resize buttons. It has a descriptive accessible label covering keyboard movement and the Width/Height property controls. Keyboard activation keeps focus on the element after its DOM is re-rendered. Existing position/size fields and all eight labelled resize handles remain available.

### Confirmation dialog

The document-level keyboard handler contains focus while the dialog is open, wraps Tab/Shift+Tab at the dialog boundaries, and brings focus back into the dialog if focus was moved outside programmatically. Existing Escape dismissal is regression-tested. Confirm and Cancel restore focus to the Add schedule control; Add a closing time focuses the revealed Close field.

## 5. Verification method and evidence

The changes were tested in the existing workflow on exact code/test commit `1c653d4d044d5ba4c6a84c18a164d1a18614dcc4`. The following GitHub Actions runs all concluded **success**:

- [Banner Backend Python Tests](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/39342138295) — Python compilation, inline JavaScript syntax validation, all 24 Python/API tests, and the real headless-Chrome smoke test.
- [NOVA RSI Engine CI](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/39342138322).
- [External Review Pipeline CI](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/39342138292).
- [NOVA RSI CodeQL Security Analysis](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/39342138311).

The Chrome smoke test now covers:
- The initial canvas element's group semantics, all eight resize buttons, and accessible alternatives.
- Calendar group/native-button semantics, event detail in the accessible date label, Enter-key activation, and no schedule mutation when selecting a date.
- Dialog initial focus, Tab/Shift+Tab wrapping, focus recovery from outside, Confirm/Cancel/Add Close focus destinations, Escape dismissal, and no schedule mutation on cancellation/dismissal.
- Existing canvas pointer movement/resizing, band-height resize, save/reload/conflict recovery, carousel direction and scene/link behavior, scheduling branches, month navigation, and the 390px viewport overflow check.

The first added canvas-semantic assertion failed because it was placed after the smoke test had added and selected a new, intentionally empty carousel scene. At that checkpoint the scene correctly had no `.canvas-element`, so the test incorrectly assumed that a selected scene always had content. The assertion was moved to the initial saved-draft render, where the seeded canvas element exists, and made null-safe. This was a test-placement error rather than evidence of lost content in the editor.

The workflow log confirms `Ran 24 tests` / `OK` and the browser smoke test ended with `PASS: real Chrome verified...`. The four workflow results above correspond to the stated code/test commit. This completion record itself is a documentation-only update and does not alter the tested source or test code.

## 6. Findings and result states

- **PASS:** calendar semantics and event descriptions updated; keyboard activation covered in Chrome.
- **PASS:** canvas container no longer uses button semantics around child resize buttons; regression assertions confirm eight handles and the alternatives label.
- **PASS:** modal focus trapping and its primary focus-return paths tested in Chrome.
- **PASS:** 24 Python/API tests, JavaScript syntax check, real-browser smoke test, NOVA RSI Engine CI, External Review Pipeline CI, and CodeQL.
- **BLOCKED:** complete accessibility acceptance. No dedicated screen-reader/assistive-technology session, high-zoom reflow audit, full contrast audit, or complete keyboard-only test of every editing workflow was performed. The Chrome smoke test is not a substitute for those checks.

## 7. Impact Analysis

**IF modified:** calendar dates, canvas controls, and the scheduling confirmation dialog have more consistent keyboard and assistive-technology behavior, with existing editing and scheduling logic preserved.

**IF not modified:** the editor would retain the identified semantic and dialog focus defects, and its existing pointer-centric smoke coverage would not adequately address them.

## 8. Closure and remaining boundary

This scoped remediation is complete for the three identified defects and the regression checks listed above. PR #140 remains open and draft. The editor continues to save only local drafts and remains unauthenticated and loopback-only. This work does not certify accessibility, authorize network exposure, or authorize production publication. The broader accessibility review remains BLOCKED until its missing evidence is obtained.
