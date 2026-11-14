"""Local grievance, suggestion and case-access workflows.

Development prototype only. Cases deliberately have no foreign-key dependency
on accounts. An account being restricted, closed or deleted must not cascade-
delete a user's case or invalidate independent case-key access.
"""
from __future__ import annotations

import hashlib
import hmac
import re
import secrets
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path


class CaseError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status
        self.message = message


KINDS = {"grievance", "suggestion"}
TOPICS = {
    "account_access", "case_access", "security", "privacy", "technical",
    "data_accuracy", "service", "other",
}
STATUSES = {
    "received", "triaged", "under_review", "awaiting_user",
    "awaiting_external", "resolved", "declined",
}
ADMIN_STATUSES = STATUSES - {"received"}
REFERENCE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _clean_text(value: object, field: str, minimum: int, maximum: int) -> str:
    if not isinstance(value, str):
        raise CaseError(400, field + " must be text.")
    cleaned = "".join(
        character for character in value
        if character in "\n\t" or (ord(character) >= 32 and ord(character) != 127)
    ).strip()
    if len(cleaned) < minimum or len(cleaned) > maximum:
        raise CaseError(400, field + " must contain between " + str(minimum) + " and " + str(maximum) + " characters.")
    return cleaned


def _key_hash(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _valid_reference(value: object, prefix: str = "ACR") -> str:
    if not isinstance(value, str):
        raise CaseError(400, "Enter the reference code.")
    normalized = value.strip().upper()
    expected = prefix + r"-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}"
    if not re.fullmatch(expected, normalized):
        raise CaseError(400, "The reference-code format is not valid.")
    return normalized


def _new_reference(prefix: str) -> str:
    def group() -> str:
        return "".join(secrets.choice(REFERENCE_ALPHABET) for _ in range(4))
    return prefix + "-" + group() + "-" + group()


class CaseStore:
    """Case records share the prototype DB, not the account-session lifecycle."""

    def __init__(self, database_path: Path | str):
        self.database_path = Path(database_path).expanduser().resolve()
        self.initialize()

    def connect(self) -> sqlite3.Connection:
        db = sqlite3.connect(str(self.database_path), timeout=10)
        db.row_factory = sqlite3.Row
        return db

    def initialize(self) -> None:
        with self.connect() as db:
            db.executescript(
                """
                CREATE TABLE IF NOT EXISTS community_cases (
                    case_id TEXT PRIMARY KEY,
                    reference_code TEXT NOT NULL UNIQUE,
                    account_id TEXT,
                    kind TEXT NOT NULL CHECK(kind IN ('grievance', 'suggestion')),
                    topic TEXT NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT NOT NULL,
                    priority TEXT NOT NULL CHECK(priority IN ('normal', 'high', 'urgent')),
                    status TEXT NOT NULL,
                    administrator_concern INTEGER NOT NULL DEFAULT 0,
                    independent_review_recorded INTEGER NOT NULL DEFAULT 0,
                    access_key_hash TEXT NOT NULL,
                    first_update_expectation TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS community_cases_account_idx
                    ON community_cases(account_id, created_at DESC);
                CREATE INDEX IF NOT EXISTS community_cases_queue_idx
                    ON community_cases(status, priority, created_at);
                CREATE TABLE IF NOT EXISTS community_case_events (
                    event_id TEXT PRIMARY KEY,
                    case_id TEXT NOT NULL REFERENCES community_cases(case_id) ON DELETE CASCADE,
                    event_type TEXT NOT NULL,
                    actor_kind TEXT NOT NULL CHECK(actor_kind IN ('system', 'submitter', 'administrator')),
                    actor_id TEXT,
                    visibility TEXT NOT NULL CHECK(visibility IN ('public', 'internal')),
                    message TEXT NOT NULL,
                    status TEXT,
                    created_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS community_case_events_case_idx
                    ON community_case_events(case_id, created_at);
                CREATE TABLE IF NOT EXISTS community_case_recoveries (
                    recovery_id TEXT PRIMARY KEY,
                    recovery_reference TEXT NOT NULL UNIQUE,
                    case_id TEXT REFERENCES community_cases(case_id) ON DELETE CASCADE,
                    case_reference_hint TEXT NOT NULL DEFAULT '',
                    case_title_hint TEXT NOT NULL DEFAULT '',
                    approximate_date TEXT NOT NULL DEFAULT '',
                    contact_method TEXT NOT NULL,
                    contact_value TEXT NOT NULL,
                    explanation TEXT NOT NULL,
                    recovery_key_hash TEXT NOT NULL,
                    status TEXT NOT NULL CHECK(status IN ('pending', 'approved', 'declined')),
                    reviewed_by TEXT,
                    reviewed_at TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS community_case_recoveries_queue_idx
                    ON community_case_recoveries(status, created_at);
                """
            )

    @staticmethod
    def _summary(row: sqlite3.Row) -> dict:
        return {
            "referenceCode": row["reference_code"],
            "kind": row["kind"],
            "topic": row["topic"],
            "title": row["title"],
            "description": row["description"],
            "priority": row["priority"],
            "status": row["status"],
            "administratorConcern": bool(row["administrator_concern"]),
            "independentReviewRecorded": bool(row["independent_review_recorded"]),
            "firstUpdateExpectation": row["first_update_expectation"],
            "createdAt": row["created_at"],
            "updatedAt": row["updated_at"],
        }

    def _event(
        self, db: sqlite3.Connection, case_id: str, event_type: str,
        actor_kind: str, actor_id: str | None, visibility: str,
        message: str, status: str | None = None,
    ) -> None:
        db.execute(
            """INSERT INTO community_case_events(
                   event_id, case_id, event_type, actor_kind, actor_id,
                   visibility, message, status, created_at
               ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                str(uuid.uuid4()), case_id, event_type, actor_kind, actor_id,
                visibility, message, status, utc_iso(),
            ),
        )

    def _find_by_reference(self, reference: object, prefix: str = "ACR") -> sqlite3.Row:
        normalized = _valid_reference(reference, prefix)
        if prefix == "ACR":
            table, column = "community_cases", "reference_code"
        elif prefix == "ACRR":
            table, column = "community_case_recoveries", "recovery_reference"
        else:
            raise CaseError(400, "The reference-code type is not supported.")
        with self.connect() as db:
            row = db.execute(
                "SELECT * FROM " + table + " WHERE " + column + " = ?",
                (normalized,),
            ).fetchone()
        if row is None:
            raise CaseError(404, "The record could not be found with those details.")
        return row

    @staticmethod
    def _verify_key(stored_hash: str, value: object, error_message: str) -> None:
        if not isinstance(value, str) or len(value) < 32 or len(value) > 160:
            raise CaseError(403, error_message)
        if not hmac.compare_digest(stored_hash, _key_hash(value)):
            raise CaseError(403, error_message)

    def _events(self, case_id: str, include_internal: bool = False) -> list[dict]:
        with self.connect() as db:
            if include_internal:
                rows = db.execute(
                    """SELECT event_type, actor_kind, visibility, message, status, created_at
                       FROM community_case_events WHERE case_id = ? ORDER BY rowid""",
                    (case_id,),
                ).fetchall()
            else:
                rows = db.execute(
                    """SELECT event_type, actor_kind, visibility, message, status, created_at
                       FROM community_case_events WHERE case_id = ? AND visibility = 'public'
                       ORDER BY rowid""",
                    (case_id,),
                ).fetchall()
        return [dict(row) for row in rows]

    def _public_case(self, row: sqlite3.Row) -> dict:
        result = self._summary(row)
        result["events"] = self._events(row["case_id"])
        result["accessModel"] = "independent-case-key"
        return result

    def create(self, payload: dict, account_id: str | None = None) -> dict:
        allowed = {"kind", "topic", "title", "description", "administratorConcern"}
        if not isinstance(payload, dict) or set(payload) - allowed:
            raise CaseError(400, "The submission contains unsupported fields.")
        kind = payload.get("kind")
        topic = payload.get("topic")
        if not isinstance(kind, str) or kind not in KINDS:
            raise CaseError(400, "Choose grievance or suggestion.")
        if not isinstance(topic, str) or topic not in TOPICS:
            raise CaseError(400, "Choose a valid submission topic.")
        title = _clean_text(payload.get("title"), "Title", 6, 160)
        description = _clean_text(payload.get("description"), "Description", 20, 7000)
        administrator_concern = payload.get("administratorConcern", False)
        if not isinstance(administrator_concern, bool):
            raise CaseError(400, "The administrator-concern option must be true or false.")
        if administrator_concern and kind != "grievance":
            raise CaseError(400, "Administrator-concern review is available for grievances, not suggestions.")

        # Deterministic intake only. No AI or external provider receives case contents.
        priority = "normal"
        if kind == "grievance" and (
            topic in {"account_access", "case_access", "security", "privacy"} or administrator_concern
        ):
            priority = "high"
        expectation = "within 2 working days" if priority == "high" else "within 5 working days"
        case_id = str(uuid.uuid4())
        reference = _new_reference("ACR")
        access_key = secrets.token_urlsafe(32)
        now = utc_iso()
        acknowledgement = (
            "Your submission has been received and recorded. An automatic intake check has "
            "classified it as a " + kind + " about " + topic.replace("_", " ") +
            " and placed it in the " + priority + "-priority review queue. "
            "The current target for the first substantive status update is " + expectation +
            ". This is an indicative target, not a guaranteed resolution date. "
            "Updates are available in this case portal; this development prototype does not send email."
        )
        with self.connect() as db:
            for _attempt in range(5):
                try:
                    db.execute(
                        """INSERT INTO community_cases(
                               case_id, reference_code, account_id, kind, topic, title,
                               description, priority, status, administrator_concern,
                               access_key_hash, first_update_expectation, created_at, updated_at
                           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'triaged', ?, ?, ?, ?, ?)""",
                        (
                            case_id, reference, account_id, kind, topic, title, description,
                            priority, int(administrator_concern), _key_hash(access_key),
                            expectation, now, now,
                        ),
                    )
                    break
                except sqlite3.IntegrityError:
                    reference = _new_reference("ACR")
            else:
                raise CaseError(503, "A unique case reference could not be generated. Please submit again.")
            self._event(
                db, case_id, "received", "system", None, "public",
                "Receipt confirmed. Your submission is recorded in the case system.", "received",
            )
            self._event(
                db, case_id, "automatic_triage", "system", None, "public",
                acknowledgement, "triaged",
            )
        case = self.lookup({"referenceCode": reference, "accessKey": access_key})
        return {
            "case": case,
            "referenceCode": reference,
            "accessKey": access_key,
            "message": "Case received. Save the reference and private access key; the key is shown only at creation.",
        }

    def lookup(self, payload: dict) -> dict:
        if not isinstance(payload, dict) or set(payload) != {"referenceCode", "accessKey"}:
            raise CaseError(400, "Enter both the case reference and private access key.")
        row = self._find_by_reference(payload.get("referenceCode"))
        self._verify_key(
            row["access_key_hash"], payload.get("accessKey"),
            "The case reference or private access key is incorrect.",
        )
        return self._public_case(row)

    def lookup_for_account(self, payload: dict, account_id: str) -> dict:
        if not isinstance(payload, dict) or set(payload) != {"referenceCode"}:
            raise CaseError(400, "Enter the case reference.")
        row = self._find_by_reference(payload.get("referenceCode"))
        if not row["account_id"] or not hmac.compare_digest(row["account_id"], account_id):
            raise CaseError(404, "The case could not be found for this account.")
        return self._public_case(row)

    def list_for_account(self, account_id: str) -> dict:
        with self.connect() as db:
            rows = db.execute(
                """SELECT * FROM community_cases WHERE account_id = ?
                   ORDER BY updated_at DESC LIMIT 100""",
                (account_id,),
            ).fetchall()
        return {"cases": [self._summary(row) for row in rows]}

    def _append_submitter_message(self, row: sqlite3.Row, message: object) -> dict:
        clean = _clean_text(message, "Message", 3, 5000)
        new_status = row["status"]
        if new_status in {"resolved", "declined", "awaiting_user"}:
            new_status = "under_review"
        now = utc_iso()
        with self.connect() as db:
            db.execute(
                "UPDATE community_cases SET status = ?, updated_at = ? WHERE case_id = ?",
                (new_status, now, row["case_id"]),
            )
            self._event(
                db, row["case_id"], "submitter_message", "submitter", None, "public",
                clean, new_status,
            )
            if new_status != row["status"]:
                self._event(
                    db, row["case_id"], "reopened", "system", None, "public",
                    "Your additional information has been recorded and the case is back in review.",
                    new_status,
                )
        with self.connect() as db:
            updated = db.execute(
                "SELECT * FROM community_cases WHERE case_id = ?",
                (row["case_id"],),
            ).fetchone()
        return self._public_case(updated)

    def submit_message(self, payload: dict) -> dict:
        if not isinstance(payload, dict) or set(payload) != {"referenceCode", "accessKey", "message"}:
            raise CaseError(400, "Enter the case reference, private access key and message.")
        row = self._find_by_reference(payload.get("referenceCode"))
        self._verify_key(
            row["access_key_hash"], payload.get("accessKey"),
            "The case reference or private access key is incorrect.",
        )
        return self._append_submitter_message(row, payload.get("message"))

    def submit_message_for_account(self, payload: dict, account_id: str) -> dict:
        if not isinstance(payload, dict) or set(payload) != {"referenceCode", "message"}:
            raise CaseError(400, "Enter the case reference and message.")
        row = self._find_by_reference(payload.get("referenceCode"))
        if not row["account_id"] or not hmac.compare_digest(row["account_id"], account_id):
            raise CaseError(404, "The case could not be found for this account.")
        return self._append_submitter_message(row, payload.get("message"))

    def admin_list(self) -> dict:
        with self.connect() as db:
            rows = db.execute(
                """SELECT * FROM community_cases
                   ORDER BY CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 ELSE 2 END,
                            created_at ASC LIMIT 250"""
            ).fetchall()
            recoveries = db.execute(
                """SELECT r.recovery_reference, r.case_id, c.reference_code,
                          r.case_reference_hint, r.case_title_hint, r.approximate_date,
                          r.contact_method, r.contact_value, r.explanation,
                          r.status, r.created_at, r.updated_at,
                          c.administrator_concern
                   FROM community_case_recoveries r
                   LEFT JOIN community_cases c ON c.case_id = r.case_id
                   WHERE r.status = 'pending'
                   ORDER BY r.created_at ASC LIMIT 100"""
            ).fetchall()
        cases = []
        for row in rows:
            item = self._summary(row)
            item["caseId"] = row["case_id"]
            item["events"] = self._events(row["case_id"], include_internal=True)
            cases.append(item)
        return {"cases": cases, "recoveries": [dict(row) for row in recoveries]}

    def admin_action(self, payload: dict, actor_account_id: str) -> dict:
        allowed = {
            "referenceCode", "action", "message", "status",
            "independentReviewConfirmed",
        }
        if not isinstance(payload, dict) or set(payload) - allowed:
            raise CaseError(400, "The administrator action contains unsupported fields.")
        row = self._find_by_reference(payload.get("referenceCode"))
        action = payload.get("action")
        message = payload.get("message", "")
        if not isinstance(action, str) or not isinstance(message, str):
            raise CaseError(400, "Choose a valid case action and message.")
        if row["administrator_concern"] and payload.get("independentReviewConfirmed") is not True:
            raise CaseError(
                403,
                "This grievance requires an administrator to confirm that they are not personally implicated before reviewing it.",
            )
        now = utc_iso()
        with self.connect() as db:
            if row["administrator_concern"] and not row["independent_review_recorded"]:
                db.execute(
                    "UPDATE community_cases SET independent_review_recorded = 1 WHERE case_id = ?",
                    (row["case_id"],),
                )
                self._event(
                    db, row["case_id"], "independent_review_attested", "administrator",
                    actor_account_id, "internal",
                    "Reviewer attested that they are not personally implicated and are acting independently.",
                    row["status"],
                )
            if action == "public_reply":
                clean = _clean_text(message, "Public reply", 3, 5000)
                self._event(
                    db, row["case_id"], "administrator_reply", "administrator",
                    actor_account_id, "public", clean, row["status"],
                )
            elif action == "internal_note":
                clean = _clean_text(message, "Internal note", 3, 5000)
                self._event(
                    db, row["case_id"], "internal_note", "administrator",
                    actor_account_id, "internal", clean, row["status"],
                )
            elif action == "set_status":
                status = payload.get("status")
                if not isinstance(status, str) or status not in ADMIN_STATUSES:
                    raise CaseError(400, "Choose a valid case status.")
                clean = _clean_text(message, "Decision explanation", 10, 3000) if status in {"resolved", "declined"} else (
                    _clean_text(message, "Status update", 3, 3000) if message.strip() else
                    "The case status was updated to " + status.replace("_", " ") + "."
                )
                self._event(
                    db, row["case_id"], "status_changed", "administrator",
                    actor_account_id, "public", clean, status,
                )
                db.execute(
                    "UPDATE community_cases SET status = ?, updated_at = ? WHERE case_id = ?",
                    (status, now, row["case_id"]),
                )
            elif action == "escalate":
                db.execute(
                    "UPDATE community_cases SET priority = 'urgent', status = 'under_review', updated_at = ? WHERE case_id = ?",
                    (now, row["case_id"]),
                )
                self._event(
                    db, row["case_id"], "escalated", "administrator",
                    actor_account_id, "public",
                    "Your case has been escalated for priority review.", "under_review",
                )
            else:
                raise CaseError(400, "That case-management action is not available.")
            if action != "set_status":
                db.execute(
                    "UPDATE community_cases SET updated_at = ? WHERE case_id = ?",
                    (now, row["case_id"]),
                )
        with self.connect() as db:
            updated = db.execute(
                "SELECT * FROM community_cases WHERE case_id = ?",
                (row["case_id"],),
            ).fetchone()
        result = self._summary(updated)
        result["events"] = self._events(row["case_id"], include_internal=True)
        return result

    def request_recovery(self, payload: dict) -> dict:
        allowed = {
            "caseReference", "caseTitle", "approximateDate",
            "contactMethod", "contactValue", "explanation",
        }
        if not isinstance(payload, dict) or set(payload) != allowed:
            raise CaseError(400, "Complete all case-access recovery fields.")
        raw_case_reference = payload.get("caseReference", "")
        if not isinstance(raw_case_reference, str):
            raise CaseError(400, "The optional case reference must be text.")
        case_reference_hint = ""
        case_id = None
        if raw_case_reference.strip():
            row = self._find_by_reference(raw_case_reference)
            case_reference_hint = row["reference_code"]
            case_id = row["case_id"]
        title_hint = _clean_text(payload.get("caseTitle"), "Case title or description", 4, 160)
        approximate_date = _clean_text(payload.get("approximateDate"), "Approximate submission date", 4, 40)
        method = payload.get("contactMethod")
        if not isinstance(method, str) or method not in {"email", "phone", "other"}:
            raise CaseError(400, "Choose a valid contact method.")
        contact_value = _clean_text(payload.get("contactValue"), "Contact detail", 5, 254)
        explanation = _clean_text(payload.get("explanation"), "Recovery explanation", 10, 2000)
        recovery_reference = _new_reference("ACRR")
        recovery_key = secrets.token_urlsafe(32)
        now = utc_iso()
        recovery_id = str(uuid.uuid4())
        with self.connect() as db:
            db.execute(
                """INSERT INTO community_case_recoveries(
                       recovery_id, recovery_reference, case_id, case_reference_hint,
                       case_title_hint, approximate_date, contact_method, contact_value,
                       explanation, recovery_key_hash, status, created_at, updated_at
                   ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)""",
                (
                    recovery_id, recovery_reference, case_id, case_reference_hint,
                    title_hint, approximate_date, method, contact_value,
                    explanation, _key_hash(recovery_key), now, now,
                ),
            )
            if case_id:
                self._event(
                    db, case_id, "access_recovery_requested", "submitter", None,
                    "internal", "A case-access recovery request was submitted and is awaiting identity review.",
                )
        return {
            "recoveryReference": recovery_reference,
            "recoveryKey": recovery_key,
            "status": "pending",
            "message": (
                "Your recovery request is recorded. It does not disclose a case or restore access automatically. "
                "An authorized reviewer must independently verify your identity and match your request to a case. "
                "The review may require further information. This prototype sends no email."
            ),
        }

    def recovery_status(self, payload: dict) -> dict:
        if not isinstance(payload, dict) or set(payload) != {"recoveryReference", "recoveryKey"}:
            raise CaseError(400, "Enter the recovery reference and private recovery key.")
        row = self._find_by_reference(payload.get("recoveryReference"), prefix="ACRR")
        self._verify_key(
            row["recovery_key_hash"], payload.get("recoveryKey"),
            "The recovery reference or private recovery key is incorrect.",
        )
        message = {
            "pending": "Your access-recovery request is awaiting independent identity verification and case matching.",
            "approved": "Your request was approved. The reviewer must provide the replacement case key through a separately verified contact channel.",
            "declined": "Your request was not approved. You may submit further information through the published support route.",
        }[row["status"]]
        return {
            "recoveryReference": row["recovery_reference"],
            "status": row["status"],
            "createdAt": row["created_at"],
            "updatedAt": row["updated_at"],
            "message": message,
        }

    def admin_decide_recovery(self, payload: dict, actor_account_id: str) -> dict:
        allowed = {
            "recoveryReference", "decision", "manualVerificationConfirmed",
            "independentReviewConfirmed", "matchedCaseReference",
        }
        if not isinstance(payload, dict) or set(payload) - allowed:
            raise CaseError(400, "The recovery decision contains unsupported fields.")
        recovery = self._find_by_reference(payload.get("recoveryReference"), prefix="ACRR")
        if recovery["status"] != "pending":
            raise CaseError(409, "This recovery request has already been decided.")
        decision = payload.get("decision")
        if not isinstance(decision, str) or decision not in {"approve", "decline"}:
            raise CaseError(400, "Choose approve or decline.")
        target_case_id = recovery["case_id"]
        if decision == "approve" and not target_case_id:
            target_ref = payload.get("matchedCaseReference")
            if not target_ref:
                raise CaseError(400, "Select the case that was independently matched to this recovery request.")
            target_case_id = self._find_by_reference(target_ref)["case_id"]
        with self.connect() as db:
            case = db.execute(
                "SELECT * FROM community_cases WHERE case_id = ?",
                (target_case_id,),
            ).fetchone() if target_case_id else None
        if decision == "approve" and case is None:
            raise CaseError(404, "The associated case could not be found.")
        if decision == "approve" and payload.get("manualVerificationConfirmed") is not True:
            raise CaseError(
                403,
                "A replacement key can be issued only after the reviewer records independent identity verification.",
            )
        if case is not None and case["administrator_concern"] and payload.get("independentReviewConfirmed") is not True:
            raise CaseError(
                403,
                "The associated grievance requires an independent reviewer attestation.",
            )
        now = utc_iso()
        new_access_key = secrets.token_urlsafe(32) if decision == "approve" else None
        new_status = "approved" if decision == "approve" else "declined"
        with self.connect() as db:
            db.execute(
                """UPDATE community_case_recoveries
                   SET case_id = ?, status = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ?
                   WHERE recovery_id = ? AND status = 'pending'""",
                (target_case_id, new_status, actor_account_id, now, now, recovery["recovery_id"]),
            )
            if decision == "approve":
                db.execute(
                    "UPDATE community_cases SET access_key_hash = ?, updated_at = ? WHERE case_id = ?",
                    (_key_hash(new_access_key), now, target_case_id),
                )
                self._event(
                    db, target_case_id, "access_key_reissued", "administrator",
                    actor_account_id, "internal",
                    "The reviewer approved the recovery after recording an independent identity check. The replacement key is delivered separately.",
                    case["status"],
                )
                self._event(
                    db, target_case_id, "access_recovery_approved", "system",
                    None, "public",
                    "The access-recovery request was approved. The replacement key will be provided through a separately verified contact channel; no email is sent automatically.",
                    case["status"],
                )
            else:
                if target_case_id:
                    self._event(
                        db, target_case_id, "access_recovery_declined", "system",
                        None, "public",
                        "The access-recovery request was not approved. The case remains available through its existing access credentials.",
                        case["status"] if case else None,
                    )
        result = {
            "recoveryReference": recovery["recovery_reference"],
            "status": new_status,
            "message": "Recovery request " + new_status + ".",
        }
        if new_access_key:
            result["replacementCaseReference"] = case["reference_code"]
            result["replacementCaseAccessKey"] = new_access_key
            result["deliveryInstruction"] = (
                "Copy this key once and deliver it only through the contact channel independently verified by the reviewer. "
                "Do not put the key in an ordinary public reply or internal log."
            )
        return result
