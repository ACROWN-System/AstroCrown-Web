from __future__ import annotations

import http.cookiejar
import json
import sys
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from pathlib import Path

PROTOTYPE_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROTOTYPE_DIR))
from server import AccountApplication, TERMS_VERSION, create_server  # noqa: E402

PASSWORD = "AstroCrown-Local-Test-2026!"
EMAIL = "test-user@example.test"


class AccountServerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.app = AccountApplication(Path(self.temp.name) / "accounts.sqlite3")
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

    def create_account(self, email=EMAIL, password=PASSWORD, **overrides):
        payload = {
            "email": email,
            "password": password,
            "referralId": "",
            "newsletterOptIn": False,
            "termsAccepted": True,
            "termsVersion": TERMS_VERSION,
        }
        payload.update(overrides)
        return self.request("/api/account/register", payload)

    def test_homepage_assets_and_policy_drafts_are_served_locally(self):
        status, _, headers = self.request("/")
        self.assertEqual(status, 200)
        self.assertIn("text/html", headers.get("Content-Type", ""))
        for path, expected_type in (
            ("/account-continuity/prototype/account-ui.js", "javascript"),
            ("/account-continuity/prototype/account-prototype.css", "text/css"),
            ("/account-continuity/prototype/terms-of-use.html", "text/html"),
            ("/account-continuity/prototype/privacy-policy.html", "text/html"),
        ):
            status, _, headers = self.request(path)
            self.assertEqual(status, 200, path)
            self.assertIn(expected_type, headers.get("Content-Type", ""))

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
        self.assertEqual(status, 501)
        self.assertIn("not enabled", data["error"].lower())
        self.assertIn("no email was sent", data["error"].lower())

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


if __name__ == "__main__":
    unittest.main()
