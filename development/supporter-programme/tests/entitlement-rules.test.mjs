import test from "node:test";
import assert from "node:assert/strict";
import {
  PROGRAMME_WINDOW_SECONDS,
  REGISTRATION_FREEZE_SECONDS,
  registrationFreezeAt,
  isGenesisRegistrationOpen,
  purchaseWindowStartsAt,
  programmeClosesAt,
  isWithinProgrammeWindow,
  calculateUsdtPurchaseAllowance,
  availableProgrammeAllowance,
  consumeProgrammeAllowance,
  GENESIS_QUALIFYING_RULES_VERSION,
  GENESIS_QUALIFYING_PRINCIPAL_CAP_BASE_UNITS,
  GENESIS_QUALIFYING_ALLOWANCE_CAP_BASE_UNITS,
  calculateGenesisTieredPurchaseAllowance
} from "../shared/entitlement-rules.mjs";

test("new primary-wallet registration freezes exactly 24 hours before scheduled ACROWN launch and never reopens", () => {
  const launch = 1_800_086_400;
  const freeze = launch - 86_400;
  assert.equal(REGISTRATION_FREEZE_SECONDS, 86_400);
  assert.equal(registrationFreezeAt(launch), freeze);
  assert.equal(isGenesisRegistrationOpen(freeze - 1, launch), true);
  assert.equal(isGenesisRegistrationOpen(freeze, launch), false);
  assert.equal(isGenesisRegistrationOpen(launch + 1, launch, freeze), false);
  assert.equal(isGenesisRegistrationOpen(launch + 100_000, null, freeze), false);
});

test("rolling 180-day inactivity timer starts at ACROWN launch and rolls after either Genesis purchase type", () => {
  const launch = 1_800_000_000;
  const floorOpenLater = launch + 3_600;
  const start = purchaseWindowStartsAt(launch);
  const initialClose = start + PROGRAMME_WINDOW_SECONDS;
  const firstRightPurchase = start + 86_400;
  const firstResetClose = firstRightPurchase + PROGRAMME_WINDOW_SECONDS;
  const laterFloorPurchase = firstRightPurchase + 30 * 86_400;
  const secondResetClose = laterFloorPurchase + PROGRAMME_WINDOW_SECONDS;
  assert.equal(floorOpenLater > start, true);
  assert.equal(start, launch);
  assert.equal(PROGRAMME_WINDOW_SECONDS, 15_552_000);
  assert.equal(programmeClosesAt(start), initialClose);
  assert.equal(programmeClosesAt(start, firstRightPurchase), firstResetClose);
  assert.equal(programmeClosesAt(start, laterFloorPurchase), secondResetClose);
  assert.equal(isWithinProgrammeWindow(firstRightPurchase, start, firstResetClose, firstRightPurchase), true);
  assert.equal(isWithinProgrammeWindow(secondResetClose - 1, start, secondResetClose, laterFloorPurchase), true);
  assert.equal(isWithinProgrammeWindow(secondResetClose, start, secondResetClose, laterFloorPurchase), false);
  assert.equal(isWithinProgrammeWindow(start - 1, start, initialClose), false);
  assert.equal(isWithinProgrammeWindow(start, start, start + 90), false);
  assert.equal(isWithinProgrammeWindow(secondResetClose - 1, start, firstResetClose, firstRightPurchase), false);
  assert.throws(() => programmeClosesAt(start, start - 1), /predate/);
});

test("qualifying-payment multiplier produces a shared USDT-denominated purchase allowance", () => {
  assert.equal(calculateUsdtPurchaseAllowance({
    qualifyingPaymentUsdtBaseUnits: "1000000000",
    multiplierNumerator: "25",
    multiplierDenominator: "1"
  }), "25000000000");
  assert.equal(calculateUsdtPurchaseAllowance({
    qualifyingPaymentUsdtBaseUnits: "1250000",
    multiplierNumerator: "25",
    multiplierDenominator: "1"
  }), "31250000");
});

test("the proposed five global USDT tranches calculate exact allowance, including boundary crossings", () => {
  assert.equal(GENESIS_QUALIFYING_RULES_VERSION, "GENESIS-USDT-50K-1M-TIERS-V1-PROPOSED");
  assert.equal(GENESIS_QUALIFYING_PRINCIPAL_CAP_BASE_UNITS, "50000000000");
  assert.equal(GENESIS_QUALIFYING_ALLOWANCE_CAP_BASE_UNITS, "1000000000000");

  const first = calculateGenesisTieredPurchaseAllowance({
    cumulativeQualifyingPrincipalBeforeBaseUnits: "0",
    qualifyingPaymentUsdtBaseUnits: "1000000000",
  });
  assert.equal(first.purchaseAllowanceUsdtBaseUnits, "30000000000");
  assert.equal(first.tierBreakdown.length, 1);
  assert.equal(first.tierBreakdown[0].multiplierNumerator, "30");

  const crossing = calculateGenesisTieredPurchaseAllowance({
    cumulativeQualifyingPrincipalBeforeBaseUnits: "7000000000",
    qualifyingPaymentUsdtBaseUnits: "5000000000",
  });
  assert.equal(crossing.purchaseAllowanceUsdtBaseUnits, "26500000000");
  assert.deepEqual(crossing.tierBreakdown.map((tier) => tier.qualifyingPrincipalBaseUnits), [
    "3000000000", "2000000000"
  ]);
  assert.deepEqual(crossing.tierBreakdown.map((tier) => tier.multiplierNumerator), ["30", "25"]);
  assert.equal(crossing.cumulativeQualifyingPrincipalAfterBaseUnits, "12000000000");
  assert.equal(crossing.activationStatus, "PROPOSED_RULES_NOT_ACTIVATED");
});

test("the complete proposed USDT 50,000 principal target yields exactly USDT 1,000,000 allowance", () => {
  const result = calculateGenesisTieredPurchaseAllowance({
    cumulativeQualifyingPrincipalBeforeBaseUnits: "0",
    qualifyingPaymentUsdtBaseUnits: "50000000000",
  });
  assert.equal(result.purchaseAllowanceUsdtBaseUnits, "1000000000000");
  assert.deepEqual(result.tierBreakdown.map((tier) => tier.multiplierNumerator), ["30", "25", "20", "15", "10"]);
  assert.deepEqual(result.tierBreakdown.map((tier) => tier.qualifyingPrincipalBaseUnits), [
    "10000000000", "10000000000", "10000000000", "10000000000", "10000000000"
  ]);
});

test("proposed global tranche arithmetic rejects zero, noncanonical, over-target and stale principal inputs", () => {
  assert.throws(() => calculateGenesisTieredPurchaseAllowance({
    cumulativeQualifyingPrincipalBeforeBaseUnits: "0", qualifyingPaymentUsdtBaseUnits: "0"
  }), /greater than zero/);
  assert.throws(() => calculateGenesisTieredPurchaseAllowance({
    cumulativeQualifyingPrincipalBeforeBaseUnits: "01", qualifyingPaymentUsdtBaseUnits: "1"
  }), /canonical integer/);
  assert.throws(() => calculateGenesisTieredPurchaseAllowance({
    cumulativeQualifyingPrincipalBeforeBaseUnits: "49999999999", qualifyingPaymentUsdtBaseUnits: "2"
  }), /50,000/);
  assert.throws(() => calculateGenesisTieredPurchaseAllowance({
    cumulativeQualifyingPrincipalBeforeBaseUnits: "50000000001", qualifyingPaymentUsdtBaseUnits: "1"
  }), /50,000/);
});

test("available allowance is one programme-wide pool, reduced by reservations and completed purchases", () => {
  assert.equal(availableProgrammeAllowance({
    earnedBaseUnits: "1000000000000",
    reservedBaseUnits: "100000000000",
    consumedBaseUnits: "250000000000"
  }), "650000000000");
  assert.equal(availableProgrammeAllowance({
    earnedBaseUnits: "1000000000000",
    reservedBaseUnits: "100000000000",
    consumedBaseUnits: "250000000000",
    capBaseUnits: "800000000000"
  }), "450000000000");
});

test("one registered wallet can purchase the entire remaining programme-wide allowance", () => {
  const earned = "1000000000000";
  const reserved = "100000000000";
  const consumed = "250000000000";
  const remaining = availableProgrammeAllowance({
    earnedBaseUnits: earned,
    reservedBaseUnits: reserved,
    consumedBaseUnits: consumed
  });
  assert.equal(remaining, "650000000000");
  assert.equal(consumeProgrammeAllowance({
    earnedBaseUnits: earned,
    reservedBaseUnits: reserved,
    consumedBaseUnits: consumed,
    purchaseBaseUnits: remaining
  }), "900000000000");
});

test("shared programme pool rejects a purchase beyond its remaining balance or approved cap", () => {
  assert.throws(() => consumeProgrammeAllowance({
    earnedBaseUnits: "1000",
    consumedBaseUnits: "100",
    purchaseBaseUnits: "901"
  }), /programme-wide allowance/);
  assert.throws(() => consumeProgrammeAllowance({
    earnedBaseUnits: "1000",
    consumedBaseUnits: "100",
    purchaseBaseUnits: "801",
    capBaseUnits: "900"
  }), /programme-wide allowance/);
  assert.throws(() => availableProgrammeAllowance({
    earnedBaseUnits: "100",
    reservedBaseUnits: "80",
    consumedBaseUnits: "30"
  }), /programme-earned amount/);
});

test("non-canonical, negative, fractional and zero-denominator inputs fail", () => {
  for (const value of ["", "-1", "1.5", "01", "1e6", " 2"]) {
    assert.throws(() => calculateUsdtPurchaseAllowance({
      qualifyingPaymentUsdtBaseUnits: value,
      multiplierNumerator: "25",
      multiplierDenominator: "1"
    }));
  }
  assert.throws(() => calculateUsdtPurchaseAllowance({
    qualifyingPaymentUsdtBaseUnits: "1",
    multiplierNumerator: "25",
    multiplierDenominator: "0"
  }), /denominator/);
});
