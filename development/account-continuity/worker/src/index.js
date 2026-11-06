import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  getDefaultSupportedAlgorithmIDs,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { decodeCredentialPublicKey } from "@simplewebauthn/server/helpers";
import { getAddress, isAddress, recoverMessageAddress } from "viem";

const SESSION_COOKIE = "acrown_account_session";
const SESSION_SECONDS = 1800;
const CHALLENGE_SECONDS = 300;
const MAX_BODY_BYTES = 65536;
const TERMS_VERSION = "development-terms-2026-10-31-v0.3";
const AVATARS = ["person", "crown", "star", "moon", "orbit", "shield"];
const PQ_ALGS = [-48, -49, -50];
const ADMIN_PERMISSION_NAMES = ["admin.roles.grant", "admin.roles.revoke"];

function secureHeaders(headers = new Headers()) {
  const h = new Headers(headers);
  h.set("X-Content-Type-Options", "nosniff");
  h.set("Referrer-Policy", "no-referrer");
  h.set("X-Frame-Options", "DENY");
  h.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  h.set("Cross-Origin-Resource-Policy", "same-origin");
  h.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  return h;
}
function json(status, data, headers = {}) {
  const h = secureHeaders(headers);
  h.set("Content-Type", "application/json; charset=utf-8");
  h.set("Cache-Control", "no-store, max-age=0");
  return new Response(JSON.stringify(data), { status, headers: h });
}
function fail(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}
function bytes(n) {
  return crypto.getRandomValues(new Uint8Array(n));
}
function b64u(data) {
  let binary = "";
  for (const item of data) binary += String.fromCharCode(item);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function unb64u(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("Invalid base64url.");
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}
function hex(data) {
  return Array.from(data, (item) => item.toString(16).padStart(2, "0")).join("");
}
async function digest(data) {
  return b64u(new Uint8Array(await crypto.subtle.digest("SHA-256", data)));
}
async function hashText(value) {
  return digest(new TextEncoder().encode(value));
}
async function hmac(secret, value) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64u(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))));
}
function equalConstantTime(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  let diff = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i += 1) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}
function accountId(value) {
  if (typeof value !== "string") throw fail(400, "Enter the AstroCrown account identifier shown after registration.");
  const candidate = value.trim().toUpperCase();
  if (!/^AC-[A-F0-9]{10}$/.test(candidate)) throw fail(400, "Enter the AstroCrown account identifier shown after registration.");
  return candidate;
}
function recoveryKey(value) {
  if (typeof value !== "string" || !/^ACR1-[A-Za-z0-9_-]{43}$/.test(value.trim())) throw fail(401, "Account recovery could not be started. Check the account identifier and recovery key.");
  return value.trim();
}
function cookie(request, name) {
  const all = request.headers.get("Cookie") || "";
  for (const part of all.split(";")) {
    const i = part.indexOf("=");
    if (i >= 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}
function sessionCookie(token, url) {
  return SESSION_COOKIE + "=" + token + "; Path=/; Max-Age=" + SESSION_SECONDS + "; HttpOnly; SameSite=Strict" + (url.protocol === "https:" ? "; Secure" : "");
}
function clearCookie(url) {
  return SESSION_COOKIE + "=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict" + (url.protocol === "https:" ? "; Secure" : "");
}
async function bodyJson(request) {
  const type = (request.headers.get("Content-Type") || "").split(";")[0].trim().toLowerCase();
  if (type !== "application/json") throw fail(415, "This endpoint accepts JSON requests only.");
  if (Number(request.headers.get("Content-Length") || 0) > MAX_BODY_BYTES) throw fail(413, "The request is too large.");
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) throw fail(413, "The request is too large.");
  try {
    const value = JSON.parse(text);
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected object");
    return value;
  } catch {
    throw fail(400, "Enter a valid JSON request.");
  }
}
function configuration(env, request) {
  if (!env.DB) throw fail(503, "The staging database is not bound.");
  if (!["local", "staging"].includes(env.ENVIRONMENT)) throw fail(503, "The account environment is not configured.");
  const rpId = String(env.RP_ID || "");
  const origin = String(env.EXPECTED_ORIGIN || "");
  if (!rpId || !origin || /SET_BEFORE_DEPLOY|example\.invalid|REPLACE/i.test(rpId + origin)) throw fail(503, "The WebAuthn host configuration is incomplete.");
  let parsed;
  try { parsed = new URL(origin); } catch { throw fail(503, "The WebAuthn origin is invalid."); }
  if (
    parsed.origin !== origin || parsed.hostname !== rpId || parsed.username || parsed.password ||
    parsed.pathname !== "/" || parsed.search || parsed.hash ||
    (env.ENVIRONMENT === "staging" && parsed.protocol !== "https:") ||
    (env.ENVIRONMENT === "local" && parsed.protocol === "http:" && !["localhost", "127.0.0.1"].includes(rpId))
  ) throw fail(503, "The WebAuthn RP ID and origin do not match an approved exact host.");
  if (new URL(request.url).origin !== origin) throw fail(403, "The request host is not the configured account origin.");
  return { rpId, origin, rpName: String(env.RP_NAME || "AstroCrown"), localDiagnostics: env.ENVIRONMENT === "local" };
}
function gate(request, env) {
  if (env.ENVIRONMENT !== "staging") return null;
  if (!env.STAGING_ACCESS_CODE) return json(503, { error: "The staging access gate is not configured. Access is closed." });
  const header = request.headers.get("Authorization") || "";
  if (!header.startsWith("Basic ")) {
    return new Response("AstroCrown staging access is restricted.", {
      status: 401,
      headers: secureHeaders({ "WWW-Authenticate": 'Basic realm="AstroCrown staging", charset="UTF-8"', "Cache-Control": "no-store" }),
    });
  }
  let presented = "";
  try { presented = atob(header.slice(6)); } catch { presented = ""; }
  if (!equalConstantTime(presented, "staging:" + env.STAGING_ACCESS_CODE)) {
    return new Response("AstroCrown staging access was not accepted.", {
      status: 401,
      headers: secureHeaders({ "WWW-Authenticate": 'Basic realm="AstroCrown staging", charset="UTF-8"', "Cache-Control": "no-store" }),
    });
  }
  return null;
}
function checkOrigin(request, config) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    if (request.headers.get("Origin") !== config.origin) throw fail(403, "The request origin could not be verified.");
    if ((request.headers.get("Sec-Fetch-Site") || "").toLowerCase() === "cross-site") throw fail(403, "Cross-site account requests are not enabled.");
  }
}
async function rateLimit(db, env, request, action, subject, maximum, seconds) {
  const secret = env.RATE_LIMIT_HMAC_KEY || (env.ENVIRONMENT === "local" ? "local-development-only-not-for-staging" : "");
  if (!secret) throw fail(503, "The staging rate-limit key is not configured.");
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const subjectHash = await hmac(secret, action + "\0" + subject + "\0" + ip);
  const now = Math.floor(Date.now() / 1000);
  const result = await db.prepare(
    "INSERT INTO auth_rate_events(event_id, action, subject_hash, created_at) " +
    "SELECT ?, ?, ?, ? WHERE (SELECT COUNT(*) FROM auth_rate_events WHERE action = ? AND subject_hash = ? AND created_at >= ?) < ?"
  ).bind(b64u(bytes(16)), action, subjectHash, now, action, subjectHash, now - seconds, maximum).run();
  if (Number(result.meta?.changes || 0) !== 1) throw fail(429, "Too many attempts. Please try again later.");
}
async function createChallenge(db, item) {
  await db.prepare(
    "INSERT INTO auth_challenges(challenge_id, challenge, ceremony, account_id, account_identifier, user_handle, payload_json, created_at, expires_at) " +
    "VALUES(?,?,?,?,?,?,?,?,?)"
  ).bind(
    item.id, item.challenge, item.ceremony, item.accountId || null, item.accountIdentifier || null,
    item.userHandle || null, JSON.stringify(item.payload || {}), item.now, item.now + CHALLENGE_SECONDS
  ).run();
}
async function activeAccount(db, request) {
  const token = cookie(request, SESSION_COOKIE);
  if (!token) return null;
  const tokenHash = await hashText(token);
  const now = Math.floor(Date.now() / 1000);
  const row = await db.prepare(
    "SELECT a.*, s.expires_at, s.admin_wallet_address, s.admin_authenticated_at, s.admin_expires_at " +
    "FROM auth_sessions s JOIN auth_accounts a ON a.account_id = s.account_id WHERE s.token_hash = ? AND s.expires_at > ?"
  ).bind(tokenHash, now).first();
  if (!row) await db.prepare("DELETE FROM auth_sessions WHERE token_hash = ?").bind(tokenHash).run();
  return row || null;
}
async function summary(db, account) {
  const now = Math.floor(Date.now() / 1000);
  const [counts, algorithmRows, role, permissions, wallets, walletHistory, notice] = await Promise.all([
    db.prepare(
      "SELECT " +
      "(SELECT COUNT(*) FROM auth_passkeys WHERE account_id = ? AND active = 1) AS passkey_count, " +
      "(SELECT COUNT(*) FROM auth_passkeys WHERE account_id = ? AND active = 1 AND credential_alg IN (-48,-49,-50)) AS pq_count, " +
      "(SELECT COUNT(*) FROM auth_recovery_keys WHERE account_id = ? AND used_at IS NULL) AS recovery_count, " +
      "(SELECT COUNT(*) FROM auth_sessions WHERE account_id = ? AND expires_at > ?) AS session_count"
    ).bind(account.account_id, account.account_id, account.account_id, account.account_id, now).first(),
    db.prepare(
      "SELECT credential_alg FROM auth_passkeys WHERE account_id = ? AND active = 1 ORDER BY created_at, credential_id"
    ).bind(account.account_id).all(),
    db.prepare(
      "SELECT granted_by_account_id,reason,created_at FROM auth_admin_roles WHERE account_id = ?"
    ).bind(account.account_id).first(),
    db.prepare(
      "SELECT permission,can_delegate FROM auth_admin_permissions WHERE account_id = ? ORDER BY permission"
    ).bind(account.account_id).all(),
    db.prepare(
      "SELECT address,chain_id FROM auth_admin_wallets WHERE account_id = ? AND active = 1 ORDER BY created_at,address"
    ).bind(account.account_id).all(),
    db.prepare(
      "SELECT COUNT(*) AS history_count FROM auth_admin_wallets WHERE account_id = ?"
    ).bind(account.account_id).first(),
    db.prepare(
      "SELECT notice_id,reason,created_at FROM auth_admin_revocation_notices " +
      "WHERE account_id = ? AND acknowledged_at IS NULL ORDER BY created_at DESC,notice_id DESC LIMIT 1"
    ).bind(account.account_id).first(),
  ]);
  const passkeyAlgorithmIds = (algorithmRows.results || []).map((row) => Number(row.credential_alg));
  const activeWallets = wallets.results || [];
  const currentWallet = String(account.admin_wallet_address || "");
  const matchedWallet = activeWallets.find((wallet) =>
    currentWallet && equalConstantTime(String(wallet.address || "").toLowerCase(), currentWallet.toLowerCase())
  );
  const roleAssigned = Boolean(role);
  const adminWalletHistoryCount = Number(walletHistory?.history_count || 0);
  const adminWalletRecoveryRequired = Boolean(
    roleAssigned && activeWallets.length === 0 && adminWalletHistoryCount > 0
  );
  const adminWalletAuthenticated = Boolean(
    roleAssigned && matchedWallet &&
    Number(account.admin_authenticated_at || 0) > 0 &&
    Number(account.admin_authenticated_at || 0) <= now &&
    Number(account.admin_expires_at || 0) > now &&
    Number(account.admin_expires_at || 0) <= Number(account.expires_at || 0) &&
    Number(account.admin_expires_at || 0) <= Number(account.admin_authenticated_at || 0) + 600
  );
  const adminPermissions = (permissions.results || []).map((row) => row.permission);
  const adminDelegablePermissions = (permissions.results || [])
    .filter((row) => Number(row.can_delegate) === 1)
    .map((row) => row.permission);
  return {
    authenticated: true,
    email: null,
    accountIdentifier: account.account_identifier,
    authMethod: "webauthn",
    passkeyCount: Number(counts.passkey_count || 0),
    postQuantumPasskeyCount: Number(counts.pq_count || 0),
    passkeyAlgorithmIds,
    mlDsaRegistrationAvailable: getDefaultSupportedAlgorithmIDs().map(Number).includes(-48),
    recoveryKeyAvailable: Number(counts.recovery_count || 0) > 0,
    createdAt: account.created_at,
    avatarId: account.avatar_id || "person",
    referralId: account.referral_id || "",
    newsletterOptIn: false,
    newsletterConsentAt: null,
    termsAccepted: Boolean(account.terms_accepted_at),
    termsVersion: account.terms_version,
    termsAcceptedAt: account.terms_accepted_at,
    emailVerified: false,
    emailVerificationDeliveryAvailable: false,
    passwordResetAvailable: false,
    sessionExpiresAt: new Date(Number(account.expires_at) * 1000).toISOString(),
    activeSessionCount: Number(counts.session_count || 0),
    securityManagementAvailable: true,
    scope: "staging-test-account-only",
    role: roleAssigned ? "admin" : "user",
    adminRoleAssigned: roleAssigned,
    adminPermissions,
    adminDelegablePermissions,
    adminWalletCount: activeWallets.length,
    adminWalletEverEnrolled: adminWalletHistoryCount > 0,
    adminWalletRecoveryRequired,
    adminWalletAuthenticated,
    adminSessionAuthorized: adminWalletAuthenticated,
    admin: adminWalletAuthenticated,
    adminWalletAddress: adminWalletAuthenticated ? matchedWallet.address : null,
    adminSessionExpiresAt: adminWalletAuthenticated
      ? new Date(Number(account.admin_expires_at) * 1000).toISOString()
      : null,
    administratorRevocationNotice: notice ? {
      noticeId: notice.notice_id,
      reason: notice.reason,
      createdAt: notice.created_at,
    } : null,
    communicationsUnreadCounts: { alerts: 0, messages: 0 },
  };
}

function validateAdminReason(value) {
  if (typeof value !== "string") throw fail(400, "Enter a reason for the administrator change.");
  const reason = value.normalize("NFKC").replace(/[\u0000-\u001F\u007F]/g, "").trim();
  if (!reason || reason.length > 500) {
    throw fail(400, "The administrator change reason must contain between 1 and 500 characters.");
  }
  return reason;
}
function validateAdminPermissions(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > ADMIN_PERMISSION_NAMES.length) {
    throw fail(400, "The permission list must contain recognized permission names only.");
  }
  if (value.some((item) => typeof item !== "string" || !ADMIN_PERMISSION_NAMES.includes(item))) {
    throw fail(400, "One or more administrator permissions are not recognized.");
  }
  if (new Set(value).size !== value.length) {
    throw fail(400, "An administrator permission may appear only once.");
  }
  return [...value].sort();
}
const ADMIN_PERMISSION_HOLDER_SQL =
  "SELECT p.can_delegate,s.admin_wallet_address,s.admin_expires_at " +
  "FROM auth_sessions s " +
  "JOIN auth_admin_roles r ON r.account_id = s.account_id " +
  "JOIN auth_admin_permissions p ON p.account_id = r.account_id " +
  "JOIN auth_admin_wallets w ON w.account_id = r.account_id " +
  "WHERE s.token_hash = ? AND s.account_id = ? AND s.expires_at > ? " +
  "AND s.admin_expires_at > ? AND s.admin_authenticated_at > 0 AND s.admin_authenticated_at <= ? AND s.admin_expires_at <= s.expires_at AND s.admin_expires_at <= s.admin_authenticated_at + 600 AND s.admin_wallet_address = w.address COLLATE NOCASE " +
  "AND w.active = 1 AND p.permission = ? LIMIT 1";
async function requireAdminPermission(db, account, request, permission) {
  if (!ADMIN_PERMISSION_NAMES.includes(permission)) throw fail(403, "The requested administrator permission is not recognized.");
  const token = cookie(request, SESSION_COOKIE);
  if (!token) throw fail(401, "Sign in before using administrator services.");
  const tokenHash = await hashText(token);
  const now = Math.floor(Date.now() / 1000);
  const holder = await db.prepare(ADMIN_PERMISSION_HOLDER_SQL)
    .bind(tokenHash, account.account_id, now, now, now, permission).first();
  if (!holder) {
    throw fail(403, "This action requires the separately granted administrator permission and a current wallet-verified administrator session.");
  }
  return { tokenHash, accountId: account.account_id, now, walletAddress: holder.admin_wallet_address };
}
function adminHolderGuardParams(context, permission) {
  return [context.tokenHash, context.accountId, context.now, context.now, context.now, permission];
}


function normalizeEvmAddress(value) {
  if (typeof value !== "string" || !/^0x[0-9a-f]{40}$/i.test(value) || !isAddress(value, { strict: false })) {
    throw fail(400, "Enter a valid 20-byte EVM wallet address.");
  }
  try {
    return getAddress(value);
  } catch {
    throw fail(400, "The EVM wallet address checksum is invalid.");
  }
}
function validateEvmChainId(value) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw fail(400, "Enter a valid positive EVM chain ID.");
  }
  return value;
}
function createAdminSiweMessage(config, address, chainId, challengeId, nonce, issuedAt, expiresAt, purpose) {
  const origin = new URL(config.origin);
  const statement = purpose === "admin-session-step-up"
    ? "AstroCrown administrator session verification. This signature authorizes only a temporary administrator session and does not authorize a transaction."
    : "AstroCrown administrator wallet enrollment. This signature proves control of the proposed address only and does not authorize a transaction.";
  return [
    origin.protocol.replace(/:$/, "") + "://" + origin.host + " wants you to sign in with your Ethereum account:",
    address,
    "",
    statement,
    "",
    "URI: " + config.origin,
    "Version: 1",
    "Chain ID: " + String(chainId),
    "Nonce: " + nonce,
    "Issued At: " + issuedAt,
    "Expiration Time: " + expiresAt,
    "Request ID: " + challengeId,
  ].join("\n");
}
async function verifyAdminSiweSignature(message, signature, expectedAddress) {
  if (typeof message !== "string" || !message || message.length > 8192 ||
      typeof signature !== "string" || !/^0x[0-9a-f]{130}$/i.test(signature)) {
    throw fail(401, "The administrator wallet signature is invalid.");
  }
  let recovered;
  try {
    recovered = normalizeEvmAddress(await recoverMessageAddress({ message, signature }));
  } catch {
    throw fail(401, "The administrator wallet signature could not be verified.");
  }
  if (recovered.toLowerCase() !== expectedAddress.toLowerCase()) {
    throw fail(401, "The signature was not produced by the proposed administrator wallet.");
  }
  return recovered;
}
async function requireAdminAccountRole(db, account) {
  const role = await db.prepare(
    "SELECT account_id FROM auth_admin_roles WHERE account_id = ?"
  ).bind(account.account_id).first();
  if (!role) throw fail(403, "Administrator authority has not been assigned to this account.");
}
async function requireFreshAdminWalletSession(db, account, request) {
  const state = await summary(db, account);
  if (state.adminRoleAssigned !== true) throw fail(403, "Administrator authority has not been assigned to this account.");
  if (state.adminSessionAuthorized !== true) {
    throw fail(403, "A fresh signature from an active enrolled administrator wallet is required.");
  }
  const token = cookie(request, SESSION_COOKIE);
  if (!token) throw fail(401, "The ordinary account session is no longer active.");
  return {
    tokenHash: await hashText(token),
    walletAddress: state.adminWalletAddress,
    now: Math.floor(Date.now() / 1000),
  };
}
async function adminWalletOptions(db, request) {
  const account = await activeAccount(db, request);
  if (!account) throw fail(401, "Sign in before reviewing administrator wallets.");
  await requireAdminAccountRole(db, account);
  const [wallets, state] = await Promise.all([
    db.prepare(
      "SELECT address,chain_id,created_at FROM auth_admin_wallets " +
      "WHERE account_id = ? AND active = 1 ORDER BY created_at,address"
    ).bind(account.account_id).all(),
    summary(db, account),
  ]);
  return json(200, {
    wallets: (wallets.results || []).map(row => ({
      address: row.address,
      chainId: Number(row.chain_id),
      createdAt: row.created_at,
    })),
    maxWallets: 3,
    requiresFreshSignature: true,
    adminSessionAuthorized: state.adminSessionAuthorized === true,
    transactionAuthorized: false,
    walletFamily: "evm-eoa",
  });
}
async function issueAdminWalletEnrollmentChallenge(db, env, request, payload, config) {
  if (Object.keys(payload).length !== 2 ||
      !Object.prototype.hasOwnProperty.call(payload, "address") ||
      !Object.prototype.hasOwnProperty.call(payload, "chainId")) {
    throw fail(400, "Only the proposed EVM wallet address and chain ID are accepted.");
  }
  const account = await activeAccount(db, request);
  if (!account) throw fail(401, "Sign in before enrolling an administrator wallet.");
  await requireAdminAccountRole(db, account);
  await rateLimit(db, env, request, "admin-wallet-enrollment-options", account.account_id, 5, 300);
  const address = normalizeEvmAddress(payload.address);
  const chainId = validateEvmChainId(payload.chainId);
  const countRow = await db.prepare(
    "SELECT COUNT(*) AS history_count, " +
    "(SELECT COUNT(*) FROM auth_admin_wallets WHERE account_id = ? AND active = 1) AS active_count " +
    "FROM auth_admin_wallets WHERE account_id = ?"
  ).bind(account.account_id, account.account_id).first();
  const activeCount = Number(countRow?.active_count || 0);
  const historyCount = Number(countRow?.history_count || 0);
  if (activeCount >= 3) throw fail(409, "This administrator account already has three active wallets.");
  if (historyCount > 0 && activeCount === 0) {
    throw fail(409, "All previously enrolled administrator wallets are inactive. A separate owner-authorized recovery review is required; ordinary passkey sign-in cannot register a replacement wallet.");
  }
  const existing = await db.prepare(
    "SELECT account_id,active FROM auth_admin_wallets WHERE address = ? COLLATE NOCASE"
  ).bind(address).first();
  if (existing) {
    if (existing.account_id !== account.account_id) throw fail(409, "That wallet is already associated with another administrator account.");
    throw fail(409, "That wallet is already enrolled or was previously revoked. Use a different wallet address.");
  }
  let purpose = "initial-wallet-enrollment";
  let actorWalletAddress = null;
  if (historyCount > 0 && activeCount > 0) {
    const stepUp = await requireFreshAdminWalletSession(db, account, request);
    purpose = "wallet-enrollment";
    actorWalletAddress = stepUp.walletAddress;
  }
  const token = cookie(request, SESSION_COOKIE);
  if (!token) throw fail(401, "The ordinary account session is no longer active.");
  const sessionHash = await hashText(token);
  const now = Math.floor(Date.now() / 1000);
  const expires = now + CHALLENGE_SECONDS;
  const challengeId = b64u(bytes(24));
  const nonce = hex(bytes(16));
  const issuedAt = new Date(now * 1000).toISOString();
  const expiresAt = new Date(expires * 1000).toISOString();
  const message = createAdminSiweMessage(config, address, chainId, challengeId, nonce, issuedAt, expiresAt, purpose);
  await db.prepare(
    "DELETE FROM auth_admin_wallet_challenges WHERE expires_at <= ? OR (used_at IS NOT NULL AND created_at < ?)"
  ).bind(now, now - 86400).run();
  await db.prepare(
    "INSERT INTO auth_admin_wallet_challenges(challenge_id,account_id,session_token_hash,purpose,actor_wallet_address,address,chain_id,message,created_at,expires_at) " +
    "VALUES(?,?,?,?,?,?,?,?,?,?)"
  ).bind(challengeId, account.account_id, sessionHash, purpose, actorWalletAddress, address, chainId, message, now, expires).run();
  return json(200, {
    challengeId,
    message,
    expiresAt,
    address,
    chainId,
    purpose: "administrator-wallet-enrollment",
    enrollmentType: activeCount === 0 ? "initial" : "additional",
    transactionAuthorized: false,
  });
}
async function verifyAdminWalletEnrollment(db, env, request, payload) {
  if (Object.keys(payload).length !== 3 ||
      !Object.prototype.hasOwnProperty.call(payload, "challengeId") ||
      !Object.prototype.hasOwnProperty.call(payload, "message") ||
      !Object.prototype.hasOwnProperty.call(payload, "signature")) {
    throw fail(400, "Only the issued wallet challenge ID, exact message and signature are accepted.");
  }
  const account = await activeAccount(db, request);
  if (!account) throw fail(401, "Sign in before verifying administrator wallet enrollment.");
  await requireAdminAccountRole(db, account);
  await rateLimit(db, env, request, "admin-wallet-enrollment-verify", account.account_id, 8, 300);
  if (typeof payload.challengeId !== "string" || !/^[A-Za-z0-9_-]{24,64}$/.test(payload.challengeId)) {
    throw fail(400, "The administrator wallet challenge reference is invalid.");
  }
  const token = cookie(request, SESSION_COOKIE);
  if (!token) throw fail(401, "The ordinary account session is no longer active.");
  const sessionHash = await hashText(token);
  const now = Math.floor(Date.now() / 1000);
  const challenge = await db.prepare(
    "SELECT * FROM auth_admin_wallet_challenges WHERE challenge_id = ? AND account_id = ? " +
    "AND session_token_hash = ? AND purpose IN ('initial-wallet-enrollment','wallet-enrollment') " +
    "AND used_at IS NULL AND expires_at > ?"
  ).bind(payload.challengeId, account.account_id, sessionHash, now).first();
  if (!challenge) throw fail(401, "This administrator wallet challenge is missing, expired or already used.");
  if (typeof payload.message !== "string" || payload.message !== challenge.message) {
    throw fail(401, "The signed message does not exactly match the challenge issued for this account session.");
  }
  const address = normalizeEvmAddress(challenge.address);
  const currentCount = await db.prepare(
    "SELECT COUNT(*) AS history_count, " +
    "(SELECT COUNT(*) FROM auth_admin_wallets WHERE account_id = ? AND active = 1) AS active_count " +
    "FROM auth_admin_wallets WHERE account_id = ?"
  ).bind(account.account_id, account.account_id).first();
  if (challenge.purpose === "initial-wallet-enrollment") {
    if (Number(currentCount?.active_count || 0) !== 0 ||
        Number(currentCount?.history_count || 0) !== 0 ||
        challenge.actor_wallet_address !== null) {
      throw fail(409, "Initial administrator wallet enrollment is only available before any wallet has ever been registered. A separate owner-authorized recovery review is required.");
    }
  } else {
    const current = await requireFreshAdminWalletSession(db, account, request);
    if (!challenge.actor_wallet_address ||
        current.walletAddress.toLowerCase() !== String(challenge.actor_wallet_address).toLowerCase()) {
      throw fail(401, "The previously verified administrator wallet changed. Start enrollment again.");
    }
  }
  if (Number(currentCount?.active_count || 0) >= 3) {
    throw fail(409, "This administrator account already has three active wallets.");
  }
  const duplicate = await db.prepare(
    "SELECT 1 FROM auth_admin_wallets WHERE address = ? COLLATE NOCASE"
  ).bind(address).first();
  if (duplicate) throw fail(409, "That wallet address has already been registered or revoked.");

  // Consume the one-use SIWE challenge before signature verification. A bad
  // signature therefore cannot be retried against the same nonce/message.
  const marker = b64u(bytes(18));
  const challengeGuard =
    "UPDATE auth_admin_wallet_challenges SET used_at = ? " +
    "WHERE challenge_id = ? AND account_id = ? AND session_token_hash = ? " +
    "AND used_at IS NULL AND expires_at > ? AND message = ? " +
    "AND EXISTS(SELECT 1 FROM auth_sessions s WHERE s.token_hash = ? AND s.account_id = ? AND s.expires_at > ?) " +
    "AND EXISTS(SELECT 1 FROM auth_admin_roles r WHERE r.account_id = ?) " +
    "AND ((purpose = 'initial-wallet-enrollment' AND NOT EXISTS(" +
    "SELECT 1 FROM auth_admin_wallets w WHERE w.account_id = ?)) " +
    "OR (purpose = 'wallet-enrollment' AND actor_wallet_address IS NOT NULL AND EXISTS(" +
    "SELECT 1 FROM auth_sessions s JOIN auth_admin_wallets w ON w.account_id = s.account_id " +
    "WHERE s.token_hash = ? AND s.account_id = ? AND s.expires_at > ? AND s.admin_expires_at > ? " +
    "AND s.admin_authenticated_at > 0 AND s.admin_authenticated_at <= ? " +
    "AND s.admin_expires_at <= s.expires_at AND s.admin_expires_at <= s.admin_authenticated_at + 600 " +
    "AND s.admin_wallet_address = actor_wallet_address COLLATE NOCASE AND w.address = actor_wallet_address COLLATE NOCASE AND w.active = 1)))";
  const consumed = await db.prepare(challengeGuard).bind(
    marker, challenge.challenge_id, account.account_id, sessionHash, now, payload.message,
    sessionHash, account.account_id, now, account.account_id, account.account_id,
    sessionHash, account.account_id, now, now, now
  ).run();
  if (Number(consumed?.meta?.changes || 0) !== 1) {
    throw fail(409, "The wallet challenge or administrator session changed. Begin enrollment again.");
  }

  await verifyAdminSiweSignature(payload.message, payload.signature, address);
  const walletId = hex(bytes(16));
  const auditId = hex(bytes(16));
  const createdAt = new Date().toISOString();
  const statements = [
    db.prepare(
      "INSERT INTO auth_admin_wallets(wallet_id,account_id,address,chain_id,created_at,active,provisioning_source) " +
      "SELECT ?,?,?,?,?,1,'account-holder-siwe-enrollment' WHERE EXISTS(" +
      "SELECT 1 FROM auth_admin_wallet_challenges WHERE challenge_id = ? AND used_at = ?) " +
      "AND NOT EXISTS(SELECT 1 FROM auth_admin_wallets WHERE address = ? COLLATE NOCASE) " +
      "AND (SELECT COUNT(*) FROM auth_admin_wallets WHERE account_id = ? AND active = 1) < 3"
    ).bind(walletId, account.account_id, address, Number(challenge.chain_id), createdAt,
      challenge.challenge_id, marker, address, account.account_id),
    db.prepare(
      "UPDATE auth_sessions SET admin_wallet_address = NULL,admin_authenticated_at = NULL,admin_expires_at = NULL " +
      "WHERE account_id = ? AND EXISTS(SELECT 1 FROM auth_admin_wallets WHERE wallet_id = ? AND active = 1)"
    ).bind(account.account_id, walletId),
    db.prepare(
      "INSERT INTO auth_admin_wallet_audit(audit_id,event_type,account_id,wallet_id,address,chain_id,created_at,detail_json) " +
      "SELECT ?,'admin_wallet_enrolled',?,?,?,?,?,? WHERE EXISTS(" +
      "SELECT 1 FROM auth_admin_wallets WHERE wallet_id = ? AND account_id = ? AND active = 1)"
    ).bind(auditId, account.account_id, walletId, address, Number(challenge.chain_id), createdAt,
      JSON.stringify({ purpose: challenge.purpose, verification: "EIP-4361/EIP-191 EOA" }), walletId, account.account_id),
  ];
  const results = await db.batch(statements);
  if (Number(results?.[0]?.meta?.changes || 0) !== 1 ||
      Number(results?.[2]?.meta?.changes || 0) !== 1) {
    throw fail(409, "Wallet enrollment state changed during verification. Refresh and begin again.");
  }
  const refreshed = await activeAccount(db, new Request(request.url, {
    headers: { Cookie: SESSION_COOKIE + "=" + token },
  }));
  const result = await summary(db, refreshed);
  result.walletEnrolledAddress = address;
  result.transactionAuthorized = false;
  result.message = challenge.purpose === "initial-wallet-enrollment"
    ? "The first administrator wallet was enrolled. A separate fresh signature from this wallet is required to open the Administrator dashboard."
    : "The additional administrator wallet was enrolled. Re-verify an enrolled wallet before returning to administrator services.";
  return json(200, result);
}
async function issueAdminWalletChallenge(db, env, request, payload, config) {
  if (Object.keys(payload).length !== 2 ||
      !Object.prototype.hasOwnProperty.call(payload, "address") ||
      !Object.prototype.hasOwnProperty.call(payload, "chainId")) {
    throw fail(400, "Only a registered EVM wallet address and chain ID are accepted.");
  }
  const account = await activeAccount(db, request);
  if (!account) throw fail(401, "Sign in before verifying an administrator wallet.");
  await requireAdminAccountRole(db, account);
  await rateLimit(db, env, request, "admin-wallet-step-up-options", account.account_id, 5, 300);
  const address = normalizeEvmAddress(payload.address);
  const chainId = validateEvmChainId(payload.chainId);
  const wallet = await db.prepare(
    "SELECT address,chain_id FROM auth_admin_wallets WHERE account_id = ? " +
    "AND address = ? COLLATE NOCASE AND chain_id = ? AND active = 1"
  ).bind(account.account_id, address, chainId).first();
  if (!wallet) throw fail(403, "That wallet is not registered for this administrator account.");
  const token = cookie(request, SESSION_COOKIE);
  if (!token) throw fail(401, "The ordinary account session is no longer active.");
  const sessionHash = await hashText(token);
  const now = Math.floor(Date.now() / 1000);
  const expires = now + CHALLENGE_SECONDS;
  const challengeId = b64u(bytes(24));
  const nonce = hex(bytes(16));
  const issuedAt = new Date(now * 1000).toISOString();
  const expiresAt = new Date(expires * 1000).toISOString();
  const message = createAdminSiweMessage(
    config, address, chainId, challengeId, nonce, issuedAt, expiresAt, "admin-session-step-up"
  );
  await db.prepare(
    "DELETE FROM auth_admin_wallet_challenges WHERE expires_at <= ? OR (used_at IS NOT NULL AND created_at < ?)"
  ).bind(now, now - 86400).run();
  await db.prepare(
    "INSERT INTO auth_admin_wallet_challenges(challenge_id,account_id,session_token_hash,purpose,actor_wallet_address,address,chain_id,message,created_at,expires_at) " +
    "VALUES(?,?,?,'admin-session-step-up',NULL,?,?,?,?,?)"
  ).bind(challengeId, account.account_id, sessionHash, address, chainId, message, now, expires).run();
  return json(200, {
    challengeId, message, expiresAt, address, chainId,
    purpose: "administrator-session-step-up",
    transactionAuthorized: false,
  });
}
async function verifyAdminWalletChallenge(db, env, request, payload, config) {
  if (Object.keys(payload).length !== 3 ||
      !Object.prototype.hasOwnProperty.call(payload, "challengeId") ||
      !Object.prototype.hasOwnProperty.call(payload, "message") ||
      !Object.prototype.hasOwnProperty.call(payload, "signature")) {
    throw fail(400, "Only the issued administrator challenge ID, exact message and signature are accepted.");
  }
  const account = await activeAccount(db, request);
  if (!account) throw fail(401, "Sign in before verifying an administrator wallet.");
  await requireAdminAccountRole(db, account);
  await rateLimit(db, env, request, "admin-wallet-step-up-verify", account.account_id, 8, 300);
  if (typeof payload.challengeId !== "string" || !/^[A-Za-z0-9_-]{24,64}$/.test(payload.challengeId)) {
    throw fail(400, "The administrator wallet challenge reference is invalid.");
  }
  const token = cookie(request, SESSION_COOKIE);
  if (!token) throw fail(401, "The ordinary account session is no longer active.");
  const sessionHash = await hashText(token);
  const now = Math.floor(Date.now() / 1000);
  const challenge = await db.prepare(
    "SELECT * FROM auth_admin_wallet_challenges WHERE challenge_id = ? AND account_id = ? " +
    "AND session_token_hash = ? AND purpose = 'admin-session-step-up' AND used_at IS NULL AND expires_at > ?"
  ).bind(payload.challengeId, account.account_id, sessionHash, now).first();
  if (!challenge) throw fail(401, "This administrator session challenge is missing, expired or already used.");
  if (typeof payload.message !== "string" || payload.message !== challenge.message) {
    throw fail(401, "The signed message does not exactly match the challenge issued for this account session.");
  }
  const address = normalizeEvmAddress(challenge.address);
  const wallet = await db.prepare(
    "SELECT wallet_id,address,chain_id FROM auth_admin_wallets WHERE account_id = ? " +
    "AND address = ? COLLATE NOCASE AND chain_id = ? AND active = 1"
  ).bind(account.account_id, address, Number(challenge.chain_id)).first();
  if (!wallet) throw fail(403, "The proposed administrator wallet is no longer active for this account.");
  const sessionExpiry = Number(account.expires_at);
  const adminExpiry = Math.min(sessionExpiry, now + 600);
  if (!Number.isSafeInteger(sessionExpiry) || sessionExpiry <= now || adminExpiry <= now) {
    throw fail(401, "The ordinary account session expired before administrator verification completed.");
  }

  // Consume the one-use nonce before signature verification, including when
  // the signature is invalid. The challenge cannot be brute-force retried.
  const marker = b64u(bytes(18));
  const consumed = await db.prepare(
    "UPDATE auth_admin_wallet_challenges SET used_at = ? " +
    "WHERE challenge_id = ? AND account_id = ? AND session_token_hash = ? " +
    "AND purpose = 'admin-session-step-up' AND used_at IS NULL AND expires_at > ? AND message = ? " +
    "AND EXISTS(SELECT 1 FROM auth_sessions s WHERE s.token_hash = ? AND s.account_id = ? AND s.expires_at > ?) " +
    "AND EXISTS(SELECT 1 FROM auth_admin_roles WHERE account_id = ?) " +
    "AND EXISTS(SELECT 1 FROM auth_admin_wallets w WHERE w.account_id = ? AND w.address = ? COLLATE NOCASE " +
    "AND w.chain_id = ? AND w.active = 1)"
  ).bind(marker, challenge.challenge_id, account.account_id, sessionHash, now, payload.message,
    sessionHash, account.account_id, now, account.account_id, account.account_id, address, Number(challenge.chain_id)).run();
  if (Number(consumed?.meta?.changes || 0) !== 1) {
    throw fail(409, "The administrator wallet or account session changed. Start a fresh verification.");
  }

  await verifyAdminSiweSignature(payload.message, payload.signature, address);
  const auditId = hex(bytes(16));
  const createdAt = new Date().toISOString();
  const statements = [
    db.prepare(
      "UPDATE auth_sessions SET admin_wallet_address = ?,admin_authenticated_at = ?,admin_expires_at = ? " +
      "WHERE token_hash = ? AND account_id = ? AND expires_at > ? " +
      "AND EXISTS(SELECT 1 FROM auth_admin_wallet_challenges WHERE challenge_id = ? AND used_at = ?) " +
      "AND EXISTS(SELECT 1 FROM auth_admin_roles WHERE account_id = ?) " +
      "AND EXISTS(SELECT 1 FROM auth_admin_wallets WHERE account_id = ? AND address = ? COLLATE NOCASE " +
      "AND chain_id = ? AND active = 1)"
    ).bind(address, now, adminExpiry, sessionHash, account.account_id, now,
      challenge.challenge_id, marker, account.account_id, account.account_id, address, Number(challenge.chain_id)),
    db.prepare(
      "INSERT INTO auth_admin_wallet_audit(audit_id,event_type,account_id,wallet_id,address,chain_id,created_at,detail_json) " +
      "SELECT ?,'admin_session_authorized',?,?,?,?,?,? WHERE EXISTS(" +
      "SELECT 1 FROM auth_admin_wallet_challenges WHERE challenge_id = ? AND used_at = ?) " +
      "AND EXISTS(SELECT 1 FROM auth_sessions WHERE token_hash = ? AND account_id = ? AND admin_wallet_address = ? COLLATE NOCASE " +
      "AND admin_expires_at = ?)"
    ).bind(auditId, account.account_id, wallet.wallet_id, address, Number(challenge.chain_id), createdAt,
      JSON.stringify({ purpose: "admin-session-step-up", ttlSeconds: adminExpiry - now }),
      challenge.challenge_id, marker, sessionHash, account.account_id, address, adminExpiry),
  ];
  const results = await db.batch(statements);
  if (Number(results?.[0]?.meta?.changes || 0) !== 1 ||
      Number(results?.[1]?.meta?.changes || 0) !== 1) {
    throw fail(409, "Administrator wallet state changed during verification. Sign in and try again.");
  }
  const refreshed = await activeAccount(db, new Request(request.url, {
    headers: { Cookie: SESSION_COOKIE + "=" + token },
  }));
  const result = await summary(db, refreshed);
  if (result.adminSessionAuthorized !== true) throw fail(403, "The wallet signature was accepted, but the administrator session did not pass the final authorization check.");
  result.transactionAuthorized = false;
  result.message = "Administrator wallet verification succeeded. The session is authorized for no more than ten minutes and no transaction was submitted.";
  return json(200, result);
}
async function endAdminWalletSession(db, request, payload) {
  if (Object.keys(payload).length !== 0) throw fail(400, "Administrator wallet sign-out accepts no request fields.");
  const account = await activeAccount(db, request);
  if (!account) throw fail(401, "Sign in before ending administrator access.");
  const token = cookie(request, SESSION_COOKIE);
  if (!token) throw fail(401, "The ordinary account session is no longer active.");
  const sessionHash = await hashText(token);
  const previousAddress = account.admin_wallet_address || null;
  const result = await db.batch([
    db.prepare(
      "UPDATE auth_sessions SET admin_wallet_address = NULL,admin_authenticated_at = NULL,admin_expires_at = NULL " +
      "WHERE token_hash = ? AND account_id = ? AND expires_at > ?"
    ).bind(sessionHash, account.account_id, Math.floor(Date.now() / 1000)),
    db.prepare(
      "INSERT INTO auth_admin_wallet_audit(audit_id,event_type,account_id,address,created_at,detail_json) " +
      "SELECT ?,'admin_session_ended',?,?,?,? WHERE ? IS NOT NULL"
    ).bind(hex(bytes(16)), account.account_id, previousAddress, new Date().toISOString(),
      JSON.stringify({ purpose: "administrator-session-ended" }), previousAddress),
  ]);
  if (Number(result?.[0]?.meta?.changes || 0) !== 1) throw fail(401, "The ordinary account session is no longer active.");
  const refreshed = await activeAccount(db, new Request(request.url, {
    headers: { Cookie: SESSION_COOKIE + "=" + token },
  }));
  const state = await summary(db, refreshed);
  state.message = "Administrator access ended. Your ordinary AstroCrown account remains signed in.";
  return json(200, state);
}
async function revokeAdminWallet(db, request, payload) {
  if (Object.keys(payload).length !== 2 ||
      !Object.prototype.hasOwnProperty.call(payload, "address") ||
      !Object.prototype.hasOwnProperty.call(payload, "chainId")) {
    throw fail(400, "Provide the enrolled wallet address and chain ID only.");
  }
  const account = await activeAccount(db, request);
  if (!account) throw fail(401, "Sign in before revoking an administrator wallet.");
  const context = await requireFreshAdminWalletSession(db, account, request);
  const address = normalizeEvmAddress(payload.address);
  const chainId = validateEvmChainId(payload.chainId);
  const wallet = await db.prepare(
    "SELECT wallet_id,address,chain_id FROM auth_admin_wallets WHERE account_id = ? " +
    "AND address = ? COLLATE NOCASE AND chain_id = ? AND active = 1"
  ).bind(account.account_id, address, chainId).first();
  if (!wallet) throw fail(404, "That active administrator wallet could not be found.");
  const count = await db.prepare(
    "SELECT COUNT(*) AS active_count FROM auth_admin_wallets WHERE account_id = ? AND active = 1"
  ).bind(account.account_id).first();
  if (Number(count?.active_count || 0) <= 1) {
    throw fail(409, "The last active administrator wallet cannot be removed while the role remains assigned. Revoke the administrator role separately or enroll another wallet first.");
  }
  const now = Math.floor(Date.now() / 1000);
  const createdAt = new Date().toISOString();
  const auditId = hex(bytes(16));
  const results = await db.batch([
    db.prepare(
      "UPDATE auth_admin_wallets SET active = 0 WHERE wallet_id = ? AND account_id = ? AND active = 1 " +
      "AND EXISTS(SELECT 1 FROM auth_sessions s JOIN auth_admin_roles r ON r.account_id = s.account_id " +
      "JOIN auth_admin_wallets aw ON aw.account_id = r.account_id " +
      "WHERE s.token_hash = ? AND s.account_id = ? AND s.expires_at > ? AND s.admin_expires_at > ? " +
      "AND s.admin_authenticated_at > 0 AND s.admin_authenticated_at <= ? " +
      "AND s.admin_expires_at <= s.expires_at AND s.admin_expires_at <= s.admin_authenticated_at + 600 " +
      "AND s.admin_wallet_address = aw.address COLLATE NOCASE AND aw.active = 1)"
    ).bind(wallet.wallet_id, account.account_id, context.tokenHash, account.account_id,
      now, now, now),
    db.prepare(
      "UPDATE auth_sessions SET admin_wallet_address = NULL,admin_authenticated_at = NULL,admin_expires_at = NULL " +
      "WHERE account_id = ? AND admin_wallet_address = ? COLLATE NOCASE"
    ).bind(account.account_id, address),
    db.prepare(
      "INSERT INTO auth_admin_wallet_audit(audit_id,event_type,account_id,wallet_id,address,chain_id,created_at,detail_json) " +
      "SELECT ?,'admin_wallet_revoked',?,?,?,?,?,? WHERE EXISTS(" +
      "SELECT 1 FROM auth_admin_wallets WHERE wallet_id = ? AND active = 0)"
    ).bind(auditId, account.account_id, wallet.wallet_id, address, chainId, createdAt,
      JSON.stringify({ reason: "administrator-self-service-wallet-revocation" }), wallet.wallet_id),
  ]);
  if (Number(results?.[0]?.meta?.changes || 0) !== 1 ||
      Number(results?.[2]?.meta?.changes || 0) !== 1) {
    throw fail(409, "The administrator wallet changed during revocation. Refresh wallet status and try again.");
  }
  const refreshed = await activeAccount(db, new Request(request.url, {
    headers: { Cookie: SESSION_COOKIE + "=" + cookie(request, SESSION_COOKIE) },
  }));
  return json(200, await summary(db, refreshed));
}

async function grantAdminRole(db, request, payload) {
  if (Object.keys(payload).some((key) => !["accountIdentifier", "reason", "permissions"].includes(key)) ||
      !Object.prototype.hasOwnProperty.call(payload, "accountIdentifier") ||
      !Object.prototype.hasOwnProperty.call(payload, "reason")) {
    throw fail(400, "Provide the existing account identifier, a reason and optional delegated permissions only.");
  }
  const actor = await activeAccount(db, request);
  if (!actor) throw fail(401, "Sign in before appointing an administrator.");
  const context = await requireAdminPermission(db, actor, request, "admin.roles.grant");
  const targetIdentifier = accountId(payload.accountIdentifier);
  const reason = validateAdminReason(payload.reason);
  const delegated = validateAdminPermissions(payload.permissions);
  if (delegated.length) {
    const rows = await db.prepare(
      "SELECT permission FROM auth_admin_permissions WHERE account_id = ? AND can_delegate = 1"
    ).bind(actor.account_id).all();
    const allowed = new Set((rows.results || []).map((row) => row.permission));
    if (delegated.some((permission) => !allowed.has(permission))) {
      throw fail(403, "You may assign only permissions that were explicitly made delegable to your administrator account.");
    }
  }
  const target = await db.prepare(
    "SELECT account_id,account_identifier FROM auth_accounts WHERE account_identifier = ?"
  ).bind(targetIdentifier).first();
  if (!target) throw fail(404, "No existing AstroCrown account was found for that account identifier.");
  if (target.account_id === actor.account_id) throw fail(400, "An administrator cannot grant the role to their own account.");
  const existing = await db.prepare(
    "SELECT 1 FROM auth_admin_roles WHERE account_id = ?"
  ).bind(target.account_id).first();
  if (existing) throw fail(409, "The target account already holds the administrator role.");
  const createdAt = new Date().toISOString();
  const auditId = hex(bytes(16));
  const guard = adminHolderGuardParams(context, "admin.roles.grant");
  const statements = [
    db.prepare(
      "INSERT INTO auth_admin_roles(account_id,granted_by_account_id,reason,created_at) " +
      "SELECT ?,?,?,? WHERE " +
      "EXISTS(SELECT 1 FROM auth_admin_roles r JOIN auth_admin_permissions p ON p.account_id = r.account_id " +
      "JOIN auth_admin_wallets w ON w.account_id = r.account_id JOIN auth_sessions s ON s.account_id = r.account_id " +
      "WHERE s.token_hash = ? AND s.account_id = ? AND s.expires_at > ? AND s.admin_expires_at > ? AND s.admin_authenticated_at > 0 AND s.admin_authenticated_at <= ? AND s.admin_expires_at <= s.expires_at AND s.admin_expires_at <= s.admin_authenticated_at + 600 " +
      "AND s.admin_wallet_address = w.address COLLATE NOCASE AND w.active = 1 AND p.permission = ?) " +
      "AND NOT EXISTS(SELECT 1 FROM auth_admin_roles WHERE account_id = ?)"
    ).bind(target.account_id, actor.account_id, reason, createdAt, ...guard, target.account_id),
  ];
  for (const permission of delegated) {
    statements.push(
      db.prepare(
        "INSERT INTO auth_admin_permissions(account_id,permission,can_delegate,granted_by_account_id,reason,created_at) " +
        "SELECT ?,?,0,?,?,? WHERE EXISTS(SELECT 1 FROM auth_admin_roles WHERE account_id = ? AND granted_by_account_id = ? AND created_at = ?)"
      ).bind(target.account_id, permission, actor.account_id, reason, createdAt, target.account_id, actor.account_id, createdAt)
    );
  }
  statements.push(
    db.prepare(
      "INSERT INTO auth_admin_governance_audit(audit_id,event_type,actor_account_id,target_account_id,reason,created_at,detail_json) " +
      "SELECT ?,'admin_role_granted',?,?,?,?,? WHERE EXISTS(" +
      "SELECT 1 FROM auth_admin_roles WHERE account_id = ? AND granted_by_account_id = ? AND created_at = ?)"
    ).bind(auditId, actor.account_id, target.account_id, reason, createdAt,
      JSON.stringify({ permissionsAssigned: delegated, permissionsDelegable: [] }),
      target.account_id, actor.account_id, createdAt)
  );
  const results = await db.batch(statements);
  if (Number(results?.[0]?.meta?.changes || 0) !== 1 ||
      Number(results?.[results.length - 1]?.meta?.changes || 0) !== 1) {
    throw fail(409, "Administrator authority changed during appointment. Refresh and verify again.");
  }
  return json(200, {
    granted: true,
    targetAccountIdentifier: target.account_identifier,
    role: "admin",
    adminRoleAssigned: true,
    adminPermissions: delegated,
    adminWalletCount: 0,
    walletEnrolled: false,
    message: "The existing account was granted the administrator role. The member must enrol and separately verify their own administrator wallet before administrator access is available.",
  });
}
async function revokeAdminRole(db, request, payload) {
  if (Object.keys(payload).length !== 2 ||
      !Object.prototype.hasOwnProperty.call(payload, "accountIdentifier") ||
      !Object.prototype.hasOwnProperty.call(payload, "reason")) {
    throw fail(400, "Provide the existing administrator account identifier and a revocation reason only.");
  }
  const actor = await activeAccount(db, request);
  if (!actor) throw fail(401, "Sign in before revoking administrator authority.");
  const context = await requireAdminPermission(db, actor, request, "admin.roles.revoke");
  const targetIdentifier = accountId(payload.accountIdentifier);
  const reason = validateAdminReason(payload.reason);
  const target = await db.prepare(
    "SELECT account_id,account_identifier FROM auth_accounts WHERE account_identifier = ?"
  ).bind(targetIdentifier).first();
  if (!target) throw fail(404, "No existing AstroCrown account was found for that account identifier.");
  if (target.account_id === actor.account_id) throw fail(400, "An administrator cannot revoke their own role through this workflow.");
  const role = await db.prepare(
    "SELECT account_id FROM auth_admin_roles WHERE account_id = ?"
  ).bind(target.account_id).first();
  if (!role) throw fail(409, "The target account does not currently hold the administrator role.");
  const [permissionRows, walletCountRow] = await Promise.all([
    db.prepare("SELECT permission FROM auth_admin_permissions WHERE account_id = ? ORDER BY permission").bind(target.account_id).all(),
    db.prepare("SELECT COUNT(*) AS active_count FROM auth_admin_wallets WHERE account_id = ? AND active = 1").bind(target.account_id).first(),
  ]);
  const previousPermissions = (permissionRows.results || []).map((row) => row.permission);
  const revokedWalletCount = Number(walletCountRow?.active_count || 0);
  const createdAt = new Date().toISOString();
  const auditId = hex(bytes(16));
  const noticeId = hex(bytes(16));
  const guard = adminHolderGuardParams(context, "admin.roles.revoke");
  const statements = [
    db.prepare(
      "INSERT INTO auth_admin_governance_audit(audit_id,event_type,actor_account_id,target_account_id,reason,created_at,detail_json) " +
      "SELECT ?,'admin_role_revoked',?,?,?,?,? WHERE EXISTS(" +
      "SELECT 1 FROM auth_admin_roles r JOIN auth_admin_permissions p ON p.account_id = r.account_id " +
      "JOIN auth_admin_wallets w ON w.account_id = r.account_id JOIN auth_sessions s ON s.account_id = r.account_id " +
      "WHERE s.token_hash = ? AND s.account_id = ? AND s.expires_at > ? AND s.admin_expires_at > ? AND s.admin_authenticated_at > 0 AND s.admin_authenticated_at <= ? AND s.admin_expires_at <= s.expires_at AND s.admin_expires_at <= s.admin_authenticated_at + 600 " +
      "AND s.admin_wallet_address = w.address COLLATE NOCASE AND w.active = 1 AND p.permission = ?) " +
      "AND EXISTS(SELECT 1 FROM auth_admin_roles WHERE account_id = ?)"
    ).bind(auditId, actor.account_id, target.account_id, reason, createdAt,
      JSON.stringify({ permissionsRevoked: previousPermissions, walletsDisabled: revokedWalletCount }),
      ...guard, target.account_id),
    db.prepare(
      "DELETE FROM auth_admin_permissions WHERE account_id = ? AND EXISTS(SELECT 1 FROM auth_admin_governance_audit WHERE audit_id = ?)"
    ).bind(target.account_id, auditId),
    db.prepare(
      "UPDATE auth_admin_wallets SET active = 0 WHERE account_id = ? AND active = 1 " +
      "AND EXISTS(SELECT 1 FROM auth_admin_governance_audit WHERE audit_id = ?)"
    ).bind(target.account_id, auditId),
    db.prepare(
      "UPDATE auth_sessions SET admin_wallet_address = NULL,admin_authenticated_at = NULL,admin_expires_at = NULL " +
      "WHERE account_id = ? AND EXISTS(SELECT 1 FROM auth_admin_governance_audit WHERE audit_id = ?)"
    ).bind(target.account_id, auditId),
    db.prepare(
      "DELETE FROM auth_admin_roles WHERE account_id = ? AND EXISTS(SELECT 1 FROM auth_admin_governance_audit WHERE audit_id = ?)"
    ).bind(target.account_id, auditId),
    db.prepare(
      "INSERT INTO auth_admin_revocation_notices(notice_id,account_id,reason,created_at) " +
      "SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM auth_admin_governance_audit WHERE audit_id = ?)"
    ).bind(noticeId, target.account_id, reason, createdAt, auditId),
  ];
  const results = await db.batch(statements);
  if (Number(results?.[0]?.meta?.changes || 0) !== 1 ||
      Number(results?.[4]?.meta?.changes || 0) !== 1 ||
      Number(results?.[5]?.meta?.changes || 0) !== 1) {
    throw fail(409, "Administrator authority changed during revocation. Refresh and verify again.");
  }
  return json(200, {
    revoked: true,
    targetAccountIdentifier: target.account_identifier,
    role: "user",
    revokedWalletCount,
    revokedPermissions: previousPermissions,
    message: "Administrator authority, delegated permissions and enrolled administrator wallets have been revoked. The member's ordinary account sessions remain active.",
  });
}
async function acknowledgeAdminRevocationNotice(db, request, payload) {
  if (Object.keys(payload).length !== 1 || typeof payload.noticeId !== "string" || !/^[a-f0-9]{32}$/i.test(payload.noticeId)) {
    throw fail(400, "The administrator revocation notice reference is invalid.");
  }
  const account = await activeAccount(db, request);
  if (!account) throw fail(401, "Sign in to acknowledge the administrator notice.");
  const result = await db.prepare(
    "UPDATE auth_admin_revocation_notices SET acknowledged_at = ? " +
    "WHERE notice_id = ? AND account_id = ? AND acknowledged_at IS NULL"
  ).bind(new Date().toISOString(), payload.noticeId.toLowerCase(), account.account_id).run();
  if (Number(result.meta?.changes || 0) !== 1) {
    throw fail(404, "That unacknowledged administrator notice could not be found for this account.");
  }
  const refreshed = await activeAccount(db, new Request(request.url, {
    headers: { Cookie: SESSION_COOKIE + "=" + cookie(request, SESSION_COOKIE) },
  }));
  return json(200, await summary(db, refreshed));
}


function validatePasskeyLabel(value) {
  if (typeof value !== "string") throw fail(400, "Enter a name for this passkey.");
  const label = value.normalize("NFKC").replace(/[\u0000-\u001F\u007F]/g, "").trim();
  if (!label || label.length > 40) throw fail(400, "Passkey names must contain between 1 and 40 characters.");
  return label;
}
function validatePasskeyRef(value) {
  if (typeof value !== "string" || !/^[a-f0-9]{32}$/i.test(value)) {
    throw fail(400, "The selected passkey reference is invalid.");
  }
  return value.toLowerCase();
}
function validateSessionRef(value) {
  if (typeof value !== "string" || !/^[a-f0-9]{32}$/i.test(value)) {
    throw fail(400, "The selected session reference is invalid.");
  }
  return value.toLowerCase();
}
async function securityStatus(db, request) {
  const account = await activeAccount(db, request);
  if (!account) throw fail(401, "Sign in to review your account security.");
  const sessionToken = cookie(request, SESSION_COOKIE);
  if (!sessionToken) throw fail(401, "Your account session is no longer active.");
  const currentTokenHash = await hashText(sessionToken);
  const now = Math.floor(Date.now() / 1000);
  const [passkeys, sessions, recovery] = await Promise.all([
    db.prepare(
      "SELECT passkey_ref,display_label,credential_alg,device_type,backed_up,created_at,last_used_at " +
      "FROM auth_passkeys WHERE account_id = ? AND active = 1 ORDER BY created_at,passkey_ref"
    ).bind(account.account_id).all(),
    db.prepare(
      "SELECT session_ref,token_hash,created_at,expires_at FROM auth_sessions " +
      "WHERE account_id = ? AND expires_at > ? ORDER BY created_at DESC,session_ref LIMIT 50"
    ).bind(account.account_id, now).all(),
    db.prepare(
      "SELECT COUNT(*) AS active_count FROM auth_recovery_keys WHERE account_id = ? AND used_at IS NULL"
    ).bind(account.account_id).first(),
  ]);
  return json(200, {
    available: true,
    passkeys: (passkeys.results || []).map((row) => ({
      passkeyRef: row.passkey_ref,
      label: row.display_label || "Passkey",
      algorithm: Number(row.credential_alg),
      postQuantum: PQ_ALGS.includes(Number(row.credential_alg)),
      deviceType: row.device_type || "unknown",
      backedUp: Boolean(row.backed_up),
      createdAt: row.created_at,
      lastUsedAt: row.last_used_at || null,
    })),
    sessions: (sessions.results || []).map((row) => ({
      sessionRef: row.session_ref,
      createdAt: new Date(Number(row.created_at) * 1000).toISOString(),
      expiresAt: new Date(Number(row.expires_at) * 1000).toISOString(),
      isCurrent: equalConstantTime(row.token_hash, currentTokenHash),
    })),
    activeRecoveryKey: Number(recovery?.active_count || 0) > 0,
    activeSessionCount: (sessions.results || []).length,
  });
}
async function findSecurityStepUp(db, account, request, rawToken, purpose) {
  if (typeof rawToken !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(rawToken)) {
    throw fail(401, "Fresh passkey verification is required before this security change.");
  }
  const sessionToken = cookie(request, SESSION_COOKIE);
  if (!sessionToken) throw fail(401, "Your account session is no longer active.");
  const sessionHash = await hashText(sessionToken);
  const tokenHash = await hashText(rawToken);
  const now = Math.floor(Date.now() / 1000);
  const row = await db.prepare(
    "SELECT stepup_token_hash FROM auth_security_stepups " +
    "WHERE stepup_token_hash = ? AND account_id = ? AND session_token_hash = ? " +
    "AND purpose = ? AND used_at IS NULL AND expires_at > ? " +
    "AND EXISTS(SELECT 1 FROM auth_sessions WHERE token_hash = ? AND account_id = ? AND expires_at > ?)"
  ).bind(tokenHash, account.account_id, sessionHash, purpose, now, sessionHash, account.account_id, now).first();
  if (!row) throw fail(401, "Fresh passkey verification is required before this security change. Start the verification again.");
  return { tokenHash, sessionHash };
}
async function issueSecurityStepUp(db, env, request, payload, config) {
  if (Object.keys(payload).length !== 1 || !["manage-passkeys", "manage-sessions", "rotate-recovery-key"].includes(payload.purpose)) {
    throw fail(400, "Choose a supported account-security action.");
  }
  const account = await activeAccount(db, request);
  if (!account) throw fail(401, "Sign in before changing account security.");
  const sessionToken = cookie(request, SESSION_COOKIE);
  if (!sessionToken) throw fail(401, "Your account session is no longer active.");
  const sessionHash = await hashText(sessionToken);
  await rateLimit(db, env, request, "security-step-up-options", account.account_id, 10, 3600);
  const challengeId = b64u(bytes(24));
  const challenge = b64u(bytes(32));
  const publicKey = await generateAuthenticationOptions({
    rpID: config.rpId,
    challenge,
    timeout: 60000,
    userVerification: "required",
  });
  const now = Math.floor(Date.now() / 1000);
  await db.prepare(
    "DELETE FROM auth_security_stepups WHERE expires_at <= ? OR (used_at IS NOT NULL AND created_at < ?)"
  ).bind(now, now - 86400).run();
  await createChallenge(db, {
    id: challengeId,
    challenge: publicKey.challenge,
    ceremony: "authentication",
    accountId: account.account_id,
    accountIdentifier: account.account_identifier,
    userHandle: account.user_handle,
    payload: { flow: "security-step-up", purpose: payload.purpose, sessionHash },
    now,
  });
  return json(200, { challengeId, publicKey, purpose: payload.purpose, expiresInSeconds: CHALLENGE_SECONDS });
}
async function verifySecurityStepUp(db, env, request, payload, config) {
  if (Object.keys(payload).some((key) => !["challengeId", "credential"].includes(key))) {
    throw fail(400, "The passkey verification response contains unsupported fields.");
  }
  const account = await activeAccount(db, request);
  if (!account) throw fail(401, "Sign in before changing account security.");
  const challengeId = String(payload.challengeId || "");
  const response = payload.credential;
  if (!/^[A-Za-z0-9_-]{24,64}$/.test(challengeId) || !response || typeof response !== "object") {
    throw fail(400, "A valid passkey verification response is required.");
  }
  await rateLimit(db, env, request, "security-step-up-verify", account.account_id, 8, 300);
  const now = Math.floor(Date.now() / 1000);
  const challenge = await db.prepare(
    "SELECT * FROM auth_challenges WHERE challenge_id = ? AND ceremony = 'authentication' " +
    "AND account_id = ? AND used_at IS NULL AND expires_at > ?"
  ).bind(challengeId, account.account_id, now).first();
  if (!challenge) throw fail(410, "This security verification expired or was already used. Start again.");
  const details = JSON.parse(challenge.payload_json || "{}");
  const sessionToken = cookie(request, SESSION_COOKIE);
  if (
    details.flow !== "security-step-up" ||
    !["manage-passkeys", "manage-sessions", "rotate-recovery-key"].includes(details.purpose) ||
    !sessionToken ||
    !equalConstantTime(String(details.sessionHash || ""), await hashText(sessionToken)) ||
    challenge.user_handle !== account.user_handle
  ) throw fail(401, "This passkey verification is not bound to your current account session.");
  const credentialId = String(response.id || "");
  const row = await db.prepare(
    "SELECT p.* FROM auth_passkeys p WHERE p.credential_id = ? AND p.account_id = ? AND p.active = 1"
  ).bind(credentialId, account.account_id).first();
  if (!row || !response.response?.userHandle || !equalConstantTime(String(response.response.userHandle), account.user_handle)) {
    throw fail(401, "Passkey verification could not be completed. Use an active passkey belonging to this account.");
  }
  let verified;
  try {
    verified = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: config.origin,
      expectedRPID: config.rpId,
      credential: {
        id: row.credential_id,
        publicKey: unb64u(row.public_key_b64),
        counter: Number(row.sign_count || 0),
        transports: JSON.parse(row.transports_json || "[]"),
      },
      requireUserVerification: true,
    });
  } catch {
    throw fail(401, "Passkey verification could not be completed. Start again with an active passkey.");
  }
  if (!verified.verified || !verified.authenticationInfo.userVerified) {
    throw fail(401, "Passkey verification could not be completed. Start again with an active passkey.");
  }
  const marker = b64u(bytes(18));
  const rawGrant = b64u(bytes(32));
  const grantHash = await hashText(rawGrant);
  const timestamp = new Date().toISOString();
  const sessionHash = await hashText(sessionToken);
  const grantExpiry = now + 120;
  const results = await db.batch([
    db.prepare(
      "UPDATE auth_challenges SET used_at = ? WHERE challenge_id = ? AND account_id = ? " +
      "AND ceremony = 'authentication' AND used_at IS NULL AND expires_at > ? " +
      "AND EXISTS(SELECT 1 FROM auth_sessions WHERE token_hash = ? AND account_id = ? AND expires_at > ?)"
    ).bind(marker, challengeId, account.account_id, now, sessionHash, account.account_id, now),
    db.prepare(
      "UPDATE auth_passkeys SET sign_count = ?, last_used_at = ? WHERE credential_id = ? " +
      "AND account_id = ? AND active = 1 AND EXISTS(SELECT 1 FROM auth_challenges WHERE challenge_id = ? AND used_at = ?)"
    ).bind(verified.authenticationInfo.newCounter, timestamp, credentialId, account.account_id, challengeId, marker),
    db.prepare(
      "INSERT INTO auth_security_stepups(stepup_token_hash,account_id,session_token_hash,purpose,created_at,expires_at) " +
      "SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM auth_challenges WHERE challenge_id = ? AND used_at = ?) " +
      "AND EXISTS(SELECT 1 FROM auth_passkeys WHERE credential_id = ? AND account_id = ? AND active = 1 AND sign_count = ?) " +
      "AND EXISTS(SELECT 1 FROM auth_sessions WHERE token_hash = ? AND account_id = ? AND expires_at > ?)"
    ).bind(grantHash, account.account_id, sessionHash, details.purpose, now, grantExpiry, challengeId, marker,
      credentialId, account.account_id, verified.authenticationInfo.newCounter, sessionHash, account.account_id, now),
    db.prepare(
      "INSERT INTO auth_security_audit(audit_id,account_id,event_type,created_at,detail) " +
      "SELECT ?,?,'security_step_up_verified',?,? WHERE EXISTS(SELECT 1 FROM auth_security_stepups WHERE stepup_token_hash = ?)"
    ).bind(b64u(bytes(16)), account.account_id, timestamp, "purpose=" + details.purpose, grantHash),
  ]);
  if (Number(results?.[0]?.meta?.changes || 0) !== 1 || Number(results?.[2]?.meta?.changes || 0) !== 1) {
    throw fail(409, "Your account session or security verification changed. Start the security action again.");
  }
  return json(200, {
    stepUpToken: rawGrant,
    purpose: details.purpose,
    expiresInSeconds: 120,
    message: "Your passkey verified this security action. The authorization is short-lived and can be used once.",
  });
}
async function addPasskeyOptions(db, env, request, payload, config) {
  if (Object.keys(payload).some((key) => !["stepUpToken", "label"].includes(key))) {
    throw fail(400, "The additional passkey request contains unsupported fields.");
  }
  const account = await activeAccount(db, request);
  if (!account) throw fail(401, "Sign in before adding a passkey.");
  const label = validatePasskeyLabel(payload.label);
  const grant = await findSecurityStepUp(db, account, request, payload.stepUpToken, "manage-passkeys");
  await rateLimit(db, env, request, "passkey-add-options", account.account_id, 10, 3600);
  const existing = await db.prepare(
    "SELECT credential_id,transports_json FROM auth_passkeys WHERE account_id = ? AND active = 1"
  ).bind(account.account_id).all();
  const challengeId = b64u(bytes(24));
  const challenge = b64u(bytes(32));
  const publicKey = await generateRegistrationOptions({
    rpName: config.rpName,
    rpID: config.rpId,
    userName: account.account_identifier,
    userDisplayName: "AstroCrown Member",
    userID: unb64u(account.user_handle),
    challenge,
    timeout: 60000,
    attestationType: "none",
    authenticatorSelection: { residentKey: "required", userVerification: "required" },
    excludeCredentials: (existing.results || []).map((item) => ({
      id: item.credential_id,
      transports: JSON.parse(item.transports_json || "[]"),
    })),
    supportedAlgorithmIDs: getDefaultSupportedAlgorithmIDs(),
  });
  const now = Math.floor(Date.now() / 1000);
  await createChallenge(db, {
    id: challengeId,
    challenge: publicKey.challenge,
    ceremony: "registration",
    accountId: account.account_id,
    accountIdentifier: account.account_identifier,
    userHandle: account.user_handle,
    payload: { flow: "additional-passkey", label, sessionHash: grant.sessionHash, stepupTokenHash: grant.tokenHash },
    now,
  });
  return json(200, { challengeId, publicKey, purpose: "add-account-passkey" });
}
async function addPasskeyVerify(db, env, request, payload, config) {
  if (Object.keys(payload).some((key) => !["challengeId", "credential"].includes(key))) {
    throw fail(400, "The additional passkey response contains unsupported fields.");
  }
  const account = await activeAccount(db, request);
  if (!account) throw fail(401, "Sign in before adding a passkey.");
  const challengeId = String(payload.challengeId || "");
  if (!/^[A-Za-z0-9_-]{24,64}$/.test(challengeId) || !payload.credential || typeof payload.credential !== "object") {
    throw fail(400, "A valid additional passkey response is required.");
  }
  await rateLimit(db, env, request, "passkey-add-verify", account.account_id, 8, 3600);
  const now = Math.floor(Date.now() / 1000);
  const challenge = await db.prepare(
    "SELECT * FROM auth_challenges WHERE challenge_id = ? AND ceremony = 'registration' " +
    "AND account_id = ? AND used_at IS NULL AND expires_at > ?"
  ).bind(challengeId, account.account_id, now).first();
  if (!challenge) throw fail(410, "This additional passkey request expired or was already used. Start again.");
  const details = JSON.parse(challenge.payload_json || "{}");
  const sessionToken = cookie(request, SESSION_COOKIE);
  if (
    details.flow !== "additional-passkey" ||
    !sessionToken ||
    !equalConstantTime(String(details.sessionHash || ""), await hashText(sessionToken)) ||
    challenge.user_handle !== account.user_handle ||
    challenge.account_identifier !== account.account_identifier
  ) throw fail(401, "This passkey registration is not bound to your current account session.");
  const grant = await db.prepare(
    "SELECT stepup_token_hash FROM auth_security_stepups WHERE stepup_token_hash = ? " +
    "AND account_id = ? AND session_token_hash = ? AND purpose = 'manage-passkeys' " +
    "AND used_at IS NULL AND expires_at > ?"
  ).bind(details.stepupTokenHash, account.account_id, details.sessionHash, now).first();
  if (!grant) throw fail(401, "Fresh passkey verification is required. Start the add-passkey action again.");
  const existing = await db.prepare(
    "SELECT credential_id FROM auth_passkeys WHERE account_id = ? AND active = 1"
  ).bind(account.account_id).all();
  const credential = await verifiedPasskey(
    payload.credential,
    challenge,
    config,
    (existing.results || []).map((row) => row.credential_id)
  );
  const passkeyRef = hex(bytes(16));
  const marker = b64u(bytes(18));
  const timestamp = new Date().toISOString();
  const results = await db.batch([
    db.prepare(
      "UPDATE auth_security_stepups SET used_at = ? WHERE stepup_token_hash = ? AND account_id = ? " +
      "AND session_token_hash = ? AND purpose = 'manage-passkeys' AND used_at IS NULL AND expires_at > ?"
    ).bind(marker, details.stepupTokenHash, account.account_id, details.sessionHash, now),
    db.prepare(
      "UPDATE auth_challenges SET used_at = ? WHERE challenge_id = ? AND account_id = ? " +
      "AND ceremony = 'registration' AND used_at IS NULL AND expires_at > ? " +
      "AND EXISTS(SELECT 1 FROM auth_security_stepups WHERE stepup_token_hash = ? AND used_at = ?) " +
      "AND EXISTS(SELECT 1 FROM auth_sessions WHERE token_hash = ? AND account_id = ? AND expires_at > ?)"
    ).bind(marker, challengeId, account.account_id, now, details.stepupTokenHash, marker, details.sessionHash, account.account_id, now),
    db.prepare(
      "INSERT INTO auth_passkeys(passkey_ref,display_label,credential_id,account_id,public_key_b64,credential_alg,sign_count,transports_json,device_type,backed_up,created_at,active) " +
      "SELECT ?,?,?,?,?,?,?,?,?,?,?,1 WHERE EXISTS(SELECT 1 FROM auth_challenges WHERE challenge_id = ? AND used_at = ?)"
    ).bind(passkeyRef, details.label, credential.id, account.account_id, credential.publicKey, credential.algorithm,
      credential.counter, JSON.stringify(credential.transports), credential.deviceType, Number(credential.backedUp),
      timestamp, challengeId, marker),
    db.prepare(
      "INSERT INTO auth_security_audit(audit_id,account_id,event_type,created_at,detail) " +
      "SELECT ?,?,'passkey_added',?,? WHERE EXISTS(SELECT 1 FROM auth_passkeys WHERE passkey_ref = ? AND account_id = ? AND active = 1)"
    ).bind(b64u(bytes(16)), account.account_id, timestamp, "passkey_ref=" + passkeyRef, passkeyRef, account.account_id),
  ]);
  if (Number(results?.[0]?.meta?.changes || 0) !== 1 || Number(results?.[2]?.meta?.changes || 0) !== 1) {
    throw fail(409, "The passkey could not be added because the account security state changed. Start again.");
  }
  return await securityStatus(db, request);
}
async function renamePasskey(db, request, payload) {
  if (Object.keys(payload).some((key) => !["stepUpToken", "passkeyRef", "label"].includes(key))) {
    throw fail(400, "The passkey rename request contains unsupported fields.");
  }
  const account = await activeAccount(db, request);
  if (!account) throw fail(401, "Sign in before renaming a passkey.");
  const passkeyRef = validatePasskeyRef(payload.passkeyRef);
  const label = validatePasskeyLabel(payload.label);
  const grant = await findSecurityStepUp(db, account, request, payload.stepUpToken, "manage-passkeys");
  const exists = await db.prepare(
    "SELECT 1 FROM auth_passkeys WHERE passkey_ref = ? AND account_id = ? AND active = 1"
  ).bind(passkeyRef, account.account_id).first();
  if (!exists) throw fail(404, "That active passkey could not be found.");
  const marker = b64u(bytes(18));
  const timestamp = new Date().toISOString();
  const results = await db.batch([
    db.prepare(
      "UPDATE auth_security_stepups SET used_at = ? WHERE stepup_token_hash = ? AND account_id = ? " +
      "AND session_token_hash = ? AND purpose = 'manage-passkeys' AND used_at IS NULL AND expires_at > ? " +
      "AND EXISTS(SELECT 1 FROM auth_sessions WHERE token_hash = ? AND account_id = ? AND expires_at > ?)"
    ).bind(marker, grant.tokenHash, account.account_id, grant.sessionHash, Math.floor(Date.now() / 1000),
      grant.sessionHash, account.account_id, Math.floor(Date.now() / 1000)),
    db.prepare(
      "UPDATE auth_passkeys SET display_label = ? WHERE passkey_ref = ? AND account_id = ? AND active = 1 " +
      "AND EXISTS(SELECT 1 FROM auth_security_stepups WHERE stepup_token_hash = ? AND used_at = ?)"
    ).bind(label, passkeyRef, account.account_id, grant.tokenHash, marker),
    db.prepare(
      "INSERT INTO auth_security_audit(audit_id,account_id,event_type,created_at,detail) " +
      "SELECT ?,?,'passkey_label_changed',?,? WHERE EXISTS(SELECT 1 FROM auth_passkeys WHERE passkey_ref = ? AND account_id = ? AND display_label = ?)"
    ).bind(b64u(bytes(16)), account.account_id, timestamp, "passkey_ref=" + passkeyRef, passkeyRef, account.account_id, label),
  ]);
  if (Number(results?.[0]?.meta?.changes || 0) !== 1 || Number(results?.[1]?.meta?.changes || 0) !== 1) {
    throw fail(409, "The passkey name could not be changed. Verify your passkey and try again.");
  }
  return await securityStatus(db, request);
}
async function revokePasskey(db, env, request, payload) {
  if (Object.keys(payload).some((key) => !["stepUpToken", "passkeyRef"].includes(key))) {
    throw fail(400, "The passkey revocation request contains unsupported fields.");
  }
  const account = await activeAccount(db, request);
  if (!account) throw fail(401, "Sign in before revoking a passkey.");
  const passkeyRef = validatePasskeyRef(payload.passkeyRef);
  const grant = await findSecurityStepUp(db, account, request, payload.stepUpToken, "manage-passkeys");
  const counts = await db.prepare(
    "SELECT COUNT(*) AS active_count FROM auth_passkeys WHERE account_id = ? AND active = 1"
  ).bind(account.account_id).first();
  if (Number(counts?.active_count || 0) <= 1) {
    throw fail(409, "The last active passkey cannot be removed here. Add another passkey or use account recovery first.");
  }
  const target = await db.prepare(
    "SELECT credential_id FROM auth_passkeys WHERE passkey_ref = ? AND account_id = ? AND active = 1"
  ).bind(passkeyRef, account.account_id).first();
  if (!target) throw fail(404, "That active passkey could not be found.");
  const currentToken = cookie(request, SESSION_COOKIE);
  if (!currentToken) throw fail(401, "Your account session is no longer active.");
  const currentTokenHash = await hashText(currentToken);
  const currentSession = await db.prepare(
    "SELECT authenticated_credential_id FROM auth_sessions WHERE token_hash = ? AND account_id = ? AND expires_at > ?"
  ).bind(currentTokenHash, account.account_id, Math.floor(Date.now() / 1000)).first();
  if (!currentSession) throw fail(401, "Your account session is no longer active.");
  const currentSessionWillBeRevoked = equalConstantTime(
    String(currentSession.authenticated_credential_id || ""),
    String(target.credential_id)
  );
  const marker = b64u(bytes(18));
  const timestamp = new Date().toISOString();
  const now = Math.floor(Date.now() / 1000);
  const results = await db.batch([
    db.prepare(
      "UPDATE auth_security_stepups SET used_at = ? WHERE stepup_token_hash = ? AND account_id = ? " +
      "AND session_token_hash = ? AND purpose = 'manage-passkeys' AND used_at IS NULL AND expires_at > ? " +
      "AND EXISTS(SELECT 1 FROM auth_sessions WHERE token_hash = ? AND account_id = ? AND expires_at > ?)"
    ).bind(marker, grant.tokenHash, account.account_id, grant.sessionHash, now,
      grant.sessionHash, account.account_id, now),
    db.prepare(
      "UPDATE auth_passkeys SET active = 0 WHERE passkey_ref = ? AND account_id = ? AND active = 1 " +
      "AND EXISTS(SELECT 1 FROM auth_security_stepups WHERE stepup_token_hash = ? AND used_at = ?) " +
      "AND (SELECT COUNT(*) FROM auth_passkeys WHERE account_id = ? AND active = 1) > 1"
    ).bind(passkeyRef, account.account_id, grant.tokenHash, marker, account.account_id),
    db.prepare(
      "DELETE FROM auth_sessions WHERE account_id = ? AND authenticated_credential_id = ? " +
      "AND EXISTS(SELECT 1 FROM auth_passkeys WHERE passkey_ref = ? AND account_id = ? AND active = 0)"
    ).bind(account.account_id, target.credential_id, passkeyRef, account.account_id),
    db.prepare(
      "INSERT INTO auth_security_audit(audit_id,account_id,event_type,created_at,detail) " +
      "SELECT ?,?,'passkey_revoked',?,? WHERE EXISTS(SELECT 1 FROM auth_passkeys WHERE passkey_ref = ? AND account_id = ? AND active = 0)"
    ).bind(b64u(bytes(16)), account.account_id, timestamp, "passkey_ref=" + passkeyRef, passkeyRef, account.account_id),
  ]);
  if (Number(results?.[0]?.meta?.changes || 0) !== 1 || Number(results?.[1]?.meta?.changes || 0) !== 1) {
    throw fail(409, "The passkey could not be revoked. The account must retain at least one active passkey.");
  }
  if (currentSessionWillBeRevoked) {
    return json(200, {
      revoked: true,
      sessionRevoked: true,
      message: "The passkey was revoked, and this session was ended because that passkey originally authenticated it. Sign in again with another active passkey.",
    }, { "Set-Cookie": clearCookie(new URL(request.url)) });
  }
  return await securityStatus(db, request);
}
async function revokeSessions(db, request, payload) {
  if (Object.keys(payload).some((key) => !["stepUpToken", "sessionRef", "revokeOthers"].includes(key))) {
    throw fail(400, "The session revocation request contains unsupported fields.");
  }
  const account = await activeAccount(db, request);
  if (!account) throw fail(401, "Sign in before managing sessions.");
  const hasTarget = typeof payload.sessionRef === "string";
  const revokeOthers = payload.revokeOthers === true;
  if (hasTarget === revokeOthers || (payload.revokeOthers !== undefined && typeof payload.revokeOthers !== "boolean")) {
    throw fail(400, "Choose one other session or explicitly choose to sign out all other sessions.");
  }
  const grant = await findSecurityStepUp(db, account, request, payload.stepUpToken, "manage-sessions");
  const sessionToken = cookie(request, SESSION_COOKIE);
  const currentHash = await hashText(sessionToken);
  const now = Math.floor(Date.now() / 1000);
  const targetRef = hasTarget ? validateSessionRef(payload.sessionRef) : null;
  if (targetRef) {
    const target = await db.prepare(
      "SELECT token_hash FROM auth_sessions WHERE session_ref = ? AND account_id = ? AND expires_at > ?"
    ).bind(targetRef, account.account_id, now).first();
    if (!target) throw fail(404, "That active session could not be found.");
    if (equalConstantTime(target.token_hash, currentHash)) {
      throw fail(400, "The current session cannot be revoked from this screen. Use Sign out instead.");
    }
  }
  const marker = b64u(bytes(18));
  const timestamp = new Date().toISOString();
  const deleteStatement = targetRef
    ? db.prepare(
      "DELETE FROM auth_sessions WHERE session_ref = ? AND account_id = ? AND token_hash <> ? AND expires_at > ? " +
      "AND EXISTS(SELECT 1 FROM auth_security_stepups WHERE stepup_token_hash = ? AND used_at = ?)"
    ).bind(targetRef, account.account_id, currentHash, now, grant.tokenHash, marker)
    : db.prepare(
      "DELETE FROM auth_sessions WHERE account_id = ? AND token_hash <> ? AND expires_at > ? " +
      "AND EXISTS(SELECT 1 FROM auth_security_stepups WHERE stepup_token_hash = ? AND used_at = ?)"
    ).bind(account.account_id, currentHash, now, grant.tokenHash, marker);
  const results = await db.batch([
    db.prepare(
      "UPDATE auth_security_stepups SET used_at = ? WHERE stepup_token_hash = ? AND account_id = ? " +
      "AND session_token_hash = ? AND purpose = 'manage-sessions' AND used_at IS NULL AND expires_at > ? " +
      "AND EXISTS(SELECT 1 FROM auth_sessions WHERE token_hash = ? AND account_id = ? AND expires_at > ?)"
    ).bind(marker, grant.tokenHash, account.account_id, grant.sessionHash, now, grant.sessionHash, account.account_id, now),
    deleteStatement,
    db.prepare(
      "INSERT INTO auth_security_audit(audit_id,account_id,event_type,created_at,detail) " +
      "SELECT ?,?,'account_sessions_revoked',?,? WHERE EXISTS(SELECT 1 FROM auth_security_stepups WHERE stepup_token_hash = ? AND used_at = ?)"
    ).bind(b64u(bytes(16)), account.account_id, timestamp,
      targetRef ? "scope=selected-other-session" : "scope=all-other-sessions", grant.tokenHash, marker),
  ]);
  if (Number(results?.[0]?.meta?.changes || 0) !== 1) {
    throw fail(409, "The session list could not be changed. Verify your passkey and try again.");
  }
  return await securityStatus(db, request);
}
async function rotateRecoveryKey(db, request, payload) {
  if (Object.keys(payload).some((key) => key !== "stepUpToken")) {
    throw fail(400, "The recovery-key rotation request contains unsupported fields.");
  }
  const account = await activeAccount(db, request);
  if (!account) throw fail(401, "Sign in before replacing your recovery key.");
  const grant = await findSecurityStepUp(db, account, request, payload.stepUpToken, "rotate-recovery-key");
  const version = await db.prepare(
    "SELECT COALESCE(MAX(key_version),0) AS latest_version FROM auth_recovery_keys WHERE account_id = ?"
  ).bind(account.account_id).first();
  const nextVersion = Number(version?.latest_version || 0) + 1;
  const nextKey = await newRecoveryKey();
  const marker = b64u(bytes(18));
  const timestamp = new Date().toISOString();
  const now = Math.floor(Date.now() / 1000);
  const results = await db.batch([
    db.prepare(
      "UPDATE auth_security_stepups SET used_at = ? WHERE stepup_token_hash = ? AND account_id = ? " +
      "AND session_token_hash = ? AND purpose = 'rotate-recovery-key' AND used_at IS NULL AND expires_at > ? " +
      "AND EXISTS(SELECT 1 FROM auth_sessions WHERE token_hash = ? AND account_id = ? AND expires_at > ?)"
    ).bind(marker, grant.tokenHash, account.account_id, grant.sessionHash, now, grant.sessionHash, account.account_id, now),
    db.prepare(
      "UPDATE auth_recovery_keys SET used_at = ? WHERE account_id = ? AND used_at IS NULL " +
      "AND EXISTS(SELECT 1 FROM auth_security_stepups WHERE stepup_token_hash = ? AND used_at = ?)"
    ).bind(timestamp, account.account_id, grant.tokenHash, marker),
    db.prepare(
      "INSERT INTO auth_recovery_keys(account_id,key_version,salt_b64,verifier_b64,created_at) " +
      "SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM auth_security_stepups WHERE stepup_token_hash = ? AND used_at = ?)"
    ).bind(account.account_id, nextVersion, nextKey.salt, nextKey.verifier, timestamp, grant.tokenHash, marker),
    db.prepare(
      "INSERT INTO auth_security_audit(audit_id,account_id,event_type,created_at,detail) " +
      "SELECT ?,?,'recovery_key_rotated',?,? WHERE EXISTS(SELECT 1 FROM auth_recovery_keys WHERE account_id = ? AND key_version = ?)"
    ).bind(b64u(bytes(16)), account.account_id, timestamp, "new_recovery_key_version=" + nextVersion, account.account_id, nextVersion),
  ]);
  if (Number(results?.[0]?.meta?.changes || 0) !== 1 || Number(results?.[2]?.meta?.changes || 0) !== 1) {
    throw fail(409, "The recovery key could not be replaced. Verify your passkey and try again.");
  }
  const result = await securityStatus(db, request);
  const data = await result.json();
  data.oneTimeRecoveryKey = nextKey.value;
  data.recoveryKeyVersion = nextVersion;
  data.message = "Your previous recovery key has been invalidated. Save this replacement key offline; it will not be displayed again.";
  return json(200, data);
}

async function newRecoveryKey() {
  const value = "ACR1-" + b64u(bytes(32));
  const salt = bytes(16);
  const text = new TextEncoder().encode(value);
  const combined = new Uint8Array(salt.length + text.length);
  combined.set(salt);
  combined.set(text, salt.length);
  return { value, salt: b64u(salt), verifier: await digest(combined) };
}
async function verifiedPasskey(response, challenge, config, excluded = []) {
  let result;
  try {
    result = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: config.origin,
      expectedRPID: config.rpId,
      requireUserPresence: true,
      requireUserVerification: true,
      supportedAlgorithmIDs: getDefaultSupportedAlgorithmIDs(),
    });
  } catch (error) {
    if (config.localDiagnostics) {
      const safeName = String(error?.name || "Error").slice(0, 80);
      const safeMessage = String(error?.message || "No diagnostic message")
        .replace(/[\\r\\n]+/g, " ")
        .slice(0, 300);
      throw fail(401, "LOCAL_TEST_WEBAUTHN_REJECTION [" + safeName + "]: " + safeMessage);
    }
    throw fail(401, "The passkey registration proof was not accepted. Start again.");
  }
  if (!result.verified || !result.registrationInfo?.credential) throw fail(401, "The passkey registration proof was not accepted. Start again.");
  const credential = result.registrationInfo.credential;
  if (!credential.id || excluded.includes(credential.id)) throw fail(409, "This passkey is already registered. Use another authenticator.");
  let alg;
  try { alg = Number(decodeCredentialPublicKey(credential.publicKey).get(3)); }
  catch { throw fail(400, "The authenticator returned an unsupported credential public key."); }
  if (!Number.isInteger(alg)) throw fail(400, "The authenticator returned an unsupported credential public key.");
  return {
    id: credential.id,
    publicKey: b64u(credential.publicKey),
    algorithm: alg,
    counter: Number(credential.counter || 0),
    transports: Array.isArray(credential.transports) ? credential.transports : [],
    deviceType: result.registrationInfo.credentialDeviceType || "unknown",
    backedUp: Boolean(result.registrationInfo.credentialBackedUp),
  };
}
async function issueRegistration(db, env, request, payload, config) {
  if (Object.keys(payload).some((key) => !["termsAccepted", "termsVersion", "referralId"].includes(key))) throw fail(400, "The passkey registration request contains unsupported fields.");
  if (payload.termsAccepted !== true || payload.termsVersion !== TERMS_VERSION) throw fail(400, "Accept the current staging Terms and Privacy acknowledgement before registration.");
  const referral = payload.referralId == null ? "" : String(payload.referralId).trim();
  if (referral && !/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(referral)) throw fail(400, "Enter a valid Referral ID or leave the field blank.");
  await rateLimit(db, env, request, "passkey-register-options", "registration", 5, 3600);
  const identifier = "AC-" + hex(bytes(5)).toUpperCase();
  const userHandle = b64u(bytes(16));
  const challenge = b64u(bytes(32));
  const challengeId = b64u(bytes(24));
  const publicKey = await generateRegistrationOptions({
    rpName: config.rpName,
    rpID: config.rpId,
    userName: identifier,
    userDisplayName: "AstroCrown Member",
    userID: unb64u(userHandle),
    challenge,
    timeout: 60000,
    attestationType: "none",
    authenticatorSelection: { residentKey: "required", userVerification: "required" },
    supportedAlgorithmIDs: getDefaultSupportedAlgorithmIDs(),
  });
  const now = Math.floor(Date.now() / 1000);
  await createChallenge(db, {
    id: challengeId, challenge: publicKey.challenge, ceremony: "registration", accountId: identifier,
    accountIdentifier: identifier, userHandle, payload: { referralId: referral, termsVersion: TERMS_VERSION }, now,
  });
  return json(200, { challengeId, publicKey });
}
async function verifyRegistration(db, env, request, payload, config) {
  if (Object.keys(payload).some((key) => !["challengeId", "credential"].includes(key))) throw fail(400, "The passkey registration response contains unsupported fields.");
  const challengeId = String(payload.challengeId || "");
  if (!/^[A-Za-z0-9_-]{24,64}$/.test(challengeId) || !payload.credential || typeof payload.credential !== "object") throw fail(400, "A valid passkey registration response is required.");
  await rateLimit(db, env, request, "passkey-register-verify", "registration", 10, 3600);
  const now = Math.floor(Date.now() / 1000);
  const challenge = await db.prepare(
    "SELECT * FROM auth_challenges WHERE challenge_id = ? AND ceremony = 'registration' AND used_at IS NULL AND expires_at > ?"
  ).bind(challengeId, now).first();
  if (!challenge) throw fail(410, "This passkey registration request expired or was already used. Start again.");
  const credential = await verifiedPasskey(payload.credential, challenge, config);
  const recovery = await newRecoveryKey();
  const token = b64u(bytes(32));
  const tokenHash = await hashText(token);
  const created = new Date().toISOString();
  const expires = now + SESSION_SECONDS;
  const metadata = JSON.parse(challenge.payload_json || "{}");
  const marker = b64u(bytes(18));
  const passkeyRef = hex(bytes(16));
  const sessionRef = hex(bytes(16));
  const queries = [
    db.prepare(
      "INSERT INTO auth_accounts(account_id,account_identifier,user_handle,created_at,avatar_id,referral_id,terms_version,terms_accepted_at,role) " +
      "SELECT ?,?,?,?,'person',?,?,?,'user' WHERE EXISTS " +
      "(SELECT 1 FROM auth_challenges WHERE challenge_id = ? AND ceremony = 'registration' AND used_at IS NULL AND expires_at > ?)"
    ).bind(challenge.account_id, challenge.account_identifier, challenge.user_handle, created, metadata.referralId || "", TERMS_VERSION, created, challengeId, now),
    db.prepare(
      "UPDATE auth_challenges SET used_at = ? WHERE challenge_id = ? AND used_at IS NULL AND EXISTS(SELECT 1 FROM auth_accounts WHERE account_id = ?)"
    ).bind(marker, challengeId, challenge.account_id),
    db.prepare(
      "INSERT INTO auth_passkeys(passkey_ref,display_label,credential_id,account_id,public_key_b64,credential_alg,sign_count,transports_json,device_type,backed_up,created_at,active) " +
      "SELECT ?,?,?,?,?,?,?,?,?,?,?,1 WHERE EXISTS(SELECT 1 FROM auth_challenges WHERE challenge_id = ? AND used_at = ?)"
    ).bind(passkeyRef, "Primary passkey", credential.id, challenge.account_id, credential.publicKey, credential.algorithm, credential.counter, JSON.stringify(credential.transports), credential.deviceType, Number(credential.backedUp), created, challengeId, marker),
    db.prepare(
      "INSERT INTO auth_recovery_keys(account_id,key_version,salt_b64,verifier_b64,created_at) " +
      "SELECT ?,1,?,?,? WHERE EXISTS(SELECT 1 FROM auth_challenges WHERE challenge_id = ? AND used_at = ?)"
    ).bind(challenge.account_id, recovery.salt, recovery.verifier, created, challengeId, marker),
    db.prepare(
      "INSERT INTO auth_sessions(token_hash,account_id,session_ref,authenticated_credential_id,created_at,expires_at) " +
      "SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM auth_challenges WHERE challenge_id = ? AND used_at = ?)"
    ).bind(tokenHash, challenge.account_id, sessionRef, credential.id, now, expires, challengeId, marker),
    db.prepare(
      "INSERT INTO auth_security_audit(audit_id,account_id,event_type,created_at,detail) " +
      "SELECT ?,?,'account_created_with_passkey',?,'recovery_key_version=1' WHERE EXISTS(SELECT 1 FROM auth_challenges WHERE challenge_id = ? AND used_at = ?)"
    ).bind(b64u(bytes(16)), challenge.account_id, created, challengeId, marker),
  ];
  try { await db.batch(queries); } catch { throw fail(409, "This passkey or account could not be registered. Start again."); }
  const account = await activeAccount(db, new Request(config.origin, { headers: { Cookie: SESSION_COOKIE + "=" + token } }));
  if (!account) throw fail(500, "The staging account session could not be initialized.");
  const result = await summary(db, account);
  result.oneTimeRecoveryKey = recovery.value;
  result.recoveryKeyVersion = 1;
  result.message = "Your AstroCrown staging account has been created. Save the offline recovery key now; it will not be shown again.";
  return json(200, result, { "Set-Cookie": sessionCookie(token, new URL(config.origin)) });
}
async function issueAuthentication(db, env, request, config) {
  await rateLimit(db, env, request, "passkey-auth-options", "sign-in", 30, 3600);
  const challengeId = b64u(bytes(24));
  const challenge = b64u(bytes(32));
  const publicKey = await generateAuthenticationOptions({
    rpID: config.rpId, challenge, timeout: 60000, userVerification: "required",
  });
  const now = Math.floor(Date.now() / 1000);
  await createChallenge(db, { id: challengeId, challenge: publicKey.challenge, ceremony: "authentication", now });
  return json(200, { challengeId, publicKey });
}
async function verifyAuthentication(db, env, request, payload, config) {
  if (Object.keys(payload).some((key) => !["challengeId", "credential"].includes(key))) throw fail(400, "The passkey sign-in response contains unsupported fields.");
  const challengeId = String(payload.challengeId || "");
  const response = payload.credential;
  if (!/^[A-Za-z0-9_-]{24,64}$/.test(challengeId) || !response || typeof response !== "object") throw fail(400, "The passkey sign-in response is incomplete.");
  await rateLimit(db, env, request, "passkey-auth-verify", "sign-in", 10, 300);
  const now = Math.floor(Date.now() / 1000);
  const challenge = await db.prepare(
    "SELECT * FROM auth_challenges WHERE challenge_id = ? AND ceremony = 'authentication' AND used_at IS NULL AND expires_at > ?"
  ).bind(challengeId, now).first();
  if (!challenge) throw fail(410, "This passkey sign-in request expired or was already used. Start again.");
  const challengeDetails = JSON.parse(challenge.payload_json || "{}");
  if (challengeDetails.flow === "security-step-up") {
    throw fail(400, "This passkey challenge is reserved for an authenticated account-security action.");
  }
  const credentialId = String(response.id || "");
  const row = await db.prepare(
    "SELECT p.*,a.account_id,a.account_identifier,a.user_handle,a.created_at,a.avatar_id,a.referral_id,a.terms_version,a.terms_accepted_at,a.role " +
    "FROM auth_passkeys p JOIN auth_accounts a ON a.account_id = p.account_id WHERE p.credential_id = ? AND p.active = 1 AND a.role = 'user'"
  ).bind(credentialId).first();
  if (!row) throw fail(401, "Passkey sign-in could not be completed. Check your authenticator and try again.");
  if (!response.response?.userHandle || !equalConstantTime(String(response.response.userHandle), row.user_handle)) throw fail(401, "Passkey sign-in could not be completed. Check your authenticator and try again.");
  let verified;
  try {
    verified = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: config.origin,
      expectedRPID: config.rpId,
      credential: {
        id: row.credential_id,
        publicKey: unb64u(row.public_key_b64),
        counter: Number(row.sign_count || 0),
        transports: JSON.parse(row.transports_json || "[]"),
      },
      requireUserVerification: true,
    });
  } catch {
    throw fail(401, "Passkey sign-in could not be completed. Check your authenticator and try again.");
  }
  if (!verified.verified || !verified.authenticationInfo.userVerified) throw fail(401, "Passkey sign-in could not be completed. Check your authenticator and try again.");
  const marker = b64u(bytes(18));
  const token = b64u(bytes(32));
  const tokenHash = await hashText(token);
  const sessionRef = hex(bytes(16));
  const expires = now + SESSION_SECONDS;
  const timestamp = new Date().toISOString();
  const queries = [
    db.prepare("UPDATE auth_challenges SET used_at = ? WHERE challenge_id = ? AND ceremony = 'authentication' AND used_at IS NULL AND expires_at > ?").bind(marker, challengeId, now),
    db.prepare(
      "UPDATE auth_passkeys SET sign_count = ?, last_used_at = ? WHERE credential_id = ? AND active = 1 " +
      "AND EXISTS(SELECT 1 FROM auth_challenges WHERE challenge_id = ? AND used_at = ?)"
    ).bind(verified.authenticationInfo.newCounter, timestamp, credentialId, challengeId, marker),
    db.prepare(
      "INSERT INTO auth_sessions(token_hash,account_id,session_ref,authenticated_credential_id,created_at,expires_at) " +
      "SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM auth_challenges WHERE challenge_id = ? AND used_at = ?) " +
      "AND EXISTS(SELECT 1 FROM auth_passkeys WHERE credential_id = ? AND active = 1 AND sign_count = ?)"
    ).bind(tokenHash, row.account_id, sessionRef, credentialId, now, expires, challengeId, marker, credentialId, verified.authenticationInfo.newCounter),
    db.prepare(
      "INSERT INTO auth_security_audit(audit_id,account_id,event_type,created_at,detail) " +
      "SELECT ?,?,'passkey_sign_in',?,'user_verified=true' WHERE EXISTS(SELECT 1 FROM auth_sessions WHERE token_hash = ?)"
    ).bind(b64u(bytes(16)), row.account_id, timestamp, tokenHash),
  ];
  await db.batch(queries);
  const account = await activeAccount(db, new Request(config.origin, { headers: { Cookie: SESSION_COOKIE + "=" + token } }));
  if (!account) throw fail(401, "Passkey sign-in could not be completed. Start again.");
  const result = await summary(db, account);
  result.message = "You are signed in to AstroCrown staging with your passkey.";
  return json(200, result, { "Set-Cookie": sessionCookie(token, new URL(config.origin)) });
}
async function issueRecovery(db, env, request, payload, config) {
  if (Object.keys(payload).some((key) => !["accountIdentifier", "recoveryKey"].includes(key))) throw fail(400, "Enter your account identifier and offline recovery key.");
  const identifier = accountId(payload.accountIdentifier);
  const keyValue = recoveryKey(payload.recoveryKey);
  await rateLimit(db, env, request, "account-recovery-ip", "recovery", 10, 3600);
  await rateLimit(db, env, request, "account-recovery-account", identifier, 5, 3600);
  const account = await db.prepare("SELECT account_id,user_handle FROM auth_accounts WHERE account_identifier = ? AND role = 'user'").bind(identifier).first();
  const activeKey = account ? await db.prepare(
    "SELECT key_version,salt_b64,verifier_b64 FROM auth_recovery_keys WHERE account_id = ? AND used_at IS NULL ORDER BY key_version DESC LIMIT 1"
  ).bind(account.account_id).first() : null;
  let valid = false;
  if (account && activeKey) {
    const salt = unb64u(activeKey.salt_b64);
    const keyBytes = new TextEncoder().encode(keyValue);
    const combined = new Uint8Array(salt.length + keyBytes.length);
    combined.set(salt);
    combined.set(keyBytes, salt.length);
    valid = equalConstantTime(await digest(combined), activeKey.verifier_b64);
  }
  if (!valid) throw fail(401, "Account recovery could not be started. Check the account identifier and recovery key.");
  const id = b64u(bytes(24));
  const challenge = b64u(bytes(32));
  const existing = await db.prepare("SELECT credential_id,transports_json FROM auth_passkeys WHERE account_id = ? AND active = 1").bind(account.account_id).all();
  const publicKey = await generateRegistrationOptions({
    rpName: config.rpName,
    rpID: config.rpId,
    userName: identifier,
    userDisplayName: "AstroCrown Member",
    userID: unb64u(account.user_handle),
    challenge,
    timeout: 60000,
    attestationType: "none",
    authenticatorSelection: { residentKey: "required", userVerification: "required" },
    excludeCredentials: (existing.results || []).map((item) => ({ id: item.credential_id, transports: JSON.parse(item.transports_json || "[]") })),
    supportedAlgorithmIDs: getDefaultSupportedAlgorithmIDs(),
  });
  const now = Math.floor(Date.now() / 1000);
  await createChallenge(db, {
    id, challenge: publicKey.challenge, ceremony: "recovery", accountId: account.account_id,
    accountIdentifier: identifier, userHandle: account.user_handle,
    payload: { keyVersion: Number(activeKey.key_version) }, now,
  });
  return json(200, { challengeId: id, publicKey, purpose: "replace-lost-passkey-using-one-time-recovery-key" });
}
async function completeRecovery(db, env, request, payload, config) {
  if (Object.keys(payload).some((key) => !["challengeId", "credential"].includes(key))) throw fail(400, "The passkey recovery response is incomplete.");
  const id = String(payload.challengeId || "");
  if (!/^[A-Za-z0-9_-]{24,64}$/.test(id) || !payload.credential || typeof payload.credential !== "object") throw fail(400, "A valid replacement passkey response is required.");
  await rateLimit(db, env, request, "account-recovery-complete", "recovery", 5, 3600);
  const now = Math.floor(Date.now() / 1000);
  const challenge = await db.prepare("SELECT * FROM auth_challenges WHERE challenge_id = ? AND ceremony = 'recovery' AND used_at IS NULL AND expires_at > ?").bind(id, now).first();
  if (!challenge) throw fail(410, "This account recovery request expired or was already used. Start again.");
  const challengePayload = JSON.parse(challenge.payload_json || "{}");
  const key = await db.prepare("SELECT key_version FROM auth_recovery_keys WHERE account_id = ? AND key_version = ? AND used_at IS NULL")
    .bind(challenge.account_id, Number(challengePayload.keyVersion)).first();
  if (!key) throw fail(410, "This recovery request is no longer valid. Start again.");
  const existing = await db.prepare("SELECT credential_id FROM auth_passkeys WHERE account_id = ? AND active = 1").bind(challenge.account_id).all();
  const credential = await verifiedPasskey(payload.credential, challenge, config, (existing.results || []).map((r) => r.credential_id));
  const nextKey = await newRecoveryKey();
  const token = b64u(bytes(32));
  const tokenHash = await hashText(token);
  const marker = b64u(bytes(18));
  const passkeyRef = hex(bytes(16));
  const sessionRef = hex(bytes(16));
  const timestamp = new Date().toISOString();
  const expires = now + SESSION_SECONDS;
  const nextVersion = Number(challengePayload.keyVersion) + 1;
  const queries = [
    db.prepare(
      "UPDATE auth_challenges SET used_at = ? WHERE challenge_id = ? AND ceremony = 'recovery' AND used_at IS NULL AND expires_at > ? " +
      "AND EXISTS(SELECT 1 FROM auth_recovery_keys WHERE account_id = ? AND key_version = ? AND used_at IS NULL)"
    ).bind(marker, id, now, challenge.account_id, Number(challengePayload.keyVersion)),
    db.prepare("UPDATE auth_passkeys SET active = 0 WHERE account_id = ? AND EXISTS(SELECT 1 FROM auth_challenges WHERE challenge_id = ? AND used_at = ?)").bind(challenge.account_id, id, marker),
    db.prepare(
      "INSERT INTO auth_passkeys(passkey_ref,display_label,credential_id,account_id,public_key_b64,credential_alg,sign_count,transports_json,device_type,backed_up,created_at,active) " +
      "SELECT ?,?,?,?,?,?,?,?,?,?,?,1 WHERE EXISTS(SELECT 1 FROM auth_challenges WHERE challenge_id = ? AND used_at = ?)"
    ).bind(passkeyRef, "Recovery replacement passkey", credential.id, challenge.account_id, credential.publicKey, credential.algorithm, credential.counter, JSON.stringify(credential.transports), credential.deviceType, Number(credential.backedUp), timestamp, id, marker),
    db.prepare(
      "UPDATE auth_recovery_keys SET used_at = ? WHERE account_id = ? AND key_version = ? AND used_at IS NULL " +
      "AND EXISTS(SELECT 1 FROM auth_challenges WHERE challenge_id = ? AND used_at = ?)"
    ).bind(timestamp, challenge.account_id, Number(challengePayload.keyVersion), id, marker),
    db.prepare(
      "INSERT INTO auth_recovery_keys(account_id,key_version,salt_b64,verifier_b64,created_at) " +
      "SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM auth_challenges WHERE challenge_id = ? AND used_at = ?)"
    ).bind(challenge.account_id, nextVersion, nextKey.salt, nextKey.verifier, timestamp, id, marker),
    db.prepare("DELETE FROM auth_sessions WHERE account_id = ? AND EXISTS(SELECT 1 FROM auth_challenges WHERE challenge_id = ? AND used_at = ?)").bind(challenge.account_id, id, marker),
    db.prepare(
      "INSERT INTO auth_sessions(token_hash,account_id,session_ref,authenticated_credential_id,created_at,expires_at) " +
      "SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM auth_challenges WHERE challenge_id = ? AND used_at = ?)"
    ).bind(tokenHash, challenge.account_id, sessionRef, credential.id, now, expires, id, marker),
    db.prepare(
      "INSERT INTO auth_security_audit(audit_id,account_id,event_type,created_at,detail) " +
      "SELECT ?,?,'account_recovered_with_recovery_key',?,? WHERE EXISTS(SELECT 1 FROM auth_sessions WHERE token_hash = ?)"
    ).bind(b64u(bytes(16)), challenge.account_id, timestamp, "previous_recovery_version=" + challengePayload.keyVersion + ";new_recovery_version=" + nextVersion, tokenHash),
  ];
  await db.batch(queries);
  const account = await activeAccount(db, new Request(config.origin, { headers: { Cookie: SESSION_COOKIE + "=" + token } }));
  if (!account) throw fail(410, "The recovery operation could not be completed. Start again.");
  const result = await summary(db, account);
  result.oneTimeRecoveryKey = nextKey.value;
  result.recoveryKeyVersion = nextVersion;
  result.recovered = true;
  result.message = "Account recovery completed. Previous passkeys and sessions were revoked. Save your new offline recovery key now; the previous key has been consumed.";
  return json(200, result, { "Set-Cookie": sessionCookie(token, new URL(config.origin)) });
}
async function diagnostics() {
  const algorithms = getDefaultSupportedAlgorithmIDs().map(Number);
  const cryptoSupport = {};
  for (const name of ["ML-DSA-44", "ML-DSA-65", "ML-DSA-87"]) {
    let canSign = false;
    let canVerify = false;
    try { canSign = Boolean(globalThis.SubtleCrypto?.supports?.("sign", name)); } catch { canSign = false; }
    try { canVerify = Boolean(globalThis.SubtleCrypto?.supports?.("verify", name)); } catch { canVerify = false; }
    cryptoSupport[name] = { sign: canSign, verify: canVerify };
  }
  const mlDsa44Advertised = algorithms.includes(-48);
  return {
    runtime: "cloudflare-workers",
    simpleWebAuthnSupportedRegistrationAlgorithms: algorithms,
    webCryptoMlDsaSupport: cryptoSupport,
    mlDsa44VerificationSupported: cryptoSupport["ML-DSA-44"].verify,
    mlDsa44RegistrationPreferred: mlDsa44Advertised,
    pqcRegistrationAlgorithmAdvertised: mlDsa44Advertised,
    note: "SimpleWebAuthn offers ML-DSA-44 first when the runtime supports verification. A real authenticator must register a credential whose stored COSE alg is -48 and later complete a valid assertion before that account is counted as post-quantum.",
  };
}
async function status(db, request) {
  const account = await activeAccount(db, request);
  if (account) return json(200, await summary(db, account));
  return json(200, {
    authenticated: false, avatarId: "person", role: "user", adminRoleAssigned: false,
    adminWalletCount: 0, adminWalletAuthenticated: false, adminSessionAuthorized: false,
    admin: false, adminWalletAddress: null, adminSessionExpiresAt: null,
    passkeyAvailable: true, emailVerificationDeliveryAvailable: false, passwordResetAvailable: false,
    mlDsaRegistrationAvailable: getDefaultSupportedAlgorithmIDs().map(Number).includes(-48),
    activeSessionCount: 0, securityManagementAvailable: false, scope: "staging-test-account-only",
  });
}
async function logout(db, request, config) {
  const token = cookie(request, SESSION_COOKIE);
  if (token) await db.prepare("DELETE FROM auth_sessions WHERE token_hash = ?").bind(await hashText(token)).run();
  return json(200, { authenticated: false, message: "You are signed out." }, { "Set-Cookie": clearCookie(new URL(config.origin)) });
}
async function avatar(db, request, payload) {
  const account = await activeAccount(db, request);
  if (!account) throw fail(401, "Sign in before changing your avatar.");
  if (Object.keys(payload).length !== 1 || !AVATARS.includes(payload.avatarId)) throw fail(400, "Choose one of the available AstroCrown avatars.");
  await db.prepare("UPDATE auth_accounts SET avatar_id = ? WHERE account_id = ?").bind(payload.avatarId, account.account_id).run();
  const updated = await activeAccount(db, new Request(request.url, { headers: { Cookie: SESSION_COOKIE + "=" + cookie(request, SESSION_COOKIE) } }));
  return json(200, await summary(db, updated));
}
async function communications(db, request) {
  if (!(await activeAccount(db, request))) throw fail(401, "Sign in to view account communications.");
  return json(200, { items: [], unreadCounts: { alerts: 0, messages: 0 }, nextCursor: null, available: false, message: "Staging communications are disabled in this qualification build." });
}
async function api(request, env, config) {
  const url = new URL(request.url);
  const db = env.DB;
  if (url.pathname === "/api/diagnostics/runtime" && request.method === "GET") return json(200, await diagnostics());
  if (url.pathname === "/api/account/status" && request.method === "GET") return status(db, request);
  if (url.pathname === "/api/account/security" && request.method === "GET") return securityStatus(db, request);
  if (url.pathname === "/api/account/communications" && request.method === "GET") return communications(db, request);
  if (url.pathname === "/api/admin/wallet-options" && request.method === "GET") return adminWalletOptions(db, request);
  if (url.pathname === "/api/admin/status" && request.method === "GET") {
    const account = await activeAccount(db, request);
    if (!account) throw fail(401, "Sign in before opening administrator services.");
    const state = await summary(db, account);
    if (state.adminRoleAssigned !== true) throw fail(403, "Administrator authority has not been assigned to this account.");
    if (state.adminSessionAuthorized !== true) throw fail(403, "A fresh signature from an active enrolled administrator wallet is required.");
    return json(200, state);
  }
  if (request.method === "GET" || request.method === "HEAD") throw fail(404, "The account endpoint does not exist.");
  if (request.method !== "POST") throw fail(405, "The account endpoint requires POST.");
  const payload = await bodyJson(request);
  if (url.pathname === "/api/admin/wallet-enrollment-challenge") return issueAdminWalletEnrollmentChallenge(db, env, request, payload, config);
  if (url.pathname === "/api/admin/wallet-enrollment-verify") return verifyAdminWalletEnrollment(db, env, request, payload);
  if (url.pathname === "/api/admin/wallet-challenge") return issueAdminWalletChallenge(db, env, request, payload, config);
  if (url.pathname === "/api/admin/wallet-verify") return verifyAdminWalletChallenge(db, env, request, payload, config);
  if (url.pathname === "/api/admin/wallet-logout") return endAdminWalletSession(db, request, payload);
  if (url.pathname === "/api/admin/wallet-revoke") return revokeAdminWallet(db, request, payload);
  if (url.pathname === "/api/admin/roles/grant") return grantAdminRole(db, request, payload);
  if (url.pathname === "/api/admin/roles/revoke") return revokeAdminRole(db, request, payload);
  if (url.pathname === "/api/account/administrator-notice/acknowledge") return acknowledgeAdminRevocationNotice(db, request, payload);
  if (url.pathname === "/api/account/security/step-up/options") return issueSecurityStepUp(db, env, request, payload, config);
  if (url.pathname === "/api/account/security/step-up/verify") return verifySecurityStepUp(db, env, request, payload, config);
  if (url.pathname === "/api/account/security/passkeys/add/options") return addPasskeyOptions(db, env, request, payload, config);
  if (url.pathname === "/api/account/security/passkeys/add/verify") return addPasskeyVerify(db, env, request, payload, config);
  if (url.pathname === "/api/account/security/passkeys/rename") return renamePasskey(db, request, payload);
  if (url.pathname === "/api/account/security/passkeys/revoke") return revokePasskey(db, env, request, payload);
  if (url.pathname === "/api/account/security/sessions/revoke") return revokeSessions(db, request, payload);
  if (url.pathname === "/api/account/security/recovery/rotate") return rotateRecoveryKey(db, request, payload);
  if (url.pathname === "/api/passkeys/register/options") return issueRegistration(db, env, request, payload, config);
  if (url.pathname === "/api/passkeys/register/verify") return verifyRegistration(db, env, request, payload, config);
  if (url.pathname === "/api/passkeys/authentication/options") return issueAuthentication(db, env, request, config);
  if (url.pathname === "/api/passkeys/authentication/verify") return verifyAuthentication(db, env, request, payload, config);
  if (url.pathname === "/api/account/recovery/options") return issueRecovery(db, env, request, payload, config);
  if (url.pathname === "/api/account/recovery/complete") return completeRecovery(db, env, request, payload, config);
  if (url.pathname === "/api/account/logout") return logout(db, request, config);
  if (url.pathname === "/api/account/avatar") return avatar(db, request, payload);
  if (url.pathname === "/api/account/communications/page" || url.pathname === "/api/account/communications/state") return communications(db, request);
  if (url.pathname.startsWith("/api/admin/")) throw fail(403, "Administrator services require a server-assigned role and a fresh authorized administrator wallet session.");
  throw fail(404, "The requested account endpoint does not exist.");
}
async function staticAssets(request, env) {
  const asset = await env.ASSETS.fetch(request);
  const headers = secureHeaders(asset.headers);
  const path = new URL(request.url).pathname;
  if (path === "/" || path.endsWith(".html") || path === "/index.html") headers.set("Cache-Control", "no-store, max-age=0");
  return new Response(asset.body, { status: asset.status, statusText: asset.statusText, headers });
}
export {
  b64u as base64url,
  unb64u as fromBase64url,
  equalConstantTime,
  accountId as validateAccountIdentifier,
  recoveryKey as validateRecoveryKey,
  validateAdminReason,
  validateAdminPermissions,
  normalizeEvmAddress,
  validateEvmChainId,
  createAdminSiweMessage,
  verifyAdminSiweSignature,
  diagnostics,
};
export default {
  async fetch(request, env) {
    try {
      const restricted = gate(request, env);
      if (restricted) return restricted;
      const config = configuration(env, request);
      if (request.method === "OPTIONS") return json(405, { error: "Cross-origin requests are not enabled." });
      if (new URL(request.url).origin !== config.origin) return json(403, { error: "The request host could not be verified." });
      if (new URL(request.url).pathname.startsWith("/api/")) {
        checkOrigin(request, config);
        return await api(request, env, config);
      }
      return await staticAssets(request, env);
    } catch (error) {
      const code = Number(error?.status) || 500;
      return json(code, { error: code < 500 ? error.message : "The staging account service encountered an unexpected error." });
    }
  },
};
