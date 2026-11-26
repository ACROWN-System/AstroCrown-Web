import assert from "node:assert/strict";
import test from "node:test";
import { privateKeyToAccount } from "viem/accounts";
import { createPrimaryWalletMessage } from "../src/wallet-auth.js";
import { verifyWalletSignature } from "../src/supporters.js";

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
