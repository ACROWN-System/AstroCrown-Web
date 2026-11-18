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

test("all six evaluated wallet brands remain candidates, not production-approved providers", () => {
  assert.deepEqual(
    policy.candidates.map((item) => item.walletId).sort(),
    ["bitget-wallet", "coin98", "metamask", "okx-wallet", "tokenpocket", "trust-wallet"],
  );
  assert.ok(policy.candidates.every((item) => item.qualificationStatus === "CANDIDATE_NOT_QUALIFIED"));
  assert.ok(policy.candidates.every((item) => Array.isArray(item.blockingGates) && item.blockingGates.length > 0));
  assert.equal(policy.productionAcceptance.enabled, false);
  assert.deepEqual(policy.productionAcceptance.qualifiedWalletIds, []);
});

test("Bitget candidate documents EVM, TRON and Solana providers with message-signing capabilities", () => {
  const bitget = policy.candidates.find((item) => item.walletId === "bitget-wallet");
  assert.ok(bitget);
  assert.equal(bitget.documentedNetworkApis.ethereum.provider, "window.bitkeep.ethereum");
  assert.ok(bitget.documentedNetworkApis.ethereum.capabilities.includes("signPersonalMessage"));
  assert.ok(bitget.documentedNetworkApis.tron.capabilities.includes("signMessageV2"));
  assert.ok(bitget.documentedNetworkApis.solana.capabilities.includes("signMessage"));
  assert.ok(bitget.blockingGates.includes("three_network_usdt_send_receive_tests"));
  assert.ok(bitget.blockingGates.includes("wallet_restore_test_all_three_networks"));
});

test("TokenPocket candidate records EVM, TRON and Solana proof paths and platform-specific testing", () => {
  const tp = policy.candidates.find((item) => item.walletId === "tokenpocket");
  assert.ok(tp);
  assert.ok(tp.documentedNetworkApis.ethereum.capabilities.includes("EIP-1193"));
  assert.ok(tp.documentedNetworkApis.tron.capabilities.includes("signMessageV2"));
  assert.ok(tp.documentedNetworkApis.solana.capabilities.includes("platform_specific_adapter_validation"));
  assert.ok(tp.blockingGates.includes("solana_extension_provider_validation"));
  assert.ok(tp.blockingGates.includes("platform_route_qualification"));
});

test("Coin98 remains a candidate with explicit, testable TRON and Solana signing blockers", () => {
  const coin98 = policy.candidates.find((item) => item.walletId === "coin98");
  assert.ok(coin98);
  assert.ok(coin98.notes.some((note) => /does not yet explicitly document an arbitrary off-chain message-signing method/i.test(note)));
  assert.ok(coin98.blockingGates.includes("published_or_tested_tron_dapp_connect_and_message_signature_path"));
  assert.ok(coin98.blockingGates.includes("documented_or_tested_solana_offchain_message_signature_path"));
  assert.ok(coin98.blockingGates.includes("wallet_restore_address_derivation_test_all_three_networks"));
});

test("MetaMask TRON dApp limitation remains a blocking qualification item", () => {
  const metamask = policy.candidates.find((item) => item.walletId === "metamask");
  assert.ok(metamask);
  assert.ok(metamask.notes.some((note) => /direct TRON dApp connection is not available/i.test(note)));
  assert.ok(metamask.blockingGates.includes("tron_primary_wallet_message_signature_or_approved_transaction_proof"));
});

test("all candidates are blocked by one or more exact three-network and restoration qualification requirements", () => {
  for (const candidate of policy.candidates) {
    const gateText = candidate.blockingGates.join(" ").toLowerCase();
    assert.match(gateText, /three.network|restore|address.derivation|end.to.end/);
  }
});
