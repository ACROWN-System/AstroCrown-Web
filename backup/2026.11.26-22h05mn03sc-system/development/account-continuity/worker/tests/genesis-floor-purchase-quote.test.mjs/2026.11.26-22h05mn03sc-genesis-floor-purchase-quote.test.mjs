import test from "node:test";
import assert from "node:assert/strict";
import { calculateGenesisFloorPurchaseQuote } from "../../../supporter-programme/shared/floor-purchase-quote.mjs";

const common = {
  reserveValueBtcSatoshis: "10000000000",
  defendedSupplyAcrownBaseUnits: "1000000000000000000",
  purchaseQuantityAcrownBaseUnits: "1000000000000",
  acrownDecimals: 9,
  btcUsdtPriceNumerator: "100000",
  btcUsdtPriceDenominator: "1",
  roundingMode: "CEIL",
  snapshotTimestamp: 1_800_000_000,
  nowSeconds: 1_800_000_030,
  maxSnapshotAgeSeconds: 60,
  acsVersion: "acs-test-v1",
  snapshotId: "snapshot-001",
  btcUsdtOracleVersion: "btc-usdt-test-v1",
};

test("ACS pure floor quote converts BTC reserve backing to an exact USDT purchase amount", () => {
  const quote = calculateGenesisFloorPurchaseQuote(common);
  assert.equal(quote.usdtDueBaseUnits, "10000000");
  assert.equal(quote.paymentAsset, "USDT");
  assert.equal(quote.paymentDecimals, 6);
  assert.equal(quote.floorBtcPerAcrownNumerator, "10000000000000000000");
  assert.equal(quote.floorBtcPerAcrownDenominator, "100000000000000000000000000");
  assert.equal(quote.snapshotId, "snapshot-001");
  assert.equal(quote.roundingMode, "CEIL");
});

test("purchase cost uses explicit integer rounding at the USDT base-unit boundary", () => {
  const fractional = {
    ...common,
    reserveValueBtcSatoshis: "100000000",
    defendedSupplyAcrownBaseUnits: "3",
    purchaseQuantityAcrownBaseUnits: "1",
    acrownDecimals: 0,
    btcUsdtPriceNumerator: "1",
    btcUsdtPriceDenominator: "1",
  };
  assert.equal(calculateGenesisFloorPurchaseQuote(fractional).usdtDueBaseUnits, "333334");
  assert.equal(calculateGenesisFloorPurchaseQuote({
    ...fractional,
    roundingMode: "FLOOR",
  }).usdtDueBaseUnits, "333333");
});

test("arithmetic remains exact for amounts larger than JavaScript safe integers", () => {
  const quote = calculateGenesisFloorPurchaseQuote({
    ...common,
    reserveValueBtcSatoshis: "900719925474099312345678",
    defendedSupplyAcrownBaseUnits: "900719925474099312345678000",
    purchaseQuantityAcrownBaseUnits: "900719925474099312345678",
    btcUsdtPriceNumerator: "9876543210123456789",
    btcUsdtPriceDenominator: "100000000",
  });
  assert.equal(typeof quote.usdtDueBaseUnits, "string");
  assert.match(quote.usdtDueBaseUnits, /^(0|[1-9][0-9]*)$/);
});

test("stale or future ACS snapshots fail closed", () => {
  assert.throws(() => calculateGenesisFloorPurchaseQuote({
    ...common,
    nowSeconds: common.snapshotTimestamp + 61,
  }), /stale/);
  assert.throws(() => calculateGenesisFloorPurchaseQuote({
    ...common,
    snapshotTimestamp: common.nowSeconds + 1,
  }), /future/);
});

test("invalid supply, quantity, price, decimals and unapproved rounding fail closed", () => {
  const invalidCases = [
    [{ defendedSupplyAcrownBaseUnits: "0" }, /greater than zero/],
    [{ purchaseQuantityAcrownBaseUnits: "0" }, /greater than zero/],
    [{ purchaseQuantityAcrownBaseUnits: "1000000000000000001" }, /cannot exceed/],
    [{ btcUsdtPriceDenominator: "0" }, /greater than zero/],
    [{ acrownDecimals: 19 }, /ACROWN decimals/],
    [{ roundingMode: undefined }, /roundingMode/],
    [{ snapshotId: "" }, /snapshot ID/],
  ];
  for (const [override, message] of invalidCases) {
    assert.throws(() => calculateGenesisFloorPurchaseQuote({ ...common, ...override }), message);
  }
});

test("zero-valued payment after rounding is rejected rather than treated as free", () => {
  assert.throws(() => calculateGenesisFloorPurchaseQuote({
    ...common,
    reserveValueBtcSatoshis: "1",
    defendedSupplyAcrownBaseUnits: "1000000000000000000",
    purchaseQuantityAcrownBaseUnits: "1",
    btcUsdtPriceNumerator: "1",
    btcUsdtPriceDenominator: "1000000000000000000000000000000",
    roundingMode: "FLOOR",
  }), /rounds to zero/);
});
