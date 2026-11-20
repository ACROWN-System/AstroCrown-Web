from __future__ import annotations

import copy
import json
import sys
import tempfile
import unittest
from pathlib import Path

MEMORY_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(MEMORY_DIR))

from validate import _check_dag, validate_directory  # noqa: E402


TODAY = "2026-11-20"


def valid_registers():
    capability = {
        "id": "CAP-0001",
        "title": "Evidence-linked market research",
        "status": "approved",
        "created_at": TODAY,
        "updated_at": TODAY,
        "service_pillar": "research_discovery",
        "problem": "Users need to investigate events.",
        "user_benefit": "They can inspect source-backed findings.",
        "distinctive_value": "The report preserves evidence and uncertainty.",
        "stage": "next",
        "repeat_use": "Users can follow updated investigations.",
        "distribution_mechanism": "A public read-only report can be shared.",
        "dependencies": [],
        "evidence": [
            {"kind": "external_research", "reference": "SRC-0001"},
            {"kind": "owner_direction", "reference": "Owner direction 2026-11-20"},
        ],
        "risks": ["Correlation may be mistaken for causation."],
        "acceptance_criteria": ["Every material claim links to evidence."],
        "decision_ref": "DEC-0001",
        "uniqueness_claim": "not_claimed",
        "notes": "Test fixture.",
    }
    decision = {
        "id": "DEC-0001",
        "title": "Keep investigation reports evidence-linked",
        "status": "accepted",
        "created_at": TODAY,
        "updated_at": TODAY,
        "context": "Users need to inspect the basis of conclusions.",
        "decision": "Every material claim must have source evidence.",
        "rationale": "This allows readers to challenge and reproduce findings.",
        "alternatives": ["Publish unsourced summaries."],
        "consequences": ["Reports need explicit source references."],
        "if_modified": "Claims remain traceable.",
        "if_not_modified": "Unsupported narratives may be published as facts.",
        "capability_refs": ["CAP-0001"],
        "research_refs": ["SRC-0001"],
        "evidence": [{"kind": "external_research", "reference": "SRC-0001"}],
        "verification": ["The validator confirms source references resolve."],
        "owner_approval": {
            "approved": True,
            "recorded_on": TODAY,
            "basis": "Explicit owner approval for this test fixture.",
        },
        "supersedes": [],
        "notes": "Test fixture.",
    }
    research = {
        "id": "SRC-0001",
        "title": "Official source documentation",
        "status": "observed",
        "created_at": TODAY,
        "updated_at": TODAY,
        "publisher": "Example publisher",
        "source_type": "official_product_documentation",
        "source_url": "https://example.com/docs",
        "accessed_on": TODAY,
        "claim_supported": "The documentation describes the tested capability.",
        "observations": ["The page is an official product document."],
        "limitations": ["The page is not independent proof of product performance."],
        "supports_capabilities": ["CAP-0001"],
        "supports_decisions": ["DEC-0001"],
        "independent_verification": False,
        "license_note": "No licence permission is inferred from this page.",
    }
    roadmap = {
        "id": "RM-0001",
        "title": "Build evidence-linked market research",
        "status": "in_progress",
        "created_at": TODAY,
        "updated_at": TODAY,
        "priority": "next",
        "objective": "Deliver a reproducible research report.",
        "capability_refs": ["CAP-0001"],
        "decision_refs": ["DEC-0001"],
        "depends_on": [],
        "entry_gates": ["A supported data source is available."],
        "exit_criteria": ["The report is reproducible and source-linked."],
        "blockers": [],
        "evidence": [{"kind": "external_research", "reference": "SRC-0001"}],
        "notes": "Test fixture.",
    }
    return {
        "capabilities": {"schema_version": 1, "register": "capabilities", "entries": [capability]},
        "decisions": {"schema_version": 1, "register": "decisions", "entries": [decision]},
        "research": {"schema_version": 1, "register": "research", "entries": [research]},
        "roadmap": {"schema_version": 1, "register": "roadmap", "entries": [roadmap]},
    }


class ProductMemoryValidationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.documents = valid_registers()
        self.write_documents()

    def tearDown(self):
        self.temp.cleanup()

    def write_documents(self):
        for register, document in self.documents.items():
            (self.root / f"{register}.json").write_text(
                json.dumps(document, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )

    def errors(self):
        return validate_directory(self.root)

    def assert_invalid(self, fragment):
        errors = self.errors()
        self.assertTrue(errors, "expected validation failure")
        self.assertTrue(
            any(fragment.casefold() in error.casefold() for error in errors),
            f"expected {fragment!r} in errors, got: {errors}",
        )

    def test_valid_minimal_register_set_passes(self):
        self.assertEqual(self.errors(), [])

    def test_duplicate_json_object_keys_are_rejected(self):
        path = self.root / "capabilities.json"
        path.write_text(
            '{"schema_version":1,"schema_version":1,"register":"capabilities","entries":[]}',
            encoding="utf-8",
        )
        self.assert_invalid("duplicate JSON object key")

    def test_unknown_record_property_is_rejected(self):
        self.documents["capabilities"]["entries"][0]["magic_priority"] = "top"
        self.write_documents()
        self.assert_invalid("unknown fields")

    def test_duplicate_id_across_registers_is_rejected(self):
        self.documents["decisions"]["entries"][0]["id"] = "CAP-0001"
        self.write_documents()
        self.assert_invalid("duplicated across registers")

    def test_duplicate_normalized_titles_are_rejected(self):
        second = copy.deepcopy(self.documents["capabilities"]["entries"][0])
        second["id"] = "CAP-0002"
        second["title"] = "EVIDENCE linked market-research!"
        second["status"] = "candidate"
        second["decision_ref"] = None
        second["dependencies"] = []
        self.documents["capabilities"]["entries"].append(second)
        self.documents["roadmap"]["entries"][0]["capability_refs"].append("CAP-0002")
        self.write_documents()
        self.assert_invalid("duplicate normalized title")

    def test_approved_capability_requires_accepted_decision(self):
        self.documents["capabilities"]["entries"][0]["decision_ref"] = None
        self.write_documents()
        self.assert_invalid("requires an accepted decision_ref")

    def test_accepted_decision_requires_explicit_owner_approval(self):
        self.documents["decisions"]["entries"][0]["owner_approval"]["approved"] = False
        self.write_documents()
        self.assert_invalid("requires explicit owner approval")

    def test_unknown_external_source_reference_is_rejected(self):
        self.documents["capabilities"]["entries"][0]["evidence"][0]["reference"] = "SRC-9999"
        self.write_documents()
        self.assert_invalid("unresolved research reference")

    def test_orphan_research_source_is_rejected(self):
        self.documents["capabilities"]["entries"][0]["evidence"] = [
            {"kind": "owner_direction", "reference": "Owner direction"}
        ]
        self.documents["decisions"]["entries"][0]["evidence"] = [
            {"kind": "owner_direction", "reference": "Owner direction"}
        ]
        self.documents["decisions"]["entries"][0]["research_refs"] = []
        self.documents["research"]["entries"][0]["supports_capabilities"] = []
        self.documents["research"]["entries"][0]["supports_decisions"] = []
        self.documents["roadmap"]["entries"][0]["evidence"] = []
        self.write_documents()
        self.assert_invalid("orphan source")

    def test_roadmap_dependency_cycle_is_rejected(self):
        second = copy.deepcopy(self.documents["roadmap"]["entries"][0])
        second["id"] = "RM-0002"
        second["title"] = "A second research package"
        second["depends_on"] = ["RM-0001"]
        self.documents["roadmap"]["entries"][0]["depends_on"] = ["RM-0002"]
        self.documents["roadmap"]["entries"].append(second)
        self.write_documents()
        self.assert_invalid("roadmap dependencies: cycle detected")

    def test_decision_supersession_cycle_is_rejected(self):
        second = copy.deepcopy(self.documents["decisions"]["entries"][0])
        second["id"] = "DEC-0002"
        second["title"] = "Second accepted decision"
        second["supersedes"] = ["DEC-0001"]
        second["capability_refs"] = []
        second["research_refs"] = ["SRC-0001"]
        second["owner_approval"] = {
            "approved": True,
            "recorded_on": TODAY,
            "basis": "Explicit approval for the test fixture.",
        }
        self.documents["decisions"]["entries"][0]["supersedes"] = ["DEC-0002"]
        self.documents["decisions"]["entries"].append(second)
        self.documents["roadmap"]["entries"][0]["decision_refs"].append("DEC-0002")
        self.documents["research"]["entries"][0]["supports_decisions"].append("DEC-0002")
        self.write_documents()
        self.assert_invalid("decision supersession: cycle detected")

    def test_capability_dependency_cycle_is_rejected(self):
        second = copy.deepcopy(self.documents["capabilities"]["entries"][0])
        second["id"] = "CAP-0002"
        second["title"] = "A second capability"
        second["status"] = "candidate"
        second["decision_ref"] = None
        second["dependencies"] = ["CAP-0001"]
        self.documents["capabilities"]["entries"][0]["dependencies"] = ["CAP-0002"]
        self.documents["capabilities"]["entries"].append(second)
        self.documents["roadmap"]["entries"][0]["capability_refs"].append("CAP-0002")
        self.write_documents()
        self.assert_invalid("capability dependencies: cycle detected")

    def test_invalid_research_url_and_date_are_rejected(self):
        self.documents["research"]["entries"][0]["source_url"] = "javascript:alert(1)"
        self.documents["research"]["entries"][0]["accessed_on"] = "20-11-2026"
        self.write_documents()
        self.assert_invalid("valid HTTPS URL")
        self.assert_invalid("accessed_on must be ISO")

    def test_non_string_dependency_items_are_rejected_without_crashing(self):
        self.documents["capabilities"]["entries"][0]["dependencies"] = [{"bad": "item"}]
        self.write_documents()
        self.assert_invalid("items must be non-empty strings")

    def test_approved_capability_cannot_reference_a_proposed_decision(self):
        self.documents["decisions"]["entries"][0]["status"] = "proposed"
        self.documents["decisions"]["entries"][0]["owner_approval"]["approved"] = False
        self.write_documents()
        self.assert_invalid("must reference an accepted, owner-approved decision")

    def test_accepted_decision_cannot_rely_on_candidate_research(self):
        self.documents["research"]["entries"][0]["status"] = "candidate"
        self.write_documents()
        self.assert_invalid("cannot rely on candidate")

    def test_repository_evidence_must_resolve_to_an_exact_record(self):
        self.documents["decisions"]["entries"][0]["evidence"] = [
            {"kind": "repository_record", "reference": "development/MISSING.md"}
        ]
        self.write_documents()
        self.assert_invalid("does not resolve to a file")

    def test_repository_evidence_resolves_from_repository_root(self):
        source_path = self.root / "development" / "README.md"
        source_path.parent.mkdir(parents=True)
        source_path.write_text("# Valid repository evidence\n", encoding="utf-8")
        self.documents["decisions"]["entries"][0]["evidence"] = [
            {"kind": "repository_record", "reference": "development/README.md"}
        ]
        self.write_documents()
        self.assertEqual(self.errors(), [])

    def test_duplicate_research_source_url_is_rejected(self):
        second = copy.deepcopy(self.documents["research"]["entries"][0])
        second["id"] = "SRC-0002"
        second["title"] = "Second title for the same source URL"
        self.documents["research"]["entries"].append(second)
        self.write_documents()
        self.assert_invalid("duplicate research source URL")

    def test_verified_uniqueness_requires_independent_research_evidence(self):
        self.documents["capabilities"]["entries"][0]["uniqueness_claim"] = "verified"
        self.write_documents()
        self.assert_invalid("verified uniqueness claim requires")

    def test_unknown_capability_stage_is_rejected(self):
        self.documents["capabilities"]["entries"][0]["stage"] = "whenever"
        self.write_documents()
        self.assert_invalid("unsupported capability stage")

    def test_non_string_roadmap_id_fails_without_crashing(self):
        self.documents["roadmap"]["entries"][0]["id"] = ["not", "an", "id"]
        self.write_documents()
        self.assert_invalid("id must match RM-NNNN")

    def test_non_string_capability_status_fails_without_crashing(self):
        self.documents["capabilities"]["entries"][0]["status"] = ["approved"]
        self.write_documents()
        self.assert_invalid("unsupported capability status")

    def test_non_string_linked_research_status_fails_without_crashing(self):
        self.documents["research"]["entries"][0]["status"] = ["observed"]
        self.write_documents()
        self.assert_invalid("accepted decision cannot rely on candidate")

    def test_non_string_nested_evidence_reference_fails_without_crashing(self):
        self.documents["decisions"]["entries"][0]["evidence"] = [
            {"kind": "external_research", "reference": ["SRC-0001"]}
        ]
        self.write_documents()
        self.assert_invalid("reference must be a non-empty string")

    def test_malformed_repository_url_fails_without_crashing(self):
        self.documents["decisions"]["entries"][0]["evidence"] = [
            {"kind": "repository_record", "reference": "https://[::1/ACROWN-System/AstroCrown-Web/pull/1"}
        ]
        self.write_documents()
        self.assert_invalid("exact AstroCrown GitHub")

    def test_malformed_research_url_fails_without_crashing(self):
        self.documents["research"]["entries"][0]["source_url"] = "https://[::1"
        self.write_documents()
        self.assert_invalid("valid HTTPS URL")

    def test_completed_capability_requires_repository_implementation_evidence(self):
        self.documents["capabilities"]["entries"][0]["status"] = "completed"
        self.write_documents()
        self.assert_invalid("completed capability requires repository implementation evidence")

    def test_completed_roadmap_requires_repository_evidence(self):
        self.documents["roadmap"]["entries"][0]["status"] = "completed"
        self.write_documents()
        self.assert_invalid("completed roadmap item requires repository implementation or test evidence")

    def test_iterative_cycle_check_handles_long_valid_dependency_chain(self):
        nodes = {f"NODE-{index}" for index in range(1500)}
        edges = {
            f"NODE-{index}": ([f"NODE-{index - 1}"] if index > 0 else [])
            for index in range(1500)
        }
        errors = []
        _check_dag(nodes, edges, "long dependency chain", errors)
        self.assertEqual(errors, [])

    def test_candidate_cannot_be_silently_marked_approved_without_decision(self):
        cap = self.documents["capabilities"]["entries"][0]
        cap["status"] = "candidate"
        cap["decision_ref"] = None
        self.documents["decisions"]["entries"][0]["status"] = "proposed"
        self.documents["decisions"]["entries"][0]["owner_approval"]["approved"] = False
        self.write_documents()
        self.assertEqual(self.errors(), [])


if __name__ == "__main__":
    unittest.main()
