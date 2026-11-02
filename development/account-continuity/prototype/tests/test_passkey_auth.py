from __future__ import annotations

import base64
import json
import tempfile
import threading
import time
import unittest
import urllib.error
import urllib.request
import uuid
from pathlib import Path
from types import SimpleNamespace

PROTOTYPE_DIR = Path(__file__).resolve().parents[1]
import sys
sys.path.insert(0, str(PROTOTYPE_DIR))

from passkey_auth import PasskeyAuthService, PasskeyVerificationError
from server import AccountApplication, TERMS_VERSION, create_server


def b64url(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


class PasskeyApiTests(unittest.TestCase):
    """Local API tests; cryptographic ceremony outputs are mocked only where noted."""

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.app = AccountApplication(
            Path(self.temp.name) / "passkeys.sqlite3",
            email_sender=None,
        )
        self.server = create_server(self.app, 0)
        self.port = self.server.server_port
        self.origin = f"http://localhost:{self.port}"
        self.url = f"http://127.0.0.1:{self.port}"
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor())

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)
        self.temp.cleanup()

    def request(self, path, payload=None, opener=None):
        headers = {"Host": f"localhost:{self.port}"}
        method = "GET" if payload is None else "POST"
        data = None
        if payload is not None:
            data = json.dumps(payload).encode("utf-8")
            headers["Content-Type"] = "application/json"
            headers["Origin"] = self.origin
        request = urllib.request.Request(
            self.url + path, data=data, headers=headers, method=method
        )
        try:
            response = (opener or self.opener).open(request, timeout=5)
            body = response.read().decode("utf-8")
            return response.status, json.loads(body), response.headers
        except urllib.error.HTTPError as error:
            body = error.read().decode("utf-8")
            return error.code, json.loads(body), error.headers

    def registration_options(self):
        return self.request(
            "/api/passkeys/register/options",
            {
                "termsAccepted": True,
                "termsVersion": TERMS_VERSION,
                "referralId": "",
            },
        )

    def test_service_requires_exact_secure_origin_and_builds_discoverable_options(self):
        with self.assertRaises(ValueError):
            PasskeyAuthService(rp_id="localhost", rp_name="AstroCrown", origin="http://example.test")
        service = self.app.passkey_auth_service
        self.assertIsNotNone(service)
        options = service.authentication_options(challenge=b"x" * 32)
        self.assertEqual(options["rpId"], "localhost")
        self.assertEqual(options["userVerification"], "required")
        self.assertNotIn("allowCredentials", options)

        registration = service.registration_options(
            user_id=uuid.uuid4().bytes,
            user_name="AC-TEST",
            user_display_name="AstroCrown member",
            challenge=b"y" * 32,
        )
        selection = registration["authenticatorSelection"]
        self.assertEqual(selection["residentKey"], "required")
        self.assertEqual(selection["userVerification"], "required")
        self.assertEqual(registration["attestation"], "none")

    def test_status_reports_passkey_available_and_legacy_password_routes_are_disabled(self):
        status, data, _ = self.request("/api/account/status")
        self.assertEqual(status, 200)
        self.assertFalse(data["authenticated"])
        self.assertTrue(data["passkeyAvailable"])

        for path, payload in (
            ("/api/account/register", {"email": "legacy@example.test", "password": "not-for-use"}),
            ("/api/account/login", {"email": "legacy@example.test", "password": "not-for-use"}),
            ("/api/account/password-reset/request", {"email": "legacy@example.test"}),
        ):
            status, result, _ = self.request(path, payload)
            self.assertEqual(status, 410, (path, result))
            self.assertIn("retired", result["error"].lower())

    def test_registration_options_are_email_free_and_create_one_use_challenge(self):
        status, result, _ = self.registration_options()
        self.assertEqual(status, 200, result)
        self.assertEqual(result["publicKey"]["rp"]["id"], "localhost")
        self.assertEqual(result["publicKey"]["authenticatorSelection"]["residentKey"], "required")
        self.assertEqual(result["publicKey"]["authenticatorSelection"]["userVerification"], "required")
        self.assertEqual(len(result["challengeId"]), 32)
        with self.app.connect() as db:
            row = db.execute(
                "SELECT challenge, ceremony, account_id, expires_at, used_at FROM account_passkey_challenges WHERE challenge_id = ?",
                (result["challengeId"],),
            ).fetchone()
        self.assertEqual(row["ceremony"], "registration")
        self.assertEqual(len(bytes(row["challenge"])), 32)
        self.assertIsNotNone(row["account_id"])
        self.assertGreater(row["expires_at"], int(time.time()))
        self.assertIsNone(row["used_at"])

    def test_authentication_options_do_not_accept_an_account_identifier(self):
        status, result, _ = self.request(
            "/api/passkeys/authentication/options", {"email": "not-accepted@example.test"}
        )
        self.assertEqual(status, 400, result)
        status, result, _ = self.request("/api/passkeys/authentication/options", {})
        self.assertEqual(status, 200, result)
        self.assertEqual(result["publicKey"]["userVerification"], "required")
        self.assertNotIn("allowCredentials", result["publicKey"])

    def test_rejected_registration_does_not_create_account_or_consume_challenge(self):
        status, options, _ = self.registration_options()
        self.assertEqual(status, 200)
        self.app.passkey_auth_service.verify_registration = lambda **_kwargs: (
            (_ for _ in ()).throw(PasskeyVerificationError("invalid proof"))
        )
        raw_id = b"invalid-registration-credential"
        encoded_id = b64url(raw_id)
        status, result, _ = self.request(
            "/api/passkeys/register/verify",
            {
                "challengeId": options["challengeId"],
                "credential": {
                    "id": encoded_id,
                    "rawId": encoded_id,
                    "type": "public-key",
                    "response": {"transports": ["internal"]},
                },
            },
        )
        self.assertEqual(status, 401, result)
        with self.app.connect() as db:
            self.assertEqual(db.execute("SELECT COUNT(*) FROM accounts").fetchone()[0], 0)
            challenge = db.execute(
                "SELECT used_at FROM account_passkey_challenges WHERE challenge_id = ?",
                (options["challengeId"],),
            ).fetchone()
        self.assertIsNone(challenge["used_at"])

    def test_mocked_verified_registration_signin_and_challenge_replay_protection(self):
        # This test mocks only the library's cryptographic verdict so that DB,
        # challenge, session and lifecycle semantics are exercised without a
        # physical authenticator in CI. Real signature verification remains
        # separately covered by the maintained relying-party library boundary.
        status, options, _ = self.registration_options()
        self.assertEqual(status, 200)
        raw_id = b"acrown-test-passkey-credential"
        encoded_id = b64url(raw_id)
        fake_registration = SimpleNamespace(
            credential_id=raw_id,
            credential_public_key=b"test-only-public-key-blob",
            sign_count=0,
            credential_device_type=SimpleNamespace(value="multi_device"),
            credential_backed_up=True,
        )
        self.app.passkey_auth_service.verify_registration = (
            lambda **_kwargs: fake_registration
        )
        registration_credential = {
            "id": encoded_id,
            "rawId": encoded_id,
            "type": "public-key",
            "response": {"transports": ["internal"]},
        }
        status, created, headers = self.request(
            "/api/passkeys/register/verify",
            {"challengeId": options["challengeId"], "credential": registration_credential},
        )
        self.assertEqual(status, 201, created)
        self.assertTrue(created["authenticated"])
        self.assertEqual(created["authMethod"], "webauthn")
        self.assertEqual(created["passkeyCount"], 1)
        self.assertIsNone(created["email"])
        self.assertFalse(created["emailVerified"])
        cookie = headers.get("Set-Cookie")
        self.assertIsNotNone(cookie)
        with self.app.connect() as db:
            account = db.execute(
                "SELECT account_id, email, auth_method, role FROM accounts"
            ).fetchone()
            credential_row = db.execute(
                "SELECT credential_id, sign_count, active, backed_up FROM account_passkey_credentials"
            ).fetchone()
            challenge_row = db.execute(
                "SELECT used_at FROM account_passkey_challenges WHERE challenge_id = ?",
                (options["challengeId"],),
            ).fetchone()
        self.assertIsNone(account["email"])
        self.assertEqual(account["auth_method"], "webauthn")
        self.assertEqual(account["role"], "user")
        self.assertEqual(credential_row["credential_id"], encoded_id)
        self.assertEqual(credential_row["sign_count"], 0)
        self.assertEqual(credential_row["active"], 1)
        self.assertEqual(credential_row["backed_up"], 1)
        self.assertIsNotNone(challenge_row["used_at"])

        status, replay, _ = self.request(
            "/api/passkeys/register/verify",
            {"challengeId": options["challengeId"], "credential": registration_credential},
        )
        self.assertEqual(status, 410, replay)

        status, auth_options, _ = self.request("/api/passkeys/authentication/options", {})
        self.assertEqual(status, 200, auth_options)
        user_handle = b64url(uuid.UUID(account["account_id"]).bytes)
        authentication_credential = {
            "id": encoded_id,
            "rawId": encoded_id,
            "type": "public-key",
            "response": {"userHandle": user_handle},
        }
        fake_authentication = SimpleNamespace(
            credential_id=raw_id,
            new_sign_count=1,
            credential_device_type=SimpleNamespace(value="multi_device"),
            credential_backed_up=True,
            user_verified=True,
        )
        self.app.passkey_auth_service.verify_authentication = (
            lambda **_kwargs: fake_authentication
        )
        status, signed_in, _ = self.request(
            "/api/passkeys/authentication/verify",
            {"challengeId": auth_options["challengeId"], "credential": authentication_credential},
        )
        self.assertEqual(status, 200, signed_in)
        self.assertTrue(signed_in["authenticated"])
        self.assertEqual(signed_in["authMethod"], "webauthn")
        self.assertEqual(signed_in["activeSessionCount"], 2)
        with self.app.connect() as db:
            self.assertEqual(
                db.execute(
                    "SELECT sign_count FROM account_passkey_credentials WHERE credential_id = ?",
                    (encoded_id,),
                ).fetchone()[0],
                1,
            )
        status, replay, _ = self.request(
            "/api/passkeys/authentication/verify",
            {"challengeId": auth_options["challengeId"], "credential": authentication_credential},
        )
        self.assertEqual(status, 410, replay)

    def test_recovery_key_is_hashed_single_use_and_replaces_passkeys_and_sessions(self):
        status, options, _ = self.registration_options()
        self.assertEqual(status, 200)
        original_id = b"original-recovery-test-passkey"
        original_encoded = b64url(original_id)
        original_verified = SimpleNamespace(
            credential_id=original_id,
            credential_public_key=b"original-public-key",
            sign_count=0,
            credential_device_type=SimpleNamespace(value="multi_device"),
            credential_backed_up=True,
        )
        self.app.passkey_auth_service.verify_registration = lambda **_kwargs: original_verified
        status, created, _ = self.request(
            "/api/passkeys/register/verify",
            {
                "challengeId": options["challengeId"],
                "credential": {
                    "id": original_encoded,
                    "rawId": original_encoded,
                    "type": "public-key",
                    "response": {"transports": ["internal"]},
                },
            },
        )
        self.assertEqual(status, 201, created)
        self.assertTrue(created["recoveryKeyAvailable"])
        original_recovery_key = created["oneTimeRecoveryKey"]
        self.assertRegex(original_recovery_key, r"^ACR1-[A-Za-z0-9_-]{43}$")
        account_identifier = created["accountIdentifier"]

        # Use a fresh client with no account session: the recovery key itself
        # is the proof that permits this restricted credential-replacement flow.
        recovery_client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor())
        status, recovery_options, _ = self.request(
            "/api/account/recovery/options",
            {
                "accountIdentifier": account_identifier,
                "recoveryKey": original_recovery_key,
            },
            opener=recovery_client,
        )
        self.assertEqual(status, 200, recovery_options)
        self.assertEqual(recovery_options["purpose"], "replace-lost-passkey-using-one-time-recovery-key")
        self.assertEqual(
            recovery_options["publicKey"]["authenticatorSelection"]["userVerification"],
            "required",
        )

        replacement_id = b"replacement-recovery-test-passkey"
        replacement_encoded = b64url(replacement_id)
        replacement_verified = SimpleNamespace(
            credential_id=replacement_id,
            credential_public_key=b"replacement-public-key",
            sign_count=0,
            credential_device_type=SimpleNamespace(value="single_device"),
            credential_backed_up=False,
        )
        self.app.passkey_auth_service.verify_registration = lambda **_kwargs: replacement_verified
        status, recovered, headers = self.request(
            "/api/account/recovery/complete",
            {
                "challengeId": recovery_options["challengeId"],
                "credential": {
                    "id": replacement_encoded,
                    "rawId": replacement_encoded,
                    "type": "public-key",
                    "response": {"transports": ["internal"]},
                },
            },
            opener=recovery_client,
        )
        self.assertEqual(status, 200, recovered)
        self.assertTrue(recovered["authenticated"])
        self.assertTrue(recovered["recovered"])
        self.assertEqual(recovered["accountIdentifier"], account_identifier)
        self.assertEqual(recovered["passkeyCount"], 1)
        self.assertTrue(recovered["recoveryKeyAvailable"])
        self.assertEqual(recovered["activeSessionCount"], 1)
        self.assertTrue(headers.get("Set-Cookie"))
        replacement_recovery_key = recovered["oneTimeRecoveryKey"]
        self.assertNotEqual(replacement_recovery_key, original_recovery_key)
        self.assertRegex(replacement_recovery_key, r"^ACR1-[A-Za-z0-9_-]{43}$")

        with self.app.connect() as db:
            account_id = db.execute(
                "SELECT account_id FROM accounts WHERE username = ? COLLATE NOCASE",
                (account_identifier,),
            ).fetchone()[0]
            passkeys = db.execute(
                """SELECT credential_id, active FROM account_passkey_credentials
                   WHERE account_id = ? ORDER BY created_at, credential_id""",
                (account_id,),
            ).fetchall()
            recovery_rows = db.execute(
                """SELECT key_version, key_salt, key_verifier, used_at
                   FROM account_recovery_keys WHERE account_id = ? ORDER BY key_version""",
                (account_id,),
            ).fetchall()
            sessions = db.execute(
                "SELECT COUNT(*) FROM sessions WHERE account_id = ?",
                (account_id,),
            ).fetchone()[0]
            audit = db.execute(
                """SELECT detail FROM account_security_audit
                   WHERE account_id = ? AND event_type = 'account_recovered_with_recovery_key'""",
                (account_id,),
            ).fetchall()
        active_by_credential = {row["credential_id"]: row["active"] for row in passkeys}
        self.assertEqual(active_by_credential, {original_encoded: 0, replacement_encoded: 1})
        self.assertEqual([row["key_version"] for row in recovery_rows], [1, 2])
        self.assertIsNotNone(recovery_rows[0]["used_at"])
        self.assertIsNone(recovery_rows[1]["used_at"])
        self.assertEqual(len(bytes(recovery_rows[1]["key_salt"])), 16)
        self.assertEqual(len(bytes(recovery_rows[1]["key_verifier"])), 32)
        self.assertNotEqual(original_recovery_key.encode(), bytes(recovery_rows[0]["key_verifier"]))
        self.assertNotEqual(replacement_recovery_key.encode(), bytes(recovery_rows[1]["key_verifier"]))
        self.assertEqual(sessions, 1)
        self.assertEqual(len(audit), 1)
        self.assertNotIn(original_recovery_key, audit[0]["detail"])
        self.assertNotIn(replacement_recovery_key, audit[0]["detail"])

        # The old key is consumed and cannot start another recovery.
        status, old_key_result, _ = self.request(
            "/api/account/recovery/options",
            {
                "accountIdentifier": account_identifier,
                "recoveryKey": original_recovery_key,
            },
            opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor()),
        )
        self.assertEqual(status, 401, old_key_result)

        # A recovery challenge is one-use, even when its old key has been rotated.
        status, replay, _ = self.request(
            "/api/account/recovery/complete",
            {
                "challengeId": recovery_options["challengeId"],
                "credential": {
                    "id": replacement_encoded,
                    "rawId": replacement_encoded,
                    "type": "public-key",
                    "response": {"transports": ["internal"]},
                },
            },
            opener=recovery_client,
        )
        self.assertEqual(status, 410, replay)

        # The newly issued recovery key starts a fresh one-use ceremony.
        status, next_options, _ = self.request(
            "/api/account/recovery/options",
            {
                "accountIdentifier": account_identifier,
                "recoveryKey": replacement_recovery_key,
            },
            opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor()),
        )
        self.assertEqual(status, 200, next_options)

    def test_recovery_key_must_be_present_and_is_not_a_login_token(self):
        status, missing, _ = self.request(
            "/api/account/recovery/options",
            {"accountIdentifier": "AC-0123456789", "recoveryKey": ""},
        )
        self.assertEqual(status, 401, missing)
        self.assertIn("could not be started", missing["error"].lower())
        status, legacy, _ = self.request(
            "/api/account/login",
            {"recoveryKey": "ACR1-" + "A" * 43},
        )
        self.assertEqual(status, 410, legacy)

    def test_user_handle_mismatch_rejects_passkey_login(self):
        status, options, _ = self.registration_options()
        raw_id = b"credential-with-wrong-handle"
        encoded_id = b64url(raw_id)
        fake_registration = SimpleNamespace(
            credential_id=raw_id,
            credential_public_key=b"public-key",
            sign_count=0,
            credential_device_type=SimpleNamespace(value="single_device"),
            credential_backed_up=False,
        )
        self.app.passkey_auth_service.verify_registration = lambda **_kwargs: fake_registration
        status, _, _ = self.request(
            "/api/passkeys/register/verify",
            {
                "challengeId": options["challengeId"],
                "credential": {
                    "id": encoded_id, "rawId": encoded_id, "type": "public-key",
                    "response": {"transports": []},
                },
            },
        )
        self.assertEqual(status, 201)

        status, auth_options, _ = self.request("/api/passkeys/authentication/options", {})
        fake_authentication = SimpleNamespace(
            credential_id=raw_id,
            new_sign_count=1,
            credential_device_type=SimpleNamespace(value="single_device"),
            credential_backed_up=False,
            user_verified=True,
        )
        self.app.passkey_auth_service.verify_authentication = lambda **_kwargs: fake_authentication
        status, result, _ = self.request(
            "/api/passkeys/authentication/verify",
            {
                "challengeId": auth_options["challengeId"],
                "credential": {
                    "id": encoded_id, "rawId": encoded_id, "type": "public-key",
                    "response": {"userHandle": b64url(uuid.uuid4().bytes)},
                },
            },
        )
        self.assertEqual(status, 401, result)
        with self.app.connect() as db:
            self.assertEqual(db.execute("SELECT COUNT(*) FROM sessions").fetchone()[0], 1)


if __name__ == "__main__":
    unittest.main()
