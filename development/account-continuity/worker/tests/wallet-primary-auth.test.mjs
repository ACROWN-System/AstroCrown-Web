import assert from "node:assert/strict";
import test from "node:test";
import { privateKeyToAccount } from "viem/accounts";
import { keccak256, toBytes } from "viem";
import { createPrimaryWalletMessage, issuePrimaryWalletChallenge, verifyPrimaryWalletChallenge } from "../src/wallet-auth.js";
import { base58Encode, normalizeWalletAddress, verifyWalletSignature } from "../src/supporters.js";

const ORIGIN = "https://accounts.astrocrown.example";
const issuedAt = "2026-11-26T10:00:00.000Z";
const expiresAt = "2026-11-26T10:05:00.000Z";

test("Ethereum primary-wallet challenge is domain, network, purpose and expiry bound", async () => {
  const wallet = privateKeyToAccount("0x0000000000000000000000000000000000000000000000000000000000000001");
  const message = createPrimaryWalletMessage({
    origin: ORIGIN, network: "ethereum", address: wallet.address, intent: "register",
    challengeId: "wac_abcdefghijklmnopqrstuv", nonce: "abcdefghijklmnopqrstuv",
    issuedAt, expiresAt,
  });
  assert.match(message, /accounts\.astrocrown\.example wants you to sign in with your Ethereum account:/);
  assert.match(message, /URI: https:\/\/accounts\.astrocrown\.example\//);
  assert.match(message, /Chain ID: 1/);
  assert.match(message, /urn:astrocrown:account:purpose:account-registration/);
  assert.match(message, /Nonce: abcdefghijklmnopqrstuv/);
  assert.match(message, /Expiration Time: 2026-11-26T10:05:00\.000Z/);
  assert.match(message, /off-chain message signature only/);
  assert.match(message, /does not authorize a transaction/);
  const signature = await wallet.signMessage({ message });
  assert.equal(await verifyWalletSignature({
    network: "ethereum", address_normalized: wallet.address.toLowerCase(), message,
  }, signature), true);
});

test("TRON and Solana primary-wallet challenges remain explicitly mainnet and off-chain", () => {
  for (const network of ["tron", "solana"]) {
    const message = createPrimaryWalletMessage({
      origin: ORIGIN, network, address: "11111111111111111111111111111111", intent: "login",
      challengeId: "wac_abcdefghijklmnopqrstuv", nonce: "abcdefghijklmnopqrstuv",
      issuedAt, expiresAt,
    });
    assert.match(message, new RegExp("Network: " + network + ":mainnet"));
    assert.match(message, /Purpose: account-sign-in/);
    assert.match(message, /off-chain message signature only/);
    assert.match(message, /does not authorize a transaction/);
  }
});

test("unsupported networks, invalid intents and non-origin URL components fail closed", () => {
  const base = {
    origin: ORIGIN, network: "ethereum", address: "0x0000000000000000000000000000000000000001",
    intent: "login", challengeId: "wac_abcdefghijklmnopqrstuv", nonce: "abcdefghijklmnopqrstuv",
    issuedAt, expiresAt,
  };
  assert.throws(() => createPrimaryWalletMessage({ ...base, network: "bitcoin" }), /complete supported primary-wallet challenge/i);
  assert.throws(() => createPrimaryWalletMessage({ ...base, intent: "transaction" }), /complete supported primary-wallet challenge/i);
  assert.throws(() => createPrimaryWalletMessage({ ...base, origin: ORIGIN + "/unexpected" }), /exact origin/i);
});

test("wallet authentication routes fail closed outside local and staging environments", async () => {
  const request = new Request(ORIGIN + "/api/wallet-auth/challenge", {
    method: "POST",
    headers: { Origin: ORIGIN, "Content-Type": "application/json" },
    body: JSON.stringify({ intent: "register" }),
  });
  await assert.rejects(
    issuePrimaryWalletChallenge(null, { ENVIRONMENT: "production" }, request, {}, { origin: ORIGIN }),
    (error) => error && error.status === 404,
  );
  await assert.rejects(
    verifyPrimaryWalletChallenge(null, { ENVIRONMENT: "production" }, request, {}, { origin: ORIGIN }),
    (error) => error && error.status === 404,
  );
});

test("Ethereum wallet message nonce uses the EIP-4361 alphanumeric nonce character set", () => {
  const wallet = privateKeyToAccount("0x0000000000000000000000000000000000000000000000000000000000000001");
  const message = createPrimaryWalletMessage({
    origin: ORIGIN, network: "ethereum", address: wallet.address, intent: "login",
    challengeId: "wac_abcdefghijklmnopqrstuv", nonce: "0123456789abcdefABCDEF",
    issuedAt, expiresAt,
  });
  const nonce = message.match(/^Nonce: ([A-Za-z0-9]+)$/m);
  assert.ok(nonce, "SIWE-style nonce must be alphanumeric");
});

test("TRON TIP-191 message signatures are verified against the canonical Base58Check account", async () => {
  const wallet = privateKeyToAccount("0x0000000000000000000000000000000000000000000000000000000000000001");
  const payload = new Uint8Array([0x41, ...toBytes(wallet.address)]);
  const first = new Uint8Array(await crypto.subtle.digest("SHA-256", payload));
  const second = new Uint8Array(await crypto.subtle.digest("SHA-256", first));
  const address = base58Encode(new Uint8Array([...payload, ...second.slice(0, 4)]));
  const normalized = await normalizeWalletAddress("tron", address);
  assert.equal(normalized.address, address);

  const message = createPrimaryWalletMessage({
    origin: ORIGIN, network: "tron", address, intent: "login",
    challengeId: "wac_abcdefghijklmnopqrstuv", nonce: "0123456789abcdefABCDEF",
    issuedAt, expiresAt,
  });
  const prefix = "\x19TRON Signed Message:\n" + String(new TextEncoder().encode(message).length);
  const hash = keccak256(new Uint8Array([...toBytes(prefix), ...toBytes(message)]));
  const signature = await wallet.sign({ hash });
  assert.equal(await verifyWalletSignature({
    network: "tron", address_normalized: address, message,
  }, signature), true);
  assert.equal(await verifyWalletSignature({
    network: "tron", address_normalized: address, message: message + " altered",
  }, signature), false);
});

test("Solana Ed25519 message signatures are verified against the canonical 32-byte public key", async () => {
  const pair = await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
  const publicKey = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
  const address = base58Encode(publicKey);
  const normalized = await normalizeWalletAddress("solana", address);
  assert.equal(normalized.address, address);

  const message = createPrimaryWalletMessage({
    origin: ORIGIN, network: "solana", address, intent: "login",
    challengeId: "wac_abcdefghijklmnopqrstuv", nonce: "0123456789abcdefABCDEF",
    issuedAt, expiresAt,
  });
  const signature = new Uint8Array(await crypto.subtle.sign("Ed25519", pair.privateKey, new TextEncoder().encode(message)));
  const encoded = Buffer.from(signature).toString("base64url");
  assert.equal(await verifyWalletSignature({
    network: "solana", address_normalized: address, message,
  }, encoded), true);
  assert.equal(await verifyWalletSignature({
    network: "solana", address_normalized: address, message: message + " altered",
  }, encoded), false);
});
