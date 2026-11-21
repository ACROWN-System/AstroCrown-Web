-- Complete private/invite-only community membership lifecycle.
-- Invitations are account-bound, one-use, expiring and revocable. They do not
-- grant access until accepted by the invited AstroCrown account.

CREATE TABLE IF NOT EXISTS community_membership_invitations (
  invite_id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES community_spaces(space_id) ON DELETE CASCADE,
  invited_account_id TEXT NOT NULL REFERENCES auth_accounts(account_id) ON DELETE CASCADE,
  invited_by_account_id TEXT NOT NULL REFERENCES auth_accounts(account_id),
  invitation_status TEXT NOT NULL CHECK (invitation_status IN ('pending','accepted','declined','revoked','expired')),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  responded_at INTEGER,
  revoked_at INTEGER,
  CHECK (expires_at > created_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS community_membership_invites_pending_unique_idx
  ON community_membership_invitations(space_id, invited_account_id)
  WHERE invitation_status='pending';

CREATE INDEX IF NOT EXISTS community_membership_invites_inbox_idx
  ON community_membership_invitations(invited_account_id, invitation_status, expires_at, created_at DESC);

CREATE INDEX IF NOT EXISTS community_membership_invites_space_idx
  ON community_membership_invitations(space_id, invitation_status, created_at DESC);
