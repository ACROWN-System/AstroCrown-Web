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
import threading
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
TERMS_VERSION = "development-terms-2026-10-31-v0.3"
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
REFERRAL_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$")
AVATAR_IDS = frozenset({"person", "crown", "star", "moon", "orbit", "shield"})
ADMIN_WALLET_SESSION_SECONDS = 10 * 60
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

    def __init__(self, database_path: Path | str):
        self.database_path = Path(database_path).expanduser().resolve()
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        try:
            os.chmod(self.database_path.parent, 0o700)
        except OSError:
            pass
        self.rate_events: dict[tuple[str, str], list[float]] = {}
        self.wallet_auth_service = None
        self.admin_challenge_bindings: dict[str, dict[str, object]] = {}
        self.admin_challenge_lock = threading.RLock()
        self.dummy_salt = b"acrown-local-prototype"
        self.dummy_hash = self.hash_password("not-a-real-account-password", self.dummy_salt)
        self.initialize_database()
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
                CREATE TABLE IF NOT EXISTS account_admin_audit (
                    audit_id TEXT PRIMARY KEY,
                    event_type TEXT NOT NULL,
                    actor TEXT NOT NULL,
                    target_account_id TEXT,
                    target_wallet_address TEXT,
                    reason TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
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
                "avatar_id": "TEXT NOT NULL DEFAULT 'person' CHECK(avatar_id IN ('person', 'crown', 'star', 'moon', 'orbit', 'shield'))",
            }
            for name, definition in migrations.items():
                if name not in columns:
                    db.execute(f"ALTER TABLE accounts ADD COLUMN {name} {definition}")
            db.execute("UPDATE accounts SET email = username WHERE email IS NULL OR email = ''")
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
                          ) AS admin_wallet_count
                   FROM sessions s
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
        role_assigned = account["role"] == "admin"
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
            "email": account["email"] or account["username"],
            "createdAt": account["created_at"],
            "avatarId": account["avatar_id"],
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
            "role": account["role"],
            "adminRoleAssigned": role_assigned,
            "adminWalletCount": int(account["admin_wallet_count"] or 0) if role_assigned else 0,
            "adminWalletAuthenticated": wallet_authenticated,
            "adminSessionAuthorized": wallet_authenticated,
            "admin": wallet_authenticated,
            "adminWalletAddress": wallet_address if wallet_authenticated else None,
            "adminSessionExpiresAt": utc_iso(wallet_step_up_expires) if wallet_authenticated else None,
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
        if not self.rate_allowed("admin-wallet-challenge", account["account_id"], limit=5, window=60):
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
        current_summary = self.account_summary(account, account["expires_at"])
        if current_summary["adminSessionAuthorized"] is not True:
            raise ApiError(403, "Re-verify an enrolled administrator wallet before adding another wallet.")
        if self.wallet_auth_service is None or WalletAuthService is None:
            raise ApiError(503, "Local wallet verification dependencies are not installed; wallet enrollment is disabled.")
        if not self.rate_allowed("admin-wallet-enrollment-challenge", account["account_id"], limit=3, window=60):
            raise ApiError(429, "Too many wallet-enrollment attempts. Wait before trying again.")
        try:
            address = parse_wallet_address(payload["address"])
            chain_id = parse_wallet_chain_id(payload["chainId"])
        except (WalletAuthenticationError, TypeError) as error:
            raise ApiError(400, str(error) or "Wallet enrollment fields are invalid.") from None

        with self.connect() as db:
            active_count = int(db.execute(
                "SELECT COUNT(*) FROM admin_wallets WHERE account_id = ? AND active = 1",
                (account["account_id"],),
            ).fetchone()[0])
            existing = db.execute(
                """SELECT account_id, active FROM admin_wallets
                   WHERE address = ? COLLATE NOCASE""",
                (address,),
            ).fetchone()
        if active_count >= 3:
            raise ApiError(409, "This account already has three active administrator wallets.")
        if existing is not None:
            if existing["account_id"] == account["account_id"]:
                if existing["active"]:
                    raise ApiError(409, "That wallet is already enrolled for this account.")
                raise ApiError(409, "That wallet was previously revoked and cannot be reactivated by this UI.")
            raise ApiError(409, "That wallet is already assigned to another account.")

        statement = (
            "Register this wallet as an additional AstroCrown administrator wallet. "
            "This signature does not authorize a transaction."
        )
        challenge = self.wallet_auth_service.issue_challenge(
            address, chain_id, statement=statement
        )
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
            if len(self.admin_challenge_bindings) >= 2000:
                self.admin_challenge_bindings.clear()
            self.admin_challenge_bindings[message_key] = {
                "purpose": "admin-wallet-enrollment",
                "account_id": account["account_id"],
                "session_token_hash": token_hash,
                "address": address,
                "chain_id": chain_id,
                "actor_wallet_address": current_summary["adminWalletAddress"],
                "expires_at": challenge_expiry,
            }

        return 200, {
            "message": message,
            "expiresAt": challenge["expiresAt"],
            "address": address,
            "chainId": chain_id,
            "purpose": "administrator-wallet-enrollment",
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
        current_summary = self.account_summary(account, session_expires)
        if current_summary["adminSessionAuthorized"] is not True:
            raise ApiError(403, "An active, wallet-verified administrator session is required to add another wallet.")
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
                raise ApiError(401, "This wallet-enrollment challenge is missing, expired or already used.")
            if (
                binding.get("purpose") != "admin-wallet-enrollment"
                or binding.get("account_id") != account["account_id"]
                or binding.get("session_token_hash") != session_token_hash
            ):
                raise ApiError(401, "This wallet-enrollment challenge belongs to a different purpose or account session.")
            self.admin_challenge_bindings.pop(message_key, None)
        if now >= int(binding.get("expires_at", 0)):
            raise ApiError(401, "This wallet-enrollment challenge has expired.")
        if str(current_summary["adminWalletAddress"]).lower() != str(binding.get("actor_wallet_address", "")).lower():
            raise ApiError(401, "The existing administrator wallet session changed; begin enrollment again.")

        with self.connect() as db:
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
        if actor_still_active is None:
            raise ApiError(403, "The previously verified administrator wallet is no longer active.")
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
            # Repeat the cap/uniqueness check in the write transaction boundary.
            existing = db.execute(
                "SELECT 1 FROM admin_wallets WHERE address = ? COLLATE NOCASE",
                (binding["address"],),
            ).fetchone()
            count_now = int(db.execute(
                "SELECT COUNT(*) FROM admin_wallets WHERE account_id = ? AND active = 1",
                (account["account_id"],),
            ).fetchone()[0])
            if existing is not None:
                raise ApiError(409, "The proposed wallet was registered during verification; restart enrollment.")
            if count_now >= 3:
                raise ApiError(409, "This account already has three active administrator wallets.")
            db.execute(
                """INSERT INTO admin_wallets(
                       wallet_id, account_id, address, chain_id, created_at, active, provisioning_source
                   ) VALUES (?, ?, ?, ?, ?, 1, 'admin-wallet-enrollment')""",
                (
                    str(uuid.uuid4()), account["account_id"], binding["address"],
                    int(binding["chain_id"]), created_at,
                ),
            )
            db.execute(
                """INSERT INTO account_admin_audit(
                       audit_id, event_type, actor, target_account_id, target_wallet_address, reason, created_at
                   ) VALUES (?, 'admin_wallet_enrolled', ?, ?, ?, ?, ?)""",
                (
                    str(uuid.uuid4()), str(binding["actor_wallet_address"]),
                    account["account_id"], binding["address"],
                    "Additional wallet proved by a fresh SIWE signature in the local prototype.",
                    created_at,
                ),
            )
            # Adding an authenticator invalidates all administrator step-up
            # states. Ordinary account sessions stay active and can re-verify.
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
        result["message"] = "The additional wallet was enrolled. Re-verify a registered wallet before returning to the administrator console."
        result["walletEnrolledAddress"] = binding["address"]
        return 200, result, None

    def handle(self, path: str, payload: dict, handler: BaseHTTPRequestHandler) -> tuple[int, dict, str | None]:
        """Return (status, JSON, optional Set-Cookie header)."""
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
                    "passwordResetAvailable": False,
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
            account, expires = self.account_for_session(token)
            if account is None:
                raise ApiError(500, "The local account session could not be initialized.")
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
            account, expires = self.account_for_session(token)
            if account is None:
                raise ApiError(500, "The local account session could not be initialized.")
            return 200, self.account_summary(account, expires), self.cookie_header(token)


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
    application.configure_wallet_auth(server.server_port)
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
