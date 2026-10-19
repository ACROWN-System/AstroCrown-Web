"""Loopback-only HTTP API for the AstroCrown banner backend experiment.

This server intentionally has no authentication and is safe only for local
experimentation. It must never be exposed to a network or deployed to production.
"""
from __future__ import annotations

import argparse
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

from .service import (
    MAX_STATE_BYTES,
    BannerStateError,
    RevisionConflict,
    load_state,
    save_state,
    state_revision,
)


def handler_for(state_path: str | Path) -> type[BaseHTTPRequestHandler]:
    """Create a request handler bound to a single local state-file path."""
    store = Path(state_path)

    class BannerAPIHandler(BaseHTTPRequestHandler):
        server_version = "AstroCrownBannerPrototype/0.1"
        sys_version = ""

        def log_message(self, format: str, *args: Any) -> None:
            # Avoid logging request bodies or any banner content.
            super().log_message(format, *args)

        def _send_json(self, status: int, payload: dict[str, Any]) -> None:
            encoded = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(encoded)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("X-Frame-Options", "DENY")
            self.send_header("Referrer-Policy", "no-referrer")
            self.send_header("Cross-Origin-Resource-Policy", "same-origin")
            # Deliberately no CORS headers. This local prototype is not an auth boundary.
            self.end_headers()
            self.wfile.write(encoded)

        def _host_is_local(self) -> bool:
            host = (self.headers.get("Host") or "").lower()
            valid = {
                "127.0.0.1",
                "localhost",
                f"127.0.0.1:{self.server.server_port}",
                f"localhost:{self.server.server_port}",
            }
            return host in valid

        def _require_local_host(self) -> bool:
            if not self._host_is_local():
                self._send_json(400, {"error": "invalid_host", "message": "This prototype accepts local Host values only."})
                return False
            return True

        def do_GET(self) -> None:  # noqa: N802 - BaseHTTPRequestHandler API
            if not self._require_local_host():
                return
            if self.path == "/api/health":
                self._send_json(200, {
                    "status": "ok",
                    "mode": "local-development-only",
                    "authentication": "not-implemented",
                    "production_ready": False,
                })
                return
            if self.path == "/api/state":
                try:
                    state = load_state(store)
                    self._send_json(200, {"revision": state_revision(state), "state": state})
                except BannerStateError as exc:
                    self._send_json(500, {"error": "invalid_stored_state", "message": str(exc)})
                except OSError:
                    self._send_json(500, {"error": "storage_unavailable", "message": "The local state file could not be read."})
                return
            if self.path == "/":
                self._send_json(200, {
                    "name": "AstroCrown banner backend prototype",
                    "message": "Local JSON API only. The visual editor is not connected to this API yet.",
                    "endpoints": ["GET /api/health", "GET /api/state", "PUT /api/state"],
                    "production_ready": False,
                })
                return
            self._send_json(404, {"error": "not_found"})

        def do_PUT(self) -> None:  # noqa: N802 - BaseHTTPRequestHandler API
            if not self._require_local_host():
                return
            if self.path != "/api/state":
                self._send_json(404, {"error": "not_found"})
                return
            content_type = (self.headers.get("Content-Type") or "").split(";", 1)[0].strip().lower()
            if content_type != "application/json":
                self._send_json(415, {"error": "unsupported_media_type", "message": "Use application/json."})
                return
            try:
                raw_length = self.headers.get("Content-Length")
                if raw_length is None:
                    self._send_json(411, {"error": "content_length_required"})
                    return
                length = int(raw_length)
                if length < 0:
                    raise ValueError
            except ValueError:
                self._send_json(400, {"error": "invalid_content_length"})
                return
            if length > MAX_STATE_BYTES + 10_000:
                self._send_json(413, {"error": "payload_too_large"})
                return
            try:
                raw = self.rfile.read(length)
                body = json.loads(raw.decode("utf-8"))
            except (UnicodeDecodeError, json.JSONDecodeError):
                self._send_json(400, {"error": "invalid_json"})
                return
            if not isinstance(body, dict) or set(body) != {"revision", "state"}:
                self._send_json(400, {"error": "invalid_request", "message": "Expected exactly revision and state fields."})
                return
            try:
                state, revision = save_state(store, body["state"], body["revision"])
            except RevisionConflict as exc:
                self._send_json(409, {"error": "revision_conflict", "current_revision": exc.current_revision})
                return
            except BannerStateError as exc:
                self._send_json(400, {"error": "invalid_state", "message": str(exc)})
                return
            except OSError:
                self._send_json(500, {"error": "storage_unavailable", "message": "The local state file could not be saved."})
                return
            self._send_json(200, {"revision": revision, "state": state})

        def do_OPTIONS(self) -> None:  # noqa: N802 - BaseHTTPRequestHandler API
            # No CORS/preflight support; this is a loopback-only dev API.
            self._send_json(405, {"error": "method_not_allowed"})

    return BannerAPIHandler


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the local-only AstroCrown banner backend prototype.")
    parser.add_argument(
        "--port", type=int, default=8765,
        help="local HTTP port (default: 8765); the bind address is always 127.0.0.1",
    )
    parser.add_argument(
        "--data-file", type=Path,
        default=Path.home() / ".astrocrown" / "banner-state.json",
        help="local JSON persistence path (default: ~/.astrocrown/banner-state.json)",
    )
    args = parser.parse_args()
    if not 1 <= args.port <= 65535:
        parser.error("--port must be between 1 and 65535")
    args.data_file = args.data_file.expanduser().resolve()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), handler_for(args.data_file))
    print("AstroCrown banner backend prototype — local-only; authentication is NOT implemented.")
    print(f"Listening at http://127.0.0.1:{server.server_port}/ (not for network or production use)")
    print(f"Local state file: {args.data_file}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("Stopping local prototype.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
