import json
import unittest

from NOVA.reasoning import validate_reasoning_payload


class ReasoningTests(unittest.TestCase):
    def test_valid_reasoning_contract(self):
        payload = {
            "significance": "HIGH",
            "affected_areas": ["github-actions"],
            "evidence": ["A published retirement notice"],
            "conclusion": "Investigate workflow compatibility.",
            "recommended_actions": ["Inspect workflows"],
            "autonomy_level": "L1_ANALYZE",
            "requires_human_gate": False,
            "confidence": 0.9,
        }
        ok, reason = validate_reasoning_payload(json.dumps(payload))
        self.assertTrue(ok)
        self.assertEqual(reason, "PASS")

    def test_invalid_reasoning_contract_is_rejected(self):
        ok, reason = validate_reasoning_payload("{}")
        self.assertFalse(ok)
        self.assertEqual(reason, "SCHEMA_FIELDS_MISMATCH")


if __name__ == "__main__":
    unittest.main()
