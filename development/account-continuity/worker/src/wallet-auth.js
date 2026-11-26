import { normalizeWalletAddress, verifyWalletSignature } from "./supporters.js";
import { createDefaultMemberName } from "./member-name.js";

const SESSION_COOKIE = "acrown_account_session";
const SESSION_SECONDS = 1800;
const CHALLENGE_SECONDS = 300;
const TERMS_VERSION = "development-terms-2026-10-31-v0.3";
const NETWORKS = new Set(["ethereum", "tron", "solana"]);

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}
function randomBytes(length) {
  return crypto.getRandomValues(new Uint8Array(length));
}
function base64url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function hex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
async function digest(value) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  return base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)));
}
async function hmac(secret, value) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  return base64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))));
}
function json(status, body, headers = {}) {
  const h = new Headers(headers);
  h.set("Content-Type", "application/json; charset=utf-8");
  h.set("Cache-Control", "no-store, max-age=0");
  h.set("X-Content-Type-Options", "nosniff");
  h.set("Referrer-Policy", "no-referrer");
  h.set("X-Frame-Options", "DENY");
  h.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  h.set("Cross-Origin-Resource-Policy", "same-origin");
  h.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  return new Response(JSON.stringify(body), { status, headers: h });
}
async function rateLimit(db, env, request, action, subject, maximum, seconds) {
  const secret = env.RATE_LIMIT_HMAC_KEY ||
    (env.ENVIRONMENT === "local" ? "local-development-only-not-for-staging" : "");
  if (typeof secret !== "string" || secret.length < 32) {
    throw fail(503, "The wallet authentication abuse-control key is not configured.");
  }
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const subjectHash = await hmac(secret, action + "\0" + subject + "\0" + ip);
  const now = Math.floor(Date.now() / 1000);
  const result = await db.prepare(
    "INSERT INTO auth_rate_events(event_id,action,subject_hash,created_at) " +
    "SELECT ?,?,?,? WHERE (SELECT COUNT(*) FROM auth_rate_events WHERE action=? AND subject_hash=? AND created_at>=?)<?"
  ).bind(hex(randomBytes(16)), action, subjectHash, now, action, subjectHash, now - seconds, maximum).run();
  if (Number(result.meta?.changes || 0) !== 1) throw fail(429, "Too many wallet authentication attempts. Please try again later.");
}
function proofMethod(network) {
  return network === "ethereum" ? "EIP-191" : network === "tron" ? "TIP-191" : "ED25519";
}
export function createPrimaryWalletMessage({ origin, network, address, intent, challengeId, nonce, issuedAt, expiresAt }) {
  if (typeof origin !== "string" || !["register", "login"].includes(intent) ||
      !NETWORKS.has(network) || typeof address !== "string" || !address ||
      typeof challengeId !== "string" || typeof nonce !== "string" ||
      typeof issuedAt !== "string" || typeof expiresAt !== "string") {
    throw new TypeError("A complete supported primary-wallet challenge is required.");
  }
  const parsed = new URL(origin);
  if (parsed.origin !== origin || parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw new TypeError("The wallet challenge origin must be an exact origin.");
  }
  const domain = parsed.host;
  const uri = origin + "/";
  const purpose = intent === "register" ? "account-registration" : "account-sign-in";
  const statement = "AstroCrown primary identity wallet proof. This is an off-chain message signature only. It does not authorize a transaction, token approval, payment, transfer, contract interaction or gas expenditure.";
  if (network === "ethereum") {
    return [
      domain + " wants you to sign in with your Ethereum account:",
      address,
      "",
      statement,
      "",
      "URI: " + uri,
      "Version: 1",
      "Chain ID: 1",
      "Nonce: " + nonce,
      "Issued At: " + issuedAt,
      "Expiration Time: " + expiresAt,
      "Request ID: " + challengeId,
      "Resources:",
      "- urn:astrocrown:account:network:ethereum-mainnet",
      "- urn:astrocrown:account:purpose:" + purpose,
    ].join("\n");
  }
  return [
    "AstroCrown primary identity wallet proof",
    "Domain: " + domain,
    "URI: " + uri,
    "Address: " + address,
    "Network: " + network + ":mainnet",
    "Purpose: " + purpose,
    "Nonce: " + nonce,
    "Issued At: " + issuedAt,
    "Expiration Time: " + expiresAt,
    "Request ID: " + challengeId,
    "",
    statement,
  ].join("\n");
}
function validateIntentPayload(payload, intent) {
  const allowed = intent === "register"
    ? ["intent", "network", "address", "termsAccepted", "termsVersion", "referralId"]
    : ["intent", "network", "address"];
  if (Object.keys(payload).some((key) => !allowed.includes(key)) ||
      payload.intent !== intent || typeof payload.network !== "string" || !NETWORKS.has(payload.network)) {
    throw fail(400, "The primary-wallet challenge request is invalid.");
  }
  if (intent === "register") {
    if (payload.termsAccepted !== true || payload.termsVersion !== TERMS_VERSION) {
      throw fail(400, "Accept the current AstroCrown Terms of Use and Privacy Policy before creating an account.");
    }
    const referral = payload.referralId == null ? "" : String(payload.referralId).trim();
    if (referral && !/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(referral)) {
      throw fail(400, "Enter a valid Referral ID or leave the field blank.");
    }
    return referral;
  }
  return "";
}
function sessionCookie(token, origin) {
  const secure = new URL(origin).protocol === "https:" ? "; Secure" : "";
  return SESSION_COOKIE + "=" + token + "; Path=/; Max-Age=" + SESSION_SECONDS +
    "; HttpOnly; SameSite=Strict" + secure;
}
async function issueChallenge(db, env, request, payload, config, intent) {
  const referral = validateIntentPayload(payload, intent);
  await rateLimit(db, env, request, "primary-wallet-" + intent + "-challenge", payload.address || "missing", 12, 3600);
  const normalized = await normalizeWalletAddress(payload.network, payload.address);
  let accountId = null;
  if (intent === "register") {
    const existing = await db.prepare(
      "SELECT 1 AS present FROM auth_primary_wallets WHERE network=? AND address_normalized=? AND active=1 LIMIT 1"
    ).bind(payload.network, normalized.normalized).first();
    if (existing) throw fail(409, "This wallet already has an AstroCrown primary identity. Sign in with that wallet instead.");
  } else {
    const existing = await db.prepare(
      "SELECT w.account_id,a.role FROM auth_primary_wallets w JOIN auth_accounts a ON a.account_id=w.account_id " +
      "WHERE w.network=? AND w.address_normalized=? AND w.active=1 LIMIT 1"
    ).bind(payload.network, normalized.normalized).first();
    if (!existing || existing.role !== "user") {
      throw fail(404, "No active AstroCrown account is registered to this wallet on the selected network.");
    }
    accountId = existing.account_id;
  }
  const now = Math.floor(Date.now() / 1000);
  const expires = now + CHALLENGE_SECONDS;
  const challengeId = "wac_" + base64url(randomBytes(18));
  const nonce = hex(randomBytes(18));
  const issuedAt = new Date(now * 1000).toISOString();
  const expiresAt = new Date(expires * 1000).toISOString();
  const message = createPrimaryWalletMessage({
    origin: config.origin,
    network: payload.network,
    address: normalized.address,
    intent,
    challengeId,
    nonce,
    issuedAt,
    expiresAt,
  });
  await db.prepare(
    "DELETE FROM auth_wallet_challenges WHERE expires_at<=? OR (used_at IS NOT NULL AND created_at<?)"
  ).bind(now, now - 86400).run();
  await db.prepare(
    "INSERT INTO auth_wallet_challenges(challenge_id,intent,account_id,network,address,address_normalized,nonce_digest," +
    "domain,message_digest,message,terms_version,referral_id,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
  ).bind(
    challengeId, intent, accountId, payload.network, normalized.address, normalized.normalized,
    await digest(nonce), new URL(config.origin).host, await digest(message), message,
    intent === "register" ? TERMS_VERSION : null, referral, now, expires
  ).run();
  return json(200, {
    challengeId,
    intent,
    network: payload.network,
    address: normalized.address,
    message,
    issuedAt,
    expiresAt,
    expiresInSeconds: CHALLENGE_SECONDS,
    signatureMethod: proofMethod(payload.network),
    transactionAuthorized: false,
    notice: "This signature proves control of your primary wallet only. It is not a blockchain transaction and cannot spend, approve, transfer or pay gas.",
  });
}
async function consumeChallenge(db, challengeId, intent, config) {
  if (typeof challengeId !== "string" || !/^wac_[A-Za-z0-9_-]{20,40}$/.test(challengeId)) {
    throw fail(400, "The primary-wallet challenge reference is invalid.");
  }
  const now = Math.floor(Date.now() / 1000);
  const marker = String(now) + "." + base64url(randomBytes(12));
  const consumed = await db.prepare(
    "UPDATE auth_wallet_challenges SET used_at=? WHERE challenge_id=? AND intent=? AND used_at IS NULL AND expires_at>?"
  ).bind(marker, challengeId, intent, now).run();
  if (Number(consumed.meta?.changes || 0) !== 1) {
    throw fail(410, "This primary-wallet challenge has expired or has already been used. Start again.");
  }
  const challenge = await db.prepare("SELECT * FROM auth_wallet_challenges WHERE challenge_id=?")
    .bind(challengeId).first();
  if (!challenge || challenge.intent !== intent || challenge.expires_at <= now ||
      challenge.domain !== new URL(config.origin).host ||
      challenge.message_digest !== await digest(challenge.message)) {
    throw fail(409, "The wallet challenge failed its origin, expiry or message-integrity check.");
  }
  const nonceMatch = challenge.message.match(/^Nonce: ([A-Za-z0-9_-]{20,})$/m);
  if (!nonceMatch || challenge.nonce_digest !== await digest(nonceMatch[1])) {
    throw fail(409, "The wallet challenge nonce failed its integrity check.");
  }
  return challenge;
}
async function createSession(db, accountId, now) {
  const token = base64url(randomBytes(32));
  const tokenHash = await digest(token);
  const expires = now + SESSION_SECONDS;
  const result = await db.prepare(
    "INSERT INTO auth_sessions(token_hash,account_id,created_at,expires_at) VALUES(?,?,?,?)"
  ).bind(tokenHash, accountId, now, expires).run();
  if (Number(result.meta?.changes || 0) !== 1) throw fail(503, "The primary-wallet session could not be created.");
  return { token, expires };
}
async function verifyRegistration(db, env, request, payload, config) {
  if (Object.keys(payload).some((key) => !["intent", "challengeId", "signature"].includes(key)) ||
      payload.intent !== "register" || typeof payload.signature !== "string" || payload.signature.length > 512) {
    throw fail(400, "The primary-wallet registration proof is invalid.");
  }
  await rateLimit(db, env, request, "primary-wallet-register-verify", payload.challengeId || "missing", 8, 3600);
  const challenge = await consumeChallenge(db, payload.challengeId, "register", config);
  if (challenge.terms_version !== TERMS_VERSION) throw fail(409, "The Terms version attached to this registration is no longer current.");
  if (!(await verifyWalletSignature(challenge, payload.signature))) {
    throw fail(401, "The signature did not prove control of the primary wallet address.");
  }
  const duplicate = await db.prepare(
    "SELECT 1 AS present FROM auth_primary_wallets WHERE network=? AND address_normalized=? AND active=1 LIMIT 1"
  ).bind(challenge.network, challenge.address_normalized).first();
  if (duplicate) throw fail(409, "This wallet was registered by another completed request. Sign in with it instead.");
  const now = Math.floor(Date.now() / 1000);
  const accountId = "acc_" + base64url(randomBytes(18));
  const identifier = "AC-" + hex(randomBytes(5)).toUpperCase();
  const memberName = createDefaultMemberName(identifier);
  const walletId = hex(randomBytes(16));
  const token = base64url(randomBytes(32));
  const tokenHash = await digest(token);
  const expires = now + SESSION_SECONDS;
  const created = new Date(now * 1000).toISOString();
  const marker = challenge.used_at;
  let results;
  try {
    results = await db.batch([
      db.prepare(
        "INSERT INTO auth_accounts(account_id,account_identifier,user_handle,member_name,member_name_normalized,created_at,avatar_id,referral_id,terms_version,terms_accepted_at,role) " +
        "VALUES(?,?,?,?,?,?,'person',?,?,?,'user')"
      ).bind(accountId, identifier, accountId, memberName, memberName.toLowerCase(), created, challenge.referral_id || "", TERMS_VERSION, created),
      db.prepare(
        "INSERT INTO auth_primary_wallets(wallet_id,account_id,network,address,address_normalized,proof_method,linked_at,active) " +
        "SELECT ?,?,?,?,?,?,?,1 WHERE EXISTS(SELECT 1 FROM auth_wallet_challenges WHERE challenge_id=? AND used_at=?)"
      ).bind(walletId, accountId, challenge.network, challenge.address, challenge.address_normalized,
        proofMethod(challenge.network), now, challenge.challenge_id, marker),
      db.prepare(
        "INSERT INTO auth_sessions(token_hash,account_id,created_at,expires_at) " +
        "SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM auth_primary_wallets WHERE account_id=? AND active=1)"
      ).bind(tokenHash, accountId, now, expires, accountId),
      db.prepare(
        "INSERT INTO auth_security_audit(audit_id,account_id,event_type,created_at,detail) " +
        "SELECT ?,?,'account_created_with_primary_wallet',?,? WHERE EXISTS(SELECT 1 FROM auth_sessions WHERE token_hash=?)"
      ).bind(hex(randomBytes(16)), accountId, created,
        "network=" + challenge.network + ";proof_method=" + proofMethod(challenge.network), tokenHash),
    ]);
  } catch (error) {
    throw fail(409, "The account could not be created because the wallet or account identifier is already in use. Start again.");
  }
  if (!Array.isArray(results) || results.length !== 4 ||
      results.some((item) => Number(item?.meta?.changes || 0) !== 1)) {
    throw fail(409, "The primary-wallet account registration did not commit every required record exactly once.");
  }
  return json(200, {
    authenticated: true,
    intent: "register",
    authMethod: "primary-wallet",
    accountIdentifier: identifier,
    memberName,
    primaryWallet: { network: challenge.network, address: challenge.address, proofMethod: proofMethod(challenge.network) },
    sessionExpiresAt: new Date(expires * 1000).toISOString(),
    transactionAuthorized: false,
  }, { "Set-Cookie": sessionCookie(token, config.origin) });
}
async function verifyLogin(db, env, request, payload, config) {
  if (Object.keys(payload).some((key) => !["intent", "challengeId", "signature"].includes(key)) ||
      payload.intent !== "login" || typeof payload.signature !== "string" || payload.signature.length > 512) {
    throw fail(400, "The primary-wallet sign-in proof is invalid.");
  }
  await rateLimit(db, env, request, "primary-wallet-login-verify", payload.challengeId || "missing", 10, 300);
  const challenge = await consumeChallenge(db, payload.challengeId, "login", config);
  if (!(await verifyWalletSignature(challenge, payload.signature))) {
    throw fail(401, "The signature did not prove control of the primary wallet address.");
  }
  const owner = await db.prepare(
    "SELECT w.account_id,w.network,w.address,w.address_normalized,a.account_identifier,a.role " +
    "FROM auth_primary_wallets w JOIN auth_accounts a ON a.account_id=w.account_id " +
    "WHERE w.network=? AND w.address_normalized=? AND w.active=1 AND a.account_id=? LIMIT 1"
  ).bind(challenge.network, challenge.address_normalized, challenge.account_id).first();
  if (!owner || owner.role !== "user") throw fail(404, "The primary wallet is no longer linked to an active AstroCrown account.");
  const now = Math.floor(Date.now() / 1000);
  const session = await createSession(db, owner.account_id, now);
  await db.prepare(
    "INSERT INTO auth_security_audit(audit_id,account_id,event_type,created_at,detail) VALUES(?,?,'primary_wallet_signed_in',?,?)"
  ).bind(hex(randomBytes(16)), owner.account_id, new Date(now * 1000).toISOString(),
    "network=" + owner.network + ";proof_method=" + proofMethod(owner.network)).run();
  return json(200, {
    authenticated: true,
    intent: "login",
    authMethod: "primary-wallet",
    accountIdentifier: owner.account_identifier,
    primaryWallet: { network: owner.network, address: owner.address, proofMethod: proofMethod(owner.network) },
    sessionExpiresAt: new Date(session.expires * 1000).toISOString(),
    transactionAuthorized: false,
  }, { "Set-Cookie": sessionCookie(session.token, config.origin) });
}
export function isLoopbackDevelopmentOrigin(origin) {
  try {
    const url = new URL(origin);
    return ["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}
export function isQualifiedAccountRuntime(env, config, request) {
  if (!env || !config || typeof config.origin !== "string" || !request?.url) return false;
  let configured;
  let incoming;
  try {
    configured = new URL(config.origin);
    incoming = new URL(request.url);
  } catch {
    return false;
  }
  if (configured.origin !== config.origin || incoming.origin !== configured.origin) return false;
  const local = env.ENVIRONMENT === "local" && isLoopbackDevelopmentOrigin(configured.origin);
  const staging = env.ENVIRONMENT === "staging" && configured.protocol === "https:" &&
    typeof env.RATE_LIMIT_HMAC_KEY === "string" && env.RATE_LIMIT_HMAC_KEY.length >= 32;
  return local || staging;
}
function assertWalletAuthEnvironment(env, config, request) {
  if (!isQualifiedAccountRuntime(env, config, request)) {
    throw fail(404, "Primary-wallet account authentication is not enabled for this environment or origin.");
  }
}
export async function issuePrimaryWalletChallenge(db, env, request, payload, config) {
  assertWalletAuthEnvironment(env, config, request);
  if (!payload || !["register", "login"].includes(payload.intent)) {
    throw fail(400, "Choose primary-wallet registration or sign-in.");
  }
  if (!db) throw fail(503, "The account database is not bound.");
  return issueChallenge(db, env, request, payload, config, payload.intent);
}
export async function verifyPrimaryWalletChallenge(db, env, request, payload, config) {
  assertWalletAuthEnvironment(env, config, request);
  if (!db) throw fail(503, "The account database is not bound.");
  if (payload?.intent === "register") return verifyRegistration(db, env, request, payload, config);
  if (payload?.intent === "login") return verifyLogin(db, env, request, payload, config);
  throw fail(400, "Choose primary-wallet registration or sign-in.");
}
