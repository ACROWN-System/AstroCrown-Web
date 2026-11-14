import fnmatch
import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


class WorkflowCoverageTests(unittest.TestCase):
    def test_health_suite_runs_for_all_workflow_file_changes(self):
        workflow = (
            ROOT / ".github/workflows/nova_health_tests.yml"
        ).read_text(encoding="utf-8")
        push = workflow.split("push:", 1)[1].split("pull_request:", 1)[0]

        self.assertIn("'NOVA/**'", push)
        self.assertIn("'.github/workflows/**'", push)
        self.assertIn("pull_request:", workflow)

    def test_manual_cloudflare_smoke_uses_documented_json_mode_candidate(self):
        workflow = (
            ROOT / ".github/workflows/nova_cloudflare_smoke_test.yml"
        ).read_text(encoding="utf-8")

        self.assertIn("workflow_dispatch:", workflow)
        self.assertNotIn("  push:", workflow)
        self.assertIn("@cf/meta/llama-3.1-8b-instruct-fast", workflow)
        self.assertNotIn("@cf/zai-org/glm-4.7-flash", workflow)
        self.assertIn('"type": "json_schema"', workflow)
        self.assertIn('"additionalProperties": False', workflow)
        self.assertIn('health.get("nova_health") != "OK"', workflow)
        self.assertIn('health.get("ack") != "NOVA_HEALTH_PROBE"', workflow)


    def test_cloudflare_roster_uses_only_live_verified_json_model(self):
        roster = json.loads((ROOT / "NOVA/roster.json").read_text(encoding="utf-8"))
        cloudflare = next(p for p in roster["providers"] if p["name"] == "cloudflare")
        model = "@cf/meta/llama-3.1-8b-instruct-fast"

        self.assertEqual(cloudflare["models"], [model])
        self.assertEqual(cloudflare["model_contracts"][model]["structured_json"], "VERIFIED")
        self.assertEqual(
            cloudflare["model_contracts"][model]["qualification_evidence"]["run_id"],
            38350563789,
        )
        self.assertEqual(
            cloudflare["model_contracts"]["@cf/zai-org/glm-4.7-flash"]["structured_json"],
            "BLOCKED_UNVERIFIED",
        )

    def test_cloudflare_smoke_workflow_is_covered_by_the_health_suite(self):
        workflow = (
            ROOT / ".github/workflows/nova_health_tests.yml"
        ).read_text(encoding="utf-8")
        push = workflow.split("push:", 1)[1].split("pull_request:", 1)[0]
        filters = [
            line.strip()[2:].strip().strip("'").strip('"')
            for line in push.splitlines()
            if line.strip().startswith("- ")
        ]

        smoke_workflow = ".github/workflows/nova_cloudflare_smoke_test.yml"
        self.assertTrue(
            any(fnmatch.fnmatchcase(smoke_workflow, pattern) for pattern in filters),
            f"Health tests do not cover {smoke_workflow}",
        )


if __name__ == "__main__":
    unittest.main()
