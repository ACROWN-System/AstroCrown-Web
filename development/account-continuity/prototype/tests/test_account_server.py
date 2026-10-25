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

    def test_admin_role_and_wallet_are_separate_and_wallet_step_up_authorizes_only_its_account_session(self):
        email = "admin-step-up@example.test"
        status, created, _ = self.create_account(email=email)
        self.assertEqual(status, 201, created)

        provisioned = grant_admin(
            self.app,
            email=email,
            wallet_address=TEST_WALLET_A.address,
            chain_id=1,
            reason="Owner-approved deterministic local test provisioning",
        )
        self.assertEqual(provisioned["role"], "admin")
        self.assertEqual(provisioned["active_wallet_count"], 1)

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
        self.assertEqual(status, 200)
        self.assertFalse(no_longer_admin["adminSessionAuthorized"])

    def test_admin_wallet_challenge_rejects_unenrolled_wallet_wrong_signer_and_other_session(self):
        first_email = "admin-binding-first@example.test"
        second_email = "admin-binding-second@example.test"
        status, _, _ = self.create_account(email=first_email)
        grant_admin(
            self.app, email=first_email, wallet_address=TEST_WALLET_A.address, chain_id=1,
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
        self.assertEqual(status, 200)
        self.assertFalse(still_denied["adminSessionAuthorized"])

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
            self.app, email=second_email, wallet_address=TEST_WALLET_B.address, chain_id=1,
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

    def test_owner_cli_caps_admin_wallets_and_revoke_clears_privileged_sessions(self):
        email = "admin-wallet-count@example.test"
        status, _, _ = self.create_account(email=email)
        grant_admin(
            self.app, email=email, wallet_address=TEST_WALLET_A.address, chain_id=1,
            reason="Owner-approved first wallet for local cap test",
        )
        grant_admin(
            self.app, email=email, wallet_address=TEST_WALLET_B.address, chain_id=1,
            reason="Owner-approved second wallet for local cap test",
        )
        grant_admin(
            self.app, email=email, wallet_address=TEST_WALLET_C.address, chain_id=1,
            reason="Owner-approved third wallet for local cap test",
        )
        with self.assertRaisesRegex(ValueError, "no more than three"):
            grant_admin(
                self.app, email=email, wallet_address=TEST_WALLET_D.address, chain_id=1,
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
                self.app, email=other_email, wallet_address=TEST_WALLET_A.address, chain_id=1,
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
            self.app, email=email, reason="Owner-approved local administrator revocation"
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
