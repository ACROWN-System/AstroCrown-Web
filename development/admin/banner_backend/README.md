# AstroCrown banner backend — Python-first experiment

Status: local development prototype only.

This first Python implementation deliberately uses the Python standard library only. It is intended to test the banner's domain rules and local persistence before selecting any hosted runtime or adding an external package/service.

## Run locally

From the repository root, use Python 3.10 or newer:

    python -m development.admin.banner_backend.server --port 8765

The server binds only to 127.0.0.1. By default, the JSON state is stored in the current user's home directory at .astrocrown/banner-state.json. A different local path can be supplied using --data-file.

Open http://127.0.0.1:8765/admin/banner-editor to use the visual editor served from the same origin as the Python API. The editor loads the saved default banner composition and shows its save status. “Save draft” writes the current composition to the local JSON file; “Reload saved draft” restores the saved version after warning before discarding unsaved edits. A stale revision returns HTTP 409 and the editor preserves its in-page edits rather than overwriting newer saved state. Open http://127.0.0.1:8765/api/health to verify the local API is running. GET /api/state returns the state and its revision. PUT /api/state accepts a JSON object containing the revision last read and the replacement state.

## What is implemented

- Standard-library Python HTTP server and JSON persistence.
- Initial regular/default banner and independent carousel-slot records.
- One optional link per slot. An enabled link needs either an HTTPS URL or a same-origin absolute path; unsafe schemes, protocol-relative URLs, embedded credentials and control characters are rejected.
- Time-zone-aware scheduling and deterministic opening/closing boundaries.
- The visual editor can create/name separate banner definitions, schedule temporary banners with Open and Close, and list/remove schedules from the local draft.
- If Close is omitted, a three-choice confirmation dialog can confirm an open-ended default change, return to add a closing time, or cancel without changing the schedule.
- Local date/time inputs are converted to ISO 8601 with explicit offsets; the browser's detected time zone is shown.
- A lightweight monthly calendar marks saved Open/Close dates, supports Previous/Next/Today, and clicking a day fills the Open date field without creating a schedule.
- A scheduled banner with a close time is temporary and returns to the effective default after closing.
- A schedule without a close time requires explicit confirmation to make that banner the new default at its opening time.
- Overlapping temporary events and ambiguous simultaneous default transitions are rejected.
- Schedule changes are draft-only: there is no public homepage activation or background scheduler.
- Atomic local JSON replacement and revision-based stale-write protection.

## Test

    python -m py_compile development/admin/banner_backend/__init__.py development/admin/banner_backend/service.py development/admin/banner_backend/server.py
    python -m unittest discover -s development/admin/banner_backend/tests -t . -p "test_*.py" -v

A matching GitHub Actions workflow runs these checks for relevant pull requests and main-branch changes.

## Critical boundary

Authentication and authorization are not implemented. The API is not safe to expose beyond the local machine and is not production-ready. Do not deploy it or interpret the local Host check, lack of CORS, or obscure port as authentication. Before integration into a remotely accessible admin dashboard, implement and test trusted authentication, server-side authorization, CSRF and session protections, audit/recovery, persistent backups, and a provider-independent deployment plan.

The visual editor now connects to this local API only when served by this Python process. The editor/API integration remains a development prototype: it has no authentication or authorization and is not safe for network exposure. Schedule changes are stored as draft data only and do not activate the live homepage. No public homepage, production publishing, account, wallet, or payment behavior is changed by this experiment.
