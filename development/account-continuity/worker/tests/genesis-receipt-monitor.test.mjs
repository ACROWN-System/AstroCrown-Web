import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import test from "node:test";
import {
  explorerUrl,
  formatUsdtAmount,
  prepareGenesisRpcPair,
  normalizeTronBlockReceiptPage,
  publicGenesisTreasuryReceipts,
  runGenesisReceiptMonitor,
} from "../src/genesis-receipt-monitor.js";

globalThis.crypto ??= webcrypto;

function rpcEnvironment(network = "ethereum") {
  const prefix = "GENESIS_" + network.toUpperCase() + "_RPC_";
  return {
    [prefix + "A_URL"]: "https://rpc-a.example.test",
    [prefix + "A_SOURCE_ID"]: "operator-a",
    [prefix + "B_URL"]: "https://rpc-b.example.test",
    [prefix + "B_SOURCE_ID"]: "operator-b",
  };
}

test("USDT amount formatting uses exact six-decimal integer arithmetic", () => {
  assert.equal(formatUsdtAmount("1"), "0.000001");
  assert.equal(formatUsdtAmount("1000000"), "1");
  assert.equal(formatUsdtAmount("1234567"), "1.234567");
  assert.equal(formatUsdtAmount("100000000"), "100");
  assert.equal(formatUsdtAmount("123456789012345678901"), "123456789012345.678901");
  assert.throws(() => formatUsdtAmount("0"), /must be positive/);
  assert.throws(() => formatUsdtAmount("1.5"), /exact integer/);
});

test("RPC source configuration requires HTTPS, distinct origins and distinct operators", () => {
  const pair = prepareGenesisRpcPair(rpcEnvironment(), "ethereum");
  assert.equal(pair.length, 2);
  assert.equal(pair[0].sourceId, "operator-a");
  assert.equal(pair[1].sourceId, "operator-b");
  assert.notEqual(pair[0].origin, pair[1].origin);

  const tronPair = prepareGenesisRpcPair({
    ...rpcEnvironment("tron"),
    GENESIS_TRON_RPC_A_API_KEY: "test-tron-key",
  }, "tron");
  assert.equal(tronPair[0].apiKey, "test-tron-key");
  assert.equal(tronPair[1].apiKey, "");
  assert.throws(() => prepareGenesisRpcPair({
    ...rpcEnvironment("tron"),
    GENESIS_TRON_RPC_A_API_KEY: "invalid" + String.fromCharCode(10) + "key",
  }, "tron"), /API key is invalid/);

  const sameOrigin = {
    ...rpcEnvironment(),
    GENESIS_ETHEREUM_RPC_B_URL: "https://rpc-a.example.test/second-path",
  };
  assert.throws(() => prepareGenesisRpcPair(sameOrigin, "ethereum"), /different HTTPS origins/);

  const sameOperator = {
    ...rpcEnvironment(),
    GENESIS_ETHEREUM_RPC_B_SOURCE_ID: "operator-a",
  };
  assert.throws(() => prepareGenesisRpcPair(sameOperator, "ethereum"), /independently identified operators/);

  const insecure = {
    ...rpcEnvironment(),
    GENESIS_ETHEREUM_RPC_A_URL: "http://rpc-a.example.test",
  };
  assert.throws(() => prepareGenesisRpcPair(insecure, "ethereum"), /HTTPS endpoint/);

  assert.throws(() => prepareGenesisRpcPair({}, "bitcoin"), /Unsupported network/);
});

test("receipt monitoring remains disabled outside staging and without its explicit feature flag", async () => {
  assert.deepEqual(await runGenesisReceiptMonitor({ ENVIRONMENT: "local" }), {
    status: "DISABLED",
    receiptsRecorded: 0,
  });
  assert.deepEqual(await runGenesisReceiptMonitor({
    ENVIRONMENT: "staging",
    GENESIS_RECEIPT_MONITOR_ENABLED: "false",
  }), {
    status: "DISABLED",
    receiptsRecorded: 0,
  });
  assert.deepEqual(await runGenesisReceiptMonitor({ ENVIRONMENT: "production", GENESIS_RECEIPT_MONITOR_ENABLED: "true" }), {
    status: "DISABLED",
    receiptsRecorded: 0,
  });
});

test("public receipt projection contains explorer evidence but no internal identity attribution", async () => {
  const rows = [
    {
      network: "ethereum",
      asset_identifier: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      amount_display: "25.5",
      sender_address: "0x1111111111111111111111111111111111111111",
      treasury_address: "0xbbb77071149a5F113Df15E78c58518917afa950A",
      transaction_hash: "0x" + "ab".repeat(32),
      transfer_index: 3,
      inclusion_reference: JSON.stringify({ blockNumber: "123" }),
      finality_status: "FINALIZED",
      verified_at: 2_000_000_000,
    },
    {
      network: "tron",
      asset_identifier: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
      amount_display: "10",
      sender_address: "TExampleSender",
      treasury_address: "TAKHQcuJ3RLsZZxCorWc3rav6M28dS6VTR",
      transaction_hash: "cd".repeat(32),
      transfer_index: 0,
      inclusion_reference: JSON.stringify({ blockNumber: "456" }),
      finality_status: "SOLIDIFIED",
      verified_at: 2_000_000_001,
    },
    {
      network: "solana",
      asset_identifier: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
      amount_display: "1.25",
      sender_address: "SenderPublicKey",
      treasury_address: "AWyq9E7Wsdjv9VyoTs84XGiubQGZM7fETnZ8ddfArwkG",
      transaction_hash: "1".repeat(64),
      transfer_index: 2,
      inclusion_reference: JSON.stringify({ slot: "789" }),
      finality_status: "FINALIZED",
      verified_at: 2_000_000_002,
    },
  ];
  let sqlSeen = "";
  const db = {
    prepare(sql) {
      sqlSeen = sql;
      return {
        bind(limit) {
          assert.equal(limit, 100);
          return { all: async () => ({ results: rows }) };
        },
      };
    },
  };
  const result = await publicGenesisTreasuryReceipts(db);
  assert.match(sqlSeen, /FROM genesis_treasury_receipts/);
  assert.doesNotMatch(sqlSeen, /JOIN genesis_wallet_identities|identity_id|source_wallet_address_id/);
  assert.equal(result.length, 3);
  assert.equal(result[0].label, "USDT · Ethereum (ERC-20)");
  assert.equal(result[1].label, "USDT · TRON (TRC-20)");
  assert.equal(result[2].label, "USDT · Solana (SPL)");
  assert.equal(result[0].explorerUrl, "https://etherscan.io/tx/" + rows[0].transaction_hash);
  assert.equal(result[1].explorerUrl, "https://tronscan.org/#/transaction/" + rows[1].transaction_hash);
  assert.equal(result[2].explorerUrl, "https://solscan.io/tx/" + rows[2].transaction_hash);
  for (const item of result) {
    assert.equal(item.asset, "USDT");
    assert.equal(item.verification, "TWO_INDEPENDENT_RPC_SOURCES");
    assert.equal(item.creditApplied, false);
    assert.equal(Object.hasOwn(item, "identityId"), false);
    assert.equal(Object.hasOwn(item, "sourceWalletAddressId"), false);
  }
});

test("TRON solidified block receipt pages must cover each transaction exactly once at the requested height", () => {
  const first = "a".repeat(64);
  const second = "b".repeat(64);
  const receipts = [
    { id: first, blockNumber: 123, receipt: { result: "SUCCESS" } },
    { id: second, blockNumber: 123 },
  ];
  const indexed = normalizeTronBlockReceiptPage(receipts, 123, [first, second]);
  assert.equal(indexed.size, 2);
  assert.equal(indexed.get(first).receipt.result, "SUCCESS");
  assert.deepEqual(
    Array.from(normalizeTronBlockReceiptPage([], 123, []).keys()),
    [],
    "An empty but independently verified block has an empty receipt page.",
  );
  assert.throws(() => normalizeTronBlockReceiptPage([receipts[0]], 123, [first, second]), /every transaction/);
  assert.throws(() => normalizeTronBlockReceiptPage([receipts[0], receipts[0]], 123, [first, second]), /unknown, malformed or duplicate/);
  assert.throws(() => normalizeTronBlockReceiptPage([{ ...receipts[0], id: "c".repeat(64) }], 123, [first]), /unknown, malformed or duplicate/);
  assert.throws(() => normalizeTronBlockReceiptPage([{ ...receipts[0], blockNumber: 122 }], 123, [first]), /requested solidified block height/);
  assert.throws(() => normalizeTronBlockReceiptPage([], 123, [first]), /every transaction/);
  assert.throws(() => normalizeTronBlockReceiptPage(null, 123, []), /malformed block receipt page/);
});

test("explorer links reject malformed transaction identifiers", () => {
  assert.equal(explorerUrl("ethereum", "bad"), null);
  assert.equal(explorerUrl("tron", "bad"), null);
  assert.equal(explorerUrl("solana", "bad"), null);
  assert.equal(explorerUrl("other", "1".repeat(64)), null);
});
