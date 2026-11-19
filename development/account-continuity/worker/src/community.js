const MAX_POST_LENGTH = 10000;
const MAX_DETAILS_LENGTH = 1000;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const REACTIONS = new Set(["like", "insightful", "support"]);
const REPORT_CATEGORIES = new Set(["spam", "harassment", "impersonation", "privacy", "illegal", "other"]);
const SLUG_PATTERN = /^(?=.{3,48}$)[a-z0-9]+(?:-[a-z0-9]+)*$/;
const POST_ID_PATTERN = /^post_[a-f0-9]{32}$/;

function json(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "X-Frame-Options": "DENY",
      "Cross-Origin-Resource-Policy": "same-origin",
    },
  });
}

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function onlyKeys(payload, allowed, label) {
  if (Object.keys(payload).some(key => !allowed.includes(key))) {
    throw fail(400, label + " contains unsupported fields.");
  }
}

function normalizeCommunitySlug(value) {
  if (typeof value !== "string") throw fail(400, "Enter a community URL name.");
  const slug = value.trim().toLowerCase();
  if (slug.length < 3 || slug.length > 48 || !SLUG_PATTERN.test(slug)) {
    throw fail(400, "Community URL names must use 3–48 lowercase letters, numbers or single hyphens.");
  }
  return slug;
}

function cleanText(value, maxLength, label, allowEmpty = false) {
  if (typeof value !== "string") throw fail(400, label + " must be text.");
  const normalized = value.replace(/\r\n?/g, "\n").normalize("NFC").trim();
  if ((!allowEmpty && !normalized) || normalized.length > maxLength ||
      /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(normalized)) {
    throw fail(400, label + " is empty, too long or contains unsupported control characters.");
  }
  return normalized;
}

function postId(value) {
  if (typeof value !== "string" || !POST_ID_PATTERN.test(value)) throw fail(400, "The post reference is invalid.");
  return value;
}

function randomId(prefix) {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return prefix + Array.from(bytes, value => value.toString(16).padStart(2, "0")).join("");
}

function encodeCursor(row) {
  const raw = String(row.created_at) + "|" + row.post_id;
  return btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeCursor(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{20,100}$/.test(value)) {
    throw fail(400, "The feed cursor is invalid.");
  }
  let raw = "";
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    raw = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
  } catch {
    throw fail(400, "The feed cursor is invalid.");
  }
  const split = raw.indexOf("|");
  const timestamp = Number(raw.slice(0, split));
  const id = split >= 0 ? raw.slice(split + 1) : "";
  if (split < 1 || !Number.isSafeInteger(timestamp) || timestamp <= 0 || !POST_ID_PATTERN.test(id)) {
    throw fail(400, "The feed cursor is invalid.");
  }
  return { timestamp, id };
}

function pageSize(value) {
  if (value === null || value === "") return DEFAULT_PAGE_SIZE;
  if (!/^\d{1,2}$/.test(value)) throw fail(400, "The feed page size is invalid.");
  const size = Number(value);
  if (!Number.isInteger(size) || size < 1 || size > MAX_PAGE_SIZE) {
    throw fail(400, "Feed pages must contain between 1 and 50 posts.");
  }
  return size;
}

async function readBody(request) {
  if ((request.headers.get("Content-Type") || "").split(";")[0].trim().toLowerCase() !== "application/json") {
    throw fail(415, "This endpoint accepts JSON requests only.");
  }
  if (Number(request.headers.get("Content-Length") || 0) > 16_384) throw fail(413, "The community request is too large.");
  const text = await request.text();
  if (new TextEncoder().encode(text).length > 16_384) throw fail(413, "The community request is too large.");
  try {
    const value = JSON.parse(text);
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid");
    return value;
  } catch {
    throw fail(400, "Enter a valid JSON request.");
  }
}

function requireAccount(account) {
  if (!account?.account_id) throw fail(401, "Sign in with your AstroCrown account before using community actions.");
  return account;
}

async function spaceBySlug(db, slug) {
  return db.prepare(
    "SELECT space_id,slug,name,description,purpose,rules_text,visibility,membership_policy,status,parent_space_id " +
    "FROM community_spaces WHERE slug = ?"
  ).bind(slug).first();
}

async function membershipFor(db, spaceId, accountId) {
  if (!accountId) return null;
  return db.prepare(
    "SELECT membership_status,member_role FROM community_memberships WHERE space_id = ? AND account_id = ?"
  ).bind(spaceId, accountId).first();
}

async function requireReadableSpace(db, space, account) {
  if (!space || space.status !== "active") throw fail(404, "This community could not be found.");
  const membership = await membershipFor(db, space.space_id, account?.account_id);
  if (space.visibility === "private" && membership?.membership_status !== "active") {
    throw fail(404, "This community could not be found.");
  }
  return membership;
}

async function requireActiveMember(db, space, account) {
  const actor = requireAccount(account);
  const membership = await membershipFor(db, space.space_id, actor.account_id);
  if (membership?.membership_status !== "active") throw fail(403, "Active community membership is required for this action.");
  return membership;
}

async function isPlatformModerator(account, services) {
  if (!account || typeof services.isPlatformAdmin !== "function") return false;
  return Boolean(await services.isPlatformAdmin());
}

async function isSpaceModerator(db, spaceId, account) {
  if (!account) return false;
  const row = await db.prepare(
    "SELECT member_role FROM community_memberships WHERE space_id = ? AND account_id = ? AND membership_status = 'active'"
  ).bind(spaceId, account.account_id).first();
  return row?.member_role === "owner" || row?.member_role === "moderator";
}

async function getPostRow(db, id) {
  const row = await db.prepare(
    "SELECT p.post_id,p.author_account_id,p.space_id,p.parent_post_id,p.content,p.visibility,p.created_at,p.edited_at," +
    "p.moderation_status,c.slug AS community_slug,c.name AS community_name,c.visibility AS community_visibility " +
    "FROM community_posts p LEFT JOIN community_spaces c ON c.space_id = p.space_id " +
    "WHERE p.post_id = ? AND p.deleted_at IS NULL"
  ).bind(id).first();
  if (!row || row.moderation_status === "removed") throw fail(404, "This post could not be found.");
  return row;
}

async function visiblePost(db, id, account) {
  const row = await getPostRow(db, id);
  if (row.moderation_status !== "visible") throw fail(404, "This post could not be found.");
  if (row.space_id) {
    const membership = await membershipFor(db, row.space_id, account?.account_id);
    if ((row.community_visibility !== "public" || row.visibility === "members") &&
        membership?.membership_status !== "active") throw fail(404, "This post could not be found.");
  }
  if (account) {
    const control = await db.prepare(
      "SELECT 1 AS hidden FROM community_account_controls WHERE " +
      "((account_id = ? AND target_account_id = ? AND control_type IN ('block','mute')) OR " +
      "(account_id = ? AND target_account_id = ? AND control_type = 'block')) LIMIT 1"
    ).bind(account.account_id, row.author_account_id, row.author_account_id, account.account_id).first();
    if (control) throw fail(404, "This post could not be found.");
  }
  return row;
}

async function preventReplyToBlock(db, authorId, actorId) {
  if (authorId === actorId) return;
  const blocked = await db.prepare(
    "SELECT 1 AS blocked FROM community_account_controls WHERE account_id = ? AND target_account_id = ? AND control_type = 'block'"
  ).bind(authorId, actorId).first();
  if (blocked) throw fail(404, "This post could not be found.");
}

async function postView(db, post, account) {
  const row = await db.prepare(
    "SELECT p.post_id,p.content,p.visibility,p.parent_post_id,p.created_at,p.edited_at," +
    "a.user_handle AS author_handle,a.avatar_id AS author_avatar," +
    "c.slug AS community_slug,c.name AS community_name," +
    "(SELECT COUNT(*) FROM community_post_reactions r WHERE r.post_id=p.post_id AND r.reaction='like') AS like_count," +
    "(SELECT COUNT(*) FROM community_posts reply WHERE reply.parent_post_id=p.post_id AND reply.deleted_at IS NULL AND reply.moderation_status='visible') AS reply_count," +
    "EXISTS(SELECT 1 FROM community_post_reactions mine WHERE mine.post_id=p.post_id AND mine.account_id=? AND mine.reaction='like') AS liked_by_viewer," +
    "EXISTS(SELECT 1 FROM community_post_bookmarks bookmark WHERE bookmark.post_id=p.post_id AND bookmark.account_id=?) AS bookmarked_by_viewer " +
    "FROM community_posts p JOIN auth_accounts a ON a.account_id=p.author_account_id " +
    "LEFT JOIN community_spaces c ON c.space_id=p.space_id " +
    "WHERE p.post_id=? AND p.deleted_at IS NULL AND p.moderation_status='visible'"
  ).bind(account?.account_id || "", account?.account_id || "", post.post_id).first();
  if (!row) throw fail(404, "This post could not be found.");
  return {
    id: row.post_id,
    content: row.content,
    createdAt: Number(row.created_at),
    editedAt: row.edited_at === null ? null : Number(row.edited_at),
    parentId: row.parent_post_id || null,
    visibility: row.visibility,
    author: { handle: row.author_handle, avatarId: row.author_avatar },
    community: row.community_slug ? { slug: row.community_slug, name: row.community_name } : null,
    likeCount: Number(row.like_count || 0),
    replyCount: Number(row.reply_count || 0),
    likedByViewer: Boolean(row.liked_by_viewer),
    bookmarkedByViewer: Boolean(row.bookmarked_by_viewer),
    permalink: "/community/post/" + row.post_id,
  };
}

async function listCommunities(db, account) {
  const result = await db.prepare(
    "SELECT c.slug,c.name,c.description,c.purpose,c.visibility,c.membership_policy," +
    "(SELECT COUNT(*) FROM community_memberships member WHERE member.space_id=c.space_id AND member.membership_status='active') AS member_count," +
    "m.membership_status,m.member_role " +
    "FROM community_spaces c LEFT JOIN community_memberships m ON m.space_id=c.space_id AND m.account_id=? " +
    "WHERE c.status='active' AND c.visibility IN ('public','restricted') ORDER BY c.name COLLATE NOCASE LIMIT 100"
  ).bind(account?.account_id || "").all();
  return (result.results || []).map(row => ({
    slug: row.slug,
    name: row.name,
    description: row.description,
    purpose: row.purpose,
    visibility: row.visibility,
    membershipPolicy: row.membership_policy,
    memberCount: Number(row.member_count || 0),
    membershipStatus: row.membership_status || "none",
    memberRole: row.member_role || null,
  }));
}

async function listFeed(db, url, account) {
  const limit = pageSize(url.searchParams.get("limit"));
  const cursor = url.searchParams.has("cursor") ? decodeCursor(url.searchParams.get("cursor")) : null;
  const slug = url.searchParams.get("space");
  const parentId = url.searchParams.has("parent") ? postId(url.searchParams.get("parent")) : null;
  let where;
  let bindings;
  let space = null;
  let membership = null;
  if (slug) {
    space = await spaceBySlug(db, normalizeCommunitySlug(slug));
    membership = await requireReadableSpace(db, space, account);
    if (space.visibility !== "public" && membership?.membership_status !== "active") {
      throw fail(404, "This community could not be found.");
    }
    where = "p.space_id=? AND (p.visibility='public' OR (p.visibility='members' AND ?=1))";
    bindings = [space.space_id, membership?.membership_status === "active" ? 1 : 0];
  } else if (parentId) {
    const parent = await visiblePost(db, parentId, account);
    where = "p.space_id IS ? AND p.visibility IN ('public','members')";
    bindings = [parent.space_id];
  } else {
    where = "p.space_id IS NULL AND p.visibility='public'";
    bindings = [];
  }
  if (parentId) bindings.push(parentId);
  const parentClause = parentId ? " AND p.parent_post_id=?" : " AND p.parent_post_id IS NULL";
  const viewerId = account?.account_id || "";
  const cursorClause = cursor ? " AND (p.created_at < ? OR (p.created_at = ? AND p.post_id < ?))" : "";
  const sql =
    "SELECT p.post_id,p.created_at FROM community_posts p " +
    "WHERE " + where + parentClause +
    " AND p.deleted_at IS NULL AND p.moderation_status='visible' " +
    "AND NOT EXISTS(SELECT 1 FROM community_account_controls ctl WHERE " +
"(ctl.account_id=? AND ctl.target_account_id=p.author_account_id AND ctl.control_type IN ('block','mute')) OR " +
"(ctl.account_id=p.author_account_id AND ctl.target_account_id=? AND ctl.control_type='block'))" +
    cursorClause +
    " ORDER BY p.created_at DESC,p.post_id DESC LIMIT ?";
  const args = [...bindings, viewerId, viewerId];
  if (cursor) args.push(cursor.timestamp, cursor.timestamp, cursor.id);
  args.push(limit + 1);
  const result = await db.prepare(sql).bind(...args).all();
  const rows = result.results || [];
  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);
  const items = [];
  for (const row of page) {
    const post = await visiblePost(db, row.post_id, account);
    items.push(await postView(db, post, account));
  }
  return {
    items,
    nextCursor: hasMore && page.length ? encodeCursor(page[page.length - 1]) : null,
    pageSize: limit,
    scope: slug ? "community" : parentId ? "replies" : "global",
  };
}

async function createPost(db, account, payload, parent = null) {
  const actor = requireAccount(account);
  onlyKeys(payload, parent ? ["content"] : ["content", "communitySlug", "visibility"], "The post");
  const content = cleanText(payload.content, MAX_POST_LENGTH, "Post content");
  let space = null;
  let parentId = null;
  if (parent) {
    parentId = postId(parent);
    const parentPost = await visiblePost(db, parentId, actor);
    await preventReplyToBlock(db, parentPost.author_account_id, actor.account_id);
    if (parentPost.space_id) {
      space = await spaceBySlug(db, parentPost.community_slug);
      await requireActiveMember(db, space, actor);
    }
  } else if (payload.communitySlug !== undefined) {
    const slug = normalizeCommunitySlug(payload.communitySlug);
    space = await spaceBySlug(db, slug);
    if (!space || space.status !== "active") throw fail(404, "This community could not be found.");
    await requireActiveMember(db, space, actor);
  }
  let visibility = parent
    ? (await getPostRow(db, parentId)).visibility
    : (space && space.visibility !== "public" ? "members" : "public");
  if (payload.visibility !== undefined) {
    if (!space || !["public","members"].includes(payload.visibility)) throw fail(400, "The selected post visibility is not valid for this location.");
    visibility = payload.visibility;
  }
  if (space && visibility === "public" && space.visibility !== "public") {
    throw fail(400, "Posts in restricted or private communities cannot be public.");
  }
  const id = randomId("post_");
  const now = Math.floor(Date.now() / 1000);
  await db.prepare(
    "INSERT INTO community_posts(post_id,author_account_id,space_id,parent_post_id,content,visibility,created_at) VALUES(?,?,?,?,?,?,?)"
  ).bind(id, actor.account_id, space?.space_id || null, parentId, content, visibility, now).run();
  const inserted = await visiblePost(db, id, actor);
  return postView(db, inserted, actor);
}

async function createCommunity(db, account, payload, services) {
  const actor = requireAccount(account);
  onlyKeys(payload, ["name","slug","description","purpose","rules","visibility","membershipPolicy"], "The community");
  if (!(await isPlatformModerator(actor, services))) throw fail(403, "Creating a community requires a freshly authorized platform administrator session.");
  const name = cleanText(payload.name, 80, "Community name");
  const slug = normalizeCommunitySlug(payload.slug);
  const description = cleanText(payload.description || "", 500, "Community description", true);
  const purpose = cleanText(payload.purpose || "", 500, "Community purpose", true);
  const rules = cleanText(payload.rules || "", 3000, "Community rules", true);
  const visibility = payload.visibility || "public";
  const membershipPolicy = payload.membershipPolicy || "open";
  if (!["public","restricted","private"].includes(visibility) ||
      !["open","request","invite_only"].includes(membershipPolicy) ||
      (visibility === "private" && membershipPolicy !== "invite_only") ||
      (visibility === "restricted" && membershipPolicy === "open")) {
    throw fail(400, "The community visibility and membership policy combination is invalid.");
  }
  const now = Math.floor(Date.now() / 1000);
  const id = randomId("space_");
  try {
    await db.batch([
      db.prepare(
        "INSERT INTO community_spaces(space_id,slug,name,description,purpose,rules_text,visibility,membership_policy,status,created_by_account_id,created_at,updated_at) " +
        "VALUES(?,?,?,?,?,?,?,?,'active',?,?,?)"
      ).bind(id, slug, name, description, purpose, rules, visibility, membershipPolicy, actor.account_id, now, now),
      db.prepare(
        "INSERT INTO community_memberships(space_id,account_id,membership_status,member_role,requested_at,updated_at) VALUES(?,?,'active','owner',?,?)"
      ).bind(id, actor.account_id, now, now),
      db.prepare(
        "INSERT INTO community_moderation_audit(audit_id,actor_account_id,event_type,target_type,target_id,reason,detail_json,created_at) VALUES(?,?,?,?,?,?,?,?)"
      ).bind(randomId("audit_"), actor.account_id, "community_created", "community", id, "Created through the authorized platform administration API.", JSON.stringify({ slug, visibility, membershipPolicy }), now),
    ]);
  } catch (error) {
    if (/unique|constraint/i.test(String(error?.message || error))) throw fail(409, "That community URL name is already in use.");
    throw error;
  }
  const space = await spaceBySlug(db, slug);
  return { id, slug: space.slug, name: space.name, visibility: space.visibility, membershipPolicy: space.membership_policy };
}

async function joinCommunity(db, account, slug) {
  const actor = requireAccount(account);
  const space = await spaceBySlug(db, normalizeCommunitySlug(slug));
  if (!space || space.status !== "active") throw fail(404, "This community could not be found.");
  if (space.membership_policy === "invite_only" || space.visibility === "private") {
    throw fail(403, "This community requires an invitation; self-joining is not available.");
  }
  const existing = await membershipFor(db, space.space_id, actor.account_id);
  if (existing?.membership_status === "banned") throw fail(403, "This account is not eligible to join this community.");
  if (existing?.membership_status === "active" || existing?.membership_status === "pending") {
    return { slug: space.slug, membershipStatus: existing.membership_status, memberRole: existing.member_role };
  }
  const status = space.membership_policy === "open" ? "active" : "pending";
  const now = Math.floor(Date.now() / 1000);
  await db.prepare(
    "INSERT INTO community_memberships(space_id,account_id,membership_status,member_role,requested_at,updated_at) " +
    "VALUES(?,?,?,'member',?,?) ON CONFLICT(space_id,account_id) DO UPDATE SET " +
    "membership_status=excluded.membership_status,member_role='member',requested_at=excluded.requested_at,updated_at=excluded.updated_at " +
    "WHERE community_memberships.membership_status='left'"
  ).bind(space.space_id, actor.account_id, status, now, now).run();
  return { slug: space.slug, membershipStatus: status, memberRole: "member" };
}

async function leaveCommunity(db, account, slug) {
  const actor = requireAccount(account);
  const space = await spaceBySlug(db, normalizeCommunitySlug(slug));
  if (!space || space.status !== "active") throw fail(404, "This community could not be found.");
  const membership = await membershipFor(db, space.space_id, actor.account_id);
  if (!membership || !["active","pending"].includes(membership.membership_status)) {
    return { slug: space.slug, membershipStatus: membership?.membership_status || "none" };
  }
  if (membership.member_role === "owner") throw fail(409, "The community owner must transfer ownership before leaving.");
  const now = Math.floor(Date.now() / 1000);
  await db.prepare(
    "UPDATE community_memberships SET membership_status='left',updated_at=? WHERE space_id=? AND account_id=? AND membership_status IN ('active','pending')"
  ).bind(now, space.space_id, actor.account_id).run();
  return { slug: space.slug, membershipStatus: "left" };
}

async function changeMemberRole(db, account, slug, targetAccountId, payload, services) {
  const actor = requireAccount(account);
  onlyKeys(payload, ["role","reason"], "The membership role change");
  const space = await spaceBySlug(db, normalizeCommunitySlug(slug));
  if (!space || space.status !== "active") throw fail(404, "This community could not be found.");
  const platformAdmin = await isPlatformModerator(actor, services);
  const actorMembership = await membershipFor(db, space.space_id, actor.account_id);
  const isOwner = actorMembership?.membership_status === "active" && actorMembership.member_role === "owner";
  if (!platformAdmin && !isOwner) throw fail(403, "A community owner or platform administrator is required to appoint moderators.");
  if (!["member","moderator"].includes(payload.role)) throw fail(400, "Only the member or moderator role may be assigned here.");
  const reason = cleanText(payload.reason, 500, "Role-change reason");
  const target = await db.prepare(
    "SELECT membership_status,member_role FROM community_memberships WHERE space_id=? AND account_id=?"
  ).bind(space.space_id, targetAccountId).first();
  if (!target || target.membership_status !== "active") throw fail(404, "The active community member could not be found.");
  if (target.member_role === "owner") throw fail(409, "Community ownership cannot be reassigned through a moderator change.");

  const now = Math.floor(Date.now() / 1000);
  await db.batch([
    db.prepare("UPDATE community_memberships SET member_role=?,updated_at=? WHERE space_id=? AND account_id=? AND membership_status='active'").bind(payload.role, now, space.space_id, targetAccountId),
    db.prepare("INSERT INTO community_moderation_audit(audit_id,actor_account_id,event_type,target_type,target_id,reason,detail_json,created_at) VALUES(?,?,?,?,?,?,?,?)")
      .bind(randomId("audit_"), actor.account_id, "community_member_role_changed", "membership", space.space_id + ":" + targetAccountId, reason, JSON.stringify({ role: payload.role }), now),
  ]);
  return { slug: space.slug, accountId: targetAccountId, role: payload.role };
}

async function toggleReaction(db, account, id, payload) {
  const actor = requireAccount(account);
  onlyKeys(payload, ["reaction"], "The reaction");
  const post = await visiblePost(db, id, actor);
  if (post.space_id) {
    const space = await spaceBySlug(db, post.community_slug);
    await requireActiveMember(db, space, actor);
  }
  if (payload.reaction === null) {
    await db.prepare("DELETE FROM community_post_reactions WHERE post_id=? AND account_id=?").bind(id, actor.account_id).run();
  } else {
    if (!REACTIONS.has(payload.reaction)) throw fail(400, "Choose a supported community reaction.");
    await db.prepare(
      "INSERT OR IGNORE INTO community_post_reactions(post_id,account_id,reaction,created_at) VALUES(?,?,?,?)"
    ).bind(id, actor.account_id, payload.reaction, Math.floor(Date.now() / 1000)).run();
  }
  return postView(db, await visiblePost(db, id, actor), actor);
}

async function toggleBookmark(db, account, id) {
  const actor = requireAccount(account);
  const post = await visiblePost(db, id, actor);
  if (post.space_id && (post.visibility === "members" || post.community_visibility !== "public")) {
    await requireActiveMember(db, await spaceBySlug(db, post.community_slug), actor);
  }
  const existing = await db.prepare("SELECT 1 AS saved FROM community_post_bookmarks WHERE post_id=? AND account_id=?").bind(id, actor.account_id).first();
  if (existing) {
    await db.prepare("DELETE FROM community_post_bookmarks WHERE post_id=? AND account_id=?").bind(id, actor.account_id).run();
  } else {
    await db.prepare("INSERT INTO community_post_bookmarks(post_id,account_id,created_at) VALUES(?,?,?)").bind(id, actor.account_id, Math.floor(Date.now() / 1000)).run();
  }
  return postView(db, await visiblePost(db, id, actor), actor);
}

async function reportPost(db, account, id, payload) {
  const actor = requireAccount(account);
  onlyKeys(payload, ["category","details"], "The report");
  await visiblePost(db, id, actor);
  const category = payload.category;
  if (!REPORT_CATEGORIES.has(category)) throw fail(400, "Choose a supported report category.");
  const details = cleanText(payload.details || "", MAX_DETAILS_LENGTH, "Report details", true);
  try {
    await db.prepare(
      "INSERT INTO community_content_reports(report_id,reporter_account_id,target_type,target_id,category,details,created_at) VALUES(?,?,'post',?,?,?,?)"
    ).bind(randomId("report_"), actor.account_id, id, category, details, Math.floor(Date.now() / 1000)).run();
  } catch (error) {
    if (/unique|constraint/i.test(String(error?.message || error))) throw fail(409, "A report for this post has already been submitted by this account.");
    throw error;
  }
  return { submitted: true, reportStatus: "open" };
}

async function deleteOwnPost(db, account, id) {
  const actor = requireAccount(account);
  const post = await visiblePost(db, id, actor);
  if (post.author_account_id !== actor.account_id) throw fail(403, "Only the author may remove this post.");
  const now = Math.floor(Date.now() / 1000);
  await db.batch([
    db.prepare("UPDATE community_posts SET deleted_at=? WHERE post_id=? AND author_account_id=? AND deleted_at IS NULL").bind(now, id, actor.account_id),
    db.prepare(
      "INSERT INTO community_moderation_audit(audit_id,actor_account_id,event_type,target_type,target_id,reason,detail_json,created_at) VALUES(?,?,?,?,?,?,?,?)"
    ).bind(randomId("audit_"), actor.account_id, "post_author_removed", "post", id, "Post removed by its author.", "{}", now),
  ]);
  return { id, deleted: true };
}

async function moderatePost(db, account, id, payload, services) {
  const actor = requireAccount(account);
  onlyKeys(payload, ["action","reason"], "The moderation action");
  const post = await getPostRow(db, id);
  if (!["hide","restore"].includes(payload.action)) throw fail(400, "Choose hide or restore for a moderation action.");
  const reason = cleanText(payload.reason, 500, "Moderation reason");
  const allowed = post.space_id
    ? await isSpaceModerator(db, post.space_id, actor) || await isPlatformModerator(actor, services)
    : await isPlatformModerator(actor, services);
  if (!allowed) throw fail(403, "An authorized community moderator or platform administrator is required.");
  const moderationStatus = payload.action === "hide" ? "hidden" : "visible";
  const now = Math.floor(Date.now() / 1000);
  await db.batch([
    db.prepare("UPDATE community_posts SET moderation_status=? WHERE post_id=?").bind(moderationStatus, id),
    db.prepare(
      "INSERT INTO community_moderation_audit(audit_id,actor_account_id,event_type,target_type,target_id,reason,detail_json,created_at) VALUES(?,?,?,?,?,?,?,?)"
    ).bind(randomId("audit_"), actor.account_id, "post_" + payload.action, "post", id, reason, JSON.stringify({ priorStatus: post.moderation_status, newStatus: moderationStatus }), now),
  ]);
  return { id, moderationStatus };
}

async function setAccountControl(db, account, targetAccountId, payload) {
  const actor = requireAccount(account);
  onlyKeys(payload, ["type","action"], "The account control");
  if (!["block","mute"].includes(payload.type) || !["add","remove"].includes(payload.action)) {
    throw fail(400, "Choose a supported block or mute action.");
  }
  if (targetAccountId === actor.account_id) throw fail(400, "You cannot block or mute your own account.");
  const exists = await db.prepare("SELECT 1 AS found FROM auth_accounts WHERE account_id=?").bind(targetAccountId).first();
  if (!exists) throw fail(404, "The account could not be found.");
  if (payload.action === "add") {
    await db.prepare("INSERT OR IGNORE INTO community_account_controls(account_id,target_account_id,control_type,created_at) VALUES(?,?,?,?)")
      .bind(actor.account_id,targetAccountId,payload.type,Math.floor(Date.now()/1000)).run();
  } else {
    await db.prepare("DELETE FROM community_account_controls WHERE account_id=? AND target_account_id=? AND control_type=?")
      .bind(actor.account_id,targetAccountId,payload.type).run();
  }
  return { accountControl: payload.type, action: payload.action, applied: true };
}

async function communityDetail(db, slug, account) {
  const space = await spaceBySlug(db, normalizeCommunitySlug(slug));
  if (!space || space.status !== "active") throw fail(404, "This community could not be found.");
  const membership = await requireReadableSpace(db, space, account);
  const count = await db.prepare(
    "SELECT COUNT(*) AS member_count FROM community_memberships WHERE space_id=? AND membership_status='active'"
  ).bind(space.space_id).first();
  return {
    slug: space.slug, name: space.name, description: space.description, purpose: space.purpose,
    rules: space.rules_text, visibility: space.visibility, membershipPolicy: space.membership_policy,
    memberCount: Number(count?.member_count || 0),
    membershipStatus: membership?.membership_status || "none",
    memberRole: membership?.member_role || null,
    canViewPosts: space.visibility === "public" || membership?.membership_status === "active",
  };
}

export async function handleCommunityApi(request, db, account, services = {}) {
  const url = new URL(request.url);
  const path = url.pathname;
  if (!path.startsWith("/api/community/")) return null;
  const method = request.method;
  const rateLimit = services.rateLimit || (async () => {});
  const limited = async (action, maximum, seconds) => rateLimit(action, maximum, seconds);
  try {
    if (method === "GET" && path === "/api/community/communities") {
      await limited("discover", 120, 60);
      return json(200, { communities: await listCommunities(db, account) });
    }
    if (method === "GET" && path === "/api/community/feed") {
      await limited("feed", 120, 60);
      return json(200, await listFeed(db, url, account));
    }
    const communityFeed = path.match(/^\/api\/community\/communities\/([a-z0-9-]+)\/feed$/);
    if (method === "GET" && communityFeed) {
      await limited("community-feed", 120, 60);
      const feedUrl = new URL(url.origin + "/api/community/feed");
      for (const [key,value] of url.searchParams.entries()) feedUrl.searchParams.append(key,value);
      feedUrl.searchParams.set("space", normalizeCommunitySlug(communityFeed[1]));
      return json(200, await listFeed(db, feedUrl, account));
    }
    const communityDetailMatch = path.match(/^\/api\/community\/communities\/([a-z0-9-]+)$/);
    if (method === "GET" && communityDetailMatch) {
      await limited("community-detail", 120, 60);
      return json(200, await communityDetail(db, communityDetailMatch[1], account));
    }
    const postDetail = path.match(/^\/api\/community\/posts\/(post_[a-f0-9]{32})$/);
    if (method === "GET" && postDetail) {
      await limited("post-detail", 120, 60);
      const post = await visiblePost(db, postDetail[1], account);
      return json(200, { post: await postView(db, post, account) });
    }
    const repliesList = path.match(/^\/api\/community\/posts\/(post_[a-f0-9]{32})\/replies$/);
    if (method === "GET" && repliesList) {
      await limited("post-replies", 120, 60);
      const post = await visiblePost(db, repliesList[1], account);
      const feedUrl = new URL(url.origin + "/api/community/feed?parent=" + encodeURIComponent(post.post_id));
      for (const [key,value] of url.searchParams.entries()) if (key !== "parent") feedUrl.searchParams.append(key,value);
      return json(200, await listFeed(db, feedUrl, account));
    }

    if (method === "POST") {
      const payload = await readBody(request);
      if (path === "/api/community/communities") {
        const actor = requireAccount(account);
        await limited("community-create", 5, 3600);
        return json(201, await createCommunity(db, actor, payload, services));
      }
      if (path === "/api/community/posts") {
        requireAccount(account);
        await limited("post-create", 30, 3600);
        return json(201, { post: await createPost(db, account, payload) });
      }
      const membershipRoute = path.match(/^\/api\/community\/communities\/([a-z0-9-]+)\/(join|leave)$/);
      if (membershipRoute) {
        requireAccount(account);
        await limited("community-membership", 20, 3600);
        onlyKeys(payload, [], "The membership request");
        return json(200, membershipRoute[2] === "join"
          ? await joinCommunity(db, account, membershipRoute[1])
          : await leaveCommunity(db, account, membershipRoute[1]));
      }
      const roleRoute = path.match(/^\/api\/community\/communities\/([a-z0-9-]+)\/members\/([A-Za-z0-9_-]{1,100})\/role$/);
      if (roleRoute) {
        requireAccount(account);
        await limited("community-role", 10, 3600);
        return json(200, await changeMemberRole(db, account, roleRoute[1], roleRoute[2], payload, services));
      }
      const controlRoute = path.match(/^\/api\/community\/accounts\/([A-Za-z0-9_-]{1,100})\/control$/);
      if (controlRoute) {
        requireAccount(account);
        await limited("account-control", 20, 3600);
        return json(200, await setAccountControl(db, account, controlRoute[1], payload));
      }
      const postAction = path.match(/^\/api\/community\/posts\/(post_[a-f0-9]{32})(?:\/(replies|reactions|bookmark|report|delete|moderation))?$/);
      if (postAction) {
        const id = postId(postAction[1]);
        const action = postAction[2] || "detail";
        if (action === "detail") {
          onlyKeys(payload, [], "The post lookup");
          const row = await visiblePost(db, id, account);
          return json(200, { post: await postView(db, row, account) });
        }
        requireAccount(account);
        await limited("post-" + action, 60, 3600);
        if (action === "replies") return json(201, { post: await createPost(db, account, payload, id) });
        if (action === "reactions") return json(200, { post: await toggleReaction(db, account, id, payload) });
        if (action === "bookmark") {
          onlyKeys(payload, [], "The bookmark request");
          return json(200, { post: await toggleBookmark(db, account, id) });
        }
        if (action === "report") return json(201, await reportPost(db, account, id, payload));
        if (action === "delete") {
          onlyKeys(payload, [], "The post removal");
          return json(200, await deleteOwnPost(db, account, id));
        }
        if (action === "moderation") return json(200, await moderatePost(db, account, id, payload, services));
      }
    }
    return json(404, { error: "The community endpoint does not exist." });
  } catch (error) {
    const status = Number(error?.status) || 500;
    return json(status, { error: status < 500 ? error.message : "The community service encountered an unexpected error." });
  }
}

export {
  cleanText as validateCommunityText,
  decodeCursor as validateCommunityCursor,
  normalizeCommunitySlug,
  pageSize as validateCommunityPageSize,
};
