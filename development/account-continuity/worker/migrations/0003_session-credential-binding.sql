-- Keep each session linked to the passkey that established it.
ALTER TABLE auth_sessions ADD COLUMN authenticated_credential_id TEXT;

-- Sessions issued before credential binding cannot be safely attributed to a
-- specific authenticator. Expire them so they must re-authenticate and obtain
-- an attributable session before any credential-revocation operation.
UPDATE auth_sessions
SET expires_at = 0
WHERE authenticated_credential_id IS NULL;

CREATE INDEX IF NOT EXISTS auth_sessions_credential_idx
  ON auth_sessions(account_id, authenticated_credential_id, expires_at);
