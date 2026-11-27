/**
 * Dependency-free, deterministic Genesis programme-wide allowance arithmetic.
 * The USDT purchase allowance is one shared programme pool, not a personal
 * allocation attached to any one wallet identity. No function accesses a chain,
 * signs a transaction, or enables payments.
 */
export const PROGRAMME_WINDOW_SECONDS = 180 * 24 * 60 * 60;
export const REGISTRATION_FREEZE_SECONDS = 24 * 60 * 60;

// Explicitly PROPOSED owner-directed schedule. Payment activation requires a
// separately recorded approval of this exact version; merely importing this
// arithmetic never opens a payment route.
export const GENESIS_QUALIFYING_RULES_VERSION = "GENESIS-USDT-50K-1M-TIERS-V1";
export const GENESIS_QUALIFYING_PRINCIPAL_CAP_BASE_UNITS = "50000000000";
export const GENESIS_QUALIFYING_ALLOWANCE_CAP_BASE_UNITS = "1000000000000";
export const GENESIS_QUALIFYING_TIERS = Object.freeze([
  Object.freeze({ tranche: 1, principalCapBaseUnits: "10000000000", multiplierNumerator: "30", multiplierDenominator: "1" }),
  Object.freeze({ tranche: 2, principalCapBaseUnits: "10000000000", multiplierNumerator: "25", multiplierDenominator: "1" }),
  Object.freeze({ tranche: 3, principalCapBaseUnits: "10000000000", multiplierNumerator: "20", multiplierDenominator: "1" }),
  Object.freeze({ tranche: 4, principalCapBaseUnits: "10000000000", multiplierNumerator: "15", multiplierDenominator: "1" }),
  Object.freeze({ tranche: 5, principalCapBaseUnits: "10000000000", multiplierNumerator: "10", multiplierDenominator: "1" }),
]);

/**
 * Exact integer-only allocation across the five cumulative global USDT
 * principal tranches. The caller must serialize/lock the programme pool when
 * creating a payment intent; this pure function does not reserve or credit it.
 */
export function calculateGenesisTieredPurchaseAllowance({
  cumulativeQualifyingPrincipalBeforeBaseUnits,
  qualifyingPaymentUsdtBaseUnits,
}) {
  const before = integer(cumulativeQualifyingPrincipalBeforeBaseUnits, "Cumulative qualifying principal before payment");
  const amount = integer(qualifyingPaymentUsdtBaseUnits, "Qualifying payment principal");
  const principalCap = integer(GENESIS_QUALIFYING_PRINCIPAL_CAP_BASE_UNITS, "Qualifying principal cap");
  const allowanceCap = integer(GENESIS_QUALIFYING_ALLOWANCE_CAP_BASE_UNITS, "Programme allowance cap");
  if (amount <= 0n) throw new RangeError("Qualifying payment principal must be greater than zero.");
  if (before > principalCap || before + amount > principalCap) {
    throw new RangeError("Qualifying payment exceeds the proposed USDT 50,000 global principal target.");
  }

  let remaining = amount;
  let cursor = before;
  let allowance = 0n;
  const breakdown = [];
  let tierStart = 0n;
  for (const tier of GENESIS_QUALIFYING_TIERS) {
    const tierCapacity = integer(tier.principalCapBaseUnits, "Tier principal capacity");
    const tierEnd = tierStart + tierCapacity;
    if (cursor < tierEnd && remaining > 0n) {
      const availableInTier = tierEnd - (cursor > tierStart ? cursor : tierStart);
      const allocated = remaining < availableInTier ? remaining : availableInTier;
      if (allocated > 0n) {
        const tierAllowance = (allocated *
          integer(tier.multiplierNumerator, "Tier multiplier numerator")) /
          integer(tier.multiplierDenominator, "Tier multiplier denominator");
        allowance += tierAllowance;
        breakdown.push(Object.freeze({
          tranche: tier.tranche,
          principalStartBaseUnits: cursor.toString(),
          principalEndBaseUnits: (cursor + allocated).toString(),
          qualifyingPrincipalBaseUnits: allocated.toString(),
          multiplierNumerator: tier.multiplierNumerator,
          multiplierDenominator: tier.multiplierDenominator,
          allowanceBaseUnits: tierAllowance.toString(),
        }));
        cursor += allocated;
        remaining -= allocated;
      }
    }
    tierStart = tierEnd;
  }
  if (remaining !== 0n || allowance > allowanceCap) {
    throw new RangeError("The proposed Genesis tier schedule cannot allocate this qualifying payment.");
  }
  return Object.freeze({
    rulesVersion: GENESIS_QUALIFYING_RULES_VERSION,
    cumulativeQualifyingPrincipalBeforeBaseUnits: before.toString(),
    qualifyingPaymentUsdtBaseUnits: amount.toString(),
    cumulativeQualifyingPrincipalAfterBaseUnits: (before + amount).toString(),
    purchaseAllowanceUsdtBaseUnits: allowance.toString(),
    tierBreakdown: Object.freeze(breakdown),
    activationStatus: "PROPOSED_RULES_NOT_ACTIVATED",
  });
}


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

/** The programme-wide 180 days of inactivity timer starts at official ACROWN launch. */
export function purchaseWindowStartsAt(acrownLaunchedAtSeconds) {
  return timestamp(acrownLaunchedAtSeconds, "Official ACROWN launch");
}

export function programmeClosesAt(windowStartedAtSeconds, lastCompletedPurchaseAtSeconds = null) {
  const startedAt = timestamp(windowStartedAtSeconds, "Purchase-window start");
  const lastPurchaseAt = lastCompletedPurchaseAtSeconds === null || lastCompletedPurchaseAtSeconds === undefined
    ? startedAt
    : timestamp(lastCompletedPurchaseAtSeconds, "Last completed purchase");
  if (lastPurchaseAt < startedAt) throw new RangeError("A completed purchase cannot predate the purchase-window start.");
  return lastPurchaseAt + PROGRAMME_WINDOW_SECONDS;
}

export function isWithinProgrammeWindow(now, windowStartedAt, closesAt, lastCompletedPurchaseAt = null) {
  if (![now, windowStartedAt, closesAt].every(Number.isSafeInteger)) return false;
  let expectedClose;
  try {
    expectedClose = programmeClosesAt(windowStartedAt, lastCompletedPurchaseAt);
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
