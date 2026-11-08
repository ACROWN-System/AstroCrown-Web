import test from "node:test";
import assert from "node:assert/strict";
import {
  gate,
  createStagingAcknowledgement,
  hasStagingAcknowledgement,
} from "../src/index.js";

const origin = "https://astrocrown-account-staging-staging.example.workers.dev";
const secret = "test-only-hmac-key-".padEnd(40, "x");
const noticeVersion = "2026-11-08-public-test-v1";

test("public staging is reachable without a shared Basic Auth password when its abuse-control key exists", () => {
  const request = new Request(origin + "/");
  assert.equal(gate(request, {
    ENVIRONMENT: "staging",
    STAGING_ACCESS_MODE: "public",
    RATE_LIMIT_HMAC_KEY: secret,
  }), null);
});

test("public staging fails closed when its abuse-control key is missing", () => {
  const response = gate(new Request(origin + "/"), {
    ENVIRONMENT: "staging",
    STAGING_ACCESS_MODE: "public",
  });
  assert.equal(response.status, 503);
});

test("restricted staging mode continues to require its Basic Auth gate", () => {
  const request = new Request(origin + "/", {
    headers: { Authorization: "Basic " + btoa("staging:correct-test-secret") },
  });
  assert.equal(gate(request, {
    ENVIRONMENT: "staging",
    STAGING_ACCESS_CODE: "correct-test-secret",
  }), null);
  assert.equal(gate(new Request(origin + "/"), {
    ENVIRONMENT: "staging",
    STAGING_ACCESS_CODE: "correct-test-secret",
  }).status, 401);
});

test("a valid current notice acknowledgement issues a short-lived signed HttpOnly cookie", async () => {
  const response = await createStagingAcknowledgement(
    { ENVIRONMENT: "staging", RATE_LIMIT_HMAC_KEY: secret },
    { noticeVersion },
    { origin },
  );
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.acknowledged, true);
  assert.equal(result.noticeVersion, noticeVersion);
  const setCookie = response.headers.get("Set-Cookie");
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /Secure/);
  assert.match(setCookie, /SameSite=Strict/);
  const cookie = setCookie.split(";")[0];
  assert.equal(
    await hasStagingAcknowledgement(new Request(origin + "/api/account/status", {
      headers: { Cookie: cookie },
    }), { ENVIRONMENT: "staging", RATE_LIMIT_HMAC_KEY: secret }),
    true,
  );
});

test("missing, modified and wrong-version acknowledgement material is rejected", async () => {
  const env = { ENVIRONMENT: "staging", RATE_LIMIT_HMAC_KEY: secret };
  const issued = await createStagingAcknowledgement(env, { noticeVersion }, { origin });
  const cookie = issued.headers.get("Set-Cookie").split(";")[0];
  const [name, value] = cookie.split("=");
  const replacement = value.endsWith("A") ? "B" : "A";
  const tamperedCookie = name + "=" + value.slice(0, -1) + replacement;

  assert.equal(await hasStagingAcknowledgement(
    new Request(origin + "/api/account/status"), env,
  ), false);
  assert.equal(await hasStagingAcknowledgement(
    new Request(origin + "/api/account/status", { headers: { Cookie: tamperedCookie } }), env,
  ), false);
  await assert.rejects(
    createStagingAcknowledgement(env, { noticeVersion: "outdated" }, { origin }),
    /invalid or outdated/,
  );
});
