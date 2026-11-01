"""Optional provider-independent SMTP delivery for account action emails.

No mail service is used unless every required setting is supplied. TLS is
mandatory, errors are deliberately sanitized, and callers must never log tokens.
"""
from __future__ import annotations

import os
import smtplib
import ssl
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
        names = (
            "ASTROCROWN_SMTP_HOST",
            "ASTROCROWN_SMTP_PORT",
            "ASTROCROWN_SMTP_USERNAME",
            "ASTROCROWN_SMTP_PASSWORD",
            "ASTROCROWN_SMTP_FROM",
            "ASTROCROWN_SMTP_MODE",
            "ASTROCROWN_PUBLIC_BASE_URL",
        )
        values = {name: os.environ.get(name, "").strip() for name in names}
        # SMTP passwords are opaque credentials; never strip meaningful spaces.
        values["ASTROCROWN_SMTP_PASSWORD"] = os.environ.get("ASTROCROWN_SMTP_PASSWORD", "")
        if not any(values.values()):
            return None, None
        if not values["ASTROCROWN_SMTP_HOST"] or not values["ASTROCROWN_SMTP_FROM"]:
            raise ValueError("SMTP is partially configured; host and sender address are required.")
        if bool(values["ASTROCROWN_SMTP_USERNAME"]) != bool(values["ASTROCROWN_SMTP_PASSWORD"]):
            raise ValueError("SMTP username and password must either both be set or both be empty.")
        if not values["ASTROCROWN_PUBLIC_BASE_URL"]:
            raise ValueError("ASTROCROWN_PUBLIC_BASE_URL is required when email delivery is configured.")
        host = values["ASTROCROWN_SMTP_HOST"]
        if len(host) > 253 or any(char.isspace() or ord(char) < 33 for char in host):
            raise ValueError("ASTROCROWN_SMTP_HOST must be a valid host name or address.")
        sender_name, sender_address = parseaddr(values["ASTROCROWN_SMTP_FROM"])
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
        base_url = cls.validate_public_base_url(values["ASTROCROWN_PUBLIC_BASE_URL"])
        sender = cls(
            host=values["ASTROCROWN_SMTP_HOST"],
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
