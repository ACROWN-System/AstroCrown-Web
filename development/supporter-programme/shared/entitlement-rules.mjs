/**
 * Dependency-free, deterministic Genesis programme-wide allowance arithmetic.
 * The USDT purchase allowance is one shared programme pool, not a personal
 * allocation attached to any one wallet identity. No function accesses a chain,
 * signs a transaction, or enables payments.
 */
export const PROGRAMME_WINDOW_SECONDS = 180 * 24 * 60 * 60;
export const REGISTRATION_FREEZE_SECONDS = 24 * 60 * 60;

function integer(value, label) {
  const stringValue = String(value);
  if (!/^(0|[1-9][0-9]*)$/.test(stringValue)) {
    throw new TypeError(label + " must be a non-negative canonical integer string.");
  }
  return BigInt(stringValue);
}

function timestamp(value, label) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(label + " must be a positive safe Unix timestamp in seconds.");
  }
  return value;
}

/** Freeze Genesis activity and new primary-wallet registration exactly 24h before scheduled ACROWN launch. */
export function registrationFreezeAt(scheduledAcrownLaunchAtSeconds) {
  return timestamp(scheduledAcrownLaunchAtSeconds, "Scheduled ACROWN launch")
    - REGISTRATION_FREEZE_SECONDS;
}

/** Registration never reopens after the permanent cutoff has been recorded. */
export function isGenesisRegistrationOpen(nowSeconds, scheduledAcrownLaunchAtSeconds = null, registrationClosedAtSeconds = null) {
  if (!Number.isSafeInteger(nowSeconds) || nowSeconds <= 0) return false;
  if (registrationClosedAtSeconds !== null && registrationClosedAtSeconds !== undefined) return false;
  if (scheduledAcrownLaunchAtSeconds === null || scheduledAcrownLaunchAtSeconds === undefined) return true;
  return nowSeconds < registrationFreezeAt(scheduledAcrownLaunchAtSeconds);
}

/** Start the global 180-day window only once both ACROWN and the qualified ACS floor-purchase facility are live. */
export function purchaseWindowStartsAt(acrownLaunchedAtSeconds, floorPurchaseOpenedAtSeconds) {
  const launch = timestamp(acrownLaunchedAtSeconds, "Official ACROWN launch");
  const floorOpen = timestamp(floorPurchaseOpenedAtSeconds, "ACS floor-purchase opening");
  return Math.max(launch, floorOpen);
}

export function programmeClosesAt(windowStartedAtSeconds, lastCompletedFloorPurchaseAtSeconds = null) {
  const startedAt = timestamp(windowStartedAtSeconds, "Purchase-window start");
  const lastPurchaseAt = lastCompletedFloorPurchaseAtSeconds === null || lastCompletedFloorPurchaseAtSeconds === undefined
    ? startedAt
    : timestamp(lastCompletedFloorPurchaseAtSeconds, "Last completed floor-price purchase");
  if (lastPurchaseAt < startedAt) throw new RangeError("A completed floor-price purchase cannot predate the purchase-window start.");
  return lastPurchaseAt + PROGRAMME_WINDOW_SECONDS;
}

export function isWithinProgrammeWindow(now, windowStartedAt, closesAt, lastCompletedFloorPurchaseAt = null) {
  if (![now, windowStartedAt, closesAt].every(Number.isSafeInteger)) return false;
  let expectedClose;
  try {
    expectedClose = programmeClosesAt(windowStartedAt, lastCompletedFloorPurchaseAt);
  } catch {
    return false;
  }
  return now >= windowStartedAt && now < closesAt && closesAt === expectedClose;
}

/** Convert qualifying-payment principal to shared USDT purchase allowance for one approved tranche rate. */
export function calculateUsdtPurchaseAllowance({
  qualifyingPaymentUsdtBaseUnits, multiplierNumerator, multiplierDenominator
}) {
  const amount = integer(qualifyingPaymentUsdtBaseUnits, "Qualifying-payment USDT amount");
  const numerator = integer(multiplierNumerator, "Multiplier numerator");
  const denominator = integer(multiplierDenominator, "Multiplier denominator");
  if (denominator === 0n) throw new RangeError("Multiplier denominator must be greater than zero.");
  return ((amount * numerator) / denominator).toString();
}

/**
 * Remaining amount available to any eligible registered Genesis wallet.
 * No identity-specific earned balance is accepted by this function.
 */
export function availableProgrammeAllowance({
  earnedBaseUnits, reservedBaseUnits = "0", consumedBaseUnits, capBaseUnits = null
}) {
  const earned = integer(earnedBaseUnits, "Programme-earned allowance");
  const reserved = integer(reservedBaseUnits, "Programme-reserved allowance");
  const consumed = integer(consumedBaseUnits, "Programme-consumed allowance");
  if (reserved + consumed > earned) {
    throw new RangeError("Reserved and consumed allowance cannot exceed the programme-earned amount.");
  }
  let remaining = earned - reserved - consumed;
  if (capBaseUnits !== null && capBaseUnits !== undefined) {
    const cap = integer(capBaseUnits, "Programme allowance cap");
    if (reserved + consumed > cap) {
      throw new RangeError("Reserved and consumed allowance cannot exceed the programme cap.");
    }
    const capRemaining = cap - reserved - consumed;
    if (capRemaining < remaining) remaining = capRemaining;
  }
  return remaining.toString();
}

/** Atomic settlement logic for one shared global pool; a single wallet may consume its entire remainder. */
export function consumeProgrammeAllowance({
  earnedBaseUnits, reservedBaseUnits = "0", consumedBaseUnits, purchaseBaseUnits, capBaseUnits = null
}) {
  const consumed = integer(consumedBaseUnits, "Programme-consumed allowance");
  const purchase = integer(purchaseBaseUnits, "Purchase amount");
  if (purchase === 0n) throw new RangeError("Purchase amount must be greater than zero.");
  const available = integer(availableProgrammeAllowance({
    earnedBaseUnits, reservedBaseUnits, consumedBaseUnits, capBaseUnits
  }), "Available programme allowance");
  if (purchase > available) {
    throw new RangeError("Purchase exceeds the remaining programme-wide allowance.");
  }
  return (consumed + purchase).toString();
}
