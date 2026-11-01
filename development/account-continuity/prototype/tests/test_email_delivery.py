from __future__ import annotations

import os
import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

PROTOTYPE_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROTOTYPE_DIR))
from email_delivery import EmailDeliveryError, SMTPEmailSender  # noqa: E402


class SMTPEmailSenderTests(unittest.TestCase):
    def configured_environment(self, **overrides):
        values = {
            "ASTROCROWN_SMTP_HOST": "smtp.example.test",
            "ASTROCROWN_SMTP_PORT": "587",
            "ASTROCROWN_SMTP_USERNAME": "mailer",
            "ASTROCROWN_SMTP_PASSWORD": "  test-secret-with-spaces  ",
            "ASTROCROWN_SMTP_FROM": "AstroCrown Security <security@example.test>",
            "ASTROCROWN_SMTP_MODE": "starttls",
            "ASTROCROWN_PUBLIC_BASE_URL": "https://accounts.example.test",
        }
        values.update(overrides)
        return values

    def test_no_configuration_disables_delivery(self):
        with patch.dict(os.environ, {}, clear=True):
            sender, base_url = SMTPEmailSender.from_environment()
        self.assertIsNone(sender)
        self.assertIsNone(base_url)

    def test_partial_configuration_fails_closed(self):
        with patch.dict(os.environ, {"ASTROCROWN_SMTP_HOST": "smtp.example.test"}, clear=True):
            with self.assertRaisesRegex(ValueError, "partially configured"):
                SMTPEmailSender.from_environment()

    def test_configuration_defaults_to_starttls_and_preserves_password(self):
        values = self.configured_environment(ASTROCROWN_SMTP_MODE="", ASTROCROWN_SMTP_PORT="")
        with patch.dict(os.environ, values, clear=True):
            sender, base_url = SMTPEmailSender.from_environment()
        self.assertIsNotNone(sender)
        self.assertEqual(sender.mode, "starttls")
        self.assertEqual(sender.port, 587)
        self.assertEqual(sender.password, "  test-secret-with-spaces  ")
        self.assertEqual(base_url, "https://accounts.example.test")

    def test_username_and_password_must_be_configured_together(self):
        values = self.configured_environment(ASTROCROWN_SMTP_PASSWORD="")
        with patch.dict(os.environ, values, clear=True):
            with self.assertRaisesRegex(ValueError, "must either both be set"):
                SMTPEmailSender.from_environment()

    def test_sender_and_public_url_inputs_are_validated(self):
        with self.assertRaisesRegex(ValueError, "sender address"):
            SMTPEmailSender(
                host="smtp.example.test", port=587, username=None, password=None,
                sender="security@example.test" + chr(13) + chr(10) + "Bcc: victim@example.test",
                mode="starttls", public_base_url="https://accounts.example.test",
            )
        invalid_urls = (
            "http://accounts.example.test",
            "https://user:password@accounts.example.test",
            "https://accounts.example.test/?token=secret",
            "https://accounts.example.test:bad",
            "https://accounts.example.test" + chr(10) + ".evil.test",
        )
        for url in invalid_urls:
            with self.subTest(url=url):
                with self.assertRaises(ValueError):
                    SMTPEmailSender.validate_public_base_url(url)
        self.assertEqual(
            SMTPEmailSender.validate_public_base_url("http://localhost:8766/"),
            "http://localhost:8766",
        )

    def make_sender(self, mode="starttls"):
        return SMTPEmailSender(
            host="smtp.example.test",
            port=465 if mode == "ssl" else 587,
            username="mailer",
            password="test-secret",
            sender="AstroCrown <security@example.test>",
            mode=mode,
            public_base_url="https://accounts.example.test",
        )

    def test_starttls_is_negotiated_before_authentication_and_submission(self):
        client = MagicMock()
        client.__enter__.return_value = client
        with patch("email_delivery.smtplib.SMTP", return_value=client) as smtp:
            self.make_sender().send(
                "user@example.test", "Verify email", "Plain text link", "<p>HTML link</p>"
            )
        smtp.assert_called_once_with("smtp.example.test", 587, timeout=12.0)
        client.ehlo.assert_called()
        client.starttls.assert_called_once()
        client.login.assert_called_once_with("mailer", "test-secret")
        client.send_message.assert_called_once()
        sent = client.send_message.call_args.args[0]
        self.assertEqual(sent["To"], "user@example.test")
        self.assertEqual(sent["Subject"], "Verify email")
        self.assertTrue(sent.is_multipart())

    def test_implicit_tls_uses_ssl_without_starttls(self):
        client = MagicMock()
        client.__enter__.return_value = client
        with patch("email_delivery.smtplib.SMTP_SSL", return_value=client) as smtp:
            self.make_sender("ssl").send(
                "user@example.test", "Reset password", "Reset link", "<p>Reset link</p>"
            )
        smtp.assert_called_once()
        client.starttls.assert_not_called()
        client.login.assert_called_once_with("mailer", "test-secret")
        client.send_message.assert_called_once()

    def test_relay_failure_is_sanitized_and_no_plaintext_fallback_occurs(self):
        client = MagicMock()
        client.__enter__.return_value = client
        client.starttls.side_effect = RuntimeError("private relay host and password details")
        with patch("email_delivery.smtplib.SMTP", return_value=client) as smtp:
            with self.assertRaises(EmailDeliveryError) as raised:
                self.make_sender().send(
                    "user@example.test", "Verify email", "Link", "<p>Link</p>"
                )
        self.assertNotIn("private relay host", str(raised.exception))
        client.login.assert_not_called()
        client.send_message.assert_not_called()
        smtp.assert_called_once()

    def test_invalid_tls_mode_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "mode must be starttls or ssl"):
            SMTPEmailSender(
                host="smtp.example.test", port=25, username=None, password=None,
                sender="security@example.test", mode="plain",
                public_base_url="https://accounts.example.test",
            )


if __name__ == "__main__":
    unittest.main()
