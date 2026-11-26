from __future__ import annotations

import base64
import sys
import unittest
from pathlib import Path

PROTOTYPE_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROTOTYPE_DIR))
from live_test_tunnel import basic_auth_matches, parse_quick_tunnel_url  # noqa: E402


class LiveTestTunnelValidationTests(unittest.TestCase):
    def test_accepts_plain_https_quick_tunnel(self):
        origin, hostname = parse_quick_tunnel_url("https://bright-orbit-123.trycloudflare.com")
        self.assertEqual(origin, "https://bright-orbit-123.trycloudflare.com")
        self.assertEqual(hostname, "bright-orbit-123.trycloudflare.com")

    def test_rejects_non_https_and_non_cloudflare_hosts(self):
        values = (
            "http://bright-orbit.trycloudflare.com",
            "https://example.com",
            "https://trycloudflare.com",
            "https://bright.orbit.trycloudflare.com",
        )
        for value in values:
            with self.subTest(value=value), self.assertRaises(ValueError):
                parse_quick_tunnel_url(value)

    def test_rejects_userinfo_ports_paths_queries_and_fragments(self):
        values = (
            "https://user@bright-orbit.trycloudflare.com",
            "https://bright-orbit.trycloudflare.com:443",
            "https://bright-orbit.trycloudflare.com/path",
            "https://bright-orbit.trycloudflare.com/?x=1",
            "https://bright-orbit.trycloudflare.com/#fragment",
        )
        for value in values:
            with self.subTest(value=value), self.assertRaises(ValueError):
                parse_quick_tunnel_url(value)

    def test_basic_auth_requires_the_exact_generated_code(self):
        username = "acrown-test"
        password = "disposable-test-secret"
        encoded = base64.b64encode((username + ":" + password).encode()).decode("ascii")
        self.assertTrue(basic_auth_matches("Basic " + encoded, username, password))
        self.assertFalse(basic_auth_matches("Basic " + encoded, username, "wrong"))
        self.assertFalse(basic_auth_matches("Bearer " + encoded, username, password))
        self.assertFalse(basic_auth_matches(None, username, password))
        self.assertFalse(basic_auth_matches("Basic " + encoded + "x" * 3000, username, password))


if __name__ == "__main__":
    unittest.main()
