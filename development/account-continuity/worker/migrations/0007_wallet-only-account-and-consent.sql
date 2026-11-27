-- Wallet-only account lifecycle and explicit wallet-loss consent.
-- The primary wallet remains the sole ordinary account identity and recovery anchor.
ALTER TABLE auth_accounts ADD COLUMN wallet_loss_notice_version TEXT;
ALTER TABLE auth_accounts ADD COLUMN wallet_loss_accepted_at TEXT;

-- Expire sessions for accounts that have no active primary identity wallet.
DELETE FROM auth_sessions
WHERE account_id IN (
  SELECT a.account_id FROM auth_accounts a
  WHERE NOT EXISTS (
    SELECT 1 FROM auth_primary_wallets w
    WHERE w.account_id=a.account_id AND w.active=1
  )
);

-- Remove obsolete passkey-only test accounts where no immutable governance audit
-- record requires retention of the account identifier.
DELETE FROM auth_accounts
WHERE NOT EXISTS (
  SELECT 1 FROM auth_primary_wallets w
  WHERE w.account_id=auth_accounts.account_id AND w.active=1
)
AND NOT EXISTS (
  SELECT 1 FROM auth_admin_governance_audit g
  WHERE g.actor_account_id=auth_accounts.account_id
     OR g.target_account_id=auth_accounts.account_id
)
-- Administrator wallet audit is also append-only and protected by a no-delete
-- trigger. Never delete an account that has either governance or wallet audit.
AND NOT EXISTS (
  SELECT 1 FROM auth_admin_wallet_audit w
  WHERE w.account_id=auth_accounts.account_id
)
-- Preserve accounts that granted permissions to other administrator accounts;
-- these foreign-key references do not cascade on deletion.
AND NOT EXISTS (
  SELECT 1 FROM auth_admin_roles r
  WHERE r.granted_by_account_id=auth_accounts.account_id
)
AND NOT EXISTS (
  SELECT 1 FROM auth_admin_permissions p
  WHERE p.granted_by_account_id=auth_accounts.account_id
);

-- No ordinary AstroCrown account uses passkeys or recovery keys after this migration.
DELETE FROM auth_security_audit
WHERE event_type IN (
  'account_created_with_passkey',
  'passkey_sign_in',
  'passkey_added',
  'passkey_renamed',
  'passkey_revoked',
  'account_recovered_with_recovery_key',
  'security_step_up_verified'
);

DROP INDEX IF EXISTS auth_sessions_credential_idx;
ALTER TABLE auth_sessions DROP COLUMN authenticated_credential_id;

DROP TABLE IF EXISTS auth_security_stepups;
DROP TABLE IF EXISTS auth_recovery_keys;
DROP TABLE IF EXISTS auth_challenges;
DROP TABLE IF EXISTS auth_passkeys;
