import subprocess
import sys
import unittest
from unittest.mock import patch
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from rsi_engine import (
    changed_paths_from_patch,
    classify_decision,
    extract_candidate_payload,
    implementation_ready,
    load_policy,
    materialize_trusted_control_plane,
    normalize_repo_path,
    normalize_usage,
    validate_candidate_payload,
    validate_patch_content,
    validate_patch_paths,
    run_evaluator_supervised,
)


class RsiEngineTests(unittest.TestCase):
    ROOT = Path(__file__).resolve().parents[3]

    def test_supervisor_kills_process_group_and_cleans_labels_on_timeout(self):
        class FakeProcess:
            pid = 4321
            returncode = -9

            def __init__(self):
                self.communicate_calls = 0
                self.killed = False

            def communicate(self, timeout=None):
                self.communicate_calls += 1
                if self.communicate_calls == 1:
                    raise subprocess.TimeoutExpired(["python", "evaluator.py"], timeout)
                return "partial evaluator output", None

            def kill(self):
                self.killed = True

        process = FakeProcess()
        evaluation_id = "a" * 32
        with patch("rsi_engine.subprocess.Popen", return_value=process) as popen, patch(
            "rsi_engine.os.killpg"
        ) as killpg, patch(
            "rsi_engine.cleanup_evaluation_containers", return_value=True
        ) as cleanup:
            result = run_evaluator_supervised(
                ["python", "evaluator.py"],
                Path("/tmp"),
                {"PATH": "/usr/bin"},
                2,
                evaluation_id,
            )

        self.assertEqual(result["decision"], "FAIL")
        self.assertEqual(result["stage"], "candidate-execution")
        self.assertIn("timed out", result["error"])
        self.assertEqual(result["evaluator_output"], "partial evaluator output")
        self.assertTrue(popen.call_args.kwargs["start_new_session"])
        killpg.assert_called_once()
        cleanup.assert_called_once_with(evaluation_id, wait_for_late_containers=True)
        self.assertFalse(process.killed)

    def test_supervisor_blocks_when_timeout_cleanup_is_unconfirmed(self):
        class FakeProcess:
            pid = 5432
            returncode = -9

            def __init__(self):
                self.calls = 0

            def communicate(self, timeout=None):
                self.calls += 1
                if self.calls == 1:
                    raise subprocess.TimeoutExpired(["python", "evaluator.py"], timeout)
                return "partial evaluator output", None

            def kill(self):
                pass

        evaluation_id = "b" * 32
        with patch("rsi_engine.subprocess.Popen", return_value=FakeProcess()), patch(
            "rsi_engine.os.killpg"
        ), patch(
            "rsi_engine.cleanup_evaluation_containers", return_value=False
        ):
            result = run_evaluator_supervised(
                ["python", "evaluator.py"],
                Path("/tmp"),
                {"PATH": "/usr/bin"},
                2,
                evaluation_id,
            )

        self.assertEqual(result["decision"], "BLOCKED")
        self.assertEqual(result["stage"], "sandbox-cleanup")
        self.assertIn("could not be confirmed", result["error"])

    def test_supervisor_blocks_when_containers_remain_after_normal_exit(self):
        class FakeProcess:
            pid = 6543
            returncode = 0

            def communicate(self, timeout=None):
                return "complete", None

        evaluation_id = "c" * 32
        with patch("rsi_engine.subprocess.Popen", return_value=FakeProcess()), patch(
            "rsi_engine.cleanup_evaluation_containers", return_value=False
        ) as cleanup:
            result = run_evaluator_supervised(
                ["python", "evaluator.py"],
                Path("/tmp"),
                {"PATH": "/usr/bin"},
                2,
                evaluation_id,
            )

        self.assertEqual(result["decision"], "BLOCKED")
        self.assertEqual(result["stage"], "sandbox-cleanup")
        cleanup.assert_called_once_with(evaluation_id, wait_for_late_containers=True)

    def test_extract_json_candidate(self):
        payload = extract_candidate_payload(
            '{"candidate_id":"c1","hypothesis":"improve","rationale":"test","patch":"diff"}'
        )
        self.assertEqual(payload["candidate_id"], "c1")
        self.assertEqual(payload["patch"], "diff")

    def test_extract_diff_fallback(self):
        payload = extract_candidate_payload(
            """```diff
diff --git a/development/x.txt b/development/x.txt
--- a/development/x.txt
+++ b/development/x.txt
@@ -1 +1 @@
-old
+new
\`\`\`"""
        )
        self.assertIn("diff --git", payload["patch"])
        self.assertIn("--- a/development/x.txt", payload["patch"])
        self.assertIn("+++ b/development/x.txt", payload["patch"])

    def test_trusted_control_plane_is_copied_from_trusted_checkout(self):
        import tempfile
        import shutil
        import stat

        with tempfile.TemporaryDirectory(prefix="nova-control-plane-test-") as temp:
            root = Path(temp)
            trusted_dir = root / "trusted" / "development/nova-recursive-self-improvement"
            trusted_dir.mkdir(parents=True)
            candidate_dir = root / "candidate" / "development/nova-recursive-self-improvement"
            candidate_dir.mkdir(parents=True)
            filenames = (
                "evaluator.py",
                "benchmark_dispatcher.py",
                "sandbox_runtime.py",
                "rsi_policy.json",
                "benchmark_profiles.json",
            )
            for filename in filenames:
                (trusted_dir / filename).write_text(
                    f"trusted:{filename}", encoding="utf-8"
                )
                (candidate_dir / filename).write_text(
                    f"candidate-controlled:{filename}", encoding="utf-8"
                )

            control_dir = root / "trusted-control"
            copied = materialize_trusted_control_plane(root / "trusted", control_dir)
            self.assertEqual(set(copied), set(filenames))
            for filename, path in copied.items():
                self.assertEqual(
                    path.read_text(encoding="utf-8"),
                    f"trusted:{filename}",
                )
                self.assertFalse(
                    stat.S_IMODE(path.stat().st_mode) & stat.S_IWUSR,
                    f"{filename} must not be owner-writable",
                )
                self.assertNotIn(
                    "candidate-controlled",
                    path.read_text(encoding="utf-8"),
                )

    def test_retention_workflow_binds_both_verifier_calls_to_github_sha(self):
        workflow = (
            self.ROOT / ".github/workflows/nova-rsi.yml"
        ).read_text(encoding="utf-8")
        self.assertEqual(
            workflow.count('--expected-baseline "$GITHUB_SHA"'),
            2,
        )

    def test_rsi_workflow_is_restricted_to_main_ref(self):
        workflow = (
            self.ROOT / ".github/workflows/nova-rsi.yml"
        ).read_text(encoding="utf-8")
        readiness_job = workflow.split(
            "  implementation-readiness:", 1
        )[1].split("\n  budget-gate:", 1)[0]
        self.assertIn("if: github.ref == 'refs/heads/main'", readiness_job)

    def test_changed_paths_from_patch_strips_diff_prefixes_and_ignores_dev_null(self):
        patch = "\n".join(
            (
                "diff --git a/development/sample.txt b/development/sample.txt",
                "--- a/development/sample.txt\t2026-10-11",
                "+++ b/development/sample.txt\t2026-10-11",
                "@@ -1 +1 @@",
                "-old",
                "+new",
                "diff --git a/development/added.txt b/development/added.txt",
                "--- /dev/null",
                "+++ b/development/added.txt",
                "@@ -0,0 +1 @@",
                "+added",
            )
        )
        self.assertEqual(
            changed_paths_from_patch(patch),
            ["development/added.txt", "development/sample.txt"],
        )

    def test_changed_paths_preserve_unsafe_traversal_as_unsafe(self):
        patch = "\n".join(
            (
                "diff --git a/development/../.github/workflows/x.yml b/development/../.github/workflows/x.yml",
                "--- a/development/../.github/workflows/x.yml",
                "+++ b/development/../.github/workflows/x.yml",
                "@@ -1 +1 @@",
                "-old",
                "+new",
            )
        )
        self.assertTrue(
            any(path.startswith("UNSAFE_PATH:") for path in changed_paths_from_patch(patch))
        )

    def test_protected_paths_are_rejected(self):
        policy = load_policy(self.ROOT)
        errors = validate_patch_paths(
            [
                "development/nova-recursive-self-improvement/evaluator.py",
                "development/nova-ai-orchestration/example.py",
            ],
            policy,
        )
        self.assertTrue(errors)

    def test_incomplete_policy_blocks_rsi(self):
        policy = load_policy(self.ROOT)
        self.assertFalse(implementation_ready(policy))
        self.assertEqual(policy["implementation_readiness"]["status"], "INCOMPLETE")

    def test_path_traversal_is_rejected(self):
        self.assertEqual(normalize_repo_path("../../.github/workflows/x.yml"), "")
        policy = load_policy(self.ROOT)
        self.assertTrue(validate_patch_paths(["../../.github/workflows/x.yml"], policy))

    def test_candidate_contract_requires_exact_baseline(self):
        policy = load_policy(self.ROOT)
        patch = (
            "diff --git a/development/x b/development/x\\n"
            "--- a/development/x\\n"
            "+++ b/development/x\\n"
            "@@ -1 +1 @@\\n"
            "-a\\n+b\\n"
        )
        candidate = {
            "candidate_id": "c1",
            "baseline_commit": "different",
            "hypothesis": "improve",
            "rationale": "testable",
            "patch": patch,
        }
        self.assertTrue(validate_candidate_payload(candidate, "baseline", policy))
        candidate["baseline_commit"] = "baseline"
        self.assertFalse(validate_candidate_payload(candidate, "baseline", policy))

    def test_policy_defines_candidate_scope(self):
        policy = load_policy(self.ROOT)
        scope = policy["candidate_scope"]
        self.assertIn("development/", scope["allowed_prefixes"])
        self.assertIn(
            "development/nova-recursive-self-improvement/rsi_engine.py",
            scope["protected_paths"],
        )
        self.assertIn("secret", scope["forbidden_path_fragments"])
        self.assertEqual(
            policy["provider"]["default_base_url"],
            "https://inference.nosana.com/v1",
        )

    def test_secret_patterns_and_unsafe_patch_features_are_rejected(self):
        self.assertTrue(validate_patch_content("api_key = 'not-a-real-secret'"))
        self.assertTrue(validate_patch_content("GIT binary patch"))
        self.assertTrue(
            validate_patch_content(
                "rename from development/a\\nrename to development/b"
            )
        )

    def test_usage_is_normalized(self):
        usage = normalize_usage(
            {"prompt_tokens": 4000, "completion_tokens": 800, "total_tokens": 4800}
        )
        self.assertEqual(usage["total_tokens"], 4800)

    def test_usage_rejects_invalid_or_inconsistent_token_counts(self):
        invalid_cases = (
            {"prompt_tokens": -1, "completion_tokens": 10, "total_tokens": 9},
            {"prompt_tokens": True, "completion_tokens": 10, "total_tokens": 11},
            {"prompt_tokens": 1.5, "completion_tokens": 2, "total_tokens": 3},
            {"prompt_tokens": 10, "completion_tokens": 20, "total_tokens": 25},
            {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
            {"total_tokens": 0},
            {"prompt_tokens": "10", "completion_tokens": 2, "total_tokens": 12},
        )
        for raw_usage in invalid_cases:
            with self.subTest(raw_usage=raw_usage):
                self.assertIsNone(normalize_usage(raw_usage))

    def test_usage_derives_total_only_from_complete_valid_counts(self):
        usage = normalize_usage({"prompt_tokens": 100, "completion_tokens": 25})
        self.assertEqual(usage["total_tokens"], 125)
        self.assertIsNone(normalize_usage({"prompt_tokens": 100}))

    def test_missing_usage_is_not_fabricated(self):
        self.assertIsNone(normalize_usage(None))

    def test_decision_precedence(self):
        self.assertEqual(classify_decision(["PASS", "PASS"]), "PASS")
        self.assertEqual(classify_decision(["PASS", "BLOCKED"]), "BLOCKED")
        self.assertEqual(classify_decision(["BLOCKED", "FAIL"]), "FAIL")


if __name__ == "__main__":
    unittest.main()
