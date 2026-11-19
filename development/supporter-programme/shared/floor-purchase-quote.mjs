/**
 * Deterministic Genesis purchase arithmetic for an ACS pure-floor snapshot.
 *
 * Inputs must already be verified and expressed in canonical integer units:
 * - reserveValueBtcSatoshis: aggregate approved reserve value in BTC satoshis
 * - defendedSupplyAcrownBaseUnits and purchaseQuantityAcrownBaseUnits:
 *   ACROWN base units using the same verified ACROWN decimal scale
 * - btcUsdtPriceNumerator / btcUsdtPriceDenominator:
 *   exact rational USDT per BTC from the approved price snapshot
 *
 * This module performs no RPC, oracle, wallet, payment, signing or token action.
 * It does not establish that supplied inputs are true or approved.
 */

const BTC_DECIMALS = 8;
const USDT_DECIMALS = 6;
const BTC_BASE_UNITS = 10n ** BigInt(BTC_DECIMALS);
const USDT_BASE_UNITS = 10n ** BigInt(USDT_DECIMALS);

function integer(value, label, { positive = false } = {}) {
  const text = String(value);
  if (!/^(0|[1-9][0-9]*)$/.test(text)) {
    throw new TypeError(label + " must be a non-negative canonical integer string.");
  }
  const parsed = BigInt(text);
  if (positive && parsed === 0n) {
    throw new RangeError(label + " must be greater than zero.");
  }
  return parsed;
}

function nonEmpty(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(label + " must be a non-empty string.");
  }
  return value;
}

function safePositiveSeconds(value, label) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(label + " must be a positive safe integer in Unix seconds.");
  }
  return value;
}

/**
 * Calculate the USDT payment amount for a selected ACROWN quantity.
 *
 * Exact relation:
 *   USDT_due = (purchase_base / defended_supply_base)
 *            * reserve_value_BTC * BTC_USDT_price
 *
 * The ACROWN decimal scale cancels in the ratio because purchase and defended
 * supply are both expressed in the same ACROWN base unit.
 *
 * Rounding is mandatory and has no default. The live programme must use the
 * rounding mode approved in its immutable rules version.
 */
export function calculateGenesisFloorPurchaseQuote({
  reserveValueBtcSatoshis,
  defendedSupplyAcrownBaseUnits,
  purchaseQuantityAcrownBaseUnits,
  acrownDecimals,
  btcUsdtPriceNumerator,
  btcUsdtPriceDenominator,
  roundingMode,
  snapshotTimestamp,
  nowSeconds,
  maxSnapshotAgeSeconds,
  acsVersion,
  snapshotId,
  btcUsdtOracleVersion,
}) {
  const reserve = integer(reserveValueBtcSatoshis, "Reserve value in BTC satoshis", { positive: true });
  const supply = integer(defendedSupplyAcrownBaseUnits, "Defended ACROWN supply", { positive: true });
  const purchase = integer(purchaseQuantityAcrownBaseUnits, "Purchase quantity", { positive: true });
  const priceNumerator = integer(btcUsdtPriceNumerator, "BTC/USDT price numerator", { positive: true });
  const priceDenominator = integer(btcUsdtPriceDenominator, "BTC/USDT price denominator", { positive: true });

  if (purchase > supply) {
    throw new RangeError("Purchase quantity cannot exceed the defended ACROWN supply.");
  }
  if (!Number.isInteger(acrownDecimals) || acrownDecimals < 0 || acrownDecimals > 18) {
    throw new RangeError("ACROWN decimals must be an integer from 0 through 18.");
  }
  if (roundingMode !== "CEIL" && roundingMode !== "FLOOR") {
    throw new TypeError("An approved roundingMode of CEIL or FLOOR is required.");
  }

  const snapshotAt = safePositiveSeconds(snapshotTimestamp, "ACS snapshot timestamp");
  const now = safePositiveSeconds(nowSeconds, "Current timestamp");
  const maxAge = safePositiveSeconds(maxSnapshotAgeSeconds, "Maximum snapshot age");
  if (snapshotAt > now) {
    throw new RangeError("ACS snapshot timestamp cannot be in the future.");
  }
  if (now - snapshotAt > maxAge) {
    throw new RangeError("ACS snapshot is stale; a fresh approved quote is required.");
  }

  const acsVersionValue = nonEmpty(acsVersion, "ACS version");
  const snapshotIdValue = nonEmpty(snapshotId, "ACS snapshot ID");
  const oracleVersionValue = nonEmpty(btcUsdtOracleVersion, "BTC/USDT oracle version");

  // F_pure (BTC per ACROWN) = reserve BTC / defended ACROWN supply.
  // Convert the reserve to BTC and the supply to whole ACROWN for the
  // auditable rational floor-price representation.
  const floorNumerator = reserve * (10n ** BigInt(acrownDecimals));
  const floorDenominator = BTC_BASE_UNITS * supply;

  // USDT base units = (purchase / supply) * reserve_BTC * BTC_USDT * 10^6.
  // All arithmetic remains integer/rational until the final rounding step.
  const paymentNumerator = purchase * reserve * priceNumerator * USDT_BASE_UNITS;
  const paymentDenominator = supply * BTC_BASE_UNITS * priceDenominator;
  let paymentBaseUnits = paymentNumerator / paymentDenominator;
  const remainder = paymentNumerator % paymentDenominator;

  if (roundingMode === "CEIL" && remainder !== 0n) {
    paymentBaseUnits += 1n;
  }
  if (paymentBaseUnits === 0n) {
    throw new RangeError("The calculated payment rounds to zero USDT base units.");
  }

  return Object.freeze({
    paymentAsset: "USDT",
    paymentDecimals: USDT_DECIMALS,
    usdtDueBaseUnits: paymentBaseUnits.toString(),
    roundingMode,
    floorBtcPerAcrownNumerator: floorNumerator.toString(),
    floorBtcPerAcrownDenominator: floorDenominator.toString(),
    reserveValueBtcSatoshis: reserve.toString(),
    defendedSupplyAcrownBaseUnits: supply.toString(),
    purchaseQuantityAcrownBaseUnits: purchase.toString(),
    acrownDecimals,
    btcUsdtPriceNumerator: priceNumerator.toString(),
    btcUsdtPriceDenominator: priceDenominator.toString(),
    snapshotTimestamp: snapshotAt,
    maxSnapshotAgeSeconds: maxAge,
    acsVersion: acsVersionValue,
    snapshotId: snapshotIdValue,
    btcUsdtOracleVersion: oracleVersionValue,
  });
}
