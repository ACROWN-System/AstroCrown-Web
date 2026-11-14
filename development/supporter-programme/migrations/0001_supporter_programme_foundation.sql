-- Supporter Programme mainnet foundation schema.
-- Schema only: no payment acceptance is enabled by this migration.
-- Apply only to a dedicated supporter D1 database after review.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS supporter_program (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  environment TEXT NOT NULL DEFAULT 'MAINNET' CHECK (environment = 'MAINNET'),
  status TEXT NOT NULL DEFAULT 'PRELAUNCH'
    CHECK (status IN ('PRELAUNCH', 'OPEN', 'PAUSED', 'CLOSED')),
  activated_at INTEGER,
  closes_at INTEGER,
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
  CHECK ((activated_at IS NULL AND closes_at IS NULL)
    OR (activated_at IS NOT NULL AND closes_at = activated_at + 15552000)),
  CHECK (status != 'OPEN' OR (
    activated_at IS NOT NULL AND closes_at IS NOT NULL
    AND multiplier_numerator IS NOT NULL AND multiplier_denominator IS NOT NULL
    AND usdt_decimals = 6 AND acrown_decimals IS NOT NULL
    AND floor_price_version IS NOT NULL AND rules_version IS NOT NULL
  ))
);

INSERT OR IGNORE INTO supporter_program(singleton, environment, status, created_at, updated_at)
VALUES (1, 'MAINNET', 'PRELAUNCH', unixepoch(), unixepoch());

CREATE TRIGGER IF NOT EXISTS supporter_program_activation_immutable
BEFORE UPDATE OF activated_at, closes_at ON supporter_program
WHEN OLD.activated_at IS NOT NULL
 AND (NEW.activated_at IS NOT OLD.activated_at OR NEW.closes_at IS NOT OLD.closes_at)
BEGIN SELECT RAISE(ABORT, 'Supporter Programme activation window is immutable'); END;

CREATE TRIGGER IF NOT EXISTS supporter_program_no_reopen
BEFORE UPDATE OF status ON supporter_program
WHEN OLD.status = 'CLOSED' AND NEW.status != 'CLOSED'
BEGIN SELECT RAISE(ABORT, 'Closed Supporter Programme cannot be reopened in place'); END;

CREATE TRIGGER IF NOT EXISTS supporter_program_terms_immutable_when_open
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

CREATE TABLE IF NOT EXISTS supporter_members (
  member_id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  username_normalized TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'CLOSED')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS supporter_wallets (
  wallet_id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES supporter_members(member_id),
  network TEXT NOT NULL CHECK (network IN ('ethereum', 'tron', 'solana')),
  address TEXT NOT NULL,
  address_normalized TEXT NOT NULL,
  wallet_role TEXT NOT NULL CHECK (wallet_role IN ('PAYMENT', 'ACROWN_DELIVERY', 'PAYMENT_AND_DELIVERY')),
  ownership_verified_at INTEGER,
  proof_method TEXT,
  created_at INTEGER NOT NULL,
  UNIQUE (network, address_normalized)
);
CREATE INDEX IF NOT EXISTS supporter_wallets_member_idx ON supporter_wallets(member_id, network);

CREATE TABLE IF NOT EXISTS supporter_wallet_challenges (
  challenge_id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES supporter_members(member_id),
  wallet_id TEXT REFERENCES supporter_wallets(wallet_id),
  network TEXT NOT NULL CHECK (network IN ('ethereum', 'tron', 'solana')),
  address_normalized TEXT NOT NULL,
  nonce_digest TEXT NOT NULL UNIQUE,
  domain TEXT NOT NULL,
  message_digest TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  consumed_at INTEGER,
  CHECK (expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS supporter_challenges_expiry_idx
  ON supporter_wallet_challenges(expires_at, consumed_at);

CREATE TABLE IF NOT EXISTS supporter_network_config (
  network TEXT PRIMARY KEY CHECK (network IN ('ethereum', 'tron', 'solana')),
  network_identifier TEXT NOT NULL UNIQUE,
  token_identifier TEXT NOT NULL,
  token_decimals INTEGER NOT NULL DEFAULT 6 CHECK (token_decimals = 6),
  treasury_address TEXT,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
  decimals_verified_at INTEGER,
  config_version TEXT,
  updated_at INTEGER NOT NULL,
  CHECK (enabled = 0 OR (treasury_address IS NOT NULL AND decimals_verified_at IS NOT NULL AND config_version IS NOT NULL))
);

-- Tether's canonical identifiers; treasury addresses deliberately remain NULL.
INSERT OR IGNORE INTO supporter_network_config
(network, network_identifier, token_identifier, token_decimals, treasury_address, enabled, updated_at)
VALUES
('ethereum', 'eip155:1', '0xdAC17F958D2ee523a2206206994597C13D831ec7', 6, NULL, 0, unixepoch()),
('tron', 'tron:mainnet', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', 6, NULL, 0, unixepoch()),
('solana', 'solana:mainnet', 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', 6, NULL, 0, unixepoch());

CREATE TABLE IF NOT EXISTS supporter_contribution_intents (
  intent_id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES supporter_members(member_id),
  wallet_id TEXT NOT NULL REFERENCES supporter_wallets(wallet_id),
  network TEXT NOT NULL REFERENCES supporter_network_config(network),
  token_identifier TEXT NOT NULL,
  treasury_address TEXT NOT NULL,
  amount_base_units TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'CREATED'
    CHECK (status IN ('CREATED', 'SUBMITTED', 'VERIFYING', 'CONFIRMED', 'REJECTED', 'EXPIRED', 'BLOCKED')),
  rules_version TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  submitted_tx_hash TEXT,
  CHECK (length(amount_base_units) > 0),
  CHECK (expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS supporter_intents_member_idx ON supporter_contribution_intents(member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS supporter_intents_status_idx ON supporter_contribution_intents(status, expires_at);

CREATE TABLE IF NOT EXISTS supporter_contributions (
  contribution_id TEXT PRIMARY KEY,
  intent_id TEXT NOT NULL UNIQUE REFERENCES supporter_contribution_intents(intent_id),
  member_id TEXT NOT NULL REFERENCES supporter_members(member_id),
  wallet_id TEXT NOT NULL REFERENCES supporter_wallets(wallet_id),
  network TEXT NOT NULL CHECK (network IN ('ethereum', 'tron', 'solana')),
  token_identifier TEXT NOT NULL,
  sender_address TEXT NOT NULL,
  treasury_address TEXT NOT NULL,
  transaction_hash TEXT NOT NULL,
  transfer_index TEXT NOT NULL,
  amount_base_units TEXT NOT NULL,
  block_or_slot TEXT NOT NULL,
  finality_status TEXT NOT NULL CHECK (finality_status = 'FINALIZED'),
  provider_agreement_digest TEXT NOT NULL,
  multiplier_numerator TEXT NOT NULL,
  multiplier_denominator TEXT NOT NULL,
  acrown_allowance_base_units TEXT NOT NULL,
  rules_version TEXT NOT NULL,
  confirmed_at INTEGER NOT NULL,
  UNIQUE (network, transaction_hash, transfer_index)
);
CREATE INDEX IF NOT EXISTS supporter_contributions_member_idx ON supporter_contributions(member_id, confirmed_at);

CREATE TABLE IF NOT EXISTS supporter_entitlements (
  member_id TEXT PRIMARY KEY REFERENCES supporter_members(member_id),
  earned_acrown_base_units TEXT NOT NULL DEFAULT '0',
  consumed_acrown_base_units TEXT NOT NULL DEFAULT '0',
  last_event_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS supporter_purchases (
  purchase_id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES supporter_members(member_id),
  delivery_wallet_id TEXT NOT NULL REFERENCES supporter_wallets(wallet_id),
  payment_network TEXT NOT NULL CHECK (payment_network IN ('ethereum', 'tron', 'solana')),
  payment_token_identifier TEXT NOT NULL,
  payment_amount_base_units TEXT NOT NULL,
  acrown_amount_base_units TEXT NOT NULL,
  floor_price_version TEXT NOT NULL,
  payment_transaction_hash TEXT,
  payment_transfer_index TEXT,
  delivery_transaction_signature TEXT,
  status TEXT NOT NULL CHECK (status IN ('CREATED', 'PAYMENT_CONFIRMED', 'DELIVERY_PENDING', 'SETTLED', 'REJECTED', 'BLOCKED')),
  created_at INTEGER NOT NULL,
  settled_at INTEGER,
  UNIQUE (payment_network, payment_transaction_hash, payment_transfer_index),
  UNIQUE (delivery_transaction_signature)
);
CREATE INDEX IF NOT EXISTS supporter_purchases_member_idx ON supporter_purchases(member_id, created_at);

CREATE TABLE IF NOT EXISTS supporter_entitlement_events (
  event_id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES supporter_members(member_id),
  contribution_id TEXT REFERENCES supporter_contributions(contribution_id),
  purchase_id TEXT REFERENCES supporter_purchases(purchase_id),
  event_type TEXT NOT NULL CHECK (event_type IN ('CONTRIBUTION_CREDIT', 'PURCHASE_CONSUMPTION', 'COMPENSATING_ADJUSTMENT', 'EXPIRY')),
  delta_acrown_base_units TEXT NOT NULL,
  resulting_earned_base_units TEXT NOT NULL,
  resulting_consumed_base_units TEXT NOT NULL,
  rules_version TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS supporter_entitlement_events_member_idx ON supporter_entitlement_events(member_id, created_at);
CREATE TRIGGER IF NOT EXISTS supporter_entitlement_events_no_update
BEFORE UPDATE ON supporter_entitlement_events
BEGIN SELECT RAISE(ABORT, 'Entitlement events are append-only'); END;
CREATE TRIGGER IF NOT EXISTS supporter_entitlement_events_no_delete
BEFORE DELETE ON supporter_entitlement_events
BEGIN SELECT RAISE(ABORT, 'Entitlement events are append-only'); END;

CREATE TABLE IF NOT EXISTS supporter_public_ledger_events (
  ledger_event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (event_type IN ('CONTRIBUTION', 'PURCHASE', 'TREASURY_OUTFLOW', 'TREASURY_MOVEMENT', 'FEE', 'OFFCHAIN_EXPENSE', 'CORRECTION')),
  network TEXT CHECK (network IS NULL OR network IN ('ethereum', 'tron', 'solana')),
  asset_identifier TEXT,
  amount_base_units TEXT,
  transaction_reference TEXT,
  transfer_index TEXT,
  member_username TEXT,
  member_wallet_address TEXT,
  purpose TEXT,
  evidence_reference TEXT,
  previous_event_digest TEXT,
  event_digest TEXT NOT NULL UNIQUE,
  recorded_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS supporter_public_ledger_time_idx ON supporter_public_ledger_events(recorded_at);
CREATE TRIGGER IF NOT EXISTS supporter_public_ledger_no_update
BEFORE UPDATE ON supporter_public_ledger_events
BEGIN SELECT RAISE(ABORT, 'Public ledger events are append-only'); END;
CREATE TRIGGER IF NOT EXISTS supporter_public_ledger_no_delete
BEFORE DELETE ON supporter_public_ledger_events
BEGIN SELECT RAISE(ABORT, 'Public ledger events are append-only'); END;

CREATE TRIGGER IF NOT EXISTS supporter_network_token_identity_immutable
BEFORE UPDATE OF network_identifier, token_identifier, token_decimals ON supporter_network_config
WHEN NEW.network_identifier IS NOT OLD.network_identifier
  OR NEW.token_identifier IS NOT OLD.token_identifier
  OR NEW.token_decimals IS NOT OLD.token_decimals
BEGIN SELECT RAISE(ABORT, 'Canonical network/token identity is immutable'); END;

CREATE TRIGGER IF NOT EXISTS supporter_contributions_no_update
BEFORE UPDATE ON supporter_contributions
BEGIN SELECT RAISE(ABORT, 'Confirmed contributions are immutable; use a compensating event'); END;
CREATE TRIGGER IF NOT EXISTS supporter_contributions_no_delete
BEFORE DELETE ON supporter_contributions
BEGIN SELECT RAISE(ABORT, 'Confirmed contributions are immutable; use a compensating event'); END;
