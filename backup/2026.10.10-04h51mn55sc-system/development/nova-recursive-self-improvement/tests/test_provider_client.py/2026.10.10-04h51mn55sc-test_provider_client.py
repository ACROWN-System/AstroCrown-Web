import json
import os
import sys
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from provider_client import ProviderConfig, ProviderError, chat_completion, list_models, validate_base_url


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/v1/models":
            body = json.dumps({"data": [{"id": "test-model", "available": True}]}).encode()
            self.send_response(200)
        else:
            body = b"{}"
            self.send_response(404)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        length = int(self.headers.get("Content-Length", "0"))
        request = json.loads(self.rfile.read(length).decode())
        if request.get("model") != "test-model":
            self.send_response(400)
            self.end_headers()
            return
        body = json.dumps({
            "choices": [{"message": {"content": '{"candidate_id":"c","baseline_commit":"b","hypothesis":"h","rationale":"r","patch":"diff"}'}}],
            "usage": {"prompt_tokens": 10, "completion_tokens": 20, "total_tokens": 30},
        }).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        return


class ProviderClientTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base_url = f"http://127.0.0.1:{cls.server.server_port}/v1"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.thread.join()

    def test_local_http_is_allowed_for_tests(self):
        validate_base_url(self.base_url)

    def test_remote_http_is_rejected(self):
        with self.assertRaises(ProviderError):
            validate_base_url("http://example.com/v1")

    def test_model_discovery_and_chat(self):
        config = ProviderConfig(self.base_url, "auto", "test-secret")
        models = list_models(config)
        self.assertEqual(models[0]["id"], "test-model")
        payload, model = chat_completion(config, [{"role": "user", "content": "test"}], 64)
        self.assertEqual(model, "test-model")
        self.assertEqual(payload["usage"]["total_tokens"], 30)

    def test_config_repr_does_not_expose_key(self):
        config = ProviderConfig(self.base_url, "test-model", "test-secret-value")
        self.assertNotIn("test-secret-value", repr(config))

    def test_key_is_required(self):
        os.environ.pop("TEST_PROVIDER_KEY", None)
        with self.assertRaises(ProviderError):
            ProviderConfig.from_environment(
                base_url_env="TEST_PROVIDER_BASE",
                model_env="TEST_PROVIDER_MODEL",
                api_key_env="TEST_PROVIDER_KEY",
                default_base_url=self.base_url,
            )


if __name__ == "__main__":
    unittest.main()
