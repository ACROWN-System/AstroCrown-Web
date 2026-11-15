import assert from "node:assert/strict";
import test from "node:test";
import { buildSupporterStatus, supporterStatusResponse } from "../src/supporters.js";

const networks = [
  { network: "ethereum", network_identifier: "eip155:1", token_identifier: "0xdAC17F958D2ee523a2206206994597C13D831ec7", token_decimals: 6, enabled: 0, treasury_configured: 0 },
  { network: "tron", network_identifier: "tron:mainnet", token_identifier: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", token_decimals: 6, enabled: 0, treasury_configured: 0 },
  { network: "solana", network_identifier: "solana:mainnet", token_identifier: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", token_decimals: 6, enabled: 0, treasury_configured: 0 },
];

function mockDb(program = { environment: "MAINNET", status: "PRELAUNCH", activated_at: null, closes_at: null, rules_version: null }, rows = networks) {
  return {
    prepare(sql) {
      return {
        first: async () => {
          assert.match(sql, /FROM supporter_program/);
          return program;
        },
        all: async () => {
          assert.match(sql, /FROM supporter_network_config/);
          return { results: rows };
        },
      };
    },
  };
}

test("Supporter status reads the dedicated D1 and exposes exactly the canonical three-network allowlist", async () => {
  const response = await supporterStatusResponse({ SUPPORTERS_DB: mockDb() });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.deepEqual(payload.networks.map((item) => item.network), ["ethereum", "tron", "solana"]);
  assert.equal(payload.programme.status, "PRELAUNCH");
  assert.equal(payload.programme.activatedAt, null);
  assert.equal(payload.programme.closesAt, null);
});

test("Supporter status never exposes a treasury address or claims that a transfer can be made", () => {
  const payload = buildSupporterStatus(
    { environment: "MAINNET", status: "OPEN", activated_at: 1_800_000_000, closes_at: 1_815_552_000, rules_version: "v1" },
    networks.map((row) => ({ ...row, enabled: 1, treasury_configured: 1 }))
  );
  assert.equal(payload.paymentAcceptance.enabled, false);
  assert.equal(payload.paymentAcceptance.contributionsAccepted, false);
  assert.equal(payload.purchaseAllowance.automaticTokenIssuance, false);
  assert.ok(payload.networks.every((row) => !("treasuryAddress" in row)));
});

test("Supporter status fails closed when the dedicated database binding is absent", async () => {
  const response = await supporterStatusResponse({});
  assert.equal(response.status, 503);
  const payload = await response.json();
  assert.match(payload.error, /not bound/i);
});

test("Supporter status fails closed if a network is missing or has unexpected precision", () => {
  assert.throws(() => buildSupporterStatus(
    { environment: "MAINNET", status: "PRELAUNCH" },
    networks.slice(0, 2)
  ));
  assert.throws(() => buildSupporterStatus(
    { environment: "MAINNET", status: "PRELAUNCH" },
    networks.map((row, index) => index === 0 ? { ...row, token_decimals: 18 } : row)
  ));
});
