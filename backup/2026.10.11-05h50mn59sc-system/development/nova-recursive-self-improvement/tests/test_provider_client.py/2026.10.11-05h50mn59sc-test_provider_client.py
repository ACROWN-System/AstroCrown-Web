import json
import os
import sys
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from provider_client import ProviderConfig, ProviderError, chat_completion, list_models, validate_base_url, _request


class Handler(BaseHTTPRequestHandler):
    redirect_authorization = []

    def do_GET(self):
        if self.path == "/redirect":
            self.send_response(302)
            self.send_header("Location", "/collect")
            self.end_headers()
            return
        if self.path == "/collect":
            self.__class__.redirect_authorization.append(self.headers.get("Authorization"))
            body = b'{"redirected": true}'
            self.send_response(200)
        elif self.path == "/v1/models":
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

    def test_local_http_is_allowed_only_with_explicit_test_opt_in(self):
        with self.assertRaises(ProviderError):
            validate_base_url(self.base_url)
        validate_base_url(self.base_url, allow_local_http=True)

    def test_remote_http_is_rejected(self):
        with self.assertRaises(ProviderError):
            validate_base_url("http://example.com/v1", allow_local_http=True)

    def test_remote_https_host_must_be_allowlisted(self):
        validate_base_url("https://inference.nosana.com/v1")
        with self.assertRaisesRegex(ProviderError, "not in the protected allowlist"):
            validate_base_url("https://attacker.example/v1")

    def test_credentials_query_and_fragment_are_rejected(self):
        for url in (
            "https://user:pass@inference.nosana.com/v1",
            "https://inference.nosana.com/v1?next=https://attacker.example",
            "https://inference.nosana.com/v1#fragment",
        ):
            with self.subTest(url=url), self.assertRaises(ProviderError):
                validate_base_url(url)

    def test_local_http_provider_config_requires_explicit_test_opt_in(self):
        with self.assertRaises(ProviderError):
            ProviderConfig(self.base_url, "test-model", "test-secret")
        ProviderConfig(
            self.base_url, "test-model", "test-secret", allow_local_http=True
        )

    def test_redirect_is_not_followed_with_bearer_credential(self):
        Handler.redirect_authorization = []
        config = ProviderConfig(
            self.base_url, "test-model", "test-secret", allow_local_http=True
        )
        origin = self.base_url.rsplit("/v1", 1)[0]
        with self.assertRaisesRegex(ProviderError, "HTTP 302"):
            _request(config, "GET", f"{origin}/redirect")
        self.assertEqual(Handler.redirect_authorization, [])

    def test_model_discovery_and_chat(self):
        config = ProviderConfig(self.base_url, "auto", "test-secret", allow_local_http=True)
        models = list_models(config)
        self.assertEqual(models[0]["id"], "test-model")
        payload, model = chat_completion(config, [{"role": "user", "content": "test"}], 64)
        self.assertEqual(model, "test-model")
        self.assertEqual(payload["usage"]["total_tokens"], 30)

    def test_config_repr_does_not_expose_key(self):
        config = ProviderConfig(
            self.base_url, "test-model", "test-secret-value", allow_local_http=True
        )
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
