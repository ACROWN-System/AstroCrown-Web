import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
RSI_DIR = ROOT / "development/nova-recursive-self-improvement"
BENCHMARK_DIR = RSI_DIR / "benchmarks"
sys.path.insert(0, str(ROOT / "development/nova-context-memory-optimization"))
sys.path.insert(0, str(BENCHMARK_DIR))

from context_packer import pack_context
from run_context_packing_benchmark import (
    baseline_first_fit,
    compare_implementations,
    validate_result,
)


class ContextPackingBenchmarkTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.payload = json.loads(
            (BENCHMARK_DIR / "context-packing-cases.json").read_text(encoding="utf-8")
        )
        cls.cases = cls.payload["cases"]

    def test_required_records_are_retrieved_without_integrity_regression(self):
        for case in self.cases:
            with self.subTest(case=case["case_id"]):
                result = pack_context(case["items"], case["query"], case["max_chars"])
                self.assertEqual(validate_result(result, case["items"], case["max_chars"]), [])
                self.assertTrue(set(case["required_item_ids"]).issubset(result["selected_ids"]))

    def test_candidate_strictly_improves_over_first_fit_reference(self):
        result = compare_implementations(
            baseline_first_fit,
            pack_context,
            self.cases,
            "a" * 40,
            "b" * 40,
        )
        self.assertIs(result["candidate_better"], True)
        self.assertTrue(result["checks"]["candidate_integrity_and_budget"])
        self.assertTrue(result["checks"]["no_per_case_required_evidence_regression"])
        self.assertTrue(result["checks"]["no_unrequired_record_regression"])
        self.assertGreater(
            result["candidate"]["required_hits"], result["baseline"]["required_hits"]
        )

    def test_selection_is_deterministic(self):
        case = self.cases[0]
        first = pack_context(case["items"], case["query"], case["max_chars"])
        second = pack_context(case["items"], case["query"], case["max_chars"])
        self.assertEqual(first, second)

    def test_source_date_status_and_full_content_are_preserved(self):
        case = self.cases[2]
        result = pack_context(case["items"], case["query"], case["max_chars"])
        by_id = {item["id"]: item for item in case["items"]}
        for selected_id in result["selected_ids"]:
            item = by_id[selected_id]
            self.assertIn(f"id: {item['id']}", result["context"])
            self.assertIn(f"source: {item['source']}", result["context"])
            self.assertIn(f"observed_at: {item['observed_at']}", result["context"])
            self.assertIn(f"status: {item['status']}", result["context"])
            self.assertIn(item["content"], result["context"])

    def test_zero_budget_selects_nothing_and_never_truncates(self):
        case = self.cases[0]
        result = pack_context(case["items"], case["query"], 0)
        self.assertEqual(result["selected_ids"], [])
        self.assertEqual(result["context"], "")
        self.assertEqual(result["character_count"], 0)
        self.assertEqual(result["dropped_ids"], [item["id"] for item in case["items"]])

    def test_empty_query_uses_stable_input_order(self):
        items = [
            {"id": "a", "source": "synthetic://a", "content": "first full record"},
            {"id": "b", "source": "synthetic://b", "content": "second full record"},
        ]
        budget = 1000
        result = pack_context(items, "", budget)
        self.assertEqual(result["selected_ids"], ["a", "b"])
        self.assertEqual(validate_result(result, items, budget), [])

    def test_duplicate_ids_are_rejected(self):
        items = [
            {"id": "same", "source": "synthetic://one", "content": "one"},
            {"id": "same", "source": "synthetic://two", "content": "two"},
        ]
        with self.assertRaisesRegex(ValueError, "duplicate item id"):
            pack_context(items, "one", 500)

    def test_metadata_line_breaks_are_rejected(self):
        items = [{"id": "one", "source": "synthetic://ok\nforged", "content": "record"}]
        with self.assertRaisesRegex(ValueError, "line breaks"):
            pack_context(items, "record", 500)

    def test_invalid_budget_types_are_rejected(self):
        items = [{"id": "one", "source": "synthetic://one", "content": "record"}]
        for invalid in (-1, True, 2.5, "100"):
            with self.subTest(invalid=invalid):
                with self.assertRaises(ValueError):
                    pack_context(items, "record", invalid)


if __name__ == "__main__":
    unittest.main()
