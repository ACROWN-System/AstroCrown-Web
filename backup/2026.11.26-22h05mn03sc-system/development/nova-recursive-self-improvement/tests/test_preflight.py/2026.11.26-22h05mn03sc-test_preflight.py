import io
import json
import os
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from preflight import check_non_secret_configuration, run


class PreflightTests(unittest.TestCase):
    ROOT = Path(__file__).resolve().parents[3]

    def setUp(self):
        self.names = [
            "RSI_AI_BASE_URL",
            "RSI_AI_MODEL",
            "RSI_AI_COMMERCIAL_ELIGIBILITY",
            "RSI_BENCHMARK_COMMAND",
            "RSI_AI_API_KEY",
        ]
        self.previous = {name: os.environ.get(name) for name in self.names}

    def tearDown(self):
        for name, value in self.previous.items():
            if value is None:
                os.environ.pop(name, None)
            else:
                os.environ[name] = value

    def test_current_policy_is_blocked_until_ready(self):
        for name in self.names:
            os.environ.pop(name, None)
        self.assertEqual(run(self.ROOT, require_secret=True), 1)

    def test_ready_status_cannot_bypass_suspended_lifecycle_before_provider_configuration(self):
        policy = {
            "implementation_readiness": {
                "status": "READY",
                "require_explicit_ready": True,
                "promotion_blocked_until_ready": True,
            },
            "strong_rsi_safety": {"lifecycle_status": "SUSPENDED"},
        }
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            path = root / "development/nova-recursive-self-improvement/rsi_policy.json"
            path.parent.mkdir(parents=True)
            path.write_text(json.dumps(policy), encoding="utf-8")
            output = io.StringIO()
            with patch("preflight.check_non_secret_configuration", side_effect=AssertionError("must block before configuration")):
                with patch.dict(os.environ, {"TEST_RSI_PROVIDER_KEY": "must-not-be-used"}):
                    with redirect_stdout(output):
                        result = run(root, require_secret=True)

        self.assertEqual(result, 1)
        record = json.loads(output.getvalue())
        self.assertEqual(record["decision"], "BLOCKED")
        self.assertEqual(record["stage"], "implementation-readiness")
        self.assertEqual(record["lifecycle_status"], "SUSPENDED")

    def test_non_secret_configuration_requires_explicit_eligibility_and_benchmark(self):
        policy = {
            "provider": {
                "base_url_env": "RSI_AI_BASE_URL",
                "model_env": "RSI_AI_MODEL",
                "default_base_url": "https://api.groq.com/openai/v1",
                "default_model": "openai/gpt-oss-20b",
            },
            "evaluation": {
                "require_benchmark": True,
                "benchmark_command_env": "RSI_BENCHMARK_COMMAND",
            },
        }
        for name in self.names:
            os.environ.pop(name, None)
        os.environ["RSI_AI_COMMERCIAL_ELIGIBILITY"] = "PASS"
        errors = check_non_secret_configuration(self.ROOT, policy)
        self.assertTrue(any("RSI_BENCHMARK_COMMAND" in item for item in errors))

    def test_non_secret_configuration_uses_protected_model_default(self):
        policy = {
            "provider": {
                "base_url_env": "RSI_AI_BASE_URL",
                "model_env": "RSI_AI_MODEL",
                "default_base_url": "https://api.groq.com/openai/v1",
                "default_model": "openai/gpt-oss-20b",
                "allowed_hosts": ["api.groq.com"],
            },
            "evaluation": {
                "require_benchmark": False,
                "benchmark_command_env": "RSI_BENCHMARK_COMMAND",
            },
        }
        for name in self.names:
            os.environ.pop(name, None)
        os.environ["RSI_AI_COMMERCIAL_ELIGIBILITY"] = "PASS"
        self.assertEqual(check_non_secret_configuration(self.ROOT, policy), [])

    def test_preflight_blocks_unapproved_provider_hostname(self):
        policy = {
            "provider": {
                "api_key_env": "RSI_AI_API_KEY",
                "base_url_env": "RSI_AI_BASE_URL",
                "model_env": "RSI_AI_MODEL",
                "default_base_url": "https://api.groq.com/openai/v1",
                "default_model": "openai/gpt-oss-20b",
                "allowed_hosts": ["api.groq.com"],
            },
            "evaluation": {
                "require_benchmark": True,
                "benchmark_command_env": "RSI_BENCHMARK_COMMAND",
            },
        }
        for name in self.names:
            os.environ.pop(name, None)
        os.environ["RSI_AI_BASE_URL"] = "https://attacker.example/v1"
        os.environ["RSI_AI_COMMERCIAL_ELIGIBILITY"] = "PASS"
        os.environ["RSI_BENCHMARK_COMMAND"] = "python -c 'print(1)'"
        errors = check_non_secret_configuration(self.ROOT, policy)
        self.assertTrue(any("not in the protected allowlist" in item for item in errors))

    def test_preflight_reports_secret_boundary_without_logging_value(self):
        for name in self.names:
            os.environ.pop(name, None)
        os.environ["RSI_AI_COMMERCIAL_ELIGIBILITY"] = "PASS"
        os.environ["RSI_BENCHMARK_COMMAND"] = "python -c 'print(1)'"
        policy = {
            "provider": {
                "api_key_env": "RSI_AI_API_KEY",
                "base_url_env": "RSI_AI_BASE_URL",
                "model_env": "RSI_AI_MODEL",
                "default_base_url": "https://api.groq.com/openai/v1",
                "default_model": "openai/gpt-oss-20b",
            },
            "evaluation": {
                "require_benchmark": True,
                "benchmark_command_env": "RSI_BENCHMARK_COMMAND",
            },
            "implementation_readiness": {
                "status": "READY",
                "require_explicit_ready": True,
                "promotion_blocked_until_ready": True,
            },
            "strong_rsi_safety": {"lifecycle_status": "ACTIVE"},
        }
        root = Path(tempfile.mkdtemp())
        try:
            path = root / "development/nova-recursive-self-improvement/rsi_policy.json"
            path.parent.mkdir(parents=True)
            path.write_text(json.dumps(policy), encoding="utf-8")
            self.assertEqual(run(root, require_secret=True), 2)
        finally:
            import shutil
            shutil.rmtree(root, ignore_errors=True)


if __name__ == "__main__":
    unittest.main()
