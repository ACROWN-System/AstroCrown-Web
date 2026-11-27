import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  createPrimaryWalletSignInMessage,
  normalizeEvmAddress,
  validateEvmChainId,
  verifyEvmPersonalSignature,
} from "../src/index.js";
import { privateKeyToAccount } from "viem/accounts";

const origin = "https://astrocrown-account-staging-staging.workers.dev";

test("primary-wallet challenge binds the exact origin, address, chain, nonce and expiry", () => {
  const wallet = privateKeyToAccount("0x" + "66".repeat(32));
  const message = createPrimaryWalletSignInMessage(
    { origin },
    wallet.address,
    11155111,
    "challenge-id-12345678901234567890",
    "a1b2c3d4e5f60718293a4b5c6d7e8f90",
    "2026-11-28T00:00:00.000Z",
    "2026-11-28T00:05:00.000Z",
  );

  assert.ok(message.startsWith(origin + " wants you to sign in with your Ethereum account:"));
  assert.ok(message.includes(wallet.address));
  assert.ok(message.includes("URI: " + origin));
  assert.ok(message.includes("Chain ID: 11155111"));
  assert.ok(message.includes("Nonce: a1b2c3d4e5f60718293a4b5c6d7e8f90"));
  assert.ok(message.includes("Expiration Time: 2026-11-28T00:05:00.000Z"));
  assert.ok(message.includes("Request ID: challenge-id-12345678901234567890"));
  assert.match(message, /off-chain signature authenticates your account only/i);
  assert.match(message, /does not authorize a blockchain transaction, token approval, asset transfer or spending/i);
  assert.doesNotMatch(message, /administrator|admin role|transfer funds/i);
});

test("primary-wallet EIP-191 proof accepts only the expected externally owned account", async () => {
  const wallet = privateKeyToAccount("0x" + "77".repeat(32));
  const otherWallet = privateKeyToAccount("0x" + "88".repeat(32));
  const message = createPrimaryWalletSignInMessage(
    { origin },
    wallet.address,
    1,
    "challenge-id-abcdefghijklmnopqrst",
    "00112233445566778899aabbccddeeff",
    "2026-11-28T00:00:00.000Z",
    "2026-11-28T00:05:00.000Z",
  );
  const signature = await wallet.signMessage({ message });

  assert.equal(
    await verifyEvmPersonalSignature(message, signature, wallet.address),
    wallet.address,
  );
  await assert.rejects(
    verifyEvmPersonalSignature(message, signature, otherWallet.address),
    error => error.status === 401,
  );
  await assert.rejects(
    verifyEvmPersonalSignature(message, "0x1234", wallet.address),
    error => error.status === 401,
  );
});

test("primary-wallet input validation rejects malformed addresses and chain IDs", () => {
  const wallet = privateKeyToAccount("0x" + "99".repeat(32));
  assert.equal(normalizeEvmAddress(wallet.address.toLowerCase()), wallet.address);
  assert.equal(validateEvmChainId(1), 1);
  for (const address of ["", "0x1234", "not-a-wallet"]) {
    assert.throws(() => normalizeEvmAddress(address), error => error.status === 400);
  }
  for (const chainId of [0, -1, 1.5, "1", true, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => validateEvmChainId(chainId), error => error.status === 400);
  }
});

test("primary-wallet account identity schema stores public identity metadata only", async () => {
  const migration = await readFile(
    new URL("../migrations/0006_primary-wallet-account-authentication.sql", import.meta.url),
    "utf8",
  );
  assert.match(migration, /account_id TEXT NOT NULL UNIQUE REFERENCES auth_accounts/);
  assert.match(migration, /address TEXT NOT NULL COLLATE NOCASE UNIQUE/);
  assert.match(migration, /chain_id INTEGER NOT NULL CHECK \(chain_id > 0\)/);
  assert.match(migration, /auth_primary_wallet_challenges/);
  assert.match(migration, /expires_at INTEGER NOT NULL/);
  assert.match(migration, /used_at TEXT/);
  assert.doesNotMatch(migration, /private_key|seed_phrase|mnemonic|secret_words/i);
});

test("primary-wallet API verifies one-use challenges and never treats a wallet connection as proof", async () => {
  const worker = await readFile(new URL("../src/index.js", import.meta.url), "utf8");
  assert.match(worker, /\/api\/account\/primary-wallet\/options/);
  assert.match(worker, /\/api\/account\/primary-wallet\/verify/);
  assert.match(worker, /auth_primary_wallet_challenges WHERE challenge_id = \? AND used_at IS NULL AND expires_at > \?/);
  assert.match(worker, /UPDATE auth_primary_wallet_challenges SET used_at = \?/);
  assert.match(worker, /await verifyEvmPersonalSignature\(payload\.message, payload\.signature, address\)/);
  assert.match(worker, /transactionAuthorized: false/);
  assert.match(worker, /walletAccountCreated/);
});

test("login popup explains wallet identity, self-custody recovery and the limited legacy path", async () => {
  const ui = await readFile(
    new URL("../../prototype/account-ui.js", import.meta.url),
    "utf8",
  );
  assert.match(ui, /Sign in with wallet/);
  assert.match(ui, /Why wallet\?/);
  assert.match(ui, /Lost your wallet\?/);
  assert.match(ui, /we cannot retrieve, reset or recreate a lost wallet/i);
  assert.match(ui, /same wallet and address/i);
  assert.match(ui, /Never enter or send your seed phrase or private key/i);
  assert.match(ui, /Existing legacy passkey test accounts/);
  assert.match(ui, /Create account with wallet/);
});
