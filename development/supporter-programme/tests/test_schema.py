from pathlib import Path
import sqlite3
import unittest

ROOT = Path(__file__).resolve().parents[1]
MIGRATION = ROOT / "migrations" / "0001_supporter_programme_foundation.sql"
WORKER_MIGRATION = ROOT.parent / "account-continuity" / "worker" / "migrations" / "supporters" / "0001_supporter_programme_foundation.sql"
WALLET_MIGRATION = ROOT / "migrations" / "0002_supporter_wallet_ownership.sql"
WORKER_WALLET_MIGRATION = ROOT.parent / "account-continuity" / "worker" / "migrations" / "supporters" / "0002_supporter_wallet_ownership.sql"
ENTITLEMENT_MIGRATION = ROOT / "migrations" / "0003_wallet_scoped_entitlements_no_fixed_expiry.sql"
WORKER_ENTITLEMENT_MIGRATION = ROOT.parent / "account-continuity" / "worker" / "migrations" / "supporters" / "0003_wallet_scoped_entitlements_no_fixed_expiry.sql"

class SupporterSchemaSmokeTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.execute("PRAGMA foreign_keys = ON")
        self.db.executescript(MIGRATION.read_text(encoding="utf-8"))
        self.db.executescript(WALLET_MIGRATION.read_text(encoding="utf-8"))
        self.db.executescript(ENTITLEMENT_MIGRATION.read_text(encoding="utf-8"))

    def tearDown(self):
        self.db.close()

    def test_worker_migration_mirror_matches_canonical_schema(self):
        self.assertEqual(
            WORKER_MIGRATION.read_bytes(),
            MIGRATION.read_bytes(),
            "The Worker-deployed supporter schema must match the canonical programme migration.",
        )

    def test_wallet_verification_migration_mirror_matches_canonical_schema(self):
        self.assertEqual(
            WORKER_WALLET_MIGRATION.read_bytes(),
            WALLET_MIGRATION.read_bytes(),
            "The Worker-deployed wallet verification migration must match the canonical migration.",
        )

    def test_wallet_scoped_migration_mirror_matches_canonical_schema(self):
        self.assertEqual(
            WORKER_ENTITLEMENT_MIGRATION.read_bytes(),
            ENTITLEMENT_MIGRATION.read_bytes(),
            "The Worker-deployed no-expiry, wallet-scoped migration must match the canonical migration.",
        )

    def test_new_member_registration_starts_pending_and_unverified(self):
        self.db.execute(
            "INSERT INTO supporter_members(member_id,username,username_normalized,created_at,updated_at) "
            "VALUES('m-pending','PendingPilot','pendingpilot',1,1)"
        )
        row = self.db.execute(
            "SELECT registration_state,registration_verified_at FROM supporter_members WHERE member_id='m-pending'"
        ).fetchone()
        self.assertEqual(row, ("PENDING", None))
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute(
                "UPDATE supporter_members SET registration_state='VERIFIED',registration_verified_at=2 "
                "WHERE member_id='m-pending'"
            )
        self.db.execute(
            "INSERT INTO supporter_wallets(wallet_id,member_id,network,address,address_normalized,wallet_role,"
            "ownership_verified_at,proof_method,created_at) "
            "VALUES('w-pending','m-pending','ethereum','0x111','0x111','PAYMENT',2,'OFFCHAIN_MESSAGE',2)"
        )
        with self.assertRaisesRegex(sqlite3.IntegrityError, "independently verified wallet"):
            self.db.execute(
                "UPDATE supporter_members SET registration_state='VERIFIED' "
                "WHERE member_id='m-pending'"
            )
        self.db.execute(
            "UPDATE supporter_members SET registration_state='VERIFIED',registration_verified_at=2 "
            "WHERE member_id='m-pending'"
        )
        with self.assertRaisesRegex(sqlite3.IntegrityError, "cannot be downgraded"):
            self.db.execute(
                "UPDATE supporter_members SET registration_state='PENDING' WHERE member_id='m-pending'"
            )
        verified = self.db.execute(
            "SELECT registration_state,registration_verified_at FROM supporter_members WHERE member_id='m-pending'"
        ).fetchone()
        self.assertEqual(verified, ("VERIFIED", 2))

    def test_supporter_sessions_require_verified_active_member(self):
        self.db.execute(
            "INSERT INTO supporter_members(member_id,username,username_normalized,created_at,updated_at) "
            "VALUES('m-session','SessionPilot','sessionpilot',1,1)"
        )
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute(
                "INSERT INTO supporter_member_sessions(session_id,member_id,secret_digest,created_at,expires_at,last_used_at) "
                "VALUES('s-pending','m-session','digest-pending',1,100,1)"
            )
        self.db.execute(
            "INSERT INTO supporter_wallets(wallet_id,member_id,network,address,address_normalized,wallet_role,"
            "ownership_verified_at,proof_method,created_at) "
            "VALUES('w-session','m-session','ethereum','0x111','0x111','PAYMENT',2,'OFFCHAIN_MESSAGE',2)"
        )
        self.db.execute(
            "UPDATE supporter_members SET registration_state='VERIFIED',registration_verified_at=2 "
            "WHERE member_id='m-session'"
        )
        self.db.execute(
            "INSERT INTO supporter_member_sessions(session_id,member_id,secret_digest,created_at,expires_at,last_used_at) "
            "VALUES('s-verified','m-session','digest-verified',3,100,3)"
        )
        self.assertEqual(
            self.db.execute("SELECT COUNT(*) FROM supporter_member_sessions WHERE session_id='s-verified'").fetchone()[0],
            1,
        )

    def test_delivery_wallets_are_solana_only_and_unique_per_member(self):
        self.db.execute(
            "INSERT INTO supporter_members(member_id,username,username_normalized,created_at,updated_at) "
            "VALUES('m-delivery','DeliveryPilot','deliverypilot',1,1)"
        )
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute(
                "INSERT INTO supporter_wallets(wallet_id,member_id,network,address,address_normalized,wallet_role,"
                "ownership_verified_at,proof_method,created_at) "
                "VALUES('w-eth-delivery','m-delivery','ethereum','0x111','0x111','ACROWN_DELIVERY',2,'OFFCHAIN_MESSAGE',2)"
            )
        self.db.execute(
            "INSERT INTO supporter_wallets(wallet_id,member_id,network,address,address_normalized,wallet_role,"
            "ownership_verified_at,proof_method,created_at) "
            "VALUES('w-sol-delivery','m-delivery','solana','So11111111111111111111111111111111111111112',"
            "'So11111111111111111111111111111111111111112','ACROWN_DELIVERY',2,'OFFCHAIN_MESSAGE',2)"
        )
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute(
                "INSERT INTO supporter_wallets(wallet_id,member_id,network,address,address_normalized,wallet_role,"
                "ownership_verified_at,proof_method,created_at) "
                "VALUES('w-sol-delivery-2','m-delivery','solana','11111111111111111111111111111111',"
                "'11111111111111111111111111111111','PAYMENT_AND_DELIVERY',3,'OFFCHAIN_MESSAGE',3)"
            )

    def test_prelaunch_has_no_fixed_expiry_or_treasuries(self):
        row = self.db.execute("SELECT status, activated_at FROM supporter_program WHERE singleton=1").fetchone()
        self.assertEqual(row, ("PRELAUNCH", None))
        columns = {item[1] for item in self.db.execute("PRAGMA table_info(supporter_program)")}
        self.assertNotIn("closes_at", columns)
        networks = self.db.execute("SELECT network, treasury_address, enabled FROM supporter_network_config").fetchall()
        self.assertEqual({r[0] for r in networks}, {"ethereum", "tron", "solana"})
        self.assertTrue(all(r[1] is None and r[2] == 0 for r in networks))

    def test_canonical_token_allowlist(self):
        actual = dict(self.db.execute("SELECT network, token_identifier FROM supporter_network_config"))
        self.assertEqual(actual["ethereum"], "0xdAC17F958D2ee523a2206206994597C13D831ec7")
        self.assertEqual(actual["tron"], "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t")
        self.assertEqual(actual["solana"], "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB")

    def test_network_cannot_be_enabled_without_treasury_verification(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("UPDATE supporter_network_config SET enabled=1 WHERE network='ethereum'")

    def test_program_activation_is_immutable_without_fixed_expiry(self):
        start = 1_800_000_000
        self.db.execute("UPDATE supporter_program SET activated_at=? WHERE singleton=1", (start,))
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("UPDATE supporter_program SET activated_at=? WHERE singleton=1", (start + 1,))
        columns = {item[1] for item in self.db.execute("PRAGMA table_info(supporter_program)")}
        self.assertNotIn("closes_at", columns)

    def test_open_status_requires_approved_terms_but_no_expiry_timestamp(self):
        start = 1_800_000_000
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("UPDATE supporter_program SET status='OPEN', activated_at=? WHERE singleton=1", (start,))
        self.db.execute(
            "UPDATE supporter_program SET status='OPEN', activated_at=?, multiplier_numerator='25', "
            "multiplier_denominator='1', usdt_decimals=6, acrown_decimals=9, "
            "floor_price_version='acs-v1', rules_version='supporter-v2' WHERE singleton=1",
            (start,),
        )
        self.assertEqual(
            self.db.execute("SELECT status, activated_at FROM supporter_program WHERE singleton=1").fetchone(),
            ("OPEN", start),
        )


    def test_entitlements_are_strictly_wallet_scoped_within_one_member(self):
        self.db.execute("INSERT INTO supporter_members(member_id,username,username_normalized,created_at,updated_at) VALUES('m-wallets','MultiWallet','multiwallet',1,1)")
        self.db.execute("INSERT INTO supporter_wallets(wallet_id,member_id,network,address,address_normalized,wallet_role,ownership_verified_at,proof_method,created_at) VALUES('w-eth','m-wallets','ethereum','0x111','0x111','PAYMENT',2,'OFFCHAIN_MESSAGE',2)")
        self.db.execute("INSERT INTO supporter_wallets(wallet_id,member_id,network,address,address_normalized,wallet_role,ownership_verified_at,proof_method,created_at) VALUES('w-tron','m-wallets','tron','T111','T111','PAYMENT',2,'OFFCHAIN_MESSAGE',2)")
        self.db.execute("INSERT INTO supporter_entitlements(wallet_id,member_id,earned_acrown_base_units,consumed_acrown_base_units,last_event_at) VALUES('w-eth','m-wallets','25000000000','1000000000',3)")
        self.db.execute("INSERT INTO supporter_entitlements(wallet_id,member_id,earned_acrown_base_units,consumed_acrown_base_units,last_event_at) VALUES('w-tron','m-wallets','50000000000','0',3)")
        rows = self.db.execute("SELECT wallet_id,earned_acrown_base_units,consumed_acrown_base_units FROM supporter_entitlements WHERE member_id='m-wallets' ORDER BY wallet_id").fetchall()
        self.assertEqual(rows, [('w-eth','25000000000','1000000000'),('w-tron','50000000000','0')])
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("INSERT INTO supporter_entitlements(wallet_id,member_id,earned_acrown_base_units,consumed_acrown_base_units,last_event_at) VALUES('w-eth','m-other','9','0',3)")

    def test_purchase_uses_only_the_exact_wallet_allowance_and_linked_delivery_wallet(self):
        self.db.execute("INSERT INTO supporter_members(member_id,username,username_normalized,created_at,updated_at) VALUES('m-purchase','PurchasePilot','purchasepilot',1,1)")
        self.db.execute("INSERT INTO supporter_wallets(wallet_id,member_id,network,address,address_normalized,wallet_role,ownership_verified_at,proof_method,created_at) VALUES('w-purchase-eth','m-purchase','ethereum','0x111','0x111','PAYMENT',2,'OFFCHAIN_MESSAGE',2)")
        self.db.execute("INSERT INTO supporter_wallets(wallet_id,member_id,network,address,address_normalized,wallet_role,ownership_verified_at,proof_method,created_at) VALUES('w-purchase-tron','m-purchase','tron','T111','T111','PAYMENT',2,'OFFCHAIN_MESSAGE',2)")
        self.db.execute("INSERT INTO supporter_wallets(wallet_id,member_id,network,address,address_normalized,wallet_role,ownership_verified_at,proof_method,created_at) VALUES('w-purchase-sol','m-purchase','solana','So111','So111','ACROWN_DELIVERY',2,'OFFCHAIN_MESSAGE',2)")
        self.db.execute("INSERT INTO supporter_entitlements(wallet_id,member_id,earned_acrown_base_units,consumed_acrown_base_units,last_event_at) VALUES('w-purchase-eth','m-purchase','25000000000','0',3)")
        self.db.execute("INSERT INTO supporter_entitlements(wallet_id,member_id,earned_acrown_base_units,consumed_acrown_base_units,last_event_at) VALUES('w-purchase-tron','m-purchase','50000000000','0',3)")
        self.db.execute(
            "INSERT INTO supporter_purchases(purchase_id,member_id,delivery_wallet_id,payment_network,payment_token_identifier,payment_amount_base_units,acrown_amount_base_units,floor_price_version,payment_transaction_hash,payment_transfer_index,delivery_transaction_signature,status,created_at,entitlement_wallet_id) "
            "VALUES('p-eth','m-purchase','w-purchase-sol','ethereum','usdt-eth','100','250','acs-v1',NULL,NULL,NULL,'CREATED',4,'w-purchase-eth')"
        )
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute(
                "INSERT INTO supporter_purchases(purchase_id,member_id,delivery_wallet_id,payment_network,payment_token_identifier,payment_amount_base_units,acrown_amount_base_units,floor_price_version,payment_transaction_hash,payment_transfer_index,delivery_transaction_signature,status,created_at,entitlement_wallet_id) "
                "VALUES('p-bad','m-purchase','w-purchase-sol','ethereum','usdt-eth','100','250','acs-v1',NULL,NULL,NULL,'CREATED',4,'w-purchase-tron')"
            )
        self.db.execute("INSERT INTO supporter_entitlement_events(event_id,member_id,wallet_id,purchase_id,event_type,delta_acrown_base_units,resulting_earned_base_units,resulting_consumed_base_units,rules_version,created_at) VALUES('e-eth','m-purchase','w-purchase-eth','p-eth','PURCHASE_CONSUMPTION','250','25000000000','250','v2',4)")
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("INSERT INTO supporter_entitlement_events(event_id,member_id,wallet_id,purchase_id,event_type,delta_acrown_base_units,resulting_earned_base_units,resulting_consumed_base_units,rules_version,created_at) VALUES('e-wrong','m-purchase','w-purchase-tron','p-eth','PURCHASE_CONSUMPTION','250','50000000000','250','v2',4)")

    def test_wallet_uniqueness(self):
        self.db.execute("INSERT INTO supporter_members(member_id,username,username_normalized,created_at,updated_at) VALUES('m1','CosmicPilot','cosmicpilot',1,1)")
        self.db.execute("INSERT INTO supporter_wallets(wallet_id,member_id,network,address,address_normalized,wallet_role,created_at) VALUES('w1','m1','ethereum','0x111','0x111','PAYMENT',1)")
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("INSERT INTO supporter_wallets(wallet_id,member_id,network,address,address_normalized,wallet_role,created_at) VALUES('w2','m1','ethereum','0x111','0x111','PAYMENT',2)")

    def test_duplicate_contribution_transfer_is_rejected(self):
        self.db.execute("INSERT INTO supporter_members(member_id,username,username_normalized,created_at,updated_at) VALUES('m1','CosmicPilot','cosmicpilot',1,1)")
        self.db.execute("INSERT INTO supporter_wallets(wallet_id,member_id,network,address,address_normalized,wallet_role,created_at) VALUES('w1','m1','ethereum','0x111','0x111','PAYMENT',1)")
        self.db.execute("INSERT INTO supporter_contribution_intents(intent_id,member_id,wallet_id,network,token_identifier,treasury_address,amount_base_units,status,rules_version,created_at,expires_at) VALUES('i1','m1','w1','ethereum','token','treasury','100','CONFIRMED','v1',1,9)")
        row = "c1"
        self.db.execute("INSERT INTO supporter_contributions(contribution_id,intent_id,member_id,wallet_id,network,token_identifier,sender_address,treasury_address,transaction_hash,transfer_index,amount_base_units,block_or_slot,finality_status,provider_agreement_digest,multiplier_numerator,multiplier_denominator,acrown_allowance_base_units,rules_version,confirmed_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", (row,"i1","m1","w1","ethereum","token","from","to","0xhash","0","100","1","FINALIZED","digest","25","1","2500","v1",2))
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("INSERT INTO supporter_contributions(contribution_id,intent_id,member_id,wallet_id,network,token_identifier,sender_address,treasury_address,transaction_hash,transfer_index,amount_base_units,block_or_slot,finality_status,provider_agreement_digest,multiplier_numerator,multiplier_denominator,acrown_allowance_base_units,rules_version,confirmed_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", ("c2","i1","m1","w1","ethereum","token","from","to","0xhash","0","100","1","FINALIZED","digest","25","1","2500","v1",2))


    def test_entitlements_are_strictly_wallet_scoped_within_one_member(self):
        self.db.execute("INSERT INTO supporter_members(member_id,username,username_normalized,created_at,updated_at) VALUES('m-wallets','MultiWallet','multiwallet',1,1)")
        self.db.execute("INSERT INTO supporter_wallets(wallet_id,member_id,network,address,address_normalized,wallet_role,ownership_verified_at,proof_method,created_at) VALUES('w-eth','m-wallets','ethereum','0x111','0x111','PAYMENT',2,'OFFCHAIN_MESSAGE',2)")
        self.db.execute("INSERT INTO supporter_wallets(wallet_id,member_id,network,address,address_normalized,wallet_role,ownership_verified_at,proof_method,created_at) VALUES('w-tron','m-wallets','tron','T111','T111','PAYMENT',2,'OFFCHAIN_MESSAGE',2)")
        self.db.execute("INSERT INTO supporter_entitlements(wallet_id,member_id,earned_acrown_base_units,consumed_acrown_base_units,last_event_at) VALUES('w-eth','m-wallets','25000000000','1000000000',3)")
        self.db.execute("INSERT INTO supporter_entitlements(wallet_id,member_id,earned_acrown_base_units,consumed_acrown_base_units,last_event_at) VALUES('w-tron','m-wallets','50000000000','0',3)")
        rows = self.db.execute("SELECT wallet_id,earned_acrown_base_units,consumed_acrown_base_units FROM supporter_entitlements WHERE member_id='m-wallets' ORDER BY wallet_id").fetchall()
        self.assertEqual(rows, [('w-eth','25000000000','1000000000'),('w-tron','50000000000','0')])
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("INSERT INTO supporter_entitlements(wallet_id,member_id,earned_acrown_base_units,consumed_acrown_base_units,last_event_at) VALUES('w-eth','m-other','9','0',3)")

    def test_purchase_uses_only_the_exact_wallet_allowance_and_linked_delivery_wallet(self):
        self.db.execute("INSERT INTO supporter_members(member_id,username,username_normalized,created_at,updated_at) VALUES('m-purchase','PurchasePilot','purchasepilot',1,1)")
        self.db.execute("INSERT INTO supporter_wallets(wallet_id,member_id,network,address,address_normalized,wallet_role,ownership_verified_at,proof_method,created_at) VALUES('w-purchase-eth','m-purchase','ethereum','0x111','0x111','PAYMENT',2,'OFFCHAIN_MESSAGE',2)")
        self.db.execute("INSERT INTO supporter_wallets(wallet_id,member_id,network,address,address_normalized,wallet_role,ownership_verified_at,proof_method,created_at) VALUES('w-purchase-tron','m-purchase','tron','T111','T111','PAYMENT',2,'OFFCHAIN_MESSAGE',2)")
        self.db.execute("INSERT INTO supporter_wallets(wallet_id,member_id,network,address,address_normalized,wallet_role,ownership_verified_at,proof_method,created_at) VALUES('w-purchase-sol','m-purchase','solana','So111','So111','ACROWN_DELIVERY',2,'OFFCHAIN_MESSAGE',2)")
        self.db.execute("INSERT INTO supporter_entitlements(wallet_id,member_id,earned_acrown_base_units,consumed_acrown_base_units,last_event_at) VALUES('w-purchase-eth','m-purchase','25000000000','0',3)")
        self.db.execute("INSERT INTO supporter_entitlements(wallet_id,member_id,earned_acrown_base_units,consumed_acrown_base_units,last_event_at) VALUES('w-purchase-tron','m-purchase','50000000000','0',3)")
        self.db.execute(
            "INSERT INTO supporter_purchases(purchase_id,member_id,delivery_wallet_id,payment_network,payment_token_identifier,payment_amount_base_units,acrown_amount_base_units,floor_price_version,payment_transaction_hash,payment_transfer_index,delivery_transaction_signature,status,created_at,entitlement_wallet_id) "
            "VALUES('p-eth','m-purchase','w-purchase-sol','ethereum','usdt-eth','100','250','acs-v1',NULL,NULL,NULL,'CREATED',4,'w-purchase-eth')"
        )
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute(
                "INSERT INTO supporter_purchases(purchase_id,member_id,delivery_wallet_id,payment_network,payment_token_identifier,payment_amount_base_units,acrown_amount_base_units,floor_price_version,payment_transaction_hash,payment_transfer_index,delivery_transaction_signature,status,created_at,entitlement_wallet_id) "
                "VALUES('p-bad','m-purchase','w-purchase-sol','ethereum','usdt-eth','100','250','acs-v1',NULL,NULL,NULL,'CREATED',4,'w-purchase-tron')"
            )
        self.db.execute("INSERT INTO supporter_entitlement_events(event_id,member_id,wallet_id,purchase_id,event_type,delta_acrown_base_units,resulting_earned_base_units,resulting_consumed_base_units,rules_version,created_at) VALUES('e-eth','m-purchase','w-purchase-eth','p-eth','PURCHASE_CONSUMPTION','250','25000000000','250','v2',4)")
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("INSERT INTO supporter_entitlement_events(event_id,member_id,wallet_id,purchase_id,event_type,delta_acrown_base_units,resulting_earned_base_units,resulting_consumed_base_units,rules_version,created_at) VALUES('e-wrong','m-purchase','w-purchase-tron','p-eth','PURCHASE_CONSUMPTION','250','50000000000','250','v2',4)")

    def test_public_ledger_is_append_only(self):
        self.db.execute("INSERT INTO supporter_public_ledger_events(ledger_event_id,event_type,event_digest,recorded_at) VALUES('l1','CONTRIBUTION','digest1',1)")
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("UPDATE supporter_public_ledger_events SET purpose='changed' WHERE ledger_event_id='l1'")
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("DELETE FROM supporter_public_ledger_events WHERE ledger_event_id='l1'")

if __name__ == "__main__":
    unittest.main()
