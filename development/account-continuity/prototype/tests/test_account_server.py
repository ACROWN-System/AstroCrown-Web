from __future__ import annotations

import hashlib
import http.cookiejar
import json
import re
import sys
import subprocess
import tempfile
import threading
import time
import unittest
import urllib.error
import urllib.request
from pathlib import Path

from eth_account import Account
from eth_account.messages import encode_defunct

PROTOTYPE_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROTOTYPE_DIR))
from server import AccountApplication, TERMS_VERSION, create_server  # noqa: E402
from provision_admin import grant_admin, revoke_admin  # noqa: E402

# Public deterministic fixture keys for local tests only. Never use these for funds.
TEST_WALLET_KEY_A = "0x" + "11" * 32
TEST_WALLET_KEY_B = "0x" + "22" * 32
TEST_WALLET_KEY_C = "0x" + "33" * 32
TEST_WALLET_KEY_D = "0x" + "44" * 32
TEST_WALLET_A = Account.from_key(TEST_WALLET_KEY_A)
TEST_WALLET_B = Account.from_key(TEST_WALLET_KEY_B)
TEST_WALLET_C = Account.from_key(TEST_WALLET_KEY_C)
TEST_WALLET_D = Account.from_key(TEST_WALLET_KEY_D)

PASSWORD = "AstroCrown-Local-Test-2026!"
EMAIL = "test-user@example.test"


class FakeEmailSender:
    """Deterministic test transport. It never contacts an external mail service."""

    def __init__(self):
        self.messages = []
        self.fail_next = False

    def send(self, recipient, subject, text_body, html_body):
        if self.fail_next:
            self.fail_next = False
            raise RuntimeError("simulated transport failure")
        self.messages.append({
            "recipient": recipient,
            "subject": subject,
            "text": text_body,
            "html": html_body,
        })


class AccountServerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.app = AccountApplication(Path(self.temp.name) / "accounts.sqlite3", enable_legacy_email_auth=True)
        self.server = create_server(self.app, 0)
        self.port = self.server.server_port
        self.origin = "http://localhost:" + str(self.port)
        self.url = "http://127.0.0.1:" + str(self.port)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.cookies = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.cookies))

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)
        self.temp.cleanup()

    def request(self, path, payload=None, origin=True, host=True, opener=None):
        headers = {"Host": "localhost:" + str(self.port)}
        if not host:
            headers["Host"] = "127.0.0.1:" + str(self.port)
        method = "GET" if payload is None else "POST"
        data = None
        if payload is not None:
            data = json.dumps(payload).encode("utf-8")
            headers["Content-Type"] = "application/json"
            if origin:
                headers["Origin"] = self.origin
        request = urllib.request.Request(self.url + path, data=data, headers=headers, method=method)
        client = opener or self.opener
        try:
            response = client.open(request, timeout=5)
            body = response.read().decode("utf-8")
            try:
                payload = json.loads(body)
            except json.JSONDecodeError:
                payload = {"body": body}
            return response.status, payload, response.headers
        except urllib.error.HTTPError as error:
            body = error.read().decode("utf-8")
            try:
                payload = json.loads(body)
            except json.JSONDecodeError:
                payload = {"raw": body}
            return error.code, payload, error.headers

    def configure_fake_email(self):
        sender = FakeEmailSender()
        self.app.email_sender = sender
        self.app.email_public_base_url = self.origin
        return sender

    @staticmethod
    def extract_email_token(message):
        match = re.search(r"[?&]token=([A-Za-z0-9_-]{20,256})", message["text"])
        if match is None:
            raise AssertionError("The fake email did not contain a valid one-time action token.")
        return match.group(1)

    def create_account(self, email=EMAIL, password=PASSWORD, opener=None, **overrides):
        payload = {
            "email": email,
            "password": password,
            "referralId": "",
            "newsletterOptIn": False,
            "termsAccepted": True,
            "termsVersion": TERMS_VERSION,
        }
        payload.update(overrides)
        return self.request("/api/account/register", payload, opener=opener)

    def sign_admin_wallet(self, opener, address, private_key):
        status, challenge, _ = self.request(
            "/api/admin/wallet-challenge",
            {"address": address, "chainId": 1},
            opener=opener,
        )
        self.assertEqual(status, 200, challenge)
        message = challenge["message"]
        signature = Account.sign_message(
            encode_defunct(text=message), private_key=private_key
        ).signature.hex()
        if not signature.startswith("0x"):
            signature = "0x" + signature
        return self.request(
            "/api/admin/wallet-verify",
            {"message": message, "signature": signature},
            opener=opener,
        )

    def test_homepage_assets_and_policy_drafts_are_served_locally(self):
        status, _, headers = self.request("/")
        self.assertEqual(status, 200)
        self.assertIn("text/html", headers.get("Content-Type", ""))
        for path, expected_type in (
            ("/account-continuity/prototype/account-ui.js", "javascript"),
            ("/account-continuity/prototype/admin-wallet-ui.js", "javascript"),
            ("/account-continuity/prototype/account-prototype.css", "text/css"),
            ("/account-continuity/prototype/terms-of-use.html", "text/html"),
            ("/account-continuity/prototype/privacy-policy.html", "text/html"),
            ("/account-continuity/prototype/security-assurance.html", "text/html"),
        ):
            status, data, headers = self.request(path)
            self.assertEqual(status, 200, path)
            self.assertIn(expected_type, headers.get("Content-Type", ""))
            if path.endswith("security-assurance.html"):
                self.assertIn("Development prototype only", data.get("body", ""))
                self.assertIn("Not implemented", data.get("body", ""))
            if path.endswith("account-ui.js"):
                self.assertNotIn("window.ethereum", data.get("body", ""))
                self.assertNotIn("eth_requestAccounts", data.get("body", ""))
            if path.endswith("admin-wallet-ui.js"):
                self.assertIn("astrocrown:request-admin-wallet-access", data.get("body", ""))
                self.assertIn("personal_sign", data.get("body", ""))

    def test_sensitive_account_rate_limits_persist_without_storing_subject_identifiers(self):
        subject = "rate-limit-private@example.test"
        self.assertTrue(self.app.auth_rate_allowed("login", subject, limit=2, window=300))

        # A second application instance represents a server restart or a
        # replacement worker opening the same local account database.
        restarted_app = AccountApplication(self.app.database_path, enable_legacy_email_auth=True)
        self.assertTrue(restarted_app.auth_rate_allowed("login", subject, limit=2, window=300))
        self.assertFalse(
            self.app.auth_rate_allowed("login", subject, limit=2, window=300),
            "the limit must remain enforced across application instances",
        )

        with restarted_app.connect() as db:
            rows = db.execute(
                "SELECT action, subject_hash, attempted_at FROM account_auth_rate_events WHERE action = ?",
                ("login",),
            ).fetchall()
        self.assertEqual(len(rows), 2)
        self.assertEqual({row["action"] for row in rows}, {"login"})
        self.assertTrue(all(len(row["subject_hash"]) == 64 for row in rows))
        self.assertNotIn(subject, {row["subject_hash"] for row in rows})

        restarted_app.clear_auth_rate_limit("login", subject)
        self.assertTrue(
            self.app.auth_rate_allowed("login", subject, limit=2, window=300),
            "a successful authentication reset must clear the persistent login window",
        )

    def test_register_login_logout_and_password_not_exposed(self):

        status, data, headers = self.create_account(
            email=" Test-User@Example.Test ",
            referralId="ACROWN_42",
            newsletterOptIn=True,
        )
        self.assertEqual(status, 201, data)
        self.assertEqual(data["email"], "test-user@example.test")
        self.assertTrue(data["newsletterOptIn"])
        self.assertTrue(data["newsletterConsentAt"])
        self.assertEqual(data["referralId"], "ACROWN_42")
        self.assertTrue(data["termsAccepted"])
        self.assertEqual(data["termsVersion"], TERMS_VERSION)
        self.assertTrue(data["termsAcceptedAt"])
        self.assertFalse(data["emailVerified"])
        self.assertFalse(data["passwordResetAvailable"])
        self.assertFalse(data["admin"])
        self.assertNotIn("password", data)
        self.assertNotIn("recoveryCodes", data)
        self.assertIn("HttpOnly", headers.get("Set-Cookie", ""))
        self.assertIn("SameSite=Strict", headers.get("Set-Cookie", ""))
        self.assertNotIn("Domain=", headers.get("Set-Cookie", ""))

        status, session, _ = self.request("/api/account/status")
        self.assertEqual(status, 200)
        self.assertTrue(session["authenticated"])
        self.assertEqual(session["email"], "test-user@example.test")
        self.assertTrue(session["newsletterOptIn"])

        status, _, _ = self.request("/api/account/logout", {})
        self.assertEqual(status, 200)
        status, session, _ = self.request("/api/account/status")
        self.assertFalse(session["authenticated"])

        status, data, _ = self.request(
            "/api/account/login",
            {"email": "TEST-USER@example.test", "password": PASSWORD},
        )
        self.assertEqual(status, 200, data)
        self.assertTrue(data["authenticated"])
        self.assertEqual(data["email"], "test-user@example.test")
        self.assertFalse(data["admin"])

    def test_account_email_delivery_enforces_persistent_budget_before_submission(self):
        sender = self.configure_fake_email()
        self.app.email_send_budget.daily_limit = 1
        first = self.app.deliver_account_action_email(
            recipient="first-recipient@example.test", action="verify", raw_token="a" * 40
        )
        second = self.app.deliver_account_action_email(
            recipient="second-recipient@example.test", action="verify", raw_token="b" * 40
        )
        self.assertTrue(first)
        self.assertFalse(second, "the account email budget must block submission before contacting the sender")
        self.assertEqual(len(sender.messages), 1)
        usage = self.app.email_send_budget.usage()
        self.assertEqual(usage["daily_count"], 1)
        self.assertEqual(usage["daily_limit"], 1)
        self.assertEqual(usage["monthly_count"], 1)
        self.assertEqual(usage["monthly_limit"], 3000)

    def test_email_verification_uses_hashed_single_use_tokens_and_resend_invalidates_old_link(self):
        sender = self.configure_fake_email()
        email = "verify-email@example.test"
        status, created, _ = self.create_account(email=email)
        self.assertEqual(status, 201, created)
        self.assertTrue(created["emailVerificationDeliveryAvailable"])
        self.assertTrue(created["emailVerificationEmailSent"])
        self.assertFalse(created["emailVerified"])
        self.assertEqual(len(sender.messages), 1)
        self.assertEqual(sender.messages[0]["recipient"], email)
        self.assertIn("single-use", sender.messages[0]["text"].lower())

        first_token = self.extract_email_token(sender.messages[0])
        first_hash = hashlib.sha256(first_token.encode("utf-8")).hexdigest()
        status, email_action_page, _ = self.request(
            "/account-continuity/prototype/email-action.html?type=verify&token=" + first_token
        )
        self.assertEqual(status, 200)
        self.assertIn('id="email-action-verify-form"', email_action_page["body"])
        status, pre_verification_status, _ = self.request("/api/account/status")
        self.assertEqual(status, 200)
        self.assertFalse(pre_verification_status["emailVerified"],
                         "opening the email link must not verify the address automatically")
        with self.app.connect() as db:
            stored = db.execute(
                "SELECT token_hash, token_type, used_at FROM account_email_tokens"
            ).fetchall()
        self.assertEqual(len(stored), 1)
        self.assertEqual(stored[0]["token_hash"], first_hash)
        self.assertNotIn(first_token, stored[0]["token_hash"])
        self.assertEqual(stored[0]["token_type"], "verification")
        self.assertIsNone(stored[0]["used_at"])

        status, resent, _ = self.request("/api/account/verification/resend", {})
        self.assertEqual(status, 200, resent)
        self.assertTrue(resent["emailSent"])
        self.assertEqual(len(sender.messages), 2)
        second_token = self.extract_email_token(sender.messages[1])
        self.assertNotEqual(first_token, second_token)

        status, stale, _ = self.request("/api/account/email/verify", {"token": first_token})
        self.assertEqual(status, 400, stale)
        status, verified, _ = self.request("/api/account/email/verify", {"token": second_token})
        self.assertEqual(status, 200, verified)
        self.assertTrue(verified["verified"])

        status, account_status, _ = self.request("/api/account/status")
        self.assertEqual(status, 200, account_status)
        self.assertTrue(account_status["emailVerified"])

        status, replay, _ = self.request("/api/account/email/verify", {"token": second_token})
        self.assertEqual(status, 400, replay)
        self.assertIn("already used", replay["error"].lower())

        with self.app.connect() as db:
            audit = db.execute(
                "SELECT event_type FROM account_security_audit WHERE event_type = 'email_verified'"
            ).fetchall()
        self.assertEqual(len(audit), 1)

    def test_password_reset_is_generic_single_use_and_revokes_every_session(self):
        sender = self.configure_fake_email()
        email = "password-reset@example.test"
        status, created, _ = self.create_account(email=email)
        self.assertEqual(status, 201, created)
        self.assertEqual(len(sender.messages), 1)  # signup verification message
        outstanding_verification_token = self.extract_email_token(sender.messages[0])
        sender.messages.clear()

        other_opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar())
        )
        status, second_login, _ = self.request(
            "/api/account/login",
            {"email": email, "password": PASSWORD},
            opener=other_opener,
        )
        self.assertEqual(status, 200, second_login)
        self.assertEqual(second_login["activeSessionCount"], 2)

        status, known_response, _ = self.request(
            "/api/account/password-reset/request", {"email": email}
        )
        self.assertEqual(status, 200, known_response)
        self.assertTrue(known_response["requestAccepted"])
        self.assertEqual(len(sender.messages), 1)
        raw_token = self.extract_email_token(sender.messages[0])

        status, unknown_response, _ = self.request(
            "/api/account/password-reset/request", {"email": "not-present@example.test"}
        )
        self.assertEqual(status, 200, unknown_response)
        self.assertEqual(known_response, unknown_response,
                         "known and unknown addresses must receive identical reset-request responses")
        self.assertEqual(len(sender.messages), 1,
                         "no email should be sent for an unknown address")

        with self.app.connect() as db:
            saved = db.execute(
                "SELECT token_hash, token_type FROM account_email_tokens WHERE token_type = 'password_reset'"
            ).fetchone()
        self.assertIsNotNone(saved)
        self.assertEqual(saved["token_hash"], hashlib.sha256(raw_token.encode("utf-8")).hexdigest())
        self.assertEqual(saved["token_type"], "password_reset")

        new_password = "AstroCrown-Reset-Password-2026!"
        status, reset, _ = self.request(
            "/api/account/password/reset/complete",
            {
                "token": raw_token,
                "newPassword": new_password,
                "newPasswordConfirmation": new_password,
            },
        )
        self.assertEqual(status, 200, reset)
        self.assertTrue(reset["passwordReset"])
        self.assertEqual(reset["revokedSessions"], 2)
        status, invalidated_verification, _ = self.request(
            "/api/account/email/verify", {"token": outstanding_verification_token}
        )
        self.assertEqual(status, 400, invalidated_verification)

        status, old_current_session, _ = self.request("/api/account/status")
        self.assertEqual(status, 200)
        self.assertFalse(old_current_session["authenticated"])
        status, old_second_session, _ = self.request("/api/account/status", opener=other_opener)
        self.assertEqual(status, 200)
        self.assertFalse(old_second_session["authenticated"])

        status, old_password_login, _ = self.request(
            "/api/account/login", {"email": email, "password": PASSWORD}
        )
        self.assertEqual(status, 401, old_password_login)
        status, new_password_login, _ = self.request(
            "/api/account/login", {"email": email, "password": new_password}
        )
        self.assertEqual(status, 200, new_password_login)
        self.assertTrue(new_password_login["emailVerified"])
        self.assertEqual(new_password_login["activeSessionCount"], 1)

        status, replay, _ = self.request(
            "/api/account/password/reset/complete",
            {
                "token": raw_token,
                "newPassword": new_password,
                "newPasswordConfirmation": new_password,
            },
        )
        self.assertEqual(status, 400, replay)
        self.assertIn("already used", replay["error"].lower())

        with self.app.connect() as db:
            events = db.execute(
                "SELECT event_type, detail FROM account_security_audit WHERE event_type = 'password_reset_completed'"
            ).fetchall()
        self.assertEqual(len(events), 1)
        self.assertEqual(events[0]["detail"], "revoked_sessions=2")

    def test_failed_verification_resend_preserves_previously_delivered_link(self):
        sender = self.configure_fake_email()
        email = "verification-resend-failure@example.test"
        status, created, _ = self.create_account(email=email)
        self.assertEqual(status, 201, created)
        self.assertTrue(created["emailVerificationEmailSent"])
        original_token = self.extract_email_token(sender.messages[0])

        sender.fail_next = True
        status, resend, _ = self.request("/api/account/verification/resend", {})
        self.assertEqual(status, 200, resend)
        self.assertFalse(resend["emailSent"])
        self.assertIn("No email was sent", resend["message"])
        self.assertEqual(len(sender.messages), 1)

        with self.app.connect() as db:
            active = db.execute(
                """SELECT token_hash FROM account_email_tokens
                   WHERE account_id = (SELECT account_id FROM accounts WHERE email = ?)
                     AND token_type = 'verification' AND used_at IS NULL""",
                (email,),
            ).fetchall()
        self.assertEqual(len(active), 1)
        self.assertEqual(
            active[0]["token_hash"],
            hashlib.sha256(original_token.encode("utf-8")).hexdigest(),
        )

        status, verified, _ = self.request(
            "/api/account/email/verify", {"token": original_token}
        )
        self.assertEqual(status, 200, verified)
        self.assertTrue(verified["verified"])

    def test_failed_password_reset_resend_preserves_previously_delivered_link(self):
        sender = self.configure_fake_email()
        email = "password-reset-resend-failure@example.test"
        status, created, _ = self.create_account(email=email)
        self.assertEqual(status, 201, created)
        first_request_status, first_request, _ = self.request(
            "/api/account/password-reset/request", {"email": email}
        )
        self.assertEqual(first_request_status, 200, first_request)
        first_reset_token = self.extract_email_token(sender.messages[-1])

        sender.fail_next = True
        second_status, second_request, _ = self.request(
            "/api/account/password-reset/request", {"email": email}
        )
        self.assertEqual(second_status, 200, second_request)
        self.assertEqual(first_request, second_request)
        self.assertEqual(len(sender.messages), 2)

        with self.app.connect() as db:
            active = db.execute(
                """SELECT token_hash FROM account_email_tokens
                   WHERE account_id = (SELECT account_id FROM accounts WHERE email = ?)
                     AND token_type = 'password_reset' AND used_at IS NULL""",
                (email,),
            ).fetchall()
        self.assertEqual(len(active), 1)
        self.assertEqual(
            active[0]["token_hash"],
            hashlib.sha256(first_reset_token.encode("utf-8")).hexdigest(),
        )

        new_password = "AstroCrown-Preserved-Reset-2026!"
        status, reset, _ = self.request(
            "/api/account/password/reset/complete",
            {
                "token": first_reset_token,
                "newPassword": new_password,
                "newPasswordConfirmation": new_password,
            },
        )
        self.assertEqual(status, 200, reset)
        self.assertTrue(reset["passwordReset"])

    def test_email_delivery_failure_invalidates_new_token_and_no_mailer_sends_nothing(self):

        email = "no-email-transport@example.test"
        status, created, _ = self.create_account(email=email)
        self.assertEqual(status, 201, created)
        self.assertFalse(created["emailVerificationDeliveryAvailable"])
        self.assertFalse(created["emailVerificationEmailSent"])
        self.assertFalse(created["passwordResetAvailable"])

        status, reset_request, _ = self.request(
            "/api/account/password-reset/request", {"email": email}
        )
        self.assertEqual(status, 200, reset_request)
        self.assertFalse(reset_request["emailSent"])
        self.assertIn("No password-reset email was sent", reset_request["message"])

        sender = self.configure_fake_email()
        sender.fail_next = True
        status, resend_result, _ = self.request("/api/account/verification/resend", {})
        self.assertEqual(status, 200, resend_result)
        self.assertFalse(resend_result["emailSent"])
        self.assertIn("No email was sent", resend_result["message"])
        with self.app.connect() as db:
            remaining = db.execute(
                "SELECT COUNT(*) FROM account_email_tokens WHERE account_id = "
                "(SELECT account_id FROM accounts WHERE email = ?) AND used_at IS NULL",
                (email,),
            ).fetchone()[0]
        self.assertEqual(remaining, 0, "failed transport must not leave an actionable token")

    def test_invalid_password_reset_tokens_are_rejected_before_password_kdf_and_ip_throttled(self):
        original_hash_password = self.app.hash_password
        kdf_calls = []

        def tracked_hash_password(password, salt):
            kdf_calls.append(True)
            return original_hash_password(password, salt)

        self.app.hash_password = tracked_hash_password
        password = "AstroCrown-Invalid-Reset-Password-2026!"
        try:
            for attempt in range(10):
                token = ("invalid-reset-token-" + str(attempt)).ljust(40, "x")
                status, rejected, _ = self.request(
                    "/api/account/password/reset/complete",
                    {
                        "token": token,
                        "newPassword": password,
                        "newPasswordConfirmation": password,
                    },
                )
                self.assertEqual(status, 400, rejected)
                self.assertIn("invalid", rejected["error"].lower())
            self.assertEqual(
                kdf_calls, [],
                "unknown reset tokens must be rejected before the expensive password KDF",
            )
            status, throttled, _ = self.request(
                "/api/account/password/reset/complete",
                {
                    "token": "another-invalid-reset-token-123456789",
                    "newPassword": password,
                    "newPasswordConfirmation": password,
                },
            )
            self.assertEqual(status, 429, throttled)
            self.assertIn("too many password-reset attempts", throttled["error"].lower())
            self.assertEqual(kdf_calls, [])
        finally:
            self.app.hash_password = original_hash_password

    def test_verification_and_password_reset_tokens_expire(self):
        sender = self.configure_fake_email()
        email = "expired-email-link@example.test"
        status, created, _ = self.create_account(email=email)
        self.assertEqual(status, 201, created)
        verification_token = self.extract_email_token(sender.messages[0])
        with self.app.connect() as db:
            db.execute(
                "UPDATE account_email_tokens SET expires_at = ? WHERE token_hash = ?",
                (int(time.time()) - 1, hashlib.sha256(verification_token.encode("utf-8")).hexdigest()),
            )
        status, expired_verification, _ = self.request(
            "/api/account/email/verify", {"token": verification_token}
        )
        self.assertEqual(status, 400, expired_verification)
        status, account_status, _ = self.request("/api/account/status")
        self.assertFalse(account_status["emailVerified"])

        status, reset_response, _ = self.request(
            "/api/account/password-reset/request", {"email": email}
        )
        self.assertEqual(status, 200, reset_response)
        reset_token = self.extract_email_token(sender.messages[-1])
        with self.app.connect() as db:
            db.execute(
                "UPDATE account_email_tokens SET expires_at = ? WHERE token_hash = ?",
                (int(time.time()) - 1, hashlib.sha256(reset_token.encode("utf-8")).hexdigest()),
            )
        new_password = "AstroCrown-Expired-Reset-2026!"
        status, expired_reset, _ = self.request(
            "/api/account/password/reset/complete",
            {
                "token": reset_token,
                "newPassword": new_password,
                "newPasswordConfirmation": new_password,
            },
        )
        self.assertEqual(status, 400, expired_reset)
        status, old_password_login, _ = self.request(
            "/api/account/login", {"email": email, "password": PASSWORD}
        )
        self.assertEqual(status, 200, old_password_login)

    def test_reset_request_rejects_extra_fields_without_processing(self):
        self.configure_fake_email()
        status, rejected, _ = self.request(
            "/api/account/password-reset/request",
            {"email": EMAIL, "password": "should-not-be-accepted"},
        )
        self.assertEqual(status, 400, rejected)

    def test_login_does_not_issue_session_when_password_changes_after_verification(self):
        email = "stale-login-race@example.test"
        status, created, _ = self.create_account(email=email)
        self.assertEqual(status, 201, created)
        status, _, _ = self.request("/api/account/logout", {})
        self.assertEqual(status, 200)

        original_verify = self.app.verify_password
        changed_password = "AstroCrown-Concurrent-Password-2026!"

        def verify_then_simulate_concurrent_password_change(account, password):
            verified = original_verify(account, password)
            if verified and account is not None:
                new_salt = self.app.dummy_salt + b"-race"
                new_hash = self.app.hash_password(changed_password, new_salt)
                with self.app.connect() as db:
                    db.execute(
                        "UPDATE accounts SET password_salt = ?, password_hash = ? WHERE account_id = ?",
                        (new_salt, new_hash, account["account_id"]),
                    )
            return verified

        self.app.verify_password = verify_then_simulate_concurrent_password_change
        try:
            status, rejected, _ = self.request(
                "/api/account/login",
                {"email": email, "password": PASSWORD},
            )
        finally:
            self.app.verify_password = original_verify

        self.assertEqual(status, 401, rejected)
        self.assertIn("did not match", rejected["error"].lower())
        status, anonymous, _ = self.request("/api/account/status")
        self.assertEqual(status, 200)
        self.assertFalse(anonymous["authenticated"])
        with self.app.connect() as db:
            count = db.execute(
                "SELECT COUNT(*) FROM sessions WHERE account_id = "
                "(SELECT account_id FROM accounts WHERE email = ?)",
                (email,),
            ).fetchone()[0]
        self.assertEqual(count, 0, "stale password verification must not create a live session")

    def test_other_sessions_require_current_password_and_revoke_only_other_sessions(self):

        status, created, _ = self.create_account(email="session-controls@example.test")
        self.assertEqual(status, 201, created)
        self.assertEqual(created["activeSessionCount"], 1)

        other_cookies = http.cookiejar.CookieJar()
        other_opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(other_cookies)
        )
        status, second_login, _ = self.request(
            "/api/account/login",
            {"email": "session-controls@example.test", "password": PASSWORD},
            opener=other_opener,
        )
        self.assertEqual(status, 200, second_login)
        self.assertEqual(second_login["activeSessionCount"], 2)

        status, current_status, _ = self.request("/api/account/status")
        self.assertEqual(status, 200, current_status)
        self.assertEqual(current_status["activeSessionCount"], 2)

        status, rejected, _ = self.request(
            "/api/account/sessions/revoke-others",
            {"password": "incorrect-password"},
        )
        self.assertEqual(status, 401, rejected)
        self.assertIn("no sessions were changed", rejected["error"].lower())
        status, second_still_active, _ = self.request(
            "/api/account/status", opener=other_opener
        )
        self.assertEqual(status, 200)
        self.assertTrue(second_still_active["authenticated"])

        status, revoked, _ = self.request(
            "/api/account/sessions/revoke-others",
            {"password": PASSWORD},
        )
        self.assertEqual(status, 200, revoked)
        self.assertEqual(revoked["revokedSessions"], 1)
        self.assertEqual(revoked["activeSessionCount"], 1)
        self.assertIn("this session remains active", revoked["message"].lower())

        status, current_still_active, _ = self.request("/api/account/status")
        self.assertEqual(status, 200)
        self.assertTrue(current_still_active["authenticated"])
        self.assertEqual(current_still_active["activeSessionCount"], 1)

        status, second_signed_out, _ = self.request(
            "/api/account/status", opener=other_opener
        )
        self.assertEqual(status, 200)
        self.assertFalse(second_signed_out["authenticated"])

    def test_password_change_requires_reauthentication_rotates_sessions_and_records_audit(self):
        email = "password-change@example.test"
        new_password = "AstroCrown-New-Password-2026!"
        status, created, _ = self.create_account(email=email)
        self.assertEqual(status, 201, created)

        other_opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar())
        )
        status, second_login, _ = self.request(
            "/api/account/login",
            {"email": email, "password": PASSWORD},
            opener=other_opener,
        )
        self.assertEqual(status, 200, second_login)
        self.assertEqual(second_login["activeSessionCount"], 2)

        status, rejected, _ = self.request(
            "/api/account/password/change",
            {
                "currentPassword": "incorrect-password",
                "newPassword": new_password,
                "newPasswordConfirmation": new_password,
            },
        )
        self.assertEqual(status, 401, rejected)
        status, current_status, _ = self.request("/api/account/status")
        self.assertEqual(current_status["activeSessionCount"], 2)

        status, mismatch, _ = self.request(
            "/api/account/password/change",
            {
                "currentPassword": PASSWORD,
                "newPassword": new_password,
                "newPasswordConfirmation": "different-confirmation",
            },
        )
        self.assertEqual(status, 400, mismatch)
        self.assertIn("confirmation does not match", mismatch["error"].lower())

        status, unchanged, _ = self.request(
            "/api/account/password/change",
            {
                "currentPassword": PASSWORD,
                "newPassword": PASSWORD,
                "newPasswordConfirmation": PASSWORD,
            },
        )
        self.assertEqual(status, 400, unchanged)

        status, changed, headers = self.request(
            "/api/account/password/change",
            {
                "currentPassword": PASSWORD,
                "newPassword": new_password,
                "newPasswordConfirmation": new_password,
            },
        )
        self.assertEqual(status, 200, changed)
        self.assertEqual(changed["activeSessionCount"], 1)
        self.assertEqual(changed["revokedSessions"], 1)
        self.assertIn("renewed", changed["message"].lower())
        self.assertIn("HttpOnly", headers.get("Set-Cookie", ""))

        status, current_session, _ = self.request("/api/account/status")
        self.assertEqual(status, 200)
        self.assertTrue(current_session["authenticated"])
        self.assertEqual(current_session["activeSessionCount"], 1)

        status, revoked_session, _ = self.request("/api/account/status", opener=other_opener)
        self.assertEqual(status, 200)
        self.assertFalse(revoked_session["authenticated"])

        fresh_opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar())
        )
        status, old_password_login, _ = self.request(
            "/api/account/login",
            {"email": email, "password": PASSWORD},
            opener=fresh_opener,
        )
        self.assertEqual(status, 401, old_password_login)

        status, new_password_login, _ = self.request(
            "/api/account/login",
            {"email": email, "password": new_password},
            opener=fresh_opener,
        )
        self.assertEqual(status, 200, new_password_login)
        self.assertTrue(new_password_login["authenticated"])
        self.assertFalse(new_password_login["admin"])

        with self.app.connect() as db:
            audit = db.execute(
                "SELECT event_type, detail FROM account_security_audit WHERE account_id = "
                "(SELECT account_id FROM accounts WHERE email = ?)",
                (email,),
            ).fetchall()
        self.assertEqual(len(audit), 1)
        self.assertEqual(audit[0]["event_type"], "password_changed")
        self.assertIn("previous_active_sessions=1", audit[0]["detail"])

    def test_password_change_clears_administrator_step_up_and_revokes_old_sessions(self):
        email = "admin-password-change@example.test"
        new_password = "AstroCrown-Admin-Password-Updated-2026!"
        status, created, _ = self.create_account(email=email)
        self.assertEqual(status, 201, created)
        grant_admin(
            self.app,
            account_identifier=email,
            wallet_address=TEST_WALLET_A.address,
            chain_id=1,
            reason="Owner-approved local admin password-change regression setup",
        )

        status, challenge, _ = self.request(
            "/api/admin/wallet-challenge",
            {"address": TEST_WALLET_A.address, "chainId": 1},
        )
        self.assertEqual(status, 200, challenge)
        message = challenge["message"]
        signature = Account.sign_message(
            encode_defunct(text=message), private_key=TEST_WALLET_KEY_A
        ).signature.hex()
        if not signature.startswith("0x"):
            signature = "0x" + signature
        status, elevated, _ = self.request(
            "/api/admin/wallet-verify",
            {"message": message, "signature": signature},
        )
        self.assertEqual(status, 200, elevated)
        self.assertTrue(elevated["adminSessionAuthorized"])
        self.assertTrue(elevated["admin"])

        other_opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar())
        )
        status, second_login, _ = self.request(
            "/api/account/login",
            {"email": email, "password": PASSWORD},
            opener=other_opener,
        )
        self.assertEqual(status, 200, second_login)
        self.assertEqual(second_login["activeSessionCount"], 2)

        status, changed, _ = self.request(
            "/api/account/password/change",
            {
                "currentPassword": PASSWORD,
                "newPassword": new_password,
                "newPasswordConfirmation": new_password,
            },
        )
        self.assertEqual(status, 200, changed)
        self.assertEqual(changed["role"], "admin")
        self.assertTrue(changed["adminRoleAssigned"])
        self.assertFalse(changed["adminWalletAuthenticated"])
        self.assertFalse(changed["adminSessionAuthorized"])
        self.assertFalse(changed["admin"])
        self.assertEqual(changed["activeSessionCount"], 1)
        self.assertEqual(changed["revokedSessions"], 1)

        status, current_status, _ = self.request("/api/account/status")
        self.assertEqual(status, 200, current_status)
        self.assertTrue(current_status["authenticated"])
        self.assertTrue(current_status["adminRoleAssigned"])
        self.assertFalse(current_status["admin"])
        status, admin_status, _ = self.request("/api/admin/status")
        self.assertEqual(status, 403, admin_status)
        self.assertIn("fresh signature", admin_status["error"].lower())

        status, old_session, _ = self.request("/api/account/status", opener=other_opener)
        self.assertEqual(status, 200)
        self.assertFalse(old_session["authenticated"])

        fresh_opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar())
        )
        status, new_login, _ = self.request(
            "/api/account/login",
            {"email": email, "password": new_password},
            opener=fresh_opener,
        )
        self.assertEqual(status, 200, new_login)
        self.assertTrue(new_login["adminRoleAssigned"])
        self.assertFalse(new_login["adminSessionAuthorized"])
        self.assertFalse(new_login["admin"])

    def test_owner_cli_provisions_existing_regular_account_for_admin_visibility(self):



        email = "cli-provision-admin@example.test"
        status, created, _ = self.create_account(email=email)
        self.assertEqual(status, 201, created)
        self.assertEqual(created["role"], "user")
        self.assertFalse(created["adminRoleAssigned"])
        account_identifier = "AC-ABCDEF1234"
        with self.app.connect() as db:
            account_row = db.execute(
                "SELECT account_id FROM accounts WHERE email = ? COLLATE NOCASE",
                (email,),
            ).fetchone()
            self.assertIsNotNone(account_row)
            db.execute(
                """UPDATE accounts
                   SET username = ?, email = NULL, auth_method = 'webauthn'
                   WHERE account_id = ?""",
                (account_identifier, account_row["account_id"]),
            )

        # Run the actual script from outside the repository root. This checks
        # that the shipped CLI resolves its verifier module and targets the same
        # database as the running account server.
        command = [
            sys.executable,
            str(PROTOTYPE_DIR / "provision_admin.py"),
            "--db", str(self.app.database_path),
            "--actor", "local-test-owner",
            "grant",
            "--account-identifier", account_identifier,
            "--wallet", TEST_WALLET_A.address,
            "--chain-id", "1",
            "--reason", "Owner-approved local CLI provisioning test",
            "--confirm", "GRANT LOCAL ADMIN",
        ]
        result = subprocess.run(
            command,
            cwd=self.temp.name,
            capture_output=True,
            text=True,
            timeout=15,
            check=False,
        )
        self.assertEqual(
            result.returncode, 0,
            "The local provisioning CLI failed. stdout=" + result.stdout + " stderr=" + result.stderr,
        )
        self.assertIn("Development-only administrator provisioning completed.", result.stdout)
        self.assertIn("A fresh signature from this registered wallet is still required", result.stdout)

        status, account_status, _ = self.request("/api/account/status")
        self.assertEqual(status, 200, account_status)
        self.assertTrue(account_status["authenticated"])
        self.assertEqual(account_status["role"], "admin")
        self.assertTrue(account_status["adminRoleAssigned"])
        self.assertEqual(account_status["adminWalletCount"], 1)
        self.assertFalse(account_status["adminWalletAuthenticated"])
        self.assertFalse(account_status["adminSessionAuthorized"])
        self.assertFalse(account_status["admin"],
                         "the registered role must not bypass the fresh wallet step-up")

        with self.app.connect() as db:
            account_row = db.execute(
                "SELECT account_id FROM accounts WHERE username = ? COLLATE NOCASE",
                (account_identifier,),
            ).fetchone()
            self.assertIsNotNone(account_row)
            wallet = db.execute(
                "SELECT address, chain_id, active FROM admin_wallets WHERE account_id = ?",
                (account_row["account_id"],),
            ).fetchone()
            audit = db.execute(
                "SELECT actor, event_type, reason FROM account_admin_audit WHERE target_account_id = ?",
                (account_row["account_id"],),
            ).fetchone()
        self.assertIsNotNone(wallet)
        self.assertEqual(wallet["address"], TEST_WALLET_A.address)
        self.assertEqual(wallet["chain_id"], 1)
        self.assertEqual(wallet["active"], 1)
        self.assertIsNotNone(audit)
        self.assertEqual(audit["actor"], "local-test-owner")
        self.assertEqual(audit["event_type"], "admin_wallet_provisioned")
        self.assertEqual(audit["reason"], "Owner-approved local CLI provisioning test")

    def test_registration_cannot_grant_admin_role_and_role_alone_never_authorizes_admin(self):
        status, data, _ = self.create_account(
            email="role-escalation@example.test",
            role="admin",
            admin=True,
            adminRoleAssigned=True,
            adminWalletAuthenticated=True,
            adminSessionAuthorized=True,
            permissions=["admin", "owner"],
        )
        self.assertEqual(status, 201, data)
        self.assertEqual(data["role"], "user")
        self.assertFalse(data["adminRoleAssigned"])
        self.assertFalse(data["adminWalletAuthenticated"])
        self.assertFalse(data["adminSessionAuthorized"])
        self.assertFalse(data["admin"])
        status, wallet_options, _ = self.request("/api/admin/wallet-options", {})
        self.assertEqual(status, 403, wallet_options)

        # Simulate a separately authorized, out-of-band role assignment in the
        # test database. Role assignment alone must still not authenticate a
        # wallet or create an admin-authorized session.
        with self.app.connect() as db:
            db.execute(
                "UPDATE accounts SET role = 'admin' WHERE email = ?",
                ("role-escalation@example.test",),
            )
        status, assigned, _ = self.request("/api/account/status")
        self.assertEqual(status, 200)
        self.assertTrue(assigned["authenticated"])
        self.assertEqual(assigned["role"], "admin")
        self.assertTrue(assigned["adminRoleAssigned"])
        self.assertFalse(assigned["adminWalletAuthenticated"])
        self.assertFalse(assigned["adminSessionAuthorized"])
        self.assertFalse(assigned["admin"])

        status, response, _ = self.request(
            "/api/admin/provision",
            {"email": "role-escalation@example.test", "role": "admin"},
        )
        self.assertEqual(status, 404)
        self.assertIn("not available", response["error"].lower())

    def test_builtin_avatar_changes_require_a_session_and_are_server_validated(self):
        status, data, _ = self.request("/api/account/avatar", {"avatarId": "star"})
        self.assertEqual(status, 401)
        self.assertIn("sign in", data["error"].lower())

        status, data, _ = self.create_account(
            email="avatar-test@example.test",
            avatarId="https://invalid.example/avatar.svg",
        )
        self.assertEqual(status, 201, data)
        self.assertEqual(data["avatarId"], "person", "registration must not accept an arbitrary avatar value")

        status, data, _ = self.request("/api/account/avatar", {"avatarId": "star"})
        self.assertEqual(status, 200, data)
        self.assertEqual(data["avatarId"], "star")
        self.assertFalse(data["admin"])

        status, data, _ = self.request("/api/account/avatar", {"avatarId": '<svg onload="alert(1)">'})
        self.assertEqual(status, 400)
        self.assertIn("provided account avatars", data["error"].lower())

        status, current, _ = self.request("/api/account/status")
        self.assertEqual(status, 200)
        self.assertEqual(current["avatarId"], "star")

        status, _, _ = self.request("/api/account/logout", {})
        self.assertEqual(status, 200)
        status, _, _ = self.request("/api/account/avatar", {"avatarId": "moon"})
        self.assertEqual(status, 401, "a signed-out session must not change account preferences")

    def test_permissioned_admin_appointment_initial_wallet_enrollment_and_revocation(self):
        root_email = "permission-root@example.test"
        target_email = "permission-target@example.test"
        successor_email = "permission-successor@example.test"
        target_opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar())
        )
        successor_opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar())
        )

        status, created, _ = self.create_account(email=root_email)
        self.assertEqual(status, 201, created)
        grant_admin(
            self.app,
            account_identifier=root_email,
            wallet_address=TEST_WALLET_A.address,
            chain_id=1,
            reason="Bootstrap role manager for the local permission test",
            permissions=["admin.roles.grant", "admin.roles.revoke"],
            delegable_permissions=["admin.roles.grant"],
        )
        status, created, _ = self.create_account(email=target_email, opener=target_opener)
        self.assertEqual(status, 201, created)
        target_account_identifier = "AC-1234567890"
        with self.app.connect() as db:
            target_row = db.execute(
                "SELECT account_id FROM accounts WHERE email = ? COLLATE NOCASE",
                (target_email,),
            ).fetchone()
            self.assertIsNotNone(target_row)
            db.execute(
                """UPDATE accounts
                   SET username = ?, email = NULL, auth_method = 'webauthn'
                   WHERE account_id = ?""",
                (target_account_identifier, target_row["account_id"]),
            )
        status, created, _ = self.create_account(email=successor_email, opener=successor_opener)
        self.assertEqual(status, 201, created)

        status, root_status, _ = self.sign_admin_wallet(self.opener, TEST_WALLET_A.address, TEST_WALLET_KEY_A)
        self.assertEqual(status, 200, root_status)
        self.assertTrue(root_status["adminSessionAuthorized"])
        self.assertEqual(root_status["adminPermissions"], ["admin.roles.grant", "admin.roles.revoke"])
        self.assertEqual(root_status["adminDelegablePermissions"], ["admin.roles.grant"])

        status, self_grant, _ = self.request(
            "/api/admin/roles/grant",
            {
                "accountIdentifier": root_email,
                "reason": "Attempted self-promotion must not change permissions",
                "permissions": [],
            },
        )
        self.assertEqual(status, 400, self_grant)

        status, granted, _ = self.request(
            "/api/admin/roles/grant",
            {
                "accountIdentifier": target_account_identifier,
                "reason": "Appoint existing member after review",
                "permissions": ["admin.roles.grant"],
            },
        )
        self.assertEqual(status, 200, granted)
        self.assertTrue(granted["adminRoleAssigned"])
        self.assertEqual(granted["targetAccountIdentifier"], target_account_identifier)
        self.assertNotIn("targetEmail", granted)
        self.assertEqual(granted["role"], "admin")
        self.assertEqual(granted["adminPermissions"], ["admin.roles.grant"])
        self.assertEqual(granted["adminWalletCount"], 0)
        self.assertFalse(granted["walletEnrolled"])

        status, target_before_wallet, _ = self.request(
            "/api/account/status", opener=target_opener
        )
        self.assertEqual(status, 200, target_before_wallet)
        self.assertTrue(target_before_wallet["authenticated"])
        self.assertEqual(target_before_wallet["accountIdentifier"], target_account_identifier)
        self.assertIsNone(target_before_wallet["email"])
        self.assertTrue(target_before_wallet["adminRoleAssigned"])
        self.assertEqual(target_before_wallet["adminWalletCount"], 0)
        self.assertFalse(target_before_wallet["adminSessionAuthorized"])
        self.assertEqual(target_before_wallet["adminPermissions"], ["admin.roles.grant"])

        status, target_without_stepup, _ = self.request(
            "/api/admin/roles/grant",
            {
                "accountIdentifier": successor_email,
                "reason": "Attempt without the required wallet step-up",
                "permissions": [],
            },
            opener=target_opener,
        )
        self.assertEqual(status, 403, target_without_stepup)

        status, enrollment, _ = self.request(
            "/api/admin/wallet-enrollment-challenge",
            {"address": TEST_WALLET_B.address, "chainId": 1},
            opener=target_opener,
        )
        self.assertEqual(status, 200, enrollment)
        self.assertEqual(enrollment["enrollmentType"], "initial")
        self.assertFalse(enrollment["transactionAuthorized"])
        enrollment_signature = Account.sign_message(
            encode_defunct(text=enrollment["message"]),
            private_key=TEST_WALLET_KEY_B,
        ).signature.hex()
        if not enrollment_signature.startswith("0x"):
            enrollment_signature = "0x" + enrollment_signature

        status, cross_session, _ = self.request(
            "/api/admin/wallet-enrollment-verify",
            {"message": enrollment["message"], "signature": enrollment_signature},
        )
        self.assertEqual(status, 401, cross_session)

        status, enrolled, _ = self.request(
            "/api/admin/wallet-enrollment-verify",
            {"message": enrollment["message"], "signature": enrollment_signature},
            opener=target_opener,
        )
        self.assertEqual(status, 200, enrolled)
        self.assertEqual(enrolled["adminWalletCount"], 1)
        self.assertEqual(enrolled["walletEnrolledAddress"], TEST_WALLET_B.address)
        self.assertFalse(enrolled["adminWalletAuthenticated"])
        self.assertFalse(enrolled["adminSessionAuthorized"])
        self.assertTrue(enrolled["authenticated"])

        status, replay, _ = self.request(
            "/api/admin/wallet-enrollment-verify",
            {"message": enrollment["message"], "signature": enrollment_signature},
            opener=target_opener,
        )
        self.assertEqual(status, 401, replay)

        status, target_authorized, _ = self.sign_admin_wallet(
            target_opener, TEST_WALLET_B.address, TEST_WALLET_KEY_B
        )
        self.assertEqual(status, 200, target_authorized)
        self.assertTrue(target_authorized["adminSessionAuthorized"])
        self.assertTrue(target_authorized["admin"])
        status, admin_status, _ = self.request("/api/admin/status", opener=target_opener)
        self.assertEqual(status, 200, admin_status)
        self.assertEqual(admin_status["adminWalletAddress"], TEST_WALLET_B.address)

        status, escalation, _ = self.request(
            "/api/admin/roles/grant",
            {
                "accountIdentifier": successor_email,
                "reason": "Attempt to pass on a non-delegable permission",
                "permissions": ["admin.roles.grant"],
            },
            opener=target_opener,
        )
        self.assertEqual(status, 403, escalation)
        status, forbidden_revoke, _ = self.request(
            "/api/admin/roles/revoke",
            {"accountIdentifier": root_email, "reason": "Attempt without the separate revoke permission"},
            opener=target_opener,
        )
        self.assertEqual(status, 403, forbidden_revoke)

        status, revoked, _ = self.request(
            "/api/admin/roles/revoke",
            {"accountIdentifier": target_account_identifier, "reason": "Remove administrator access after review"},
        )
        self.assertEqual(status, 200, revoked)
        self.assertEqual(revoked["role"], "user")
        self.assertEqual(revoked["revokedWalletCount"], 1)
        self.assertEqual(revoked["revokedPermissions"], ["admin.roles.grant"])

        status, target_after_revoke, _ = self.request(
            "/api/account/status", opener=target_opener
        )
        self.assertEqual(status, 200, target_after_revoke)
        self.assertTrue(target_after_revoke["authenticated"])
        self.assertEqual(target_after_revoke["role"], "user")
        self.assertFalse(target_after_revoke["adminRoleAssigned"])
        self.assertFalse(target_after_revoke["adminSessionAuthorized"])
        self.assertEqual(target_after_revoke["adminPermissions"], [])
        self.assertIsNotNone(target_after_revoke["administratorRevocationNotice"])
        self.assertEqual(
            target_after_revoke["administratorRevocationNotice"]["reason"],
            "Remove administrator access after review",
        )
        self.assertTrue(target_after_revoke["administratorRevocationNotice"]["noticeId"])
        self.assertEqual(target_after_revoke["communicationsUnreadCounts"]["alerts"], 1)
        status, target_inbox, _ = self.request("/api/account/communications", opener=target_opener)
        self.assertEqual(status, 200, target_inbox)
        target_alerts = [item for item in target_inbox["items"] if item["section"] == "alerts"]
        self.assertEqual(len(target_alerts), 1)
        self.assertEqual(target_alerts[0]["subject"], "Administrator privileges removed")
        self.assertIn("Remove administrator access after review", target_alerts[0]["body"])
        self.assertTrue(target_alerts[0]["requiresAcknowledgement"])
        status, root_inbox, _ = self.request("/api/account/communications")
        self.assertEqual(status, 200, root_inbox)
        self.assertEqual(root_inbox["items"], [], "revocation alerts must not leak to another account")
        status, denied_admin_status, _ = self.request("/api/admin/status", opener=target_opener)
        self.assertEqual(status, 403, denied_admin_status)

        status, root_account_status, _ = self.request("/api/account/status")
        self.assertEqual(status, 200, root_account_status)
        self.assertIsNone(root_account_status["administratorRevocationNotice"],
                         "the revocation notice must be visible only to its target account")

        notice_id = target_after_revoke["administratorRevocationNotice"]["noticeId"]
        status, other_account_acknowledgement, _ = self.request(
            "/api/account/administrator-notice/acknowledge",
            {"noticeId": notice_id},
            opener=successor_opener,
        )
        self.assertEqual(
            status, 404,
            "another signed-in account must not acknowledge or read this account's notice: "
            + repr(other_account_acknowledgement),
        )
        status, acknowledged, _ = self.request(
            "/api/account/administrator-notice/acknowledge",
            {"noticeId": notice_id},
            opener=target_opener,
        )
        self.assertEqual(status, 200, acknowledged)
        self.assertTrue(acknowledged["authenticated"])
        self.assertEqual(acknowledged["role"], "user")
        self.assertIsNone(acknowledged["administratorRevocationNotice"])
        status, acknowledged_status, _ = self.request(
            "/api/account/status", opener=target_opener
        )
        self.assertEqual(status, 200, acknowledged_status)
        self.assertIsNone(acknowledged_status["administratorRevocationNotice"],
                          "acknowledgement must persist across subsequent status refreshes")

        with self.app.connect() as db:
            audit = db.execute(
                """SELECT event_type, actor, target_account_id, reason, detail
                   FROM account_admin_audit
                   WHERE event_type IN ('admin_role_granted', 'admin_role_revoked_by_admin')
                   ORDER BY rowid"""
            ).fetchall()
        self.assertEqual([row["event_type"] for row in audit], [
            "admin_role_granted", "admin_role_revoked_by_admin"
        ])
        self.assertTrue(all(row["actor"] and row["target_account_id"] and row["reason"] for row in audit))
        self.assertIn('"admin.roles.grant"', audit[0]["detail"])
        self.assertIn('"admin.roles.grant"', audit[1]["detail"])

    def test_admin_without_role_grant_permission_cannot_appoint_another_account(self):
        actor_email = "ordinary-admin@example.test"
        target_email = "ordinary-target@example.test"
        actor_opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar())
        )
        target_opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar())
        )
        status, created, _ = self.create_account(email=actor_email, opener=actor_opener)
        self.assertEqual(status, 201, created)
        grant_admin(
            self.app,
            account_identifier=actor_email,
            wallet_address=TEST_WALLET_C.address,
            chain_id=1,
            reason="Bootstrap administrator without appointment authority",
            permissions=[],
        )
        status, created, _ = self.create_account(email=target_email, opener=target_opener)
        self.assertEqual(status, 201, created)
        status, authorized, _ = self.sign_admin_wallet(
            actor_opener, TEST_WALLET_C.address, TEST_WALLET_KEY_C
        )
        self.assertEqual(status, 200, authorized)
        self.assertTrue(authorized["adminSessionAuthorized"])
        self.assertEqual(authorized["adminPermissions"], [])
        status, denied, _ = self.request(
            "/api/admin/roles/grant",
            {"accountIdentifier": target_email, "reason": "Attempt by an admin without grant authority"},
            opener=actor_opener,
        )
        self.assertEqual(status, 403, denied)
        status, target_status, _ = self.request("/api/account/status", opener=target_opener)
        self.assertEqual(status, 200, target_status)
        self.assertEqual(target_status["role"], "user")
        self.assertFalse(target_status["adminRoleAssigned"])

    def test_admin_role_and_wallet_are_separate_and_wallet_step_up_authorizes_only_its_account_session(self):
        email = "admin-step-up@example.test"
        status, created, _ = self.create_account(email=email)
        self.assertEqual(status, 201, created)

        provisioned = grant_admin(
            self.app,
            account_identifier=email,
            wallet_address=TEST_WALLET_A.address,
            chain_id=1,
            reason="Owner-approved deterministic local test provisioning",
        )
        self.assertEqual(provisioned["role"], "admin")
        self.assertEqual(provisioned["active_wallet_count"], 1)

        status, wallet_options, _ = self.request("/api/admin/wallet-options", {})
        self.assertEqual(status, 200, wallet_options)
        self.assertEqual(wallet_options["maxWallets"], 3)
        self.assertTrue(wallet_options["requiresFreshSignature"])
        self.assertFalse(wallet_options["transactionAuthorized"])
        self.assertEqual(
            wallet_options["wallets"],
            [{"address": TEST_WALLET_A.address, "chainId": 1}],
        )

        status, before, _ = self.request("/api/account/status")
        self.assertEqual(status, 200)
        self.assertTrue(before["adminRoleAssigned"])
        self.assertFalse(before["adminWalletAuthenticated"])
        self.assertFalse(before["adminSessionAuthorized"])
        self.assertFalse(before["admin"], "an assigned role must not be enough to enter admin functions")

        status, admin_status, _ = self.request("/api/admin/status")
        self.assertEqual(status, 403, admin_status)
        self.assertIn("fresh signature", admin_status["error"].lower())

        status, challenge, _ = self.request(
            "/api/admin/wallet-challenge",
            {"address": TEST_WALLET_A.address, "chainId": 1},
        )
        self.assertEqual(status, 200, challenge)
        message = challenge["message"]
        self.assertIn("Verify an already-authorized AstroCrown administrator session", message)
        self.assertIn("does not authorize a transaction", message)
        signature = Account.sign_message(
            encode_defunct(text=message), private_key=TEST_WALLET_KEY_A
        ).signature.hex()
        if not signature.startswith("0x"):
            signature = "0x" + signature

        status, verified, _ = self.request(
            "/api/admin/wallet-verify", {"message": message, "signature": signature}
        )
        self.assertEqual(status, 200, verified)
        self.assertTrue(verified["adminWalletAuthenticated"])
        self.assertTrue(verified["adminSessionAuthorized"])
        self.assertTrue(verified["admin"])
        self.assertEqual(verified["adminWalletAddress"], TEST_WALLET_A.address)
        self.assertTrue(verified["adminSessionExpiresAt"])

        status, replay, _ = self.request(
            "/api/admin/wallet-verify", {"message": message, "signature": signature}
        )
        self.assertEqual(status, 401, replay)
        status, still_admin, _ = self.request("/api/admin/status")
        self.assertEqual(status, 200)
        self.assertTrue(still_admin["adminSessionAuthorized"])

        status, ended, _ = self.request("/api/admin/wallet-logout", {})
        self.assertEqual(status, 200, ended)
        self.assertTrue(ended["authenticated"], "ending admin step-up must not sign out the ordinary account")
        self.assertTrue(ended["adminRoleAssigned"])
        self.assertFalse(ended["admin"])
        status, no_longer_admin, _ = self.request("/api/admin/status")
        self.assertEqual(status, 403, no_longer_admin)
        self.assertIn("fresh signature", no_longer_admin["error"].lower())
        status, ordinary_status, _ = self.request("/api/account/status")
        self.assertEqual(status, 200, ordinary_status)
        self.assertTrue(ordinary_status["authenticated"])
        self.assertTrue(ordinary_status["adminRoleAssigned"])
        self.assertFalse(ordinary_status["adminSessionAuthorized"])

    def test_admin_wallet_challenge_rejects_unenrolled_wallet_wrong_signer_and_other_session(self):
        first_email = "admin-binding-first@example.test"
        second_email = "admin-binding-second@example.test"
        status, _, _ = self.create_account(email=first_email)
        grant_admin(
            self.app, account_identifier=first_email, wallet_address=TEST_WALLET_A.address, chain_id=1,
            reason="Owner-approved first account test",
        )
        status, challenge, _ = self.request(
            "/api/admin/wallet-challenge",
            {"address": TEST_WALLET_B.address, "chainId": 1},
        )
        self.assertEqual(status, 403, challenge)

        status, challenge, _ = self.request(
            "/api/admin/wallet-challenge",
            {"address": TEST_WALLET_A.address, "chainId": 1},
        )
        self.assertEqual(status, 200, challenge)
        message = challenge["message"]
        wrong_signature = Account.sign_message(
            encode_defunct(text=message), private_key=TEST_WALLET_KEY_B
        ).signature.hex()
        if not wrong_signature.startswith("0x"):
            wrong_signature = "0x" + wrong_signature
        status, rejected, _ = self.request(
            "/api/admin/wallet-verify",
            {"message": message, "signature": wrong_signature},
        )
        self.assertEqual(status, 401, rejected)
        status, still_denied, _ = self.request("/api/admin/status")
        self.assertEqual(status, 403, still_denied)
        self.assertIn("fresh signature", still_denied["error"].lower())
        status, ordinary_status, _ = self.request("/api/account/status")
        self.assertEqual(status, 200, ordinary_status)
        self.assertTrue(ordinary_status["authenticated"])
        self.assertTrue(ordinary_status["adminRoleAssigned"])
        self.assertFalse(ordinary_status["adminSessionAuthorized"])

        # A new challenge cannot be completed using a different admin's account
        # cookie, even if the submitted wallet message/signature itself is valid.
        status, new_challenge, _ = self.request(
            "/api/admin/wallet-challenge",
            {"address": TEST_WALLET_A.address, "chainId": 1},
        )
        self.assertEqual(status, 200, new_challenge)
        message = new_challenge["message"]
        signature = Account.sign_message(
            encode_defunct(text=message), private_key=TEST_WALLET_KEY_A
        ).signature.hex()
        if not signature.startswith("0x"):
            signature = "0x" + signature

        other_cookies = http.cookiejar.CookieJar()
        other_opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(other_cookies)
        )
        status, second_created, _ = self.create_account(
            email=second_email,
            opener=other_opener,
        )
        self.assertEqual(status, 201, second_created)
        grant_admin(
            self.app, account_identifier=second_email, wallet_address=TEST_WALLET_B.address, chain_id=1,
            reason="Owner-approved second account test",
        )
        status, cross_session, _ = self.request(
            "/api/admin/wallet-verify",
            {"message": message, "signature": signature},
            opener=other_opener,
        )
        self.assertEqual(status, 401, cross_session)

        status, correct_session, _ = self.request(
            "/api/admin/wallet-verify", {"message": message, "signature": signature}
        )
        self.assertEqual(status, 200, correct_session)
        self.assertTrue(correct_session["adminSessionAuthorized"])

    def test_additional_admin_wallet_requires_active_admin_step_up_and_new_wallet_signature(self):
        email = "admin-wallet-enrollment@example.test"
        status, _, _ = self.create_account(email=email)
        grant_admin(
            self.app, account_identifier=email, wallet_address=TEST_WALLET_A.address, chain_id=1,
            reason="Owner-approved wallet enrollment test setup",
        )

        # A password-authenticated role without the current wallet step-up
        # cannot begin enrollment or learn the wallet enrollment challenge.
        status, denied, _ = self.request(
            "/api/admin/wallet-enrollment-challenge",
            {"address": TEST_WALLET_B.address, "chainId": 1},
        )
        self.assertEqual(status, 403, denied)

        # First complete the existing-wallet proof-of-control step-up.
        status, challenge, _ = self.request(
            "/api/admin/wallet-challenge",
            {"address": TEST_WALLET_A.address, "chainId": 1},
        )
        self.assertEqual(status, 200, challenge)
        old_message = challenge["message"]
        old_signature = Account.sign_message(
            encode_defunct(text=old_message), private_key=TEST_WALLET_KEY_A
        ).signature.hex()
        if not old_signature.startswith("0x"):
            old_signature = "0x" + old_signature
        status, stepped_up, _ = self.request(
            "/api/admin/wallet-verify",
            {"message": old_message, "signature": old_signature},
        )
        self.assertEqual(status, 200, stepped_up)
        self.assertTrue(stepped_up["adminSessionAuthorized"])

        status, challenge, _ = self.request(
            "/api/admin/wallet-enrollment-challenge",
            {"address": TEST_WALLET_B.address, "chainId": 1},
        )
        self.assertEqual(status, 200, challenge)
        self.assertEqual(challenge["purpose"], "administrator-wallet-enrollment")
        self.assertFalse(challenge["transactionAuthorized"])
        self.assertIn("Register this wallet as an additional", challenge["message"])
        self.assertNotIn(TEST_WALLET_A.address.lower(), challenge["address"].lower())

        # The new wallet, not the existing admin wallet, must sign enrollment.
        enroll_message = challenge["message"]
        wrong_signature = Account.sign_message(
            encode_defunct(text=enroll_message), private_key=TEST_WALLET_A.key
        ).signature.hex()
        if not wrong_signature.startswith("0x"):
            wrong_signature = "0x" + wrong_signature
        status, rejected, _ = self.request(
            "/api/admin/wallet-enrollment-verify",
            {"message": enroll_message, "signature": wrong_signature},
        )
        self.assertEqual(status, 401, rejected)

        # The one-shot challenge has been consumed; issue a new one and sign
        # with the proposed address's fixture key.
        status, new_challenge, _ = self.request(
            "/api/admin/wallet-enrollment-challenge",
            {"address": TEST_WALLET_B.address, "chainId": 1},
        )
        self.assertEqual(status, 200, new_challenge)
        new_message = new_challenge["message"]
        new_signature = Account.sign_message(
            encode_defunct(text=new_message), private_key=TEST_WALLET_KEY_B
        ).signature.hex()
        if not new_signature.startswith("0x"):
            new_signature = "0x" + new_signature
        status, enrolled, _ = self.request(
            "/api/admin/wallet-enrollment-verify",
            {"message": new_message, "signature": new_signature},
        )
        self.assertEqual(status, 200, enrolled)
        self.assertEqual(enrolled["walletEnrolledAddress"], TEST_WALLET_B.address)
        self.assertEqual(enrolled["adminWalletCount"], 2)
        self.assertTrue(enrolled["adminRoleAssigned"])
        self.assertFalse(enrolled["adminSessionAuthorized"],
                         "Adding an authenticator must end the existing admin step-up.")

        # The ordinary account session remains active; both wallet entries are
        # available for future explicit step-up, but the old SIWE message replays fail.
        status, options, _ = self.request("/api/admin/wallet-options", {})
        self.assertEqual(status, 200, options)
        self.assertEqual(
            {row["address"].lower() for row in options["wallets"]},
            {TEST_WALLET_A.address.lower(), TEST_WALLET_B.address.lower()},
        )
        # Wallet enrollment clears the privileged step-up. Re-authenticate
        # with an already enrolled wallet so this assertion tests one-time
        # challenge replay, rather than only the missing-step-up guard.
        status, stepup_challenge, _ = self.request(
            "/api/admin/wallet-challenge",
            {"address": TEST_WALLET_A.address, "chainId": 1},
        )
        self.assertEqual(status, 200, stepup_challenge)
        stepup_message = stepup_challenge["message"]
        stepup_signature = Account.sign_message(
            encode_defunct(text=stepup_message), private_key=TEST_WALLET_KEY_A
        ).signature.hex()
        if not stepup_signature.startswith("0x"):
            stepup_signature = "0x" + stepup_signature
        status, reauthenticated, _ = self.request(
            "/api/admin/wallet-verify",
            {"message": stepup_message, "signature": stepup_signature},
        )
        self.assertEqual(status, 200, reauthenticated)
        self.assertTrue(reauthenticated["adminSessionAuthorized"])

        status, replay, _ = self.request(
            "/api/admin/wallet-enrollment-verify",
            {"message": new_message, "signature": new_signature},
        )
        self.assertEqual(status, 401, replay)
        status, after_replay, _ = self.request("/api/account/status")
        self.assertEqual(status, 200)
        self.assertEqual(after_replay["adminWalletCount"], 2)
        self.assertTrue(after_replay["adminSessionAuthorized"])
        self.assertTrue(after_replay["admin"], "rejected enrollment replay must not invalidate the unrelated valid step-up")

    def test_owner_cli_caps_admin_wallets_and_revoke_clears_privileged_sessions(self):
        email = "admin-wallet-count@example.test"
        status, _, _ = self.create_account(email=email)
        grant_admin(
            self.app, account_identifier=email, wallet_address=TEST_WALLET_A.address, chain_id=1,
            reason="Owner-approved first wallet for local cap test",
        )
        grant_admin(
            self.app, account_identifier=email, wallet_address=TEST_WALLET_B.address, chain_id=1,
            reason="Owner-approved second wallet for local cap test",
        )
        grant_admin(
            self.app, account_identifier=email, wallet_address=TEST_WALLET_C.address, chain_id=1,
            reason="Owner-approved third wallet for local cap test",
        )
        with self.assertRaisesRegex(ValueError, "no more than three"):
            grant_admin(
                self.app, account_identifier=email, wallet_address=TEST_WALLET_D.address, chain_id=1,
                reason="Attempted fourth wallet must be rejected",
            )
        with self.assertRaisesRegex(ValueError, "different local admin account"):
            other_email = "admin-wallet-collision@example.test"
            collision_cookies = http.cookiejar.CookieJar()
            collision_opener = urllib.request.build_opener(
                urllib.request.HTTPCookieProcessor(collision_cookies)
            )
            status, _, _ = self.create_account(email=other_email, opener=collision_opener)
            self.assertEqual(status, 201)
            grant_admin(
                self.app, account_identifier=other_email, wallet_address=TEST_WALLET_A.address, chain_id=1,
                reason="Attempted cross-account wallet reuse must fail",
            )

        status, challenge, _ = self.request(
            "/api/admin/wallet-challenge",
            {"address": TEST_WALLET_A.address, "chainId": 1},
        )
        self.assertEqual(status, 200, challenge)
        message = challenge["message"]
        signature = Account.sign_message(
            encode_defunct(text=message), private_key=TEST_WALLET_KEY_A
        ).signature.hex()
        if not signature.startswith("0x"):
            signature = "0x" + signature
        status, authorized, _ = self.request(
            "/api/admin/wallet-verify", {"message": message, "signature": signature}
        )
        self.assertEqual(status, 200, authorized)
        self.assertTrue(authorized["admin"])

        revoked = revoke_admin(
            self.app, account_identifier=email, reason="Owner-approved local administrator revocation"
        )
        self.assertEqual(revoked["role"], "user")
        self.assertEqual(revoked["revoked_wallet_count"], 3)
        status, after, _ = self.request("/api/account/status")
        self.assertEqual(status, 200)
        self.assertEqual(after["role"], "user")
        self.assertFalse(after["adminRoleAssigned"])
        self.assertFalse(after["adminWalletAuthenticated"])
        self.assertFalse(after["admin"])
        status, denied, _ = self.request(
            "/api/admin/wallet-challenge",
            {"address": TEST_WALLET_A.address, "chainId": 1},
        )
        self.assertEqual(status, 403, denied)
        status, options_after_revoke, _ = self.request("/api/admin/wallet-options", {})
        self.assertEqual(status, 403, options_after_revoke)
        with self.app.connect() as db:
            audit = db.execute(
                "SELECT event_type, actor, reason FROM account_admin_audit ORDER BY created_at"
            ).fetchall()
        self.assertGreaterEqual(len(audit), 4)
        self.assertTrue(all(row["reason"] for row in audit))

    def test_newsletter_preference_is_separate_and_defaults_to_off(self):
        status, data, _ = self.create_account()
        self.assertEqual(status, 201, data)
        self.assertFalse(data["newsletterOptIn"])
        self.assertIsNone(data["newsletterConsentAt"])
        self.assertEqual(data["referralId"], "")
        self.assertFalse(data["emailVerified"])
        self.assertIn("no email", data["message"].lower())

    def test_duplicate_email_is_rejected_case_insensitively(self):
        status, _, _ = self.create_account()
        self.assertEqual(status, 201)
        status, data, _ = self.create_account(email=EMAIL.upper())
        self.assertEqual(status, 409)
        self.assertIn("already exists", data["error"])

    def test_invalid_email_short_password_and_unaccepted_terms_are_rejected(self):
        status, data, _ = self.create_account(email="not-an-email")
        self.assertEqual(status, 400)
        self.assertIn("valid email", data["error"].lower())

        status, data, _ = self.create_account(email="shortpass@example.test", password="short")
        self.assertEqual(status, 400)
        self.assertIn("15 characters", data["error"])

        status, data, _ = self.create_account(email="terms@example.test", termsAccepted=False)
        self.assertEqual(status, 400)
        self.assertIn("accept", data["error"].lower())

        status, data, _ = self.create_account(email="wrong-version@example.test", termsVersion="unknown")
        self.assertEqual(status, 400)
        self.assertIn("version", data["error"].lower())

    def test_invalid_referral_identifier_is_rejected(self):
        status, data, _ = self.create_account(email="bad-referral@example.test", referralId="has spaces")
        self.assertEqual(status, 400)
        self.assertIn("Referral ID", data["error"])

    def test_bad_password_is_rejected_without_revealing_account_existence(self):
        status, _, _ = self.create_account()
        self.assertEqual(status, 201)
        status, first, _ = self.request(
            "/api/account/login", {"email": EMAIL, "password": "Wrong-Passphrase-2026!"},
        )
        self.assertEqual(status, 401)
        status, second, _ = self.request(
            "/api/account/login", {"email": "missing@example.test", "password": "Wrong-Passphrase-2026!"},
        )
        self.assertEqual(status, 401)
        self.assertEqual(first["error"], second["error"])

    def test_password_reset_does_not_claim_to_send_email(self):
        status, data, _ = self.request(
            "/api/account/password-reset/request", {"email": EMAIL},
        )
        self.assertEqual(status, 200, data)
        self.assertFalse(data["emailSent"])
        self.assertIn("No password-reset email was sent", data["message"])

    def test_recovery_code_api_is_not_part_of_the_new_signup_contract(self):
        status, data, _ = self.create_account()
        self.assertEqual(status, 201)
        self.assertNotIn("recoveryCodes", data)
        status, response, _ = self.request(
            "/api/account/recover",
            {"email": EMAIL, "recoveryCode": "A" * 24, "newPassword": "Replacement-Passphrase-2026!"},
        )
        self.assertEqual(status, 404)
        self.assertIn("not available", response["error"].lower())

    def test_missing_or_wrong_origin_and_wrong_host_are_rejected(self):
        payload = {
            "email": EMAIL, "password": PASSWORD, "termsAccepted": True,
            "termsVersion": TERMS_VERSION, "newsletterOptIn": False, "referralId": "",
        }
        status, _, _ = self.request("/api/account/register", payload, origin=False)
        self.assertEqual(status, 403)
        status, _, _ = self.request("/api/account/register", payload, host=False)
        self.assertEqual(status, 403)

    def test_oversized_json_body_is_rejected(self):
        raw = b'{"email":"' + b"x" * (16 * 1024) + b'"}'
        request = urllib.request.Request(
            self.url + "/api/account/register", data=raw,
            headers={
                "Host": "localhost:" + str(self.port),
                "Origin": self.origin,
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            self.opener.open(request, timeout=5)
            self.fail("oversized request should have failed")
        except urllib.error.HTTPError as error:
            self.assertEqual(error.code, 413)




    def test_private_communications_use_sender_selected_sections_and_recipient_scoped_state(self):
        sender_email = "communications-admin@example.test"
        recipient_email = "communications-target@example.test"
        ordinary_admin_email = "communications-admin-without-send@example.test"
        outsider_email = "communications-outsider@example.test"
        sender_opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar())
        )
        recipient_opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar())
        )
        ordinary_admin_opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar())
        )
        outsider_opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar())
        )

        for address, opener in (
            (sender_email, sender_opener),
            (recipient_email, recipient_opener),
            (ordinary_admin_email, ordinary_admin_opener),
            (outsider_email, outsider_opener),
        ):
            status, created, _ = self.create_account(email=address, opener=opener)
            self.assertEqual(status, 201, created)

        grant_admin(
            self.app,
            account_identifier=sender_email,
            wallet_address=TEST_WALLET_C.address,
            chain_id=1,
            reason="Provision administrator communication authority",
            permissions=["admin.messages.send"],
        )
        grant_admin(
            self.app,
            account_identifier=ordinary_admin_email,
            wallet_address=TEST_WALLET_D.address,
            chain_id=1,
            reason="Provision administrator without communication authority",
            permissions=[],
        )
        status, sender_status, _ = self.sign_admin_wallet(
            sender_opener, TEST_WALLET_C.address, TEST_WALLET_KEY_C
        )
        self.assertEqual(status, 200, sender_status)
        status, ordinary_admin_status, _ = self.sign_admin_wallet(
            ordinary_admin_opener, TEST_WALLET_D.address, TEST_WALLET_KEY_D
        )
        self.assertEqual(status, 200, ordinary_admin_status)

        message_body = "<script>not executable in the inbox</script>\nA private account message."
        status, sent_message, _ = self.request(
            "/api/admin/communications/send",
            {
                "accountIdentifier": recipient_email,
                "section": "messages",
                "subject": "Account information",
                "body": message_body,
            },
            opener=sender_opener,
        )
        self.assertEqual(status, 201, sent_message)
        self.assertEqual(sent_message["section"], "messages")
        message_id = sent_message["communicationId"]

        status, sent_alert, _ = self.request(
            "/api/admin/communications/send",
            {
                "accountIdentifier": recipient_email,
                "section": "alerts",
                "subject": "Action required",
                "body": "Please review this account alert.",
            },
            opener=sender_opener,
        )
        self.assertEqual(status, 201, sent_alert)
        self.assertEqual(sent_alert["section"], "alerts")
        alert_id = sent_alert["communicationId"]

        status, inbox, _ = self.request(
            "/api/account/communications", opener=recipient_opener
        )
        self.assertEqual(status, 200, inbox)
        self.assertEqual(len(inbox["items"]), 2)
        by_section = {item["section"]: item for item in inbox["items"]}
        self.assertEqual(by_section["messages"]["communicationId"], message_id)
        self.assertEqual(by_section["alerts"]["communicationId"], alert_id)
        self.assertEqual(by_section["messages"]["senderAccountIdentifier"], sender_email)
        self.assertEqual(by_section["messages"]["body"], message_body)
        self.assertFalse(by_section["messages"]["requiresAcknowledgement"])
        self.assertTrue(by_section["alerts"]["requiresAcknowledgement"])
        self.assertEqual(inbox["unreadCounts"], {"alerts": 1, "messages": 1})

        status, outsider_inbox, _ = self.request(
            "/api/account/communications", opener=outsider_opener
        )
        self.assertEqual(status, 200, outsider_inbox)
        self.assertEqual(outsider_inbox["items"], [])

        status, forbidden_send, _ = self.request(
            "/api/admin/communications/send",
            {
                "accountIdentifier": recipient_email,
                "section": "messages",
                "subject": "Unauthorized",
                "body": "An administrator without the separate permission must be blocked.",
            },
            opener=ordinary_admin_opener,
        )
        self.assertEqual(status, 403, forbidden_send)
        status, non_admin_send, _ = self.request(
            "/api/admin/communications/send",
            {
                "accountIdentifier": recipient_email,
                "section": "messages",
                "subject": "Unauthorized",
                "body": "An ordinary account cannot send an administrator communication.",
            },
            opener=outsider_opener,
        )
        self.assertEqual(status, 403, non_admin_send)

        status, cross_account_read, _ = self.request(
            "/api/account/communications/state",
            {"communicationId": message_id, "action": "read"},
            opener=outsider_opener,
        )
        self.assertEqual(status, 404, cross_account_read)
        status, wrong_alert_state, _ = self.request(
            "/api/account/communications/state",
            {"communicationId": alert_id, "action": "read"},
            opener=recipient_opener,
        )
        self.assertEqual(status, 409, wrong_alert_state)

        status, read_message, _ = self.request(
            "/api/account/communications/state",
            {"communicationId": message_id, "action": "read"},
            opener=recipient_opener,
        )
        self.assertEqual(status, 200, read_message)
        self.assertEqual(read_message["unreadCounts"], {"alerts": 1, "messages": 0})
        status, acknowledged_alert, _ = self.request(
            "/api/account/communications/state",
            {"communicationId": alert_id, "action": "acknowledge"},
            opener=recipient_opener,
        )
        self.assertEqual(status, 200, acknowledged_alert)
        self.assertEqual(acknowledged_alert["unreadCounts"], {"alerts": 0, "messages": 0})

        status, summary, _ = self.request(
            "/api/account/status", opener=recipient_opener
        )
        self.assertEqual(status, 200, summary)
        self.assertEqual(summary["communicationsUnreadCounts"], {"alerts": 0, "messages": 0})

        with self.app.connect() as db:
            records = db.execute(
                """SELECT communication_id, section, sender_account_id, recipient_account_id,
                          read_at, acknowledged_at, source_audit_id
                   FROM account_communications ORDER BY rowid"""
            ).fetchall()
            send_audits = db.execute(
                """SELECT audit_id, actor, target_account_id, reason, detail
                   FROM account_admin_audit
                   WHERE event_type = 'admin_communication_sent'
                   ORDER BY rowid"""
            ).fetchall()
        self.assertEqual(len(records), 2)
        self.assertEqual({row["section"] for row in records}, {"alerts", "messages"})
        self.assertTrue(all(row["sender_account_id"] is not None for row in records))
        self.assertTrue(all(row["read_at"] is None or row["section"] == "messages" for row in records))
        self.assertTrue(all(row["acknowledged_at"] is None or row["section"] == "alerts" for row in records))
        self.assertTrue(all(row["source_audit_id"] is not None for row in records))
        self.assertEqual(len(send_audits), 2)
        audits_by_id = {row["audit_id"]: row for row in send_audits}
        self.assertEqual(set(audits_by_id), {row["source_audit_id"] for row in records})
        for record in records:
            audit = audits_by_id[record["source_audit_id"]]
            detail = json.loads(audit["detail"])
            self.assertEqual(audit["actor"], record["sender_account_id"])
            self.assertEqual(audit["target_account_id"], record["recipient_account_id"])
            self.assertEqual(detail["communication_id"], record["communication_id"])
            self.assertEqual(detail["section"], record["section"])
            self.assertIn(audit["reason"], {"Sent a private in-app Alert", "Sent a private in-app Message"})
            self.assertGreaterEqual(detail["subject_characters"], 1)
            self.assertGreaterEqual(detail["body_characters"], 1)
            self.assertNotIn(message_body, audit["detail"], "message content must not be duplicated into the audit log")
            self.assertNotIn("Account information", audit["detail"])
            self.assertNotIn("Action required", audit["detail"])


if __name__ == "__main__":
    unittest.main()
