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
  consumeProgrammeAllowance
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
