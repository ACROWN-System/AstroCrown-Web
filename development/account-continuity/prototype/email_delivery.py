"""Explicit provider-selected TLS SMTP delivery and a persistent quota guard.

No mail service is used unless a provider is selected and all required settings
are supplied. TLS is mandatory, errors are sanitized, and tokens must never be logged.
"""
from __future__ import annotations

import os
import smtplib
import sqlite3
import ssl
import time
import uuid
from pathlib import Path
from email.message import EmailMessage
from email.utils import parseaddr
from urllib.parse import urlsplit


class EmailDeliveryError(RuntimeError):
    """A sanitized account-email delivery failure."""


class SMTPEmailSender:
    def __init__(
        self,
        *,
        host: str,
        port: int,
        username: str | None,
        password: str | None,
        sender: str,
        mode: str,
        public_base_url: str,
        timeout: float = 12.0,
    ) -> None:
        if (
            not isinstance(host, str) or not host or len(host) > 253
            or any(char.isspace() or ord(char) < 33 for char in host)
        ):
            raise ValueError("SMTP host must be a valid host name or address.")
        _sender_name, sender_address = parseaddr(sender)
        if (
            not sender_address or sender_address.count("@") != 1
            or any(char in sender for char in "\r\n")
        ):
            raise ValueError("SMTP sender must be a valid email address.")
        if mode not in {"starttls", "ssl"}:
            raise ValueError("SMTP mode must be starttls or ssl.")
        if any(char in (username or "") for char in "\r\n\x00"):
            raise ValueError("SMTP username contains an invalid control character.")
        if any(char in (password or "") for char in "\r\n\x00"):
            raise ValueError("SMTP password contains an invalid control character.")
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.sender = sender
        self.mode = mode
        self.public_base_url = self.validate_public_base_url(public_base_url)
        self.timeout = timeout

    @staticmethod
    def validate_public_base_url(value: str) -> str:
        if (
            not isinstance(value, str) or not value
            or any(char.isspace() or ord(char) < 32 for char in value)
        ):
            raise ValueError("ASTROCROWN_PUBLIC_BASE_URL must be a valid absolute URL.")
        parsed = urlsplit(value)
        local_http = parsed.scheme == "http" and parsed.hostname in {"localhost", "127.0.0.1"}
        secure_https = parsed.scheme == "https" and bool(parsed.hostname)
        if not (local_http or secure_https) or parsed.username or parsed.password or parsed.query or parsed.fragment:
            raise ValueError("ASTROCROWN_PUBLIC_BASE_URL must use HTTPS, or localhost HTTP for local development.")
        try:
            _ = parsed.port
        except ValueError:
            raise ValueError("ASTROCROWN_PUBLIC_BASE_URL contains an invalid port.") from None
        return value.rstrip("/")

    @classmethod
    def from_environment(cls) -> tuple["SMTPEmailSender | None", str | None]:
        """Select an explicitly named mail provider; never infer a provider from host fields."""
        provider = os.environ.get("ASTROCROWN_EMAIL_PROVIDER", "").strip().lower()
        public_base_url = os.environ.get("ASTROCROWN_PUBLIC_BASE_URL", "").strip()
        smtp_names = (
            "ASTROCROWN_SMTP_HOST",
            "ASTROCROWN_SMTP_PORT",
            "ASTROCROWN_SMTP_USERNAME",
            "ASTROCROWN_SMTP_PASSWORD",
            "ASTROCROWN_SMTP_FROM",
            "ASTROCROWN_SMTP_MODE",
        )
        mailjet_names = (
            "ASTROCROWN_MAILJET_API_KEY",
            "ASTROCROWN_MAILJET_SECRET_KEY",
            "ASTROCROWN_MAILJET_FROM",
        )

        if not provider:
            if any(os.environ.get(name, "") for name in (*smtp_names, *mailjet_names, "ASTROCROWN_PUBLIC_BASE_URL")):
                raise ValueError("ASTROCROWN_EMAIL_PROVIDER must explicitly identify the configured email provider.")
            return None, None

        if provider == "mailjet":
            if any(os.environ.get(name, "") for name in smtp_names):
                raise ValueError("Do not mix Mailjet and generic SMTP environment settings.")
            api_key = os.environ.get("ASTROCROWN_MAILJET_API_KEY", "").strip()
            secret_key = os.environ.get("ASTROCROWN_MAILJET_SECRET_KEY", "")
            sender = os.environ.get("ASTROCROWN_MAILJET_FROM", "").strip()
            if not api_key or not secret_key or not sender or not public_base_url:
                raise ValueError(
                    "Mailjet is partially configured; API key, secret key, verified sender and public base URL are required."
                )
            base_url = cls.validate_public_base_url(public_base_url)
            mailjet_sender = cls(
                host="in-v3.mailjet.com",
                port=587,
                username=api_key,
                password=secret_key,
                sender=sender,
                mode="starttls",
                public_base_url=base_url,
            )
            return mailjet_sender, base_url

        if provider != "smtp":
            raise ValueError("ASTROCROWN_EMAIL_PROVIDER must be 'mailjet' or 'smtp'.")

        values = {name: os.environ.get(name, "").strip() for name in smtp_names}
        # SMTP passwords are opaque credentials; never strip meaningful spaces.
        values["ASTROCROWN_SMTP_PASSWORD"] = os.environ.get("ASTROCROWN_SMTP_PASSWORD", "")
        if any(os.environ.get(name, "") for name in mailjet_names):
            raise ValueError("Do not mix generic SMTP and Mailjet environment settings.")
        if not values["ASTROCROWN_SMTP_HOST"] or not values["ASTROCROWN_SMTP_FROM"] or not public_base_url:
            raise ValueError("SMTP is partially configured; host, sender address and public base URL are required.")
        if bool(values["ASTROCROWN_SMTP_USERNAME"]) != bool(values["ASTROCROWN_SMTP_PASSWORD"]):
            raise ValueError("SMTP username and password must either both be set or both be empty.")
        host = values["ASTROCROWN_SMTP_HOST"]
        if len(host) > 253 or any(char.isspace() or ord(char) < 33 for char in host):
            raise ValueError("ASTROCROWN_SMTP_HOST must be a valid host name or address.")
        _sender_name, sender_address = parseaddr(values["ASTROCROWN_SMTP_FROM"])
        if (
            not sender_address or sender_address.count("@") != 1
            or any(char in values["ASTROCROWN_SMTP_FROM"] for char in "\r\n")
        ):
            raise ValueError("ASTROCROWN_SMTP_FROM must be a valid email sender address.")
        if any(char in values["ASTROCROWN_SMTP_USERNAME"] for char in "\r\n\x00"):
            raise ValueError("ASTROCROWN_SMTP_USERNAME contains an invalid control character.")
        if any(char in values["ASTROCROWN_SMTP_PASSWORD"] for char in "\r\n\x00"):
            raise ValueError("ASTROCROWN_SMTP_PASSWORD contains an invalid control character.")
        try:
            port = int(values["ASTROCROWN_SMTP_PORT"] or "587")
        except ValueError:
            raise ValueError("ASTROCROWN_SMTP_PORT must be a valid TCP port.") from None
        if not 1 <= port <= 65535:
            raise ValueError("ASTROCROWN_SMTP_PORT must be between 1 and 65535.")
        mode = (values["ASTROCROWN_SMTP_MODE"] or "starttls").lower()
        if mode not in {"starttls", "ssl"}:
            raise ValueError("SMTP mode must be starttls or ssl.")
        base_url = cls.validate_public_base_url(public_base_url)
        sender = cls(
            host=host,
            port=port,
            username=values["ASTROCROWN_SMTP_USERNAME"] or None,
            password=values["ASTROCROWN_SMTP_PASSWORD"] or None,
            sender=values["ASTROCROWN_SMTP_FROM"],
            mode=mode,
            public_base_url=base_url,
        )
        return sender, base_url

    def send(self, recipient: str, subject: str, text_body: str, html_body: str) -> None:
        message = EmailMessage()
        message["From"] = self.sender
        message["To"] = recipient
        message["Subject"] = subject
        message.set_content(text_body)
        message.add_alternative(html_body, subtype="html")
        context = ssl.create_default_context()
        try:
            if self.mode == "ssl":
                with smtplib.SMTP_SSL(self.host, self.port, timeout=self.timeout, context=context) as client:
                    if self.username:
                        client.login(self.username, self.password or "")
                    client.send_message(message)
            else:
                with smtplib.SMTP(self.host, self.port, timeout=self.timeout) as client:
                    client.ehlo()
                    client.starttls(context=context)
                    client.ehlo()
                    if self.username:
                        client.login(self.username, self.password or "")
                    client.send_message(message)
        except Exception:
            # Do not surface SMTP exception text: it may include server details
            # or message metadata. Callers return a generic delivery state.
            raise EmailDeliveryError("The configured email transport did not accept the message.") from None



class EmailSendBudget:
    """Persistent, fail-closed quota guard for the Mailjet Free account-mail allocation.

    Account-triggered messages are capped at 100 in any rolling 24 hours and
    3,000 in any rolling 31 days. This deliberately keeps at least half of the
    published 200/day and 6,000/month free allowance outside this subsystem.
    Each attempted submission reserves one slot; failed/ambiguous attempts are
    not refunded because the relay may have accepted a message before a timeout.
    """

    DAILY_WINDOW_SECONDS = 24 * 60 * 60
    MONTH_WINDOW_SECONDS = 31 * 24 * 60 * 60

    def __init__(
        self,
        database_path: Path | str,
        *,
        daily_limit: int = 100,
        monthly_limit: int = 3000,
    ) -> None:
        if type(daily_limit) is not int or daily_limit < 1:
            raise ValueError("daily_limit must be a positive integer.")
        if type(monthly_limit) is not int or monthly_limit < 1:
            raise ValueError("monthly_limit must be a positive integer.")
        self.database_path = Path(database_path).expanduser().resolve()
        self.daily_limit = daily_limit
        self.monthly_limit = monthly_limit
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        with self._connect() as db:
            db.execute(
                """
                CREATE TABLE IF NOT EXISTS account_email_send_budget (
                    reservation_id TEXT PRIMARY KEY,
                    reserved_at INTEGER NOT NULL
                )
                """
            )
            db.execute(
                "CREATE INDEX IF NOT EXISTS account_email_send_budget_time_idx "
                "ON account_email_send_budget(reserved_at)"
            )

    def _connect(self) -> sqlite3.Connection:
        return sqlite3.connect(str(self.database_path), timeout=10)

    def reserve(self, now: int | None = None) -> bool:
        """Atomically reserve capacity before contacting the mail relay."""
        current = int(time.time()) if now is None else now
        if type(current) is not int or current < 0:
            raise ValueError("now must be a non-negative Unix timestamp.")
        daily_cutoff = current - self.DAILY_WINDOW_SECONDS
        monthly_cutoff = current - self.MONTH_WINDOW_SECONDS
        with self._connect() as db:
            db.execute("BEGIN IMMEDIATE")
            db.execute(
                "DELETE FROM account_email_send_budget WHERE reserved_at <= ?",
                (monthly_cutoff,),
            )
            daily_count = int(db.execute(
                "SELECT COUNT(*) FROM account_email_send_budget WHERE reserved_at > ?",
                (daily_cutoff,),
            ).fetchone()[0])
            monthly_count = int(db.execute(
                "SELECT COUNT(*) FROM account_email_send_budget WHERE reserved_at > ?",
                (monthly_cutoff,),
            ).fetchone()[0])
            if daily_count >= self.daily_limit or monthly_count >= self.monthly_limit:
                return False
            db.execute(
                "INSERT INTO account_email_send_budget(reservation_id, reserved_at) VALUES (?, ?)",
                (str(uuid.uuid4()), current),
            )
        return True

    def usage(self, now: int | None = None) -> dict[str, int]:
        current = int(time.time()) if now is None else now
        daily_cutoff = current - self.DAILY_WINDOW_SECONDS
        monthly_cutoff = current - self.MONTH_WINDOW_SECONDS
        with self._connect() as db:
            daily_count = int(db.execute(
                "SELECT COUNT(*) FROM account_email_send_budget WHERE reserved_at > ?",
                (daily_cutoff,),
            ).fetchone()[0])
            monthly_count = int(db.execute(
                "SELECT COUNT(*) FROM account_email_send_budget WHERE reserved_at > ?",
                (monthly_cutoff,),
            ).fetchone()[0])
        return {
            "daily_count": daily_count,
            "daily_limit": self.daily_limit,
            "monthly_count": monthly_count,
            "monthly_limit": self.monthly_limit,
        }
