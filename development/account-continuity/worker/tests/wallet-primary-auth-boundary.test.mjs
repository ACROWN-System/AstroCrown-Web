import assert from "node:assert/strict";
import test from "node:test";
import { isSupersededPasskeyRoute, isSupersededPasskeySession } from "../src/index.js";

test("legacy passkey sign-in, registration, recovery and passkey management routes are identified for staging shutdown", () => {
  for (const path of [
    "/api/passkeys/register/options",
    "/api/passkeys/register/verify",
    "/api/passkeys/authentication/options",
    "/api/passkeys/authentication/verify",
    "/api/account/recovery/options",
    "/api/account/recovery/complete",
    "/api/account/security/step-up/options",
    "/api/account/security/step-up/verify",
    "/api/account/security/passkeys/add/options",
    "/api/account/security/passkeys/add/verify",
    "/api/account/security/passkeys/revoke",
    "/api/account/security/recovery/rotate",
  ]) {
    assert.equal(isSupersededPasskeyRoute(path), true, path + " must be blocked in staging");
  }
});

test("wallet-primary identity, status, Genesis and separately governed admin wallet routes are not classified as passkey login", () => {
  for (const path of [
    "/api/account/status",
    "/api/account/avatar",
    "/api/account/logout",
    "/api/wallet-auth/challenge",
    "/api/wallet-auth/verify",
    "/api/genesis/identity/challenge",
    "/api/genesis/identity/verify",
    "/api/admin/wallet-challenge",
    "/api/admin/wallet-verify",
  ]) {
    assert.equal(isSupersededPasskeyRoute(path), false, path + " must remain distinct from passkey login");
  }
});

test("staging revokes legacy passkey sessions but preserves wallet-primary sessions", () => {
  assert.equal(isSupersededPasskeySession({ ENVIRONMENT: "staging" }, {
    authenticated_credential_id: "legacy-webauthn-credential",
  }), true);
  assert.equal(isSupersededPasskeySession({ ENVIRONMENT: "staging" }, {
    authenticated_credential_id: null,
  }), false);
  assert.equal(isSupersededPasskeySession({ ENVIRONMENT: "local" }, {
    authenticated_credential_id: "historical-regression-credential",
  }), false);
  assert.equal(isSupersededPasskeySession({ ENVIRONMENT: "production" }, {
    authenticated_credential_id: "legacy-webauthn-credential",
  }), false);
  assert.equal(isSupersededPasskeySession({ ENVIRONMENT: "staging" }, null), false);
});
