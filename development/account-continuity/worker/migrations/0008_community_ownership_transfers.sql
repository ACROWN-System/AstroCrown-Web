-- Owner-controlled, successor-accepted community ownership handover.
-- A pending proposal does not change ownership. The intended successor must
-- accept while both parties remain active members and the proposer remains owner.

CREATE TABLE IF NOT EXISTS community_ownership_transfers (
  transfer_id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES community_spaces(space_id) ON DELETE CASCADE,
  from_account_id TEXT NOT NULL REFERENCES auth_accounts(account_id) ON DELETE CASCADE,
  to_account_id TEXT NOT NULL REFERENCES auth_accounts(account_id) ON DELETE CASCADE,
  transfer_status TEXT NOT NULL CHECK (transfer_status IN ('pending','accepted','declined','cancelled')),
  reason TEXT NOT NULL DEFAULT '',
  response_reason TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  responded_at INTEGER,
  cancelled_at INTEGER,
  CHECK (from_account_id <> to_account_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS community_ownership_transfers_pending_space_unique_idx
  ON community_ownership_transfers(space_id)
  WHERE transfer_status='pending';

CREATE INDEX IF NOT EXISTS community_ownership_transfers_recipient_idx
  ON community_ownership_transfers(to_account_id,transfer_status,created_at DESC);

CREATE INDEX IF NOT EXISTS community_ownership_transfers_initiator_idx
  ON community_ownership_transfers(from_account_id,transfer_status,created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS community_memberships_single_active_owner_idx
  ON community_memberships(space_id)
  WHERE membership_status='active' AND member_role='owner';
