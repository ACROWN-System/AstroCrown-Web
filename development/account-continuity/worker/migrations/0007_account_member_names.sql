-- Public member names are separate from account IDs, wallet addresses and passkey user handles.
ALTER TABLE auth_accounts ADD COLUMN member_name TEXT;
ALTER TABLE auth_accounts ADD COLUMN member_name_normalized TEXT;

-- Existing development accounts receive stable, unique defaults derived from their
-- already-unique public account identifier. Future accounts receive a default in
-- the registration transaction, not through a shared SQL constant.
UPDATE auth_accounts
SET member_name = 'Crown_' || substr(account_identifier, 4),
    member_name_normalized = lower('Crown_' || substr(account_identifier, 4))
WHERE member_name IS NULL OR member_name_normalized IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS auth_accounts_member_name_normalized_uq
  ON auth_accounts(member_name_normalized COLLATE NOCASE);
