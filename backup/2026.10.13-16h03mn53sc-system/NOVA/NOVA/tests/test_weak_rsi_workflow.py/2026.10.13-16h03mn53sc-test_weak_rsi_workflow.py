import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


class WeakRSIWorkflowTests(unittest.TestCase):
    def test_weak_rsi_is_manual_report_only_and_read_only(self):
        workflow = (ROOT / ".github/workflows/nova-weak-rsi.yml").read_text(encoding="utf-8")
        events = workflow.split("permissions:", 1)[0]
        permissions = workflow.split("permissions:", 1)[1].split("concurrency:", 1)[0]
        self.assertIn("workflow_dispatch:", events)
        self.assertNotIn("schedule:", events)
        self.assertNotIn("pull_request:", events)
        self.assertIn("contents: read", permissions)
        self.assertNotIn("contents: write", workflow)
        self.assertNotIn("pull-requests: write", workflow)
        self.assertNotIn("actions: write", workflow)
        self.assertIn("default: NOT_APPROVED", workflow)
        self.assertIn("PASS_AFTER_REVIEW", workflow)

    def test_provider_secret_is_scoped_to_its_selected_step(self):
        workflow = (ROOT / ".github/workflows/nova-weak-rsi.yml").read_text(encoding="utf-8")
        groq = workflow.split("Run one bounded Groq Weak RSI report", 1)[1].split(
            "Run one bounded Gemini Weak RSI report", 1
        )[0]
        gemini = workflow.split("Run one bounded Gemini Weak RSI report", 1)[1].split(
            "Upload Weak RSI decision-support report", 1
        )[0]
        self.assertIn("GROQ_API_KEY_01", groq)
        self.assertNotIn("GEMINI_API_KEY_01", groq)
        self.assertIn("GEMINI_API_KEY_01", gemini)
        self.assertNotIn("GROQ_API_KEY_01", gemini)
        self.assertNotIn("GitHub_Token", workflow)
        self.assertNotIn("CEREBRAS_API_KEY_01", workflow)

    def test_astro_source_is_fetched_without_credentials_and_report_is_an_artifact(self):
        workflow = (ROOT / ".github/workflows/nova-weak-rsi.yml").read_text(encoding="utf-8")
        self.assertIn(
            "git clone --depth 1 https://github.com/ACROWN-System/AstroCrown-Web.git",
            workflow,
        )
        self.assertIn("upload-artifact", workflow)
        self.assertIn("retention-days: 30", workflow)


if __name__ == "__main__":
    unittest.main()
