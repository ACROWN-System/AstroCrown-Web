"""Regression tests for policy-gated provider activation."""

import json
import unittest
from pathlib import Path


NOVA_ROOT = Path(__file__).resolve().parents[1]
REPOSITORY_ROOT = NOVA_ROOT.parent


class ProviderPolicyTests(unittest.TestCase):
    def test_cerebras_is_deferred_under_current_no_payment_method_policy(self):
        roster = json.loads(
            (NOVA_ROOT / "roster.json").read_text(encoding="utf-8")
        )
        active_names = {
            item.get("name") for item in roster.get("providers", [])
        }
        self.assertNotIn("cerebras", active_names)

        deferred = {
            item.get("name"): item
            for item in roster.get("deferred_providers", [])
        }
        self.assertIn("cerebras", deferred)
        self.assertEqual(deferred["cerebras"]["status"], "DEFERRED")
        self.assertIn("payment method", deferred["cerebras"]["reason"].lower())
        self.assertTrue(deferred["cerebras"].get("requalification_gate"))

    def test_deferred_cerebras_credential_is_not_injected_into_live_llm_workflows(self):
        for workflow_name in (
            "nova_heartbeat.yml",
            "nova_probe_scheduler.yml",
        ):
            with self.subTest(workflow=workflow_name):
                workflow = (
                    REPOSITORY_ROOT / ".github" / "workflows" / workflow_name
                ).read_text(encoding="utf-8")
                self.assertNotIn("CEREBRAS_API_KEY_01", workflow)


if __name__ == "__main__":
    unittest.main()
