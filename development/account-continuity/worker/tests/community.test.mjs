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

test("a 20-post global feed hydrates all post fields in one D1 statement", async () => {
  const statements = [];
  const rows = Array.from({ length: 21 }, (_, index) => ({
    post_id: "post_" + String(index + 1).padStart(32, "0"),
    content: "Post " + (index + 1),
    visibility: "public",
    parent_post_id: null,
    created_at: 1763500000 - index,
    edited_at: null,
    author_handle: "member-" + (index + 1),
    author_avatar: "person",
    community_slug: null,
    community_name: null,
    like_count: index,
    reply_count: 0,
    liked_by_viewer: 0,
    bookmarked_by_viewer: 0,
  }));
  const db = {
    prepare(sql) {
      statements.push(sql);
      return {
        bind(..._args) {
          return { all: async () => ({ results: rows }) };
        },
      };
    },
  };
  const response = await handleCommunityApi(
    new Request("https://astrocrown.invalid/api/community/feed?limit=20"),
    db,
    { account_id: "account_test" },
    { rateLimit: async () => {} }
  );
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.items.length, 20);
  assert.equal(body.items[0].id, rows[0].post_id);
  assert.equal(body.items[0].content, rows[0].content);
  assert.equal(body.items[0].author.handle, rows[0].author_handle);
  assert.equal(body.items[0].likeCount, 0);
  assert.equal(body.nextCursor !== null, true);
  assert.equal(body.scope, "global");
  assert.equal(statements.length, 1,
    "feed rendering must use one D1 statement rather than separate visibility and post-view reads per item");
  assert.match(statements[0], /community_account_controls/);
  assert.match(statements[0], /community_memberships/);
  assert.match(statements[0], /bookmarked_by_viewer/);
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
