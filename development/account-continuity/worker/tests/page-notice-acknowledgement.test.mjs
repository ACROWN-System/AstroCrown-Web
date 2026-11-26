import assert from "node:assert/strict";
import test from "node:test";
import {
  createPageAcknowledgement,
  createStagingAcknowledgement,
  hasPageAcknowledgement,
  pageAcknowledgementStatus,
} from "../src/index.js";

const env = {
  ENVIRONMENT: "staging",
  RATE_LIMIT_HMAC_KEY: "page-acknowledgement-test-key-32-characters-minimum",
};
const config = { origin: "https://astrocrown.example" };

test("page acknowledgement is signed, scoped to the page and version, and HttpOnly", async () => {
  const response = await createPageAcknowledgement(env, {
    pageId: "genesis",
    noticeVersion: "2026-11-26-genesis-v2",
  }, config);
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.acknowledged, true);
  assert.equal(result.pageId, "genesis");
  assert.equal(result.noticeVersion, "2026-11-26-genesis-v2");

  const setCookie = response.headers.get("Set-Cookie");
  assert.match(setCookie, /^acrown_page_ack_genesis=/);
  assert.match(setCookie, /Path=\/api\/genesis/);
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /SameSite=Strict/);

  const cookiePair = setCookie.split(";")[0];
  const request = new Request("https://astrocrown.example/api/genesis/identity/challenge", {
    method: "POST",
    headers: { Cookie: cookiePair },
  });
  assert.equal(await hasPageAcknowledgement(request, env, "genesis"), true);
  assert.equal(await hasPageAcknowledgement(request, env, "account"), false);
});

test("page acknowledgement rejects missing, altered, wrong-page and expired evidence", async () => {
  const response = await createPageAcknowledgement(env, {
    pageId: "account",
    noticeVersion: "2026-11-26-account-v3",
  }, config);
  const setCookie = response.headers.get("Set-Cookie");
  const cookiePair = setCookie.split(";")[0];
  assert.match(setCookie, /Path=\/api\//);
  const validRequest = new Request("https://astrocrown.example/api/account/profile", {
    method: "POST",
    headers: { Cookie: cookiePair },
  });
  assert.equal(await hasPageAcknowledgement(validRequest, env, "account"), true);
  const walletAuthRequest = new Request("https://astrocrown.example/api/wallet-auth/challenge", {
    method: "POST",
    headers: { Cookie: cookiePair },
  });
  assert.equal(await hasPageAcknowledgement(walletAuthRequest, env, "account"), true);
  assert.equal(await hasPageAcknowledgement(new Request(validRequest.url), env, "account"), false);

  const [name, value] = cookiePair.split("=");
  const altered = new Request(validRequest.url, {
    method: "POST",
    headers: { Cookie: name + "=" + value.slice(0, -1) + (value.endsWith("A") ? "B" : "A") },
  });
  assert.equal(await hasPageAcknowledgement(altered, env, "account"), false);

  const expired = value.replace(/\.([0-9]{10})\./, ".1000000000.");
  const expiredRequest = new Request(validRequest.url, {
    method: "POST",
    headers: { Cookie: name + "=" + expired },
  });
  assert.equal(await hasPageAcknowledgement(expiredRequest, env, "account"), false);
});

test("the acknowledgement status endpoint verifies HttpOnly server cookies rather than browser storage", async () => {
  const url = "https://astrocrown.example/api/staging/acknowledgement-status?pageId=account";
  const missing = await pageAcknowledgementStatus(new Request(url), env, "account");
  const missingResult = await missing.json();
  assert.equal(missingResult.acknowledged, false);
  assert.equal(missingResult.globalAcknowledged, false);
  assert.equal(missingResult.pageAcknowledged, false);

  const globalResponse = await createStagingAcknowledgement(env, {
    noticeVersion: "2026-11-26-public-test-v5",
  }, config);
  const globalCookie = globalResponse.headers.get("Set-Cookie").split(";")[0];
  const globalOnly = await pageAcknowledgementStatus(new Request(url, {
    headers: { Cookie: globalCookie },
  }), env, "account");
  const globalOnlyResult = await globalOnly.json();
  assert.equal(globalOnlyResult.globalAcknowledged, true);
  assert.equal(globalOnlyResult.pageAcknowledged, false);
  assert.equal(globalOnlyResult.acknowledged, false);

  const pageResponse = await createPageAcknowledgement(env, {
    pageId: "account",
    noticeVersion: "2026-11-26-account-v3",
  }, config);
  const pageCookie = pageResponse.headers.get("Set-Cookie").split(";")[0];
  const both = await pageAcknowledgementStatus(new Request(url, {
    headers: { Cookie: globalCookie + "; " + pageCookie },
  }), env, "account");
  const bothResult = await both.json();
  assert.equal(bothResult.acknowledged, true);
  assert.equal(bothResult.globalVersion, "2026-11-26-public-test-v5");
  assert.equal(bothResult.pageVersion, "2026-11-26-account-v3");

  const home = await pageAcknowledgementStatus(new Request(
    "https://astrocrown.example/api/staging/acknowledgement-status?pageId=home",
    { headers: { Cookie: globalCookie } }
  ), env, "home");
  const homeResult = await home.json();
  assert.equal(homeResult.acknowledged, true);
  assert.equal(homeResult.pageVersion, null);
});

test("unknown page IDs and stale notice versions fail closed", async () => {
  await assert.rejects(
    createPageAcknowledgement(env, { pageId: "payments", noticeVersion: "2026-11-26-genesis-v2" }, config),
    /page notice version is invalid or outdated/i,
  );
  await assert.rejects(
    createPageAcknowledgement(env, { pageId: "genesis", noticeVersion: "old-version" }, config),
    /page notice version is invalid or outdated/i,
  );
});
