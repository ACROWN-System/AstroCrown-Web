import test from "node:test";
import assert from "node:assert/strict";
import {
  validateAdminPermissions,
  validateAdminReason,
  normalizeEvmAddress,
  validateEvmChainId,
  createAdminSiweMessage,
  verifyAdminSiweSignature,
} from "../src/index.js";
import { privateKeyToAccount } from "viem/accounts";

test("administrator permission validation accepts only the explicit permission vocabulary", () => {
  assert.deepEqual(validateAdminPermissions(undefined), []);
  assert.deepEqual(validateAdminPermissions([]), []);
  assert.deepEqual(
    validateAdminPermissions(["admin.roles.revoke", "admin.roles.grant"]),
    ["admin.roles.grant", "admin.roles.revoke"]
  );
});

test("administrator permission validation rejects client-invented roles and permissions", () => {
  for (const value of [
    null,
    "admin.roles.grant",
    ["admin"],
    ["owner"],
    ["admin.roles.grant", "admin.roles.grant"],
    ["admin.roles.grant", "admin.messages.broadcast"],
    ["admin.roles.grant", "admin.roles.revoke", "admin.messages.send", "extra"],
  ]) {
    assert.throws(() => validateAdminPermissions(value), error => error.status === 400);
  }
});

test("administrator change reasons are normalized and control characters are removed", () => {
  assert.equal(
    validateAdminReason("  Assign reviewed role\nfor support  "),
    "Assign reviewed rolefor support"
  );
  assert.equal(validateAdminReason("Reason with\tspacing"), "Reason withspacing");
});

test("administrator change reasons reject empty, non-string and overlong values", () => {
  for (const value of [undefined, null, "", "  ", 12, "x".repeat(501)]) {
    assert.throws(() => validateAdminReason(value), error => error.status === 400);
  }
});


test("EVM address and chain validators normalize addresses and reject malformed values", () => {
  const account = privateKeyToAccount("0x" + "11".repeat(32));
  assert.equal(normalizeEvmAddress(account.address.toLowerCase()), account.address);
  assert.equal(validateEvmChainId(1), 1);
  assert.throws(() => normalizeEvmAddress("0x1234"), error => error.status === 400);
  assert.throws(() => normalizeEvmAddress("not-an-address"), error => error.status === 400);
  for (const value of [0, -1, 1.5, "1", true, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => validateEvmChainId(value), error => error.status === 400);
  }
});

test("SIWE challenge construction binds origin, EVM address, chain, nonce and expiry", () => {
  const account = privateKeyToAccount("0x" + "22".repeat(32));
  const challenge = createAdminSiweMessage(
    { origin: "https://accounts.astrocrown.example" },
    account.address,
    11155111,
    "challenge-id-1234567890",
    "a1b2c3d4e5f60718293a4b5c6d7e8f90",
    "2026-11-06T00:00:00.000Z",
    "2026-11-06T00:05:00.000Z",
    "admin-session-step-up"
  );
  assert.ok(challenge.startsWith("https://accounts.astrocrown.example wants you to sign in with your Ethereum account:"));
  assert.ok(challenge.includes(account.address));
  assert.ok(challenge.includes("URI: https://accounts.astrocrown.example"));
  assert.ok(challenge.includes("Version: 1"));
  assert.ok(challenge.includes("Chain ID: 11155111"));
  assert.ok(challenge.includes("Nonce: a1b2c3d4e5f60718293a4b5c6d7e8f90"));
  assert.ok(challenge.includes("Issued At: 2026-11-06T00:00:00.000Z"));
  assert.ok(challenge.includes("Expiration Time: 2026-11-06T00:05:00.000Z"));
  assert.ok(challenge.includes("Request ID: challenge-id-1234567890"));
  assert.ok(challenge.endsWith("does not authorize a transaction."));
});

test("EIP-191 verification recovers the signing EOA from the exact SIWE message", async () => {
  const account = privateKeyToAccount("0x" + "33".repeat(32));
  const message = createAdminSiweMessage(
    { origin: "https://accounts.astrocrown.example" },
    account.address,
    1,
    "challenge-id-0987654321",
    "11223344556677889900aabbccddeeff",
    "2026-11-06T00:00:00.000Z",
    "2026-11-06T00:05:00.000Z",
    "admin-wallet-enrollment"
  );
  const signature = await account.signMessage({ message });
  assert.equal(await verifyAdminSiweSignature(message, signature, account.address), account.address);
});

test("EIP-191 verification rejects a different signer, malformed signature and wrong expected address", async () => {
  const signer = privateKeyToAccount("0x" + "44".repeat(32));
  const other = privateKeyToAccount("0x" + "55".repeat(32));
  const message = createAdminSiweMessage(
    { origin: "https://accounts.astrocrown.example" },
    signer.address,
    1,
    "challenge-id-1122334455",
    "ffeeddccbbaa00998877665544332211",
    "2026-11-06T00:00:00.000Z",
    "2026-11-06T00:05:00.000Z",
    "admin-session-step-up"
  );
  const wrongSignature = await other.signMessage({ message });
  await assert.rejects(
    verifyAdminSiweSignature(message, wrongSignature, signer.address),
    error => error.status === 401
  );
  await assert.rejects(
    verifyAdminSiweSignature(message, "0x1234", signer.address),
    error => error.status === 401
  );
  const validSignature = await signer.signMessage({ message });
  await assert.rejects(
    verifyAdminSiweSignature(message, validSignature, other.address),
    error => error.status === 401
  );
});
