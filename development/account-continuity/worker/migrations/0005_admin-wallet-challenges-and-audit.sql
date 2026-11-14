-- Short-lived, account/session/purpose-bound EIP-4361 challenge storage.
-- Raw signatures are never stored. The exact server-generated message is
-- retained only until expiry/consumption so the verifier can compare bytes.
CREATE TABLE IF NOT EXISTS auth_admin_wallet_challenges (
  challenge_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES auth_accounts(account_id) ON DELETE CASCADE,
  session_token_hash TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (
    purpose IN ('initial-wallet-enrollment','wallet-enrollment','admin-session-step-up')
  ),
  actor_wallet_address TEXT,
  address TEXT NOT NULL COLLATE NOCASE,
  chain_id INTEGER NOT NULL CHECK (chain_id > 0),
  message TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at TEXT
);
CREATE INDEX IF NOT EXISTS auth_admin_wallet_challenges_expiry_idx
  ON auth_admin_wallet_challenges(account_id,purpose,expires_at,used_at);

-- Separate append-only evidence for wallet enrollment, revocation and step-up.
CREATE TABLE IF NOT EXISTS auth_admin_wallet_audit (
  audit_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (
    event_type IN ('admin_wallet_enrolled','admin_wallet_revoked','admin_session_authorized','admin_session_ended')
  ),
  account_id TEXT NOT NULL REFERENCES auth_accounts(account_id) ON DELETE CASCADE,
  wallet_id TEXT,
  address TEXT,
  chain_id INTEGER,
  created_at TEXT NOT NULL,
  detail_json TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS auth_admin_wallet_audit_account_idx
  ON auth_admin_wallet_audit(account_id,created_at);

CREATE TRIGGER IF NOT EXISTS auth_admin_wallet_audit_no_update
BEFORE UPDATE ON auth_admin_wallet_audit
BEGIN
  SELECT RAISE(ABORT, 'administrator wallet audit is append-only');
END;
CREATE TRIGGER IF NOT EXISTS auth_admin_wallet_audit_no_delete
BEFORE DELETE ON auth_admin_wallet_audit
BEGIN
  SELECT RAISE(ABORT, 'administrator wallet audit is append-only');
END;
