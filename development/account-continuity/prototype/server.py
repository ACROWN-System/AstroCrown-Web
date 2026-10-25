#!/usr/bin/env python3
"""Loopback-only AstroCrown email-account UX prototype.

Development test harness only — not production authentication.
Uses Python standard library, SQLite, PBKDF2 and HTTP cookies.
"""
from __future__ import annotations

import argparse
import hashlib
import hmac
import json
import os
import re
import secrets
import sqlite3
import sys
import time
import uuid
from datetime import datetime, timezone
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

DEVELOPMENT_DIR = Path(__file__).resolve().parents[2]
PROTOTYPE_DIR = Path(__file__).resolve().parent
DEFAULT_DATABASE = Path.home() / ".acrown-account-prototype" / "accounts.sqlite3"
SESSION_COOKIE = "acrown_account_session"
PASSWORD_ITERATIONS = 600_000
PASSWORD_MIN_LENGTH = 15
PASSWORD_MAX_LENGTH = 1024
SESSION_LIFETIME_SECONDS = 30 * 60
MAX_BODY_BYTES = 16 * 1024
TERMS_VERSION = "development-draft-2026-10-21"
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
REFERRAL_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$")


class ApiError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status
        self.message = message


def utc_iso(timestamp: int | float | None = None) -> str:
    value = datetime.fromtimestamp(time.time() if timestamp is None else timestamp, tz=timezone.utc)
    return value.isoformat(timespec="seconds").replace("+00:00", "Z")


def normalize_email(value: object) -> str:
    if not isinstance(value, str):
        raise ApiError(400, "Enter a valid email address.")
    candidate = value.strip().lower()
    if len(candidate) > 254 or not EMAIL_RE.fullmatch(candidate):
        raise ApiError(400, "Enter a valid email address.")
    return candidate


def validate_password(value: object) -> str:
    if not isinstance(value, str):
        raise ApiError(400, "Enter your password.")
    if len(value) < PASSWORD_MIN_LENGTH:
        raise ApiError(400, "Use a passphrase at least 15 characters long.")
    if len(value) > PASSWORD_MAX_LENGTH:
        raise ApiError(400, "Password is too long for this prototype.")
    return value


def normalize_referral_id(value: object) -> str:
    if value is None:
        return ""
    if not isinstance(value, str):
        raise ApiError(400, "Enter a valid Referral ID or leave the field blank.")
    candidate = value.strip()
    if not candidate:
        return ""
    if not REFERRAL_RE.fullmatch(candidate):
        raise ApiError(400, "Enter a valid Referral ID or leave the field blank.")
    return candidate


def hash_session_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


class AccountApplication:
    """Local SQLite account store. Passwords and sessions are never logged."""

    def __init__(self, database_path: Path | str):
        self.database_path = Path(database_path).expanduser().resolve()
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        try:
            os.chmod(self.database_path.parent, 0o700)
        except OSError:
            pass
        self.rate_events: dict[tuple[str, str], list[float]] = {}
        self.dummy_salt = b"acrown-local-prototype"
        self.dummy_hash = self.hash_password("not-a-real-account-password", self.dummy_salt)
        self.initialize_database()

    def connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(str(self.database_path), timeout=10)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        return connection

    def initialize_database(self) -> None:
        with self.connect() as db:
            db.executescript(
                """
                CREATE TABLE IF NOT EXISTS accounts (
                    account_id TEXT PRIMARY KEY,
                    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
                    email TEXT,
                    password_salt BLOB NOT NULL,
                    password_hash BLOB NOT NULL,
                    created_at TEXT NOT NULL,
                    recovery_enabled INTEGER NOT NULL DEFAULT 0,
                    referral_id TEXT NOT NULL DEFAULT '',
                    newsletter_opt_in INTEGER NOT NULL DEFAULT 0,
                    newsletter_consent_at TEXT,
                    terms_version TEXT NOT NULL DEFAULT '',
                    terms_accepted_at TEXT NOT NULL DEFAULT '',
                    email_verified INTEGER NOT NULL DEFAULT 0,
                    role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'admin'))
                );
                CREATE TABLE IF NOT EXISTS sessions (
                    token_hash TEXT PRIMARY KEY,
                    account_id TEXT NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
                    created_at INTEGER NOT NULL,
                    expires_at INTEGER NOT NULL
                );
                CREATE INDEX IF NOT EXISTS sessions_account_idx ON sessions(account_id);
                """
            )
            # Upgrade an older local test database in place. The old username value
            # is retained as a legacy value; real users/data must never use this prototype.
            columns = {row["name"] for row in db.execute("PRAGMA table_info(accounts)").fetchall()}
            migrations = {
                "email": "TEXT",
                "referral_id": "TEXT NOT NULL DEFAULT ''",
                "newsletter_opt_in": "INTEGER NOT NULL DEFAULT 0",
                "newsletter_consent_at": "TEXT",
                "terms_version": "TEXT NOT NULL DEFAULT ''",
                "terms_accepted_at": "TEXT NOT NULL DEFAULT ''",
                "email_verified": "INTEGER NOT NULL DEFAULT 0",
                "role": "TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'admin'))",
            }
            for name, definition in migrations.items():
                if name not in columns:
                    db.execute(f"ALTER TABLE accounts ADD COLUMN {name} {definition}")
            db.execute("UPDATE accounts SET email = username WHERE email IS NULL OR email = ''")
            db.execute("CREATE UNIQUE INDEX IF NOT EXISTS accounts_email_ci_idx ON accounts(email COLLATE NOCASE)")
        try:
            os.chmod(self.database_path, 0o600)
        except OSError:
            pass

    @staticmethod
    def hash_password(password: str, salt: bytes) -> bytes:
        return hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), salt, PASSWORD_ITERATIONS, dklen=32
        )

    def rate_allowed(self, action: str, subject: str, limit: int = 10, window: int = 60) -> bool:
        now = time.monotonic()
        key = (action, subject)
        recent = [value for value in self.rate_events.get(key, []) if now - value < window]
        if len(recent) >= limit:
            self.rate_events[key] = recent
            return False
        recent.append(now)
        self.rate_events[key] = recent
        return True

    def verify_password(self, account: sqlite3.Row | None, password: str) -> bool:
        if account is None:
            candidate = self.hash_password(password, self.dummy_salt)
            hmac.compare_digest(candidate, self.dummy_hash)
            return False
        candidate = self.hash_password(password, bytes(account["password_salt"]))
        return hmac.compare_digest(candidate, bytes(account["password_hash"]))

    def new_session(self, account_id: str) -> tuple[str, int]:
        token = secrets.token_urlsafe(32)
        now = int(time.time())
        expires = now + SESSION_LIFETIME_SECONDS
        with self.connect() as db:
            db.execute("DELETE FROM sessions WHERE expires_at <= ?", (now,))
            db.execute(
                "INSERT INTO sessions(token_hash, account_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
                (hash_session_token(token), account_id, now, expires),
            )
        return token, expires

    def account_for_session(self, token: str | None) -> tuple[sqlite3.Row | None, int | None]:
        if not token:
            return None, None
        now = int(time.time())
        with self.connect() as db:
            row = db.execute(
                """SELECT a.*, s.expires_at FROM sessions s
                   JOIN accounts a ON a.account_id = s.account_id
                   WHERE s.token_hash = ? AND s.expires_at > ?""",
                (hash_session_token(token), now),
            ).fetchone()
            if row is None:
                db.execute("DELETE FROM sessions WHERE token_hash = ?", (hash_session_token(token),))
                return None, None
            return row, int(row["expires_at"])

    @staticmethod
    def account_summary(account: sqlite3.Row, expires_at: int | None) -> dict:
        return {
            "authenticated": True,
            "email": account["email"] or account["username"],
            "createdAt": account["created_at"],
            "referralId": account["referral_id"] or "",
            "newsletterOptIn": bool(account["newsletter_opt_in"]),
            "newsletterConsentAt": account["newsletter_consent_at"],
            "termsAccepted": bool(account["terms_accepted_at"]),
            "termsVersion": account["terms_version"],
            "termsAcceptedAt": account["terms_accepted_at"],
            "emailVerified": bool(account["email_verified"]),
            "passwordResetAvailable": False,
            "sessionExpiresAt": utc_iso(expires_at) if expires_at else None,
            "scope": "local-test-account-only",
            # The role is server-owned. A role assignment alone never grants
            # admin access; this prototype has no admin-wallet verification or
            # privileged-session implementation, so all admin authorization
            # flags deliberately remain false.
            "role": account["role"],
            "adminRoleAssigned": account["role"] == "admin",
            "adminWalletAuthenticated": False,
            "adminSessionAuthorized": False,
            "admin": False,
        }

    def handle(self, path: str, payload: dict, handler: BaseHTTPRequestHandler) -> tuple[int, dict, str | None]:
        """Return (status, JSON, optional Set-Cookie header)."""
        if path == "/api/account/status":
            account, expires = self.account_for_session(self.get_cookie(handler))
            if account is None:
                return 200, {
                    "authenticated": False,
                    "role": "user",
                    "adminRoleAssigned": False,
                    "adminWalletAuthenticated": False,
                    "adminSessionAuthorized": False,
                    "admin": False,
                    "passwordResetAvailable": False,
                }, None
            return 200, self.account_summary(account, expires), None

        if path == "/api/account/register":
            email = normalize_email(payload.get("email"))
            password = validate_password(payload.get("password"))
            referral_id = normalize_referral_id(payload.get("referralId", ""))
            if payload.get("termsAccepted") is not True:
                raise ApiError(400, "Accept the Terms of Use and Privacy Policy to create an account.")
            if payload.get("termsVersion") != TERMS_VERSION:
                raise ApiError(400, "The development Terms of Use and Privacy Policy version is not acknowledged.")
            newsletter_opt_in = payload.get("newsletterOptIn", False)
            if not isinstance(newsletter_opt_in, bool):
                raise ApiError(400, "The optional email-news preference must be true or false.")
            if not self.rate_allowed("register", email, limit=5):
                raise ApiError(429, "Too many account-creation attempts for this email. Try again shortly.")
            salt = secrets.token_bytes(16)
            encoded = self.hash_password(password, salt)
            account_id = str(uuid.uuid4())
            created_at = utc_iso()
            newsletter_consent_at = created_at if newsletter_opt_in else None
            terms_accepted_at = created_at
            try:
                with self.connect() as db:
                    db.execute(
                        """INSERT INTO accounts(
                               account_id, username, email, password_salt, password_hash, created_at,
                               referral_id, newsletter_opt_in, newsletter_consent_at,
                               terms_version, terms_accepted_at, email_verified
                           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)""",
                        (
                            account_id, email, email, salt, encoded, created_at, referral_id,
                            int(newsletter_opt_in), newsletter_consent_at, TERMS_VERSION, terms_accepted_at,
                        ),
                    )
            except sqlite3.IntegrityError:
                raise ApiError(409, "An account with this email already exists. Try Log In.")
            token, expires = self.new_session(account_id)
            with self.connect() as db:
                account = db.execute("SELECT * FROM accounts WHERE account_id = ?", (account_id,)).fetchone()
            result = self.account_summary(account, expires)
            result["message"] = (
                "Development test account created. Email is not verified and no email or newsletter message was sent."
            )
            return 201, result, self.cookie_header(token)

        if path == "/api/account/login":
            email = normalize_email(payload.get("email"))
            password = payload.get("password")
            if not isinstance(password, str) or len(password) > PASSWORD_MAX_LENGTH:
                raise ApiError(400, "Enter your email address and password.")
            if not self.rate_allowed("login", email, limit=10):
                raise ApiError(429, "Too many sign-in attempts. Wait a minute before trying again.")
            with self.connect() as db:
                account = db.execute("SELECT * FROM accounts WHERE email = ? COLLATE NOCASE", (email,)).fetchone()
            if not self.verify_password(account, password):
                raise ApiError(401, "Email address or password did not match.")
            self.rate_events.pop(("login", email), None)
            token, expires = self.new_session(account["account_id"])
            with self.connect() as db:
                account = db.execute("SELECT * FROM accounts WHERE account_id = ?", (account["account_id"],)).fetchone()
            return 200, self.account_summary(account, expires), self.cookie_header(token)

        if path == "/api/account/logout":
            token = self.get_cookie(handler)
            if token:
                with self.connect() as db:
                    db.execute("DELETE FROM sessions WHERE token_hash = ?", (hash_session_token(token),))
            return 200, {"authenticated": False, "message": "You have signed out."}, self.clear_cookie_header()

        if path == "/api/account/password-reset/request":
            raise ApiError(
                501,
                "Email-based password reset is not enabled in this development prototype. No email was sent.",
            )

        raise ApiError(404, "That local account action is not available.")

    @staticmethod
    def get_cookie(handler: BaseHTTPRequestHandler) -> str | None:
        try:
            cookie = SimpleCookie()
            cookie.load(handler.headers.get("Cookie", ""))
            morsel = cookie.get(SESSION_COOKIE)
            return morsel.value if morsel else None
        except Exception:
            return None

    @staticmethod
    def cookie_header(token: str) -> str:
        # The prototype uses HTTP only on loopback. Production must use HTTPS and Secure cookies.
        return f"{SESSION_COOKIE}={token}; Path=/; HttpOnly; SameSite=Strict; Max-Age={SESSION_LIFETIME_SECONDS}"

    @staticmethod
    def clear_cookie_header() -> str:
        return f"{SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0"


def make_handler(application: AccountApplication):
    class Handler(BaseHTTPRequestHandler):
        server_version = "AstroCrownLocalAccountPrototype/0.2"
        sys_version = ""

        def log_message(self, _format: str, *_args) -> None:
            # Do not log email addresses, request bodies, cookies or passwords.
            return

        def common_headers(self, content_type: str) -> None:
            self.send_header("Content-Type", content_type)
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("X-Frame-Options", "DENY")
            self.send_header("Referrer-Policy", "no-referrer")
            self.send_header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
            self.send_header(
                "Content-Security-Policy",
                "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; "
                "script-src 'self' 'unsafe-inline'; connect-src 'self'; form-action 'self'; "
                "frame-ancestors 'none'; base-uri 'self'",
            )

        def json_response(self, status: int, payload: dict, cookie: str | None = None) -> None:
            data = json.dumps(payload, separators=(",", ":")).encode("utf-8")
            self.send_response(status)
            self.common_headers("application/json; charset=utf-8")
            if cookie:
                self.send_header("Set-Cookie", cookie)
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        def html_or_asset(self, path: str) -> None:
            allowed = {
                "/": (DEVELOPMENT_DIR / "index.html", "text/html; charset=utf-8"),
                "/index.html": (DEVELOPMENT_DIR / "index.html", "text/html; charset=utf-8"),
                "/account-continuity/prototype/account-prototype.css": (
                    PROTOTYPE_DIR / "account-prototype.css", "text/css; charset=utf-8"
                ),
                "/account-continuity/prototype/account-ui.js": (
                    PROTOTYPE_DIR / "account-ui.js", "text/javascript; charset=utf-8"
                ),
                "/account-continuity/prototype/terms-of-use.html": (
                    PROTOTYPE_DIR / "terms-of-use.html", "text/html; charset=utf-8"
                ),
                "/account-continuity/prototype/privacy-policy.html": (
                    PROTOTYPE_DIR / "privacy-policy.html", "text/html; charset=utf-8"
                ),
                "/account-continuity/prototype/security-assurance.html": (
                    PROTOTYPE_DIR / "security-assurance.html", "text/html; charset=utf-8"
                ),
            }
            target = allowed.get(path)
            if target is None:
                self.json_response(404, {"error": "That local preview resource was not found."})
                return
            file_path, media_type = target
            try:
                data = file_path.read_bytes()
            except OSError:
                self.json_response(500, {"error": "A required local preview file is unavailable."})
                return
            self.send_response(200)
            self.common_headers(media_type)
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        def canonical_host_ok(self) -> bool:
            return self.headers.get("Host", "") == f"localhost:{self.server.server_port}"

        def do_GET(self) -> None:
            if not self.canonical_host_ok():
                self.json_response(403, {"error": "Open the preview using its exact localhost address."})
                return
            path = urlsplit(self.path).path
            if path == "/api/account/status":
                self.json_response(*application.handle(path, {}, self))
                return
            self.html_or_asset(path)

        def do_POST(self) -> None:
            if not self.canonical_host_ok():
                self.json_response(403, {"error": "Open the preview using its exact localhost address."})
                return
            expected_origin = f"http://localhost:{self.server.server_port}"
            if self.headers.get("Origin") != expected_origin:
                self.json_response(403, {"error": "The local request origin could not be verified."})
                return
            if self.headers.get("Content-Type", "").split(";", 1)[0].strip().lower() != "application/json":
                self.json_response(415, {"error": "This local endpoint accepts JSON requests only."})
                return
            try:
                length = int(self.headers.get("Content-Length", "0"))
            except ValueError:
                self.json_response(400, {"error": "The request length is invalid."})
                return
            if length < 0:
                self.json_response(400, {"error": "The request length is invalid."})
                return
            if length > MAX_BODY_BYTES:
                self.json_response(413, {"error": "The request is too large for this local prototype."})
                return
            body = self.rfile.read(length)
            try:
                payload = json.loads(body.decode("utf-8"))
                if not isinstance(payload, dict):
                    raise ValueError("JSON body must be an object")
            except (UnicodeDecodeError, json.JSONDecodeError, ValueError):
                self.json_response(400, {"error": "Enter a valid JSON request."})
                return
            try:
                status, response, cookie = application.handle(urlsplit(self.path).path, payload, self)
            except ApiError as error:
                self.json_response(error.status, {"error": error.message})
                return
            except Exception:
                # Do not return internal exception details or secrets to the browser.
                self.json_response(500, {"error": "The local prototype encountered an unexpected error."})
                return
            self.json_response(status, response, cookie)

        def do_HEAD(self) -> None:
            if not self.canonical_host_ok():
                self.send_response(403)
                self.end_headers()
                return
            self.send_response(200)
            self.common_headers("text/html; charset=utf-8")
            self.end_headers()

        def do_OPTIONS(self) -> None:
            self.json_response(405, {"error": "Cross-origin requests are not enabled in this prototype."})

    return Handler


def create_server(application: AccountApplication, port: int = 8766) -> ThreadingHTTPServer:
    server = ThreadingHTTPServer(("127.0.0.1", port), make_handler(application))
    server.daemon_threads = True
    return server


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run a loopback-only AstroCrown account prototype.")
    parser.add_argument("--port", type=int, default=8766, help="Local port; default: 8766")
    parser.add_argument("--db", type=Path, default=DEFAULT_DATABASE, help="Local SQLite path; defaults to your home profile.")
    args = parser.parse_args(argv)
    if not 1024 <= args.port <= 65535:
        parser.error("port must be between 1024 and 65535")
    application = AccountApplication(args.db)
    try:
        server = create_server(application, args.port)
    except OSError as exc:
        print("Unable to start the local account prototype. The port may already be in use.", file=sys.stderr)
        print(str(exc), file=sys.stderr)
        return 2
    print("AstroCrown email-account prototype (development only)")
    print("Open exactly: http://localhost:" + str(args.port) + "/")
    print("Bound to 127.0.0.1 only. No external account provider or wallet is used.")
    print("Local database: " + str(application.database_path))
    print("No email verification, password-reset delivery or newsletter delivery is configured.")
    print("Do not use real credentials, production accounts or wallet secrets.")
    print("Press Ctrl+C to stop.")
    try:
        server.serve_forever(poll_interval=0.25)
    except KeyboardInterrupt:
        print("\nStopping the local account prototype.")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
