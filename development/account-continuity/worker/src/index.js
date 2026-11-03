import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  getDefaultSupportedAlgorithmIDs,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { decodeCredentialPublicKey } from "@simplewebauthn/server/helpers";

const SESSION_COOKIE = "acrown_account_session";
const SESSION_SECONDS = 1800;
const CHALLENGE_SECONDS = 300;
const MAX_BODY_BYTES = 65536;
const TERMS_VERSION = "development-terms-2026-10-31-v0.3";
const AVATARS = ["person", "crown", "star", "moon", "orbit", "shield"];
const PQ_ALGS = [-48, -49, -50];

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
    "SELECT a.*, s.expires_at FROM auth_sessions s JOIN auth_accounts a ON a.account_id = s.account_id WHERE s.token_hash = ? AND s.expires_at > ?"
  ).bind(tokenHash, now).first();
  if (!row) await db.prepare("DELETE FROM auth_sessions WHERE token_hash = ?").bind(tokenHash).run();
  return row || null;
}
async function summary(db, account) {
  const now = Math.floor(Date.now() / 1000);
  const counts = await db.prepare(
    "SELECT " +
    "(SELECT COUNT(*) FROM auth_passkeys WHERE account_id = ? AND active = 1) AS passkey_count, " +
    "(SELECT COUNT(*) FROM auth_passkeys WHERE account_id = ? AND active = 1 AND credential_alg IN (-48,-49,-50)) AS pq_count, " +
    "(SELECT COUNT(*) FROM auth_recovery_keys WHERE account_id = ? AND used_at IS NULL) AS recovery_count, " +
    "(SELECT COUNT(*) FROM auth_sessions WHERE account_id = ? AND expires_at > ?) AS session_count"
  ).bind(account.account_id, account.account_id, account.account_id, account.account_id, now).first();
  const algorithmRows = await db.prepare(
    "SELECT credential_alg FROM auth_passkeys WHERE account_id = ? AND active = 1 ORDER BY created_at, credential_id"
  ).bind(account.account_id).all();
  const passkeyAlgorithmIds = (algorithmRows.results || []).map((row) => Number(row.credential_alg));
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
    scope: "staging-test-account-only",
    role: "user",
    adminRoleAssigned: false,
    adminPermissions: [],
    adminDelegablePermissions: [],
    adminWalletCount: 0,
    adminWalletAuthenticated: false,
    adminSessionAuthorized: false,
    admin: false,
    adminWalletAddress: null,
    adminSessionExpiresAt: null,
    administratorRevocationNotice: null,
    communicationsUnreadCounts: { alerts: 0, messages: 0 },
  };
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
      "INSERT INTO auth_passkeys(credential_id,account_id,public_key_b64,credential_alg,sign_count,transports_json,device_type,backed_up,created_at,active) " +
      "SELECT ?,?,?,?,?,?,?,?, ?,1 WHERE EXISTS(SELECT 1 FROM auth_challenges WHERE challenge_id = ? AND used_at = ?)"
    ).bind(credential.id, challenge.account_id, credential.publicKey, credential.algorithm, credential.counter, JSON.stringify(credential.transports), credential.deviceType, Number(credential.backedUp), created, challengeId, marker),
    db.prepare(
      "INSERT INTO auth_recovery_keys(account_id,key_version,salt_b64,verifier_b64,created_at) " +
      "SELECT ?,1,?,?,? WHERE EXISTS(SELECT 1 FROM auth_challenges WHERE challenge_id = ? AND used_at = ?)"
    ).bind(challenge.account_id, recovery.salt, recovery.verifier, created, challengeId, marker),
    db.prepare(
      "INSERT INTO auth_sessions(token_hash,account_id,created_at,expires_at) " +
      "SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM auth_challenges WHERE challenge_id = ? AND used_at = ?)"
    ).bind(tokenHash, challenge.account_id, now, expires, challengeId, marker),
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
  const expires = now + SESSION_SECONDS;
  const timestamp = new Date().toISOString();
  const queries = [
    db.prepare("UPDATE auth_challenges SET used_at = ? WHERE challenge_id = ? AND ceremony = 'authentication' AND used_at IS NULL AND expires_at > ?").bind(marker, challengeId, now),
    db.prepare(
      "UPDATE auth_passkeys SET sign_count = ?, last_used_at = ? WHERE credential_id = ? AND active = 1 " +
      "AND EXISTS(SELECT 1 FROM auth_challenges WHERE challenge_id = ? AND used_at = ?)"
    ).bind(verified.authenticationInfo.newCounter, timestamp, credentialId, challengeId, marker),
    db.prepare(
      "INSERT INTO auth_sessions(token_hash,account_id,created_at,expires_at) " +
      "SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM auth_challenges WHERE challenge_id = ? AND used_at = ?) " +
      "AND EXISTS(SELECT 1 FROM auth_passkeys WHERE credential_id = ? AND active = 1 AND sign_count = ?)"
    ).bind(tokenHash, row.account_id, now, expires, challengeId, marker, credentialId, verified.authenticationInfo.newCounter),
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
      "INSERT INTO auth_passkeys(credential_id,account_id,public_key_b64,credential_alg,sign_count,transports_json,device_type,backed_up,created_at,active) " +
      "SELECT ?,?,?,?,?,?,?,?, ?,1 WHERE EXISTS(SELECT 1 FROM auth_challenges WHERE challenge_id = ? AND used_at = ?)"
    ).bind(credential.id, challenge.account_id, credential.publicKey, credential.algorithm, credential.counter, JSON.stringify(credential.transports), credential.deviceType, Number(credential.backedUp), timestamp, id, marker),
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
      "INSERT INTO auth_sessions(token_hash,account_id,created_at,expires_at) " +
      "SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM auth_challenges WHERE challenge_id = ? AND used_at = ?)"
    ).bind(tokenHash, challenge.account_id, now, expires, id, marker),
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
    activeSessionCount: 0, scope: "staging-test-account-only",
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
  if (url.pathname === "/api/account/communications" && request.method === "GET") return communications(db, request);
  if (request.method === "GET" || request.method === "HEAD") throw fail(404, "The account endpoint does not exist.");
  if (request.method !== "POST") throw fail(405, "The account endpoint requires POST.");
  const payload = await bodyJson(request);
  if (url.pathname === "/api/passkeys/register/options") return issueRegistration(db, env, request, payload, config);
  if (url.pathname === "/api/passkeys/register/verify") return verifyRegistration(db, env, request, payload, config);
  if (url.pathname === "/api/passkeys/authentication/options") return issueAuthentication(db, env, request, config);
  if (url.pathname === "/api/passkeys/authentication/verify") return verifyAuthentication(db, env, request, payload, config);
  if (url.pathname === "/api/account/recovery/options") return issueRecovery(db, env, request, payload, config);
  if (url.pathname === "/api/account/recovery/complete") return completeRecovery(db, env, request, payload, config);
  if (url.pathname === "/api/account/logout") return logout(db, request, config);
  if (url.pathname === "/api/account/avatar") return avatar(db, request, payload);
  if (url.pathname === "/api/account/communications/page" || url.pathname === "/api/account/communications/state") return communications(db, request);
  if (url.pathname.startsWith("/api/admin/")) throw fail(403, "Administrator services are not enabled in the ordinary-user staging qualification.");
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
