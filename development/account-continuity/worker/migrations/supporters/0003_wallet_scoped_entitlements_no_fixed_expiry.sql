-- Owner-directed Supporter Programme rules:
--   * no fixed 180-day expiry;
--   * entitlements and purchase consumption are strictly wallet-scoped;
--   * source wallet and ACROWN delivery wallet are separate roles.
-- Payment acceptance remains disabled. This migration creates schema constraints only.

PRAGMA foreign_keys = ON;

-- Rebuild the programme lifecycle record without the legacy closes_at column.
-- The former 180-day window is withdrawn; activation itself remains immutable.
CREATE TABLE supporter_program_new (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  environment TEXT NOT NULL DEFAULT 'MAINNET' CHECK (environment = 'MAINNET'),
  status TEXT NOT NULL DEFAULT 'PRELAUNCH'
    CHECK (status IN ('PRELAUNCH', 'OPEN', 'PAUSED', 'CLOSED')),
  activated_at INTEGER,
  multiplier_numerator TEXT,
  multiplier_denominator TEXT,
  usdt_decimals INTEGER CHECK (usdt_decimals IS NULL OR usdt_decimals = 6),
  acrown_decimals INTEGER CHECK (acrown_decimals IS NULL OR acrown_decimals BETWEEN 0 AND 18),
  floor_price_version TEXT,
  global_acrown_cap_base_units TEXT,
  contribution_ceiling_usdt_base_units TEXT,
  rules_version TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  CHECK (status != 'OPEN' OR (
    activated_at IS NOT NULL
    AND multiplier_numerator IS NOT NULL AND multiplier_denominator IS NOT NULL
    AND usdt_decimals = 6 AND acrown_decimals IS NOT NULL
    AND floor_price_version IS NOT NULL AND rules_version IS NOT NULL
  ))
);

INSERT INTO supporter_program_new (
  singleton, environment, status, activated_at, multiplier_numerator,
  multiplier_denominator, usdt_decimals, acrown_decimals, floor_price_version,
  global_acrown_cap_base_units, contribution_ceiling_usdt_base_units,
  rules_version, created_at, updated_at
)
SELECT
  singleton, environment, status, activated_at, multiplier_numerator,
  multiplier_denominator, usdt_decimals, acrown_decimals, floor_price_version,
  global_acrown_cap_base_units, contribution_ceiling_usdt_base_units,
  rules_version, created_at, updated_at
FROM supporter_program;

DROP TABLE supporter_program;
ALTER TABLE supporter_program_new RENAME TO supporter_program;

CREATE TRIGGER supporter_program_activation_immutable
BEFORE UPDATE OF activated_at ON supporter_program
WHEN OLD.activated_at IS NOT NULL
 AND NEW.activated_at IS NOT OLD.activated_at
BEGIN SELECT RAISE(ABORT, 'Supporter Programme activation is immutable'); END;

CREATE TRIGGER supporter_program_no_reopen
BEFORE UPDATE OF status ON supporter_program
WHEN OLD.status = 'CLOSED' AND NEW.status != 'CLOSED'
BEGIN SELECT RAISE(ABORT, 'Closed Supporter Programme cannot be reopened in place'); END;

CREATE TRIGGER supporter_program_terms_immutable_when_open
BEFORE UPDATE OF multiplier_numerator, multiplier_denominator, usdt_decimals,
  acrown_decimals, floor_price_version, global_acrown_cap_base_units,
  contribution_ceiling_usdt_base_units, rules_version ON supporter_program
WHEN OLD.status IN ('OPEN', 'CLOSED') AND (
  NEW.multiplier_numerator IS NOT OLD.multiplier_numerator
  OR NEW.multiplier_denominator IS NOT OLD.multiplier_denominator
  OR NEW.usdt_decimals IS NOT OLD.usdt_decimals
  OR NEW.acrown_decimals IS NOT OLD.acrown_decimals
  OR NEW.floor_price_version IS NOT OLD.floor_price_version
  OR NEW.global_acrown_cap_base_units IS NOT OLD.global_acrown_cap_base_units
  OR NEW.contribution_ceiling_usdt_base_units IS NOT OLD.contribution_ceiling_usdt_base_units
  OR NEW.rules_version IS NOT OLD.rules_version
)
BEGIN SELECT RAISE(ABORT, 'Open programme terms are immutable; issue a new approved version'); END;

-- Preserve any legacy member-wide aggregates and events for audit, but retire
-- them from active entitlement logic. They cannot be allocated to wallets by guess.
DROP TRIGGER IF EXISTS supporter_entitlement_events_no_update;
DROP TRIGGER IF EXISTS supporter_entitlement_events_no_delete;
DROP INDEX IF EXISTS supporter_entitlement_events_member_idx;

ALTER TABLE supporter_entitlements RENAME TO supporter_entitlements_legacy_member_scope;
ALTER TABLE supporter_entitlement_events RENAME TO supporter_entitlement_events_legacy_member_scope;

-- One authoritative entitlement balance per independently verified source wallet.
CREATE TABLE supporter_entitlements (
  wallet_id TEXT PRIMARY KEY REFERENCES supporter_wallets(wallet_id),
  member_id TEXT NOT NULL REFERENCES supporter_members(member_id),
  earned_acrown_base_units TEXT NOT NULL DEFAULT '0',
  consumed_acrown_base_units TEXT NOT NULL DEFAULT '0',
  last_event_at INTEGER NOT NULL,
  UNIQUE (wallet_id, member_id)
);

CREATE INDEX supporter_entitlements_member_idx
  ON supporter_entitlements(member_id, wallet_id);

CREATE TRIGGER supporter_entitlements_wallet_member_match_insert
BEFORE INSERT ON supporter_entitlements
WHEN NOT EXISTS (
  SELECT 1 FROM supporter_wallets w
  WHERE w.wallet_id = NEW.wallet_id
    AND w.member_id = NEW.member_id
    AND w.ownership_verified_at IS NOT NULL
    AND w.wallet_role IN ('PAYMENT', 'PAYMENT_AND_DELIVERY')
)
BEGIN SELECT RAISE(ABORT, 'Wallet entitlement must belong to the same verified payment wallet and member'); END;

CREATE TRIGGER supporter_entitlements_identity_immutable
BEFORE UPDATE OF wallet_id, member_id ON supporter_entitlements
WHEN NEW.wallet_id IS NOT OLD.wallet_id OR NEW.member_id IS NOT OLD.member_id
BEGIN SELECT RAISE(ABORT, 'Wallet entitlement identity is immutable'); END;

-- Every new purchase records exactly which source wallet's allowance it consumes.
-- Legacy purchase rows remain NULL in this new field and must never be treated as
-- newly wallet-qualified purchases without an explicit reviewed reconciliation.
ALTER TABLE supporter_purchases
  ADD COLUMN entitlement_wallet_id TEXT REFERENCES supporter_wallets(wallet_id);

CREATE INDEX supporter_purchases_entitlement_wallet_idx
  ON supporter_purchases(entitlement_wallet_id, created_at);

CREATE TRIGGER supporter_purchases_wallet_scope_insert
BEFORE INSERT ON supporter_purchases
WHEN NEW.entitlement_wallet_id IS NULL
 OR NOT EXISTS (
   SELECT 1
   FROM supporter_wallets source
   JOIN supporter_wallets delivery ON delivery.wallet_id = NEW.delivery_wallet_id
   JOIN supporter_entitlements entitlement
     ON entitlement.wallet_id = source.wallet_id
    AND entitlement.member_id = source.member_id
   WHERE source.wallet_id = NEW.entitlement_wallet_id
     AND source.member_id = NEW.member_id
     AND source.network = NEW.payment_network
     AND source.ownership_verified_at IS NOT NULL
     AND source.wallet_role IN ('PAYMENT', 'PAYMENT_AND_DELIVERY')
     AND delivery.member_id = NEW.member_id
     AND delivery.network = 'solana'
     AND delivery.ownership_verified_at IS NOT NULL
     AND delivery.wallet_role IN ('ACROWN_DELIVERY', 'PAYMENT_AND_DELIVERY')
 )
BEGIN SELECT RAISE(ABORT, 'Purchase must consume the same member wallet-specific allowance used for payment'); END;

CREATE TRIGGER supporter_purchases_wallet_scope_identity_immutable
BEFORE UPDATE OF member_id, entitlement_wallet_id, delivery_wallet_id, payment_network
ON supporter_purchases
WHEN NEW.member_id IS NOT OLD.member_id
 OR NEW.entitlement_wallet_id IS NOT OLD.entitlement_wallet_id
 OR NEW.delivery_wallet_id IS NOT OLD.delivery_wallet_id
 OR NEW.payment_network IS NOT OLD.payment_network
BEGIN SELECT RAISE(ABORT, 'Purchase wallet scope and delivery identity are immutable'); END;

-- Entitlement events are append-only and tied to the same wallet as their
-- originating contribution or purchase. Member ID is retained as a display/account
-- association only; it is not the entitlement key.
CREATE TABLE supporter_entitlement_events (
  event_id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES supporter_members(member_id),
  wallet_id TEXT NOT NULL REFERENCES supporter_wallets(wallet_id),
  contribution_id TEXT REFERENCES supporter_contributions(contribution_id),
  purchase_id TEXT REFERENCES supporter_purchases(purchase_id),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'CONTRIBUTION_CREDIT',
    'PURCHASE_CONSUMPTION',
    'COMPENSATING_ADJUSTMENT'
  )),
  delta_acrown_base_units TEXT NOT NULL,
  resulting_earned_base_units TEXT NOT NULL,
  resulting_consumed_base_units TEXT NOT NULL,
  rules_version TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX supporter_entitlement_events_wallet_idx
  ON supporter_entitlement_events(wallet_id, created_at);
CREATE INDEX supporter_entitlement_events_member_idx
  ON supporter_entitlement_events(member_id, created_at);

CREATE TRIGGER supporter_entitlement_events_wallet_scope_insert
BEFORE INSERT ON supporter_entitlement_events
WHEN NOT EXISTS (
  SELECT 1 FROM supporter_entitlements e
  WHERE e.wallet_id = NEW.wallet_id AND e.member_id = NEW.member_id
)
 OR (NEW.contribution_id IS NOT NULL AND NOT EXISTS (
   SELECT 1 FROM supporter_contributions c
   WHERE c.contribution_id = NEW.contribution_id
     AND c.wallet_id = NEW.wallet_id
     AND c.member_id = NEW.member_id
 ))
 OR (NEW.purchase_id IS NOT NULL AND NOT EXISTS (
   SELECT 1 FROM supporter_purchases p
   WHERE p.purchase_id = NEW.purchase_id
     AND p.entitlement_wallet_id = NEW.wallet_id
     AND p.member_id = NEW.member_id
 ))
BEGIN SELECT RAISE(ABORT, 'Entitlement event must match its wallet-specific contribution or purchase'); END;

CREATE TRIGGER supporter_entitlement_events_no_update
BEFORE UPDATE ON supporter_entitlement_events
BEGIN SELECT RAISE(ABORT, 'Entitlement events are append-only'); END;
CREATE TRIGGER supporter_entitlement_events_no_delete
BEFORE DELETE ON supporter_entitlement_events
BEGIN SELECT RAISE(ABORT, 'Entitlement events are append-only'); END;

-- Protect retained member-wide legacy records as immutable audit history.
CREATE TRIGGER supporter_entitlements_legacy_no_update
BEFORE UPDATE ON supporter_entitlements_legacy_member_scope
BEGIN SELECT RAISE(ABORT, 'Legacy member-wide entitlement records are immutable audit history'); END;
CREATE TRIGGER supporter_entitlements_legacy_no_delete
BEFORE DELETE ON supporter_entitlements_legacy_member_scope
BEGIN SELECT RAISE(ABORT, 'Legacy member-wide entitlement records are immutable audit history'); END;
CREATE TRIGGER supporter_entitlement_events_legacy_no_update
BEFORE UPDATE ON supporter_entitlement_events_legacy_member_scope
BEGIN SELECT RAISE(ABORT, 'Legacy member-wide entitlement events are immutable audit history'); END;
CREATE TRIGGER supporter_entitlement_events_legacy_no_delete
BEFORE DELETE ON supporter_entitlement_events_legacy_member_scope
BEGIN SELECT RAISE(ABORT, 'Legacy member-wide entitlement events are immutable audit history'); END;
