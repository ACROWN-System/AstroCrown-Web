import hashlib
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from evidence_verifier import (
    EvidenceVerificationError,
    verify_applied_worktree,
    verify_evidence,
)


BASELINE = "a" * 40
CANDIDATE = "b" * 40
CHANGED_PATH = "development/sample.txt"
PATCH = "\n".join(
    (
        f"diff --git a/{CHANGED_PATH} b/{CHANGED_PATH}",
        "index 3367afdbbf91e638efe983616377c60477cc6612..7f8f011e",
        f"--- a/{CHANGED_PATH}",
        f"+++ b/{CHANGED_PATH}",
        "@@ -1 +1 @@",
        "-old",
        "+new",
    )
)
REQUIRED_RESULTS = (
    "protected-scope",
    "deletion-protection",
    "filesystem-integrity",
    "secret-leak-detection",
    "git-diff-check",
    "python-compilation",
    "rsi-unit-tests",
    "capability-benchmark",
)


def test_policy():
    return {
        "candidate_scope": {
            "allowed_prefixes": ["development/"],
            "protected_paths": ["development/protected.py"],
            "forbidden_path_fragments": [".env", "secret", ".git"],
        },
        "candidate_limits": {
            "max_patch_chars": 120000,
            "max_patch_lines": 5000,
            "max_patch_files": 20,
        },
        "budget": {
            "max_total_tokens_per_cycle": 8000,
            "max_proposer_calls_per_cycle": 1,
            "max_candidate_attempts_per_cycle": 1,
        },
        "implementation_readiness": {
            "status": "READY",
            "require_explicit_ready": True,
            "promotion_blocked_until_ready": True,
        },
    }


def build_evidence(evidence_dir, *, patch=PATCH, cycle_decision="PASS", evaluation_baseline=BASELINE):
    candidate = {
        "candidate_id": "candidate-1",
        "baseline_commit": BASELINE,
        "hypothesis": "An evidence-backed improvement.",
        "rationale": "This is a deterministic verifier test.",
        "expected_improvement": "Retain exact complete records.",
        "risks": "Synthetic test only.",
        "patch": patch,
    }
    cycle = {
        "schema_version": 3,
        "baseline_commit": BASELINE,
        "decision": cycle_decision,
        "result": {
            "decision": cycle_decision,
            "candidate_commit": CANDIDATE,
        },
        "candidate": candidate,
        "proposer_usage": {
            "prompt_tokens": 100,
            "completion_tokens": 20,
            "total_tokens": 120,
        },
        "proposer_usage_verified": True,
        "budget": {
            "proposer_calls_used": 1,
            "candidate_attempts_used": 1,
        },
    }
    evaluation = {
        "schema_version": 1,
        "decision": "PASS",
        "baseline_commit": evaluation_baseline,
        "candidate_commit": CANDIDATE,
        "changed_files": [CHANGED_PATH],
        "results": [{"name": name, "status": "PASS"} for name in REQUIRED_RESULTS],
    }
    evidence_dir.mkdir(parents=True, exist_ok=True)
    (evidence_dir / "candidate.patch").write_text(patch + "\n", encoding="utf-8")
    (evidence_dir / "cycle.json").write_text(
        json.dumps(cycle, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    (evidence_dir / "evaluation.json").write_text(
        json.dumps(evaluation, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    hashes = {
        item.name: hashlib.sha256(item.read_bytes()).hexdigest()
        for item in sorted(evidence_dir.iterdir())
        if item.is_file() and item.name != "manifest.json"
    }
    (evidence_dir / "manifest.json").write_text(
        json.dumps({"schema_version": 1, "evidence_sha256": hashes}, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def refresh_manifest(evidence_dir):
    hashes = {
        item.name: hashlib.sha256(item.read_bytes()).hexdigest()
        for item in sorted(evidence_dir.iterdir())
        if item.is_file() and item.name != "manifest.json"
    }
    (evidence_dir / "manifest.json").write_text(
        json.dumps(
            {"schema_version": 1, "evidence_sha256": hashes},
            indent=2,
            sort_keys=True,
        ) + "\n",
        encoding="utf-8",
    )


def init_repo(root):
    subprocess.run(["git", "init", "-q", str(root)], check=True)
    subprocess.run(["git", "config", "user.name", "Verifier Test"], cwd=root, check=True)
    subprocess.run(["git", "config", "user.email", "verifier@example.invalid"], cwd=root, check=True)
    (root / "development").mkdir()
    (root / CHANGED_PATH).write_text("old\n", encoding="utf-8")
    subprocess.run(["git", "add", "development"], cwd=root, check=True)
    subprocess.run(["git", "commit", "-qm", "baseline"], cwd=root, check=True)


class EvidenceVerifierTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="nova-evidence-verifier-")
        self.root = Path(self.temp.name) / "repo"
        self.root.mkdir()
        self.evidence = self.root / ".rsi-evidence"
        self.policy = test_policy()
        build_evidence(self.evidence)

    def tearDown(self):
        self.temp.cleanup()

    def test_boolean_manifest_schema_version_is_rejected(self):
        manifest_path = self.evidence / "manifest.json"
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        manifest["schema_version"] = True
        manifest_path.write_text(
            json.dumps(manifest, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )
        with self.assertRaisesRegex(EvidenceVerificationError, "schema version is unsupported"):
            verify_evidence(
                self.evidence,
                self.root,
                expected_baseline=BASELINE,
                policy=self.policy,
            )

    def test_boolean_cycle_schema_version_is_rejected(self):
        cycle_path = self.evidence / "cycle.json"
        cycle = json.loads(cycle_path.read_text(encoding="utf-8"))
        cycle["schema_version"] = True
        cycle_path.write_text(json.dumps(cycle, indent=2, sort_keys=True) + "\\n", encoding="utf-8")
        refresh_manifest(self.evidence)

        with self.assertRaisesRegex(EvidenceVerificationError, "cycle evidence schema version is unsupported"):
            verify_evidence(self.evidence, self.root, expected_baseline=BASELINE, policy=self.policy)

    def test_float_evaluator_schema_version_is_rejected(self):
        evaluation_path = self.evidence / "evaluation.json"
        evaluation = json.loads(evaluation_path.read_text(encoding="utf-8"))
        evaluation["schema_version"] = 1.0
        evaluation_path.write_text(
            json.dumps(evaluation, indent=2, sort_keys=True) + "\\n",
            encoding="utf-8",
        )
        refresh_manifest(self.evidence)

        with self.assertRaisesRegex(EvidenceVerificationError, "evaluator evidence schema version is unsupported"):
            verify_evidence(self.evidence, self.root, expected_baseline=BASELINE, policy=self.policy)

    def test_evaluator_candidate_commit_must_match_cycle_candidate_commit(self):
        evaluation_path = self.evidence / "evaluation.json"
        evaluation = json.loads(evaluation_path.read_text(encoding="utf-8"))
        evaluation["candidate_commit"] = "c" * 40
        evaluation_path.write_text(
            json.dumps(evaluation, indent=2, sort_keys=True) + "\\n",
            encoding="utf-8",
        )
        refresh_manifest(self.evidence)

        with self.assertRaisesRegex(EvidenceVerificationError, "does not match the cycle candidate commit"):
            verify_evidence(self.evidence, self.root, expected_baseline=BASELINE, policy=self.policy)

    def test_valid_evidence_package_passes(self):
        result = verify_evidence(self.evidence, self.root, expected_baseline=BASELINE, policy=self.policy)
        self.assertEqual(result["status"], "PASS")
        self.assertEqual(result["candidate_changed_paths"], [CHANGED_PATH])
        self.assertEqual(result["verified_evidence_files"], 3)

    def test_modified_file_fails_manifest_hash(self):
        with (self.evidence / "candidate.patch").open("a", encoding="utf-8") as handle:
            handle.write("# altered after manifest\n")
        with self.assertRaisesRegex(EvidenceVerificationError, "hash mismatch"):
            verify_evidence(self.evidence, self.root, expected_baseline=BASELINE, policy=self.policy)

    def test_missing_and_unexpected_files_fail_closed(self):
        (self.evidence / "evaluation.json").unlink()
        with self.assertRaises(EvidenceVerificationError):
            verify_evidence(self.evidence, self.root, expected_baseline=BASELINE, policy=self.policy)

        build_evidence(self.evidence)
        (self.evidence / "unlisted.txt").write_text("unexpected", encoding="utf-8")
        with self.assertRaisesRegex(EvidenceVerificationError, "complete file inventory"):
            verify_evidence(self.evidence, self.root, expected_baseline=BASELINE, policy=self.policy)

    def test_manifest_cannot_authorize_an_extra_file(self):
        extra = self.evidence / "extra.json"
        extra.write_text('{"unexpected": true}', encoding="utf-8")
        hashes = {
            item.name: hashlib.sha256(item.read_bytes()).hexdigest()
            for item in sorted(self.evidence.iterdir())
            if item.name != "manifest.json" and item.is_file()
        }
        (self.evidence / "manifest.json").write_text(
            json.dumps({"schema_version": 1, "evidence_sha256": hashes}, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )
        with self.assertRaisesRegex(EvidenceVerificationError, "exact approved set"):
            verify_evidence(self.evidence, self.root, expected_baseline=BASELINE, policy=self.policy)

    def test_evidence_directory_symlink_is_rejected(self):
        actual = self.root / "actual-evidence"
        build_evidence(actual)
        linked = self.root / "linked-evidence"
        linked.symlink_to(actual, target_is_directory=True)
        with self.assertRaisesRegex(EvidenceVerificationError, "must not be a symlink"):
            verify_evidence(linked, self.root, expected_baseline=BASELINE, policy=self.policy)

    def test_cycle_must_record_pass(self):
        build_evidence(self.evidence, cycle_decision="FAIL")
        with self.assertRaisesRegex(EvidenceVerificationError, "does not record PASS"):
            verify_evidence(self.evidence, self.root, expected_baseline=BASELINE, policy=self.policy)

    def test_cycle_baseline_must_match_trusted_expected_baseline(self):
        with self.assertRaisesRegex(EvidenceVerificationError, "Cycle baseline does not match the trusted workflow baseline"):
            verify_evidence(
                self.evidence,
                self.root,
                expected_baseline="c" * 40,
                policy=self.policy,
            )

    def test_missing_or_invalid_expected_baseline_is_blocked(self):
        for value in (None, "short", "A" * 40):
            with self.subTest(value=value), self.assertRaisesRegex(
                EvidenceVerificationError, "Trusted expected baseline"
            ):
                verify_evidence(
                    self.evidence,
                    self.root,
                    expected_baseline=value,
                    policy=self.policy,
                )

    def test_evaluator_baseline_must_match_cycle_baseline(self):
        build_evidence(self.evidence, evaluation_baseline="c" * 40)
        with self.assertRaisesRegex(EvidenceVerificationError, "baseline does not match"):
            verify_evidence(self.evidence, self.root, expected_baseline=BASELINE, policy=self.policy)

    def test_protected_patch_path_is_rejected(self):
        protected = "development/protected.py"
        patch = "\n".join((
            f"diff --git a/{protected} b/{protected}",
            f"--- a/{protected}",
            f"+++ b/{protected}",
            "@@ -1 +1 @@",
            "-old",
            "+new",
        ))
        build_evidence(self.evidence, patch=patch)
        cycle_path = self.evidence / "cycle.json"
        cycle = json.loads(cycle_path.read_text(encoding="utf-8"))
        cycle["candidate"]["patch"] = patch
        cycle_path.write_text(json.dumps(cycle, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        evaluation_path = self.evidence / "evaluation.json"
        evaluation = json.loads(evaluation_path.read_text(encoding="utf-8"))
        evaluation["changed_files"] = [protected]
        evaluation_path.write_text(json.dumps(evaluation, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        patch_file = self.evidence / "candidate.patch"
        patch_file.write_text(patch + "\n", encoding="utf-8")
        hashes = {
            item.name: hashlib.sha256(item.read_bytes()).hexdigest()
            for item in sorted(self.evidence.iterdir())
            if item.name != "manifest.json" and item.is_file()
        }
        (self.evidence / "manifest.json").write_text(
            json.dumps({"schema_version": 1, "evidence_sha256": hashes}, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )
        with self.assertRaisesRegex(EvidenceVerificationError, "protected path validation"):
            verify_evidence(self.evidence, self.root, expected_baseline=BASELINE, policy=self.policy)

    def test_readiness_must_be_ready_to_retain_candidate(self):
        policy = test_policy()
        policy["implementation_readiness"]["status"] = "INCOMPLETE"
        with self.assertRaisesRegex(EvidenceVerificationError, "not READY"):
            verify_evidence(self.evidence, self.root, expected_baseline=BASELINE, policy=policy)

    def test_applied_worktree_paths_match_verified_patch(self):
        init_repo(self.root)
        (self.root / CHANGED_PATH).write_text("new\n", encoding="utf-8")
        (self.root / "development/new.txt").write_text("new file\n", encoding="utf-8")
        result = verify_applied_worktree(
            self.root,
            [CHANGED_PATH, "development/new.txt"],
            self.policy,
            ignored_paths=(".rsi-evidence",),
        )
        self.assertEqual(result["status"], "PASS")

    def test_applied_worktree_extra_path_is_rejected(self):
        init_repo(self.root)
        (self.root / CHANGED_PATH).write_text("new\n", encoding="utf-8")
        (self.root / "development/unexpected.txt").write_text("extra\n", encoding="utf-8")
        with self.assertRaisesRegex(EvidenceVerificationError, "differs from"):
            verify_applied_worktree(
                self.root,
                [CHANGED_PATH],
                self.policy,
                ignored_paths=(".rsi-evidence",),
            )

    def test_applied_symlink_is_rejected(self):
        init_repo(self.root)
        (self.root / "development/link.txt").symlink_to("sample.txt")
        with self.assertRaisesRegex(EvidenceVerificationError, "symlink"):
            verify_applied_worktree(
                self.root,
                ["development/link.txt"],
                self.policy,
                ignored_paths=(".rsi-evidence",),
            )


if __name__ == "__main__":
    unittest.main()
