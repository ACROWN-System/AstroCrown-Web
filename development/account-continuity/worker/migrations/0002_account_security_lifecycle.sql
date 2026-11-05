-- Add user-visible opaque identifiers without exposing credential IDs or session hashes.
ALTER TABLE auth_passkeys ADD COLUMN passkey_ref TEXT;
ALTER TABLE auth_passkeys ADD COLUMN display_label TEXT NOT NULL DEFAULT 'Passkey';
UPDATE auth_passkeys
SET passkey_ref = lower(hex(randomblob(16)))
WHERE passkey_ref IS NULL OR passkey_ref = '';
CREATE UNIQUE INDEX IF NOT EXISTS auth_passkeys_ref_idx ON auth_passkeys(passkey_ref);

ALTER TABLE auth_sessions ADD COLUMN session_ref TEXT;
UPDATE auth_sessions
SET session_ref = lower(hex(randomblob(16)))
WHERE session_ref IS NULL OR session_ref = '';
CREATE UNIQUE INDEX IF NOT EXISTS auth_sessions_ref_idx ON auth_sessions(session_ref);

-- A short-lived, one-use grant is minted only after a fresh WebAuthn assertion.
-- Only a hash of the bearer token is stored; grants are bound to the account and
-- the exact browser session that requested the step-up.
CREATE TABLE IF NOT EXISTS auth_security_stepups (
  stepup_token_hash TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES auth_accounts(account_id) ON DELETE CASCADE,
  session_token_hash TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (
    purpose IN ('manage-passkeys','manage-sessions','rotate-recovery-key')
  ),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at TEXT
);
CREATE INDEX IF NOT EXISTS auth_security_stepups_expiry_idx
  ON auth_security_stepups(account_id, purpose, expires_at, used_at);
