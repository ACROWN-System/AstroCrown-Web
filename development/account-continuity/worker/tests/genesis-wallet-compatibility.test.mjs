import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const policy = JSON.parse(readFileSync(
  new URL("../../../supporter-programme/genesis-wallet-compatibility.json", import.meta.url),
  "utf8",
));

test("Genesis wallet policy requires exactly Ethereum, TRON and Solana USDT support", () => {
  assert.deepEqual(
    policy.requiredNetworks.map((item) => item.network).sort(),
    ["ethereum", "solana", "tron"],
  );
  assert.deepEqual(
    policy.requiredNetworks.map((item) => item.assetStandard).sort(),
    ["ERC-20", "SPL", "TRC-20"],
  );
});

test("wallet candidates are not silently promoted to production-approved providers", () => {
  assert.deepEqual(
    policy.candidates.map((item) => item.walletId).sort(),
    ["metamask", "okx-wallet", "trust-wallet"],
  );
  assert.ok(policy.candidates.every((item) => item.qualificationStatus === "CANDIDATE_NOT_QUALIFIED"));
  assert.ok(policy.candidates.every((item) => Array.isArray(item.blockingGates) && item.blockingGates.length > 0));
  assert.equal(policy.productionAcceptance.enabled, false);
  assert.deepEqual(policy.productionAcceptance.qualifiedWalletIds, []);
});

test("MetaMask TRON dApp limitation remains a blocking qualification item", () => {
  const metamask = policy.candidates.find((item) => item.walletId === "metamask");
  assert.ok(metamask);
  assert.ok(metamask.notes.some((note) => /direct TRON dApp connection is not available/i.test(note)));
  assert.ok(metamask.blockingGates.includes("tron_primary_wallet_message_signature_or_approved_transaction_proof"));
});

test("every wallet candidate is blocked by required three-network and restore tests", () => {
  for (const candidate of policy.candidates) {
    assert.ok(candidate.blockingGates.includes("three_network_end_to_end_tests"));
    assert.ok(candidate.blockingGates.includes("wallet_restore_test"));
  }
});
