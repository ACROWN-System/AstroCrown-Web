import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { buildSupporterStatus, supporterStatusResponse, normalizeWalletAddress, createWalletMessage, verifyWalletSignature, base58Encode } from "../src/supporters.js";
import { privateKeyToAccount } from "viem/accounts";
import { keccak256, toBytes } from "viem";
import { generateKeyPairSync, webcrypto } from "node:crypto";
import { MAINNET_USDT_CONFIG } from "../../../supporter-programme/shared/mainnet-config.mjs";

const networks = [
  { network: "ethereum", network_identifier: MAINNET_USDT_CONFIG.ethereum.networkIdentifier, token_identifier: MAINNET_USDT_CONFIG.ethereum.tokenIdentifier, token_decimals: 6, treasury_address: MAINNET_USDT_CONFIG.ethereum.treasuryAddress, enabled: 0 },
  { network: "tron", network_identifier: MAINNET_USDT_CONFIG.tron.networkIdentifier, token_identifier: MAINNET_USDT_CONFIG.tron.tokenIdentifier, token_decimals: 6, treasury_address: MAINNET_USDT_CONFIG.tron.treasuryAddress, enabled: 0 },
  { network: "solana", network_identifier: MAINNET_USDT_CONFIG.solana.networkIdentifier, token_identifier: MAINNET_USDT_CONFIG.solana.tokenIdentifier, token_decimals: 6, treasury_address: MAINNET_USDT_CONFIG.solana.treasuryAddress, enabled: 0 },
];

function mockDb(
  program = { environment: "MAINNET", status: "PRELAUNCH", activated_at: null, closes_at: null, rules_version: null },
  rows = networks,
  genesisControl = {
    acrown_launched_at: null,
    acs_floor_purchase_opened_at: null,
    purchase_window_started_at: null,
    purchase_window_last_purchase_at: null,
    purchase_window_closes_at: null
  }
) {
  return {
    prepare(sql) {
      return {
        first: async () => {
          if (/FROM genesis_programme_control/.test(sql)) return genesisControl;
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
  assert.equal(payload.programmeLifecycle.purchaseWindowStartedAt, null);
  assert.equal(payload.programmeLifecycle.purchaseWindowLastPurchaseAt, null);
  assert.equal(payload.programmeLifecycle.purchaseWindowClosesAt, null);
  assert.equal(payload.programmeLifecycle.inactivityPeriodLabel, "180 days of inactivity");
});

test("Genesis mainnet USD₮ configuration contains valid owner-supplied public treasury addresses", async () => {
  for (const network of ["ethereum", "tron", "solana"]) {
    const configured = MAINNET_USDT_CONFIG[network];
    const normalized = await normalizeWalletAddress(network, configured.treasuryAddress);
    assert.equal(normalized.address, configured.treasuryAddress);
    assert.equal(configured.tokenDecimals, 6);
  }
});

test("owner-configured Genesis treasuries are accepted while all payment networks remain disabled", () => {
  const payload = buildSupporterStatus(
    { environment: "MAINNET", status: "PRELAUNCH", activated_at: null, closes_at: null, rules_version: null },
    networks
  );
  assert.deepEqual(
    payload.networks.map((row) => ({
      network: row.network,
      treasuryConfigured: row.treasuryConfigured,
      networkConfigured: row.networkConfigured
    })),
    [
      { network: "ethereum", treasuryConfigured: true, networkConfigured: false },
      { network: "tron", treasuryConfigured: true, networkConfigured: false },
      { network: "solana", treasuryConfigured: true, networkConfigured: false }
    ]
  );
  assert.equal(payload.paymentAcceptance.enabled, false);
  assert.equal(payload.paymentAcceptance.qualifyingPaymentsAccepted, false);
});

test("Supporter status never exposes a treasury address or claims that a transfer can be made", () => {
  const payload = buildSupporterStatus(
    { environment: "MAINNET", status: "OPEN", activated_at: 1_800_000_000, closes_at: 1_815_552_000, rules_version: "v1" },
    networks.map((row) => ({ ...row, enabled: 1, treasury_configured: 1 }))
  );
  assert.equal(payload.paymentAcceptance.enabled, false);
  assert.equal(payload.paymentAcceptance.qualifyingPaymentsAccepted, false);
  assert.equal(payload.purchaseAllowance.separateFromQualifyingPayment, true);
  assert.equal(payload.purchaseAllowance.automaticTokenIssuance, false);
  assert.ok(payload.networks.every((row) => !("treasuryAddress" in row)));
});

test("Supporter status fails closed when the dedicated database binding is absent", async () => {
  const response = await supporterStatusResponse({});
  assert.equal(response.status, 503);
  const payload = await response.json();
  assert.match(payload.error, /not bound/i);
});

test("Supporter status fails closed if a network is missing, duplicated, non-canonical or has unexpected precision", () => {
  assert.throws(() => buildSupporterStatus(
    { environment: "MAINNET", status: "PRELAUNCH" },
    networks.slice(0, 2)
  ));
  assert.throws(() => buildSupporterStatus(
    { environment: "MAINNET", status: "PRELAUNCH" },
    networks.map((row, index) => index === 0 ? { ...row, token_decimals: 18 } : row)
  ));
  assert.throws(() => buildSupporterStatus(
    { environment: "MAINNET", status: "PRELAUNCH" },
    networks.map((row, index) => index === 0 ? { ...row, token_identifier: "0xmalicious" } : row)
  ));
  assert.throws(() => buildSupporterStatus(
    { environment: "MAINNET", status: "PRELAUNCH" },
    [...networks, networks[0]]
  ));
  assert.throws(() => buildSupporterStatus(
    { environment: "MAINNET", status: "PRELAUNCH" },
    networks.map((row, index) => index === 1 ? { ...row, treasury_address: "TWrongGenesisAddress" } : row)
  ));
});


function base64url(bytes) {
  return Buffer.from(bytes).toString("base64url");
}

async function sha256(bytes) {
  return new Uint8Array(await webcrypto.subtle.digest("SHA-256", bytes));
}

async function tronAddressFromEvm(address) {
  const payload = new Uint8Array([0x41, ...toBytes(address)]);
  const checksum = (await sha256(await sha256(payload))).slice(0, 4);
  return base58Encode(new Uint8Array([...payload, ...checksum]));
}

function challengeFor({ network, address, message }) {
  return {
    network,
    address_normalized: network === "ethereum" ? address.toLowerCase() : address,
    message,
  };
}

test("Ethereum wallet challenge uses a domain-bound off-chain message and recovers its owner", async () => {
  const account = privateKeyToAccount("0x" + "0".repeat(63) + "1");
  const message = createWalletMessage({
    origin: "https://astrocrown.example",
    address: account.address,
    network: "ethereum",
    purpose: "REGISTER",
    challengeId: "wch_abcdefghijklmnopqrstuvwx",
    nonce: "abcdefghijkmnopqrstuvwxyz",
    issuedAt: "2026-11-15T10:00:00.000Z",
    expiresAt: "2026-11-15T10:10:00.000Z",
  });
  assert.match(message, /Chain ID: 1/);
  assert.match(message, /off-chain message signature only/i);
  assert.match(message, /urn:astrocrown:supporter:purpose:register/);
  const signature = await account.signMessage({ message });
  assert.equal(await verifyWalletSignature(challengeFor({ network: "ethereum", address: account.address, message }), signature), true);
  assert.equal(await verifyWalletSignature(challengeFor({ network: "ethereum", address: "0x0000000000000000000000000000000000000002", message }), signature), false);
});

test("Tron wallet challenge verifies TIP-191 signatures and canonical Base58Check address", async () => {
  const account = privateKeyToAccount("0x" + "0".repeat(63) + "2");
  const address = await tronAddressFromEvm(account.address);
  const normalized = await normalizeWalletAddress("tron", address);
  assert.equal(normalized.address, address);
  const message = createWalletMessage({
    origin: "https://astrocrown.example",
    address,
    network: "tron",
    purpose: "REGISTER",
    challengeId: "wch_abcdefghijklmnopqrstuvwx",
    nonce: "abcdefghijkmnopqrstuvwxyz",
    issuedAt: "2026-11-15T10:00:00.000Z",
    expiresAt: "2026-11-15T10:10:00.000Z",
  });
  const prefix = "\x19TRON Signed Message:\n" + new TextEncoder().encode(message).length;
  const hash = keccak256(new Uint8Array([...toBytes(prefix), ...toBytes(message)]));
  const signature = await account.sign({ hash });
  assert.equal(await verifyWalletSignature(challengeFor({ network: "tron", address, message }), signature), true);
  assert.equal(await verifyWalletSignature(challengeFor({ network: "tron", address: await tronAddressFromEvm(privateKeyToAccount("0x" + "0".repeat(63) + "3").address), message }), signature), false);
  await assert.rejects(() => normalizeWalletAddress("tron", address.slice(0, -1) + (address.endsWith("1") ? "2" : "1")));
});

test("Solana wallet challenge verifies an Ed25519 off-chain signature", async () => {
  const pair = generateKeyPairSync("ed25519");
  const publicDer = new Uint8Array(pair.publicKey.export({ format: "der", type: "spki" }));
  const publicKey = publicDer.slice(-32);
  const address = base58Encode(publicKey);
  const message = createWalletMessage({
    origin: "https://astrocrown.example",
    address,
    network: "solana",
    purpose: "DELIVERY",
    challengeId: "wch_abcdefghijklmnopqrstuvwx",
    nonce: "abcdefghijkmnopqrstuvwxyz",
    issuedAt: "2026-11-15T10:00:00.000Z",
    expiresAt: "2026-11-15T10:10:00.000Z",
  });
  const privateDer = new Uint8Array(pair.privateKey.export({ format: "der", type: "pkcs8" }));
  const signingKey = await webcrypto.subtle.importKey("pkcs8", privateDer, { name: "Ed25519" }, false, ["sign"]);
  const signature = base64url(new Uint8Array(await webcrypto.subtle.sign("Ed25519", signingKey, new TextEncoder().encode(message))));
  assert.equal(await verifyWalletSignature(challengeFor({ network: "solana", address, message }), signature), true);
  const altered = message + "\nchanged";
  assert.equal(await verifyWalletSignature(challengeFor({ network: "solana", address, message: altered }), signature), false);
});

test("separate Genesis member authentication handlers and session cookies are removed", async () => {
  const source = await readFile(new URL("../src/supporters.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /handleSupporterApi|supporter_member_sessions|acrown_supporter_session|loginChallenge|registrationChallenge/);
  const worker = await readFile(new URL("../src/index.js", import.meta.url), "utf8");
  assert.match(worker, /Legacy member registration endpoints are retired/);
});
