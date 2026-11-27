-- One non-custodial primary identity wallet per ordinary AstroCrown account.
-- Only public address, chain metadata and proof lifecycle are stored. No wallet
-- private key, seed phrase, extended private key or recovery secret is stored.
CREATE TABLE IF NOT EXISTS auth_primary_wallets (
  wallet_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL UNIQUE REFERENCES auth_accounts(account_id) ON DELETE CASCADE,
  address TEXT NOT NULL COLLATE NOCASE UNIQUE,
  chain_id INTEGER NOT NULL CHECK (chain_id > 0),
  created_at TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  proof_type TEXT NOT NULL CHECK (proof_type = 'eip191-personal-sign')
);
CREATE INDEX IF NOT EXISTS auth_primary_wallets_account_active_idx
  ON auth_primary_wallets(account_id, active);

-- Short-lived one-use sign-in challenges. Messages are origin, address, chain,
-- nonce and expiry bound. The signature itself is never persisted.
CREATE TABLE IF NOT EXISTS auth_primary_wallet_challenges (
  challenge_id TEXT PRIMARY KEY,
  address TEXT NOT NULL COLLATE NOCASE,
  chain_id INTEGER NOT NULL CHECK (chain_id > 0),
  message TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at TEXT
);
CREATE INDEX IF NOT EXISTS auth_primary_wallet_challenges_expiry_idx
  ON auth_primary_wallet_challenges(expires_at, used_at, created_at);
