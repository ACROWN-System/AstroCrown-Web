# Active Navigation Plan — Carousel Scenes and Per-Scene Links

**Date:** 2026-10-20  
**Status:** ACTIVE — next scoped editor increment  
**Repository:** ACROWN-System/AstroCrown-Web  
**Working branch:** admin/announcement-band-editor-phase-1  
**Parent plan:** development/audit/Active/2026-10-19-Announcement-Band-Editor-Phase-1.md  
**Baseline:** development/admin/announcement-band-editor.html with local Python draft API

## 1. Objective

Extend the browser-verified single-scene banner editor with a simple carousel scene model. Each scene has its own composition and its own optional “Add link” checkbox with a URL field shown only when enabled. Preserve ease of use and keep Python standard-library-only.

## 2. Navigation protocol limitation

The expected development/NAVIGATION-PROTOCOL.md and development/NAVIGATION-PLAN-TEMPLATE.md were previously inspected and returned NOT_FOUND. Do not claim to have followed unavailable files. Use development/DEVELOPMENT-AND-AUDIT-CONVENTION.md plus this plan and the parent plan.

## 3. Approved interaction requirements

- Keep one composition canvas. Selecting a scene loads that scene's composition into the same editor; do not fork one editor per scene.
- The primary controls, in this exact order, are **+ Add scene**, the three-dot Direction control, and **− Delete scene**.
- Direction starts at left-to-right and cycles: left-to-right → top-to-bottom → right-to-left → bottom-to-top → left-to-right. Preserve both a visible/accessible direction name and an accurate direction value.
- A small navigator appears below the primary controls, e.g. **‹ 2 / 6 ›**, and moves between existing scenes.
- Add preserves existing scenes and creates a new independent scene. A new scene starts with no elements, inherits sensible band base colour/height for ease of use, and starts with link disabled and empty URL.
- Delete affects only the selected scene and requires confirmation. Do not delete the last remaining scene. Do not remove shared assets as a side effect.
- Each scene has exactly one **[ ] Add link** checkbox in its scene settings. When checked, show that scene's **Destination URL** field. When unchecked, hide and clear its URL and make that scene non-clickable.
- Adding a scene adds its own unchecked link setting; existing scene link settings never transfer or change when scenes are selected, added, or deleted.
- Accept an HTTPS URL or same-origin absolute path. Backend validation remains authoritative; unsafe URL schemes and protocol-relative links stay rejected.
- Scene switching, creating, deletion, and link changes mark the draft unsaved. Save/reload retains independent per-scene compositions and link settings.
- Preserve the existing single-scene experience, eight handles, pointer movement/resizing, keyboard movement, band resizing, undo for element removal, save/reload, conflict handling, and visually calm AstroCrown styling.

## 4. Data model and compatibility

- Use the existing banner slot records as carousel scenes. Each slot already contains an ID, composition, Add link flag, and destination URL.
- Add an optional/defaulted carousel-direction field on each banner, defaulting to left-to-right; update validation to accept only the four defined values. Existing state files without this field must load by defaulting it, not fail.
- Keep active banner identity separate from active scene identity. Save the active scene's composition before switching scenes; save the overall banner state with all other scenes intact.
- Limit scene count in the UI to a documented reasonable cap for the prototype and disable Add at the cap; do not silently discard scenes.

## 5. Implementation sequence

1. Inspect current schema, editor state transitions, browser smoke test, and repository convention.
2. Add backward-compatible carousel-direction default/validation and dedicated tests.
3. Add scene controls and per-scene Add link/URL settings to the existing editor using the current state model.
4. Ensure switching scenes snapshots the outgoing composition and loads the selected slot without losing unsaved work.
5. Add browser tests for direction cycle, independent link settings, add/select/delete behavior, edit/save/reload across multiple scenes, and no transfer of URLs between scenes.
6. Run Python compilation, unit/API tests, JavaScript syntax validation, real Chrome smoke tests, and all applicable repository workflows on the exact PR head.
7. Review the diff, ensure no root homepage, _config.yml, backup, or production files are changed.

## 6. Explicit non-goals

- Do not add the page dashboard, page-section editor, authentication, remote hosting, uploads, publishing, or external API integrations.
- Do not implement the calendar/schedule UI in this increment; scheduling domain rules already exist in Python and will receive a separate interface increment after per-scene editing is stable.
- Do not implement automatic carousel rotation or media playback here. Direction is stored as future transition configuration; the immediate UI focuses on scene authoring and link behavior.

## 7. Acceptance criteria

- A single scene remains fully editable and behaves as before.
- Adding second and third scenes creates independent slots with one unchecked Add link checkbox each.
- Toggling Add link reveals only that scene's URL field; values persist independently.
- The Direction control follows the exact four-state cycle with accurate accessible naming.
- Navigator index/count matches actual scene count, and selection works.
- Deleting a selected scene confirms, cannot delete the last scene, and leaves other scenes/settings unchanged.
- Save/reload and optimistic conflict behavior remain correct with multiple scenes.
- Actual Chrome tests establish the interactions; static checks alone do not count as a PASS.

## 8. Impact Analysis

**IF modified:** the editor supports multiple banner scenes without duplicated editor implementations, and each scene independently controls its destination link as requested. The schema remains compact and provider-neutral.

**IF not modified:** the existing data model supports per-scene link fields but the UI will not expose them, leaving requested carousel/link behavior unavailable and risking future ad-hoc state transitions.

## 9. Status

No carousel UI, Direction control, per-scene link UI, or multiple-scene browser verification has been implemented by this plan's creation. This is the next work increment only.
