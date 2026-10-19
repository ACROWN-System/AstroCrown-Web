from __future__ import annotations

import json
import tempfile
import threading
import unittest
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from development.admin.banner_backend.server import handler_for
from development.admin.banner_backend.service import initial_state


class BannerAPITests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.path = Path(self.temp.name) / "state.json"
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), handler_for(self.path))
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.base = f"http://127.0.0.1:{self.server.server_port}"

    def tearDown(self) -> None:
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)
        self.temp.cleanup()

    def request_json(self, path: str, method: str = "GET", body: dict | None = None) -> tuple[int, dict, dict]:
        payload = None if body is None else json.dumps(body).encode("utf-8")
        request = Request(
            self.base + path,
            data=payload,
            method=method,
            headers={"Content-Type": "application/json"} if payload is not None else {},
        )
        try:
            response = urlopen(request, timeout=3)
        except HTTPError as exc:
            return exc.code, json.loads(exc.read().decode("utf-8")), dict(exc.headers.items())
        with response:
            return response.status, json.loads(response.read().decode("utf-8")), dict(response.headers.items())

    def test_health_endpoint_is_explicitly_not_production_ready(self) -> None:
        status, body, headers = self.request_json("/api/health")
        self.assertEqual(status, 200)
        self.assertEqual(body["authentication"], "not-implemented")
        self.assertFalse(body["production_ready"])
        self.assertEqual(headers["Cache-Control"], "no-store")

    def test_state_read_and_write_with_revision(self) -> None:
        status, initial, _ = self.request_json("/api/state")
        self.assertEqual(status, 200)
        self.assertEqual(initial["state"], initial_state())
        new_state = initial["state"]
        new_state["banners"][0]["name"] = "Saved locally"
        status, updated, _ = self.request_json(
            "/api/state", "PUT", {"revision": initial["revision"], "state": new_state}
        )
        self.assertEqual(status, 200)
        self.assertEqual(updated["state"]["banners"][0]["name"], "Saved locally")
        status, reloaded, _ = self.request_json("/api/state")
        self.assertEqual(status, 200)
        self.assertEqual(reloaded["revision"], updated["revision"])
        self.assertEqual(reloaded["state"]["banners"][0]["name"], "Saved locally")

    def test_stale_revision_is_rejected(self) -> None:
        _, initial, _ = self.request_json("/api/state")
        new_state = initial["state"]
        new_state["banners"][0]["name"] = "first update"
        self.assertEqual(self.request_json("/api/state", "PUT", {"revision": initial["revision"], "state": new_state})[0], 200)
        new_state["banners"][0]["name"] = "stale update"
        status, body, _ = self.request_json("/api/state", "PUT", {"revision": initial["revision"], "state": new_state})
        self.assertEqual(status, 409)
        self.assertEqual(body["error"], "revision_conflict")

    def test_invalid_state_is_rejected_without_overwrite(self) -> None:
        _, initial, _ = self.request_json("/api/state")
        invalid = initial["state"]
        invalid["default_banner_id"] = "missing"
        status, body, _ = self.request_json("/api/state", "PUT", {"revision": initial["revision"], "state": invalid})
        self.assertEqual(status, 400)
        self.assertEqual(body["error"], "invalid_state")
        self.assertEqual(self.request_json("/api/state")[1]["state"], initial_state())

    def test_unexpected_host_is_rejected_and_cors_is_not_enabled(self) -> None:
        request = Request(self.base + "/api/state", headers={"Host": "attacker.example"})
        try:
            response = urlopen(request, timeout=3)
        except HTTPError as error:
            self.assertEqual(error.code, 400)
            body = json.loads(error.read().decode("utf-8"))
            self.assertEqual(body["error"], "invalid_host")
            self.assertNotIn("Access-Control-Allow-Origin", error.headers)
        else:
            response.close()
            self.fail("unexpected Host header should be rejected")

    def test_root_explains_editor_is_not_connected(self) -> None:
        status, body, _ = self.request_json("/")
        self.assertEqual(status, 200)
        self.assertIn("not connected", body["message"])
        self.assertFalse(body["production_ready"])


if __name__ == "__main__":
    unittest.main()
