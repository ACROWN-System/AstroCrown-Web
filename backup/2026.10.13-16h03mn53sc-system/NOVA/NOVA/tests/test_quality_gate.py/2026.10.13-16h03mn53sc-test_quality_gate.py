import unittest

from NOVA.quality_gate import (
    CASE_CLOSED_STATE,
    CASE_OPEN_STATE,
    close_failure_case,
    closure_decision,
    model_capability_decision,
    record_failure_case,
)


class ModelCapabilityGateTests(unittest.TestCase):
    def test_legacy_provider_without_contract_record_preserves_existing_path(self):
        decision = model_capability_decision(
            {"name": "legacy-provider"}, "model-a", "structured_json"
        )
        self.assertTrue(decision["allowed"])
        self.assertEqual(decision["status"], "LEGACY_UNDECLARED")

    def test_declared_model_is_blocked_until_capability_is_verified(self):
        provider = {
            "name": "cloudflare",
            "model_contracts": {
                "model-a": {"structured_json": "CANDIDATE"},
                "model-b": {"structured_json": "BLOCKED_UNVERIFIED"},
            },
        }
        for model in ("model-a", "model-b", "model-not-listed"):
            with self.subTest(model=model):
                decision = model_capability_decision(provider, model, "structured_json")
                self.assertFalse(decision["allowed"])
                self.assertEqual(decision["status"], "BLOCKED_CONTRACT_UNVERIFIED")

    def test_exact_verified_capability_is_allowed(self):
        decision = model_capability_decision(
            {
                "name": "cloudflare",
                "model_contracts": {"model-a": {"structured_json": "VERIFIED"}},
            },
            "model-a",
            "structured_json",
        )
        self.assertTrue(decision["allowed"])
        self.assertEqual(decision["status"], "VERIFIED")


class RootCauseClosureGateTests(unittest.TestCase):
    SHA = "1234567890abcdef1234567890abcdef12345678"

    def test_repeated_failure_joins_one_open_case_without_storing_raw_response(self):
        state = {}
        first = record_failure_case(
            state,
            source="cloudflare:model-a",
            failure_class="response_contract",
            expected_result="Structured response satisfies NOVA's schema.",
            observed_result="EMPTY_RESPONSE",
            candidate_sha=self.SHA,
            now="2026-10-13T00:00:00+00:00",
        )
        second = record_failure_case(
            state,
            source="cloudflare:model-a",
            failure_class="response_contract",
            expected_result="Structured response satisfies NOVA's schema.",
            observed_result="INVALID_JSON",
            candidate_sha=self.SHA,
            now="2026-10-13T01:00:00+00:00",
        )

        self.assertEqual(first["case_id"], second["case_id"])
        self.assertEqual(second["state"], CASE_OPEN_STATE)
        self.assertEqual(second["occurrences"], 2)
        self.assertEqual(len(state["quality_cases"]), 1)
        self.assertNotIn("raw_response", second)

    def test_incomplete_case_cannot_be_closed(self):
        decision = closure_decision({
            "expected_result": "Structured output",
            "observed_result": "Invalid JSON",
        })
        self.assertFalse(decision["allowed"])
        self.assertEqual(decision["state"], "BLOCKED")
        self.assertIn("direct_cause", decision["missing_fields"])
        self.assertIn("prevention_control", decision["missing_fields"])

    def test_wrong_commit_or_failed_regression_cannot_close_case(self):
        case = {
            "expected_result": "Valid structured output",
            "observed_result": "Invalid JSON",
            "direct_cause": "Model capability did not satisfy required response contract.",
            "systemic_cause": "Capability pairing was not gated before execution.",
            "missed_control": "No model-specific capability gate.",
            "prevention_control": "Require VERIFIED model capability before router calls.",
            "regression_test": "Unsupported model must be blocked before network request.",
            "verification_result": "PASS",
            "candidate_sha": self.SHA,
            "verified_candidate_sha": "abcdef1234567890abcdef1234567890abcdef12",
            "verified_at": "2026-10-13T01:00:00+00:00",
        }
        decision = closure_decision(case)
        self.assertFalse(decision["allowed"])
        self.assertIn("exact candidate commit", decision["reason"])

        case["verified_candidate_sha"] = self.SHA
        case["verification_result"] = "FAIL"
        decision = closure_decision(case)
        self.assertFalse(decision["allowed"])
        self.assertIn("did not pass", decision["reason"])

    def test_closure_rejects_naive_timestamps_and_unapproved_fields(self):
        base = {
            "expected_result": "Valid structured output",
            "observed_result": "JSON markers match",
            "direct_cause": "Model response didn't honor response contract.",
            "systemic_cause": "Missing model-specific capability gate.",
            "missed_control": "No capability preflight check.",
            "prevention_control": "Block all unverified structured-output models.",
            "regression_test": "Test no request for BLOCKED model.",
            "verification_result": "PASS",
            "candidate_sha": self.SHA,
            "verified_candidate_sha": self.SHA,
            "verified_at": "2026-10-13T02:00:00",
        }
        decision = closure_decision(base)
        self.assertFalse(decision["allowed"])
        self.assertIn("timezone-aware", decision["reason"])

        state = {}
        case = record_failure_case(
            state,
            source="provider:model",
            failure_class="response_contract",
            expected_result="Valid structured output",
            observed_result="EMPTY_RESPONSE",
            candidate_sha=self.SHA,
        )
        evidence = {
            "direct_cause": "Invalid content.",
            "systemic_cause": "No model-specific capability gate.",
            "missed_control": "No preflight.",
            "prevention_control": "Add verified capability metadata.",
            "regression_test": "Test unsupported models make no request.",
            "verification_result": "PASS",
            "verified_candidate_sha": self.SHA,
            "verified_at": "2026-10-13T02:00:00+00:00",
            "source": "tampered-source",
        }
        decision = close_failure_case(state, case["case_id"], evidence)
        self.assertFalse(decision["allowed"])
        self.assertEqual(case["state"], CASE_OPEN_STATE)
        self.assertEqual(case["source"], "provider:model")

    def test_only_complete_exact_commit_pass_can_close_and_recurrence_reopens(self):
        state = {}
        case = record_failure_case(
            state,
            source="cloudflare:model-a",
            failure_class="response_contract",
            expected_result="Valid structured output",
            observed_result="EMPTY_RESPONSE",
            candidate_sha=self.SHA,
            now="2026-10-13T00:00:00+00:00",
        )
        evidence = {
            "direct_cause": "The selected model did not satisfy structured JSON output.",
            "systemic_cause": "The router lacked an exact model capability gate.",
            "missed_control": "No model-specific structured-output eligibility check.",
            "prevention_control": "Require verified capability metadata before request execution.",
            "regression_test": "Assert unsupported model makes no HTTP request.",
            "verification_result": "PASS",
            "verified_candidate_sha": "abcdef1234567890abcdef1234567890abcdef12",
            "verified_at": "2026-10-13T02:00:00+00:00",
        }
        blocked = close_failure_case(state, case["case_id"], evidence)
        self.assertFalse(blocked["allowed"])
        self.assertEqual(case["state"], CASE_OPEN_STATE)

        evidence["verified_candidate_sha"] = self.SHA
        closed = close_failure_case(state, case["case_id"], evidence)
        self.assertTrue(closed["allowed"])
        self.assertEqual(case["state"], CASE_CLOSED_STATE)

        reopened = record_failure_case(
            state,
            source="cloudflare:model-a",
            failure_class="response_contract",
            expected_result="Valid structured output",
            observed_result="INVALID_JSON",
            candidate_sha=self.SHA,
            now="2026-10-13T03:00:00+00:00",
        )
        self.assertEqual(reopened["state"], CASE_OPEN_STATE)
        self.assertEqual(reopened["reopened_count"], 1)
        self.assertEqual(reopened["expected_result"], "Valid structured output")
        self.assertIn("last_verified_closure", reopened)


if __name__ == "__main__":
    unittest.main()
