/**
 * Dependency-free, deterministic entitlement arithmetic.
 * This module never reads RPC data, signs transactions or enables payments.
 */
export const PROGRAMME_WINDOW_SECONDS = 180 * 24 * 60 * 60;

export const PROGRAMME_USDT_DECIMALS = 6;
export const PROGRAMME_MULTIPLIER_NUMERATOR = "25";
export const PROGRAMME_MULTIPLIER_DENOMINATOR = "1";
export const PROGRAMME_CONTRIBUTION_CEILING_USDT = "1000000";
export const PROGRAMME_CONTRIBUTION_CEILING_USDT_BASE_UNITS = "1000000000000";
export const PROGRAMME_GLOBAL_ACROWN_CAP_WHOLE = "25000000";
export const WALLET_REGISTRATION_CUTOFF_LEAD_SECONDS = 24 * 60 * 60;

export function walletRegistrationClosesAt(publicDeploymentAtSeconds) {
  if (!Number.isSafeInteger(publicDeploymentAtSeconds)
      || publicDeploymentAtSeconds <= WALLET_REGISTRATION_CUTOFF_LEAD_SECONDS) {
    throw new TypeError("Public deployment must be a valid timestamp later than the 24-hour registration lead.");
  }
  return publicDeploymentAtSeconds - WALLET_REGISTRATION_CUTOFF_LEAD_SECONDS;
}

export function isWalletRegistrationOpen(nowSeconds, publicDeploymentAtSeconds) {
  if (!Number.isSafeInteger(nowSeconds) || nowSeconds <= 0
      || !Number.isSafeInteger(publicDeploymentAtSeconds)
      || publicDeploymentAtSeconds <= WALLET_REGISTRATION_CUTOFF_LEAD_SECONDS) {
    return false;
  }
  return nowSeconds < walletRegistrationClosesAt(publicDeploymentAtSeconds);
}

export function remainingContributionCapacity(confirmedTotalBaseUnits) {
  const confirmed = integer(confirmedTotalBaseUnits, "Confirmed contributions");
  const ceiling = BigInt(PROGRAMME_CONTRIBUTION_CEILING_USDT_BASE_UNITS);
  if (confirmed > ceiling) {
    throw new RangeError("Confirmed contributions exceed the programme ceiling.");
  }
  return (ceiling - confirmed).toString();
}

function integer(value, label) {
  const stringValue = String(value);
  if (!/^(0|[1-9][0-9]*)$/.test(stringValue)) {
    throw new TypeError(label + " must be a non-negative canonical integer string.");
  }
  return BigInt(stringValue);
}

export function programmeClosesAt(activatedAtSeconds) {
  if (!Number.isSafeInteger(activatedAtSeconds) || activatedAtSeconds <= 0) {
    throw new TypeError("Activation must be a positive safe Unix timestamp in seconds.");
  }
  return activatedAtSeconds + PROGRAMME_WINDOW_SECONDS;
}

export function isWithinProgrammeWindow(now, activatedAt, closesAt) {
  if (![now, activatedAt, closesAt].every(Number.isSafeInteger)) return false;
  return activatedAt > 0 && closesAt === activatedAt + PROGRAMME_WINDOW_SECONDS
    && now >= activatedAt && now < closesAt;
}

/** Rate means whole ACROWN per one whole USD₮. Returns ACROWN base units. */
export function calculateAcrownAllowance({
  usdtAmountBaseUnits, usdtDecimals, acrownDecimals, rateNumerator, rateDenominator
}) {
  const amount = integer(usdtAmountBaseUnits, "USDT amount");
  const numerator = integer(rateNumerator, "Rate numerator");
  const denominator = integer(rateDenominator, "Rate denominator");
  if (denominator === 0n) throw new RangeError("Rate denominator must be greater than zero.");
  if (!Number.isInteger(usdtDecimals) || usdtDecimals < 0 || usdtDecimals > 18) {
    throw new RangeError("USD₮ decimals must be an integer from 0 through 18.");
  }
  if (!Number.isInteger(acrownDecimals) || acrownDecimals < 0 || acrownDecimals > 18) {
    throw new RangeError("ACROWN decimals must be an integer from 0 through 18.");
  }
  return ((amount * numerator * (10n ** BigInt(acrownDecimals)))
    / ((10n ** BigInt(usdtDecimals)) * denominator)).toString();
}

export function availableAllowance(earnedBase, consumedBase, globalRemainingBase = null) {
  const earned = integer(earnedBase, "Earned allowance");
  const consumed = integer(consumedBase, "Consumed allowance");
  if (consumed > earned) throw new RangeError("Consumed allowance cannot exceed earned allowance.");
  const personal = earned - consumed;
  if (globalRemainingBase === null || globalRemainingBase === undefined) return personal.toString();
  const global = integer(globalRemainingBase, "Global remaining allowance");
  return (personal < global ? personal : global).toString();
}

export function consumeAllowance(earnedBase, consumedBase, purchaseBase, globalRemainingBase = null) {
  const earned = integer(earnedBase, "Earned allowance");
  const consumed = integer(consumedBase, "Consumed allowance");
  const purchase = integer(purchaseBase, "Purchase amount");
  if (consumed > earned || purchase === 0n || purchase > earned - consumed) {
    throw new RangeError("Purchase exceeds the remaining personal entitlement.");
  }
  if (globalRemainingBase !== null && globalRemainingBase !== undefined
      && purchase > integer(globalRemainingBase, "Global remaining allowance")) {
    throw new RangeError("Purchase exceeds the remaining programme allowance.");
  }
  return (consumed + purchase).toString();
}
