CREATE TABLE IF NOT EXISTS auth_accounts (
  account_id TEXT PRIMARY KEY,
  account_identifier TEXT NOT NULL UNIQUE COLLATE NOCASE,
  user_handle TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  avatar_id TEXT NOT NULL DEFAULT 'person'
    CHECK (avatar_id IN ('person','crown','star','moon','orbit','shield')),
  referral_id TEXT NOT NULL DEFAULT '',
  terms_version TEXT NOT NULL,
  terms_accepted_at TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role = 'user')
);

CREATE TABLE IF NOT EXISTS auth_passkeys (
  credential_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES auth_accounts(account_id) ON DELETE CASCADE,
  public_key_b64 TEXT NOT NULL,
  credential_alg INTEGER NOT NULL,
  sign_count INTEGER NOT NULL DEFAULT 0 CHECK (sign_count >= 0),
  transports_json TEXT NOT NULL DEFAULT '[]',
  device_type TEXT NOT NULL DEFAULT 'unknown',
  backed_up INTEGER NOT NULL DEFAULT 0 CHECK (backed_up IN (0,1)),
  created_at TEXT NOT NULL,
  last_used_at TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1))
);
CREATE INDEX IF NOT EXISTS auth_passkeys_account_active_idx ON auth_passkeys(account_id, active);

CREATE TABLE IF NOT EXISTS auth_challenges (
  challenge_id TEXT PRIMARY KEY,
  challenge TEXT NOT NULL,
  ceremony TEXT NOT NULL CHECK (ceremony IN ('registration','authentication','recovery')),
  account_id TEXT,
  account_identifier TEXT,
  user_handle TEXT,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at TEXT
);
CREATE INDEX IF NOT EXISTS auth_challenges_expiry_idx ON auth_challenges(expires_at, used_at, ceremony);

CREATE TABLE IF NOT EXISTS auth_recovery_keys (
  account_id TEXT NOT NULL REFERENCES auth_accounts(account_id) ON DELETE CASCADE,
  key_version INTEGER NOT NULL CHECK (key_version > 0),
  salt_b64 TEXT NOT NULL,
  verifier_b64 TEXT NOT NULL,
  created_at TEXT NOT NULL,
  used_at TEXT,
  PRIMARY KEY (account_id, key_version)
);
CREATE INDEX IF NOT EXISTS auth_recovery_keys_active_idx ON auth_recovery_keys(account_id, used_at, key_version);

CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES auth_accounts(account_id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS auth_sessions_account_expiry_idx ON auth_sessions(account_id, expires_at);

CREATE TABLE IF NOT EXISTS auth_rate_events (
  event_id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  subject_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS auth_rate_events_window_idx ON auth_rate_events(action, subject_hash, created_at);

CREATE TABLE IF NOT EXISTS auth_security_audit (
  audit_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES auth_accounts(account_id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  created_at TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS auth_security_audit_account_idx ON auth_security_audit(account_id, created_at);
