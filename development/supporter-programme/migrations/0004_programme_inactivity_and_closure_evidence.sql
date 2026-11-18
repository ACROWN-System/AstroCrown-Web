-- 0004: Programme-wide inactivity tracking and explicit closure evidence.
-- This is distinct from individual wallet-allowance expiry: unused allowances
-- do not expire per-wallet. The 180-day inactivity period starts at the official
-- ACROWN launch timestamp and resets on a verified contribution or settled purchase.
-- Reaching the threshold never closes the programme automatically.

ALTER TABLE supporter_program ADD COLUMN public_launch_at INTEGER;
ALTER TABLE supporter_program ADD COLUMN last_qualifying_activity_at INTEGER;
ALTER TABLE supporter_program ADD COLUMN closed_at INTEGER;
ALTER TABLE supporter_program ADD COLUMN closure_reason TEXT
  CHECK (closure_reason IS NULL OR closure_reason IN (
    'INACTIVITY_TERMINATION', 'OWNER_DECISION', 'CAPACITY_EXHAUSTED', 'LEGAL_REQUIREMENT'
  ));
ALTER TABLE supporter_program ADD COLUMN closure_authorized_by TEXT;
ALTER TABLE supporter_program ADD COLUMN closure_notice_reference TEXT;

CREATE TABLE supporter_program_activity_events (
  activity_id TEXT PRIMARY KEY,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('CONTRIBUTION', 'PURCHASE')),
  contribution_id TEXT UNIQUE REFERENCES supporter_contributions(contribution_id),
  purchase_id TEXT UNIQUE REFERENCES supporter_purchases(purchase_id),
  activity_at INTEGER NOT NULL,
  recorded_at INTEGER NOT NULL,
  CHECK (
    (activity_type = 'CONTRIBUTION' AND contribution_id IS NOT NULL AND purchase_id IS NULL)
    OR
    (activity_type = 'PURCHASE' AND purchase_id IS NOT NULL AND contribution_id IS NULL)
  )
);
CREATE INDEX supporter_program_activity_time_idx
  ON supporter_program_activity_events(activity_at, recorded_at);

-- The public event is an owner-selected UTC-midnight timestamp and cannot be
-- silently changed after it has been set or after programme activation.
CREATE TRIGGER supporter_program_public_launch_immutable
BEFORE UPDATE OF public_launch_at ON supporter_program
WHEN NEW.public_launch_at IS NOT OLD.public_launch_at
 AND (
   OLD.public_launch_at IS NOT NULL
   OR NEW.public_launch_at IS NULL
   OR NEW.public_launch_at % 86400 != 0
   OR OLD.status != 'PRELAUNCH'
 )
BEGIN SELECT RAISE(ABORT, 'Official public launch timestamp must be UTC midnight and immutable once set'); END;

-- Only a source row that has reached its authoritative terminal state can
-- reset the programme-wide inactivity clock.
CREATE TRIGGER supporter_program_activity_validate
BEFORE INSERT ON supporter_program_activity_events
BEGIN
  SELECT CASE
    WHEN (SELECT status FROM supporter_program WHERE singleton = 1) NOT IN ('OPEN', 'PAUSED')
      THEN RAISE(ABORT, 'Programme activity can only be recorded while the programme is open or paused')
    WHEN (SELECT public_launch_at FROM supporter_program WHERE singleton = 1) IS NULL
      THEN RAISE(ABORT, 'Official public launch timestamp must be configured before activity recording')
    WHEN NEW.activity_type = 'CONTRIBUTION' AND NOT EXISTS (
      SELECT 1 FROM supporter_contributions c
      WHERE c.contribution_id = NEW.contribution_id
        AND c.finality_status = 'FINALIZED'
        AND c.confirmed_at = NEW.activity_at
    ) THEN RAISE(ABORT, 'Only a finalized verified contribution can reset inactivity')
    WHEN NEW.activity_type = 'PURCHASE' AND NOT EXISTS (
      SELECT 1 FROM supporter_purchases p
      WHERE p.purchase_id = NEW.purchase_id
        AND p.status = 'SETTLED'
        AND p.settled_at = NEW.activity_at
    ) THEN RAISE(ABORT, 'Only a settled ACROWN purchase can reset inactivity')
  END;
END;

CREATE TRIGGER supporter_program_activity_updates_clock
AFTER INSERT ON supporter_program_activity_events
WHEN NEW.activity_at >= (SELECT public_launch_at FROM supporter_program WHERE singleton = 1)
BEGIN
  UPDATE supporter_program
  SET last_qualifying_activity_at = CASE
    WHEN last_qualifying_activity_at IS NULL OR NEW.activity_at > last_qualifying_activity_at
      THEN NEW.activity_at
    ELSE last_qualifying_activity_at
  END
  WHERE singleton = 1;
END;

-- The clock is derived from immutable launch time or the latest qualifying
-- activity. Direct writes cannot manufacture or roll back that timestamp.
CREATE TRIGGER supporter_program_last_activity_guard
BEFORE UPDATE OF last_qualifying_activity_at ON supporter_program
WHEN NEW.last_qualifying_activity_at IS NOT OLD.last_qualifying_activity_at
 AND (
   NEW.last_qualifying_activity_at IS NULL
   OR (OLD.last_qualifying_activity_at IS NOT NULL
       AND NEW.last_qualifying_activity_at < OLD.last_qualifying_activity_at)
   OR NOT EXISTS (
     SELECT 1 FROM supporter_program_activity_events e
     WHERE e.activity_at = NEW.last_qualifying_activity_at
       AND e.activity_at >= NEW.public_launch_at
   )
 )
BEGIN SELECT RAISE(ABORT, 'Global inactivity timestamp must derive from a verified programme activity event'); END;

CREATE TRIGGER supporter_program_activity_no_update
BEFORE UPDATE ON supporter_program_activity_events
BEGIN SELECT RAISE(ABORT, 'Programme activity events are append-only'); END;
CREATE TRIGGER supporter_program_activity_no_delete
BEFORE DELETE ON supporter_program_activity_events
BEGIN SELECT RAISE(ABORT, 'Programme activity events are append-only'); END;

-- Inactivity termination is discretionary, never automatic. A close transition
-- requires explicit closure metadata; inactivity termination additionally
-- requires an owner-authorized principal, a published notice reference and the
-- full 180-day interval since the latest qualifying activity (or launch).
CREATE TRIGGER supporter_program_closure_guard
BEFORE UPDATE OF status ON supporter_program
WHEN NEW.status = 'CLOSED' AND OLD.status != 'CLOSED'
 AND (
   NEW.closed_at IS NULL
   OR NEW.closure_reason IS NULL
   OR (
     NEW.closure_reason IN ('INACTIVITY_TERMINATION', 'OWNER_DECISION', 'LEGAL_REQUIREMENT')
     AND (
       NULLIF(TRIM(NEW.closure_authorized_by), '') IS NULL
       OR NULLIF(TRIM(NEW.closure_notice_reference), '') IS NULL
     )
   )
   OR (
     NEW.closure_reason = 'INACTIVITY_TERMINATION'
     AND (
       NEW.public_launch_at IS NULL
       OR NEW.closed_at < COALESCE(OLD.last_qualifying_activity_at, OLD.public_launch_at) + 15552000
     )
   )
 )
BEGIN SELECT RAISE(ABORT, 'Programme closure requires an explicit authorized decision and valid closure evidence'); END;

CREATE TRIGGER supporter_program_closure_metadata_immutable
BEFORE UPDATE OF closed_at, closure_reason, closure_authorized_by, closure_notice_reference
ON supporter_program
WHEN OLD.status = 'CLOSED'
 AND (
   NEW.closed_at IS NOT OLD.closed_at
   OR NEW.closure_reason IS NOT OLD.closure_reason
   OR NEW.closure_authorized_by IS NOT OLD.closure_authorized_by
   OR NEW.closure_notice_reference IS NOT OLD.closure_notice_reference
 )
BEGIN SELECT RAISE(ABORT, 'Programme closure evidence is immutable'); END;
