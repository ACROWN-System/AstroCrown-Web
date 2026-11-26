-- The ordinary AstroCrown account is wallet-primary only.
-- Remove the retired passkey credential, challenge, recovery-key and WebAuthn step-up stores.
-- No remote staging deployment has been activated; these stores contain no live user credentials.
DROP TABLE IF EXISTS auth_security_stepups;
DROP TABLE IF EXISTS auth_recovery_keys;
DROP TABLE IF EXISTS auth_challenges;
DROP TABLE IF EXISTS auth_passkeys;

-- Session references and credential bindings existed only to support the retired
-- passkey-management UI. Wallet-primary sessions are identified by their random
-- token hash and account ID; they do not need either field.
DROP INDEX IF EXISTS auth_sessions_ref_idx;
DROP INDEX IF EXISTS auth_sessions_credential_idx;
ALTER TABLE auth_sessions DROP COLUMN session_ref;
ALTER TABLE auth_sessions DROP COLUMN authenticated_credential_id;
