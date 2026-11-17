-- Genesis wallet-native identity, unique public name and honorific membership schema.
-- This schema replaces conventional member registration for Genesis.
-- The wallet's primary public address is the sole identity/recovery anchor.
-- No seed phrase, private key, email, password, passkey or external identity is stored.
-- Payment acceptance remains disabled; this migration creates no payment route.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS genesis_wallet_identities (
  identity_id TEXT PRIMARY KEY,
  primary_network TEXT NOT NULL CHECK (primary_network IN ('ethereum', 'tron', 'solana')),
  primary_address TEXT NOT NULL,
  primary_address_normalized TEXT NOT NULL,
  display_name TEXT NOT NULL,
  display_name_normalized TEXT NOT NULL UNIQUE,
  avatar_key TEXT NOT NULL DEFAULT 'orbit'
    CHECK (avatar_key IN ('person', 'crown', 'star', 'moon', 'orbit', 'shield')),
  identity_status TEXT NOT NULL DEFAULT 'ACTIVE'
    CHECK (identity_status IN ('ACTIVE', 'SUSPENDED', 'RETIRED')),
  genesis_member_status TEXT NOT NULL DEFAULT 'NOT_QUALIFIED'
    CHECK (genesis_member_status IN ('NOT_QUALIFIED', 'ACTIVE', 'SUSPENDED', 'REVOKED')),
  genesis_member_awarded_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (primary_network, primary_address_normalized),
  CHECK (length(display_name) BETWEEN 3 AND 28),
  CHECK (length(display_name_normalized) BETWEEN 3 AND 28),
  CHECK ((genesis_member_status = 'ACTIVE' AND genesis_member_awarded_at IS NOT NULL)
      OR genesis_member_status != 'ACTIVE')
);

CREATE TABLE IF NOT EXISTS genesis_wallet_addresses (
  wallet_address_id TEXT PRIMARY KEY,
  identity_id TEXT NOT NULL REFERENCES genesis_wallet_identities(identity_id),
  network TEXT NOT NULL CHECK (network IN ('ethereum', 'tron', 'solana')),
  address TEXT NOT NULL,
  address_normalized TEXT NOT NULL,
  wallet_role TEXT NOT NULL CHECK (wallet_role IN ('PRIMARY', 'PAYMENT', 'DELIVERY', 'PAYMENT_AND_DELIVERY')),
  ownership_verified_at INTEGER NOT NULL,
  proof_method TEXT NOT NULL CHECK (proof_method IN ('EIP-191', 'TIP-191', 'SOLANA_SIGN_MESSAGE')),
  created_at INTEGER NOT NULL,
  UNIQUE (network, address_normalized)
);
CREATE UNIQUE INDEX IF NOT EXISTS genesis_one_primary_wallet_per_identity
  ON genesis_wallet_addresses(identity_id) WHERE wallet_role = 'PRIMARY';
CREATE INDEX IF NOT EXISTS genesis_wallet_addresses_identity_idx
  ON genesis_wallet_addresses(identity_id, network, created_at);

CREATE TABLE IF NOT EXISTS genesis_wallet_challenges (
  challenge_id TEXT PRIMARY KEY,
  identity_id TEXT REFERENCES genesis_wallet_identities(identity_id),
  network TEXT NOT NULL CHECK (network IN ('ethereum', 'tron', 'solana')),
  address TEXT NOT NULL,
  address_normalized TEXT NOT NULL,
  challenge_purpose TEXT NOT NULL CHECK (challenge_purpose IN ('IDENTIFY', 'LINK', 'RENAME')),
  wallet_role TEXT CHECK (wallet_role IS NULL OR wallet_role IN ('PAYMENT', 'DELIVERY', 'PAYMENT_AND_DELIVERY')),
  requested_display_name TEXT,
  nonce_digest TEXT NOT NULL UNIQUE,
  domain TEXT NOT NULL,
  message_digest TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  consumed_at INTEGER,
  CHECK (expires_at > created_at),
  CHECK ((challenge_purpose = 'IDENTIFY' AND identity_id IS NULL AND wallet_role IS NULL)
      OR (challenge_purpose = 'IDENTIFY' AND identity_id IS NOT NULL AND wallet_role IS NULL)
      OR (challenge_purpose = 'LINK' AND identity_id IS NOT NULL AND wallet_role IS NOT NULL)
      OR (challenge_purpose = 'RENAME' AND identity_id IS NOT NULL AND requested_display_name IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS genesis_challenge_expiry_idx
  ON genesis_wallet_challenges(expires_at, consumed_at);
CREATE INDEX IF NOT EXISTS genesis_challenge_identity_idx
  ON genesis_wallet_challenges(identity_id, challenge_purpose, expires_at);

CREATE TABLE IF NOT EXISTS genesis_wallet_sessions (
  session_id TEXT PRIMARY KEY,
  identity_id TEXT NOT NULL REFERENCES genesis_wallet_identities(identity_id),
  secret_digest TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  last_used_at INTEGER NOT NULL,
  revoked_at INTEGER,
  CHECK (expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS genesis_wallet_sessions_identity_idx
  ON genesis_wallet_sessions(identity_id, expires_at);

CREATE TABLE IF NOT EXISTS genesis_wallet_entitlements (
  identity_id TEXT PRIMARY KEY REFERENCES genesis_wallet_identities(identity_id),
  earned_acrown_base_units TEXT NOT NULL DEFAULT '0',
  consumed_acrown_base_units TEXT NOT NULL DEFAULT '0',
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS genesis_public_payments (
  payment_record_id TEXT PRIMARY KEY,
  identity_id TEXT NOT NULL REFERENCES genesis_wallet_identities(identity_id),
  source_wallet_address_id TEXT NOT NULL REFERENCES genesis_wallet_addresses(wallet_address_id),
  payment_kind TEXT NOT NULL CHECK (payment_kind IN ('QUALIFYING_PAYMENT', 'FLOOR_PRICE_PURCHASE')),
  network TEXT NOT NULL CHECK (network IN ('ethereum', 'tron', 'solana')),
  asset_identifier TEXT NOT NULL,
  amount_base_units TEXT NOT NULL,
  amount_display TEXT NOT NULL,
  transaction_hash TEXT NOT NULL,
  transfer_index TEXT NOT NULL,
  finality_status TEXT NOT NULL CHECK (finality_status = 'FINALIZED'),
  rules_version TEXT NOT NULL,
  explorer_reference TEXT NOT NULL,
  confirmed_at INTEGER NOT NULL,
  public_visible INTEGER NOT NULL DEFAULT 1 CHECK (public_visible IN (0, 1)),
  UNIQUE (network, transaction_hash, transfer_index)
);
CREATE INDEX IF NOT EXISTS genesis_public_payments_identity_idx
  ON genesis_public_payments(identity_id, confirmed_at DESC);
CREATE INDEX IF NOT EXISTS genesis_public_payments_directory_idx
  ON genesis_public_payments(public_visible, confirmed_at DESC);

CREATE TABLE IF NOT EXISTS genesis_member_badges (
  badge_id TEXT PRIMARY KEY,
  identity_id TEXT NOT NULL REFERENCES genesis_wallet_identities(identity_id),
  badge_code TEXT NOT NULL CHECK (badge_code = 'GENESIS_MEMBER_DNA_GOLD'),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'REVOKED')),
  qualifying_payment_record_id TEXT NOT NULL UNIQUE REFERENCES genesis_public_payments(payment_record_id),
  rules_version TEXT NOT NULL,
  awarded_at INTEGER NOT NULL,
  UNIQUE (identity_id, badge_code)
);

CREATE TABLE IF NOT EXISTS genesis_member_privileges (
  privilege_code TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  availability TEXT NOT NULL DEFAULT 'PLANNED'
    CHECK (availability IN ('PLANNED', 'ACTIVE', 'RETIRED')),
  rules_version TEXT,
  activated_at INTEGER,
  updated_at INTEGER NOT NULL
);

INSERT OR IGNORE INTO genesis_member_privileges
(privilege_code, title, description, availability, updated_at)
VALUES
('PRIORITY_PROGRAMME_ACCESS', 'Priority programme access', 'Potential priority access to eligible future AstroCrown programmes; not active until separately approved.', 'PLANNED', unixepoch()),
('PREFERENTIAL_PRICING', 'Preferential pricing', 'Potential discounts or preferential terms on eligible future services; not active until separately approved.', 'PLANNED', unixepoch()),
('EARLY_ACCESS', 'Early access', 'Potential early access to selected features and initiatives; not active until separately approved.', 'PLANNED', unixepoch());

CREATE TABLE IF NOT EXISTS genesis_rate_limits (
  scope_digest TEXT PRIMARY KEY,
  window_started_at INTEGER NOT NULL,
  request_count INTEGER NOT NULL CHECK (request_count > 0),
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS genesis_rate_limits_cleanup_idx ON genesis_rate_limits(updated_at);

CREATE TRIGGER IF NOT EXISTS genesis_wallet_identity_activation_requires_qualifying_payment
BEFORE UPDATE OF genesis_member_status, genesis_member_awarded_at ON genesis_wallet_identities
WHEN NEW.genesis_member_status = 'ACTIVE'
 AND (
   NEW.genesis_member_awarded_at IS NULL
   OR NOT EXISTS (
     SELECT 1 FROM genesis_public_payments p
     WHERE p.identity_id = NEW.identity_id
       AND p.payment_kind = 'QUALIFYING_PAYMENT'
       AND p.finality_status = 'FINALIZED'
       AND p.confirmed_at = NEW.genesis_member_awarded_at
   )
 )
BEGIN SELECT RAISE(ABORT, 'Genesis Member status requires this wallet identity own finalized qualifying payment'); END;

CREATE TRIGGER IF NOT EXISTS genesis_public_payment_source_wallet_must_match
BEFORE INSERT ON genesis_public_payments
WHEN NOT EXISTS (
  SELECT 1 FROM genesis_wallet_addresses w
  WHERE w.wallet_address_id = NEW.source_wallet_address_id
    AND w.identity_id = NEW.identity_id
    AND w.network = NEW.network
    AND w.wallet_role IN ('PRIMARY', 'PAYMENT', 'PAYMENT_AND_DELIVERY')
)
BEGIN SELECT RAISE(ABORT, 'Genesis payment source must be a verified payment address of the same wallet identity and network'); END;

CREATE TRIGGER IF NOT EXISTS genesis_member_badge_requires_qualified_identity
BEFORE INSERT ON genesis_member_badges
WHEN NOT EXISTS (
  SELECT 1
  FROM genesis_wallet_identities i
  JOIN genesis_public_payments p ON p.payment_record_id = NEW.qualifying_payment_record_id
  WHERE i.identity_id = NEW.identity_id
    AND i.genesis_member_status = 'ACTIVE'
    AND i.genesis_member_awarded_at = NEW.awarded_at
    AND p.identity_id = i.identity_id
    AND p.payment_kind = 'QUALIFYING_PAYMENT'
    AND p.finality_status = 'FINALIZED'
)
BEGIN SELECT RAISE(ABORT, 'Genesis Member badge requires an active wallet identity and its own finalized qualifying payment'); END;

CREATE TRIGGER IF NOT EXISTS genesis_public_payments_no_update
BEFORE UPDATE ON genesis_public_payments
BEGIN SELECT RAISE(ABORT, 'Verified public payment records are immutable; use a correction event'); END;
CREATE TRIGGER IF NOT EXISTS genesis_public_payments_no_delete
BEFORE DELETE ON genesis_public_payments
BEGIN SELECT RAISE(ABORT, 'Verified public payment records are immutable; use a correction event'); END;

CREATE TRIGGER IF NOT EXISTS genesis_wallet_challenge_content_no_update
BEFORE UPDATE OF identity_id, network, address, address_normalized, challenge_purpose,
  wallet_role, requested_display_name, nonce_digest, domain, message_digest, message,
  created_at, expires_at
ON genesis_wallet_challenges
BEGIN SELECT RAISE(ABORT, 'Wallet challenge content is immutable'); END;

CREATE TRIGGER IF NOT EXISTS genesis_wallet_session_identity_no_update
BEFORE UPDATE OF identity_id, secret_digest, created_at, expires_at
ON genesis_wallet_sessions
BEGIN SELECT RAISE(ABORT, 'Wallet session identity is immutable'); END;
