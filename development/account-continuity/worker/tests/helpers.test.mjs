import test from "node:test";
import assert from "node:assert/strict";
import {
  base64url,
  fromBase64url,
  equalConstantTime,
  validateAccountIdentifier,
  validateRecoveryKey,
} from "../src/index.js";

test("base64url round trip preserves bytes and omits padding", () => {
  const input = Uint8Array.from([0, 1, 2, 127, 128, 255]);
  assert.deepEqual(fromBase64url(base64url(input)), input);
  assert.match(base64url(input), /^[A-Za-z0-9_-]+$/);
});

test("constant-time equality helper rejects mismatched values", () => {
  assert.equal(equalConstantTime("same", "same"), true);
  assert.equal(equalConstantTime("same", "samf"), false);
  assert.equal(equalConstantTime("same", "same!"), false);
});

test("account IDs use the established opaque AC format", () => {
  assert.equal(validateAccountIdentifier("ac-0123456789"), "AC-0123456789");
  assert.throws(() => validateAccountIdentifier("member@example.com"));
  assert.throws(() => validateAccountIdentifier("AC-123"));
});

test("recovery keys require the full versioned high-entropy format", () => {
  assert.equal(validateRecoveryKey("ACR1-" + "a".repeat(43)), "ACR1-" + "a".repeat(43));
  assert.throws(() => validateRecoveryKey("ACR1-short"));
});
