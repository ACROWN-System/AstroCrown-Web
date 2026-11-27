import test from "node:test";
import assert from "node:assert/strict";
import {
  genesisQualifyingPaymentGate,
  genesisUsdtPaymentPresentation,
  parseGenesisUsdtAmountToBaseUnits,
} from "../shared/genesis-payment-policy.mjs";

const enabledEnvironment = {
  ENVIRONMENT: "staging",
  GENESIS_RECEIPT_MONITOR_ENABLED: "true",
  GENESIS_QUALIFYING_PAYMENTS_ENABLED: "true",
  GENESIS_QUALIFYING_RULES_APPROVED: "true",
  GENESIS_QUALIFYING_RULES_VERSION: "GENESIS-USDT-50K-1M-TIERS-V1",
  GENESIS_TERMS_APPROVED: "true",
  GENESIS_TERMS_VERSION: "GENESIS-TERMS-V1",
  GENESIS_MINIMUM_QUALIFYING_USDT_BASE_UNITS: "1000000",
  GENESIS_ETHEREUM_TREASURY_CONTROL_VERIFIED: "true",
  GENESIS_TRON_TREASURY_CONTROL_VERIFIED: "true",
  GENESIS_SOLANA_TREASURY_CONTROL_VERIFIED: "true",
};

test("Genesis payment acceptance is closed by default and every independent approval gate is mandatory", () => {
  const closed = genesisQualifyingPaymentGate({}, "ethereum", false);
  assert.equal(closed.enabled, false);
  assert.ok(closed.reasons.length >= 8);

  assert.equal(genesisQualifyingPaymentGate(enabledEnvironment, "ethereum", false).enabled, false);
  assert.equal(genesisQualifyingPaymentGate(enabledEnvironment, "ethereum", true).enabled, true);
  assert.equal(genesisQualifyingPaymentGate(enabledEnvironment, "tron", true).enabled, true);
  assert.equal(genesisQualifyingPaymentGate(enabledEnvironment, "solana", true).enabled, true);

  for (const [key, value] of [
    ["GENESIS_RECEIPT_MONITOR_ENABLED", "false"],
    ["GENESIS_QUALIFYING_PAYMENTS_ENABLED", "false"],
    ["GENESIS_QUALIFYING_RULES_APPROVED", "false"],
    ["GENESIS_TERMS_APPROVED", "false"],
    ["GENESIS_ETHEREUM_TREASURY_CONTROL_VERIFIED", "false"],
  ]) {
    const altered = { ...enabledEnvironment, [key]: value };
    assert.equal(genesisQualifyingPaymentGate(altered, "ethereum", true).enabled, false, key);
  }
  assert.equal(genesisQualifyingPaymentGate({
    ...enabledEnvironment,
    GENESIS_QUALIFYING_RULES_VERSION: "another-version",
  }, "ethereum", true).enabled, false);
  assert.equal(genesisQualifyingPaymentGate({
    ...enabledEnvironment,
    GENESIS_MINIMUM_QUALIFYING_USDT_BASE_UNITS: "0",
  }, "ethereum", true).enabled, false);
  assert.equal(genesisQualifyingPaymentGate({
    ...enabledEnvironment,
    ENVIRONMENT: "production",
  }, "ethereum", true).enabled, false);
  assert.equal(genesisQualifyingPaymentGate(enabledEnvironment, "unknown", true).enabled, false);
});

test("USDT principal conversion uses exact six-decimal integer units", () => {
  assert.equal(parseGenesisUsdtAmountToBaseUnits("1"), "1000000");
  assert.equal(parseGenesisUsdtAmountToBaseUnits("0.000001"), "1");
  assert.equal(parseGenesisUsdtAmountToBaseUnits("10000.25"), "10000250000");
  assert.equal(parseGenesisUsdtAmountToBaseUnits("00001"), "1000000");
  for (const value of ["0", "0.0000001", "1e3", "1,000", "-1", ".5", "1.", "abc", ""]) {
    assert.throws(() => parseGenesisUsdtAmountToBaseUnits(value));
  }
});

test("payment instructions identify one USDT asset first and keep participant network fees separate", () => {
  const expected = [
    ["ethereum", "USDT · Ethereum (ERC-20)", "ERC-20"],
    ["tron", "USDT · TRON (TRC-20)", "TRC-20"],
    ["solana", "USDT · Solana (SPL)", "SPL"],
  ];
  for (const [network, label, standard] of expected) {
    const view = genesisUsdtPaymentPresentation(
      network, "125.5", "TreasuryAddress", "CanonicalToken", "2026-12-01T10:00:00.000Z"
    );
    assert.equal(view.asset, "USDT");
    assert.equal(view.label, label);
    assert.equal(view.standard, standard);
    assert.equal(view.amount, "125.5");
    assert.match(view.networkFeePolicy, /paid separately/i);
    assert.equal(view.walletTransactionSubmitted, false);
    assert.equal(view.paymentMethod, "MANUAL_EXACT_AMOUNT_TRANSFER");
  }
  assert.throws(() => genesisUsdtPaymentPresentation("bitcoin", "1", "x", "y", "z"));
});
