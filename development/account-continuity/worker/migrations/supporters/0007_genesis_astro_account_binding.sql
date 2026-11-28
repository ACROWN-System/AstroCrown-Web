-- Bind each Genesis programme profile to exactly one AstroCrown account.
-- Existing programme ledger/profile IDs remain stable for historical foreign keys;
-- this column is the authoritative account linkage, not a separate login identity.
ALTER TABLE genesis_wallet_identities ADD COLUMN astro_account_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS genesis_wallet_identities_astro_account_idx
  ON genesis_wallet_identities(astro_account_id)
  WHERE astro_account_id IS NOT NULL;
