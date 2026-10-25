"""Loopback-only AstroCrown SIWE test prototype.

This is an isolated development experiment, not production authentication.
It binds only to 127.0.0.1, stores challenges/sessions in memory, and never
broadcasts transactions or stores wallet secrets.
"""
from __future__ import annotations

import argparse
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit


HOST = "127.0.0.1"
PORT = 8765
SESSION_COOKIE = "acrown_local_session"
MAX_BODY_BYTES = 16_384
APP_DIR = Path(__file__).resolve().parent
from wallet_auth_core import (
    AuthenticationError,
    CHALLENGE_TTL,
    SESSION_TTL,
    WalletAuthService,
)




def reject_duplicate_json_keys(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("Duplicate JSON key")
        result[key] = value
    return result


class WalletHandler(BaseHTTPRequestHandler):
    """Serve only the prototype's small local UI and same-origin API."""

    server_version = "AstroCrownLocalWalletTest/0.1"
    sys_version = ""

    def log_message(self, format_string: str, *args: Any) -> None:
        # Do not log request bodies, client IPs, wallet addresses, signatures,
        # nonces or cookie values from authentication operations.
        return

    def _security_headers(self) -> None:
        self.send_header(
            "Content-Security-Policy",
            "default-src 'self'; script-src 'self'; style-src 'self'; "
            "connect-src 'self'; object-src 'none'; base-uri 'none'; "
            "frame-ancestors 'none'; form-action 'self'",
        )
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Cache-Control", "no-store")

    def _respond_bytes(
        self, status: int, payload: bytes, content_type: str
    ) -> None:
        self.send_response(status)
        self._security_headers()
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def _json(self, status: int, value: dict[str, Any], cookie: str | None = None) -> None:
        payload = json.dumps(value, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self._security_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        if cookie is not None:
            self.send_header("Set-Cookie", cookie)
        self.end_headers()
        self.wfile.write(payload)

    def _host_is_expected(self) -> bool:
        return self.headers.get("Host", "").lower() == self.server.local_host.lower()

    def _origin_is_expected(self) -> bool:
        return self.headers.get("Origin") == self.server.local_origin

    def _request_is_same_origin(self, require_origin: bool) -> bool:
        if not self._host_is_expected():
            return False
        origin = self.headers.get("Origin")
        if require_origin:
            if origin != self.server.local_origin:
                return False
        elif origin is not None and origin != self.server.local_origin:
            return False
        fetch_site = self.headers.get("Sec-Fetch-Site")
        # A direct top-level browser navigation normally sends "none", not
        # "same-origin". Permit that only for GET-style requests that do not
        # require an Origin header; all POST API calls must be same-origin.
        if fetch_site:
            allowed_fetch_sites = {"same-origin"} if require_origin else {"same-origin", "none"}
            if fetch_site not in allowed_fetch_sites:
                return False
        return True

    def _read_json(self) -> dict[str, Any]:
        if self.headers.get("Content-Type", "").split(";", 1)[0].strip().lower() != "application/json":
            raise AuthenticationError("Content-Type must be application/json.")
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            raise AuthenticationError("Invalid Content-Length.") from None
        if length <= 0 or length > MAX_BODY_BYTES:
            raise AuthenticationError("Request body size is invalid.")
        try:
            data = self.rfile.read(length).decode("utf-8")
            value = json.loads(data, object_pairs_hook=reject_duplicate_json_keys)
        except (UnicodeDecodeError, json.JSONDecodeError, ValueError):
            raise AuthenticationError("Request body must be valid JSON.") from None
        if not isinstance(value, dict):
            raise AuthenticationError("Request JSON must be an object.")
        return value

    def _session_cookie(self) -> str | None:
        raw_cookie = self.headers.get("Cookie", "")
        for part in raw_cookie.split(";"):
            key, separator, value = part.strip().partition("=")
            if separator and key == SESSION_COOKIE:
                return value or None
        return None

    def do_GET(self) -> None:
        if not self._request_is_same_origin(require_origin=False) or "?" in self.path:
            self._json(403, {"error": "Request origin or host was rejected."})
            return
        if self.path == "/":
            self._respond_bytes(
                200,
                (APP_DIR / "index.html").read_bytes(),
                "text/html; charset=utf-8",
            )
        elif self.path == "/app.js":
            self._respond_bytes(
                200,
                (APP_DIR / "app.js").read_bytes(),
                "text/javascript; charset=utf-8",
            )
        elif self.path == "/app.css":
            self._respond_bytes(
                200,
                (APP_DIR / "app.css").read_bytes(),
                "text/css; charset=utf-8",
            )
        elif self.path == "/api/session":
            self._json(
                200, self.server.auth_service.read_session(self._session_cookie())
            )
        else:
            self._json(404, {"error": "Not found."})

    def do_POST(self) -> None:
        if not self._request_is_same_origin(require_origin=True) or "?" in self.path:
            self._json(403, {"error": "Request origin or host was rejected."})
            return
        try:
            data = self._read_json()
            if self.path == "/api/challenge":
                if set(data) != {"address", "chainId"}:
                    raise AuthenticationError("Unexpected challenge request fields.")
                result = self.server.auth_service.issue_challenge(
                    data["address"], data["chainId"]
                )
                self._json(200, result)
                return
            if self.path == "/api/verify":
                if set(data) != {"message", "signature"}:
                    raise AuthenticationError("Unexpected verification request fields.")
                token, address = self.server.auth_service.verify_signature(
                    data["message"], data["signature"]
                )
                cookie = (
                    f"{SESSION_COOKIE}={token}; HttpOnly; SameSite=Strict; "
                    f"Path=/; Max-Age={int(SESSION_TTL.total_seconds())}"
                )
                self._json(200, {"authenticated": True, "address": address}, cookie)
                return
            if self.path == "/api/logout":
                if set(data) != set():
                    raise AuthenticationError("Unexpected logout request fields.")
                self.server.auth_service.revoke_session(self._session_cookie())
                self._json(
                    200,
                    {"authenticated": False},
                    f"{SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
                )
                return
            self._json(404, {"error": "Not found."})
        except AuthenticationError as exc:
            status = 401 if self.path == "/api/verify" else 400
            self._json(status, {"error": str(exc)})
        except (KeyError, TypeError):
            self._json(400, {"error": "Request fields are invalid."})

    def do_OPTIONS(self) -> None:
        self._json(405, {"error": "Method not allowed."})

    def _unsupported_method(self) -> None:
        self._json(405, {"error": "Method not allowed."})

    do_PUT = _unsupported_method
    do_PATCH = _unsupported_method
    do_DELETE = _unsupported_method


def build_server(port: int = PORT) -> ThreadingHTTPServer:
    if type(port) is not int or not 0 <= port <= 65535:
        raise ValueError("Port must be an integer from 0 to 65535.")
    server = ThreadingHTTPServer((HOST, port), WalletHandler)
    server.daemon_threads = True
    server.local_host = f"localhost:{server.server_port}"
    server.local_origin = f"http://{server.local_host}"
    server.auth_service = WalletAuthService(
        domain=server.local_host, uri=f"{server.local_origin}/"
    )
    return server


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the local-only wallet test server.")
    parser.add_argument(
        "--port", type=int, default=PORT,
        help="loopback port to use (default: %(default)s; 0 selects an ephemeral port)",
    )
    args = parser.parse_args()
    server = build_server(port=args.port)
    print(
        "Local-only wallet test server listening at "
        f"{server.local_origin}/ (bound to {HOST})."
    )
    print("Stop with Ctrl+C. Do not expose this server to any network.")
    try:
        server.serve_forever(poll_interval=0.25)
    except KeyboardInterrupt:
        print("\nLocal wallet test server stopped.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
