import assert from "node:assert/strict";
import test from "node:test";
import { isSupersededPasskeyRoute, isSupersededPasskeySession, status } from "../src/index.js";

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

test("status revokes a legacy staging passkey session while keeping wallet registration available", async () => {
  const statements = [];
  const db = {
    prepare(sql) {
      const statement = {
        values: [],
        bind(...values) { this.values = values; return this; },
        async first() {
          if (sql.includes("SELECT a.*, s.expires_at")) {
            return {
              account_id: "acc_legacy_test",
              expires_at: Math.floor(Date.now() / 1000) + 600,
              authenticated_credential_id: "legacy-webauthn-credential",
            };
          }
          return null;
        },
        async run() {
          statements.push({ sql, values: this.values });
          return { meta: { changes: 1 } };
        },
      };
      return statement;
    },
  };
  const request = new Request("https://accounts.astrocrown.example/api/account/status", {
    headers: { Cookie: "acrown_account_session=legacy-session-token" },
  });
  const response = await status(db, request, { ENVIRONMENT: "staging", RATE_LIMIT_HMAC_KEY: "test-only-rate-limit-key-".repeat(3) });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.authenticated, false);
  assert.equal(body.walletAuthenticationAvailable, true);
  assert.equal(body.passkeyAvailable, false);
  assert.match(response.headers.get("set-cookie") || "", /Max-Age=0/);
  assert.equal(statements.length, 1);
  assert.match(statements[0].sql, /DELETE FROM auth_sessions WHERE token_hash = \?/);
});
