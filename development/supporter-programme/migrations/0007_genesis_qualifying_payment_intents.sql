-- Genesis qualifying-payment intent and settlement foundation.
-- The proposed USDT 50,000 / 1,000,000 five-tranche schedule is NOT activated here.
-- Payment acceptance requires explicit environment approval and a matching independently
-- reconciled receipt from the AstroCrown-owned treasury monitor.
PRAGMA foreign_keys = ON;

ALTER TABLE genesis_wallet_identities ADD COLUMN terms_version TEXT;
ALTER TABLE genesis_wallet_identities ADD COLUMN terms_accepted_at INTEGER;

ALTER TABLE genesis_programme_allowance_state
  ADD COLUMN qualifying_principal_usdt_base_units TEXT NOT NULL DEFAULT '0'
  CHECK (length(qualifying_principal_usdt_base_units) > 0
    AND qualifying_principal_usdt_base_units NOT GLOB '*[^0-9]*');
ALTER TABLE genesis_programme_allowance_state
  ADD COLUMN pending_qualifying_principal_usdt_base_units TEXT NOT NULL DEFAULT '0'
  CHECK (length(pending_qualifying_principal_usdt_base_units) > 0
    AND pending_qualifying_principal_usdt_base_units NOT GLOB '*[^0-9]*');

CREATE TABLE IF NOT EXISTS genesis_payment_intents (
  payment_intent_id TEXT PRIMARY KEY,
  identity_id TEXT NOT NULL REFERENCES genesis_wallet_identities(identity_id),
  source_wallet_address_id TEXT NOT NULL REFERENCES genesis_wallet_addresses(wallet_address_id),
  network TEXT NOT NULL CHECK (network IN ('ethereum', 'tron', 'solana')),
  asset_identifier TEXT NOT NULL,
  treasury_address TEXT NOT NULL,
  amount_base_units TEXT NOT NULL CHECK (
    length(amount_base_units) > 0
    AND amount_base_units NOT GLOB '*[^0-9]*'
    AND amount_base_units != '0'
  ),
  amount_display TEXT NOT NULL,
  principal_start_base_units TEXT NOT NULL CHECK (
    length(principal_start_base_units) > 0
    AND principal_start_base_units NOT GLOB '*[^0-9]*'
  ),
  principal_end_base_units TEXT NOT NULL CHECK (
    length(principal_end_base_units) > 0
    AND principal_end_base_units NOT GLOB '*[^0-9]*'
  ),
  allowance_credit_usdt_base_units TEXT NOT NULL CHECK (
    length(allowance_credit_usdt_base_units) > 0
    AND allowance_credit_usdt_base_units NOT GLOB '*[^0-9]*'
    AND allowance_credit_usdt_base_units != '0'
  ),
  tier_breakdown_json TEXT NOT NULL,
  rules_version TEXT NOT NULL,
  terms_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN', 'CONFIRMED', 'CANCELLED', 'EXPIRED')),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  receipt_id TEXT REFERENCES genesis_treasury_receipts(receipt_id),
  payment_record_id TEXT UNIQUE REFERENCES genesis_public_payments(payment_record_id),
  confirmed_at INTEGER,
  settled_principal_start_base_units TEXT,
  settled_principal_end_base_units TEXT,
  settled_allowance_credit_usdt_base_units TEXT,
  settled_tier_breakdown_json TEXT,
  CHECK (expires_at > created_at),
  CHECK (
    (status = 'CONFIRMED' AND receipt_id IS NOT NULL AND payment_record_id IS NOT NULL AND confirmed_at IS NOT NULL)
    OR (status != 'CONFIRMED' AND payment_record_id IS NULL AND confirmed_at IS NULL)
  )
);


-- Qualifying-payment records carry their unique intent and reconciled receipt references.
ALTER TABLE genesis_public_payments
  ADD COLUMN payment_intent_id TEXT REFERENCES genesis_payment_intents(payment_intent_id);
ALTER TABLE genesis_public_payments
  ADD COLUMN receipt_id TEXT REFERENCES genesis_treasury_receipts(receipt_id);
ALTER TABLE genesis_public_payments
  ADD COLUMN allowance_credit_usdt_base_units TEXT NOT NULL DEFAULT '0'
  CHECK (length(allowance_credit_usdt_base_units) > 0
    AND allowance_credit_usdt_base_units NOT GLOB '*[^0-9]*');
ALTER TABLE genesis_public_payments
  ADD COLUMN receipt_finality_status TEXT NOT NULL DEFAULT 'FINALIZED'
  CHECK (receipt_finality_status IN ('FINALIZED', 'SOLIDIFIED'));
ALTER TABLE genesis_public_payments
  ADD COLUMN settled_principal_start_base_units TEXT NOT NULL DEFAULT '0'
  CHECK (length(settled_principal_start_base_units) > 0
    AND settled_principal_start_base_units NOT GLOB '*[^0-9]*');
ALTER TABLE genesis_public_payments
  ADD COLUMN settled_principal_end_base_units TEXT NOT NULL DEFAULT '0'
  CHECK (length(settled_principal_end_base_units) > 0
    AND settled_principal_end_base_units NOT GLOB '*[^0-9]*');
ALTER TABLE genesis_public_payments
  ADD COLUMN settled_tier_breakdown_json TEXT NOT NULL DEFAULT '[]'
  CHECK (json_valid(settled_tier_breakdown_json));

-- The proposed allowance cap remains a rules value, not a live activation switch.
UPDATE genesis_programme_allowance_state
SET allowance_cap_usdt_base_units='1000000000000'
WHERE singleton=1 AND allowance_cap_usdt_base_units IS NULL;

-- Each Genesis profile may have one open intent. Different profiles may reserve
-- consecutive slices of the same global principal range concurrently.
CREATE UNIQUE INDEX IF NOT EXISTS genesis_one_open_qualifying_payment_intent_per_identity
  ON genesis_payment_intents(identity_id) WHERE status='OPEN';
CREATE INDEX IF NOT EXISTS genesis_payment_intents_identity_idx
  ON genesis_payment_intents(identity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS genesis_payment_intents_expiry_idx
  ON genesis_payment_intents(status, expires_at);
CREATE INDEX IF NOT EXISTS genesis_payment_intents_receipt_idx
  ON genesis_payment_intents(receipt_id);

CREATE TRIGGER IF NOT EXISTS genesis_payment_intent_source_wallet_guard
BEFORE INSERT ON genesis_payment_intents
WHEN NOT EXISTS (
  SELECT 1
  FROM genesis_wallet_addresses w
  JOIN genesis_wallet_identities i ON i.identity_id=w.identity_id
  WHERE w.wallet_address_id=NEW.source_wallet_address_id
    AND w.identity_id=NEW.identity_id
    AND w.network=NEW.network
    AND w.wallet_role IN ('PRIMARY', 'PAYMENT', 'PAYMENT_AND_DELIVERY')
    AND w.ownership_verified_at IS NOT NULL
    AND w.proof_method IS NOT NULL
    AND i.identity_status='ACTIVE'
    AND i.terms_version=NEW.terms_version
    AND i.terms_accepted_at IS NOT NULL
)
BEGIN SELECT RAISE(ABORT, 'Genesis payment intent requires an active identity, accepted current terms and a verified same-network payment address'); END;

CREATE TRIGGER IF NOT EXISTS genesis_payment_intent_pool_reservation_guard
BEFORE INSERT ON genesis_payment_intents
WHEN NOT EXISTS (
  SELECT 1 FROM genesis_programme_allowance_state s
  WHERE s.singleton=1
    AND CAST(s.qualifying_principal_usdt_base_units AS INTEGER)+
        CAST(s.pending_qualifying_principal_usdt_base_units AS INTEGER)=CAST(NEW.principal_start_base_units AS INTEGER)
    AND CAST(NEW.principal_end_base_units AS INTEGER)=
        CAST(NEW.principal_start_base_units AS INTEGER)+CAST(NEW.amount_base_units AS INTEGER)
    AND CAST(NEW.principal_end_base_units AS INTEGER)<=50000000000
    AND CAST(s.qualifying_principal_usdt_base_units AS INTEGER)+
        CAST(s.pending_qualifying_principal_usdt_base_units AS INTEGER)+
        CAST(NEW.amount_base_units AS INTEGER)<=50000000000
)
BEGIN SELECT RAISE(ABORT, 'Genesis qualifying-payment intent exceeds or conflicts with the global USDT 50,000 principal reservation'); END;

CREATE TRIGGER IF NOT EXISTS genesis_payment_intent_reserve_principal
AFTER INSERT ON genesis_payment_intents
BEGIN
  UPDATE genesis_programme_allowance_state
  SET pending_qualifying_principal_usdt_base_units=
        CAST(pending_qualifying_principal_usdt_base_units AS INTEGER)+CAST(NEW.amount_base_units AS INTEGER),
      updated_at=MAX(updated_at, NEW.created_at)
  WHERE singleton=1;
END;

CREATE TRIGGER IF NOT EXISTS genesis_payment_intent_content_immutable
BEFORE UPDATE OF payment_intent_id,identity_id,source_wallet_address_id,network,asset_identifier,
  treasury_address,amount_base_units,amount_display,principal_start_base_units,principal_end_base_units,
  allowance_credit_usdt_base_units,tier_breakdown_json,rules_version,terms_version,created_at,expires_at
ON genesis_payment_intents
BEGIN SELECT RAISE(ABORT, 'Genesis payment intent terms and tranche allocation are immutable'); END;

CREATE TRIGGER IF NOT EXISTS genesis_payment_intent_transition_guard
BEFORE UPDATE OF status ON genesis_payment_intents
WHEN NOT (
  OLD.status='OPEN'
  AND NEW.status IN ('CONFIRMED', 'CANCELLED', 'EXPIRED')
)
BEGIN SELECT RAISE(ABORT, 'Genesis payment intent status transition is invalid'); END;

CREATE TRIGGER IF NOT EXISTS genesis_payment_intent_expiry_guard
BEFORE UPDATE OF status ON genesis_payment_intents
WHEN OLD.status='OPEN' AND NEW.status='EXPIRED' AND OLD.expires_at>unixepoch()
BEGIN SELECT RAISE(ABORT, 'A Genesis payment intent cannot expire before its deadline'); END;

CREATE TRIGGER IF NOT EXISTS genesis_payment_intent_release_principal
AFTER UPDATE OF status ON genesis_payment_intents
WHEN OLD.status='OPEN' AND NEW.status IN ('CANCELLED', 'EXPIRED')
BEGIN
  UPDATE genesis_programme_allowance_state
  SET pending_qualifying_principal_usdt_base_units=
        CAST(pending_qualifying_principal_usdt_base_units AS INTEGER)-CAST(OLD.amount_base_units AS INTEGER),
      updated_at=MAX(updated_at, unixepoch())
  WHERE singleton=1
    AND CAST(pending_qualifying_principal_usdt_base_units AS INTEGER)>=CAST(OLD.amount_base_units AS INTEGER);
END;

CREATE TRIGGER IF NOT EXISTS genesis_qualifying_payment_settlement_global_balance_guard
BEFORE INSERT ON genesis_public_payments
WHEN NEW.payment_kind='QUALIFYING_PAYMENT'
 AND NOT EXISTS (
   SELECT 1 FROM genesis_programme_allowance_state s
   WHERE s.singleton=1
     AND CAST(s.pending_qualifying_principal_usdt_base_units AS INTEGER)>=CAST(NEW.amount_base_units AS INTEGER)
     AND CAST(s.qualifying_principal_usdt_base_units AS INTEGER)=CAST(NEW.settled_principal_start_base_units AS INTEGER)
     AND CAST(NEW.settled_principal_end_base_units AS INTEGER)=
         CAST(NEW.settled_principal_start_base_units AS INTEGER)+CAST(NEW.amount_base_units AS INTEGER)
     AND CAST(NEW.settled_principal_end_base_units AS INTEGER)<=50000000000
     AND CAST(s.qualifying_principal_usdt_base_units AS INTEGER)+CAST(NEW.amount_base_units AS INTEGER)<=50000000000
     AND CAST(s.earned_usdt_base_units AS INTEGER)+CAST(NEW.allowance_credit_usdt_base_units AS INTEGER)+
         CAST(s.reserved_usdt_base_units AS INTEGER)+CAST(s.consumed_usdt_base_units AS INTEGER)<=1000000000000
     AND CAST(NEW.allowance_credit_usdt_base_units AS INTEGER)>0
     AND json_valid(NEW.settled_tier_breakdown_json)
     AND (SELECT COALESCE(SUM(CAST(json_extract(j.value,'$.qualifyingPrincipalBaseUnits') AS INTEGER)),0)
          FROM json_each(NEW.settled_tier_breakdown_json) j)=CAST(NEW.amount_base_units AS INTEGER)
     AND (SELECT COALESCE(SUM(CAST(json_extract(j.value,'$.allowanceBaseUnits') AS INTEGER)),0)
          FROM json_each(NEW.settled_tier_breakdown_json) j)=CAST(NEW.allowance_credit_usdt_base_units AS INTEGER)
     AND NOT EXISTS (
       SELECT 1 FROM json_each(NEW.settled_tier_breakdown_json) j
       WHERE CAST(json_extract(j.value,'$.tranche') AS INTEGER) NOT BETWEEN 1 AND 5
         OR CAST(json_extract(j.value,'$.multiplierNumerator') AS INTEGER) !=
           CASE CAST(json_extract(j.value,'$.tranche') AS INTEGER)
             WHEN 1 THEN 30 WHEN 2 THEN 25 WHEN 3 THEN 20 WHEN 4 THEN 15 WHEN 5 THEN 10 ELSE -1 END
         OR CAST(json_extract(j.value,'$.multiplierDenominator') AS INTEGER) != 1
     )
 )
BEGIN SELECT RAISE(ABORT, 'Genesis qualifying payment would exceed or mismatch the reserved global principal or allowance balance'); END;

CREATE TRIGGER IF NOT EXISTS genesis_qualifying_payment_requires_matching_intent_and_receipt
BEFORE INSERT ON genesis_public_payments
WHEN NEW.payment_kind='QUALIFYING_PAYMENT'
 AND NOT EXISTS (
   SELECT 1
   FROM genesis_payment_intents p
   JOIN genesis_treasury_receipts r ON r.receipt_id=NEW.receipt_id
   JOIN genesis_wallet_addresses w ON w.wallet_address_id=NEW.source_wallet_address_id
   WHERE p.payment_intent_id=NEW.payment_intent_id
     AND p.status='OPEN'
     AND p.identity_id=NEW.identity_id
     AND p.source_wallet_address_id=NEW.source_wallet_address_id
     AND p.network=NEW.network
     AND p.asset_identifier=NEW.asset_identifier
     AND p.amount_base_units=NEW.amount_base_units
     AND p.rules_version=NEW.rules_version
     AND p.expires_at>=r.verified_at
     AND p.created_at<=r.verified_at
     AND r.network=NEW.network
     AND r.asset_identifier=NEW.asset_identifier
     AND r.amount_base_units=NEW.amount_base_units
     AND r.transaction_hash=NEW.transaction_hash
     AND r.transfer_index=CAST(NEW.transfer_index AS INTEGER)
     AND r.sender_address=w.address_normalized
     AND r.treasury_address=p.treasury_address
     AND r.attribution_status='MATCHED'
     AND r.identity_id=NEW.identity_id
     AND r.source_wallet_address_id=NEW.source_wallet_address_id
     AND r.verification_method='TWO_INDEPENDENT_RPC_SOURCES'
     AND r.finality_status=NEW.receipt_finality_status
     AND r.verified_at<=NEW.confirmed_at
     AND w.network=NEW.network
     AND w.wallet_role IN ('PRIMARY', 'PAYMENT', 'PAYMENT_AND_DELIVERY')
 )
BEGIN SELECT RAISE(ABORT, 'A Genesis qualifying payment requires one exact, unexpired, independently reconciled receipt from its pre-verified wallet address'); END;

CREATE TRIGGER IF NOT EXISTS genesis_qualifying_payment_commits_global_allowance
AFTER INSERT ON genesis_public_payments
WHEN NEW.payment_kind='QUALIFYING_PAYMENT'
BEGIN
  UPDATE genesis_programme_allowance_state
  SET qualifying_principal_usdt_base_units=
        CAST(qualifying_principal_usdt_base_units AS INTEGER)+CAST(NEW.amount_base_units AS INTEGER),
      pending_qualifying_principal_usdt_base_units=
        CAST(pending_qualifying_principal_usdt_base_units AS INTEGER)-CAST(NEW.amount_base_units AS INTEGER),
      earned_usdt_base_units=
        CAST(earned_usdt_base_units AS INTEGER)+CAST(NEW.allowance_credit_usdt_base_units AS INTEGER),
      updated_at=MAX(updated_at, NEW.confirmed_at)
  WHERE singleton=1
    AND CAST(pending_qualifying_principal_usdt_base_units AS INTEGER)>=CAST(NEW.amount_base_units AS INTEGER)
    AND CAST(qualifying_principal_usdt_base_units AS INTEGER)=CAST(NEW.settled_principal_start_base_units AS INTEGER)
    AND CAST(NEW.settled_principal_end_base_units AS INTEGER)=
        CAST(NEW.settled_principal_start_base_units AS INTEGER)+CAST(NEW.amount_base_units AS INTEGER)
    AND CAST(qualifying_principal_usdt_base_units AS INTEGER)+CAST(NEW.amount_base_units AS INTEGER)<=50000000000
    AND CAST(earned_usdt_base_units AS INTEGER)+CAST(NEW.allowance_credit_usdt_base_units AS INTEGER)+
        CAST(reserved_usdt_base_units AS INTEGER)+CAST(consumed_usdt_base_units AS INTEGER)<=1000000000000;

  INSERT INTO genesis_programme_allowance_events(
    event_id,identity_id,payment_record_id,event_type,amount_usdt_base_units,
    resulting_earned_usdt_base_units,resulting_reserved_usdt_base_units,
    resulting_consumed_usdt_base_units,rules_version,created_at
  )
  SELECT
    'gae_' || lower(hex(randomblob(16))),NEW.identity_id,NEW.payment_record_id,
    'QUALIFYING_PAYMENT_CREDIT',NEW.allowance_credit_usdt_base_units,
    s.earned_usdt_base_units,s.reserved_usdt_base_units,s.consumed_usdt_base_units,
    NEW.rules_version,NEW.confirmed_at
  FROM genesis_programme_allowance_state s WHERE s.singleton=1;

  UPDATE genesis_wallet_identities
  SET genesis_member_status='ACTIVE',
      genesis_member_awarded_at=COALESCE(genesis_member_awarded_at, NEW.confirmed_at),
      updated_at=MAX(updated_at, NEW.confirmed_at)
  WHERE identity_id=NEW.identity_id
    AND EXISTS (
      SELECT 1 FROM genesis_programme_allowance_events e
      WHERE e.payment_record_id=NEW.payment_record_id
        AND e.event_type='QUALIFYING_PAYMENT_CREDIT'
    );

  INSERT INTO genesis_member_badges(
    badge_id,identity_id,badge_code,status,qualifying_payment_record_id,rules_version,awarded_at
  )
  SELECT
    'gmb_' || lower(hex(randomblob(16))),NEW.identity_id,'GENESIS_MEMBER_DNA_GOLD','ACTIVE',
    NEW.payment_record_id,NEW.rules_version,NEW.confirmed_at
  WHERE EXISTS (
    SELECT 1 FROM genesis_wallet_identities i
    WHERE i.identity_id=NEW.identity_id AND i.genesis_member_status='ACTIVE'
  )
  AND NOT EXISTS (
    SELECT 1 FROM genesis_member_badges b
    WHERE b.identity_id=NEW.identity_id AND b.badge_code='GENESIS_MEMBER_DNA_GOLD'
  );

  UPDATE genesis_payment_intents
  SET status='CONFIRMED',receipt_id=NEW.receipt_id,payment_record_id=NEW.payment_record_id,
      confirmed_at=NEW.confirmed_at,
      settled_principal_start_base_units=NEW.settled_principal_start_base_units,
      settled_principal_end_base_units=NEW.settled_principal_end_base_units,
      settled_allowance_credit_usdt_base_units=NEW.allowance_credit_usdt_base_units,
      settled_tier_breakdown_json=NEW.settled_tier_breakdown_json
  WHERE payment_intent_id=NEW.payment_intent_id AND status='OPEN';
END;

CREATE TRIGGER IF NOT EXISTS genesis_payment_intents_no_delete
BEFORE DELETE ON genesis_payment_intents
BEGIN SELECT RAISE(ABORT, 'Genesis payment intent history is immutable'); END;
