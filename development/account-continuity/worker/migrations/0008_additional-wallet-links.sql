-- Additional wallets are optional capability extensions, never account owners.
-- Re-linking a previously revoked wallet requires fresh owner and wallet proofs
-- and a fresh explicit wallet-capabilities authorization.
CREATE TABLE IF NOT EXISTS auth_linked_wallets (
  link_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES auth_accounts(account_id) ON DELETE CASCADE,
  address TEXT NOT NULL COLLATE NOCASE,
  chain_id INTEGER NOT NULL CHECK (chain_id > 0),
  family TEXT NOT NULL CHECK (family = 'evm-eoa'),
  linked_at TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  revoked_at TEXT,
  permission_scope TEXT NOT NULL CHECK (permission_scope = 'wallet-capabilities-only'),
  permission_authorized_at TEXT,
  UNIQUE (account_id, address),
  CHECK (
    (active = 1 AND revoked_at IS NULL AND permission_authorized_at IS NOT NULL)
    OR
    (active = 0 AND revoked_at IS NOT NULL AND permission_authorized_at IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS auth_linked_wallets_one_active_owner_idx
  ON auth_linked_wallets(address)
  WHERE active = 1;

CREATE INDEX IF NOT EXISTS auth_linked_wallets_account_active_idx
  ON auth_linked_wallets(account_id, active, linked_at);

CREATE TABLE IF NOT EXISTS auth_wallet_link_challenges (
  challenge_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES auth_accounts(account_id) ON DELETE CASCADE,
  session_token_hash TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('link', 'unlink')),
  owner_address TEXT NOT NULL COLLATE NOCASE,
  owner_chain_id INTEGER NOT NULL CHECK (owner_chain_id > 0),
  address TEXT NOT NULL COLLATE NOCASE,
  chain_id INTEGER NOT NULL CHECK (chain_id > 0),
  message TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at TEXT
);

CREATE INDEX IF NOT EXISTS auth_wallet_link_challenges_expiry_idx
  ON auth_wallet_link_challenges(expires_at, used_at, created_at);

CREATE INDEX IF NOT EXISTS auth_wallet_link_challenges_account_idx
  ON auth_wallet_link_challenges(account_id, session_token_hash, action);
