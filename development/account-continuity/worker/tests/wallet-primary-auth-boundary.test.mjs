import assert from "node:assert/strict";
import test from "node:test";
import { status } from "../src/index.js";

test("anonymous account status advertises only wallet-primary authentication", async () => {
  const origin = "http://localhost:8787";
  const response = await status(
    null,
    new Request(origin + "/api/account/status"),
    { ENVIRONMENT: "local" },
    { origin },
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.authenticated, false);
  assert.equal(body.walletAuthenticationAvailable, true);
  assert.deepEqual(body.walletAuthenticationNetworks, ["ethereum", "tron", "solana"]);
  for (const retiredField of [
    "passkeyAvailable",
    "passkeyCount",
    "postQuantumPasskeyCount",
    "mlDsaRegistrationAvailable",
    "recoveryKeyAvailable",
  ]) {
    assert.equal(Object.prototype.hasOwnProperty.call(body, retiredField), false, retiredField);
  }
});

test("wallet authentication is not advertised for a request on a different host", async () => {
  const response = await status(
    null,
    new Request("https://attacker.invalid/api/account/status"),
    {
      ENVIRONMENT: "staging",
      RATE_LIMIT_HMAC_KEY: "synthetic-test-only-rate-limit-key-000000000",
    },
    { origin: "https://accounts.astrocrown.example" },
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.authenticated, false);
  assert.equal(body.walletAuthenticationAvailable, false);
});
