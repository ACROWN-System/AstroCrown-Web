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
TREASURY_RECEIPT_MONITOR_MIGRATION = ROOT / "migrations" / "0006_genesis_treasury_receipt_monitor.sql"
GENESIS_QUALIFYING_INTENT_MIGRATION = ROOT / "migrations" / "0007_genesis_qualifying_payment_intents.sql"
WORKER_GENESIS_QUALIFYING_INTENT_MIGRATION = ROOT.parent / "account-continuity" / "worker" / "migrations" / "supporters" / "0007_genesis_qualifying_payment_intents.sql"
MONITOR_HEALTH_MIGRATION = ROOT / "migrations" / "0008_genesis_treasury_monitor_health.sql"
WORKER_MONITOR_HEALTH_MIGRATION = ROOT.parent / "account-continuity" / "worker" / "migrations" / "supporters" / "0008_genesis_treasury_monitor_health.sql"
WORKER_TREASURY_RECEIPT_MONITOR_MIGRATION = ROOT.parent / "account-continuity" / "worker" / "migrations" / "supporters" / "0006_genesis_treasury_receipt_monitor.sql"

class GenesisProgrammeSchemaSmokeTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.execute("PRAGMA foreign_keys = ON")
        self.db.executescript(MIGRATION.read_text(encoding="utf-8"))
        self.db.executescript(WALLET_MIGRATION.read_text(encoding="utf-8"))
        self.db.executescript(TREASURY_MIGRATION.read_text(encoding="utf-8"))
        self.db.executescript(GENESIS_WALLET_MIGRATION.read_text(encoding="utf-8"))
        self.db.executescript(GLOBAL_ALLOWANCE_MIGRATION.read_text(encoding="utf-8"))
        self.db.executescript(TREASURY_RECEIPT_MONITOR_MIGRATION.read_text(encoding="utf-8"))
        self.db.executescript(GENESIS_QUALIFYING_INTENT_MIGRATION.read_text(encoding="utf-8"))
        self.db.executescript(MONITOR_HEALTH_MIGRATION.read_text(encoding="utf-8"))

    def _set_monitor_healthy_after(self, timestamp):
        self.db.execute(
            "UPDATE genesis_treasury_monitor_health SET status='HEALTHY',"
            "last_cycle_started_at=unixepoch()-1,last_cycle_completed_at=unixepoch(),"
            "ethereum_caught_up=1,tron_caught_up=1,solana_caught_up=1,"
            "ethereum_head_occurred_at=MAX(unixepoch(),?),"
            "tron_head_occurred_at=MAX(unixepoch(),?),"
            "solana_head_occurred_at=MAX(unixepoch(),?),"
            "settlement_queue_deferred=0,updated_at=unixepoch() WHERE singleton=1",
            (timestamp + 1, timestamp + 1, timestamp + 1),
        )

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

    def test_treasury_receipt_monitor_migration_mirror_matches_canonical_schema(self):
        self.assertEqual(
            WORKER_TREASURY_RECEIPT_MONITOR_MIGRATION.read_bytes(),
            TREASURY_RECEIPT_MONITOR_MIGRATION.read_bytes(),
            "The Worker-deployed treasury receipt monitor migration must match the canonical migration.",
        )

    def test_monitor_health_starts_closed_and_worker_migration_mirror_matches_canonical(self):
        self.assertEqual(
            WORKER_MONITOR_HEALTH_MIGRATION.read_bytes(),
            MONITOR_HEALTH_MIGRATION.read_bytes(),
            "The Worker-deployed monitor health migration must match the canonical migration.",
        )
        self.assertEqual(
            self.db.execute(
                "SELECT status,last_cycle_completed_at,ethereum_caught_up,tron_caught_up,"
                "solana_caught_up,settlement_queue_deferred "
                "FROM genesis_treasury_monitor_health WHERE singleton=1"
            ).fetchone(),
            ("DISABLED", None, 0, 0, 0, 1),
        )
        self.db.execute(
            "UPDATE genesis_treasury_monitor_health SET status='HEALTHY',"
            "last_cycle_started_at=10,last_cycle_completed_at=20,"
            "ethereum_caught_up=1,tron_caught_up=1,solana_caught_up=1,"
            "ethereum_head_occurred_at=17,tron_head_occurred_at=18,solana_head_occurred_at=19,"
            "settlement_queue_deferred=0,updated_at=20 WHERE singleton=1"
        )
        self.assertEqual(
            self.db.execute(
                "SELECT status,ethereum_caught_up,tron_caught_up,solana_caught_up,"
                "settlement_queue_deferred FROM genesis_treasury_monitor_health WHERE singleton=1"
            ).fetchone(),
            ("HEALTHY", 1, 1, 1, 0),
        )

    def test_treasury_receipts_are_append_only_and_idempotent_by_chain_transaction_and_transfer_index(self):
        values = (
            "receipt-one", "ethereum", "0xdAC17F958D2ee523a2206206994597C13D831ec7",
            "25000000", "25", "0x1111111111111111111111111111111111111111",
            "0xbbb77071149a5F113Df15E78c58518917afa950A", "0x" + "a" * 64, 0,
            '{"blockNumber":"123","blockHash":"0x' + "b" * 64 + '"}', "FINALIZED",
            "TWO_INDEPENDENT_RPC_SOURCES", '["a","b"]', '["operator-a","operator-b"]',
            "a" * 64, '{"creditApplied":false}', "UNMATCHED", None, None, 1, 100, 100,
        )
        sql = (
            "INSERT INTO genesis_treasury_receipts("
            "receipt_id,network,asset_identifier,amount_base_units,amount_display,sender_address,treasury_address,"
            "transaction_hash,transfer_index,inclusion_reference,finality_status,verification_method,"
            "rpc_provider_ids_json,rpc_source_ids_json,evidence_digest,evidence_json,attribution_status,"
            "identity_id,source_wallet_address_id,public_visible,observed_at,verified_at"
            ") VALUES(" + ",".join("?" for _ in values) + ")"
        )
        self.db.execute(sql, values)
        self.assertEqual(
            self.db.execute("SELECT amount_display,attribution_status FROM genesis_treasury_receipts").fetchone(),
            ("25", "UNMATCHED"),
        )
        with self.assertRaisesRegex(sqlite3.IntegrityError, "immutable"):
            self.db.execute("UPDATE genesis_treasury_receipts SET amount_display='30' WHERE receipt_id='receipt-one'")
        with self.assertRaisesRegex(sqlite3.IntegrityError, "immutable"):
            self.db.execute("DELETE FROM genesis_treasury_receipts WHERE receipt_id='receipt-one'")
        duplicate = list(values)
        duplicate[0] = "receipt-duplicate-id"
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute(sql, tuple(duplicate))
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM genesis_public_payments").fetchone()[0], 0)
        self.assertEqual(
            self.db.execute(
                "SELECT COUNT(*) FROM genesis_programme_allowance_events WHERE event_type='QUALIFYING_PAYMENT_CREDIT'"
            ).fetchone()[0],
            0,
        )

    def test_qualifying_payment_intent_migration_mirror_matches_canonical_schema(self):
        self.assertEqual(
            WORKER_GENESIS_QUALIFYING_INTENT_MIGRATION.read_bytes(),
            GENESIS_QUALIFYING_INTENT_MIGRATION.read_bytes(),
            "The Worker-deployed qualifying-payment intent migration must match the canonical migration.",
        )

    def test_qualifying_payment_intents_reserve_one_global_principal_slot_and_release_on_cancel(self):
        self.db.execute(
            "INSERT INTO genesis_wallet_identities(identity_id,primary_network,primary_address,primary_address_normalized,"
            "display_name,display_name_normalized,terms_version,terms_accepted_at,created_at,updated_at) "
            "VALUES('gid-intent','ethereum','0x1111111111111111111111111111111111111111',"
            "'0x1111111111111111111111111111111111111111','Intent Member','intent member','GENESIS-TERMS-V1',90,1,1)"
        )
        self.db.execute(
            "INSERT INTO genesis_wallet_addresses(wallet_address_id,identity_id,network,address,address_normalized,"
            "wallet_role,ownership_verified_at,proof_method,created_at) "
            "VALUES('gwa-intent','gid-intent','ethereum','0x1111111111111111111111111111111111111111',"
            "'0x1111111111111111111111111111111111111111','PRIMARY',1,'EIP-191',1)"
        )
        insert = (
            "INSERT INTO genesis_payment_intents("
            "payment_intent_id,identity_id,source_wallet_address_id,network,asset_identifier,treasury_address,"
            "amount_base_units,amount_display,principal_start_base_units,principal_end_base_units,"
            "allowance_credit_usdt_base_units,tier_breakdown_json,rules_version,terms_version,status,created_at,expires_at"
            ") VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
        )
        values = (
            "gpi-one", "gid-intent", "gwa-intent", "ethereum",
            "0xdAC17F958D2ee523a2206206994597C13D831ec7",
            "0xbbb77071149a5F113Df15E78c58518917afa950A",
            "1000000000", "1000", "0", "1000000000", "30000000000",
            '[{"tranche":1,"qualifyingPrincipalBaseUnits":"1000000000","multiplierNumerator":"30","allowanceBaseUnits":"30000000000"}]',
            "GENESIS-USDT-50K-1M-TIERS-V1", "GENESIS-TERMS-V1", "OPEN", 100, 200,
        )
        self.db.execute(insert, values)
        state = self.db.execute(
            "SELECT qualifying_principal_usdt_base_units,pending_qualifying_principal_usdt_base_units,"
            "earned_usdt_base_units FROM genesis_programme_allowance_state WHERE singleton=1"
        ).fetchone()
        self.assertEqual(state, ("0", "1000000000", "0"))
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute(insert, ("gpi-two",) + values[1:])
        with self.assertRaisesRegex(sqlite3.IntegrityError, "recent all-chain monitor watermark"):
            self.db.execute("UPDATE genesis_payment_intents SET status='CANCELLED' WHERE payment_intent_id='gpi-one'")
        self._set_monitor_healthy_after(200)
        self.db.execute("UPDATE genesis_payment_intents SET status='CANCELLED' WHERE payment_intent_id='gpi-one'")
        state = self.db.execute(
            "SELECT qualifying_principal_usdt_base_units,pending_qualifying_principal_usdt_base_units,"
            "earned_usdt_base_units FROM genesis_programme_allowance_state WHERE singleton=1"
        ).fetchone()
        self.assertEqual(state, ("0", "0", "0"))

    def test_different_genesis_profiles_can_reserve_concurrent_sequential_global_tranches(self):
        wallets = [
            ("gid-concurrent-a", "gwa-concurrent-a", "0x" + "1" * 40, "Concurrent A"),
            ("gid-concurrent-b", "gwa-concurrent-b", "0x" + "2" * 40, "Concurrent B"),
        ]
        for identity_id, wallet_id, address, display_name in wallets:
            self.db.execute(
                "INSERT INTO genesis_wallet_identities(identity_id,primary_network,primary_address,primary_address_normalized,"
                "display_name,display_name_normalized,terms_version,terms_accepted_at,created_at,updated_at) "
                "VALUES(?,?,?,?,?,?,?,?,?,?)",
                (identity_id, "ethereum", address, address, display_name, display_name.lower(), "GENESIS-TERMS-V1", 90, 1, 1),
            )
            self.db.execute(
                "INSERT INTO genesis_wallet_addresses(wallet_address_id,identity_id,network,address,address_normalized,"
                "wallet_role,ownership_verified_at,proof_method,created_at) VALUES(?,?,?,?,?,?,?,?,?)",
                (wallet_id, identity_id, "ethereum", address, address, "PRIMARY", 1, "EIP-191", 1),
            )
        base = (
            "ethereum", "0xdAC17F958D2ee523a2206206994597C13D831ec7",
            "0xbbb77071149a5F113Df15E78c58518917afa950A", "1000000000", "1000",
            "30000000000", '[{"tranche":1,"principalStartBaseUnits":"0","principalEndBaseUnits":"1000000000",'
            '"qualifyingPrincipalBaseUnits":"1000000000","multiplierNumerator":"30",'
            '"multiplierDenominator":"1","allowanceBaseUnits":"30000000000"}]',
            "GENESIS-USDT-50K-1M-TIERS-V1", "GENESIS-TERMS-V1", "OPEN", 100, 200,
        )
        sql = (
            "INSERT INTO genesis_payment_intents("
            "payment_intent_id,identity_id,source_wallet_address_id,network,asset_identifier,treasury_address,"
            "amount_base_units,amount_display,principal_start_base_units,principal_end_base_units,"
            "allowance_credit_usdt_base_units,tier_breakdown_json,rules_version,terms_version,status,created_at,expires_at"
            ") VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
        )
        first = ("gpi-concurrent-a", wallets[0][0], wallets[0][1]) + base[:5] + ("0", "1000000000") + base[5:]
        second = ("gpi-concurrent-b", wallets[1][0], wallets[1][1]) + base[:5] + ("1000000000", "2000000000") + base[5:]
        self.db.execute(sql, first)
        self.db.execute(sql, second)
        self.assertEqual(
            self.db.execute(
                "SELECT qualifying_principal_usdt_base_units,pending_qualifying_principal_usdt_base_units "
                "FROM genesis_programme_allowance_state WHERE singleton=1"
            ).fetchone(),
            ("0", "2000000000"),
        )
        self.assertEqual(
            self.db.execute(
                "SELECT identity_id,principal_start_base_units,principal_end_base_units "
                "FROM genesis_payment_intents WHERE status='OPEN' ORDER BY created_at,payment_intent_id"
            ).fetchall(),
            [(wallets[0][0], "0", "1000000000"), (wallets[1][0], "1000000000", "2000000000")],
        )
        self._set_monitor_healthy_after(200)
        self.db.execute("UPDATE genesis_payment_intents SET status='CANCELLED' WHERE payment_intent_id='gpi-concurrent-a'")
        self.assertEqual(
            self.db.execute(
                "SELECT pending_qualifying_principal_usdt_base_units FROM genesis_programme_allowance_state WHERE singleton=1"
            ).fetchone()[0],
            "1000000000",
        )
        self.db.execute("UPDATE genesis_payment_intents SET status='CANCELLED' WHERE payment_intent_id='gpi-concurrent-b'")
        self.assertEqual(
            self.db.execute(
                "SELECT pending_qualifying_principal_usdt_base_units FROM genesis_programme_allowance_state WHERE singleton=1"
            ).fetchone()[0],
            "0",
        )

    def test_expired_or_over_target_payment_intents_are_rejected_or_release_the_reservation(self):
        self.db.execute(
            "INSERT INTO genesis_wallet_identities(identity_id,primary_network,primary_address,primary_address_normalized,"
            "display_name,display_name_normalized,terms_version,terms_accepted_at,created_at,updated_at) "
            "VALUES('gid-cap','ethereum','0x2222222222222222222222222222222222222222',"
            "'0x2222222222222222222222222222222222222222','Cap Member','cap member','GENESIS-TERMS-V1',90,1,1)"
        )
        self.db.execute(
            "INSERT INTO genesis_wallet_addresses(wallet_address_id,identity_id,network,address,address_normalized,"
            "wallet_role,ownership_verified_at,proof_method,created_at) "
            "VALUES('gwa-cap','gid-cap','ethereum','0x2222222222222222222222222222222222222222',"
            "'0x2222222222222222222222222222222222222222','PRIMARY',1,'EIP-191',1)"
        )
        insert = (
            "INSERT INTO genesis_payment_intents("
            "payment_intent_id,identity_id,source_wallet_address_id,network,asset_identifier,treasury_address,"
            "amount_base_units,amount_display,principal_start_base_units,principal_end_base_units,"
            "allowance_credit_usdt_base_units,tier_breakdown_json,rules_version,terms_version,status,created_at,expires_at"
            ") VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
        )
        values = (
            "gpi-cap", "gid-cap", "gwa-cap", "ethereum",
            "0xdAC17F958D2ee523a2206206994597C13D831ec7",
            "0xbbb77071149a5F113Df15E78c58518917afa950A",
            "1000000000", "1000", "49000000000", "50000000000", "10000000000",
            '[{"tranche":5,"principalStartBaseUnits":"49000000000","principalEndBaseUnits":"50000000000",'
            '"qualifyingPrincipalBaseUnits":"1000000000","multiplierNumerator":"10",'
            '"multiplierDenominator":"1","allowanceBaseUnits":"10000000000"}]',
            "GENESIS-USDT-50K-1M-TIERS-V1", "GENESIS-TERMS-V1", "OPEN", 100, 101,
        )
        self.db.execute(
            "UPDATE genesis_programme_allowance_state SET qualifying_principal_usdt_base_units='49000000000' WHERE singleton=1"
        )
        self.db.execute(insert, values)

        self.db.execute(
            "INSERT INTO genesis_wallet_identities(identity_id,primary_network,primary_address,primary_address_normalized,"
            "display_name,display_name_normalized,terms_version,terms_accepted_at,created_at,updated_at) "
            "VALUES('gid-over','ethereum','0x333','0x333','Over Cap Member','over cap member','GENESIS-TERMS-V1',90,1,1)"
        )
        self.db.execute(
            "INSERT INTO genesis_wallet_addresses(wallet_address_id,identity_id,network,address,address_normalized,"
            "wallet_role,ownership_verified_at,proof_method,created_at) "
            "VALUES('gwa-over','gid-over','ethereum','0x333','0x333','PRIMARY',1,'EIP-191',1)"
        )
        over_values = (
            "gpi-over", "gid-over", "gwa-over", "ethereum",
            "0xdAC17F958D2ee523a2206206994597C13D831ec7",
            "0xbbb77071149a5F113Df15E78c58518917afa950A",
            "1", "0.000001", "50000000000", "50000000001", "10",
            '[{"tranche":5,"principalStartBaseUnits":"50000000000","principalEndBaseUnits":"50000000001",'
            '"qualifyingPrincipalBaseUnits":"1","multiplierNumerator":"10","multiplierDenominator":"1",'
            '"allowanceBaseUnits":"10"}]',
            "GENESIS-USDT-50K-1M-TIERS-V1", "GENESIS-TERMS-V1", "OPEN", 100, 200,
        )
        with self.assertRaisesRegex(sqlite3.IntegrityError, "global USDT 50,000 principal reservation"):
            self.db.execute(insert, over_values)

        with self.assertRaisesRegex(sqlite3.IntegrityError, "all-chain monitor watermark"):
            self.db.execute("UPDATE genesis_payment_intents SET status='EXPIRED' WHERE payment_intent_id='gpi-cap'")
        self._set_monitor_healthy_after(101)
        self.db.execute("UPDATE genesis_payment_intents SET status='EXPIRED' WHERE payment_intent_id='gpi-cap'")
        self.assertEqual(
            self.db.execute(
                "SELECT pending_qualifying_principal_usdt_base_units FROM genesis_programme_allowance_state WHERE singleton=1"
            ).fetchone()[0],
            "0",
        )

    def test_exact_reconciled_receipt_settles_qualifying_payment_and_awards_global_allowance(self):
        identity_id = 'gid-settlement'
        wallet_id = 'gwa-settlement'
        terms_version = 'GENESIS-TERMS-V1'
        payment_amount = '1000000000'
        allowance_amount = '30000000000'
        sender = '0x1111111111111111111111111111111111111111'
        treasury = '0xbbb77071149a5F113Df15E78c58518917afa950A'
        asset = '0xdAC17F958D2ee523a2206206994597C13D831ec7'
        tx_hash = '0x' + 'c' * 64
        self.db.execute(
            'INSERT INTO genesis_wallet_identities(identity_id,primary_network,primary_address,primary_address_normalized,'
            'display_name,display_name_normalized,terms_version,terms_accepted_at,created_at,updated_at) '
            'VALUES(?,?,?,?,?,?,?,?,?,?)',
            (identity_id, 'ethereum', sender, sender, 'Settlement Member', 'settlement member', terms_version, 1000, 900, 1000),
        )
        self.db.execute(
            'INSERT INTO genesis_wallet_addresses(wallet_address_id,identity_id,network,address,address_normalized,'
            'wallet_role,ownership_verified_at,proof_method,created_at) VALUES(?,?,?,?,?,?,?,?,?)',
            (wallet_id, identity_id, 'ethereum', sender, sender, 'PRIMARY', 900, 'EIP-191', 900),
        )
        intent_values = (
            'gpi-settlement', identity_id, wallet_id, 'ethereum', asset, treasury,
            payment_amount, '1000', '0', payment_amount, allowance_amount,
            '[{"tranche":1,"qualifyingPrincipalBaseUnits":"1000000000","multiplierNumerator":"30","allowanceBaseUnits":"30000000000"}]',
            'GENESIS-USDT-50K-1M-TIERS-V1', terms_version, 'OPEN', 1000, 1300,
        )
        self.db.execute(
            'INSERT INTO genesis_payment_intents(payment_intent_id,identity_id,source_wallet_address_id,network,'
            'asset_identifier,treasury_address,amount_base_units,amount_display,principal_start_base_units,'
            'principal_end_base_units,allowance_credit_usdt_base_units,tier_breakdown_json,rules_version,terms_version,'
            'status,created_at,expires_at) VALUES(' + ','.join('?' for _ in intent_values) + ')',
            intent_values,
        )
        receipt_id = 'gtr-settlement'
        inclusion = '{"blockNumber":"123","blockHash":"0x' + 'd' * 64 + '"}'
        self.db.execute(
            'INSERT INTO genesis_treasury_receipts(receipt_id,network,asset_identifier,amount_base_units,amount_display,'
            'sender_address,treasury_address,transaction_hash,transfer_index,inclusion_reference,finality_status,'
            'verification_method,rpc_provider_ids_json,rpc_source_ids_json,evidence_digest,evidence_json,'
            'attribution_status,identity_id,source_wallet_address_id,public_visible,occurred_at,observed_at,verified_at) '
            'VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
            (receipt_id, 'ethereum', asset, payment_amount, '1000', sender, treasury, tx_hash, 2, inclusion, 'FINALIZED',
             'TWO_INDEPENDENT_RPC_SOURCES', '["rpc-a","rpc-b"]', '["source-a","source-b"]', 'e' * 64,
             '{"creditApplied":false}', 'MATCHED', identity_id, wallet_id, 1, 1050, 1055, 1100),
        )
        settled_tiers = (
            '[{"tranche":1,"principalStartBaseUnits":"0","principalEndBaseUnits":"1000000000",'
            '"qualifyingPrincipalBaseUnits":"1000000000","multiplierNumerator":"30",'
            '"multiplierDenominator":"1","allowanceBaseUnits":"30000000000"}]'
        )
        self.db.execute(
            'INSERT INTO genesis_public_payments(payment_record_id,identity_id,source_wallet_address_id,payment_kind,'
            'network,asset_identifier,amount_base_units,amount_display,transaction_hash,transfer_index,finality_status,'
            'receipt_finality_status,rules_version,explorer_reference,confirmed_at,public_visible,payment_intent_id,'
            'receipt_id,allowance_credit_usdt_base_units,settled_principal_start_base_units,'
            'settled_principal_end_base_units,settled_tier_breakdown_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
            ('gpm-settlement', identity_id, wallet_id, 'QUALIFYING_PAYMENT', 'ethereum', asset, payment_amount,
             '1000', tx_hash, '2', 'FINALIZED', 'FINALIZED', 'GENESIS-USDT-50K-1M-TIERS-V1',
             'https://etherscan.io/tx/' + tx_hash, 1100, 1, 'gpi-settlement', receipt_id, allowance_amount,
             '0', payment_amount, settled_tiers),
        )
        self.assertEqual(
            self.db.execute('SELECT status,receipt_id,payment_record_id FROM genesis_payment_intents WHERE payment_intent_id=?',
                            ('gpi-settlement',)).fetchone(),
            ('CONFIRMED', receipt_id, 'gpm-settlement'),
        )
        self.assertEqual(
            self.db.execute(
                'SELECT settled_principal_start_base_units,settled_principal_end_base_units,'
                'settled_allowance_credit_usdt_base_units FROM genesis_payment_intents WHERE payment_intent_id=?',
                ('gpi-settlement',),
            ).fetchone(),
            ('0', payment_amount, allowance_amount),
        )
        self.assertEqual(
            self.db.execute('SELECT qualifying_principal_usdt_base_units,pending_qualifying_principal_usdt_base_units,'
                            'earned_usdt_base_units FROM genesis_programme_allowance_state WHERE singleton=1').fetchone(),
            (payment_amount, '0', allowance_amount),
        )
        self.assertEqual(
            self.db.execute('SELECT genesis_member_status,genesis_member_awarded_at FROM genesis_wallet_identities WHERE identity_id=?',
                            (identity_id,)).fetchone(),
            ('ACTIVE', 1100),
        )
        self.assertEqual(
            self.db.execute('SELECT badge_code,status,qualifying_payment_record_id FROM genesis_member_badges WHERE identity_id=?',
                            (identity_id,)).fetchone(),
            ('GENESIS_MEMBER_DNA_GOLD', 'ACTIVE', 'gpm-settlement'),
        )
        self.assertEqual(
            self.db.execute('SELECT event_type,amount_usdt_base_units,resulting_earned_usdt_base_units'
                            ' FROM genesis_programme_allowance_events WHERE payment_record_id=?',
                            ('gpm-settlement',)).fetchone(),
            ('QUALIFYING_PAYMENT_CREDIT', allowance_amount, allowance_amount),
        )
        self.assertEqual(
            self.db.execute('SELECT receipt_finality_status FROM genesis_public_payments WHERE payment_record_id=?',
                            ('gpm-settlement',)).fetchone()[0],
            'FINALIZED',
        )
        with self.assertRaisesRegex(sqlite3.IntegrityError, "immutable"):
            self.db.execute(
                "UPDATE genesis_public_payments SET amount_display='2000' WHERE payment_record_id='gpm-settlement'"
            )
        self.assertEqual(
            self.db.execute(
                'SELECT settled_principal_start_base_units,settled_principal_end_base_units,settled_tier_breakdown_json '
                'FROM genesis_public_payments WHERE payment_record_id=?',
                ('gpm-settlement',),
            ).fetchone(),
            (
                '0',
                payment_amount,
                settled_tiers,
            ),
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
        with self.assertRaisesRegex(sqlite3.IntegrityError, "schedule.*(cannot change|locked)"):
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

    def test_database_freeze_blocks_new_identity_registration_and_pauses_existing_member_edits_until_launch(self):
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
        with self.assertRaisesRegex(sqlite3.IntegrityError, "wallet linking is paused"):
            self.db.execute(
                "INSERT INTO genesis_wallet_addresses(wallet_address_id,identity_id,network,address,address_normalized,"
                "wallet_role,ownership_verified_at,proof_method,created_at) "
                "VALUES('gwa-new','gid-existing','tron','TNew','TNew','PAYMENT',?,'TIP-191',?)",
                (now, now),
            )
        with self.assertRaisesRegex(sqlite3.IntegrityError, "profile changes are paused"):
            self.db.execute(
                "UPDATE genesis_wallet_identities SET display_name='Changed Wallet',display_name_normalized='changed wallet' "
                "WHERE identity_id='gid-existing'"
            )
        # Existing primary-wallet authentication remains available during the pause.
        self.db.execute(
            "INSERT INTO genesis_wallet_challenges(challenge_id,identity_id,network,address,address_normalized,"
            "challenge_purpose,nonce_digest,domain,message_digest,message,created_at,expires_at) "
            "VALUES('gch-existing','gid-existing','ethereum','0xabc','0xabc','IDENTIFY','nonce-existing','example.test',"
            "'digest-existing','existing wallet sign-in',?,?)",
            (now, now + 600),
        )
        with self.assertRaisesRegex(sqlite3.IntegrityError, "New Genesis identities remain closed"):
            self.db.execute(
                "INSERT INTO genesis_wallet_challenges(challenge_id,network,address,address_normalized,challenge_purpose,"
                "nonce_digest,domain,message_digest,message,created_at,expires_at) "
                "VALUES('gch-new','solana','SoNew','SoNew','IDENTIFY','nonce-new','example.test','digest-new',"
                "'new identity sign-in',?,?)",
                (now, now + 600),
            )
        with self.assertRaisesRegex(sqlite3.IntegrityError, "paused during the 24-hour pre-launch freeze"):
            self.db.execute(
                "INSERT INTO genesis_programme_allowance_events(event_id,identity_id,event_type,amount_usdt_base_units,"
                "resulting_earned_usdt_base_units,resulting_reserved_usdt_base_units,resulting_consumed_usdt_base_units,"
                "rules_version,created_at) VALUES('evt-frozen-right','gid-existing','QUALIFYING_PAYMENT_CREDIT',"
                "'1000000','1000000','0','0','rules-v1',?)",
                (now,),
            )
        # Actual launch resumes the programme for existing identities, but never reopens registration.
        self.db.execute(
            "UPDATE genesis_programme_control SET acrown_launched_at=?,updated_at=? WHERE singleton=1",
            (launch, launch),
        )
        self.db.execute(
            "INSERT INTO genesis_programme_allowance_events(event_id,identity_id,event_type,amount_usdt_base_units,"
            "resulting_earned_usdt_base_units,resulting_reserved_usdt_base_units,resulting_consumed_usdt_base_units,"
            "rules_version,created_at) VALUES('evt-resumed-right','gid-existing','QUALIFYING_PAYMENT_CREDIT',"
            "'1000000','1000000','0','0','rules-v1',?)",
            (launch + 10,),
        )
        self.assertEqual(
            self.db.execute(
                "SELECT purchase_window_last_purchase_at,purchase_window_closes_at "
                "FROM genesis_programme_control WHERE singleton=1"
            ).fetchone(),
            (launch + 10, launch + 10 + 15_552_000),
        )
        self.db.execute(
            "INSERT INTO genesis_wallet_addresses(wallet_address_id,identity_id,network,address,address_normalized,"
            "wallet_role,ownership_verified_at,proof_method,created_at) "
            "VALUES('gwa-after-launch','gid-existing','tron','TAfter','TAfter','PAYMENT',?,'TIP-191',?)",
            (launch + 1, launch + 1),
        )
        self.db.execute(
            "UPDATE genesis_wallet_identities SET display_name='Changed Wallet',display_name_normalized='changed wallet',updated_at=? "
            "WHERE identity_id='gid-existing'",
            (launch + 1,),
        )
        self.db.execute(
            "INSERT INTO genesis_wallet_challenges(challenge_id,identity_id,network,address,address_normalized,wallet_role,"
            "challenge_purpose,nonce_digest,domain,message_digest,message,created_at,expires_at) "
            "VALUES('gch-link-after-launch','gid-existing','tron','TNext','TNext','PAYMENT','LINK','nonce-link','example.test',"
            "'digest-link','wallet link after launch',?,?)",
            (launch + 1, launch + 601),
        )
        self.db.execute(
            "INSERT INTO genesis_wallet_challenges(challenge_id,identity_id,network,address,address_normalized,"
            "challenge_purpose,requested_display_name,nonce_digest,domain,message_digest,message,created_at,expires_at) "
            "VALUES('gch-rename-after-launch','gid-existing','ethereum','0xabc','0xabc','RENAME','Changed Wallet','nonce-rename','example.test',"
            "'digest-rename','profile rename after launch',?,?)",
            (launch + 1, launch + 601),
        )
        with self.assertRaisesRegex(sqlite3.IntegrityError, "primary-wallet registration is permanently closed"):
            self.db.execute(
                "INSERT INTO genesis_wallet_identities(identity_id,primary_network,primary_address,primary_address_normalized,"
                "display_name,display_name_normalized,created_at,updated_at) "
                "VALUES('gid-new-after-launch','solana','SoNew2','SoNew2','New Wallet 3','new wallet 3',?,?)",
                (launch + 1, launch + 1),
            )
        with self.assertRaisesRegex(sqlite3.IntegrityError, "New Genesis identities remain closed"):
            self.db.execute(
                "INSERT INTO genesis_wallet_challenges(challenge_id,network,address,address_normalized,challenge_purpose,"
                "nonce_digest,domain,message_digest,message,created_at,expires_at) "
                "VALUES('gch-new-after-launch','solana','SoNew2','SoNew2','IDENTIFY','nonce-new2','example.test','digest-new2',"
                "'new identity after launch',?,?)",
                (launch + 1, launch + 601),
            )
        with self.assertRaisesRegex(sqlite3.IntegrityError, "schedule.*(cannot change|locked)"):
            self.db.execute(
                "UPDATE genesis_programme_control SET scheduled_acrown_launch_at=?,registration_freeze_at=? "
                "WHERE singleton=1",
                (launch + 3600, freeze + 3600),
            )

    def test_global_purchase_window_starts_at_acrown_launch_without_waiting_for_floor_service(self):
        launch = 2_100_000_000
        close = launch + 15_552_000
        self.db.execute(
            "UPDATE genesis_programme_control SET acrown_launched_at=?,updated_at=1 WHERE singleton=1",
            (launch,),
        )
        self.assertEqual(
            self.db.execute(
                "SELECT purchase_window_started_at,purchase_window_last_purchase_at,purchase_window_closes_at "
                "FROM genesis_programme_control WHERE singleton=1"
            ).fetchone(),
            (launch, None, close),
        )
        self.assertIsNone(
            self.db.execute(
                "SELECT acs_floor_purchase_opened_at FROM genesis_programme_control WHERE singleton=1"
            ).fetchone()[0]
        )
        with self.assertRaisesRegex(sqlite3.IntegrityError, "rolling inactivity timer can move only after a finalized Genesis-right or ACS floor-price purchase"):
            self.db.execute(
                "UPDATE genesis_programme_control SET purchase_window_closes_at=? WHERE singleton=1",
                (close + 1,),
            )

    def test_genesis_right_and_floor_purchases_both_roll_the_shared_inactivity_timer(self):
        identity_id = "gid-rolling-timer"
        self.db.execute(
            "INSERT INTO genesis_wallet_identities(identity_id,primary_network,primary_address,primary_address_normalized,"
            "display_name,display_name_normalized,created_at,updated_at) "
            "VALUES(?,?,?,?,?,?,1,1)",
            (identity_id, "ethereum", "0xrolling", "0xrolling", "Rolling Timer 1", "rolling timer 1"),
        )
        launch = 2_100_000_000

        def add_event(event_id, event_type, created_at):
            self.db.execute(
                "INSERT INTO genesis_programme_allowance_events(event_id,identity_id,event_type,amount_usdt_base_units,"
                "resulting_earned_usdt_base_units,resulting_reserved_usdt_base_units,resulting_consumed_usdt_base_units,"
                "rules_version,created_at) VALUES(?,?,?,?,?,?,?,?,?)",
                (event_id, identity_id, event_type, "1000000", "1000000", "0", "1000000", "rules-v1", created_at),
            )

        # Before ACROWN launch, a qualifying-payment credit does not start or reset the timer.
        add_event("evt-prelaunch-right", "QUALIFYING_PAYMENT_CREDIT", launch - 10)
        self.db.execute(
            "UPDATE genesis_programme_control SET acrown_launched_at=?,updated_at=1 WHERE singleton=1",
            (launch,),
        )
        initial_close = launch + 15_552_000
        self.assertEqual(
            self.db.execute(
                "SELECT purchase_window_started_at,purchase_window_last_purchase_at,purchase_window_closes_at "
                "FROM genesis_programme_control WHERE singleton=1"
            ).fetchone(),
            (launch, None, initial_close),
        )

        # ACS floor-purchase service availability is separate from the timer's launch start.
        floor_open = launch + 7200
        self.db.execute(
            "UPDATE genesis_programme_control SET acs_floor_purchase_opened_at=?,updated_at=2 WHERE singleton=1",
            (floor_open,),
        )

        first_right_purchase = launch + 86_400
        add_event("evt-right-1", "QUALIFYING_PAYMENT_CREDIT", first_right_purchase)
        self.assertEqual(
            self.db.execute(
                "SELECT purchase_window_last_purchase_at,purchase_window_closes_at "
                "FROM genesis_programme_control WHERE singleton=1"
            ).fetchone(),
            (first_right_purchase, first_right_purchase + 15_552_000),
        )

        # Quotes/reservations are not purchases and do not move the shared timer.
        reservation = first_right_purchase + 5 * 86_400
        add_event("evt-floor-reservation", "FLOOR_PURCHASE_RESERVATION", reservation)
        self.assertEqual(
            self.db.execute(
                "SELECT purchase_window_last_purchase_at,purchase_window_closes_at "
                "FROM genesis_programme_control WHERE singleton=1"
            ).fetchone(),
            (first_right_purchase, first_right_purchase + 15_552_000),
        )

        first_floor_purchase = first_right_purchase + 30 * 86_400
        add_event("evt-floor-1", "FLOOR_PURCHASE_CONSUMPTION", first_floor_purchase)
        self.assertEqual(
            self.db.execute(
                "SELECT purchase_window_last_purchase_at,purchase_window_closes_at "
                "FROM genesis_programme_control WHERE singleton=1"
            ).fetchone(),
            (first_floor_purchase, first_floor_purchase + 15_552_000),
        )

        second_right_purchase = first_floor_purchase + 30 * 86_400
        add_event("evt-right-2", "QUALIFYING_PAYMENT_CREDIT", second_right_purchase)
        self.assertEqual(
            self.db.execute(
                "SELECT purchase_window_last_purchase_at,purchase_window_closes_at "
                "FROM genesis_programme_control WHERE singleton=1"
            ).fetchone(),
            (second_right_purchase, second_right_purchase + 15_552_000),
        )

        with self.assertRaisesRegex(sqlite3.IntegrityError, "purchase inactivity period is not open"):
            add_event("evt-right-after-expiry", "QUALIFYING_PAYMENT_CREDIT", second_right_purchase + 15_552_000)

        self.assertEqual(
            self.db.execute(
                "SELECT COUNT(*) FROM genesis_programme_allowance_events "
                "WHERE event_type IN ('QUALIFYING_PAYMENT_CREDIT','FLOOR_PURCHASE_CONSUMPTION')"
            ).fetchone()[0],
            4,
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

    def test_unmatched_direct_payment_cannot_award_genesis_badge(self):
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
        with self.assertRaisesRegex(sqlite3.IntegrityError, "exact, unexpired, independently reconciled receipt"):
            self.db.execute(
                "INSERT INTO genesis_public_payments(payment_record_id,identity_id,source_wallet_address_id,payment_kind,network,"
                "asset_identifier,amount_base_units,amount_display,transaction_hash,transfer_index,finality_status,rules_version,"
                "explorer_reference,confirmed_at) "
                "VALUES('gp-1','gid-badge','gwa-badge','QUALIFYING_PAYMENT','ethereum','USDT','1000000','1.00',?,'0',"
                "'FINALIZED','rules-v1',?,2)",
                (tx, "https://etherscan.io/tx/" + tx),
            )
        self.assertEqual(
            self.db.execute("SELECT genesis_member_status FROM genesis_wallet_identities WHERE identity_id='gid-badge'").fetchone()[0],
            "NOT_QUALIFIED",
        )
        self.assertEqual(
            self.db.execute("SELECT COUNT(*) FROM genesis_public_payments WHERE payment_record_id='gp-1'").fetchone()[0],
            0,
        )
        self.assertEqual(
            self.db.execute("SELECT COUNT(*) FROM genesis_member_badges WHERE identity_id='gid-badge'").fetchone()[0],
            0,
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
