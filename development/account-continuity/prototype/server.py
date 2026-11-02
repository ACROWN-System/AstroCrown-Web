#!/usr/bin/env python3
"""Loopback-only AstroCrown email-account UX prototype.

Development test harness only — not production authentication.
Uses Python standard library, SQLite, PBKDF2 and HTTP cookies.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import sqlite3
import sys
import time
import threading
import uuid
from datetime import datetime, timezone
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlencode, urlsplit

try:
    from passkey_auth import PasskeyAuthService, PasskeyUnavailable, PasskeyVerificationError
except ImportError:
    PasskeyAuthService = None
    PasskeyUnavailable = RuntimeError
    PasskeyVerificationError = ValueError

try:
    from .email_delivery import EmailDeliveryError, EmailSendBudget, SMTPEmailSender
except ImportError:  # Direct script execution
    from email_delivery import EmailDeliveryError, EmailSendBudget, SMTPEmailSender

_AUTO_EMAIL_SENDER = object()

DEVELOPMENT_DIR = Path(__file__).resolve().parents[2]
PROTOTYPE_DIR = Path(__file__).resolve().parent
DEFAULT_DATABASE = Path.home() / ".acrown-account-prototype" / "accounts.sqlite3"
SESSION_COOKIE = "acrown_account_session"
PASSWORD_ITERATIONS = 600_000
PASSWORD_MIN_LENGTH = 15
PASSWORD_MAX_LENGTH = 1024
SESSION_LIFETIME_SECONDS = 30 * 60
MAX_BODY_BYTES = 16 * 1024
TERMS_VERSION = "development-terms-2026-10-31-v0.3"
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
REFERRAL_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$")
AVATAR_IDS = frozenset({"person", "crown", "star", "moon", "orbit", "shield"})
ADMIN_WALLET_SESSION_SECONDS = 10 * 60
ADMIN_PERMISSION_NAMES = frozenset({"admin.roles.grant", "admin.roles.revoke"})
AUTH_PROTOTYPE_DIR = DEVELOPMENT_DIR / "auth-prototype"

# Keep ordinary email account UX available in a stdlib-only local environment.
# Admin wallet proof-of-control fails closed when the pinned SIWE dependencies
# are not installed; no mocked or client-only administrator login is allowed.
if str(AUTH_PROTOTYPE_DIR) not in sys.path:
    sys.path.insert(0, str(AUTH_PROTOTYPE_DIR))
try:
    from wallet_auth_core import (
        AuthenticationError as WalletAuthenticationError,
        CHALLENGE_TTL as WALLET_CHALLENGE_TTL,
        WalletAuthService,
        parse_address as parse_wallet_address,
        parse_chain_id as parse_wallet_chain_id,
    )
    WALLET_AUTH_IMPORT_ERROR = None
except ImportError as wallet_import_error:
    WalletAuthenticationError = None
    WALLET_CHALLENGE_TTL = None
    WalletAuthService = None
    parse_wallet_address = None
    parse_wallet_chain_id = None
    WALLET_AUTH_IMPORT_ERROR = type(wallet_import_error).__name__

try:
    from case_management import CaseError, CaseStore
except ImportError as case_import_error:
    CaseError = None
    CaseStore = None
    CASE_IMPORT_ERROR = type(case_import_error).__name__
else:
    CASE_IMPORT_ERROR = None


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

    def __init__(
        self,
        database_path: Path | str,
        *,
        email_sender: object = _AUTO_EMAIL_SENDER,
        public_base_url: str | None = None,
        enable_legacy_email_auth: bool = False,
    ):
        self.enable_legacy_email_auth = bool(enable_legacy_email_auth)
        self.database_path = Path(database_path).expanduser().resolve()
        if email_sender is _AUTO_EMAIL_SENDER:
            self.email_sender, configured_base_url = SMTPEmailSender.from_environment()
            self.email_public_base_url = configured_base_url
        else:
            self.email_sender = email_sender
            self.email_public_base_url = None
        if public_base_url is not None:
            self.email_public_base_url = SMTPEmailSender.validate_public_base_url(public_base_url)
        if self.email_sender is not None and not self.email_public_base_url:
            raise RuntimeError("Email delivery requires a configured public base URL.")
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        try:
            os.chmod(self.database_path.parent, 0o700)
        except OSError:
            pass
        self.rate_events: dict[tuple[str, str], list[float]] = {}
        self.wallet_auth_service = None
        self.passkey_auth_service = None
        self.admin_challenge_bindings: dict[str, dict[str, object]] = {}
        self.admin_challenge_lock = threading.RLock()
        self.dummy_salt = b"acrown-local-prototype"
        self.dummy_hash = self.hash_password("not-a-real-account-password", self.dummy_salt)
        self.initialize_database()
        self.email_send_budget = EmailSendBudget(self.database_path)
        if CaseStore is None:
            raise RuntimeError("The local case-management module could not be loaded: " + str(CASE_IMPORT_ERROR))
        self.case_store = CaseStore(self.database_path)

    @staticmethod
    def case_rate_subject(handler: BaseHTTPRequestHandler) -> str:
        address = getattr(handler, "client_address", ("local-test",))
        return str(address[0] if address else "local-test")[:64]

    def require_case_admin_session(
        self, handler: BaseHTTPRequestHandler
    ) -> sqlite3.Row:
        account, expires, _token = self.require_account_session(handler)
        summary = self.account_summary(account, expires)
        if account["role"] != "admin" or summary["adminSessionAuthorized"] is not True:
            raise ApiError(
                403,
                "A server-assigned administrator role and a valid wallet-verified administrator session are required.",
            )
        return account

    def configure_wallet_auth(self, port: int) -> bool:
        """Configure SIWE to the exact localhost origin for this local server."""
        self.wallet_auth_service = None
        if WalletAuthService is None:
            return False
        host = f"localhost:{port}"
        self.wallet_auth_service = WalletAuthService(
            domain=host,
            uri=f"http://{host}/",
            statement=(
                "Verify an already-authorized AstroCrown administrator session. "
                "This message does not authorize a transaction."
            ),
        )
        return True

    def configure_passkey_auth(self, port: int) -> bool:
        """Bind local WebAuthn verification to the exact localhost origin."""
        self.passkey_auth_service = None
        if PasskeyAuthService is None:
            return False
        host = f"localhost:{port}"
        try:
            self.passkey_auth_service = PasskeyAuthService(
                rp_id="localhost",
                rp_name="AstroCrown",
                origin=f"http://{host}",
            )
        except (PasskeyUnavailable, ValueError):
            return False
        return True

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
                    auth_method TEXT NOT NULL DEFAULT 'legacy_password' CHECK(auth_method IN ('legacy_password', 'webauthn')),
                    created_at TEXT NOT NULL,
                    recovery_enabled INTEGER NOT NULL DEFAULT 0,
                    referral_id TEXT NOT NULL DEFAULT '',
                    newsletter_opt_in INTEGER NOT NULL DEFAULT 0,
                    newsletter_consent_at TEXT,
                    terms_version TEXT NOT NULL DEFAULT '',
                    terms_accepted_at TEXT NOT NULL DEFAULT '',
                    email_verified INTEGER NOT NULL DEFAULT 0,
                    role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'admin')),
                    avatar_id TEXT NOT NULL DEFAULT 'person' CHECK(
                        avatar_id IN ('person', 'crown', 'star', 'moon', 'orbit', 'shield')
                    )
                );
                CREATE TABLE IF NOT EXISTS sessions (
                    token_hash TEXT PRIMARY KEY,
                    account_id TEXT NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
                    created_at INTEGER NOT NULL,
                    expires_at INTEGER NOT NULL,
                    admin_wallet_address TEXT,
                    admin_authenticated_at INTEGER,
                    admin_expires_at INTEGER
                );
                CREATE INDEX IF NOT EXISTS sessions_account_idx ON sessions(account_id);
                CREATE TABLE IF NOT EXISTS account_email_tokens (
                    token_hash TEXT PRIMARY KEY,
                    account_id TEXT NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
                    token_type TEXT NOT NULL CHECK(token_type IN ('verification', 'password_reset')),
                    created_at INTEGER NOT NULL,
                    expires_at INTEGER NOT NULL,
                    used_at INTEGER
                );
                CREATE INDEX IF NOT EXISTS account_email_tokens_account_idx
                    ON account_email_tokens(account_id, token_type, expires_at);
                CREATE TABLE IF NOT EXISTS account_auth_rate_events (
                    event_id TEXT PRIMARY KEY,
                    action TEXT NOT NULL,
                    subject_hash TEXT NOT NULL,
                    attempted_at INTEGER NOT NULL
                );
                CREATE INDEX IF NOT EXISTS account_auth_rate_events_lookup_idx
                    ON account_auth_rate_events(action, subject_hash, attempted_at);
                CREATE TABLE IF NOT EXISTS account_security_audit (
                    audit_id TEXT PRIMARY KEY,
                    account_id TEXT NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
                    event_type TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    detail TEXT NOT NULL DEFAULT ''
                );
                CREATE INDEX IF NOT EXISTS account_security_audit_account_idx
                    ON account_security_audit(account_id, created_at);
                CREATE TABLE IF NOT EXISTS admin_wallets (
                    wallet_id TEXT PRIMARY KEY,
                    account_id TEXT NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
                    address TEXT NOT NULL COLLATE NOCASE UNIQUE,
                    chain_id INTEGER NOT NULL CHECK(chain_id > 0),
                    created_at TEXT NOT NULL,
                    active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
                    provisioning_source TEXT NOT NULL DEFAULT 'local-owner-provisioning'
                );
                CREATE INDEX IF NOT EXISTS admin_wallets_account_idx
                    ON admin_wallets(account_id, active);
                CREATE TABLE IF NOT EXISTS account_admin_permissions (
                    account_id TEXT NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
                    permission TEXT NOT NULL CHECK(permission IN ('admin.roles.grant', 'admin.roles.revoke')),
                    can_delegate INTEGER NOT NULL DEFAULT 0 CHECK(can_delegate IN (0, 1)),
                    granted_by_account_id TEXT REFERENCES accounts(account_id),
                    reason TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    PRIMARY KEY(account_id, permission)
                );
                CREATE INDEX IF NOT EXISTS account_admin_permissions_account_idx
                    ON account_admin_permissions(account_id, permission);
                CREATE TABLE IF NOT EXISTS account_admin_audit (
                    audit_id TEXT PRIMARY KEY,
                    event_type TEXT NOT NULL,
                    actor TEXT NOT NULL,
                    target_account_id TEXT,
                    target_wallet_address TEXT,
                    reason TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    detail TEXT NOT NULL DEFAULT ''
                );
                CREATE TABLE IF NOT EXISTS account_passkey_credentials (
                    credential_id TEXT PRIMARY KEY,
                    credential_id_bytes BLOB NOT NULL UNIQUE,
                    account_id TEXT NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
                    public_key BLOB NOT NULL,
                    sign_count INTEGER NOT NULL DEFAULT 0 CHECK(sign_count >= 0),
                    transports_json TEXT NOT NULL DEFAULT '[]',
                    device_type TEXT NOT NULL DEFAULT 'unknown',
                    backed_up INTEGER NOT NULL DEFAULT 0 CHECK(backed_up IN (0, 1)),
                    created_at TEXT NOT NULL,
                    last_used_at TEXT,
                    active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1))
                );
                CREATE INDEX IF NOT EXISTS account_passkey_credentials_account_idx
                    ON account_passkey_credentials(account_id, active);
                CREATE TABLE IF NOT EXISTS account_passkey_challenges (
                    challenge_id TEXT PRIMARY KEY,
                    challenge BLOB NOT NULL,
                    ceremony TEXT NOT NULL CHECK(ceremony IN ('registration', 'authentication')),
                    account_id TEXT,
                    payload_json TEXT NOT NULL DEFAULT '{}',
                    created_at INTEGER NOT NULL,
                    expires_at INTEGER NOT NULL,
                    used_at INTEGER
                );
                CREATE INDEX IF NOT EXISTS account_passkey_challenges_expiry_idx
                    ON account_passkey_challenges(expires_at, used_at);
                CREATE TABLE IF NOT EXISTS account_recovery_keys (
                    account_id TEXT NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
                    key_version INTEGER NOT NULL CHECK(key_version > 0),
                    key_salt BLOB NOT NULL CHECK(length(key_salt) = 16),
                    key_verifier BLOB NOT NULL CHECK(length(key_verifier) = 32),
                    created_at TEXT NOT NULL,
                    used_at TEXT,
                    PRIMARY KEY(account_id, key_version)
                );
                CREATE INDEX IF NOT EXISTS account_recovery_keys_active_idx
                    ON account_recovery_keys(account_id, used_at, key_version);
                CREATE TABLE IF NOT EXISTS account_recovery_challenges (
                    challenge_id TEXT PRIMARY KEY,
                    challenge BLOB NOT NULL CHECK(length(challenge) = 32),
                    account_id TEXT NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
                    key_version INTEGER NOT NULL,
                    created_at INTEGER NOT NULL,
                    expires_at INTEGER NOT NULL,
                    used_at INTEGER,
                    FOREIGN KEY(account_id, key_version)
                        REFERENCES account_recovery_keys(account_id, key_version)
                );
                CREATE INDEX IF NOT EXISTS account_recovery_challenges_expiry_idx
                    ON account_recovery_challenges(expires_at, used_at);
                """
            )
            # Upgrade an older local test database in place. The old username value
            # is retained as a legacy value; real users/data must never use this prototype.
            columns = {row["name"] for row in db.execute("PRAGMA table_info(accounts)").fetchall()}
            migrations = {
                "email": "TEXT",
                "auth_method": "TEXT NOT NULL DEFAULT 'legacy_password' CHECK(auth_method IN ('legacy_password', 'webauthn'))",
                "referral_id": "TEXT NOT NULL DEFAULT ''",
                "newsletter_opt_in": "INTEGER NOT NULL DEFAULT 0",
                "newsletter_consent_at": "TEXT",
                "terms_version": "TEXT NOT NULL DEFAULT ''",
                "terms_accepted_at": "TEXT NOT NULL DEFAULT ''",
                "email_verified": "INTEGER NOT NULL DEFAULT 0",
                "role": "TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'admin'))",
                "avatar_id": "TEXT NOT NULL DEFAULT 'person' CHECK(avatar_id IN ('person', 'crown', 'star', 'moon', 'orbit', 'shield'))",
            }
            for name, definition in migrations.items():
                if name not in columns:
                    db.execute(f"ALTER TABLE accounts ADD COLUMN {name} {definition}")
            db.execute("UPDATE accounts SET email = username WHERE auth_method = 'legacy_password' AND (email IS NULL OR email = '')")
            db.execute("CREATE UNIQUE INDEX IF NOT EXISTS accounts_email_ci_idx ON accounts(email COLLATE NOCASE)")
            session_columns = {
                row["name"] for row in db.execute("PRAGMA table_info(sessions)").fetchall()
            }
            session_migrations = {
                "admin_wallet_address": "TEXT",
                "admin_authenticated_at": "INTEGER",
                "admin_expires_at": "INTEGER",
            }
            for name, definition in session_migrations.items():
                if name not in session_columns:
                    db.execute(f"ALTER TABLE sessions ADD COLUMN {name} {definition}")
            audit_columns = {
                row["name"] for row in db.execute("PRAGMA table_info(account_admin_audit)").fetchall()
            }
            if "detail" not in audit_columns:
                db.execute("ALTER TABLE account_admin_audit ADD COLUMN detail TEXT NOT NULL DEFAULT ''")
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

    @staticmethod
    def auth_rate_subject_hash(subject: str) -> str:
        return hashlib.sha256(subject.encode("utf-8")).hexdigest()

    def auth_rate_allowed(
        self, action: str, subject: str, *, limit: int = 10, window: int = 60
    ) -> bool:
        """Persist sensitive account-action throttles across process restarts."""
        if (
            not isinstance(action, str) or not action or len(action) > 80
            or not isinstance(subject, str) or not subject or len(subject) > 512
            or isinstance(limit, bool) or not isinstance(limit, int) or limit < 1
            or isinstance(window, bool) or not isinstance(window, int) or window < 1
        ):
            raise ValueError("Invalid account authentication rate-limit configuration.")
        now = int(time.time())
        subject_hash = self.auth_rate_subject_hash(subject)
        cutoff = now - window
        with self.connect() as db:
            # Serialize count-and-insert so parallel requests cannot all pass
            # the same remaining allowance. Email/account identifiers are never stored.
            db.execute("BEGIN IMMEDIATE")
            db.execute(
                "DELETE FROM account_auth_rate_events WHERE attempted_at <= ?",
                (now - 86400,),
            )
            db.execute(
                "DELETE FROM account_auth_rate_events WHERE action = ? AND subject_hash = ? AND attempted_at <= ?",
                (action, subject_hash, cutoff),
            )
            count = int(db.execute(
                "SELECT COUNT(*) FROM account_auth_rate_events WHERE action = ? AND subject_hash = ? AND attempted_at > ?",
                (action, subject_hash, cutoff),
            ).fetchone()[0])
            if count >= limit:
                return False
            db.execute(
                "INSERT INTO account_auth_rate_events(event_id, action, subject_hash, attempted_at) VALUES (?, ?, ?, ?)",
                (str(uuid.uuid4()), action, subject_hash, now),
            )
        return True

    def clear_auth_rate_limit(self, action: str, subject: str) -> None:
        subject_hash = self.auth_rate_subject_hash(subject)
        with self.connect() as db:
            db.execute(
                "DELETE FROM account_auth_rate_events WHERE action = ? AND subject_hash = ?",
                (action, subject_hash),
            )

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

    def new_session_for_password_auth(
        self, verified_account: sqlite3.Row
    ) -> tuple[str, int] | None:
        """Issue a login session only if the verified password is still current."""
        token = secrets.token_urlsafe(32)
        now = int(time.time())
        expires = now + SESSION_LIFETIME_SECONDS
        with self.connect() as db:
            # Serialize credential revalidation and session creation against a
            # concurrent password change so a stale login cannot revive access.
            db.execute("BEGIN IMMEDIATE")
            current = db.execute(
                "SELECT password_salt, password_hash FROM accounts WHERE account_id = ?",
                (verified_account["account_id"],),
            ).fetchone()
            if current is None:
                return None
            if not (
                hmac.compare_digest(bytes(current["password_salt"]), bytes(verified_account["password_salt"]))
                and hmac.compare_digest(bytes(current["password_hash"]), bytes(verified_account["password_hash"]))
            ):
                return None
            db.execute("DELETE FROM sessions WHERE expires_at <= ?", (now,))
            db.execute(
                "INSERT INTO sessions(token_hash, account_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
                (hash_session_token(token), verified_account["account_id"], now, expires),
            )
        return token, expires

    def _passkey_service(self):
        if self.passkey_auth_service is None:
            raise ApiError(
                503,
                "Passkey authentication is unavailable in this local environment. No fallback login is enabled.",
            )
        return self.passkey_auth_service

    @staticmethod
    def _passkey_challenge_id(value: object) -> str:
        if not isinstance(value, str) or not re.fullmatch(r"[A-Za-z0-9_-]{32,64}", value):
            raise ApiError(400, "The passkey challenge reference is invalid.")
        return value

    def issue_passkey_registration_options(
        self, payload: dict, handler: BaseHTTPRequestHandler
    ) -> tuple[int, dict, str | None]:
        service = self._passkey_service()
        if set(payload) - {"termsAccepted", "termsVersion", "referralId"}:
            raise ApiError(400, "The passkey registration request contains unsupported fields.")
        if payload.get("termsAccepted") is not True:
            raise ApiError(400, "Accept the Terms of Use and Privacy Policy to create an account.")
        if payload.get("termsVersion") != TERMS_VERSION:
            raise ApiError(400, "The development Terms of Use and Privacy Policy version is not acknowledged.")
        referral_id = normalize_referral_id(payload.get("referralId", ""))
        subject = self.case_rate_subject(handler)
        if not self.auth_rate_allowed("passkey-register-options", subject, limit=5, window=3600):
            raise ApiError(429, "Too many account-creation attempts. Please try again later.")

        account_id = str(uuid.uuid4())
        account_label = "AC-" + secrets.token_hex(5).upper()
        challenge_id = secrets.token_urlsafe(24)
        challenge = secrets.token_bytes(service.CHALLENGE_BYTES)
        options = service.registration_options(
            user_id=uuid.UUID(account_id).bytes,
            user_name=account_label,
            user_display_name="AstroCrown member",
            challenge=challenge,
        )
        metadata = {
            "accountLabel": account_label,
            "referralId": referral_id,
            "termsVersion": TERMS_VERSION,
        }
        now = int(time.time())
        with self.connect() as db:
            db.execute(
                """DELETE FROM account_passkey_challenges
                   WHERE expires_at <= ? OR (used_at IS NOT NULL AND used_at <= ?)""",
                (now, now - 86400),
            )
            db.execute(
                """INSERT INTO account_passkey_challenges(
                       challenge_id, challenge, ceremony, account_id, payload_json,
                       created_at, expires_at
                   ) VALUES (?, ?, 'registration', ?, ?, ?, ?)""",
                (
                    challenge_id, challenge, account_id,
                    json.dumps(metadata, separators=(",", ":")), now, now + 180,
                ),
            )
        return 200, {
            "challengeId": challenge_id,
            "publicKey": options,
            "accountLabel": account_label,
            "expiresIn": 180,
        }, None

    def verify_passkey_registration(
        self, payload: dict, handler: BaseHTTPRequestHandler
    ) -> tuple[int, dict, str | None]:
        service = self._passkey_service()
        if set(payload) != {"challengeId", "credential"}:
            raise ApiError(400, "The passkey registration response is incomplete.")
        challenge_id = self._passkey_challenge_id(payload.get("challengeId"))
        credential = payload.get("credential")
        if not isinstance(credential, dict):
            raise ApiError(400, "A valid passkey registration response is required.")
        subject = self.case_rate_subject(handler)
        if not self.auth_rate_allowed("passkey-register-verify", subject, limit=10, window=3600):
            raise ApiError(429, "Too many passkey registration attempts. Please try again later.")
        now = int(time.time())
        with self.connect() as db:
            challenge_row = db.execute(
                """SELECT * FROM account_passkey_challenges
                   WHERE challenge_id = ? AND ceremony = 'registration'
                     AND used_at IS NULL AND expires_at > ?""",
                (challenge_id, now),
            ).fetchone()
        if challenge_row is None:
            raise ApiError(410, "This passkey registration request has expired or was already used. Start again.")
        try:
            verified = service.verify_registration(
                credential=credential,
                challenge=bytes(challenge_row["challenge"]),
            )
            credential_id, credential_id_bytes = service.credential_id_from_response(credential)
        except PasskeyVerificationError:
            raise ApiError(401, "The passkey registration proof was not accepted. Start again.") from None
        if not hmac.compare_digest(bytes(verified.credential_id), credential_id_bytes):
            raise ApiError(401, "The passkey registration proof was not accepted. Start again.")

        response_data = credential.get("response", {})
        transports = response_data.get("transports", []) if isinstance(response_data, dict) else []
        allowed_transports = {"usb", "nfc", "ble", "internal", "hybrid", "smart-card"}
        if not isinstance(transports, list) or any(
            not isinstance(item, str) or item not in allowed_transports for item in transports
        ):
            transports = []
        metadata = json.loads(challenge_row["payload_json"])
        account_id = str(challenge_row["account_id"])
        account_label = metadata["accountLabel"]
        created_at = utc_iso()
        # The legacy NOT NULL password columns remain as random, unusable values
        # for old SQLite compatibility. Passkey accounts are explicitly marked
        # auth_method='webauthn'; the default server refuses password login.
        placeholder_salt = secrets.token_bytes(16)
        placeholder_hash = secrets.token_bytes(32)
        device_type = getattr(
            verified.credential_device_type,
            "value",
            str(verified.credential_device_type),
        )
        try:
            with self.connect() as db:
                db.execute("BEGIN IMMEDIATE")
                live = db.execute(
                    """SELECT * FROM account_passkey_challenges
                       WHERE challenge_id = ? AND ceremony = 'registration'
                         AND used_at IS NULL AND expires_at > ?""",
                    (challenge_id, int(time.time())),
                ).fetchone()
                if live is None:
                    raise ApiError(410, "This passkey registration request has expired or was already used. Start again.")
                if db.execute(
                    "SELECT 1 FROM account_passkey_credentials WHERE credential_id = ? OR credential_id_bytes = ?",
                    (credential_id, credential_id_bytes),
                ).fetchone():
                    raise ApiError(409, "This passkey is already registered. Use another authenticator.")
                db.execute(
                    """INSERT INTO accounts(
                           account_id, username, email, password_salt, password_hash,
                           auth_method, created_at, referral_id, newsletter_opt_in,
                           newsletter_consent_at, terms_version, terms_accepted_at,
                           email_verified, role
                       ) VALUES (?, ?, NULL, ?, ?, 'webauthn', ?, ?, 0, NULL, ?, ?, 0, 'user')""",
                    (
                        account_id, account_label, placeholder_salt, placeholder_hash,
                        created_at, metadata["referralId"], metadata["termsVersion"], created_at,
                    ),
                )
                db.execute(
                    """INSERT INTO account_passkey_credentials(
                           credential_id, credential_id_bytes, account_id, public_key,
                           sign_count, transports_json, device_type, backed_up, created_at
                       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        credential_id, credential_id_bytes, account_id,
                        bytes(verified.credential_public_key), int(verified.sign_count),
                        json.dumps(transports, separators=(",", ":")), device_type,
                        int(bool(verified.credential_backed_up)), created_at,
                    ),
                )
                db.execute(
                    "UPDATE account_passkey_challenges SET used_at = ? WHERE challenge_id = ? AND used_at IS NULL",
                    (int(time.time()), challenge_id),
                )
        except sqlite3.IntegrityError:
            raise ApiError(409, "This passkey or account identifier is already registered. Start again.") from None

        self.clear_auth_rate_limit("passkey-register-options", subject)
        token, expires = self.new_session(account_id)
        account, expires = self.account_for_session(token)
        if account is None:
            raise ApiError(500, "The passkey account session could not be initialized.")
        result = self.account_summary(account, expires)
        result["accountLabel"] = account_label
        result["message"] = "Your AstroCrown passkey account has been created."
        return 201, result, self.cookie_header(token)

    def issue_passkey_authentication_options(
        self, payload: dict, handler: BaseHTTPRequestHandler
    ) -> tuple[int, dict, str | None]:
        service = self._passkey_service()
        if payload:
            raise ApiError(400, "Passkey sign-in does not accept an email address or account identifier.")
        subject = self.case_rate_subject(handler)
        if not self.auth_rate_allowed("passkey-auth-options", subject, limit=30, window=3600):
            raise ApiError(429, "Too many passkey sign-in attempts. Please try again later.")
        challenge_id = secrets.token_urlsafe(24)
        challenge = secrets.token_bytes(service.CHALLENGE_BYTES)
        options = service.authentication_options(challenge=challenge)
        now = int(time.time())
        with self.connect() as db:
            db.execute(
                """DELETE FROM account_passkey_challenges
                   WHERE expires_at <= ? OR (used_at IS NOT NULL AND used_at <= ?)""",
                (now, now - 86400),
            )
            db.execute(
                """INSERT INTO account_passkey_challenges(
                       challenge_id, challenge, ceremony, account_id, payload_json,
                       created_at, expires_at
                   ) VALUES (?, ?, 'authentication', NULL, '{}', ?, ?)""",
                (challenge_id, challenge, now, now + 180),
            )
        return 200, {"challengeId": challenge_id, "publicKey": options, "expiresIn": 180}, None

    def verify_passkey_authentication(
        self, payload: dict, handler: BaseHTTPRequestHandler
    ) -> tuple[int, dict, str | None]:
        service = self._passkey_service()
        if set(payload) != {"challengeId", "credential"}:
            raise ApiError(400, "The passkey sign-in response is incomplete.")
        challenge_id = self._passkey_challenge_id(payload.get("challengeId"))
        credential = payload.get("credential")
        if not isinstance(credential, dict):
            raise ApiError(400, "A valid passkey sign-in response is required.")
        subject = self.case_rate_subject(handler)
        if not self.auth_rate_allowed("passkey-auth-verify", subject, limit=10, window=300):
            raise ApiError(429, "Too many passkey sign-in attempts. Please wait before trying again.")
        now = int(time.time())
        with self.connect() as db:
            challenge_row = db.execute(
                """SELECT * FROM account_passkey_challenges
                   WHERE challenge_id = ? AND ceremony = 'authentication'
                     AND used_at IS NULL AND expires_at > ?""",
                (challenge_id, now),
            ).fetchone()
        try:
            credential_id, credential_id_bytes = service.credential_id_from_response(credential)
        except PasskeyVerificationError:
            raise ApiError(401, "Passkey sign-in could not be completed. Check your authenticator and try again.") from None
        if challenge_row is None:
            raise ApiError(410, "This passkey sign-in request has expired or was already used. Start again.")
        with self.connect() as db:
            credential_row = db.execute(
                """SELECT pc.*, a.auth_method, a.role
                   FROM account_passkey_credentials pc
                   JOIN accounts a ON a.account_id = pc.account_id
                   WHERE pc.credential_id = ? AND pc.credential_id_bytes = ?
                     AND pc.active = 1 AND a.auth_method = 'webauthn'""",
                (credential_id, credential_id_bytes),
            ).fetchone()
        if credential_row is None:
            raise ApiError(401, "Passkey sign-in could not be completed. Check your authenticator and try again.")
        try:
            verified = service.verify_authentication(
                credential=credential,
                challenge=bytes(challenge_row["challenge"]),
                credential_public_key=bytes(credential_row["public_key"]),
                current_sign_count=int(credential_row["sign_count"]),
            )
            if not hmac.compare_digest(bytes(verified.credential_id), credential_id_bytes):
                raise PasskeyVerificationError("Credential ID mismatch.")
            user_handle = service.user_handle_from_response(credential)
            if user_handle is not None and not hmac.compare_digest(
                user_handle, uuid.UUID(credential_row["account_id"]).bytes
            ):
                raise PasskeyVerificationError("User handle mismatch.")
        except (PasskeyVerificationError, ValueError):
            raise ApiError(401, "Passkey sign-in could not be completed. Check your authenticator and try again.") from None

        account_id = str(credential_row["account_id"])
        device_type = getattr(
            verified.credential_device_type,
            "value",
            str(verified.credential_device_type),
        )
        now_int = int(time.time())
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            live_challenge = db.execute(
                """SELECT 1 FROM account_passkey_challenges
                   WHERE challenge_id = ? AND ceremony = 'authentication'
                     AND used_at IS NULL AND expires_at > ?""",
                (challenge_id, now_int),
            ).fetchone()
            live_credential = db.execute(
                """SELECT sign_count FROM account_passkey_credentials
                   WHERE credential_id = ? AND account_id = ? AND active = 1""",
                (credential_id, account_id),
            ).fetchone()
            if live_challenge is None or live_credential is None:
                raise ApiError(410, "This passkey sign-in request has expired or was already used. Start again.")
            if int(live_credential["sign_count"]) != int(credential_row["sign_count"]):
                raise ApiError(401, "This passkey response is no longer current. Start sign-in again.")
            db.execute(
                """UPDATE account_passkey_credentials
                   SET sign_count = ?, device_type = ?, backed_up = ?, last_used_at = ?
                   WHERE credential_id = ? AND account_id = ?""",
                (
                    int(verified.new_sign_count), device_type,
                    int(bool(verified.credential_backed_up)), utc_iso(now_int),
                    credential_id, account_id,
                ),
            )
            db.execute(
                "UPDATE account_passkey_challenges SET used_at = ? WHERE challenge_id = ? AND used_at IS NULL",
                (now_int, challenge_id),
            )
        self.clear_auth_rate_limit("passkey-auth-verify", subject)
        token, expires = self.new_session(account_id)
        account, expires = self.account_for_session(token)
        if account is None:
            raise ApiError(500, "The passkey account session could not be initialized.")
        result = self.account_summary(account, expires)
        result["message"] = "You are signed in to AstroCrown with your passkey."
        return 200, result, self.cookie_header(token)

    def account_for_session(self, token: str | None) -> tuple[sqlite3.Row | None, int | None]:
        if not token:
            return None, None
        now = int(time.time())
        with self.connect() as db:
            row = db.execute(
                """SELECT a.*, s.expires_at,
                          s.token_hash AS session_token_hash,
                          s.admin_wallet_address AS session_admin_wallet_address,
                          s.admin_authenticated_at AS session_admin_authenticated_at,
                          s.admin_expires_at AS session_admin_expires_at,
                          CASE WHEN EXISTS (
                              SELECT 1 FROM admin_wallets aw
                              WHERE aw.account_id = a.account_id
                                AND aw.address = s.admin_wallet_address COLLATE NOCASE
                                AND aw.active = 1
                          ) THEN 1 ELSE 0 END AS session_admin_wallet_active,
                          (SELECT COUNT(*) FROM admin_wallets aw_count
                              WHERE aw_count.account_id = a.account_id AND aw_count.active = 1
                          ) AS admin_wallet_count,
                          (SELECT COUNT(*) FROM account_passkey_credentials pc_count
                              WHERE pc_count.account_id = a.account_id AND pc_count.active = 1
                          ) AS passkey_count,
                          (SELECT COUNT(*) FROM sessions active_sessions
                              WHERE active_sessions.account_id = a.account_id
                                AND active_sessions.expires_at > ?
                          ) AS active_session_count
                   FROM sessions s
                   JOIN accounts a ON a.account_id = s.account_id
                   WHERE s.token_hash = ? AND s.expires_at > ?""",
                (now, hash_session_token(token), now),
            ).fetchone()
            if row is None:
                db.execute("DELETE FROM sessions WHERE token_hash = ?", (hash_session_token(token),))
                return None, None
            return row, int(row["expires_at"])

    def account_summary(self, account: sqlite3.Row, expires_at: int | None) -> dict:
        role_assigned = account["role"] == "admin"
        admin_permissions: list[str] = []
        delegable_permissions: list[str] = []
        if role_assigned:
            with self.connect() as db:
                permission_rows = db.execute(
                    """SELECT permission, can_delegate FROM account_admin_permissions
                       WHERE account_id = ? ORDER BY permission""",
                    (account["account_id"],),
                ).fetchall()
            admin_permissions = [row["permission"] for row in permission_rows]
            delegable_permissions = [
                row["permission"] for row in permission_rows if bool(row["can_delegate"])
            ]
        wallet_address = account["session_admin_wallet_address"]
        wallet_step_up_expires = int(account["session_admin_expires_at"] or 0)
        wallet_is_enrolled = bool(account["session_admin_wallet_active"])
        wallet_authenticated = bool(
            role_assigned
            and wallet_address
            and wallet_is_enrolled
            and wallet_step_up_expires > int(time.time())
        )
        return {
            "authenticated": True,
            "email": account["email"],
            "accountIdentifier": account["username"],
            "authMethod": account["auth_method"],
            "passkeyCount": int(account["passkey_count"] or 0),
            "createdAt": account["created_at"],
            "avatarId": account["avatar_id"],
            "referralId": account["referral_id"] or "",
            "newsletterOptIn": bool(account["newsletter_opt_in"]),
            "newsletterConsentAt": account["newsletter_consent_at"],
            "termsAccepted": bool(account["terms_accepted_at"]),
            "termsVersion": account["terms_version"],
            "termsAcceptedAt": account["terms_accepted_at"],
            "emailVerified": bool(account["email_verified"]) if account["email"] else False,
            "emailVerificationDeliveryAvailable": bool(account["email"]) and self.email_delivery_available,
            "passwordResetAvailable": bool(account["email"]) and self.email_delivery_available,
            "sessionExpiresAt": utc_iso(expires_at) if expires_at else None,
            "activeSessionCount": int(account["active_session_count"] or 0),
            "scope": "local-test-account-only",
            "role": account["role"],
            "adminRoleAssigned": role_assigned,
            "adminPermissions": admin_permissions,
            "adminDelegablePermissions": delegable_permissions,
            "adminWalletCount": int(account["admin_wallet_count"] or 0) if role_assigned else 0,
            "adminWalletAuthenticated": wallet_authenticated,
            "adminSessionAuthorized": wallet_authenticated,
            "admin": wallet_authenticated,
            "adminWalletAddress": wallet_address if wallet_authenticated else None,
            "adminSessionExpiresAt": utc_iso(wallet_step_up_expires) if wallet_authenticated else None,
        }

    @property
    def email_delivery_available(self) -> bool:
        return self.email_sender is not None and bool(self.email_public_base_url)

    def issue_email_action_token(
        self, account_id: str, token_type: str, lifetime_seconds: int
    ) -> tuple[str, int]:
        if token_type not in {"verification", "password_reset"}:
            raise ValueError("Unknown account email token type.")
        raw_token = secrets.token_urlsafe(32)
        token_hash = hash_session_token(raw_token)
        now = int(time.time())
        expires = now + lifetime_seconds
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            # Bound token-table growth without deleting still-valid links. A
            # failed resend must not invalidate a previously delivered link.
            db.execute(
                "DELETE FROM account_email_tokens WHERE expires_at <= ? OR (used_at IS NOT NULL AND used_at <= ?)",
                (now, now - 30 * 24 * 60 * 60),
            )
            db.execute(
                "INSERT INTO account_email_tokens(token_hash, account_id, token_type, created_at, expires_at, used_at) VALUES (?, ?, ?, ?, ?, NULL)",
                (token_hash, account_id, token_type, now, expires),
            )
        return raw_token, expires

    def activate_email_action_token(self, raw_token: str) -> bool:
        token_hash = hash_session_token(raw_token)
        now = int(time.time())
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            row = db.execute(
                """SELECT account_id, token_type FROM account_email_tokens
                   WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?""",
                (token_hash, now),
            ).fetchone()
            if row is None:
                return False
            db.execute(
                """DELETE FROM account_email_tokens
                   WHERE account_id = ? AND token_type = ? AND token_hash <> ? AND used_at IS NULL""",
                (row["account_id"], row["token_type"], token_hash),
            )
        return True

    def invalidate_email_action_token(self, raw_token: str) -> None:
        with self.connect() as db:
            db.execute(
                "DELETE FROM account_email_tokens WHERE token_hash = ? AND used_at IS NULL",
                (hash_session_token(raw_token),),
            )

    def account_email_action_url(self, action: str, raw_token: str) -> str:
        if not self.email_public_base_url:
            raise RuntimeError("Email action links require a public base URL.")
        query = urlencode({"type": action, "token": raw_token})
        return (
            self.email_public_base_url.rstrip("/")
            + "/account-continuity/prototype/email-action.html?"
            + query
        )

    def deliver_account_action_email(
        self, *, recipient: str, action: str, raw_token: str
    ) -> bool:
        if not self.email_delivery_available:
            return False
        if action not in {"verify", "reset"}:
            raise ValueError("Unknown account email action.")
        # Reserve from the persistent Free-tier allocation before network I/O.
        # Count even ambiguous failures: the relay may have accepted before timeout.
        if not self.email_send_budget.reserve():
            return False
        link = self.account_email_action_url(action, raw_token)
        if action == "verify":
            subject = "Verify your AstroCrown email address"
            title = "Verify your email address"
            explanation = "Confirm that this email address belongs to your AstroCrown account."
        elif action == "reset":
            subject = "Reset your AstroCrown password"
            title = "Reset your password"
            explanation = "Use this one-time link to choose a new password for your AstroCrown account."
        text_body = (
            f"{title}\n\n{explanation}\n\n{link}\n\n"
            "This link is single-use and expires. If you did not request it, you can ignore this email. "
            "AstroCrown will never ask for your password, private key or wallet recovery phrase."
        )
        escaped_link = (
            link.replace("&", "&amp;").replace('"', "&quot;").replace("<", "&lt;").replace(">", "&gt;")
        )
        html_body = (
            "<!doctype html><html lang=\"en\"><meta charset=\"utf-8\">"
            f"<title>{title}</title><body><main><h1>{title}</h1>"
            f"<p>{explanation}</p><p><a href=\"{escaped_link}\">Continue</a></p>"
            "<p>This link is single-use and expires. Ignore this message if you did not request it.</p>"
            "<p>AstroCrown will never ask for your password, private key or wallet recovery phrase.</p>"
            "</main></body></html>"
        )
        try:
            self.email_sender.send(recipient, subject, text_body, html_body)
            return True
        except EmailDeliveryError:
            return False
        except Exception:
            # Custom injected senders are also treated as an untrusted transport.
            return False

    def send_verification_email(self, account_id: str, email: str) -> bool:
        raw_token, _expires = self.issue_email_action_token(
            account_id, "verification", 24 * 60 * 60
        )
        if self.deliver_account_action_email(
            recipient=email, action="verify", raw_token=raw_token
        ) and self.activate_email_action_token(raw_token):
            return True
        self.invalidate_email_action_token(raw_token)
        return False

    def complete_email_verification(self, raw_token: object) -> dict:
        if not isinstance(raw_token, str) or not 20 <= len(raw_token) <= 256:
            raise ApiError(400, "This verification link is invalid or has expired.")
        token_hash = hash_session_token(raw_token)
        now = int(time.time())
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            row = db.execute(
                """SELECT account_id FROM account_email_tokens
                   WHERE token_hash = ? AND token_type = 'verification'
                     AND used_at IS NULL AND expires_at > ?""",
                (token_hash, now),
            ).fetchone()
            if row is None:
                raise ApiError(400, "This verification link is invalid, expired or already used.")
            cursor = db.execute(
                "UPDATE account_email_tokens SET used_at = ? WHERE token_hash = ? AND used_at IS NULL",
                (now, token_hash),
            )
            if cursor.rowcount != 1:
                raise ApiError(400, "This verification link is invalid, expired or already used.")
            db.execute(
                "UPDATE accounts SET email_verified = 1 WHERE account_id = ?",
                (row["account_id"],),
            )
            db.execute(
                "INSERT INTO account_security_audit(audit_id, account_id, event_type, created_at, detail) VALUES (?, ?, ?, ?, ?)",
                (str(uuid.uuid4()), row["account_id"], "email_verified", utc_iso(), ""),
            )
            db.execute(
                "DELETE FROM account_email_tokens WHERE account_id = ? AND token_type = 'verification' AND token_hash <> ?",
                (row["account_id"], token_hash),
            )
        return {"verified": True, "message": "Your email address has been verified."}

    def complete_password_reset(
        self, raw_token: object, new_password_value: object, confirmation: object
    ) -> dict:
        if not isinstance(raw_token, str) or not 20 <= len(raw_token) <= 256:
            raise ApiError(400, "This password-reset link is invalid or has expired.")
        new_password = validate_password(new_password_value)
        if not isinstance(confirmation, str) or not hmac.compare_digest(new_password, confirmation):
            raise ApiError(400, "The new password confirmation does not match.")
        token_hash = hash_session_token(raw_token)
        if not self.auth_rate_allowed("password-reset-complete", token_hash, limit=5, window=3600):
            raise ApiError(429, "Too many password-reset attempts. Request a new reset link later.")
        now = int(time.time())
        # Reject arbitrary or expired tokens before performing the expensive
        # password KDF. The token is checked again under the write lock below.
        with self.connect() as db:
            candidate = db.execute(
                """SELECT account_id FROM account_email_tokens
                   WHERE token_hash = ? AND token_type = 'password_reset'
                     AND used_at IS NULL AND expires_at > ?""",
                (token_hash, now),
            ).fetchone()
        if candidate is None:
            raise ApiError(400, "This password-reset link is invalid, expired or already used.")
        salt = secrets.token_bytes(16)
        encoded = self.hash_password(new_password, salt)
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            row = db.execute(
                """SELECT account_id FROM account_email_tokens
                   WHERE token_hash = ? AND token_type = 'password_reset'
                     AND used_at IS NULL AND expires_at > ?""",
                (token_hash, now),
            ).fetchone()
            if row is None:
                raise ApiError(400, "This password-reset link is invalid, expired or already used.")
            cursor = db.execute(
                "UPDATE account_email_tokens SET used_at = ? WHERE token_hash = ? AND used_at IS NULL",
                (now, token_hash),
            )
            if cursor.rowcount != 1:
                raise ApiError(400, "This password-reset link is invalid, expired or already used.")
            existing_sessions = int(db.execute(
                "SELECT COUNT(*) FROM sessions WHERE account_id = ? AND expires_at > ?",
                (row["account_id"], now),
            ).fetchone()[0])
            db.execute(
                "UPDATE accounts SET password_salt = ?, password_hash = ?, email_verified = 1 WHERE account_id = ?",
                (salt, encoded, row["account_id"]),
            )
            db.execute(
                "DELETE FROM sessions WHERE account_id = ?",
                (row["account_id"],),
            )
            # A successful password reset proves control of the mailbox and
            # invalidates every outstanding account-email action link.
            db.execute(
                "DELETE FROM account_email_tokens WHERE account_id = ?",
                (row["account_id"],),
            )
            db.execute(
                "INSERT INTO account_security_audit(audit_id, account_id, event_type, created_at, detail) VALUES (?, ?, ?, ?, ?)",
                (
                    str(uuid.uuid4()), row["account_id"], "password_reset_completed",
                    utc_iso(), f"revoked_sessions={existing_sessions}",
                ),
            )
        return {
            "passwordReset": True,
            "revokedSessions": existing_sessions,
            "message": "Your password has been reset. Sign in with your new password.",
        }

    def require_account_session(
        self, handler: BaseHTTPRequestHandler
    ) -> tuple[sqlite3.Row, int, str]:
        token = self.get_cookie(handler)
        account, expires = self.account_for_session(token)
        if account is None or expires is None or not token:
            raise ApiError(401, "Sign in to your account before continuing.")
        return account, expires, token

    @staticmethod
    def wallet_message_digest(message: str) -> str:
        return hashlib.sha256(message.encode("utf-8")).hexdigest()

    @staticmethod
    def validate_admin_reason(reason: object) -> str:
        if not isinstance(reason, str):
            raise ApiError(400, "A clear administrative reason is required.")
        value = " ".join(reason.split())
        if len(value) < 12 or len(value) > 500:
            raise ApiError(400, "Provide an administrative reason between 12 and 500 characters.")
        return value

    @staticmethod
    def validate_permission_list(value: object) -> list[str]:
        if value is None:
            return []
        if not isinstance(value, list) or len(value) > len(ADMIN_PERMISSION_NAMES):
            raise ApiError(400, "The delegated permissions must be a list of recognized permission names.")
        if any(not isinstance(item, str) or item not in ADMIN_PERMISSION_NAMES for item in value):
            raise ApiError(400, "One or more requested permissions are not recognized.")
        if len(set(value)) != len(value):
            raise ApiError(400, "A permission may appear only once in the request.")
        return sorted(value)

    def require_admin_permission(
        self, handler: BaseHTTPRequestHandler, permission: str
    ) -> tuple[sqlite3.Row, int, str]:
        account, expires, token = self.require_account_session(handler)
        if account["role"] != "admin":
            raise ApiError(403, "Administrator authority is not assigned to this account.")
        summary = self.account_summary(account, expires)
        if summary["adminSessionAuthorized"] is not True:
            raise ApiError(403, "A fresh signature from an enrolled administrator wallet is required.")
        if permission not in ADMIN_PERMISSION_NAMES or permission not in summary["adminPermissions"]:
            raise ApiError(403, "This administrator account does not hold the required permission.")
        return account, expires, token

    @staticmethod
    def _permission_holder_in_transaction(
        db: sqlite3.Connection,
        *,
        account_id: str,
        token: str,
        permission: str,
        now: int,
    ) -> sqlite3.Row | None:
        return db.execute(
            """SELECT p.permission, p.can_delegate
               FROM account_admin_permissions p
               JOIN accounts a ON a.account_id = p.account_id
               JOIN sessions s ON s.account_id = a.account_id
               WHERE p.account_id = ? AND p.permission = ?
                 AND a.role = 'admin'
                 AND s.token_hash = ? AND s.expires_at > ?
                 AND s.admin_expires_at > ?
                 AND EXISTS (
                     SELECT 1 FROM admin_wallets aw
                     WHERE aw.account_id = a.account_id
                       AND aw.address = s.admin_wallet_address COLLATE NOCASE
                       AND aw.active = 1
                 )
               LIMIT 1""",
            (account_id, permission, hash_session_token(token), now, now),
        ).fetchone()

    def grant_admin_role(
        self, payload: dict, handler: BaseHTTPRequestHandler
    ) -> tuple[int, dict, str | None]:
        if set(payload) not in ({"email", "reason"}, {"email", "reason", "permissions"}):
            raise ApiError(400, "Provide only the existing account email, reason and optional delegated permissions.")
        actor, _expires, token = self.require_admin_permission(handler, "admin.roles.grant")
        email = normalize_email(payload.get("email"))
        reason = self.validate_admin_reason(payload.get("reason"))
        delegated = self.validate_permission_list(payload.get("permissions"))
        if email == (actor["email"] or actor["username"]).lower():
            raise ApiError(400, "An administrator cannot grant the administrator role to themselves.")

        now = int(time.time())
        created_at = utc_iso()
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            holder = self._permission_holder_in_transaction(
                db, account_id=actor["account_id"], token=token,
                permission="admin.roles.grant", now=now,
            )
            if holder is None:
                raise ApiError(403, "The grant permission or wallet-verified administrator session is no longer active.")
            delegable_rows = db.execute(
                """SELECT permission FROM account_admin_permissions
                   WHERE account_id = ? AND can_delegate = 1""",
                (actor["account_id"],),
            ).fetchall()
            delegable = {row["permission"] for row in delegable_rows}
            if not set(delegated).issubset(delegable):
                raise ApiError(403, "You may assign only permissions that were explicitly delegated to you for further delegation.")
            target = db.execute(
                "SELECT account_id, email, role FROM accounts WHERE email = ? COLLATE NOCASE",
                (email,),
            ).fetchone()
            if target is None:
                raise ApiError(404, "No existing AstroCrown account was found for that email.")
            if target["account_id"] == actor["account_id"]:
                raise ApiError(400, "An administrator cannot grant the role to their own account.")
            if target["role"] != "user":
                raise ApiError(409, "The target account is already an administrator or is not eligible for this grant.")
            db.execute("UPDATE accounts SET role = 'admin' WHERE account_id = ? AND role = 'user'", (target["account_id"],))
            for permission in delegated:
                db.execute(
                    """INSERT INTO account_admin_permissions(
                           account_id, permission, can_delegate, granted_by_account_id, reason, created_at
                       ) VALUES (?, ?, 0, ?, ?, ?)""",
                    (target["account_id"], permission, actor["account_id"], reason, created_at),
                )
            db.execute(
                """UPDATE sessions SET admin_wallet_address = NULL,
                       admin_authenticated_at = NULL, admin_expires_at = NULL
                   WHERE account_id = ?""",
                (target["account_id"],),
            )
            detail = json.dumps({"permissions_assigned": delegated, "delegation_allowed": []}, sort_keys=True, separators=(",", ":"))
            db.execute(
                """INSERT INTO account_admin_audit(
                       audit_id, event_type, actor, target_account_id,
                       target_wallet_address, reason, created_at, detail
                   ) VALUES (?, 'admin_role_granted', ?, ?, NULL, ?, ?, ?)""",
                (str(uuid.uuid4()), actor["account_id"], target["account_id"], reason, created_at, detail),
            )
        return 200, {
            "granted": True,
            "targetEmail": target["email"] or email,
            "role": "admin",
            "adminRoleAssigned": True,
            "adminPermissions": delegated,
            "adminWalletCount": 0,
            "walletEnrolled": False,
            "message": "The existing account has been granted the administrator role. The account holder must enrol and verify their own wallet separately before administrator access is available.",
        }, None

    def revoke_admin_role(
        self, payload: dict, handler: BaseHTTPRequestHandler
    ) -> tuple[int, dict, str | None]:
        if set(payload) != {"email", "reason"}:
            raise ApiError(400, "Provide only the existing administrator email and revocation reason.")
        actor, _expires, token = self.require_admin_permission(handler, "admin.roles.revoke")
        email = normalize_email(payload.get("email"))
        reason = self.validate_admin_reason(payload.get("reason"))
        if email == (actor["email"] or actor["username"]).lower():
            raise ApiError(400, "An administrator cannot revoke their own role through this workflow.")
        now = int(time.time())
        created_at = utc_iso()
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            holder = self._permission_holder_in_transaction(
                db, account_id=actor["account_id"], token=token,
                permission="admin.roles.revoke", now=now,
            )
            if holder is None:
                raise ApiError(403, "The revoke permission or wallet-verified administrator session is no longer active.")
            target = db.execute(
                "SELECT account_id, email, role FROM accounts WHERE email = ? COLLATE NOCASE",
                (email,),
            ).fetchone()
            if target is None:
                raise ApiError(404, "No existing AstroCrown account was found for that email.")
            if target["account_id"] == actor["account_id"]:
                raise ApiError(400, "An administrator cannot revoke their own role through this workflow.")
            if target["role"] != "admin":
                raise ApiError(409, "The target account does not currently hold the administrator role.")
            previous_permissions = [
                row["permission"] for row in db.execute(
                    "SELECT permission FROM account_admin_permissions WHERE account_id = ? ORDER BY permission",
                    (target["account_id"],),
                ).fetchall()
            ]
            wallet_count = int(db.execute(
                "SELECT COUNT(*) FROM admin_wallets WHERE account_id = ? AND active = 1",
                (target["account_id"],),
            ).fetchone()[0])
            db.execute("UPDATE admin_wallets SET active = 0 WHERE account_id = ? AND active = 1", (target["account_id"],))
            db.execute("DELETE FROM account_admin_permissions WHERE account_id = ?", (target["account_id"],))
            db.execute("UPDATE accounts SET role = 'user' WHERE account_id = ?", (target["account_id"],))
            db.execute(
                """UPDATE sessions SET admin_wallet_address = NULL,
                       admin_authenticated_at = NULL, admin_expires_at = NULL
                   WHERE account_id = ?""",
                (target["account_id"],),
            )
            detail = json.dumps({"permissions_revoked": previous_permissions, "wallets_disabled": wallet_count}, sort_keys=True, separators=(",", ":"))
            db.execute(
                """INSERT INTO account_admin_audit(
                       audit_id, event_type, actor, target_account_id,
                       target_wallet_address, reason, created_at, detail
                   ) VALUES (?, 'admin_role_revoked_by_admin', ?, ?, NULL, ?, ?, ?)""",
                (str(uuid.uuid4()), actor["account_id"], target["account_id"], reason, created_at, detail),
            )
        return 200, {
            "revoked": True,
            "targetEmail": target["email"] or email,
            "role": "user",
            "revokedWalletCount": wallet_count,
            "revokedPermissions": previous_permissions,
            "message": "Administrator authority, delegated permissions and enrolled administrator wallets have been revoked. The target's ordinary account sessions remain active.",
        }, None

    def issue_admin_wallet_challenge(
        self, payload: dict, handler: BaseHTTPRequestHandler
    ) -> tuple[int, dict, str | None]:
        if set(payload) != {"address", "chainId"}:
            raise ApiError(400, "Only a registered wallet address and chain ID are accepted.")
        account, expires, token = self.require_account_session(handler)
        if account["role"] != "admin":
            raise ApiError(403, "Administrator authority is not assigned to this account.")
        if self.wallet_auth_service is None or WalletAuthService is None:
            raise ApiError(
                503,
                "Local wallet verification dependencies are not installed; administrator wallet access is disabled.",
            )
        if not self.auth_rate_allowed("admin-wallet-challenge", account["account_id"], limit=5, window=60):
            raise ApiError(429, "Too many administrator wallet challenges. Wait before trying again.")
        try:
            address = parse_wallet_address(payload["address"])
            chain_id = parse_wallet_chain_id(payload["chainId"])
        except (WalletAuthenticationError, TypeError) as error:
            message = str(error) if isinstance(error, Exception) else "Wallet challenge fields are invalid."
            raise ApiError(400, message or "Wallet challenge fields are invalid.") from None

        with self.connect() as db:
            wallet = db.execute(
                """SELECT address, chain_id FROM admin_wallets
                   WHERE account_id = ? AND address = ? COLLATE NOCASE
                     AND chain_id = ? AND active = 1""",
                (account["account_id"], address, chain_id),
            ).fetchone()
        if wallet is None:
            raise ApiError(403, "That wallet is not registered for this administrator account.")

        challenge = self.wallet_auth_service.issue_challenge(wallet["address"], chain_id)
        message = challenge["message"]
        try:
            challenge_expiry = int(
                datetime.fromisoformat(challenge["expiresAt"].replace("Z", "+00:00")).timestamp()
            )
        except (KeyError, TypeError, ValueError):
            raise ApiError(503, "The local wallet verifier returned an invalid challenge expiry.") from None
        message_key = self.wallet_message_digest(message)
        now = int(time.time())
        token_hash = hash_session_token(token)
        with self.admin_challenge_lock:
            for existing_key, binding in list(self.admin_challenge_bindings.items()):
                if int(binding.get("expires_at", 0)) <= now:
                    self.admin_challenge_bindings.pop(existing_key, None)
            # A local development process still has a bounded memory budget.
            if len(self.admin_challenge_bindings) >= 2000:
                self.admin_challenge_bindings.clear()
            self.admin_challenge_bindings[message_key] = {
                "purpose": "admin-session-step-up",
                "account_id": account["account_id"],
                "session_token_hash": token_hash,
                "address": wallet["address"],
                "chain_id": chain_id,
                "expires_at": challenge_expiry,
            }
        return 200, {
            "message": message,
            "expiresAt": challenge["expiresAt"],
            "address": wallet["address"],
            "chainId": chain_id,
            "purpose": "administrator-session-step-up",
            "transactionAuthorized": False,
        }, None

    def verify_admin_wallet_challenge(
        self, payload: dict, handler: BaseHTTPRequestHandler
    ) -> tuple[int, dict, str | None]:
        if set(payload) != {"message", "signature"}:
            raise ApiError(400, "Only the issued sign-in message and its wallet signature are accepted.")
        account, session_expires, token = self.require_account_session(handler)
        if account["role"] != "admin":
            raise ApiError(403, "Administrator authority is not assigned to this account.")
        if self.wallet_auth_service is None:
            raise ApiError(
                503,
                "Local wallet verification dependencies are not installed; administrator wallet access is disabled.",
            )
        message = payload["message"]
        signature = payload["signature"]
        if not isinstance(message, str) or not message or len(message) > 8192:
            raise ApiError(400, "The issued administrator message is invalid.")
        message_key = self.wallet_message_digest(message)
        now = int(time.time())
        session_token_hash = hash_session_token(token)
        with self.admin_challenge_lock:
            binding = self.admin_challenge_bindings.get(message_key)
            if binding is None:
                raise ApiError(401, "This administrator challenge is missing, expired or already used.")
            if (
                binding.get("purpose") != "admin-session-step-up"
                or binding.get("account_id") != account["account_id"]
                or binding.get("session_token_hash") != session_token_hash
            ):
                raise ApiError(401, "This administrator challenge belongs to a different purpose or account session.")
            # Consume our account/session binding before the cryptographic call.
            # The shared SIWE core also consumes its nonce before signature
            # verification, so a failed signature cannot replay this challenge.
            self.admin_challenge_bindings.pop(message_key, None)
        if now >= int(binding.get("expires_at", 0)):
            raise ApiError(401, "This administrator challenge has expired.")

        with self.connect() as db:
            enrolled = db.execute(
                """SELECT address, chain_id FROM admin_wallets
                   WHERE account_id = ? AND address = ? COLLATE NOCASE
                     AND chain_id = ? AND active = 1""",
                (account["account_id"], binding["address"], binding["chain_id"]),
            ).fetchone()
        if enrolled is None:
            raise ApiError(403, "The wallet is no longer registered for this administrator account.")

        try:
            wallet_token, verified_address = self.wallet_auth_service.verify_signature(
                message, signature
            )
        except (WalletAuthenticationError, TypeError) as error:
            message_text = str(error) if isinstance(error, Exception) else "The wallet proof was rejected."
            raise ApiError(401, message_text or "The wallet proof was rejected.") from None
        finally:
            # WalletAuthService is reused for cryptographic verification only.
            # Its temporary stand-alone wallet session must never become the
            # AstroCrown account or administrator session.
            if "wallet_token" in locals():
                self.wallet_auth_service.revoke_session(wallet_token)

        if verified_address.lower() != str(binding["address"]).lower():
            raise ApiError(401, "The verified wallet does not match the registered administrator wallet.")
        admin_expires = min(
            session_expires,
            now + ADMIN_WALLET_SESSION_SECONDS,
        )
        with self.connect() as db:
            cursor = db.execute(
                """UPDATE sessions
                   SET admin_wallet_address = ?, admin_authenticated_at = ?, admin_expires_at = ?
                   WHERE token_hash = ? AND account_id = ? AND expires_at > ?""",
                (
                    verified_address, now, admin_expires,
                    session_token_hash, account["account_id"], now,
                ),
            )
            if cursor.rowcount != 1:
                raise ApiError(401, "The account session expired before administrator verification completed.")
        current, current_expires = self.account_for_session(token)
        if current is None:
            raise ApiError(401, "The account session is no longer valid.")
        response = self.account_summary(current, current_expires)
        if response["admin"] is not True:
            raise ApiError(403, "Administrator wallet verification did not authorize this session.")
        response["message"] = "Administrator wallet proof verified for this local test session."
        return 200, response, None


    def issue_admin_wallet_enrollment_challenge(
        self, payload: dict, handler: BaseHTTPRequestHandler
    ) -> tuple[int, dict, str | None]:
        if set(payload) != {"address", "chainId"}:
            raise ApiError(400, "Only a new wallet address and chain ID are accepted.")
        account, _expires, token = self.require_account_session(handler)
        if account["role"] != "admin":
            raise ApiError(403, "Administrator authority is not assigned to this account.")
        if self.wallet_auth_service is None or WalletAuthService is None:
            raise ApiError(503, "Local wallet verification dependencies are not installed; wallet enrollment is disabled.")
        if not self.auth_rate_allowed("admin-wallet-enrollment-challenge", account["account_id"], limit=3, window=60):
            raise ApiError(429, "Too many wallet-enrollment attempts. Wait before trying again.")
        try:
            address = parse_wallet_address(payload["address"])
            chain_id = parse_wallet_chain_id(payload["chainId"])
        except (WalletAuthenticationError, TypeError) as error:
            raise ApiError(400, str(error) or "Wallet enrollment fields are invalid.") from None

        current_summary = self.account_summary(account, account["expires_at"])
        with self.connect() as db:
            active_count = int(db.execute(
                "SELECT COUNT(*) FROM admin_wallets WHERE account_id = ? AND active = 1",
                (account["account_id"],),
            ).fetchone()[0])
            existing = db.execute(
                "SELECT account_id, active FROM admin_wallets WHERE address = ? COLLATE NOCASE",
                (address,),
            ).fetchone()
        initial_enrollment = active_count == 0
        if initial_enrollment:
            if current_summary["adminSessionAuthorized"] is True:
                raise ApiError(409, "The wallet registry changed; refresh account status before beginning initial enrollment.")
        elif current_summary["adminSessionAuthorized"] is not True:
            raise ApiError(403, "Re-verify an enrolled administrator wallet before adding another wallet.")
        if active_count >= 3:
            raise ApiError(409, "This account already has three active administrator wallets.")
        if existing is not None:
            if existing["account_id"] == account["account_id"]:
                if existing["active"]:
                    raise ApiError(409, "That wallet is already enrolled for this account.")
                raise ApiError(409, "That wallet was previously revoked and cannot be reactivated by this UI.")
            raise ApiError(409, "That wallet is already assigned to another account.")

        statement = (
            "Register this wallet as the first AstroCrown administrator wallet. "
            "This signature does not authorize a transaction."
            if initial_enrollment else
            "Register this wallet as an additional AstroCrown administrator wallet. "
            "This signature does not authorize a transaction."
        )
        challenge = self.wallet_auth_service.issue_challenge(address, chain_id, statement=statement)
        message = challenge["message"]
        try:
            challenge_expiry = int(datetime.fromisoformat(challenge["expiresAt"].replace("Z", "+00:00")).timestamp())
        except (KeyError, TypeError, ValueError):
            raise ApiError(503, "The local wallet verifier returned an invalid challenge expiry.") from None

        message_key = self.wallet_message_digest(message)
        now = int(time.time())
        token_hash = hash_session_token(token)
        with self.admin_challenge_lock:
            for existing_key, binding in list(self.admin_challenge_bindings.items()):
                if int(binding.get("expires_at", 0)) <= now:
                    self.admin_challenge_bindings.pop(existing_key, None)
            if len(self.admin_challenge_bindings) >= 2000:
                self.admin_challenge_bindings.clear()
            self.admin_challenge_bindings[message_key] = {
                "purpose": "admin-initial-wallet-enrollment" if initial_enrollment else "admin-wallet-enrollment",
                "account_id": account["account_id"],
                "session_token_hash": token_hash,
                "address": address,
                "chain_id": chain_id,
                "actor_wallet_address": current_summary["adminWalletAddress"] if not initial_enrollment else None,
                "expires_at": challenge_expiry,
            }

        return 200, {
            "message": message,
            "expiresAt": challenge["expiresAt"],
            "address": address,
            "chainId": chain_id,
            "purpose": "administrator-wallet-enrollment",
            "enrollmentType": "initial" if initial_enrollment else "additional",
            "transactionAuthorized": False,
        }, None

    def verify_admin_wallet_enrollment(
        self, payload: dict, handler: BaseHTTPRequestHandler
    ) -> tuple[int, dict, str | None]:
        if set(payload) != {"message", "signature"}:
            raise ApiError(400, "Only the issued enrollment message and its wallet signature are accepted.")
        account, session_expires, token = self.require_account_session(handler)
        if account["role"] != "admin":
            raise ApiError(403, "Administrator authority is not assigned to this account.")
        if self.wallet_auth_service is None:
            raise ApiError(503, "Local wallet verification dependencies are not installed; wallet enrollment is disabled.")

        message = payload["message"]
        signature = payload["signature"]
        if not isinstance(message, str) or not message or len(message) > 8192:
            raise ApiError(400, "The wallet-enrollment message is invalid.")
        message_key = self.wallet_message_digest(message)
        now = int(time.time())
        session_token_hash = hash_session_token(token)
        with self.admin_challenge_lock:
            binding = self.admin_challenge_bindings.get(message_key)
            if binding is None:
                raise ApiError(401, "This administrator challenge is missing, expired or already used.")
            if (
                binding.get("purpose") not in {"admin-initial-wallet-enrollment", "admin-wallet-enrollment"}
                or binding.get("account_id") != account["account_id"]
                or binding.get("session_token_hash") != session_token_hash
            ):
                raise ApiError(401, "This wallet-enrollment challenge belongs to a different purpose or account session.")
            self.admin_challenge_bindings.pop(message_key, None)
        if now >= int(binding.get("expires_at", 0)):
            raise ApiError(401, "This wallet-enrollment challenge has expired.")

        initial_enrollment = binding.get("purpose") == "admin-initial-wallet-enrollment"
        current_summary = self.account_summary(account, session_expires)
        if initial_enrollment:
            if current_summary["adminWalletCount"] != 0 or current_summary["adminSessionAuthorized"] is True:
                raise ApiError(409, "Initial wallet enrollment is no longer available for this account.")
            if binding.get("actor_wallet_address") is not None:
                raise ApiError(401, "The initial enrollment challenge has an invalid actor binding.")
        else:
            if current_summary["adminSessionAuthorized"] is not True:
                raise ApiError(403, "An active, wallet-verified administrator session is required to add another wallet.")
            if str(current_summary["adminWalletAddress"]).lower() != str(binding.get("actor_wallet_address", "")).lower():
                raise ApiError(401, "The existing administrator wallet session changed; begin enrollment again.")

        with self.connect() as db:
            actor_still_active = None
            if not initial_enrollment:
                actor_still_active = db.execute(
                    """SELECT 1 FROM admin_wallets
                       WHERE account_id = ? AND address = ? COLLATE NOCASE AND active = 1""",
                    (account["account_id"], binding["actor_wallet_address"]),
                ).fetchone()
            active_count = int(db.execute(
                "SELECT COUNT(*) FROM admin_wallets WHERE account_id = ? AND active = 1",
                (account["account_id"],),
            ).fetchone()[0])
            existing = db.execute(
                "SELECT account_id, active FROM admin_wallets WHERE address = ? COLLATE NOCASE",
                (binding["address"],),
            ).fetchone()
        if not initial_enrollment and actor_still_active is None:
            raise ApiError(403, "The previously verified administrator wallet is no longer active.")
        if initial_enrollment and active_count != 0:
            raise ApiError(409, "Another wallet was enrolled first. Refresh account status.")
        if active_count >= 3:
            raise ApiError(409, "This account already has three active administrator wallets.")
        if existing is not None:
            raise ApiError(409, "The requested wallet has already been registered or revoked; use a different wallet.")

        try:
            wallet_token, verified_address = self.wallet_auth_service.verify_signature(message, signature)
        except (WalletAuthenticationError, TypeError) as error:
            raise ApiError(401, str(error) or "The wallet-enrollment signature was rejected.") from None
        finally:
            if "wallet_token" in locals():
                self.wallet_auth_service.revoke_session(wallet_token)

        if str(verified_address).lower() != str(binding["address"]).lower():
            raise ApiError(401, "The signature was not produced by the proposed wallet.")

        created_at = utc_iso()
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            current_account = db.execute(
                """SELECT a.role, s.expires_at FROM accounts a
                   JOIN sessions s ON s.account_id = a.account_id
                   WHERE a.account_id = ? AND s.token_hash = ? AND s.expires_at > ?""",
                (account["account_id"], session_token_hash, int(time.time())),
            ).fetchone()
            if current_account is None or current_account["role"] != "admin":
                raise ApiError(401, "The ordinary account session or administrator role is no longer active.")
            count_now = int(db.execute(
                "SELECT COUNT(*) FROM admin_wallets WHERE account_id = ? AND active = 1",
                (account["account_id"],),
            ).fetchone()[0])
            existing = db.execute("SELECT 1 FROM admin_wallets WHERE address = ? COLLATE NOCASE", (binding["address"],)).fetchone()
            if initial_enrollment and count_now != 0:
                raise ApiError(409, "Another wallet was enrolled first. Refresh account status.")
            if not initial_enrollment and count_now == 0:
                raise ApiError(409, "The previously enrolled administrator wallet is no longer active.")
            if existing is not None:
                raise ApiError(409, "The proposed wallet was registered during verification; restart enrollment.")
            if count_now >= 3:
                raise ApiError(409, "This account already has three active administrator wallets.")
            db.execute(
                """INSERT INTO admin_wallets(
                       wallet_id, account_id, address, chain_id, created_at, active, provisioning_source
                   ) VALUES (?, ?, ?, ?, ?, 1, ?)""",
                (str(uuid.uuid4()), account["account_id"], binding["address"],
                 int(binding["chain_id"]), created_at,
                 "admin-initial-wallet-enrollment" if initial_enrollment else "admin-wallet-enrollment"),
            )
            db.execute(
                """INSERT INTO account_admin_audit(
                       audit_id, event_type, actor, target_account_id, target_wallet_address, reason, created_at
                   ) VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (str(uuid.uuid4()),
                 "admin_initial_wallet_enrolled" if initial_enrollment else "admin_wallet_enrolled",
                 account["account_id"] if initial_enrollment else str(binding["actor_wallet_address"]),
                 account["account_id"], binding["address"],
                 "The account holder proved control of the first administrator wallet by a fresh SIWE signature."
                 if initial_enrollment else
                 "Additional wallet proved by a fresh SIWE signature in the local prototype.",
                 created_at),
            )
            db.execute(
                """UPDATE sessions SET admin_wallet_address = NULL,
                       admin_authenticated_at = NULL, admin_expires_at = NULL
                   WHERE account_id = ?""",
                (account["account_id"],),
            )

        updated_account, updated_expires = self.account_for_session(token)
        if updated_account is None:
            raise ApiError(401, "The ordinary account session expired after wallet enrollment.")
        result = self.account_summary(updated_account, updated_expires)
        result["message"] = (
            "The first administrator wallet was enrolled. A separate fresh signature from that wallet is required to open the administrator dashboard."
            if initial_enrollment else
            "The additional wallet was enrolled. Re-verify a registered wallet before returning to the administrator console."
        )
        result["walletEnrolledAddress"] = binding["address"]
        return 200, result, None

    def handle(self, path: str, payload: dict, handler: BaseHTTPRequestHandler) -> tuple[int, dict, str | None]:
        """Return (status, JSON, optional Set-Cookie header)."""
        legacy_email_routes = {
            "/api/account/password/change",
            "/api/account/sessions/revoke-others",
            "/api/account/register",
            "/api/account/login",
            "/api/account/verification/resend",
            "/api/account/email/verify",
            "/api/account/password/reset/complete",
            "/api/account/password-reset/request",
        }
        if not self.enable_legacy_email_auth and path in legacy_email_routes:
            raise ApiError(410, "Email/password authentication is retired. Use a registered passkey.")

        if path == "/api/passkeys/register/options":
            return self.issue_passkey_registration_options(payload, handler)

        if path == "/api/passkeys/register/verify":
            return self.verify_passkey_registration(payload, handler)

        if path == "/api/passkeys/authentication/options":
            return self.issue_passkey_authentication_options(payload, handler)

        if path == "/api/passkeys/authentication/verify":
            return self.verify_passkey_authentication(payload, handler)

        if path == "/api/cases/mine":
            account, _expires, _token = self.require_account_session(handler)
            return 200, self.case_store.list_for_account(account["account_id"]), None

        if path == "/api/cases/admin/list":
            self.require_case_admin_session(handler)
            return 200, self.case_store.admin_list(), None

        if path == "/api/account/status":
            account, expires = self.account_for_session(self.get_cookie(handler))
            if account is None:
                return 200, {
                    "authenticated": False,
                    "avatarId": "person",
                    "role": "user",
                    "adminRoleAssigned": False,
                    "adminWalletCount": 0,
                    "adminWalletAuthenticated": False,
                    "adminSessionAuthorized": False,
                    "admin": False,
                    "adminWalletAddress": None,
                    "adminSessionExpiresAt": None,
                    "passkeyAvailable": self.passkey_auth_service is not None,
                    "emailVerificationDeliveryAvailable": False,
                    "passwordResetAvailable": False,
                    "activeSessionCount": 0,
                }, None
            return 200, self.account_summary(account, expires), None

        if path == "/api/admin/status":
            account, expires = self.account_for_session(self.get_cookie(handler))
            if account is None:
                raise ApiError(401, "Sign in to your account before checking administrator access.")
            if account["role"] != "admin":
                raise ApiError(403, "Administrator authority is not assigned to this account.")
            summary = self.account_summary(account, expires)
            if summary["adminSessionAuthorized"] is not True:
                raise ApiError(
                    403,
                    "A fresh signature from an enrolled administrator wallet is required for the admin console.",
                )
            return 200, summary, None

        if path == "/api/account/password/change":
            account, _expires, old_token = self.require_account_session(handler)
            current_password = payload.get("currentPassword")
            if not isinstance(current_password, str) or not current_password or len(current_password) > PASSWORD_MAX_LENGTH:
                raise ApiError(400, "Enter your current password.")
            new_password = validate_password(payload.get("newPassword"))
            confirmation = payload.get("newPasswordConfirmation")
            if not isinstance(confirmation, str) or not hmac.compare_digest(new_password, confirmation):
                raise ApiError(400, "The new password confirmation does not match.")
            if new_password == current_password:
                raise ApiError(400, "Choose a new password that is different from your current password.")
            if not self.auth_rate_allowed("password-change", account["account_id"], limit=5, window=300):
                raise ApiError(429, "Too many password-change attempts. Please wait before trying again.")
            if not self.verify_password(account, current_password):
                raise ApiError(401, "Your current password did not match. Your password was not changed.")

            new_salt = secrets.token_bytes(16)
            new_hash = self.hash_password(new_password, new_salt)
            new_token = secrets.token_urlsafe(32)
            now = int(time.time())
            new_expires = now + SESSION_LIFETIME_SECONDS
            with self.connect() as db:
                # Lock before rechecking the credential and current session.
                # This prevents concurrent password changes from overwriting
                # each other through a session that another change invalidated.
                db.execute("BEGIN IMMEDIATE")
                current_credentials = db.execute(
                    "SELECT password_salt, password_hash FROM accounts WHERE account_id = ?",
                    (account["account_id"],),
                ).fetchone()
                if current_credentials is None or not (
                    hmac.compare_digest(bytes(current_credentials["password_salt"]), bytes(account["password_salt"]))
                    and hmac.compare_digest(bytes(current_credentials["password_hash"]), bytes(account["password_hash"]))
                ):
                    raise ApiError(401, "The account password changed. Sign in again before changing it.")
                current_session = db.execute(
                    "SELECT 1 FROM sessions WHERE account_id = ? AND token_hash = ? AND expires_at > ?",
                    (account["account_id"], hash_session_token(old_token), now),
                ).fetchone()
                if current_session is None:
                    raise ApiError(401, "Your account session is no longer valid. Sign in again.")
                existing_sessions = db.execute(
                    "SELECT COUNT(*) FROM sessions WHERE account_id = ? AND expires_at > ?",
                    (account["account_id"], now),
                ).fetchone()[0]
                db.execute(
                    "UPDATE accounts SET password_salt = ?, password_hash = ? WHERE account_id = ?",
                    (new_salt, new_hash, account["account_id"]),
                )
                # Password changes invalidate every old session and every
                # administrator step-up. Only the newly rotated session survives.
                db.execute("DELETE FROM sessions WHERE account_id = ?", (account["account_id"],))
                db.execute(
                    "INSERT INTO sessions(token_hash, account_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
                    (hash_session_token(new_token), account["account_id"], now, new_expires),
                )
                db.execute(
                    "INSERT INTO account_security_audit(audit_id, account_id, event_type, created_at, detail) VALUES (?, ?, ?, ?, ?)",
                    (
                        str(uuid.uuid4()), account["account_id"], "password_changed", utc_iso(),
                        f"previous_active_sessions={max(0, int(existing_sessions) - 1)}",
                    ),
                )
            updated_account, updated_expires = self.account_for_session(new_token)
            if updated_account is None:
                raise ApiError(500, "The renewed account session could not be initialized.")
            result = self.account_summary(updated_account, updated_expires)
            result["revokedSessions"] = max(0, int(existing_sessions) - 1)
            result["message"] = "Password updated. Other sessions were signed out and this session was renewed."
            return 200, result, self.cookie_header(new_token)

        if path == "/api/account/sessions/revoke-others":
            account, _expires, token = self.require_account_session(handler)
            password = payload.get("password")
            if not isinstance(password, str) or not password or len(password) > PASSWORD_MAX_LENGTH:
                raise ApiError(400, "Enter your current password to confirm this action.")
            if not self.auth_rate_allowed("session-revoke-others", account["account_id"], limit=5, window=300):
                raise ApiError(429, "Too many session-management attempts. Please wait before trying again.")
            if not self.verify_password(account, password):
                raise ApiError(401, "Your current password did not match. No sessions were changed.")
            with self.connect() as db:
                cursor = db.execute(
                    "DELETE FROM sessions WHERE account_id = ? AND token_hash <> ?",
                    (account["account_id"], hash_session_token(token)),
                )
                revoked = max(0, int(cursor.rowcount))
                db.execute(
                    "INSERT INTO account_security_audit(audit_id, account_id, event_type, created_at, detail) VALUES (?, ?, ?, ?, ?)",
                    (str(uuid.uuid4()), account["account_id"], "other_sessions_revoked", utc_iso(), f"revoked_count={revoked}"),
                )
            current, current_expires = self.account_for_session(token)
            if current is None:
                raise ApiError(401, "Your current account session is no longer valid.")
            result = self.account_summary(current, current_expires)
            result["revokedSessions"] = revoked
            result["message"] = (
                f"Signed out of {revoked} other session(s). This session remains active."
            )
            return 200, result, None

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
            if not self.auth_rate_allowed("register", email, limit=5):
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
            account, expires = self.account_for_session(token)
            if account is None:
                raise ApiError(500, "The local account session could not be initialized.")
            result = self.account_summary(account, expires)
            email_sent = (
                self.send_verification_email(account_id, email)
                if self.email_delivery_available else False
            )
            result["emailVerificationEmailSent"] = email_sent
            if email_sent:
                result["message"] = (
                    "Development test account created. A verification email was submitted to the configured mail transport."
                )
            elif self.email_delivery_available:
                result["message"] = (
                    "Development test account created, but the verification email could not be submitted. No email was sent."
                )
            else:
                result["message"] = (
                    "Development test account created. Email is not verified and no email or newsletter message was sent."
                )
            return 201, result, self.cookie_header(token)

        if path == "/api/account/login":
            email = normalize_email(payload.get("email"))
            password = payload.get("password")
            if not isinstance(password, str) or len(password) > PASSWORD_MAX_LENGTH:
                raise ApiError(400, "Enter your email address and password.")
            if not self.auth_rate_allowed("login", email, limit=10):
                raise ApiError(429, "Too many sign-in attempts. Wait a minute before trying again.")
            with self.connect() as db:
                account = db.execute("SELECT * FROM accounts WHERE email = ? COLLATE NOCASE", (email,)).fetchone()
            if not self.verify_password(account, password):
                raise ApiError(401, "Email address or password did not match.")
            self.clear_auth_rate_limit("login", email)
            issued_session = self.new_session_for_password_auth(account)
            if issued_session is None:
                # The credential changed after password verification. Do not
                # issue a session based on a stale password snapshot.
                raise ApiError(401, "Email address or password did not match.")
            token, expires = issued_session
            account, expires = self.account_for_session(token)
            if account is None:
                raise ApiError(500, "The local account session could not be initialized.")
            return 200, self.account_summary(account, expires), self.cookie_header(token)


        if path == "/api/account/verification/resend":
            account, _expires, _token = self.require_account_session(handler)
            if payload:
                raise ApiError(400, "No additional fields are accepted for verification resend.")
            if bool(account["email_verified"]):
                return 200, {
                    "emailVerified": True,
                    "emailSent": False,
                    "message": "Your email address is already verified.",
                }, None
            if not self.auth_rate_allowed("verification-resend", account["account_id"], limit=3, window=3600):
                raise ApiError(429, "Too many verification-email requests. Try again later.")
            if not self.email_delivery_available:
                return 200, {
                    "emailVerified": False,
                    "emailSent": False,
                    "message": "Email delivery is not configured. No verification email was sent.",
                }, None
            sent = self.send_verification_email(account["account_id"], account["email"] or account["username"])
            return 200, {
                "emailVerified": False,
                "emailSent": sent,
                "message": (
                    "A verification email was submitted to the configured mail transport."
                    if sent else "The verification email could not be submitted. No email was sent."
                ),
            }, None

        if path == "/api/account/email/verify":
            if set(payload) != {"token"}:
                raise ApiError(400, "Only the verification token is accepted.")
            if not self.auth_rate_allowed(
                "email-verification-consume-ip", self.case_rate_subject(handler),
                limit=30, window=3600,
            ):
                raise ApiError(429, "Too many email-verification attempts. Please request a new link later.")
            return 200, self.complete_email_verification(payload.get("token")), None

        if path == "/api/account/password/reset/complete":
            if set(payload) != {"token", "newPassword", "newPasswordConfirmation"}:
                raise ApiError(400, "The password-reset request is incomplete.")
            if not self.auth_rate_allowed(
                "password-reset-complete-ip", self.case_rate_subject(handler),
                limit=10, window=3600,
            ):
                raise ApiError(429, "Too many password-reset attempts from this connection. Please try again later.")
            result = self.complete_password_reset(
                payload.get("token"),
                payload.get("newPassword"),
                payload.get("newPasswordConfirmation"),
            )
            return 200, result, self.clear_cookie_header()

        if path == "/api/cases/create":
            subject = self.case_rate_subject(handler)
            if not self.rate_allowed("case-create", subject, limit=8, window=600):
                raise ApiError(429, "Too many new case submissions from this connection. Please try again later.")
            account, _expires = self.account_for_session(self.get_cookie(handler))
            account_id = account["account_id"] if account is not None else None
            return 201, self.case_store.create(payload, account_id=account_id), None

        if path == "/api/cases/lookup":
            subject = self.case_rate_subject(handler)
            if not self.rate_allowed("case-lookup", subject, limit=30, window=60):
                raise ApiError(429, "Too many case-access attempts. Please wait before trying again.")
            return 200, self.case_store.lookup(payload), None

        if path == "/api/cases/message":
            subject = self.case_rate_subject(handler)
            if not self.rate_allowed("case-message", subject, limit=20, window=300):
                raise ApiError(429, "Too many case updates from this connection. Please try again later.")
            return 200, self.case_store.submit_message(payload), None

        if path == "/api/cases/account-view":
            account, _expires, _token = self.require_account_session(handler)
            return 200, self.case_store.lookup_for_account(payload, account["account_id"]), None

        if path == "/api/cases/account-message":
            account, _expires, _token = self.require_account_session(handler)
            subject = account["account_id"]
            if not self.rate_allowed("case-account-message", subject, limit=20, window=300):
                raise ApiError(429, "Too many case updates. Please try again later.")
            return 200, self.case_store.submit_message_for_account(payload, account["account_id"]), None

        if path == "/api/cases/recovery-request":
            subject = self.case_rate_subject(handler)
            if not self.rate_allowed("case-recovery-request", subject, limit=5, window=3600):
                raise ApiError(429, "Too many case-recovery requests from this connection. Please try again later.")
            return 201, self.case_store.request_recovery(payload), None

        if path == "/api/cases/recovery-status":
            subject = self.case_rate_subject(handler)
            if not self.rate_allowed("case-recovery-status", subject, limit=20, window=300):
                raise ApiError(429, "Too many recovery-status checks. Please try again later.")
            return 200, self.case_store.recovery_status(payload), None

        if path == "/api/cases/admin/action":
            account = self.require_case_admin_session(handler)
            return 200, self.case_store.admin_action(payload, account["account_id"]), None

        if path == "/api/cases/admin/recovery-action":
            account = self.require_case_admin_session(handler)
            return 200, self.case_store.admin_decide_recovery(payload, account["account_id"]), None

        if path == "/api/account/avatar":
            account, expires = self.account_for_session(self.get_cookie(handler))
            if account is None:
                raise ApiError(401, "Sign in before changing your test avatar.")
            avatar_id = payload.get("avatarId")
            if not isinstance(avatar_id, str) or avatar_id not in AVATAR_IDS:
                raise ApiError(400, "Choose one of the provided account avatars.")
            with self.connect() as db:
                db.execute(
                    "UPDATE accounts SET avatar_id = ? WHERE account_id = ?",
                    (avatar_id, account["account_id"]),
                )
            account, expires = self.account_for_session(self.get_cookie(handler))
            if account is None:
                raise ApiError(401, "The account session is no longer valid.")
            result = self.account_summary(account, expires)
            result["message"] = "The avatar was updated for this local test account."
            return 200, result, None

        if path == "/api/admin/roles/grant":
            return self.grant_admin_role(payload, handler)

        if path == "/api/admin/roles/revoke":
            return self.revoke_admin_role(payload, handler)

        if path == "/api/admin/wallet-options":
            if payload:
                raise ApiError(400, "Unexpected administrator wallet-options fields.")
            account, _expires, _token = self.require_account_session(handler)
            if account["role"] != "admin":
                raise ApiError(403, "Administrator authority is not assigned to this account.")
            with self.connect() as db:
                rows = db.execute(
                    """SELECT address, chain_id FROM admin_wallets
                       WHERE account_id = ? AND active = 1
                       ORDER BY created_at, address""",
                    (account["account_id"],),
                ).fetchall()
            return 200, {
                "wallets": [
                    {"address": row["address"], "chainId": int(row["chain_id"])}
                    for row in rows
                ],
                "maxWallets": 3,
                "requiresFreshSignature": True,
                "transactionAuthorized": False,
            }, None

        if path == "/api/admin/wallet-challenge":
            return self.issue_admin_wallet_challenge(payload, handler)

        if path == "/api/admin/wallet-verify":
            return self.verify_admin_wallet_challenge(payload, handler)

        if path == "/api/admin/wallet-enrollment-challenge":
            return self.issue_admin_wallet_enrollment_challenge(payload, handler)

        if path == "/api/admin/wallet-enrollment-verify":
            return self.verify_admin_wallet_enrollment(payload, handler)

        if path == "/api/admin/wallet-logout":
            if payload:
                raise ApiError(400, "Unexpected administrator sign-out fields.")
            account, expires, token = self.require_account_session(handler)
            with self.connect() as db:
                db.execute(
                    """UPDATE sessions SET admin_wallet_address = NULL,
                       admin_authenticated_at = NULL, admin_expires_at = NULL
                       WHERE token_hash = ? AND account_id = ?""",
                    (hash_session_token(token), account["account_id"]),
                )
            current, current_expires = self.account_for_session(token)
            if current is None:
                raise ApiError(401, "The account session is no longer valid.")
            result = self.account_summary(current, current_expires)
            result["message"] = "Administrator access ended; ordinary account sign-in remains active."
            return 200, result, None

        if path == "/api/account/logout":
            token = self.get_cookie(handler)
            if token:
                with self.connect() as db:
                    db.execute("DELETE FROM sessions WHERE token_hash = ?", (hash_session_token(token),))
            return 200, {"authenticated": False, "message": "You have signed out."}, self.clear_cookie_header()

        if path == "/api/account/password-reset/request":
            email = normalize_email(payload.get("email"))
            if set(payload) != {"email"}:
                raise ApiError(400, "Only the account email address is accepted for password reset.")
            if not self.auth_rate_allowed(
                "password-reset-request-ip", self.case_rate_subject(handler),
                limit=15, window=3600,
            ):
                raise ApiError(429, "Too many password-reset requests from this connection. Please try again later.")
            if not self.auth_rate_allowed("password-reset-request", email, limit=3, window=3600):
                raise ApiError(429, "Too many password-reset requests. Try again later.")
            if not self.email_delivery_available:
                return 200, {
                    "emailSent": False,
                    "message": "Email delivery is not configured. No password-reset email was sent.",
                }, None
            with self.connect() as db:
                account = db.execute(
                    "SELECT account_id, email FROM accounts WHERE email = ? COLLATE NOCASE",
                    (email,),
                ).fetchone()
            if account is not None:
                raw_token, _expires = self.issue_email_action_token(
                    account["account_id"], "password_reset", 30 * 60
                )
                sent = self.deliver_account_action_email(
                    recipient=account["email"],
                    action="reset",
                    raw_token=raw_token,
                )
                if sent:
                    sent = self.activate_email_action_token(raw_token)
                if not sent:
                    self.invalidate_email_action_token(raw_token)
            else:
                sent = False
            # Keep the response identical for existing and unknown email addresses.
            return 200, {
                "requestAccepted": True,
                "message": "If an account exists and the configured mail transport accepts the message, a reset link may arrive. This response does not confirm account existence or inbox delivery.",
            }, None

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
                "/account-continuity/prototype/admin-wallet-ui.js": (
                    PROTOTYPE_DIR / "admin-wallet-ui.js", "text/javascript; charset=utf-8"
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
                "/account-continuity/prototype/email-action.html": (
                    PROTOTYPE_DIR / "email-action.html", "text/html; charset=utf-8"
                ),
                "/account-continuity/prototype/email-action.js": (
                    PROTOTYPE_DIR / "email-action.js", "text/javascript; charset=utf-8"
                ),
                "/account-continuity/prototype/cases.html": (
                    PROTOTYPE_DIR / "cases.html", "text/html; charset=utf-8"
                ),
                "/account-continuity/prototype/cases.css": (
                    PROTOTYPE_DIR / "cases.css", "text/css; charset=utf-8"
                ),
                "/account-continuity/prototype/cases-ui.js": (
                    PROTOTYPE_DIR / "cases-ui.js", "text/javascript; charset=utf-8"
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
            if path in {
                "/api/account/status", "/api/admin/status",
                "/api/cases/mine", "/api/cases/admin/list",
            }:
                try:
                    status, payload, cookie = application.handle(path, {}, self)
                except (ApiError, CaseError) as error:
                    self.json_response(error.status, {"error": error.message})
                    return
                except Exception:
                    # Keep internal details out of the HTTP response, matching POST handling.
                    self.json_response(500, {"error": "The local prototype encountered an unexpected error."})
                    return
                self.json_response(status, payload, cookie)
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
            except (ApiError, CaseError) as error:
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
    if application.email_sender is not None and not application.email_public_base_url:
        application.email_public_base_url = f"http://localhost:{server.server_port}"
    application.configure_wallet_auth(server.server_port)
    application.configure_passkey_auth(server.server_port)
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
    if application.email_delivery_available:
        provider = os.environ.get("ASTROCROWN_EMAIL_PROVIDER", "smtp").strip().lower()
        usage = application.email_send_budget.usage()
        print(
            f"Account email delivery: {provider} SMTP transport configured "
            "(connectivity and inbox delivery not yet verified)."
        )
        print(
            "Local account-email quota: "
            f"{usage['daily_count']}/{usage['daily_limit']} rolling 24h; "
            f"{usage['monthly_count']}/{usage['monthly_limit']} rolling 30d."
        )
    else:
        print(
            "Account email delivery: not configured; verification and password-reset messages will not be sent."
        )
    print("Crypto-news newsletter delivery is not configured.")
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
