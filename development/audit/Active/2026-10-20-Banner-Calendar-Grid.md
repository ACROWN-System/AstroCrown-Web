# Active Navigation Plan — Banner Calendar Grid and Coordination View

**Date:** 2026-10-20  
**Status:** IMPLEMENTED — automated and real-browser verification PASS; broader accessibility/performance review remains open  
**Repository:** ACROWN-System/AstroCrown-Web  
**Working branch:** admin/announcement-band-editor-phase-1  
**Parent plans:**  
- development/audit/Active/2026-10-19-Announcement-Band-Editor-Phase-1.md  
- development/audit/Active/2026-10-20-Banner-Scheduling-Interface.md

## 1. Objective

Complement the tested native date/time fields and scheduled-banner agenda with a lightweight month grid so an administrator can see scheduled opening/closing events by date and quickly choose an Open date. Keep the implementation dependency-free and local-only.

## 2. Navigation protocol limitation

The expected development/NAVIGATION-PROTOCOL.md and development/NAVIGATION-PLAN-TEMPLATE.md were previously checked and returned NOT_FOUND. Do not claim to have followed unavailable files. Continue using development/DEVELOPMENT-AND-AUDIT-CONVENTION.md and the active banner-editor plans.

## 3. Approved requirements

- Show a month heading with Previous month and Next month controls and a Today shortcut.
- Render a weekday-labelled 7-column calendar grid using the browser's local calendar/time-zone context. Empty cells may precede/follow the month's actual days.
- Put schedule-open markers on the local calendar date corresponding to `opens_at`, and closing markers on the local date corresponding to `closes_at`. Clearly distinguish temporary Open/Close markers from open-ended default changes.
- Each event marker should show a concise banner name/label and local time. The existing agenda remains available for full details and schedule removal.
- Clicking a date selects that day for the schedule form's Open date. Preserve the chosen Open time if present; otherwise use a sensible default (18:00). Do not create or modify a schedule merely by clicking a date.
- The current browser's IANA time zone should remain visible. Backend values remain ISO-8601 with explicit offsets; calendar labels are for local coordination.
- Keep the interface usable at narrow widths and keyboard-operable. Use native buttons, accessible names for dates/controls, visible focus, and no third-party calendar package.
- A scheduled open-ended default is an event on its Open date; it does not render infinitely many daily markers. A temporary schedule can have both Open and Close markers, including on the same day.
- The month grid is a coordination UI, not a background scheduler or proof that the public website has activated the event.

## 4. Scope boundaries

- Do not add drag-and-drop scheduling, recurrence, week/day views, multiple time zones per user, external calendar sync, or a generic event system.
- Do not change the backend schedule schema or resolver unless tests find a concrete defect.
- Do not add any network/API/library dependency.
- Preserve schedule confirmation behavior (confirm as default / add Close / cancel), banner-vs-scene separation, carousel links, saved drafts, and revision conflict handling.

## 5. Verification plan

1. Unit-level checks for calendar-day mapping and month grid dates, including year boundaries and leap years, using standard JavaScript Date behavior.
2. Real Chrome checks for previous/next month, Today, weekday/date grid accessibility labels, opening/closing markers, and selecting a date without immediately changing schedule state.
3. Save/reload the editor and verify the calendar markers persist from the saved schedule list.
4. Run the existing Python tests, inline JavaScript syntax validation, headless Chrome smoke test, and applicable repository CI on the exact head.
5. Confirm the public root homepage and `_config.yml` remain unchanged.

## 6. Acceptance criteria

- The month heading and grid show correct dates and weekday alignment for the selected month.
- Previous/Next change the visible month across year boundaries; Today returns to the current local month.
- Schedule opening and closing markers appear on the correct browser-local dates and display relevant times/banner labels.
- Clicking a date updates only the Open date field and does not append/change schedules.
- Existing scheduling dialog branches, saved agenda, carousel links, save/reload, and conflict tests continue to pass.
- Chrome tests run without adding external packages and include a narrow viewport check.

## 7. Impact Analysis

**IF implemented:** scheduling gains an actual calendar view that helps coordinate future important events while preserving the simple schedule form and agenda.

**IF not implemented:** admins can still enter dates through a native date picker and see an agenda, but cannot scan events visually by month or select an Open date from a calendar grid.

## 8. Verification results

- [Banner Backend Python Tests — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/39338734004) on tested commit `1940aad6ceb8033d6fbd8cb83c250a81b55f3d8b`.
- Python compilation, inline JavaScript syntax check, all 24 standard-library unit/API tests, and the real headless Chrome smoke test completed successfully.
- The Chrome test verified Previous month and Next month change the displayed heading and return to the original month; Today returns to the current month; the scheduled opening marker is rendered on the known 5 November 2026 date; clicking that date fills only the Open date field and does not create/remove a schedule.
- The same browser run retained the previous checks for carousel direction and independent per-scene links, schedule temporary/default confirmation branches, saving/reloading, conflict handling, pointer movement/resizing, and the 390px width assertion.
- Calendar uses browser-local dates for coordination while saved timestamps retain explicit timezone offsets. No external calendar package was added.
- The main canvas render loop does not rebuild the schedule agenda/calendar on every pointer frame; calendar/agenda refresh happens when the saved state or schedule list changes.

Browser evidence is a focused smoke test, not a full keyboard, assistive-technology, high-zoom, all-breakpoint, accessibility, or performance audit. Authentication/authorization, remote hosting, production activation and publishing remain NOT IMPLEMENTED.

## 9. Impact Analysis

**IF implemented:** administrators can visually coordinate scheduled banner opens/closes by month and select an Open date directly, while the underlying draft schedule state is unchanged until they explicitly add and save an entry.

**IF not implemented:** admins would rely only on native date/time fields and the agenda list, without a month-oriented view for identifying event dates or choosing a start date visually.

## 10. Status

The calendar grid, month navigation, Open/Close markers, time-zone-aware labels, and click-a-day Open-date selection are implemented and passed the focused automated/browser checks above. Further accessibility and visual review remains outstanding; this is not production acceptance.
