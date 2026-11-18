import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const policy = JSON.parse(readFileSync(
  new URL("../../../supporter-programme/genesis-wallet-compatibility.json", import.meta.url),
  "utf8",
));

const walletIds = [
  "bitget-wallet",
  "coin98",
  "okx-wallet",
  "tokenpocket",
  "trust-wallet",
];

test("Genesis continues to define all three USDT payment rails at programme level", () => {
  assert.deepEqual(
    policy.paymentRails.map((item) => item.network).sort(),
    ["ethereum", "solana", "tron"],
  );
  assert.deepEqual(
    policy.paymentRails.map((item) => item.assetStandard).sort(),
    ["ERC-20", "SPL", "TRC-20"],
  );
  assert.ok(policy.paymentRails.every((item) => item.decimals === 6));
});

test("the current practical qualification wave contains the selected five wallets only", () => {
  assert.deepEqual(policy.currentQualificationWave.slice().sort(), walletIds);
  assert.deepEqual(policy.candidates.map((item) => item.walletId).sort(), walletIds);
  assert.ok(policy.candidates.every((item) => item.qualificationStatus === "CANDIDATE_NOT_QUALIFIED"));
  assert.equal(policy.productionAcceptance.enabled, false);
  assert.deepEqual(policy.productionAcceptance.qualifiedWalletIds, []);
});

test("wallet identity needs one verified signing route, not signatures on every payment chain", () => {
  const identity = policy.qualificationModel.identity;
  assert.equal(identity.required, true);
  assert.ok(identity.preferredIdentityNetworks.includes("ethereum"));
  assert.ok(identity.preferredIdentityNetworks.includes("solana"));
  assert.match(identity.tronIdentity, /optional/i);
});

test("payment completion is verified from chain evidence, not a wallet notification", () => {
  const payment = policy.qualificationModel.payment;
  assert.deepEqual(payment.acceptedRails.slice().sort(), ["ethereum", "solana", "tron"]);
  assert.match(payment.attribution, /wallet does not need to notify Genesis/i);
  assert.ok(payment.walletProviderNotRequired.some((item) => /TRON signMessageV2/i.test(item)));
  assert.ok(payment.walletProviderNotRequired.some((item) => /every accepted payment network/i.test(item)));
  assert.match(payment.networkSelection, /not required.*all three rails/i);
});

test("Solana delivery only requires a verified SPL recipient; participant signing is not required", () => {
  const delivery = policy.qualificationModel.delivery;
  assert.equal(delivery.required, true);
  assert.equal(delivery.network, "solana");
  assert.ok(delivery.minimum.some((item) => /receive the ACROWN SPL token/i.test(item)));
  assert.match(delivery.transferActor, /AstroCrown.*submits the ACROWN transfer/i);
  assert.ok(delivery.walletProviderNotRequired.some((item) => /transaction signing for token receipt/i.test(item)));
});

test("obsolete per-wallet three-chain signature, transfer and restore gates are explicitly removed", () => {
  const excluded = policy.qualificationModel.notRequiredForWalletQualification.join(" ").toLowerCase();
  assert.match(excluded, /all three payment networks/);
  assert.match(excluded, /restore testing/);
  assert.match(excluded, /signing or sending the acrown delivery/);
  for (const candidate of policy.candidates) {
    const gateText = candidate.blockingGates.join(" ").toLowerCase();
    assert.doesNotMatch(gateText, /restore.*all three|sign.*all three|three.network.*restore/);
    assert.equal(candidate.tronDappMessageSignatureRequired, false);
  }
});

test("Bitget candidate has EVM or Solana identity and a Solana receiving route", () => {
  const item = policy.candidates.find((candidate) => candidate.walletId === "bitget-wallet");
  assert.ok(item.identityPaths.ethereum);
  assert.ok(item.identityPaths.solana);
  assert.ok(item.paymentAndDeliveryAssessment.solanaDelivery);
});

test("TokenPocket keeps extension and mobile Solana route differences explicit", () => {
  const item = policy.candidates.find((candidate) => candidate.walletId === "tokenpocket");
  assert.match(item.identityPaths.solana, /extension and mobile routes require separate confirmation/i);
  assert.ok(item.blockingGates.some((gate) => /Solana extension or mobile/i.test(gate)));
});

test("Coin98 Solana message signing can establish identity without requiring a TRON dApp signer", () => {
  const item = policy.candidates.find((candidate) => candidate.walletId === "coin98");
  assert.match(item.identityPaths.solana, /sol_signMessage/);
  assert.match(item.paymentAndDeliveryAssessment.paymentUse, /missing TRON dApp signature route does not block/i);
  assert.equal(item.tronDappMessageSignatureRequired, false);
});

test("OKX TRON payment attribution does not depend on its dApp signing method", () => {
  const item = policy.candidates.find((candidate) => candidate.walletId === "okx-wallet");
  assert.match(item.paymentAndDeliveryAssessment.paymentUse, /native TRON transfer/i);
  assert.equal(item.tronDappMessageSignatureRequired, false);
});

test("Trust Wallet can be qualified using one EVM or Solana identity route", () => {
  const item = policy.candidates.find((candidate) => candidate.walletId === "trust-wallet");
  assert.ok(item.identityPaths.ethereum);
  assert.ok(item.identityPaths.solana);
});

test("MetaMask remains outside the first five-wallet wave without being declared generally incompatible", () => {
  assert.ok(!policy.currentQualificationWave.includes("metamask"));
  const item = policy.outsideCurrentWave.find((candidate) => candidate.walletId === "metamask");
  assert.ok(item);
  assert.equal(item.status, "NOT_IN_CURRENT_FIVE_WALLET_WAVE");
  assert.match(item.note, /not a general disqualification/i);
});

test("programme-level payment and accounting gates remain mandatory", () => {
  assert.ok(policy.systemWideGates.some((item) => /two independently operated RPC providers/i.test(item)));
  assert.ok(policy.systemWideGates.some((item) => /unique.*transaction.*transfer/i.test(item)));
  assert.ok(policy.systemWideGates.some((item) => /append-only/i.test(item)));
  assert.ok(policy.systemWideGates.some((item) => /Solana ACROWN destination/i.test(item)));
});
