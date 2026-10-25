"""Shared loopback SIWE/EIP-4361 proof-of-control core for development prototypes.

This module is not production authentication. It verifies short-lived message
challenges for Ethereum EOAs only, uses no RPC/contract-wallet fallback, and
never receives or stores private keys or seed phrases.
"""
from __future__ import annotations

import re
import secrets
import threading
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

from eth_keys.exceptions import BadSignature
from eth_utils import is_address, to_checksum_address
from siwe import SiweMessage, VerificationError, generate_nonce

CHALLENGE_TTL = timedelta(minutes=5)
SESSION_TTL = timedelta(minutes=30)
STATEMENT = (
    "Sign in to the local AstroCrown wallet test. "
    "This message does not authorize a transaction."
)
NONCE_RE = re.compile(r"^[A-Za-z0-9]{8,}$")
ADDRESS_RE = re.compile(r"^0x[0-9a-fA-F]{40}$")


class AuthenticationError(ValueError):
    """Expected authentication rejection that is safe to show to the client."""


@dataclass(frozen=True)
class Challenge:
    address: str
    chain_id: int
    message: str
    issued_at: datetime
    expires_at: datetime


@dataclass(frozen=True)
class LocalSession:
    address: str
    expires_at: datetime


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def siwe_timestamp(value: datetime) -> str:
    """Return a stable UTC timestamp in RFC 3339-compatible SIWE form."""
    return value.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace(
        "+00:00", "Z"
    )


def parse_address(value: Any) -> str:
    if not isinstance(value, str) or not ADDRESS_RE.fullmatch(value):
        raise AuthenticationError("A valid wallet address is required.")
    if not is_address(value):
        raise AuthenticationError("A valid wallet address is required.")
    return to_checksum_address(value)


def parse_chain_id(value: Any) -> int:
    # bool is a subclass of int in Python, so require the exact int type.
    if type(value) is not int or value <= 0 or value > (2**64 - 1):
        raise AuthenticationError("A valid positive wallet chain ID is required.")
    return value


class WalletAuthService:
    """Small in-memory EOA SIWE challenge/session coordinator."""

    def __init__(self, domain: str, uri: str, statement: str = STATEMENT) -> None:
        if not isinstance(statement, str) or not statement.strip() or len(statement) > 256:
            raise ValueError("SIWE statement must be a non-empty string of at most 256 characters.")
        self.domain = domain
        self.uri = uri
        self.statement = statement
        self.scheme = "http"  # HTTP is allowed only because this binds to loopback.
        self.challenges: dict[str, Challenge] = {}
        self.sessions: dict[str, LocalSession] = {}
        self.lock = threading.RLock()

    def _purge_expired(self, now: datetime) -> None:
        for nonce, challenge in list(self.challenges.items()):
            if now >= challenge.expires_at:
                self.challenges.pop(nonce, None)
        for token, session in list(self.sessions.items()):
            if now >= session.expires_at:
                self.sessions.pop(token, None)

    def issue_challenge(
        self, address_value: Any, chain_id_value: Any, now: datetime | None = None
    ) -> dict[str, str]:
        address = parse_address(address_value)
        chain_id = parse_chain_id(chain_id_value)
        issued_at = now or utc_now()
        issued_at = issued_at.astimezone(timezone.utc).replace(microsecond=0)
        expires_at = issued_at + CHALLENGE_TTL

        with self.lock:
            self._purge_expired(issued_at)
            nonce = generate_nonce()
            while nonce in self.challenges or not NONCE_RE.fullmatch(nonce):
                nonce = generate_nonce()

            message = SiweMessage(
                scheme=self.scheme,
                domain=self.domain,
                address=address,
                statement=self.statement,
                uri=self.uri,
                version="1",
                chain_id=chain_id,
                nonce=nonce,
                issued_at=siwe_timestamp(issued_at),
                expiration_time=siwe_timestamp(expires_at),
            ).prepare_message()

            self.challenges[nonce] = Challenge(
                address=address,
                chain_id=chain_id,
                message=message,
                issued_at=issued_at,
                expires_at=expires_at,
            )

        return {
            "message": message,
            "expiresAt": siwe_timestamp(expires_at),
            "nonceLength": str(len(nonce)),
        }

    def verify_signature(
        self, message_text: Any, signature: Any, now: datetime | None = None
    ) -> tuple[str, str]:
        if not isinstance(message_text, str) or not message_text or len(message_text) > 8192:
            raise AuthenticationError("The sign-in message is invalid.")
        if (
            not isinstance(signature, str)
            or not signature.startswith("0x")
            or len(signature) > 1024
        ):
            raise AuthenticationError("The wallet signature is invalid.")

        try:
            message = SiweMessage.from_message(message=message_text, abnf=True)
        except (ValueError, TypeError):
            raise AuthenticationError("The sign-in message is malformed.") from None

        nonce = str(message.nonce)
        current_time = (now or utc_now()).astimezone(timezone.utc)

        # The exact message, origin, account and chain must match the challenge.
        # Consume the nonce atomically before comparing fields or verifying the
        # signature; a failed attempt cannot retry the same issued challenge.
        with self.lock:
            challenge = self.challenges.get(nonce)
            if challenge is None:
                raise AuthenticationError(
                    "This sign-in challenge is missing, expired or already used."
                )
            if current_time >= challenge.expires_at:
                self.challenges.pop(nonce, None)
                raise AuthenticationError("This sign-in challenge has expired.")
            self.challenges.pop(nonce, None)
            if message_text != challenge.message:
                raise AuthenticationError(
                    "The signed message does not match the issued challenge."
                )
            if (
                message.domain != self.domain
                or message.uri != self.uri
                or message.scheme != self.scheme
                or str(message.version) != "1"
                or message.address != challenge.address
                or message.chain_id != challenge.chain_id
                or str(message.issued_at) != siwe_timestamp(challenge.issued_at)
                or str(message.expiration_time) != siwe_timestamp(challenge.expires_at)
                or not NONCE_RE.fullmatch(nonce)
            ):
                raise AuthenticationError(
                    "The signed message does not match the issued challenge."
                )

        try:
            # No provider is supplied: EOA/EIP-191 verification only. No
            # ERC-1271 RPC fallback or external call is permitted in this lab.
            message.verify(
                signature=signature,
                scheme=self.scheme,
                domain=self.domain,
                nonce=nonce,
                timestamp=current_time,
                provider=None,
            )
        except (VerificationError, ValueError, TypeError, BadSignature):
            raise AuthenticationError(
                "The wallet signature could not be verified."
            ) from None

        token = secrets.token_urlsafe(32)
        with self.lock:
            self._purge_expired(current_time)
            self.sessions[token] = LocalSession(
                address=challenge.address,
                expires_at=current_time + SESSION_TTL,
            )
        return token, challenge.address

    def read_session(
        self, token: str | None, now: datetime | None = None
    ) -> dict[str, Any]:
        current_time = (now or utc_now()).astimezone(timezone.utc)
        if not token:
            return {"authenticated": False}
        with self.lock:
            self._purge_expired(current_time)
            session = self.sessions.get(token)
            if session is None:
                return {"authenticated": False}
            return {
                "authenticated": True,
                "address": session.address,
                "expiresAt": siwe_timestamp(session.expires_at),
            }

    def revoke_session(self, token: str | None) -> None:
        if not token:
            return
        with self.lock:
            self.sessions.pop(token, None)
