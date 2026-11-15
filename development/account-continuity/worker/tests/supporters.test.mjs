import assert from "node:assert/strict";
import test from "node:test";
import { buildSupporterStatus, supporterStatusResponse, normalizeWalletAddress, createWalletMessage, verifyWalletSignature, base58Encode, handleSupporterApi } from "../src/supporters.js";
import { privateKeyToAccount } from "viem/accounts";
import { keccak256, toBytes } from "viem";
import { generateKeyPairSync, webcrypto } from "node:crypto";

const networks = [
  { network: "ethereum", network_identifier: "eip155:1", token_identifier: "0xdAC17F958D2ee523a2206206994597C13D831ec7", token_decimals: 6, enabled: 0, treasury_configured: 0 },
  { network: "tron", network_identifier: "tron:mainnet", token_identifier: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", token_decimals: 6, enabled: 0, treasury_configured: 0 },
  { network: "solana", network_identifier: "solana:mainnet", token_identifier: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", token_decimals: 6, enabled: 0, treasury_configured: 0 },
];

function mockDb(program = { environment: "MAINNET", status: "PRELAUNCH", activated_at: null, rules_version: null }, rows = networks) {
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
  assert.equal("closesAt" in payload.programme, false);
});

test("Supporter status never exposes a treasury address or claims that a transfer can be made", () => {
  const payload = buildSupporterStatus(
    { environment: "MAINNET", status: "OPEN", activated_at: 1_800_000_000, rules_version: "v1" },
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

test("Supporter API keeps all payment and transfer endpoints unavailable", async () => {
  const db = { prepare() { throw new Error("Unsupported routes must not query the database."); } };
  const env = { SUPPORTERS_DB: db, ENVIRONMENT: "staging" };
  for (const pathname of [
    "/api/supporters/contributions",
    "/api/supporters/payment-intents",
    "/api/supporters/transfers",
    "/api/supporters/entitlements/credit",
  ]) {
    const response = await handleSupporterApi(
      new Request("https://astrocrown.example" + pathname, { method: "GET" }),
      env,
      { origin: "https://astrocrown.example" },
    );
    assert.equal(response.status, 404);
    assert.match((await response.json()).error, /does not exist/i);
  }
});

test("Supporter current-member endpoint requires a verified session cookie", async () => {
  const response = await handleSupporterApi(
    new Request("https://astrocrown.example/api/supporters/me", { method: "GET" }),
    { SUPPORTERS_DB: {}, ENVIRONMENT: "staging" },
    { origin: "https://astrocrown.example" },
  );
  assert.equal(response.status, 401);
});
