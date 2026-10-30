import tempfile
import unittest
import sys
from pathlib import Path

PROTOTYPE_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROTOTYPE_DIR))
from case_management import CaseError, CaseStore  # noqa: E402


class CaseManagementTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.database = Path(self.temp.name) / "cases.sqlite3"
        self.store = CaseStore(self.database)

    def tearDown(self):
        self.temp.cleanup()

    def submit(self, **overrides):
        payload = {
            "kind": "grievance",
            "topic": "account_access",
            "title": "Account access was restricted",
            "description": "I believe my account access was restricted in error and need this reviewed.",
            "administratorConcern": False,
        }
        payload.update(overrides)
        return self.store.create(payload)

    def test_independent_case_key_works_without_an_account_session(self):
        receipt = self.submit()
        self.assertRegex(receipt["referenceCode"], r"^ACR-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$")
        self.assertGreaterEqual(len(receipt["accessKey"]), 32)
        found = self.store.lookup({
            "referenceCode": receipt["referenceCode"],
            "accessKey": receipt["accessKey"],
        })
        self.assertEqual(found["status"], "triaged")
        self.assertEqual(found["accessModel"], "independent-case-key")
        self.assertEqual([e["event_type"] for e in found["events"][:2]], ["received", "automatic_triage"])

    def test_reference_alone_and_wrong_key_do_not_disclose_case(self):
        receipt = self.submit()
        for key in ("", "X" * 48):
            with self.assertRaises(CaseError) as denied:
                self.store.lookup({"referenceCode": receipt["referenceCode"], "accessKey": key})
            self.assertEqual(denied.exception.status, 403)

    def test_case_record_is_not_foreign_keyed_to_account(self):
        receipt = self.store.create({
            "kind": "grievance",
            "topic": "account_access",
            "title": "Account termination appeal",
            "description": "My account was terminated and I believe this decision was made in error.",
        }, account_id="terminated-account")
        with self.store.connect() as db:
            fk_tables = {
                row["table"] for row in db.execute("PRAGMA foreign_key_list(community_cases)")
            }
        self.assertNotIn("accounts", fk_tables)
        found = self.store.lookup({
            "referenceCode": receipt["referenceCode"],
            "accessKey": receipt["accessKey"],
        })
        self.assertEqual(found["title"], "Account termination appeal")

    def test_active_account_can_read_linked_case_without_private_key(self):
        linked = self.store.create({
            "kind": "grievance",
            "topic": "service",
            "title": "Service issue linked to account",
            "description": "This case is linked to a signed-in local test account.",
        }, account_id="linked-account")
        view = self.store.lookup_for_account(
            {"referenceCode": linked["referenceCode"]}, account_id="linked-account"
        )
        self.assertEqual(view["referenceCode"], linked["referenceCode"])
        with self.assertRaises(CaseError):
            self.store.lookup_for_account(
                {"referenceCode": linked["referenceCode"]}, account_id="another-account"
            )

    def test_submitter_can_add_information_and_reopen_a_resolved_case(self):
        receipt = self.submit()
        reference = receipt["referenceCode"]
        key = receipt["accessKey"]
        self.store.admin_action({
            "referenceCode": reference,
            "action": "set_status",
            "status": "resolved",
            "message": "The access issue was corrected after the review was completed.",
        }, actor_account_id="admin-1")
        updated = self.store.submit_message({
            "referenceCode": reference,
            "accessKey": key,
            "message": "The same access problem has happened again and needs another review.",
        })
        self.assertEqual(updated["status"], "under_review")
        self.assertTrue(any(event["event_type"] == "reopened" for event in updated["events"]))

    def test_internal_notes_are_hidden_from_submitter(self):
        receipt = self.submit()
        self.store.admin_action({
            "referenceCode": receipt["referenceCode"],
            "action": "internal_note",
            "message": "Check the session restriction event before responding.",
        }, actor_account_id="admin-1")
        public = self.store.lookup({
            "referenceCode": receipt["referenceCode"],
            "accessKey": receipt["accessKey"],
        })
        admin = self.store.admin_list()["cases"][0]
        self.assertNotIn("session restriction event", " ".join(e["message"] for e in public["events"]))
        self.assertIn("session restriction event", " ".join(e["message"] for e in admin["events"]))

    def test_administrator_concern_requires_independent_review_attestation(self):
        receipt = self.submit(administratorConcern=True)
        base = {
            "referenceCode": receipt["referenceCode"],
            "action": "public_reply",
            "message": "We have begun an independent review of the concern.",
        }
        with self.assertRaises(CaseError) as denied:
            self.store.admin_action(base, actor_account_id="admin-1")
        self.assertEqual(denied.exception.status, 403)
        approved = dict(base, independentReviewConfirmed=True)
        result = self.store.admin_action(approved, actor_account_id="admin-2")
        self.assertTrue(result["independentReviewRecorded"])

    def test_lost_case_key_can_be_recovered_after_manual_identity_review(self):
        receipt = self.submit()
        recovery = self.store.request_recovery({
            "caseReference": receipt["referenceCode"],
            "caseTitle": receipt["title"],
            "approximateDate": "31 October 2026",
            "contactMethod": "email",
            "contactValue": "verified-contact@example.test",
            "explanation": "I lost the original case access key after my account was terminated.",
        })
        status = self.store.recovery_status({
            "recoveryReference": recovery["recoveryReference"],
            "recoveryKey": recovery["recoveryKey"],
        })
        self.assertEqual(status["status"], "pending")
        with self.assertRaises(CaseError):
            self.store.admin_decide_recovery({
                "recoveryReference": recovery["recoveryReference"],
                "decision": "approve",
            }, actor_account_id="admin-1")
        decision = self.store.admin_decide_recovery({
            "recoveryReference": recovery["recoveryReference"],
            "decision": "approve",
            "manualVerificationConfirmed": True,
        }, actor_account_id="admin-1")
        new_key = decision["replacementCaseAccessKey"]
        self.assertNotEqual(new_key, receipt["accessKey"])
        with self.assertRaises(CaseError):
            self.store.lookup({
                "referenceCode": receipt["referenceCode"],
                "accessKey": receipt["accessKey"],
            })
        replacement_view = self.store.lookup({
            "referenceCode": receipt["referenceCode"],
            "accessKey": new_key,
        })
        self.assertEqual(replacement_view["referenceCode"], receipt["referenceCode"])
        self.assertEqual(
            self.store.recovery_status({
                "recoveryReference": recovery["recoveryReference"],
                "recoveryKey": recovery["recoveryKey"],
            })["status"],
            "approved",
        )

    def test_both_case_reference_and_key_can_be_recovered_by_manual_matching(self):
        receipt = self.submit()
        recovery = self.store.request_recovery({
            "caseReference": "",
            "caseTitle": receipt["title"],
            "approximateDate": receipt["case"]["createdAt"][:10],
            "contactMethod": "other",
            "contactValue": "Previously verified private contact route",
            "explanation": "I lost my case receipt and access key after losing account access.",
        })
        with self.assertRaises(CaseError):
            self.store.admin_decide_recovery({
                "recoveryReference": recovery["recoveryReference"],
                "decision": "approve",
                "manualVerificationConfirmed": True,
            }, actor_account_id="admin-1")
        decision = self.store.admin_decide_recovery({
            "recoveryReference": recovery["recoveryReference"],
            "decision": "approve",
            "manualVerificationConfirmed": True,
            "matchedCaseReference": receipt["referenceCode"],
        }, actor_account_id="admin-1")
        recovered = self.store.lookup({
            "referenceCode": receipt["referenceCode"],
            "accessKey": decision["replacementCaseAccessKey"],
        })
        self.assertEqual(recovered["title"], receipt["title"])

    def test_administrator_concern_also_requires_independent_recovery_review(self):
        receipt = self.submit(administratorConcern=True)
        recovery = self.store.request_recovery({
            "caseReference": receipt["referenceCode"],
            "caseTitle": receipt["title"],
            "approximateDate": "31 October 2026",
            "contactMethod": "other",
            "contactValue": "Previously verified private contact channel",
            "explanation": "I cannot access the independent key because I lost my case receipt.",
        })
        with self.assertRaises(CaseError) as denied:
            self.store.admin_decide_recovery({
                "recoveryReference": recovery["recoveryReference"],
                "decision": "approve",
                "manualVerificationConfirmed": True,
            }, actor_account_id="admin-1")
        self.assertEqual(denied.exception.status, 403)
        self.assertEqual(
            self.store.recovery_status({
                "recoveryReference": recovery["recoveryReference"],
                "recoveryKey": recovery["recoveryKey"],
            })["status"],
            "pending",
        )

    def test_suggestions_do_not_receive_grievance_priority(self):
        receipt = self.submit(
            kind="suggestion",
            topic="security",
            title="Add another account security option",
            description="Please consider an additional account protection and recovery option.",
        )
        self.assertEqual(receipt["case"]["priority"], "normal")
        self.assertEqual(receipt["case"]["firstUpdateExpectation"], "within 5 working days")


if __name__ == "__main__":
    unittest.main()
