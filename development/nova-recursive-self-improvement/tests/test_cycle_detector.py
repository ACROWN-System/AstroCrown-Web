import hashlib
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from unittest.mock import patch

import cycle_detector


def state_for(name: str) -> dict[str, str]:
    return {
        label: hashlib.sha1(f"{name}:{label}".encode("utf-8")).hexdigest()
        for label in cycle_detector.STATE_SCOPES
    }


def record(run_id: str, state: dict[str, str]) -> dict:
    return {"run_id": run_id, "head_sha": "a" * 40, "state": dict(state)}


class AnalyzeHistoryTests(unittest.TestCase):
    def test_a_b_c_d_b_reports_cycle_length_three(self):
        a, b, c, d = (state_for(name) for name in "ABCD")
        result = cycle_detector.analyze_history([
            record("101", a),
            record("102", b),
            record("103", c),
            record("104", d),
            record("105", b),
        ])
        self.assertEqual(result["status"], "REPEATED_STATE")
        self.assertTrue(result["exact_repeat"])
        self.assertEqual(result["repeat_of_run_id"], "102")
        self.assertEqual(result["cycle_length_passes"], 3)

    def test_adjacent_repeat_reports_cycle_length_one(self):
        state = state_for("A")
        result = cycle_detector.analyze_history([
            record("201", state),
            record("202", state),
        ])
        self.assertEqual(result["status"], "REPEATED_STATE")
        self.assertEqual(result["cycle_length_passes"], 1)

    def test_component_repetition_does_not_claim_full_state_repeat(self):
        a = state_for("A")
        b = state_for("B")
        c = state_for("C")
        c["rsi_engine_blob"] = a["rsi_engine_blob"]
        result = cycle_detector.analyze_history([
            record("301", a),
            record("302", b),
            record("303", c),
        ])
        self.assertEqual(result["status"], "NO_REPEAT_IN_WINDOW")
        matches = [item for item in result["component_repeats"] if item["scope"] == "rsi_engine_blob"]
        self.assertEqual(len(matches), 1)
        self.assertEqual(matches[0]["repeat_of_run_id"], "301")
        self.assertEqual(matches[0]["cycle_length_passes"], 2)

    def test_no_repeat_message_does_not_claim_improvement(self):
        result = cycle_detector.analyze_history([
            record("401", state_for("A")),
            record("402", state_for("B")),
        ])
        self.assertEqual(result["status"], "NO_REPEAT_IN_WINDOW")
        self.assertIn("not evidence", result["message"].lower())

    def test_incomplete_state_record_is_unavailable(self):
        broken = record("501", state_for("A"))
        broken["state"].pop("rsi_policy_blob")
        with self.assertRaises(cycle_detector.DiagnosticUnavailable):
            cycle_detector.analyze_history([broken])

    def test_invalid_object_id_is_unavailable(self):
        broken = record("502", state_for("A"))
        broken["state"]["rsi_policy_blob"] = "not-a-git-object-id"
        with self.assertRaises(cycle_detector.DiagnosticUnavailable):
            cycle_detector.analyze_history([broken])


class TreeExtractionTests(unittest.TestCase):
    def test_extracts_native_tree_and_blob_ids(self):
        tree = []
        for label, (path, kind) in cycle_detector.STATE_SCOPES.items():
            tree.append({
                "path": path,
                "type": kind,
                "sha": hashlib.sha1(label.encode("utf-8")).hexdigest(),
            })
        extracted = cycle_detector.extract_scope_ids({"tree": tree, "truncated": False})
        self.assertEqual(set(extracted), set(cycle_detector.STATE_SCOPES))
        self.assertEqual(len(extracted), len(cycle_detector.STATE_SCOPES))

    def test_truncated_tree_is_unavailable(self):
        with self.assertRaises(cycle_detector.DiagnosticUnavailable):
            cycle_detector.extract_scope_ids({"tree": [], "truncated": True})

    def test_missing_scope_is_unavailable(self):
        with self.assertRaises(cycle_detector.DiagnosticUnavailable):
            cycle_detector.extract_scope_ids({"tree": [], "truncated": False})

    def test_wrong_git_object_type_is_unavailable(self):
        entries = []
        for label, (path, kind) in cycle_detector.STATE_SCOPES.items():
            entries.append({
                "path": path,
                "type": "blob" if kind == "tree" else "tree",
                "sha": hashlib.sha1(label.encode("utf-8")).hexdigest(),
            })
        with self.assertRaises(cycle_detector.DiagnosticUnavailable):
            cycle_detector.extract_scope_ids({"tree": entries, "truncated": False})


class ApiHistoryTests(unittest.TestCase):
    def test_historical_tree_uses_native_git_commit_and_tree_api(self):
        state = state_for("api")
        tree_entries = []
        for label, (path, kind) in cycle_detector.STATE_SCOPES.items():
            tree_entries.append({"path": path, "type": kind, "sha": state[label]})
        responses = [
            {"tree": {"sha": "b" * 40}},
            {"sha": "b" * 40, "truncated": False, "tree": tree_entries},
        ]
        seen = []

        def fake_fetch(url, token):
            seen.append((url, token))
            return responses.pop(0)

        result = cycle_detector.historical_scope_ids(
            "owner/repo", "a" * 40, "read-only-token", fake_fetch
        )
        self.assertEqual(result, state)
        self.assertIn("/git/commits/" + "a" * 40, seen[0][0])
        self.assertIn("/git/trees/" + "b" * 40 + "?recursive=1", seen[1][0])
        self.assertTrue(all(token == "read-only-token" for _, token in seen))

    def test_recent_runs_ignores_current_pull_request_and_non_main_runs(self):
        runs = [
            {"id": 100, "head_sha": "a" * 40, "head_branch": "main", "event": "workflow_dispatch",
             "created_at": "2026-10-11T06:00:00Z", "conclusion": None},
            {"id": 99, "head_sha": "b" * 40, "head_branch": "main", "event": "workflow_dispatch",
             "created_at": "2026-10-11T05:00:00Z", "conclusion": "failure"},
            {"id": 98, "head_sha": "c" * 40, "head_branch": "main", "event": "schedule",
             "created_at": "2026-10-10T05:00:00Z", "conclusion": "failure"},
            {"id": 97, "head_sha": "d" * 40, "head_branch": "main", "event": "pull_request",
             "created_at": "2026-10-10T04:00:00Z", "conclusion": "success"},
            {"id": 96, "head_sha": "e" * 40, "head_branch": "feature", "event": "workflow_dispatch",
             "created_at": "2026-10-10T03:00:00Z", "conclusion": "success"},
        ]

        def fake_fetch(url, token):
            self.assertIn("per_page=100&branch=main", url)
            return {"workflow_runs": runs}

        result = cycle_detector.recent_prior_runs(
            "owner/repo", "token", "100", 2, fake_fetch
        )
        self.assertEqual([item["run_id"] for item in result], ["98", "99"])
        self.assertEqual([item["head_sha"] for item in result], ["c" * 40, "b" * 40])

    def test_history_api_failure_is_reported_unavailable_not_no_repeat(self):
        with patch.object(
            cycle_detector, "collect_report",
            side_effect=cycle_detector.DiagnosticUnavailable("simulated API failure"),
        ), patch.object(cycle_detector, "write_outputs") as write:
            result = cycle_detector.main([
                "--repository", "owner/repo",
                "--current-sha", "a" * 40,
                "--current-run-id", "77",
            ])
        self.assertEqual(result, 0)
        report = write.call_args.args[0]
        self.assertEqual(report["status"], "UNAVAILABLE")
        self.assertIsNone(report["exact_repeat"])

    def test_summary_explains_repeat_without_claiming_capability_quality(self):
        result = cycle_detector.analyze_history([
            record("601", state_for("A")),
            record("602", state_for("A")),
        ])
        summary = cycle_detector.render_summary(result)
        self.assertIn("Cycle length", summary)
        self.assertIn("not whether capability quality improved", summary)


if __name__ == "__main__":
    unittest.main()
