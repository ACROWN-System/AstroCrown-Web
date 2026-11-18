-- Genesis programme-wide purchase allowance pool and permanent pre-launch registration freeze.
-- Schema only: no payment acceptance, programme launch, or ACROWN purchase is enabled.
-- The global allowance is shared: one eligible registered wallet may consume the entire
-- remaining programme allowance; there is no personal per-wallet purchase ceiling.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS genesis_programme_control (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  scheduled_acrown_launch_at INTEGER,
  registration_freeze_at INTEGER,
  registration_closed_at INTEGER,
  acrown_launched_at INTEGER,
  acs_floor_purchase_opened_at INTEGER,
  purchase_window_started_at INTEGER,
  purchase_window_last_purchase_at INTEGER,
  purchase_window_closes_at INTEGER,
  rules_version TEXT,
  updated_at INTEGER NOT NULL,
  CHECK (
    (scheduled_acrown_launch_at IS NULL AND registration_freeze_at IS NULL)
    OR (
      scheduled_acrown_launch_at IS NOT NULL
      AND registration_freeze_at = scheduled_acrown_launch_at - 86400
    )
  ),
  CHECK (registration_closed_at IS NULL OR registration_closed_at = registration_freeze_at),
  CHECK (
    (purchase_window_started_at IS NULL AND purchase_window_last_purchase_at IS NULL AND purchase_window_closes_at IS NULL)
    OR (
      purchase_window_started_at IS NOT NULL
      AND acrown_launched_at IS NOT NULL
      AND purchase_window_started_at = acrown_launched_at
      AND (purchase_window_last_purchase_at IS NULL OR purchase_window_last_purchase_at >= purchase_window_started_at)
      AND purchase_window_closes_at = COALESCE(purchase_window_last_purchase_at, purchase_window_started_at) + 15552000
    )
  )
);

INSERT OR IGNORE INTO genesis_programme_control(singleton, updated_at)
VALUES (1, unixepoch());

CREATE TRIGGER IF NOT EXISTS genesis_registration_closure_is_permanent
BEFORE UPDATE OF registration_closed_at ON genesis_programme_control
WHEN OLD.registration_closed_at IS NOT NULL
 AND NEW.registration_closed_at IS NOT OLD.registration_closed_at
BEGIN SELECT RAISE(ABORT, 'Genesis new-wallet registration closure is permanent'); END;

CREATE TRIGGER IF NOT EXISTS genesis_launch_schedule_locked_after_registration_freeze
BEFORE UPDATE OF scheduled_acrown_launch_at, registration_freeze_at ON genesis_programme_control
WHEN OLD.registration_closed_at IS NOT NULL
 AND (
   NEW.scheduled_acrown_launch_at IS NOT OLD.scheduled_acrown_launch_at
   OR NEW.registration_freeze_at IS NOT OLD.registration_freeze_at
 )
BEGIN SELECT RAISE(ABORT, 'Genesis launch schedule cannot change after registration freeze'); END;

CREATE TRIGGER IF NOT EXISTS genesis_acrown_launch_time_immutable
BEFORE UPDATE OF acrown_launched_at ON genesis_programme_control
WHEN OLD.acrown_launched_at IS NOT NULL
 AND NEW.acrown_launched_at IS NOT OLD.acrown_launched_at
BEGIN SELECT RAISE(ABORT, 'Official ACROWN launch timestamp is immutable'); END;

CREATE TRIGGER IF NOT EXISTS genesis_floor_purchase_open_time_immutable
BEFORE UPDATE OF acs_floor_purchase_opened_at ON genesis_programme_control
WHEN OLD.acs_floor_purchase_opened_at IS NOT NULL
 AND NEW.acs_floor_purchase_opened_at IS NOT OLD.acs_floor_purchase_opened_at
BEGIN SELECT RAISE(ABORT, 'ACS floor-purchase opening timestamp is immutable'); END;

CREATE TRIGGER IF NOT EXISTS genesis_programme_control_no_delete
BEFORE DELETE ON genesis_programme_control
BEGIN SELECT RAISE(ABORT, 'Genesis programme control record cannot be deleted'); END;

CREATE TABLE IF NOT EXISTS genesis_programme_allowance_state (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  allowance_cap_usdt_base_units TEXT,
  earned_usdt_base_units TEXT NOT NULL DEFAULT '0',
  reserved_usdt_base_units TEXT NOT NULL DEFAULT '0',
  consumed_usdt_base_units TEXT NOT NULL DEFAULT '0',
  updated_at INTEGER NOT NULL,
  CHECK (length(earned_usdt_base_units) > 0 AND earned_usdt_base_units NOT GLOB '*[^0-9]*'),
  CHECK (length(reserved_usdt_base_units) > 0 AND reserved_usdt_base_units NOT GLOB '*[^0-9]*'),
  CHECK (length(consumed_usdt_base_units) > 0 AND consumed_usdt_base_units NOT GLOB '*[^0-9]*'),
  CHECK (allowance_cap_usdt_base_units IS NULL OR (
    length(allowance_cap_usdt_base_units) > 0
    AND allowance_cap_usdt_base_units NOT GLOB '*[^0-9]*'
  ))
);

INSERT OR IGNORE INTO genesis_programme_allowance_state(singleton, updated_at)
VALUES (1, unixepoch());

CREATE TABLE IF NOT EXISTS genesis_programme_allowance_events (
  event_id TEXT PRIMARY KEY,
  identity_id TEXT NOT NULL REFERENCES genesis_wallet_identities(identity_id),
  payment_record_id TEXT REFERENCES genesis_public_payments(payment_record_id),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'QUALIFYING_PAYMENT_CREDIT',
    'FLOOR_PURCHASE_RESERVATION',
    'FLOOR_PURCHASE_RELEASE',
    'FLOOR_PURCHASE_CONSUMPTION',
    'COMPENSATING_ADJUSTMENT',
    'PROGRAMME_EXPIRY'
  )),
  amount_usdt_base_units TEXT NOT NULL CHECK (
    length(amount_usdt_base_units) > 0 AND amount_usdt_base_units NOT GLOB '*[^0-9]*'
  ),
  resulting_earned_usdt_base_units TEXT NOT NULL,
  resulting_reserved_usdt_base_units TEXT NOT NULL,
  resulting_consumed_usdt_base_units TEXT NOT NULL,
  rules_version TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS genesis_programme_allowance_events_identity_idx
  ON genesis_programme_allowance_events(identity_id, created_at);

-- The 180-day inactivity timer starts at the official ACROWN launch, independently
-- of ACS floor-purchase service readiness.
CREATE TRIGGER IF NOT EXISTS genesis_purchase_window_starts_at_acrown_launch
AFTER UPDATE OF acrown_launched_at ON genesis_programme_control
WHEN OLD.acrown_launched_at IS NULL AND NEW.acrown_launched_at IS NOT NULL
BEGIN
  UPDATE genesis_programme_control
  SET purchase_window_started_at=NEW.acrown_launched_at,
      purchase_window_last_purchase_at=NULL,
      purchase_window_closes_at=NEW.acrown_launched_at + 15552000,
      updated_at=MAX(updated_at, NEW.acrown_launched_at)
  WHERE singleton=1;
END;

-- After launch, acquiring additional Genesis purchase rights and buying ACROWN at
-- the ACS floor price are both purchase events that reset the same global timer.
-- Pre-launch qualifying-payment credits do not start or reset this timer.
CREATE TRIGGER IF NOT EXISTS genesis_purchase_events_require_open_window
BEFORE INSERT ON genesis_programme_allowance_events
WHEN NEW.event_type IN ('QUALIFYING_PAYMENT_CREDIT', 'FLOOR_PURCHASE_CONSUMPTION')
 AND EXISTS (
   SELECT 1 FROM genesis_programme_control c
   WHERE c.singleton=1 AND c.purchase_window_started_at IS NOT NULL
 )
 AND NOT EXISTS (
   SELECT 1 FROM genesis_programme_control c
   WHERE c.singleton=1
     AND c.purchase_window_started_at IS NOT NULL
     AND NEW.created_at >= c.purchase_window_started_at
     AND NEW.created_at < c.purchase_window_closes_at
 )
BEGIN SELECT RAISE(ABORT, 'Genesis purchase inactivity period is not open'); END;

CREATE TRIGGER IF NOT EXISTS genesis_floor_purchase_requires_acs_service
BEFORE INSERT ON genesis_programme_allowance_events
WHEN NEW.event_type='FLOOR_PURCHASE_CONSUMPTION'
 AND NOT EXISTS (
   SELECT 1 FROM genesis_programme_control c
   WHERE c.singleton=1
     AND c.acs_floor_purchase_opened_at IS NOT NULL
     AND NEW.created_at >= c.acs_floor_purchase_opened_at
 )
BEGIN SELECT RAISE(ABORT, 'ACS floor-price purchase service is not open'); END;

CREATE TRIGGER IF NOT EXISTS genesis_purchase_event_resets_rolling_timer
AFTER INSERT ON genesis_programme_allowance_events
WHEN NEW.event_type IN ('QUALIFYING_PAYMENT_CREDIT', 'FLOOR_PURCHASE_CONSUMPTION')
BEGIN
  UPDATE genesis_programme_control
  SET purchase_window_last_purchase_at=NEW.created_at,
      purchase_window_closes_at=NEW.created_at + 15552000,
      updated_at=MAX(updated_at, NEW.created_at)
  WHERE singleton=1
    AND purchase_window_started_at IS NOT NULL
    AND NEW.created_at >= purchase_window_started_at
    AND NEW.created_at < purchase_window_closes_at
    AND NEW.created_at > COALESCE(purchase_window_last_purchase_at, purchase_window_started_at);
END;

CREATE TRIGGER IF NOT EXISTS genesis_purchase_window_start_immutable
BEFORE UPDATE OF purchase_window_started_at ON genesis_programme_control
WHEN OLD.purchase_window_started_at IS NOT NULL
 AND NEW.purchase_window_started_at IS NOT OLD.purchase_window_started_at
BEGIN SELECT RAISE(ABORT, 'Genesis purchase-window start is immutable'); END;

CREATE TRIGGER IF NOT EXISTS genesis_purchase_window_rolling_timer_guard
BEFORE UPDATE OF purchase_window_started_at, purchase_window_last_purchase_at, purchase_window_closes_at ON genesis_programme_control
WHEN OLD.purchase_window_started_at IS NOT NULL
 AND (
   NEW.purchase_window_started_at IS NOT OLD.purchase_window_started_at
   OR NEW.purchase_window_last_purchase_at IS NULL
   OR NEW.purchase_window_last_purchase_at < COALESCE(OLD.purchase_window_last_purchase_at, OLD.purchase_window_started_at)
   OR NEW.purchase_window_closes_at != NEW.purchase_window_last_purchase_at + 15552000
   OR NOT EXISTS (
     SELECT 1 FROM genesis_programme_allowance_events e
     WHERE e.event_type IN ('QUALIFYING_PAYMENT_CREDIT', 'FLOOR_PURCHASE_CONSUMPTION')
       AND e.created_at=NEW.purchase_window_last_purchase_at
   )
 )
BEGIN SELECT RAISE(ABORT, 'Genesis rolling inactivity timer can move only after a finalized Genesis-right or ACS floor-price purchase'); END;

CREATE TRIGGER IF NOT EXISTS genesis_programme_allowance_events_no_update
BEFORE UPDATE ON genesis_programme_allowance_events
BEGIN SELECT RAISE(ABORT, 'Programme-wide allowance events are append-only'); END;

CREATE TRIGGER IF NOT EXISTS genesis_programme_allowance_events_no_delete
BEFORE DELETE ON genesis_programme_allowance_events
BEGIN SELECT RAISE(ABORT, 'Programme-wide allowance events are append-only'); END;

-- Database-level backstops enforce the cutoff even if an API path is added incorrectly.
-- Before the cutoff timestamp, the programme can accept new identity/profile records.
-- At/after the cutoff, new identities, address links and identity/profile edits are blocked permanently.
CREATE TRIGGER IF NOT EXISTS genesis_primary_identity_registration_cutoff
BEFORE INSERT ON genesis_wallet_identities
WHEN EXISTS (
  SELECT 1 FROM genesis_programme_control c
  WHERE c.singleton=1
    AND (c.registration_closed_at IS NOT NULL
      OR (c.registration_freeze_at IS NOT NULL AND c.registration_freeze_at<=unixepoch()))
)
BEGIN SELECT RAISE(ABORT, 'Genesis primary-wallet registration is permanently closed at the 24-hour pre-launch freeze'); END;

CREATE TRIGGER IF NOT EXISTS genesis_wallet_address_link_cutoff
BEFORE INSERT ON genesis_wallet_addresses
WHEN EXISTS (
  SELECT 1 FROM genesis_programme_control c
  WHERE c.singleton=1
    AND (c.registration_closed_at IS NOT NULL
      OR (c.registration_freeze_at IS NOT NULL AND c.registration_freeze_at<=unixepoch()))
)
BEGIN SELECT RAISE(ABORT, 'Genesis wallet linking is permanently closed at the 24-hour pre-launch freeze'); END;

CREATE TRIGGER IF NOT EXISTS genesis_identity_profile_mutation_cutoff
BEFORE UPDATE OF display_name, display_name_normalized, avatar_key
ON genesis_wallet_identities
WHEN EXISTS (
  SELECT 1 FROM genesis_programme_control c
  WHERE c.singleton=1
    AND (c.registration_closed_at IS NOT NULL
      OR (c.registration_freeze_at IS NOT NULL AND c.registration_freeze_at<=unixepoch()))
)
BEGIN SELECT RAISE(ABORT, 'Genesis profile changes are closed at the 24-hour pre-launch freeze'); END;

CREATE TRIGGER IF NOT EXISTS genesis_wallet_challenge_cutoff
BEFORE INSERT ON genesis_wallet_challenges
WHEN EXISTS (
  SELECT 1 FROM genesis_programme_control c
  WHERE c.singleton=1
    AND (c.registration_closed_at IS NOT NULL
      OR (c.registration_freeze_at IS NOT NULL AND c.registration_freeze_at<=unixepoch()))
)
AND (
  NEW.challenge_purpose IN ('LINK', 'RENAME')
  OR (
    NEW.challenge_purpose='IDENTIFY'
    AND NOT EXISTS (
      SELECT 1 FROM genesis_wallet_identities i
      WHERE i.primary_network=NEW.network
        AND i.primary_address_normalized=NEW.address_normalized
    )
  )
)
BEGIN SELECT RAISE(ABORT, 'New Genesis registrations, wallet links and profile challenges are closed at the 24-hour pre-launch freeze'); END;

CREATE TRIGGER IF NOT EXISTS genesis_wallet_address_delete_cutoff
BEFORE DELETE ON genesis_wallet_addresses
WHEN EXISTS (
  SELECT 1 FROM genesis_programme_control c
  WHERE c.singleton=1
    AND (c.registration_closed_at IS NOT NULL
      OR (c.registration_freeze_at IS NOT NULL AND c.registration_freeze_at<=unixepoch()))
)
BEGIN SELECT RAISE(ABORT, 'Genesis wallet records cannot be removed after the 24-hour pre-launch freeze'); END;

CREATE TRIGGER IF NOT EXISTS genesis_wallet_identity_delete_cutoff
BEFORE DELETE ON genesis_wallet_identities
WHEN EXISTS (
  SELECT 1 FROM genesis_programme_control c
  WHERE c.singleton=1
    AND (c.registration_closed_at IS NOT NULL
      OR (c.registration_freeze_at IS NOT NULL AND c.registration_freeze_at<=unixepoch()))
)
BEGIN SELECT RAISE(ABORT, 'Genesis wallet identities cannot be removed after the 24-hour pre-launch freeze'); END;

CREATE TRIGGER IF NOT EXISTS genesis_launch_schedule_lock_at_freeze
BEFORE UPDATE OF scheduled_acrown_launch_at, registration_freeze_at ON genesis_programme_control
WHEN OLD.registration_closed_at IS NOT NULL
  OR (OLD.registration_freeze_at IS NOT NULL AND OLD.registration_freeze_at<=unixepoch())
BEGIN SELECT RAISE(ABORT, 'Genesis launch schedule is locked once the 24-hour pre-launch freeze begins'); END;

-- Legacy per-wallet ACROWN-denominated balances are retained only for schema-history
-- compatibility. All new rights and all purchases must use the programme-wide USDT pool.
CREATE TRIGGER IF NOT EXISTS genesis_legacy_wallet_entitlements_no_insert
BEFORE INSERT ON genesis_wallet_entitlements
BEGIN SELECT RAISE(ABORT, 'Per-wallet entitlement balances are retired; use the global Genesis programme allowance pool'); END;

CREATE TRIGGER IF NOT EXISTS genesis_legacy_wallet_entitlements_no_update
BEFORE UPDATE ON genesis_wallet_entitlements
BEGIN SELECT RAISE(ABORT, 'Per-wallet entitlement balances are retired; use the global Genesis programme allowance pool'); END;
