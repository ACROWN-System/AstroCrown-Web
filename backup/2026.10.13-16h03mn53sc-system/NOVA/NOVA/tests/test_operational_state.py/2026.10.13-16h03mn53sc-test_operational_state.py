import json
import subprocess
import tempfile
import unittest
from pathlib import Path

from NOVA.operational_state import (
    load_operational_state,
    merge_dynamic_roster,
    publish_operational_state,
)


class OperationalStateRosterMergeTests(unittest.TestCase):
    def test_current_repository_configuration_wins_except_persisted_down_marker(self):
        repository = {
            "providers": [
                {"name": "groq", "status": "active", "models": ["new-model"],
                 "base_url": "https://new.example/api", "api_key_env": "GROQ_API_KEY_02"},
                {"name": "gemini", "status": "active", "models": ["gemini-current"]},
            ],
            "deferred_providers": [{"name": "mistral", "status": "DEFERRED"}],
        }
        persisted = {
            "providers": [
                {"name": "groq", "status": "down", "marked_down_at": "2026-10-10T10:00:00+00:00",
                 "models": ["obsolete-model"], "base_url": "https://old.example/api"},
                {"name": "gemini", "status": "active", "models": ["obsolete-gemini"]},
                {"name": "removed", "status": "down"},
            ],
            "deferred_providers": [{"name": "old-deferred"}],
        }
        result = merge_dynamic_roster(repository, persisted)
        self.assertEqual(result["providers"][0]["status"], "down")
        self.assertEqual(result["providers"][0]["marked_down_at"], "2026-10-10T10:00:00+00:00")
        self.assertEqual(result["providers"][0]["models"], ["new-model"])
        self.assertEqual(result["providers"][0]["base_url"], "https://new.example/api")
        self.assertEqual(result["providers"][0]["api_key_env"], "GROQ_API_KEY_02")
        self.assertEqual(result["providers"][1]["models"], ["gemini-current"])
        self.assertEqual(result["deferred_providers"], [{"name": "mistral", "status": "DEFERRED"}])
        self.assertEqual([p["name"] for p in result["providers"]], ["groq", "gemini"])

    def test_repository_policy_can_keep_provider_non_active(self):
        repository = {"providers": [{"name": "groq", "status": "deferred", "models": ["model"]}]}
        persisted = {"providers": [{"name": "groq", "status": "down",
                                    "marked_down_at": "2026-10-10T10:00:00+00:00"}]}
        result = merge_dynamic_roster(repository, persisted)
        self.assertEqual(result["providers"][0]["status"], "deferred")
        self.assertNotIn("marked_down_at", result["providers"][0])

    def test_removed_or_new_providers_follow_current_repository_roster(self):
        repository = {"providers": [{"name": "new-provider", "status": "active"}]}
        persisted = {"providers": [{"name": "removed-provider", "status": "down"}]}
        result = merge_dynamic_roster(repository, persisted)
        self.assertEqual(result["providers"], repository["providers"])

    def test_no_persisted_down_marker_leaves_current_status_unchanged(self):
        repository = {"providers": [{"name": "groq", "status": "active"}]}
        persisted = {"providers": [{"name": "groq", "status": "active"}]}
        self.assertEqual(merge_dynamic_roster(repository, persisted), repository)

    def test_load_and_publish_persist_only_state_files_to_the_state_branch(self):
        with tempfile.TemporaryDirectory(prefix="nova-state-test-") as temp_dir:
            workspace = Path(temp_dir) / "workspace"
            bare_origin = Path(temp_dir) / "origin.git"
            workspace.mkdir()
            (workspace / "NOVA").mkdir()
            self._git(None, "init", "--bare", str(bare_origin))
            self._git(workspace, "init", "-b", "main")
            self._git(workspace, "config", "user.name", "Operational State Test")
            self._git(workspace, "config", "user.email", "state-test@example.invalid")

            self._write_json(workspace / "NOVA/health_state.json", {"schema_version": 1, "targets": {}})
            self._write_json(
                workspace / "NOVA/roster.json",
                {"providers": [{"name": "groq", "status": "active", "models": ["model-v1"]}]},
            )
            (workspace / "README.md").write_text("main code branch\n", encoding="utf-8")
            self._git(workspace, "add", "NOVA/health_state.json", "NOVA/roster.json", "README.md")
            self._git(workspace, "commit", "-m", "initial test state")
            initial_main_sha = self._git(workspace, "rev-parse", "HEAD").stdout.strip()
            self._git(workspace, "branch", "nova-operational-state")
            self._git(workspace, "remote", "add", "origin", str(bare_origin))
            self._git(workspace, "push", "origin", "main")
            self._git(workspace, "push", "origin", "nova-operational-state")
            self._git(workspace, "fetch", "origin")

            load_operational_state(workspace, "origin/nova-operational-state")
            health_path = workspace / "NOVA/health_state.json"
            health = json.loads(health_path.read_text(encoding="utf-8"))
            health["test_probe"] = "persisted"
            self._write_json(health_path, health)
            roster_path = workspace / "NOVA/roster.json"
            roster = json.loads(roster_path.read_text(encoding="utf-8"))
            roster["providers"][0]["status"] = "down"
            roster["providers"][0]["marked_down_at"] = "2026-10-12T00:00:00+00:00"
            self._write_json(roster_path, roster)

            changed = publish_operational_state(
                workspace,
                "origin/nova-operational-state",
                "test: persist operational state",
            )
            self.assertTrue(changed)
            self.assertEqual(self._git(workspace, "rev-parse", "HEAD").stdout.strip(), initial_main_sha)
            dirty_paths = {
                line[3:] for line in self._git(workspace, "status", "--short").stdout.splitlines()
            }
            self.assertEqual(
                dirty_paths,
                {"NOVA/health_state.json", "NOVA/roster.json"},
            )
            self._git(workspace, "fetch", "origin")

            saved_health = json.loads(
                self._git(workspace, "show", "origin/nova-operational-state:NOVA/health_state.json").stdout
            )
            saved_roster = json.loads(
                self._git(workspace, "show", "origin/nova-operational-state:NOVA/roster.json").stdout
            )
            self.assertEqual(saved_health["test_probe"], "persisted")
            self.assertEqual(saved_roster["providers"][0]["status"], "down")
            changed_paths = set(self._git(
                workspace, "diff-tree", "--no-commit-id", "--name-only", "-r",
                "origin/nova-operational-state",
            ).stdout.splitlines())
            self.assertEqual(changed_paths, {"NOVA/health_state.json", "NOVA/roster.json"})
            self.assertEqual(
                self._git(workspace, "show", "main:README.md").stdout,
                "main code branch\n",
            )

    @staticmethod
    def _git(cwd, *args):
        result = subprocess.run(
            ["git", *args],
            cwd=cwd,
            text=True,
            capture_output=True,
            check=False,
        )
        if result.returncode:
            raise AssertionError(f"git {' '.join(args)} failed: {result.stderr}")
        return result

    @staticmethod
    def _write_json(path: Path, value: dict):
        path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")


if __name__ == "__main__":
    unittest.main()
