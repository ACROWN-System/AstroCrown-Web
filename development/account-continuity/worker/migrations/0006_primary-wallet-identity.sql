-- One authoritative wallet identity per ordinary AstroCrown account.
-- Transaction wallets are deliberately not represented in this table.
CREATE TABLE IF NOT EXISTS auth_primary_wallets (
  wallet_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL UNIQUE REFERENCES auth_accounts(account_id) ON DELETE CASCADE,
  network TEXT NOT NULL CHECK (network IN ('ethereum','tron','solana')),
  address TEXT NOT NULL,
  address_normalized TEXT NOT NULL,
  proof_method TEXT NOT NULL CHECK (proof_method IN ('EIP-191','TIP-191','ED25519')),
  linked_at INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  UNIQUE (network,address_normalized)
);
CREATE INDEX IF NOT EXISTS auth_primary_wallets_account_active_idx
  ON auth_primary_wallets(account_id,active);

-- Only short-lived proof challenges are stored. Raw wallet signatures are never stored.
CREATE TABLE IF NOT EXISTS auth_wallet_challenges (
  challenge_id TEXT PRIMARY KEY,
  intent TEXT NOT NULL CHECK (intent IN ('register','login')),
  account_id TEXT REFERENCES auth_accounts(account_id) ON DELETE CASCADE,
  network TEXT NOT NULL CHECK (network IN ('ethereum','tron','solana')),
  address TEXT NOT NULL,
  address_normalized TEXT NOT NULL,
  nonce_digest TEXT NOT NULL,
  domain TEXT NOT NULL,
  message_digest TEXT NOT NULL,
  message TEXT NOT NULL,
  terms_version TEXT,
  referral_id TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER
);
CREATE INDEX IF NOT EXISTS auth_wallet_challenges_expiry_idx
  ON auth_wallet_challenges(expires_at,used_at,intent);
