import assert from "node:assert/strict";
import test from "node:test";
import { privateKeyToAccount } from "viem/accounts";
import {
  createEthereumTreasuryChallenge,
  getEthereumTreasuryProofRuntime,
  verifyEthereumTreasurySignature
} from "../scripts/genesis-ethereum-treasury-proof.mjs";

const testAccount = privateKeyToAccount("0x0000000000000000000000000000000000000000000000000000000000000001");
const fixed = {
  address: testAccount.address,
  nonce: "0123456789abcdef0123456789abcdef",
  issuedAt: "2026-11-17T10:00:00.000Z",
  expirationTime: "2026-11-17T10:05:00.000Z",
  origin: "http://127.0.0.1:8765"
};

test("runtime defaults to loopback on a local computer", () => {
  const runtime = getEthereumTreasuryProofRuntime({});
  assert.equal(runtime.mode, "local");
  assert.equal(runtime.host, "127.0.0.1");
  assert.equal(runtime.origin, "http://127.0.0.1:8765");
  assert.equal(runtime.expectedHost, "127.0.0.1:8765");
});

test("GitHub Codespaces runtime uses the exact HTTPS forwarded hostname", () => {
  const runtime = getEthereumTreasuryProofRuntime({
    CODESPACES: "true",
    CODESPACE_NAME: "cosmic-workbench-123",
    GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN: "app.github.dev",
  });
  assert.equal(runtime.mode, "github-codespaces");
  assert.equal(runtime.host, "0.0.0.0");
  assert.equal(runtime.origin, "https://cosmic-workbench-123-8765.app.github.dev");
  assert.equal(runtime.expectedHost, "cosmic-workbench-123-8765.app.github.dev");
});

test("GitHub Codespaces runtime fails closed when forwarding identity is incomplete", () => {
  assert.throws(() => getEthereumTreasuryProofRuntime({
    CODESPACES: "true",
    CODESPACE_NAME: "cosmic-workbench-123",
  }), /identity is incomplete or invalid/);
  assert.throws(() => getEthereumTreasuryProofRuntime({
    CODESPACES: "true",
    CODESPACE_NAME: "cosmic-workbench-123",
    GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN: "attacker.example",
  }), /identity is incomplete or invalid/);
});

test("challenge binds the local origin, Ethereum Mainnet, wallet, nonce, expiry and no-transaction scope", () => {
  const message = createEthereumTreasuryChallenge(fixed);
  assert.match(message, /^127\.0\.0\.1:8765 wants you to sign in with your Ethereum account:/);
  assert.ok(message.includes(testAccount.address));
  assert.ok(message.includes("URI: http://127.0.0.1:8765/"));
  assert.ok(message.includes("Chain ID: 1"));
  assert.ok(message.includes("Nonce: 0123456789abcdef0123456789abcdef"));
  assert.ok(message.includes("Expiration Time: 2026-11-17T10:05:00.000Z"));
  assert.ok(message.includes("does not authorize a transaction, token approval, transfer"));
});

test("challenge can bind to an exact HTTPS GitHub Codespaces forwarded origin", () => {
  const origin = "https://cosmic-workbench-123-8765.app.github.dev";
  const message = createEthereumTreasuryChallenge({
    ...fixed,
    origin,
    expectedOrigin: origin,
  });
  assert.match(message, /^cosmic-workbench-123-8765\.app\.github\.dev wants you to sign in with your Ethereum account:/);
  assert.ok(message.includes(`URI: ${origin}/`));
});

test("challenge rejects an origin other than the fixed loopback origin", () => {
  assert.throws(() => createEthereumTreasuryChallenge({ ...fixed, origin: "https://example.com" }), /exactly match the configured proof origin/);
});

test("challenge rejects an invalid nonce", () => {
  assert.throws(() => createEthereumTreasuryChallenge({ ...fixed, nonce: "short" }), /nonce/);
});

test("a personal_sign signature verifies only for the signing address", async () => {
  const message = createEthereumTreasuryChallenge(fixed);
  const signature = await testAccount.signMessage({ message });
  const valid = await verifyEthereumTreasurySignature({
    message,
    signature,
    expectedAddress: testAccount.address
  });
  const invalid = await verifyEthereumTreasurySignature({
    message,
    signature,
    expectedAddress: "0x0000000000000000000000000000000000000002"
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.recoveredAddress, testAccount.address);
  assert.equal(invalid.valid, false);
});

test("verification rejects malformed signatures", async () => {
  await assert.rejects(
    verifyEthereumTreasurySignature({
      message: createEthereumTreasuryChallenge(fixed),
      signature: "0x1234",
      expectedAddress: testAccount.address
    }),
    /65-byte signature/
  );
});
