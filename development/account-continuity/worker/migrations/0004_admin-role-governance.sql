-- Server-owned administrator role and permission authority.
-- Ordinary account identity remains in auth_accounts and is never derived
-- from a wallet address or client-supplied role field.

ALTER TABLE auth_sessions ADD COLUMN admin_wallet_address TEXT;
ALTER TABLE auth_sessions ADD COLUMN admin_authenticated_at INTEGER;
ALTER TABLE auth_sessions ADD COLUMN admin_expires_at INTEGER;

CREATE TABLE IF NOT EXISTS auth_admin_roles (
  account_id TEXT PRIMARY KEY REFERENCES auth_accounts(account_id) ON DELETE CASCADE,
  granted_by_account_id TEXT REFERENCES auth_accounts(account_id),
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_admin_permissions (
  account_id TEXT NOT NULL REFERENCES auth_admin_roles(account_id) ON DELETE CASCADE,
  permission TEXT NOT NULL CHECK (
    permission IN ('admin.roles.grant','admin.roles.revoke','admin.messages.send')
  ),
  can_delegate INTEGER NOT NULL DEFAULT 0 CHECK (can_delegate IN (0,1)),
  granted_by_account_id TEXT REFERENCES auth_accounts(account_id),
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (account_id, permission)
);
CREATE INDEX IF NOT EXISTS auth_admin_permissions_lookup_idx
  ON auth_admin_permissions(account_id, permission, can_delegate);

-- First adapter is EVM/SIWE. Wallet records remain distinct from account
-- identity and do not grant a role; a fresh signature is still required.
CREATE TABLE IF NOT EXISTS auth_admin_wallets (
  wallet_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES auth_accounts(account_id) ON DELETE CASCADE,
  address TEXT NOT NULL COLLATE NOCASE UNIQUE,
  chain_id INTEGER NOT NULL CHECK (chain_id > 0),
  created_at TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  provisioning_source TEXT NOT NULL DEFAULT 'account-holder-enrollment'
);
CREATE INDEX IF NOT EXISTS auth_admin_wallets_account_active_idx
  ON auth_admin_wallets(account_id, active);

CREATE TABLE IF NOT EXISTS auth_admin_governance_audit (
  audit_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (
    event_type IN ('admin_role_granted','admin_role_revoked')
  ),
  actor_account_id TEXT REFERENCES auth_accounts(account_id),
  target_account_id TEXT NOT NULL REFERENCES auth_accounts(account_id),
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL,
  detail_json TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS auth_admin_governance_audit_target_idx
  ON auth_admin_governance_audit(target_account_id, created_at);
CREATE INDEX IF NOT EXISTS auth_admin_governance_audit_actor_idx
  ON auth_admin_governance_audit(actor_account_id, created_at);

CREATE TABLE IF NOT EXISTS auth_admin_revocation_notices (
  notice_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES auth_accounts(account_id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL,
  acknowledged_at TEXT
);
CREATE INDEX IF NOT EXISTS auth_admin_revocation_notices_account_idx
  ON auth_admin_revocation_notices(account_id, created_at, acknowledged_at);
