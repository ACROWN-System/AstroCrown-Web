import test from "node:test";
import assert from "node:assert/strict";
import {
  base64url,
  equalConstantTime,
  validateAccountIdentifier,
} from "../src/index.js";

test("opaque session tokens use URL-safe base64 without padding", () => {
  const encoded = base64url(Uint8Array.from([0, 1, 2, 127, 128, 255]));
  assert.match(encoded, /^[A-Za-z0-9_-]+$/);
  assert.equal(encoded.includes("="), false);
});

test("constant-time equality helper rejects mismatched values", () => {
  assert.equal(equalConstantTime("same", "same"), true);
  assert.equal(equalConstantTime("same", "samf"), false);
  assert.equal(equalConstantTime("same", "same!"), false);
});

test("account IDs use the stable public AC identifier format", () => {
  assert.equal(validateAccountIdentifier("ac-0123456789"), "AC-0123456789");
  assert.throws(() => validateAccountIdentifier("member@example.com"));
  assert.throws(() => validateAccountIdentifier("AC-123"));
});
