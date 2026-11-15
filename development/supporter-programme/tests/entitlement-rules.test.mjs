import test from "node:test";
import assert from "node:assert/strict";
import {
  PROGRAMME_USDT_DECIMALS, PROGRAMME_MULTIPLIER_NUMERATOR,
  PROGRAMME_MULTIPLIER_DENOMINATOR, PROGRAMME_CONTRIBUTION_CEILING_USDT,
  PROGRAMME_CONTRIBUTION_CEILING_USDT_BASE_UNITS,
  PROGRAMME_GLOBAL_ACROWN_CAP_WHOLE, WALLET_REGISTRATION_CUTOFF_LEAD_SECONDS,
  walletRegistrationClosesAt, isWalletRegistrationOpen, remainingContributionCapacity,
  calculateAcrownAllowance, availableAllowance, consumeAllowance
} from "../shared/entitlement-rules.mjs";

test("illustrative 1,000 USDt contribution yields 25,000 ACROWN at 25:1", () => {
  assert.equal(calculateAcrownAllowance({
    usdtAmountBaseUnits: "1000000000", usdtDecimals: 6, acrownDecimals: 9,
    rateNumerator: "25", rateDenominator: "1"
  }), "25000000000000");
});

test("fractional USDt uses integer arithmetic", () => {
  assert.equal(calculateAcrownAllowance({
    usdtAmountBaseUnits: "1250000", usdtDecimals: 6, acrownDecimals: 6,
    rateNumerator: "25", rateDenominator: "1"
  }), "31250000");
});

test("available purchase amount respects personal and optional global remainder", () => {
  assert.equal(availableAllowance("25000000000000", "5000000000000"), "20000000000000");
  assert.equal(availableAllowance("25000000000000", "5000000000000", "10000000000000"), "10000000000000");
});

test("purchase consumption is bounded by both balances", () => {
  assert.equal(consumeAllowance("25000000000000", "5000000000000", "3000000000000", "4000000000000"), "8000000000000");
  assert.throws(() => consumeAllowance("250", "0", "251"), /personal entitlement/);
  assert.throws(() => consumeAllowance("250", "0", "51", "50"), /programme allowance/);
  assert.throws(() => consumeAllowance("10", "11", "1"), /remaining personal entitlement/);
});

test("non-canonical, negative, fractional and zero-denominator inputs fail", () => {
  for (const value of ["", "-1", "1.5", "01", "1e6", " 2"]) {
    assert.throws(() => calculateAcrownAllowance({
      usdtAmountBaseUnits: value, usdtDecimals: 6, acrownDecimals: 9,
      rateNumerator: "25", rateDenominator: "1"
    }));
  }
  assert.throws(() => calculateAcrownAllowance({
    usdtAmountBaseUnits: "1", usdtDecimals: 6, acrownDecimals: 9,
    rateNumerator: "25", rateDenominator: "0"
  }), /denominator/);
});

test("owner-approved programme multiplier and aggregate ceilings are exact", () => {
  assert.equal(PROGRAMME_USDT_DECIMALS, 6);
  assert.equal(PROGRAMME_MULTIPLIER_NUMERATOR, "25");
  assert.equal(PROGRAMME_MULTIPLIER_DENOMINATOR, "1");
  assert.equal(PROGRAMME_CONTRIBUTION_CEILING_USDT, "1000000");
  assert.equal(PROGRAMME_CONTRIBUTION_CEILING_USDT_BASE_UNITS, "1000000000000");
  assert.equal(PROGRAMME_GLOBAL_ACROWN_CAP_WHOLE, "25000000");
  assert.equal(calculateAcrownAllowance({
    usdtAmountBaseUnits: "1000000", usdtDecimals: 6, acrownDecimals: 0,
    rateNumerator: PROGRAMME_MULTIPLIER_NUMERATOR,
    rateDenominator: PROGRAMME_MULTIPLIER_DENOMINATOR
  }), "25");
  assert.equal(calculateAcrownAllowance({
    usdtAmountBaseUnits: PROGRAMME_CONTRIBUTION_CEILING_USDT_BASE_UNITS,
    usdtDecimals: PROGRAMME_USDT_DECIMALS, acrownDecimals: 0,
    rateNumerator: PROGRAMME_MULTIPLIER_NUMERATOR,
    rateDenominator: PROGRAMME_MULTIPLIER_DENOMINATOR
  }), "25000000");
});

test("wallet registration closes at 00:00 UTC exactly 24 hours before public deployment", () => {
  const publicDeployment = 1_900_022_400; // UTC midnight (Unix timestamp divisible by 86,400).
  const cutoff = publicDeployment - 86_400;
  assert.equal(WALLET_REGISTRATION_CUTOFF_LEAD_SECONDS, 86_400);
  assert.equal(publicDeployment % 86_400, 0);
  assert.equal(cutoff % 86_400, 0);
  assert.equal(walletRegistrationClosesAt(publicDeployment), cutoff);
  assert.equal(isWalletRegistrationOpen(cutoff - 1, publicDeployment), true);
  assert.equal(isWalletRegistrationOpen(cutoff, publicDeployment), false);
  assert.equal(isWalletRegistrationOpen(publicDeployment, publicDeployment), false);
  assert.equal(isWalletRegistrationOpen(1, null), false);
  assert.throws(() => walletRegistrationClosesAt(80_000), /valid timestamp/);
  assert.throws(() => walletRegistrationClosesAt(1_900_000_000), /00:00:00 UTC/);
  assert.equal(isWalletRegistrationOpen(cutoff - 1, 1_900_000_000), false);
});

test("remaining aggregate contribution capacity respects the one-million-USDT ceiling", () => {
  assert.equal(remainingContributionCapacity("0"), "1000000000000");
  assert.equal(remainingContributionCapacity("250000000000"), "750000000000");
  assert.equal(remainingContributionCapacity("1000000000000"), "0");
  assert.throws(() => remainingContributionCapacity("1000000000001"), /exceed/);
});
