import test from "node:test";
import assert from "node:assert/strict";
import {
  PROGRAMME_WINDOW_SECONDS, programmeClosesAt, isWithinProgrammeWindow,
  calculateAcrownAllowance, availableAllowance, consumeAllowance
} from "../shared/entitlement-rules.mjs";

test("global programme window is exactly 180 days from deliberate activation", () => {
  const start = 1_800_000_000;
  const end = start + 15_552_000;
  assert.equal(PROGRAMME_WINDOW_SECONDS, 15_552_000);
  assert.equal(programmeClosesAt(start), end);
  assert.equal(isWithinProgrammeWindow(start, start, end), true);
  assert.equal(isWithinProgrammeWindow(end - 1, start, end), true);
  assert.equal(isWithinProgrammeWindow(end, start, end), false);
  assert.equal(isWithinProgrammeWindow(start - 1, start, end), false);
  assert.equal(isWithinProgrammeWindow(start, start, start + 90), false);
});

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
