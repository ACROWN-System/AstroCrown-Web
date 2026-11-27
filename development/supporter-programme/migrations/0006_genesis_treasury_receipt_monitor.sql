-- AstroCrown-owned USDT treasury receipt monitor.
-- This schema stores independently reconciled incoming receipts for operational accounting
-- and public transparency. It does not create Genesis payment credits or entitlements.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS genesis_treasury_receipt_cursors (
  network TEXT NOT NULL CHECK (network IN ('ethereum', 'tron', 'solana')),
  scope_key TEXT NOT NULL,
  cursor_value TEXT NOT NULL DEFAULT '',
  pending_before TEXT,
  pending_until TEXT,
  pending_latest TEXT,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (network, scope_key)
);

CREATE TABLE IF NOT EXISTS genesis_treasury_receipts (
  receipt_id TEXT PRIMARY KEY,
  network TEXT NOT NULL CHECK (network IN ('ethereum', 'tron', 'solana')),
  asset_identifier TEXT NOT NULL,
  amount_base_units TEXT NOT NULL CHECK (
    length(amount_base_units) > 0
    AND amount_base_units NOT GLOB '*[^0-9]*'
    AND amount_base_units != '0'
  ),
  amount_display TEXT NOT NULL,
  sender_address TEXT NOT NULL,
  treasury_address TEXT NOT NULL,
  transaction_hash TEXT NOT NULL,
  transfer_index INTEGER NOT NULL CHECK (transfer_index >= 0),
  inclusion_reference TEXT NOT NULL,
  finality_status TEXT NOT NULL CHECK (finality_status IN ('FINALIZED', 'SOLIDIFIED')),
  verification_method TEXT NOT NULL CHECK (verification_method = 'TWO_INDEPENDENT_RPC_SOURCES'),
  rpc_provider_ids_json TEXT NOT NULL,
  rpc_source_ids_json TEXT NOT NULL,
  evidence_digest TEXT NOT NULL CHECK (length(evidence_digest) = 64),
  evidence_json TEXT NOT NULL,
  attribution_status TEXT NOT NULL CHECK (attribution_status IN ('MATCHED', 'UNMATCHED', 'AMBIGUOUS')),
  identity_id TEXT REFERENCES genesis_wallet_identities(identity_id),
  source_wallet_address_id TEXT REFERENCES genesis_wallet_addresses(wallet_address_id),
  public_visible INTEGER NOT NULL DEFAULT 1 CHECK (public_visible IN (0, 1)),
  observed_at INTEGER NOT NULL,
  verified_at INTEGER NOT NULL,
  CHECK (
    (attribution_status = 'MATCHED' AND identity_id IS NOT NULL AND source_wallet_address_id IS NOT NULL)
    OR (attribution_status IN ('UNMATCHED', 'AMBIGUOUS') AND identity_id IS NULL AND source_wallet_address_id IS NULL)
  ),
  UNIQUE (network, transaction_hash, transfer_index)
);

CREATE INDEX IF NOT EXISTS genesis_treasury_receipts_verified_idx
  ON genesis_treasury_receipts(verified_at DESC);
CREATE INDEX IF NOT EXISTS genesis_treasury_receipts_public_idx
  ON genesis_treasury_receipts(public_visible, verified_at DESC);
CREATE INDEX IF NOT EXISTS genesis_treasury_receipts_sender_idx
  ON genesis_treasury_receipts(network, sender_address, verified_at DESC);
CREATE INDEX IF NOT EXISTS genesis_treasury_receipts_attribution_idx
  ON genesis_treasury_receipts(attribution_status, identity_id, verified_at DESC);

CREATE TRIGGER IF NOT EXISTS genesis_treasury_receipts_no_update
BEFORE UPDATE ON genesis_treasury_receipts
BEGIN SELECT RAISE(ABORT, 'Verified treasury receipt evidence is immutable'); END;

CREATE TRIGGER IF NOT EXISTS genesis_treasury_receipts_no_delete
BEFORE DELETE ON genesis_treasury_receipts
BEGIN SELECT RAISE(ABORT, 'Verified treasury receipt evidence is immutable'); END;
