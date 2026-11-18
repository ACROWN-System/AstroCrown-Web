import assert from "node:assert/strict";
import test from "node:test";
import { handleCommunityApi, normalizeCommunitySlug, validateCommunityCursor, validateCommunityPageSize, validateCommunityText } from "../src/community.js";

test("community slugs are canonical and reject path-like or undersized values", () => {
  assert.equal(normalizeCommunitySlug(" Finance-Tokenomics "), "finance-tokenomics");
  assert.equal(normalizeCommunitySlug("AEROSPACE"), "aerospace");
  for (const invalid of ["", "a", "ab", "two words", "../admin", "a/b", "a--b", "-leading", "trailing-", "x".repeat(49)]) {
    assert.throws(() => normalizeCommunitySlug(invalid));
  }
});

test("community text normalizes line endings and rejects empty, control and oversized input", () => {
  assert.equal(validateCommunityText("  first\r\nsecond  ", 100, "Post content"), "first\nsecond");
  assert.throws(() => validateCommunityText(" \n ", 100, "Post content"));
  assert.throws(() => validateCommunityText("a\u0000b", 100, "Post content"));
  assert.throws(() => validateCommunityText("x".repeat(101), 100, "Post content"));
  assert.equal(validateCommunityText("", 100, "Description", true), "");
});

test("community feed page sizes are strictly bounded", () => {
  assert.equal(validateCommunityPageSize(null), 20);
  assert.equal(validateCommunityPageSize("1"), 1);
  assert.equal(validateCommunityPageSize("50"), 50);
  for (const invalid of ["0", "51", "-1", "1.5", "001", "abc", "100"]) assert.throws(() => validateCommunityPageSize(invalid));
});

test("community cursors require a valid encoded timestamp and post identifier", () => {
  const valid = btoa("1763500000|post_0123456789abcdef0123456789abcdef")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  assert.deepEqual(validateCommunityCursor(valid), {
    timestamp: 1763500000,
    id: "post_0123456789abcdef0123456789abcdef",
  });
  for (const invalid of ["", "bad", "eyJub25jZSI6MX0", "MTIzfG5vdC1hLXBvc3QtaWQ"]) {
    assert.throws(() => validateCommunityCursor(invalid));
  }
});

test("unauthenticated users cannot create posts or communities", async () => {
  let rateCalls = 0;
  const services = { rateLimit: async () => { rateCalls += 1; } };
  const db = {};
  const postResponse = await handleCommunityApi(
    new Request("https://astrocrown.invalid/api/community/posts", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: "Hello" }),
    }), db, null, services
  );
  assert.equal(postResponse.status, 401);
  const communityResponse = await handleCommunityApi(
    new Request("https://astrocrown.invalid/api/community/communities", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Test", slug: "test-community" }),
    }), db, null, services
  );
  assert.equal(communityResponse.status, 401);
  assert.equal(rateCalls, 0, "unauthenticated writes must be rejected before consuming authenticated rate-limit budget");
});

test("unknown community routes fail closed without querying storage", async () => {
  const response = await handleCommunityApi(new Request("https://astrocrown.invalid/api/community/unknown"), {}, null);
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "The community endpoint does not exist." });
});

test("malformed or unsupported community mutation bodies are rejected", async () => {
  const malformed = await handleCommunityApi(
    new Request("https://astrocrown.invalid/api/community/posts", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: "{",
    }), {}, null
  );
  assert.equal(malformed.status, 400);
  const wrongType = await handleCommunityApi(
    new Request("https://astrocrown.invalid/api/community/posts", {
      method: "POST", headers: { "Content-Type": "text/plain" }, body: "content",
    }), {}, null
  );
  assert.equal(wrongType.status, 415);
});
