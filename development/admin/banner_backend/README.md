# AstroCrown banner backend — Python-first experiment

Status: local development prototype only.

This first Python implementation deliberately uses the Python standard library only. It is intended to test the banner's domain rules and local persistence before selecting any hosted runtime or adding an external package/service.

## Run locally

From the repository root, use Python 3.10 or newer:

    python -m development.admin.banner_backend.server --port 8765

The server binds only to 127.0.0.1. By default, the JSON state is stored in the current user's home directory at .astrocrown/banner-state.json. A different local path can be supplied using --data-file.

Open http://127.0.0.1:8765/api/health to verify the local API is running. GET /api/state returns the state and its revision. PUT /api/state accepts a JSON object containing the revision last read and the replacement state. A stale revision returns HTTP 409 rather than overwriting newer state.

This server does not yet serve or connect the visual editor. The root endpoint explains that limitation.

## What is implemented

- Standard-library Python HTTP server and JSON persistence.
- Initial regular/default banner and independent carousel-slot records.
- One optional link per slot. An enabled link needs either an HTTPS URL or a same-origin absolute path; unsafe schemes, protocol-relative URLs, embedded credentials and control characters are rejected.
- Time-zone-aware scheduling and deterministic opening/closing boundaries.
- A scheduled banner with a close time is temporary and returns to the effective default after closing.
- A schedule without a close time requires explicit confirmation to make that banner the new default at its opening time.
- Overlapping temporary events and ambiguous simultaneous default transitions are rejected.
- Atomic local JSON replacement and revision-based stale-write protection.

## Test

    python -m py_compile development/admin/banner_backend/__init__.py development/admin/banner_backend/service.py development/admin/banner_backend/server.py
    python -m unittest discover -s development/admin/banner_backend/tests -t . -p "test_*.py" -v

A matching GitHub Actions workflow runs these checks for relevant pull requests and main-branch changes.

## Critical boundary

Authentication and authorization are not implemented. The API is not safe to expose beyond the local machine and is not production-ready. Do not deploy it or interpret the local Host check, lack of CORS, or obscure port as authentication. Before integration into a remotely accessible admin dashboard, implement and test trusted authentication, server-side authorization, CSRF and session protections, audit/recovery, persistent backups, and a provider-independent deployment plan.

The current PR #140 visual editor remains a separate local in-memory prototype until a dedicated change connects it to this API. No public homepage, production publishing, account, wallet, or payment behavior is changed by this Python experiment.
