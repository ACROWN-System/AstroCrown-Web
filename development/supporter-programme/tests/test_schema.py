from pathlib import Path
import sqlite3
import unittest

ROOT = Path(__file__).resolve().parents[1]
MIGRATION = ROOT / "migrations" / "0001_supporter_programme_foundation.sql"
WORKER_MIGRATION = ROOT.parent / "account-continuity" / "worker" / "migrations" / "supporters" / "0001_supporter_programme_foundation.sql"
WALLET_MIGRATION = ROOT / "migrations" / "0002_supporter_wallet_ownership.sql"
WORKER_WALLET_MIGRATION = ROOT.parent / "account-continuity" / "worker" / "migrations" / "supporters" / "0002_supporter_wallet_ownership.sql"
TREASURY_MIGRATION = ROOT / "migrations" / "0003_genesis_usdt_treasury_addresses.sql"
GENESIS_WALLET_MIGRATION = ROOT / "migrations" / "0004_genesis_wallet_native_identity.sql"
WORKER_TREASURY_MIGRATION = ROOT.parent / "account-continuity" / "worker" / "migrations" / "supporters" / "0003_genesis_usdt_treasury_addresses.sql"
WORKER_GENESIS_WALLET_MIGRATION = ROOT.parent / "account-continuity" / "worker" / "migrations" / "supporters" / "0004_genesis_wallet_native_identity.sql"
GLOBAL_ALLOWANCE_MIGRATION = ROOT / "migrations" / "0005_genesis_global_allowance_and_launch_freeze.sql"
WORKER_GLOBAL_ALLOWANCE_MIGRATION = ROOT.parent / "account-continuity" / "worker" / "migrations" / "supporters" / "0005_genesis_global_allowance_and_launch_freeze.sql"

class GenesisProgrammeSchemaSmokeTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.execute("PRAGMA foreign_keys = ON")
        self.db.executescript(MIGRATION.read_text(encoding="utf-8"))
        self.db.executescript(WALLET_MIGRATION.read_text(encoding="utf-8"))
        self.db.executescript(TREASURY_MIGRATION.read_text(encoding="utf-8"))
        self.db.executescript(GENESIS_WALLET_MIGRATION.read_text(encoding="utf-8"))
        self.db.executescript(GLOBAL_ALLOWANCE_MIGRATION.read_text(encoding="utf-8"))

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

    def test_genesis_treasury_migration_mirror_matches_canonical_schema(self):
        self.assertEqual(
            WORKER_TREASURY_MIGRATION.read_bytes(),
            TREASURY_MIGRATION.read_bytes(),
            "The Worker-deployed Genesis treasury migration must match the canonical migration.",
        )

    def test_wallet_native_genesis_migration_mirror_matches_canonical_schema(self):
        self.assertEqual(
            WORKER_GENESIS_WALLET_MIGRATION.read_bytes(),
            GENESIS_WALLET_MIGRATION.read_bytes(),
            "The Worker-deployed wallet-native Genesis migration must match the canonical migration.",
        )

    def test_global_allowance_migration_mirror_matches_canonical_schema(self):
        self.assertEqual(
            WORKER_GLOBAL_ALLOWANCE_MIGRATION.read_bytes(),
            GLOBAL_ALLOWANCE_MIGRATION.read_bytes(),
            "The Worker-deployed global allowance/freeze migration must match the canonical migration.",
        )

    def test_global_pool_is_one_shared_usdt_balance_and_personal_entitlement_rows_are_rejected(self):
        self.assertEqual(
            self.db.execute(
                "SELECT earned_usdt_base_units,reserved_usdt_base_units,consumed_usdt_base_units "
                "FROM genesis_programme_allowance_state WHERE singleton=1"
            ).fetchone(),
            ("0", "0", "0"),
        )
        self.db.execute(
            "INSERT INTO genesis_wallet_identities(identity_id,primary_network,primary_address,primary_address_normalized,"
            "display_name,display_name_normalized,created_at,updated_at) "
            "VALUES('gid-global','ethereum','0x987','0x987','Global Pool 2042','global pool 2042',1,1)"
        )
        with self.assertRaisesRegex(sqlite3.IntegrityError, "global Genesis programme allowance pool"):
            self.db.execute(
                "INSERT INTO genesis_wallet_entitlements(identity_id,updated_at) VALUES('gid-global',1)"
            )
        self.assertEqual(
            self.db.execute("SELECT COUNT(*) FROM genesis_wallet_entitlements").fetchone()[0],
            0,
        )

    def test_launch_freeze_is_exactly_24_hours_before_acrown_and_permanent(self):
        launch = 2_000_000_000
        freeze = launch - 86_400
        self.db.execute(
            "UPDATE genesis_programme_control SET scheduled_acrown_launch_at=?,registration_freeze_at=?,updated_at=1 "
            "WHERE singleton=1",
            (launch, freeze),
        )
        self.db.execute(
            "UPDATE genesis_programme_control SET registration_closed_at=?,updated_at=2 WHERE singleton=1",
            (freeze,),
        )
        with self.assertRaisesRegex(sqlite3.IntegrityError, "closure is permanent"):
            self.db.execute(
                "UPDATE genesis_programme_control SET registration_closed_at=NULL WHERE singleton=1"
            )
        with self.assertRaisesRegex(sqlite3.IntegrityError, "cannot change after registration freeze"):
            self.db.execute(
                "UPDATE genesis_programme_control SET scheduled_acrown_launch_at=?,registration_freeze_at=? "
                "WHERE singleton=1",
                (launch + 3600, freeze + 3600),
            )
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute(
                "UPDATE genesis_programme_control SET acrown_launched_at=?,acs_floor_purchase_opened_at=?,"
                "purchase_window_started_at=?,purchase_window_closes_at=? WHERE singleton=1",
                (launch, launch + 1, launch, launch + 1 + 15552000),
            )

    def test_database_freeze_blocks_new_identities_links_and_profile_edits_at_the_24_hour_cutoff(self):
        now = self.db.execute("SELECT unixepoch()").fetchone()[0]
        launch = now + 86_400
        freeze = now
        self.db.execute(
            "INSERT INTO genesis_wallet_identities(identity_id,primary_network,primary_address,primary_address_normalized,"
            "display_name,display_name_normalized,created_at,updated_at) "
            "VALUES('gid-existing','ethereum','0xabc','0xabc','Existing Wallet 1','existing wallet 1',?,?)",
            (now - 100, now - 100),
        )
        self.db.execute(
            "INSERT INTO genesis_wallet_addresses(wallet_address_id,identity_id,network,address,address_normalized,"
            "wallet_role,ownership_verified_at,proof_method,created_at) "
            "VALUES('gwa-existing','gid-existing','ethereum','0xabc','0xabc','PRIMARY',?,'EIP-191',?)",
            (now - 100, now - 100),
        )
        self.db.execute(
            "UPDATE genesis_programme_control SET scheduled_acrown_launch_at=?,registration_freeze_at=?,updated_at=? "
            "WHERE singleton=1",
            (launch, freeze, now),
        )
        # The close timestamp has not yet been lazily persisted by an API request.
        self.assertIsNone(
            self.db.execute(
                "SELECT registration_closed_at FROM genesis_programme_control WHERE singleton=1"
            ).fetchone()[0]
        )
        with self.assertRaisesRegex(sqlite3.IntegrityError, "primary-wallet registration is permanently closed"):
            self.db.execute(
                "INSERT INTO genesis_wallet_identities(identity_id,primary_network,primary_address,primary_address_normalized,"
                "display_name,display_name_normalized,created_at,updated_at) "
                "VALUES('gid-new','solana','SoNew','SoNew','New Wallet 2','new wallet 2',?,?)",
                (now, now),
            )
        with self.assertRaisesRegex(sqlite3.IntegrityError, "wallet linking is permanently closed"):
            self.db.execute(
                "INSERT INTO genesis_wallet_addresses(wallet_address_id,identity_id,network,address,address_normalized,"
                "wallet_role,ownership_verified_at,proof_method,created_at) "
                "VALUES('gwa-new','gid-existing','tron','TNew','TNew','PAYMENT',?,'TIP-191',?)",
                (now, now),
            )
        with self.assertRaisesRegex(sqlite3.IntegrityError, "profile changes are closed"):
            self.db.execute(
                "UPDATE genesis_wallet_identities SET display_name='Changed Wallet',display_name_normalized='changed wallet' "
                "WHERE identity_id='gid-existing'"
            )
        # Existing primary-wallet authentication remains possible, but new identities and profile challenges do not.
        self.db.execute(
            "INSERT INTO genesis_wallet_challenges(challenge_id,identity_id,network,address,address_normalized,"
            "challenge_purpose,nonce_digest,domain,message_digest,message,created_at,expires_at) "
            "VALUES('gch-existing','gid-existing','ethereum','0xabc','0xabc','IDENTIFY','nonce-existing','example.test',"
            "'digest-existing','existing wallet sign-in',?,?,?)".replace("?,?,?)", "?,?)"),
            (now, now + 600),
        )
        with self.assertRaisesRegex(sqlite3.IntegrityError, "New Genesis registrations"):
            self.db.execute(
                "INSERT INTO genesis_wallet_challenges(challenge_id,network,address,address_normalized,challenge_purpose,"
                "nonce_digest,domain,message_digest,message,created_at,expires_at) "
                "VALUES('gch-new','solana','SoNew','SoNew','IDENTIFY','nonce-new','example.test','digest-new',"
                "'new identity sign-in',?,?)",
                (now, now + 600),
            )
        with self.assertRaisesRegex(sqlite3.IntegrityError, "schedule is locked once the 24-hour"):
            self.db.execute(
                "UPDATE genesis_programme_control SET scheduled_acrown_launch_at=?,registration_freeze_at=? "
                "WHERE singleton=1",
                (launch + 3600, freeze + 3600),
            )

    def test_global_purchase_window_requires_both_launch_and_floor_service_and_is_180_days(self):
        launch = 2_100_000_000
        floor_open = launch + 7200
        start = floor_open
        close = start + 15_552_000
        self.db.execute(
            "UPDATE genesis_programme_control SET acrown_launched_at=?,acs_floor_purchase_opened_at=?,"
            "purchase_window_started_at=?,purchase_window_closes_at=?,updated_at=1 WHERE singleton=1",
            (launch, floor_open, start, close),
        )
        self.assertEqual(
            self.db.execute(
                "SELECT purchase_window_started_at,purchase_window_closes_at "
                "FROM genesis_programme_control WHERE singleton=1"
            ).fetchone(),
            (start, close),
        )
        with self.assertRaisesRegex(sqlite3.IntegrityError, "purchase window is immutable"):
            self.db.execute(
                "UPDATE genesis_programme_control SET purchase_window_closes_at=? WHERE singleton=1",
                (close + 1,),
            )

    def test_wallet_native_schema_has_primary_wallet_identity_unique_name_and_retires_personal_entitlement_rows(self):
        self.db.execute(
            "INSERT INTO genesis_wallet_identities(identity_id,primary_network,primary_address,primary_address_normalized,"
            "display_name,display_name_normalized,avatar_key,created_at,updated_at) "
            "VALUES('gid-primary','ethereum','0x111','0x111','SilverComet 4821','silvercomet 4821','orbit',1,1)"
        )
        self.db.execute(
            "INSERT INTO genesis_wallet_addresses(wallet_address_id,identity_id,network,address,address_normalized,"
            "wallet_role,ownership_verified_at,proof_method,created_at) "
            "VALUES('gwa-primary','gid-primary','ethereum','0x111','0x111','PRIMARY',1,'EIP-191',1)"
        )
        with self.assertRaisesRegex(sqlite3.IntegrityError, "global Genesis programme allowance pool"):
            self.db.execute(
                "INSERT INTO genesis_wallet_entitlements(identity_id,updated_at) VALUES('gid-primary',1)"
            )
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute(
                "INSERT INTO genesis_wallet_identities(identity_id,primary_network,primary_address,primary_address_normalized,"
                "display_name,display_name_normalized,created_at,updated_at) "
                "VALUES('gid-other','solana','So111','So111','SILVERCOMET 4821','silvercomet 4821',1,1)"
            )
        self.assertEqual(
            self.db.execute(
                "SELECT primary_network,primary_address,display_name FROM genesis_wallet_identities WHERE identity_id='gid-primary'"
            ).fetchone(),
            ("ethereum", "0x111", "SilverComet 4821"),
        )
        self.assertIsNone(
            self.db.execute(
                "SELECT earned_acrown_base_units,consumed_acrown_base_units FROM genesis_wallet_entitlements WHERE identity_id='gid-primary'"
            ).fetchone()
        )

    def test_genesis_wallet_addresses_are_unique_per_network_and_can_link_other_chains(self):
        self.db.execute(
            "INSERT INTO genesis_wallet_identities(identity_id,primary_network,primary_address,primary_address_normalized,"
            "display_name,display_name_normalized,created_at,updated_at) "
            "VALUES('gid-links','ethereum','0x111','0x111','AzureVoyager 2001','azurevoyager 2001',1,1)"
        )
        self.db.execute(
            "INSERT INTO genesis_wallet_addresses(wallet_address_id,identity_id,network,address,address_normalized,"
            "wallet_role,ownership_verified_at,proof_method,created_at) "
            "VALUES('gwa-eth','gid-links','ethereum','0x111','0x111','PRIMARY',1,'EIP-191',1)"
        )
        self.db.execute(
            "INSERT INTO genesis_wallet_addresses(wallet_address_id,identity_id,network,address,address_normalized,"
            "wallet_role,ownership_verified_at,proof_method,created_at) "
            "VALUES('gwa-tron','gid-links','tron','TAddress','TAddress','PAYMENT',2,'TIP-191',2)"
        )
        self.db.execute(
            "INSERT INTO genesis_wallet_addresses(wallet_address_id,identity_id,network,address,address_normalized,"
            "wallet_role,ownership_verified_at,proof_method,created_at) "
            "VALUES('gwa-sol','gid-links','solana','So111','So111','DELIVERY',3,'SOLANA_SIGN_MESSAGE',3)"
        )
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute(
                "INSERT INTO genesis_wallet_addresses(wallet_address_id,identity_id,network,address,address_normalized,"
                "wallet_role,ownership_verified_at,proof_method,created_at) "
                "VALUES('gwa-duplicate','gid-links','tron','TAddress','TAddress','PAYMENT',4,'TIP-191',4)"
            )
        self.assertEqual(
            self.db.execute("SELECT COUNT(*) FROM genesis_wallet_addresses WHERE identity_id='gid-links'").fetchone()[0],
            3,
        )

    def test_genesis_member_status_cannot_activate_without_a_finalized_qualifying_payment(self):
        self.db.execute(
            "INSERT INTO genesis_wallet_identities(identity_id,primary_network,primary_address,primary_address_normalized,"
            "display_name,display_name_normalized,created_at,updated_at) "
            "VALUES('gid-unqualified','ethereum','0x333','0x333','AzureAquila 4001','azureaquila 4001',1,1)"
        )
        with self.assertRaisesRegex(sqlite3.IntegrityError, "finalized qualifying payment"):
            self.db.execute(
                "UPDATE genesis_wallet_identities SET genesis_member_status='ACTIVE',genesis_member_awarded_at=2 "
                "WHERE identity_id='gid-unqualified'"
            )

    def test_genesis_badge_requires_qualified_wallet_and_public_payment_is_immutable(self):
        self.db.execute(
            "INSERT INTO genesis_wallet_identities(identity_id,primary_network,primary_address,primary_address_normalized,"
            "display_name,display_name_normalized,created_at,updated_at) "
            "VALUES('gid-badge','ethereum','0x222','0x222','GoldenOrion 3001','goldenorion 3001',1,1)"
        )
        self.db.execute(
            "INSERT INTO genesis_wallet_addresses(wallet_address_id,identity_id,network,address,address_normalized,"
            "wallet_role,ownership_verified_at,proof_method,created_at) "
            "VALUES('gwa-badge','gid-badge','ethereum','0x222','0x222','PRIMARY',1,'EIP-191',1)"
        )
        tx = "0x" + ("a" * 64)
        self.db.execute(
            "INSERT INTO genesis_public_payments(payment_record_id,identity_id,source_wallet_address_id,payment_kind,network,"
            "asset_identifier,amount_base_units,amount_display,transaction_hash,transfer_index,finality_status,rules_version,"
            "explorer_reference,confirmed_at) "
            "VALUES('gp-1','gid-badge','gwa-badge','QUALIFYING_PAYMENT','ethereum','USDT','1000000','1.00',?,'0',"
            "'FINALIZED','rules-v1',?,2)",
            (tx, "https://etherscan.io/tx/" + tx),
        )
        with self.assertRaisesRegex(sqlite3.IntegrityError, "active wallet identity and its own finalized qualifying payment"):
            self.db.execute(
                "INSERT INTO genesis_member_badges(badge_id,identity_id,badge_code,qualifying_payment_record_id,rules_version,awarded_at) "
                "VALUES('gb-1','gid-badge','GENESIS_MEMBER_DNA_GOLD','gp-1','rules-v1',3)"
            )
        self.db.execute(
            "UPDATE genesis_wallet_identities SET genesis_member_status='ACTIVE',genesis_member_awarded_at=3 WHERE identity_id='gid-badge'"
        )
        self.db.execute(
            "INSERT INTO genesis_member_badges(badge_id,identity_id,badge_code,qualifying_payment_record_id,rules_version,awarded_at) "
            "VALUES('gb-1','gid-badge','GENESIS_MEMBER_DNA_GOLD','gp-1','rules-v1',3)"
        )
        with self.assertRaisesRegex(sqlite3.IntegrityError, "immutable"):
            self.db.execute("UPDATE genesis_public_payments SET amount_display='2.00' WHERE payment_record_id='gp-1'")
        self.assertEqual(
            self.db.execute("SELECT badge_code,status FROM genesis_member_badges WHERE identity_id='gid-badge'").fetchone(),
            ("GENESIS_MEMBER_DNA_GOLD", "ACTIVE"),
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

    def test_genesis_member_sessions_require_verified_active_member(self):
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

    def test_prelaunch_has_no_clock_and_records_genesis_treasuries_without_enabling_networks(self):
        row = self.db.execute("SELECT status, activated_at, closes_at FROM supporter_program WHERE singleton=1").fetchone()
        self.assertEqual(row, ("PRELAUNCH", None, None))
        networks = dict(self.db.execute("SELECT network, treasury_address FROM supporter_network_config"))
        self.assertEqual(networks, {
            "ethereum": "0xbbb77071149a5F113Df15E78c58518917afa950A",
            "tron": "TAKHQcuJ3RLsZZxCorWc3rav6M28dS6VTR",
            "solana": "AWyq9E7Wsdjv9VyoTs84XGiubQGZM7fETnZ8ddfArwkG",
        })
        enabled = self.db.execute("SELECT COUNT(*) FROM supporter_network_config WHERE enabled != 0").fetchone()[0]
        self.assertEqual(enabled, 0)

    def test_canonical_token_allowlist(self):
        actual = dict(self.db.execute("SELECT network, token_identifier FROM supporter_network_config"))
        self.assertEqual(actual["ethereum"], "0xdAC17F958D2ee523a2206206994597C13D831ec7")
        self.assertEqual(actual["tron"], "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t")
        self.assertEqual(actual["solana"], "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB")

    def test_network_cannot_be_enabled_without_treasury_verification(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("UPDATE supporter_network_config SET enabled=1 WHERE network='ethereum'")

    def test_activation_window_is_180_days_and_immutable(self):
        start = 1_800_000_000
        self.db.execute("UPDATE supporter_program SET activated_at=?, closes_at=? WHERE singleton=1", (start, start + 15_552_000))
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("UPDATE supporter_program SET activated_at=? WHERE singleton=1", (start + 1,))

    def test_open_status_requires_approved_terms(self):
        start = 1_800_000_000
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("UPDATE supporter_program SET status='OPEN', activated_at=?, closes_at=? WHERE singleton=1", (start, start + 15_552_000))

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

    def test_public_ledger_is_append_only(self):
        self.db.execute("INSERT INTO supporter_public_ledger_events(ledger_event_id,event_type,event_digest,recorded_at) VALUES('l1','CONTRIBUTION','digest1',1)")
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("UPDATE supporter_public_ledger_events SET purpose='changed' WHERE ledger_event_id='l1'")
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("DELETE FROM supporter_public_ledger_events WHERE ledger_event_id='l1'")

if __name__ == "__main__":
    unittest.main()
