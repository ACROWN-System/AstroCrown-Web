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
from server import AccountApplication, create_server  # noqa: E402

PASSWORD = "AstroCrown-Local-Test-2026!"
USERNAME = "testuser"


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

    def create_account(self, username=USERNAME, password=PASSWORD):
        return self.request("/api/account/register", {"username": username, "password": password})

    def ack_codes(self):
        return self.request("/api/recovery/ack", {})

    def test_homepage_and_static_asset_are_served_without_external_auth(self):
        status, _, headers = self.request("/")
        self.assertEqual(status, 200)
        self.assertIn("text/html", headers.get("Content-Type", ""))
        status, _, headers = self.request("/account-continuity/prototype/account-ui.js")
        self.assertEqual(status, 200)
        self.assertIn("javascript", headers.get("Content-Type", ""))

    def test_register_sign_in_logout_and_password_is_not_exposed(self):
        status, data, headers = self.create_account()
        self.assertEqual(status, 201, data)
        self.assertEqual(len(data["recoveryCodes"]), 8)
        self.assertNotIn("password", data)
        self.assertIn("HttpOnly", headers.get("Set-Cookie", ""))
        self.assertIn("SameSite=Strict", headers.get("Set-Cookie", ""))
        self.assertNotIn("Domain=", headers.get("Set-Cookie", ""))
        status, session, _ = self.request("/api/account/status")
        self.assertEqual(status, 200)
        self.assertTrue(session["authenticated"])
        self.assertFalse(session["recoveryConfigured"])
        status, data, _ = self.ack_codes()
        self.assertEqual(status, 200, data)
        self.assertTrue(data["recoveryConfigured"])
        status, _, _ = self.request("/api/account/logout", {})
        self.assertEqual(status, 200)
        status, session, _ = self.request("/api/account/status")
        self.assertFalse(session["authenticated"])
        status, data, _ = self.request("/api/account/login", {"username": USERNAME, "password": PASSWORD})
        self.assertEqual(status, 200, data)
        self.assertTrue(data["authenticated"])
        self.assertFalse(data["admin"])

    def test_duplicate_username_and_short_password_are_rejected(self):
        status, _, _ = self.create_account()
        self.assertEqual(status, 201)
        status, _, _ = self.create_account(username=USERNAME.upper())
        self.assertEqual(status, 409)
        status, data, _ = self.create_account(username="shortpass", password="short")
        self.assertEqual(status, 400)
        self.assertIn("15 characters", data["error"])

    def test_bad_password_is_rejected_without_revealing_account_existence(self):
        status, _, _ = self.create_account()
        self.assertEqual(status, 201)
        status, first, _ = self.request("/api/account/login", {"username": USERNAME, "password": "wrong password"})
        self.assertEqual(status, 401)
        status, second, _ = self.request("/api/account/login", {"username": "missing-account", "password": "wrong password"})
        self.assertEqual(status, 401)
        self.assertEqual(first["error"], second["error"])

    def test_recovery_code_is_single_use_and_revokes_existing_sessions(self):
        status, created, _ = self.create_account()
        self.assertEqual(status, 201)
        code = created["recoveryCodes"][0]
        status, _, _ = self.ack_codes()
        self.assertEqual(status, 200)
        status, _, _ = self.request("/api/account/recover", {
            "username": USERNAME, "recoveryCode": code, "newPassword": "Replacement-Passphrase-2026!"
        })
        self.assertEqual(status, 200)
        status, session, _ = self.request("/api/account/status")
        self.assertFalse(session["authenticated"])
        status, reused, _ = self.request("/api/account/recover", {
            "username": USERNAME, "recoveryCode": code, "newPassword": "Another-Replacement-2026!!"
        })
        self.assertEqual(status, 401)
        self.assertEqual(reused["error"], "The username or recovery code could not be verified.")
        status, data, _ = self.request("/api/account/login", {
            "username": USERNAME, "password": "Replacement-Passphrase-2026!"
        })
        self.assertEqual(status, 200, data)

    def test_missing_or_wrong_origin_and_wrong_host_are_rejected(self):
        status, _, _ = self.request("/api/account/register", {"username": USERNAME, "password": PASSWORD}, origin=False)
        self.assertEqual(status, 403)
        status, _, _ = self.request("/api/account/register", {"username": USERNAME, "password": PASSWORD}, host=False)
        self.assertEqual(status, 403)

    def test_password_reset_without_enabled_recovery_fails(self):
        status, created, _ = self.create_account()
        self.assertEqual(status, 201)
        status, _, _ = self.request("/api/account/recover", {
            "username": USERNAME, "recoveryCode": created["recoveryCodes"][0],
            "newPassword": "Recovery-Unenabled-Passphrase!"
        })
        self.assertEqual(status, 401)

    def test_regeneration_invalidates_prior_codes_until_acknowledged(self):
        status, created, _ = self.create_account()
        self.assertEqual(status, 201)
        status, _, _ = self.ack_codes()
        self.assertEqual(status, 200)
        status, regenerated, _ = self.request("/api/recovery/regenerate", {"password": PASSWORD})
        self.assertEqual(status, 200)
        status, _, _ = self.request("/api/account/recover", {
            "username": USERNAME, "recoveryCode": created["recoveryCodes"][0],
            "newPassword": "Replacement-Passphrase-2026!"
        })
        self.assertEqual(status, 401)
        status, _, _ = self.request("/api/account/recover", {
            "username": USERNAME, "recoveryCode": regenerated["recoveryCodes"][0],
            "newPassword": "Replacement-Passphrase-2026!"
        })
        self.assertEqual(status, 401)
        status, _, _ = self.ack_codes()
        self.assertEqual(status, 200)
        status, data, _ = self.request("/api/account/recover", {
            "username": USERNAME, "recoveryCode": regenerated["recoveryCodes"][0],
            "newPassword": "Replacement-Passphrase-2026!"
        })
        self.assertEqual(status, 200, data)

    def test_oversized_json_body_is_rejected(self):
        raw = b'{"username":"' + b"x" * (16 * 1024) + b'"}'
        request = urllib.request.Request(
            self.url + "/api/account/register", data=raw,
            headers={"Host": "localhost:" + str(self.port), "Origin": self.origin, "Content-Type": "application/json"},
            method="POST",
        )
        try:
            self.opener.open(request, timeout=5)
            self.fail("oversized request should have failed")
        except urllib.error.HTTPError as error:
            self.assertEqual(error.code, 413)


if __name__ == "__main__":
    unittest.main()
