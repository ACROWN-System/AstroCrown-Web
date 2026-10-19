# Active Navigation Plan — Python Banner Editor Integration

**Date:** 2026-10-20  
**Status:** COMPLETED — automated verification and defined real-browser smoke tests PASS; production readiness remains BLOCKED  
**Repository:** ACROWN-System/AstroCrown-Web  
**Working branch:** admin/announcement-band-editor-phase-1  
**Parent objective:** development/audit/Active/2026-10-19-Announcement-Band-Editor-Phase-1.md

## 1. Objective

Connect the existing development-only announcement-band editor to the dependency-free local Python JSON API so an administrator can load, edit, save, and reload a banner draft with clear feedback. This tests Python end-to-end locally before considering any remote hosting.

## 2. Navigation protocol limitation

The expected development/NAVIGATION-PROTOCOL.md and development/NAVIGATION-PLAN-TEMPLATE.md paths were previously checked and returned NOT_FOUND. Do not claim to have followed unavailable files. Follow the available development/DEVELOPMENT-AND-AUDIT-CONVENTION.md, the parent active plan, and this explicit plan until the authoritative navigation files are found or restored separately.

## 3. Scope and non-goals

- Keep all application changes in development/admin/banner_backend/ and development/admin/announcement-band-editor.html.
- Serve the editor from the local Python server at a fixed route on the same origin as the API. Keep the process bound only to 127.0.0.1.
- Load the saved default banner composition from JSON on startup. Add explicit Save draft and Reload saved draft actions; show saved/dirty/loading/error/conflict status visibly and accessibly.
- Preserve unrelated banners, carousel slots, link settings, and schedule records when saving the edited default banner's current composition.
- Use the existing revision token; on HTTP 409, preserve in-page edits and require reload/review before another save. Never silently overwrite newer state.
- Keep standard-library-only Python, production homepage, _config.yml, authentication, public publishing, and external APIs untouched.
- Do not implement a fake login or expose this local service over a network. Authentication/authorization remain unimplemented and production deployment remains out of scope.

## 4. Implementation and verification sequence

1. Inspect the current editor, local API, test suite, workflow and repository convention.
2. Add the editor route to the loopback Python server and test response type/content.
3. Add saved-state loading, editing-state mapping, explicit save/reload controls, visible status, dirty-state tracking, network/storage errors, and conflict handling.
4. Extend unittest integration coverage for the served editor route and run all backend tests locally where the environment is available.
5. Run the dedicated Python CI workflow on the exact resulting commit; verify all applicable repository workflows.
6. Review the diff and ensure no root homepage, _config.yml, backup, or unrelated production files changed.
7. Record browser verification as BLOCKED unless a real browser run is available. Do not infer browser/accessibility success from CI.

## 5. Acceptance criteria

- Running `python -m development.admin.banner_backend.server --port 8765` serves the editor at `http://127.0.0.1:8765/admin/banner-editor` and the same-origin JSON API.
- The editor loads the last saved composition, band height, and base color.
- Add/move/resize/hide/reorder/delete/undo/property changes mark the draft as unsaved.
- Save persists the current composition to the local JSON file; restarting the server and reopening the page restores it.
- Reload restores the last saved state and warns before discarding in-page modifications.
- A stale revision cannot silently overwrite newer data; the editor keeps unsaved local edits visible and guides the user to reload.
- Offline/storage/API failures do not falsely claim that a save succeeded.
- Existing backend schema/scheduling/link validations and tests continue passing.
- No authentication, production publishing, remote service, or public homepage change is introduced.

## 6. Impact Analysis

**IF modified:** the Python implementation is proven in the actual editor workflow rather than as an isolated API, with visible persistence feedback and stale-write protection. This provides evidence for the next local testing stage without committing to an external hosting provider.

**IF not modified:** the visual editor remains disconnected and non-persistent while the Python API is tested in isolation; the project cannot yet verify a complete save/reload workflow or a realistic frontend/API failure experience.

## 7. Verification status

Implemented in the development branch:

- The Python server serves the editor at `/admin/banner-editor` on the same loopback origin as the API.
- The editor loads the persisted default-banner composition and provides explicit Save draft and Reload saved draft controls.
- Changes to content/properties, visibility, order, band base color/height, pointer movement/resizing, deletion, and undo mark the draft unsaved.
- Reload asks before discarding edits. Save uses the loaded revision. A stale revision (HTTP 409) preserves current in-page changes and requires reload before another write.
- Saving updates only the default banner's first slot composition while preserving other banner records, slot link settings, and schedules.
- The server remains loopback-only, and production readiness/authentication are explicitly false/not implemented.

Automated verification on code commit `c057c781dc0ea3a6f539612779f78e56059917d3`:

- [Banner Backend Python Tests — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/39334949893): Python compilation, inline editor JavaScript syntax via `node --check`, and all 21 standard-library unit/HTTP tests passed.
- [NOVA RSI Engine CI — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/39334949906).
- [External Review Pipeline CI — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/39334950016).
- NOVA RSI CodeQL was still running when this record was updated; verify the final PR head's conclusion separately.
- An earlier run on `acadc7e85de92255356bd48900eb6d44f26ea0f7` failed in 20 of 21 tests because the new Python initial-state seed used JSON's lowercase `false` as a Python name. Root cause was corrected to Python's `False`; the Python suite then passed. This demonstrates why compile-only checks are insufficient for runtime behavior.
- A documentation-only plan update follows the verified code commit; final workflow status must be checked on the resulting PR head as well.

Real-browser verification on the current tested code commit 9ffc6226edd9a87d8a31d68875c6dfb71e93452f passed through GitHub-hosted headless Chrome without adding a browser package. The test exercised load, edit, save, reload, keyboard movement, real pointer drag-to-move, the east element resize handle, lower-border band resizing, stale-write conflict preservation, confirmed recovery, and a 390px viewport overflow check. The measured band height changed from 120px to 140px. Evidence: https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/39336175307.

Earlier browser smoke failures were investigated: first the CDP test helper read a nested result incorrectly; then the lower-edge interaction was below the browser's visible viewport. The helper was fixed, the test scrolled the control into view, and reruns passed. These were test-harness issues rather than reasons to change product behavior.

Authentication/authorization, remote deployment, backups/recovery rehearsal, and production publishing remain NOT IMPLEMENTED. The browser smoke test does not certify full accessibility, all keyboard paths, all responsive sizes/high zoom, performance, network security, or production acceptance.
