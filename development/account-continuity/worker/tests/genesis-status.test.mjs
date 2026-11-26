import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGenesisProgrammeStatus,
  genesisProgrammeStatusResponse,
} from "../src/genesis-status.js";
import { MAINNET_USDT_CONFIG } from "../../../supporter-programme/shared/mainnet-config.mjs";

const networks = ["ethereum", "tron", "solana"].map((network) => ({
  network,
  network_identifier: MAINNET_USDT_CONFIG[network].networkIdentifier,
  token_identifier: MAINNET_USDT_CONFIG[network].tokenIdentifier,
  token_decimals: 6,
  treasury_address: MAINNET_USDT_CONFIG[network].treasuryAddress,
  enabled: 0,
}));

const program = {
  environment: "MAINNET",
  status: "PRELAUNCH",
  activated_at: null,
  closes_at: null,
  rules_version: null,
};

const control = {
  acrown_launched_at: null,
  acs_floor_purchase_opened_at: null,
  purchase_window_started_at: null,
  purchase_window_last_purchase_at: null,
  purchase_window_closes_at: null,
};

function mockDb(programRow = program, networkRows = networks, controlRow = control) {
  return {
    prepare(sql) {
      return {
        first: async () => /FROM genesis_programme_control/.test(sql) ? controlRow : programRow,
        all: async () => ({ results: networkRows }),
      };
    },
  };
}

test("Genesis status reads the isolated database and exposes the canonical three-network programme", async () => {
  const response = await genesisProgrammeStatusResponse({ SUPPORTERS_DB: mockDb() });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.environment, "MAINNET");
  assert.equal(payload.programme.status, "PRELAUNCH");
  assert.deepEqual(payload.networks.map((item) => item.network), ["ethereum", "tron", "solana"]);
  assert.equal(payload.paymentAcceptance.enabled, false);
  assert.equal(payload.paymentAcceptance.qualifyingPaymentsAccepted, false);
  assert.equal(payload.purchaseAllowance.automaticTokenIssuance, false);
  assert.equal(payload.programmeLifecycle.purchaseWindowStartedAt, null);
  assert.equal(payload.programmeLifecycle.inactivityPeriodLabel, "180 days of inactivity");
});

test("Genesis status fails closed when its isolated database is not bound", async () => {
  const response = await genesisProgrammeStatusResponse({});
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /not bound/i);
});

test("Genesis programme status never exposes treasury addresses or enables transfer intake", () => {
  const payload = buildGenesisProgrammeStatus(
    { ...program, status: "OPEN", activated_at: 1_800_000_000, closes_at: 1_815_552_000, rules_version: "v1" },
    networks.map((row) => ({ ...row, enabled: 1 })),
  );
  assert.equal(payload.paymentAcceptance.enabled, false);
  assert.equal(payload.paymentAcceptance.qualifyingPaymentsAccepted, false);
  assert.equal(payload.purchaseAllowance.separateFromQualifyingPayment, true);
  assert.equal(payload.purchaseAllowance.automaticTokenIssuance, false);
  assert.ok(payload.networks.every((row) => !("treasuryAddress" in row)));
  assert.ok(payload.networks.every((row) => row.networkConfigured === false));
});

test("Genesis status rejects missing, duplicate, non-canonical and incorrectly configured networks", () => {
  assert.throws(() => buildGenesisProgrammeStatus(program, networks.slice(0, 2)));
  assert.throws(() => buildGenesisProgrammeStatus(program, [
    ...networks,
    networks[0],
  ]));
  assert.throws(() => buildGenesisProgrammeStatus(program,
    networks.map((row, index) => index === 0 ? { ...row, token_decimals: 18 } : row)));
  assert.throws(() => buildGenesisProgrammeStatus(program,
    networks.map((row, index) => index === 0 ? { ...row, token_identifier: "not-canonical" } : row)));
  assert.throws(() => buildGenesisProgrammeStatus(program,
    networks.map((row, index) => index === 0 ? { ...row, treasury_address: "0x0000000000000000000000000000000000000001" } : row)));
});
