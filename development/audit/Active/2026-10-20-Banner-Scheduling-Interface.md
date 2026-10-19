# Active Navigation Plan — Banner Scheduling Interface

**Date:** 2026-10-20  
**Status:** IMPLEMENTED — automated and real-browser verification PASS; production activation remains out of scope  
**Repository:** ACROWN-System/AstroCrown-Web  
**Working branch:** admin/announcement-band-editor-phase-1  
**Parent plan:** development/audit/Active/2026-10-19-Announcement-Band-Editor-Phase-1.md  
**Backend baseline:** development/admin/banner_backend/service.py  
**UI baseline:** development/admin/announcement-band-editor.html

## 1. Objective

Add a straightforward scheduling interface for banners after the single editor, local Python persistence workflow, and carousel scene/link controls are verified. Keep the scheduling model aligned with the existing Python domain logic. Do not build a generic automation platform.

## 2. Navigation protocol limitation

The expected development/NAVIGATION-PROTOCOL.md and development/NAVIGATION-PLAN-TEMPLATE.md were previously inspected and returned NOT_FOUND. Do not claim to have followed unavailable files. Use development/DEVELOPMENT-AND-AUDIT-CONVENTION.md plus this plan and the parent plan.

## 3. Approved behavioral model

- There is one current default banner and zero or more separately defined scheduled banners.
- A scheduled item references a **banner**, not a single carousel scene. Its banner may contain multiple scenes, each with its own composition and optional URL.
- The schedule editor exposes Open (date/time) and optional Close (date/time), showing the applicable time zone explicitly.
- Open + Close means the selected banner temporarily overrides the effective default in that interval; at Close, the effective default resumes.
- Open without Close triggers a confirmation dialog before adding the schedule. The dialog choices are:
  1. **Confirm and set as default** — records an open-ended schedule that becomes the new default at its scheduled Open time.
  2. **Add a closing time** — returns to the schedule form with Close enabled/focused.
  3. **Cancel** — no schedule change is made.
- Confirmation never changes the live/published banner immediately. In this local prototype it only saves a draft schedule.
- Retain previous banner definitions/schedules for recovery. Never delete the prior default just because a future schedule replaces it.
- Show schedules in a compact upcoming/agenda list with banner name, Open, optional Close, time zone, and whether it is temporary or will become the default. A simple list is acceptable before adding a full calendar grid.
- Invalid times, Close <= Open, ambiguous/overlapping temporary schedules, missing default-change confirmation, and missing banner references must be rejected with clear feedback by both UI and backend.
- Dates/times must be converted to ISO-8601 timestamps with explicit timezone offset before sending to the backend. Avoid relying on server/browser local timezone assumptions silently.

## 4. Data and UI boundaries

- Use existing validated schedule fields: `id`, `banner_id`, `opens_at`, `closes_at`, and `confirmed_default_change`.
- Keep schedule management separate from scene link configuration and carousel direction.
- Provide a minimum reliable way to create/select another banner in the admin editor or scheduling panel; do not try to schedule a carousel slot as if it were a separate banner.
- Do not add a publishing action or a real-time/background scheduler. The current Python API stores draft schedules and can resolve an active banner at a supplied/current time, but the public homepage is not yet wired to read this state.
- Keep the service loopback-only, unauthenticated, standard-library-only, and development-only. No external API, hosted service, public homepage change, auth, or account/wallet feature is in scope.

## 5. Implementation sequence

1. Inspect the existing backend schema/schedule resolver and carousel/banner state transitions.
2. Build the smallest clear schedule form and upcoming agenda list in the existing editor sidebar or a dedicated scheduling panel that does not overcrowd the three-panel canvas.
3. Add a banner selector/reference that lists saved banner definitions and makes banner-vs-scene identity clear. If creating banner definitions is needed, add a minimal "New banner" action preserving existing banners and scenes.
4. Add the missing-Close confirmation dialog with confirm / add Close / cancel actions.
5. Add tests for creating temporary schedules, open-ended default changes, cancellation/no mutation, invalid times, timezone handling, and schedules assigned to banner IDs while preserving carousel scenes/links.
6. Add real-browser tests for date/time input, confirmation branches, schedule list, save/reload, and keyboard interaction.
7. Run Python, JavaScript, Chrome smoke, and all applicable CI checks on the exact head.
8. Review the diff; no production homepage, _config.yml, backup, or unrelated code changes.

## 6. Explicit non-goals

- No production publishing or activation scheduler.
- No account authentication/authorization or admin dashboard implementation.
- No page layout/section editor, payment logic, trading bot scheduling, external APIs, hosted runtime, database, or third-party package.
- No automatic carousel playback/transition rendering in this increment.

## 7. Acceptance criteria

- The administrator can create a temporary scheduled banner and save it as draft with explicit Open/Close times.
- If Close is omitted, the confirmation dialog presents exactly confirm-and-set-default, add-close, and cancel behavior.
- Confirm saves an open-ended schedule only after explicit consent; add-close returns to the form; cancel leaves the schedule array unchanged.
- The schedule is tied to a banner ID, not a carousel scene/slot ID.
- A temporary schedule returns to the currently effective default at Close; an open-ended scheduled default transition is applied at its Open time when resolving active state.
- Invalid and overlapping schedules are rejected without overwriting the stored state.
- Existing multi-scene compositions, direction, and independent slot links survive schedule edits/save/reload.
- Real-browser tests and CI prove the above; no production behavior is implied.

## 8. Impact Analysis

**IF implemented:** the visual editor gains the user's requested default/temporary banner schedule flow, using already established Python schedule rules and preserving scene/link independence. Manual schedule creation becomes testable before designing hosting and publication.

**IF not implemented:** scheduling rules exist only in the Python backend and the administrator cannot use them through the editor; no user-visible calendar/agenda workflow is available.

## 9. Status

Implemented on the development PR branch and verified on code commit `06ce67cd09f6c4f7b089becf0283931cf7fd7bf2`.

- [Banner Backend Python Tests — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/39337759434): Python compile, inline editor JavaScript syntax, 24 standard-library unit/API tests, and real headless Chrome tests passed.
- Browser evidence covers creation and naming of a new banner definition, temporary Open/Close scheduling, no-Close dialog appearing without mutating schedule data before confirmation, confirm-and-set-default, Add a closing time returning to the form, Cancel leaving schedules unchanged, save/reload, and retention of the banner/schedule relationship.
- The schedule form uses the browser's native date/time picker and displays the detected IANA/browser time zone. Local date/time values are converted to ISO 8601 timestamps with explicit UTC offsets. The adjacent agenda lists scheduled entries and can remove entries from the local draft.
- The backend remains authoritative for schedule schema, time-zone offsets, close-after-open, schedule/banner references, temporary overlap rejection, and open-ended default-change confirmation.
- Schedule records reference banner IDs, not carousel slot IDs. Multiple-scene compositions and each scene's independent link settings remain intact.
- The interface saves only a local draft. There is no production activation scheduler, no public banner delivery integration, no authentication, and no remote hosting.
- Browser smoke verification is limited to the listed scenarios and a 390px viewport check. It is not a full accessibility/performance audit or production security acceptance.

The schedule UI is implemented and smoke-tested as local draft behavior. It must not be described as automatically updating the live homepage yet.


### Monthly calendar grid — follow-on verification (2026-10-20)

A month grid was added alongside the native Open/Close controls and agenda. Previous/Next/Today navigation, local-date Open/Close markers, and click-a-day-to-set-Open-date are tested by the same passing Chrome run as the schedule workflow: https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/39338734004. Selecting a day does not create a schedule; the administrator must still choose **Add schedule to draft**, and then **Save draft**. No external calendar dependency or live scheduler was introduced.
