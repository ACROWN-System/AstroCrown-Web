-- Genesis programme profile and entitlement data now use the authenticated
-- AstroCrown primary-wallet account. Remove only the obsolete secondary login
-- sessions/challenges; retain programme controls and immutable payment/ledger data.

DROP INDEX IF EXISTS genesis_wallet_sessions_identity_idx;
DROP TRIGGER IF EXISTS genesis_wallet_session_identity_no_update;
DROP TABLE IF EXISTS genesis_wallet_sessions;
DELETE FROM genesis_wallet_challenges WHERE challenge_purpose = 'IDENTIFY';

-- The older standalone supporter login lifecycle is retired. These tables
-- contain only disposable authentication sessions, challenges and rate-limit
-- counters; historical contribution, purchase, entitlement and public-ledger
-- tables are deliberately retained.
DROP INDEX IF EXISTS supporter_challenges_expiry_idx;
DROP INDEX IF EXISTS supporter_challenges_member_purpose_idx;
DROP TABLE IF EXISTS supporter_wallet_challenges;

DROP INDEX IF EXISTS supporter_sessions_member_idx;
DROP TABLE IF EXISTS supporter_member_sessions;

DROP INDEX IF EXISTS supporter_rate_limits_cleanup_idx;
DROP TABLE IF EXISTS supporter_rate_limits;
