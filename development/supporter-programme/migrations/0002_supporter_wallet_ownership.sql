-- Supporter Programme member wallet verification and session lifecycle.
-- This migration stores only public wallet addresses, signed challenge text,
-- one-way digests, pseudonyms and short-lived session digests.
-- No seed phrases, private keys, raw session tokens or payment secrets are stored.

ALTER TABLE supporter_members ADD COLUMN registration_verified_at INTEGER;
ALTER TABLE supporter_members ADD COLUMN registration_expires_at INTEGER;

ALTER TABLE supporter_wallet_challenges
  ADD COLUMN challenge_purpose TEXT NOT NULL DEFAULT 'REGISTER'
  CHECK (challenge_purpose IN ('REGISTER', 'LOGIN', 'LINK_WALLET', 'DELIVERY'));

ALTER TABLE supporter_wallet_challenges
  ADD COLUMN wallet_role TEXT NOT NULL DEFAULT 'PAYMENT'
  CHECK (wallet_role IN ('PAYMENT', 'ACROWN_DELIVERY', 'PAYMENT_AND_DELIVERY'));

ALTER TABLE supporter_wallet_challenges
  ADD COLUMN message TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS supporter_challenges_member_purpose_idx
  ON supporter_wallet_challenges(member_id, challenge_purpose, expires_at);

CREATE TABLE IF NOT EXISTS supporter_member_sessions (
  session_id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES supporter_members(member_id),
  secret_digest TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  last_used_at INTEGER NOT NULL,
  revoked_at INTEGER,
  CHECK (expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS supporter_sessions_member_idx
  ON supporter_member_sessions(member_id, expires_at);

CREATE TABLE IF NOT EXISTS supporter_rate_limits (
  scope_digest TEXT PRIMARY KEY,
  window_started_at INTEGER NOT NULL,
  request_count INTEGER NOT NULL CHECK (request_count > 0),
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS supporter_rate_limits_cleanup_idx
  ON supporter_rate_limits(updated_at);

CREATE TRIGGER IF NOT EXISTS supporter_session_digest_no_update
BEFORE UPDATE OF secret_digest, member_id, created_at, expires_at ON supporter_member_sessions
BEGIN SELECT RAISE(ABORT, 'Supporter session identity is immutable'); END;

CREATE TRIGGER IF NOT EXISTS supporter_wallet_challenge_content_no_update
BEFORE UPDATE OF member_id, network, address_normalized, nonce_digest, domain,
  message_digest, created_at, expires_at, challenge_purpose, wallet_role, message
ON supporter_wallet_challenges
BEGIN SELECT RAISE(ABORT, 'Supporter wallet challenge content is immutable'); END;
