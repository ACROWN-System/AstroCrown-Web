"""Offline and loopback HTTP tests for the local-only wallet prototype."""
from __future__ import annotations

import http.client
import json
import sys
import threading
from pathlib import Path
import unittest
from datetime import datetime, timedelta, timezone

from eth_account import Account
from eth_account.messages import encode_defunct
from siwe import SiweMessage

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from server import (
    AuthenticationError,
    CHALLENGE_TTL,
    SESSION_TTL,
    WalletAuthService,
    build_server,
)

# Deliberately public, deterministic test-only keys. Never use them for real funds.
TEST_PRIVATE_KEY_A = "0x" + "11" * 32
TEST_PRIVATE_KEY_B = "0x" + "22" * 32
TEST_ACCOUNT_A = Account.from_key(TEST_PRIVATE_KEY_A)
TEST_ACCOUNT_B = Account.from_key(TEST_PRIVATE_KEY_B)


class WalletAuthServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.domain = "localhost:8765"
        self.uri = "http://localhost:8765/"
        self.service = WalletAuthService(self.domain, self.uri)
        self.now = datetime(2026, 10, 20, 8, 0, 0, tzinfo=timezone.utc)

    def issue(self, account=TEST_ACCOUNT_A, chain_id=1):
        return self.service.issue_challenge(account.address, chain_id, now=self.now)

    def sign(self, message: str, private_key: str = TEST_PRIVATE_KEY_A) -> str:
        encoded = Account.sign_message(
            encode_defunct(text=message), private_key=private_key
        ).signature.hex()
        return encoded if encoded.startswith("0x") else "0x" + encoded

    def test_valid_eoa_sign_in_creates_session(self):
        issued = self.issue()
        token, address = self.service.verify_signature(
            issued["message"], self.sign(issued["message"]), now=self.now
        )
        self.assertEqual(address, TEST_ACCOUNT_A.address)
        session = self.service.read_session(token, now=self.now)
        self.assertTrue(session["authenticated"])
        self.assertEqual(session["address"], TEST_ACCOUNT_A.address)

    def test_wrong_signer_is_rejected_and_challenge_consumed(self):
        issued = self.issue()
        with self.assertRaises(AuthenticationError):
            self.service.verify_signature(
                issued["message"], self.sign(issued["message"], TEST_PRIVATE_KEY_B),
                now=self.now,
            )
        with self.assertRaises(AuthenticationError):
            self.service.verify_signature(
                issued["message"], self.sign(issued["message"]), now=self.now
            )

    def test_tampered_message_is_rejected_without_authentication(self):
        issued = self.issue()
        tampered = issued["message"].replace("does not authorize a transaction", "authorizes a transaction")
        with self.assertRaises(AuthenticationError):
            self.service.verify_signature(tampered, self.sign(tampered), now=self.now)
        parsed = SiweMessage.from_message(issued["message"])
        self.assertNotIn(parsed.nonce, self.service.challenges)
        with self.assertRaises(AuthenticationError):
            self.service.verify_signature(
                issued["message"], self.sign(issued["message"], TEST_PRIVATE_KEY_A),
                now=self.now,
            )

    def test_replay_is_rejected(self):
        issued = self.issue()
        signature = self.sign(issued["message"])
        self.service.verify_signature(issued["message"], signature, now=self.now)
        with self.assertRaises(AuthenticationError):
            self.service.verify_signature(issued["message"], signature, now=self.now)

    def test_expired_challenge_is_rejected(self):
        issued = self.issue()
        too_late = self.now + CHALLENGE_TTL + timedelta(seconds=1)
        with self.assertRaises(AuthenticationError):
            self.service.verify_signature(
                issued["message"], self.sign(issued["message"]), now=too_late
            )

    def test_bad_address_and_chain_id_are_rejected(self):
        with self.assertRaises(AuthenticationError):
            self.service.issue_challenge("not-an-address", 1, now=self.now)
        for chain_id in (0, -1, True, 1.0, "1", 2**80):
            with self.subTest(chain_id=chain_id):
                with self.assertRaises(AuthenticationError):
                    self.service.issue_challenge(TEST_ACCOUNT_A.address, chain_id, now=self.now)

    def test_nonce_is_random_alphanumeric_and_eight_or_more_chars(self):
        issued = self.issue()
        parsed = SiweMessage.from_message(issued["message"])
        self.assertGreaterEqual(len(parsed.nonce), 8)
        self.assertTrue(parsed.nonce.isalnum())
        self.assertEqual(issued["nonceLength"], str(len(parsed.nonce)))

    def test_expired_session_fails_closed_and_logout_revokes(self):
        issued = self.issue()
        token, _ = self.service.verify_signature(
            issued["message"], self.sign(issued["message"]), now=self.now
        )
        self.assertTrue(self.service.read_session(token, now=self.now)["authenticated"])
        self.assertFalse(
            self.service.read_session(
                token, now=self.now + SESSION_TTL + timedelta(seconds=1)
            )["authenticated"]
        )
        issued2 = self.issue()
        token2, _ = self.service.verify_signature(
            issued2["message"], self.sign(issued2["message"]), now=self.now
        )
        self.service.revoke_session(token2)
        self.assertFalse(self.service.read_session(token2, now=self.now)["authenticated"])


class LocalHTTPTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.server = build_server(port=0)
        cls.port = cls.server.server_port
        cls.origin = cls.server.local_origin
        cls.authority = cls.server.local_host
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls) -> None:
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=2)

    def request(self, method, path, data=None, origin=None, host=None, cookie=None, content_type="application/json", fetch_site=None, omit_origin=False):
        connection = http.client.HTTPConnection("127.0.0.1", self.port, timeout=3)
        headers = {
            "Host": host or self.authority,
            "Content-Type": content_type,
        }
        if not omit_origin:
            headers["Origin"] = self.origin if origin is None else origin
        if cookie:
            headers["Cookie"] = cookie
        if fetch_site is not None:
            headers["Sec-Fetch-Site"] = fetch_site
        body = json.dumps(data).encode("utf-8") if data is not None else None
        connection.request(method, path, body=body, headers=headers)
        response = connection.getresponse()
        payload = response.read()
        result_headers = dict(response.getheaders())
        status = response.status
        connection.close()
        decoded = json.loads(payload) if result_headers.get("Content-Type", "").startswith("application/json") else payload
        return status, result_headers, decoded

    def test_host_and_origin_are_restricted(self):
        status, _, _ = self.request("POST", "/api/challenge", {"address": TEST_ACCOUNT_A.address, "chainId": 1}, origin="https://attacker.invalid")
        self.assertEqual(status, 403)
        status, _, _ = self.request("POST", "/api/challenge", {"address": TEST_ACCOUNT_A.address, "chainId": 1}, host="attacker.invalid")
        self.assertEqual(status, 403)

    def test_challenge_verify_cookie_session_and_logout(self):
        status, _, issued = self.request("POST", "/api/challenge", {"address": TEST_ACCOUNT_A.address, "chainId": 1})
        self.assertEqual(status, 200)
        message = issued["message"]
        signature = Account.sign_message(
            encode_defunct(text=message), private_key=TEST_PRIVATE_KEY_A
        ).signature.hex()
        if not signature.startswith("0x"):
            signature = "0x" + signature
        status, headers, verified = self.request(
            "POST", "/api/verify", {"message": message, "signature": signature}
        )
        self.assertEqual(status, 200)
        self.assertTrue(verified["authenticated"])
        cookie = headers["Set-Cookie"]
        self.assertIn("HttpOnly", cookie)
        self.assertIn("SameSite=Strict", cookie)
        self.assertIn("Path=/", cookie)
        self.assertNotIn(TEST_PRIVATE_KEY_A, cookie)

        status, _, session = self.request("GET", "/api/session", data=None, cookie=cookie.split(";", 1)[0])
        self.assertEqual(status, 200)
        self.assertTrue(session["authenticated"])
        status, headers, ended = self.request("POST", "/api/logout", {}, cookie=cookie.split(";", 1)[0])
        self.assertEqual(status, 200)
        self.assertFalse(ended["authenticated"])
        self.assertIn("Max-Age=0", headers["Set-Cookie"])
        status, _, session = self.request("GET", "/api/session", data=None, cookie=cookie.split(";", 1)[0])
        self.assertFalse(session["authenticated"])

    def test_direct_browser_navigation_allows_sec_fetch_site_none(self):
        status, headers, body = self.request(
            "GET", "/", data=None, fetch_site="none", omit_origin=True
        )
        self.assertEqual(status, 200)
        self.assertIn(b"LOCAL DEVELOPMENT ONLY", body)

    def test_untrusted_fetch_site_is_rejected(self):
        status, _, _ = self.request(
            "POST", "/api/challenge",
            {"address": TEST_ACCOUNT_A.address, "chainId": 1},
            fetch_site="cross-site",
        )
        self.assertEqual(status, 403)

    def test_invalid_ecdsa_signature_is_normalized_and_consumes_challenge(self):
        issued = self.server.auth_service.issue_challenge(TEST_ACCOUNT_A.address, 1)
        from siwe import SiweMessage
        nonce = SiweMessage.from_message(issued["message"]).nonce
        # A 65-byte zero signature reaches an eth-keys BadSignature exception
        # in this dependency combination; the app must return a safe rejection.
        with self.assertRaises(AuthenticationError):
            self.server.auth_service.verify_signature(issued["message"], "0x" + "00" * 65)
        self.assertNotIn(nonce, self.server.auth_service.challenges)

    def test_content_type_and_body_are_validated(self):
        status, _, _ = self.request("POST", "/api/challenge", {"address": TEST_ACCOUNT_A.address, "chainId": 1}, content_type="text/plain")
        self.assertEqual(status, 400)
        status, _, _ = self.request("POST", "/api/challenge", {"address": TEST_ACCOUNT_A.address, "chainId": 1, "extra": True})
        self.assertEqual(status, 400)

    def test_unsupported_method_is_rejected(self):
        status, _, _ = self.request("PUT", "/api/challenge", {"address": TEST_ACCOUNT_A.address, "chainId": 1})
        self.assertEqual(status, 405)

    def test_homepage_and_security_headers_are_local(self):
        status, headers, body = self.request("GET", "/", data=None)
        self.assertEqual(status, 200)
        self.assertIn(b"LOCAL DEVELOPMENT ONLY", body)
        self.assertIn("default-src 'self'", headers["Content-Security-Policy"])
        self.assertEqual(headers["X-Frame-Options"], "DENY")


if __name__ == "__main__":
    unittest.main(verbosity=2)
