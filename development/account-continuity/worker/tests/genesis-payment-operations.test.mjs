import test from "node:test";
import assert from "node:assert/strict";
import { MAINNET_USDT_CONFIG } from "../../../supporter-programme/shared/mainnet-config.mjs";
import { GENESIS_QUALIFYING_RULES_VERSION } from "../../../supporter-programme/shared/entitlement-rules.mjs";
import { genesisPaymentActivationGate } from "../src/genesis-payment-operations.js";

function database({ programme, network, control } = {}) {
  return {
    prepare(sql) {
      return {
        bind(value) {
          return {
            first: async () => sql.includes("supporter_network_config")
              ? (network && network.network === value ? network : null)
              : null,
          };
        },
        first: async () => sql.includes("supporter_program")
          ? (programme || null)
          : sql.includes("genesis_programme_control")
            ? (control || null)
            : null,
      };
    },
  };
}

function environment(network = "ethereum") {
  return {
    ENVIRONMENT: "staging",
    GENESIS_RECEIPT_MONITOR_ENABLED: "true",
    GENESIS_QUALIFYING_PAYMENTS_ENABLED: "true",
    GENESIS_QUALIFYING_RULES_APPROVED: "true",
    GENESIS_QUALIFYING_RULES_VERSION,
    GENESIS_TERMS_APPROVED: "true",
    GENESIS_TERMS_VERSION: "GENESIS-TERMS-V1",
    GENESIS_MINIMUM_QUALIFYING_USDT_BASE_UNITS: "1000000",
    ["GENESIS_" + network.toUpperCase() + "_TREASURY_CONTROL_VERIFIED"]: "true",
  };
}

function databaseState(network = "ethereum") {
  const canonical = MAINNET_USDT_CONFIG[network];
  return {
    programme: {
      status: "OPEN",
      rules_version: GENESIS_QUALIFYING_RULES_VERSION,
      usdt_decimals: 6,
    },
    network: {
      network,
      network_identifier: canonical.networkIdentifier,
      token_identifier: canonical.tokenIdentifier,
      token_decimals: 6,
      treasury_address: canonical.treasuryAddress,
      enabled: 1,
      decimals_verified_at: 100,
      config_version: "verified-config-v1",
    },
    control: {
      registration_freeze_at: null,
      registration_closed_at: null,
      acrown_launched_at: null,
    },
  };
}

test("Genesis payment acceptance requires every independent environment, RPC, D1 and lifecycle gate", async () => {
  const closed = await genesisPaymentActivationGate(
    database({ programme: { status: "PRELAUNCH" }, network: { enabled: 0 }, control: {} }),
    {},
    "ethereum",
    false,
  );
  assert.equal(closed.enabled, false);
  assert.ok(closed.reasons.length >= 8);

  const state = databaseState("ethereum");
  const notYetReady = await genesisPaymentActivationGate(
    database(state), environment("ethereum"), "ethereum", false
  );
  assert.equal(notYetReady.enabled, false);
  assert.ok(notYetReady.reasons.some((reason) => /RPC node sources/.test(reason)));

  const ready = await genesisPaymentActivationGate(
    database(state), environment("ethereum"), "ethereum", true
  );
  assert.equal(ready.enabled, true);
  assert.equal(ready.asset, "USDT");
  assert.equal(ready.label, "USDT · Ethereum (ERC-20)");
  assert.equal(ready.tokenIdentifier, MAINNET_USDT_CONFIG.ethereum.tokenIdentifier);
});

test("Genesis payment acceptance checks each USDT network against its own canonical D1 treasury record", async () => {
  for (const network of ["ethereum", "tron", "solana"]) {
    const ready = await genesisPaymentActivationGate(
      database(databaseState(network)),
      environment(network),
      network,
      true,
    );
    assert.equal(ready.enabled, true, network);
    assert.equal(ready.label, {
      ethereum: "USDT · Ethereum (ERC-20)",
      tron: "USDT · TRON (TRC-20)",
      solana: "USDT · Solana (SPL)",
    }[network]);
  }

  const bad = databaseState("tron");
  bad.network.treasury_address = "wrong-address";
  const mismatch = await genesisPaymentActivationGate(
    database(bad), environment("tron"), "tron", true
  );
  assert.equal(mismatch.enabled, false);
  assert.ok(mismatch.reasons.some((reason) => /canonical token, decimal, treasury/.test(reason)));
});

test("Genesis payment acceptance closes at the permanent freeze and after ACROWN launch", async () => {
  const frozen = databaseState("ethereum");
  frozen.control.registration_freeze_at = 1;
  const closed = await genesisPaymentActivationGate(
    database(frozen), environment("ethereum"), "ethereum", true
  );
  assert.equal(closed.enabled, false);
  assert.ok(closed.reasons.some((reason) => /lifecycle cutoff/.test(reason)));

  const launched = databaseState("ethereum");
  launched.control.acrown_launched_at = 10;
  const afterLaunch = await genesisPaymentActivationGate(
    database(launched), environment("ethereum"), "ethereum", true
  );
  assert.equal(afterLaunch.enabled, false);
});
