#!/usr/bin/env python3
"""Disposable HTTPS browser-test adapter for the AstroCrown passkey prototype."""
from __future__ import annotations

import argparse
import base64
import hmac
import queue
import re
import secrets
import shutil
import socket
import subprocess
import sys
import tempfile
import threading
import time
from pathlib import Path
from urllib.parse import urlsplit

import server as account_server

GATE_USERNAME = "acrown-test"
MAX_FAILED_CODES = 8
MAX_RUNTIME_SECONDS = 4 * 60 * 60
TUNNEL_PATTERN = re.compile(r"https://([a-z0-9-]+\.trycloudflare\.com)", re.IGNORECASE)


def parse_quick_tunnel_url(value: str) -> tuple[str, str]:
    """Reject arbitrary URLs: only a bare HTTPS one-label Quick Tunnel host is valid."""
    if not isinstance(value, str) or len(value) > 512:
        raise ValueError("Cloudflare did not return a valid Quick Tunnel URL.")
    try:
        parts = urlsplit(value.strip())
        port = parts.port
    except ValueError:
        raise ValueError("Cloudflare returned a malformed Quick Tunnel URL.") from None
    host = (parts.hostname or "").lower()
    if (
        parts.scheme != "https" or parts.username is not None or parts.password is not None
        or port is not None or parts.path not in {"", "/"} or parts.query or parts.fragment
        or not host.endswith(".trycloudflare.com")
    ):
        raise ValueError("Only an exact HTTPS trycloudflare.com origin is accepted.")
    label = host[:-len(".trycloudflare.com")]
    if "." in label or not re.fullmatch(r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?", label):
        raise ValueError("Cloudflare returned an invalid Quick Tunnel hostname.")
    return "https://" + host, host


def basic_auth_matches(header: str | None, username: str, password: str) -> bool:
    """Validate Basic auth without storing the supplied credential."""
    if not isinstance(header, str) or len(header) > 2048:
        return False
    scheme, separator, token = header.partition(" ")
    if not separator or scheme.lower() != "basic" or not token.strip():
        return False
    expected = base64.b64encode((username + ":" + password).encode("utf-8")).decode("ascii")
    return hmac.compare_digest(token.strip(), expected)


def available_port(requested: int) -> int:
    if requested:
        if not 1024 <= requested <= 65535:
            raise ValueError("Choose a local port from 1024 through 65535, or use --port 0.")
        with socket.socket() as probe:
            try:
                probe.bind(("127.0.0.1", requested))
            except OSError:
                raise ValueError("That local port is in use; rerun with --port 0.") from None
        return requested
    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 0))
        return int(probe.getsockname()[1])


def stop_process(process: subprocess.Popen | None) -> None:
    if process is None or process.poll() is not None:
        return
    process.terminate()
    try:
        process.wait(timeout=8)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait(timeout=5)


def start_quick_tunnel(executable: str, port: int, timeout: int = 90):
    process = subprocess.Popen(
        [executable, "tunnel", "--url", "http://127.0.0.1:" + str(port)],
        stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
        text=True, encoding="utf-8", errors="replace", bufsize=1,
    )
    lines: queue.Queue[str | None] = queue.Queue()

    def capture_output() -> None:
        assert process.stdout is not None
        for line in process.stdout:
            lines.put(line.rstrip()[:500])
        lines.put(None)

    threading.Thread(target=capture_output, daemon=True, name="cloudflared-output").start()
    deadline = time.monotonic() + timeout
    recent: list[str] = []
    try:
        while time.monotonic() < deadline:
            if process.poll() is not None:
                break
            try:
                line = lines.get(timeout=0.5)
            except queue.Empty:
                continue
            if line is None:
                break
            recent.append(line)
            recent = recent[-8:]
            match = TUNNEL_PATTERN.search(line)
            if match:
                return process, "https://" + match.group(1)
        raise RuntimeError(
            "Cloudflare Quick Tunnel did not start within the expected period."
            + ("\n" + "\n".join(recent) if recent else "")
        )
    except Exception:
        stop_process(process)
        raise


def build_handler(application, origin: str, password: str, started: float, port: int):
    """Add one-host, Basic-auth and external-Origin checks to the loopback handler."""
    expected_host = urlsplit(origin).netloc
    internal_origin = "http://localhost:" + str(port)
    base_handler = account_server.make_handler(application)
    gate_lock = threading.Lock()
    gate_state = {"failures": 0}

    class LiveTestHandler(base_handler):
        server_version = "AstroCrownTemporaryPasskeyTest/1.0"
        sys_version = ""

        def canonical_host_ok(self) -> bool:
            return self.headers.get("Host", "").lower() == expected_host

        def common_headers(self, content_type: str) -> None:
            super().common_headers(content_type)
            self.send_header("Strict-Transport-Security", "max-age=86400")
            self.send_header("X-Robots-Tag", "noindex, nofollow, noarchive")

        def reject(self, status: int, message: str = "", challenge: bool = False) -> None:
            self.send_response(status)
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("X-Robots-Tag", "noindex, nofollow, noarchive")
            if challenge:
                self.send_header("WWW-Authenticate", 'Basic realm="AstroCrown temporary test", charset="UTF-8"')
            body = message.encode("utf-8")
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            if body:
                self.wfile.write(body)

        def gate(self) -> bool:
            if time.monotonic() - started >= MAX_RUNTIME_SECONDS:
                self.reject(410, "This temporary test session has expired.")
                return False
            if not self.canonical_host_ok():
                self.reject(403, "The request Host does not match this test session.")
                return False
            header = self.headers.get("Authorization")
            if not header:
                self.reject(401, challenge=True)
                return False
            with gate_lock:
                if gate_state["failures"] >= MAX_FAILED_CODES:
                    self.reject(429, "Too many incorrect access codes. Restart the test session.")
                    return False
                if basic_auth_matches(header, GATE_USERNAME, password):
                    return True
                gate_state["failures"] += 1
            self.reject(401, "The temporary access code was not accepted.", challenge=True)
            return False

        def do_GET(self) -> None:
            if self.gate():
                super().do_GET()

        def do_HEAD(self) -> None:
            if self.gate():
                super().do_HEAD()

        def do_POST(self) -> None:
            if not self.gate():
                return
            if self.headers.get("Origin") != origin:
                self.json_response(403, {"error": "The browser Origin did not match this temporary HTTPS test host."})
                return
            external_origin = self.headers.get("Origin")
            self.headers.replace_header("Origin", internal_origin)
            try:
                super().do_POST()
            finally:
                self.headers.replace_header("Origin", external_origin)

        def do_OPTIONS(self) -> None:
            if self.gate():
                self.reject(405, "Cross-origin requests are not enabled in this test.")

        def html_or_asset(self, path: str) -> None:
            if path not in {"/", "/index.html"}:
                super().html_or_asset(path)
                return
            page = (account_server.DEVELOPMENT_DIR / "index.html").read_text(encoding="utf-8")
            old_ribbon = "Visual review build&nbsp; / &nbsp;illustrative market values&nbsp; / &nbsp;no live services connected"
            new_ribbon = "TEMPORARY HTTPS PASSKEY TEST&nbsp; / &nbsp;SYNTHETIC DATA ONLY&nbsp; / &nbsp;DISPOSABLE SESSION"
            if old_ribbon not in page:
                self.json_response(500, {"error": "The homepage ribbon did not match the live-test adapter."})
                return
            page = page.replace(old_ribbon, new_ribbon, 1)
            warning = """
<div class="acrown-live-test-warning" role="alert">
<strong>Temporary live test — synthetic information only.</strong>
This page uses a disposable account backend through a public Cloudflare Quick Tunnel. Use only invented test details and a brand-new test passkey. Never enter production account data, personal recovery keys, wallet secrets or real assets. Cloudflare processes traffic at its public edge. The local temporary database is deleted on normal shutdown. This is not a production service.
</div>
<style>
.acrown-live-test-warning{max-width:1240px;margin:12px auto;padding:12px 16px;border:1px solid rgba(255,190,90,.45);border-radius:10px;background:#261b12;color:#ffe7c7;font:600 12px/1.55 system-ui,sans-serif}
.acrown-live-test-warning strong{color:#fff1d8}
</style>
"""
            page = page.replace(new_ribbon, new_ribbon + warning, 1)
            wallet_guard = """
<script>
(function(){
  "use strict";
  var button=document.getElementById("wallet-connect-trigger");
  if(button){button.disabled=true;button.setAttribute("aria-disabled","true");button.title="Wallet connection is disabled in this passkey-only test.";}
  document.addEventListener("click",function(event){
    var target=event.target;
    var blocked=target&&target.closest?target.closest("#wallet-connect-trigger,#wallet-menu"):null;
    if(blocked){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();}
  },true);
}());
</script>
"""
            page = page.replace("</body>", wallet_guard + "\n</body>", 1)
            body = page.encode("utf-8")
            self.send_response(200)
            self.common_headers("text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

    return LiveTestHandler


def configure_https_passkey_service(application, origin: str, hostname: str) -> None:
    if account_server.PasskeyAuthService is None:
        raise RuntimeError("The pinned WebAuthn library is unavailable; install the prototype requirements first.")
    application.passkey_auth_service = account_server.PasskeyAuthService(
        rp_id=hostname, rp_name="AstroCrown Temporary Test", origin=origin
    )
    # Administrator wallet authentication is intentionally disabled for this
    # passkey-only shared test. This runner never provisions an admin account.
    application.wallet_auth_service = None
    cookie_header = application.cookie_header
    clear_cookie_header = application.clear_cookie_header
    application.cookie_header = lambda token: cookie_header(token) + "; Secure"
    application.clear_cookie_header = lambda: clear_cookie_header() + "; Secure"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Start a disposable HTTPS AstroCrown passkey test website.")
    parser.add_argument("--port", type=int, default=0, help="Loopback port; 0 selects a free port.")
    parser.add_argument("--cloudflared", default=None, help="Optional path to the cloudflared executable.")
    args = parser.parse_args(argv)
    executable = args.cloudflared or shutil.which("cloudflared")
    if not executable:
        print("cloudflared was not found. Install the official executable and add it to PATH.", file=sys.stderr)
        print("https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/", file=sys.stderr)
        return 2
    try:
        port = available_port(args.port)
    except ValueError as error:
        print(str(error), file=sys.stderr)
        return 2

    tunnel = None
    server = None
    expiry = None
    started = time.monotonic()
    password = secrets.token_urlsafe(32)
    try:
        print("Starting a temporary Cloudflare Quick Tunnel. No account, custom domain, API token or payment is required.")
        tunnel, tunnel_url = start_quick_tunnel(executable, port)
        origin, hostname = parse_quick_tunnel_url(tunnel_url)
        from http.server import ThreadingHTTPServer
        with tempfile.TemporaryDirectory(prefix="acrown-passkey-live-test-") as temporary:
            database = Path(temporary) / "disposable-accounts.sqlite3"
            application = account_server.AccountApplication(database)
            configure_https_passkey_service(application, origin, hostname)
            handler = build_handler(application, origin, password, started, port)
            server = ThreadingHTTPServer(("127.0.0.1", port), handler)
            server.daemon_threads = True
            expiry = threading.Timer(MAX_RUNTIME_SECONDS, server.shutdown)
            expiry.daemon = True
            expiry.start()
            print("")
            print("ASTROCROWN — TEMPORARY HTTPS PASSKEY TEST")
            print("Website: " + origin + "/?account-live-test=1")
            print("HTTP Basic username: " + GATE_USERNAME)
            print("HTTP Basic access code: " + password)
            print("")
            print("Use only synthetic details and a new passkey for this temporary hostname.")
            print("Do not use production account data, recovery keys, wallets or real assets.")
            print("Wallet controls are disabled. Maximum session: four hours.")
            print("Press Ctrl+C to stop the server/tunnel and remove the temporary database.")
            server.serve_forever(poll_interval=0.5)
    except KeyboardInterrupt:
        print("\nStopping temporary passkey test.")
    except Exception as error:
        print("Unable to start temporary HTTPS passkey test: " + str(error), file=sys.stderr)
        return 2
    finally:
        if expiry is not None:
            expiry.cancel()
        if server is not None:
            server.server_close()
        stop_process(tunnel)
        print("Temporary test server and tunnel stopped.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
