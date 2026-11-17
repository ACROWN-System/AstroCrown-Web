import { MAINNET_USDT_CONFIG } from "../../../supporter-programme/shared/mainnet-config.mjs";
import {
  getAddress,
  isAddress,
  keccak256,
  recoverAddress,
  recoverMessageAddress,
  toBytes,
} from "viem";

const NETWORK_ORDER = ["ethereum", "tron", "solana"];
const CANONICAL_NETWORKS = MAINNET_USDT_CONFIG;
const SESSION_COOKIE = "acrown_supporter_session";
const SESSION_SECONDS = 12 * 60 * 60;
const CHALLENGE_SECONDS = 10 * 60;
const MAX_BODY_BYTES = 16_384;
const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function json(status, body, headers = {}) {
  const h = new Headers(headers);
  h.set("Content-Type", "application/json; charset=utf-8");
  h.set("Cache-Control", "no-store, max-age=0");
  h.set("X-Content-Type-Options", "nosniff");
  h.set("Referrer-Policy", "no-referrer");
  h.set("X-Frame-Options", "DENY");
  h.set("Cross-Origin-Resource-Policy", "same-origin");
  return new Response(JSON.stringify(body), { status, headers: h });
}

function httpError(status, message) {
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

function fromBase64url(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/.test(value)) {
    throw httpError(400, "The signature encoding is invalid.");
  }
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function hex(bytes) {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

function fromHex(value) {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]{128,130}$/.test(value)) {
    throw httpError(400, "The wallet signature has an invalid format.");
  }
  const text = value.slice(2);
  if (text.length !== 130) throw httpError(400, "The wallet signature must contain 65 bytes.");
  return Uint8Array.from(text.match(/.{2}/g), (part) => Number.parseInt(part, 16));
}

async function sha256(value) {
  const data = typeof value === "string" ? new TextEncoder().encode(value) : value;
  return new Uint8Array(await crypto.subtle.digest("SHA-256", data));
}

async function hashText(value) {
  return base64url(await sha256(value));
}

function constantTimeEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string" || left.length !== right.length) return false;
  let different = 0;
  for (let index = 0; index < left.length; index += 1) {
    different |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return different === 0;
}

function bytesToBigInt(bytes) {
  let value = 0n;
  for (const byte of bytes) value = (value << 8n) | BigInt(byte);
  return value;
}

function base58Decode(value) {
  if (typeof value !== "string" || value.length < 1 || value.length > 64) {
    throw httpError(400, "The wallet address is invalid.");
  }
  let number = 0n;
  for (const character of value) {
    const digit = BASE58.indexOf(character);
    if (digit < 0) throw httpError(400, "The wallet address contains invalid base58 characters.");
    number = number * 58n + BigInt(digit);
  }
  const decoded = [];
  while (number > 0n) {
    decoded.push(Number(number & 255n));
    number >>= 8n;
  }
  decoded.reverse();
  let leadingZeros = 0;
  while (leadingZeros < value.length && value[leadingZeros] === "1") leadingZeros += 1;
  return Uint8Array.from([...new Array(leadingZeros).fill(0), ...decoded]);
}

function base58Encode(bytes) {
  let number = bytesToBigInt(bytes);
  let encoded = "";
  while (number > 0n) {
    const remainder = Number(number % 58n);
    encoded = BASE58[remainder] + encoded;
    number /= 58n;
  }
  let leadingZeros = 0;
  while (leadingZeros < bytes.length && bytes[leadingZeros] === 0) leadingZeros += 1;
  return "1".repeat(leadingZeros) + (encoded || (leadingZeros === 0 ? "1" : ""));
}

async function tronChecksum(payload) {
  return (await sha256(await sha256(payload))).slice(0, 4);
}

async function normalizeWalletAddress(network, address) {
  if (typeof address !== "string" || address.length > 128) {
    throw httpError(400, "Enter a valid public wallet address.");
  }
  if (network === "ethereum") {
    if (!isAddress(address)) throw httpError(400, "The Ethereum wallet address is invalid.");
    const normalized = getAddress(address);
    return { address: normalized, normalized: normalized.toLowerCase() };
  }
  if (network === "tron") {
    const decoded = base58Decode(address);
    if (decoded.length !== 25 || decoded[0] !== 0x41) {
      throw httpError(400, "The Tron address is not a valid mainnet Base58Check address.");
    }
    const payload = decoded.slice(0, 21);
    const expected = await tronChecksum(payload);
    if (!constantTimeEqual(hex(decoded.slice(21)), hex(expected))) {
      throw httpError(400, "The Tron address checksum is invalid.");
    }
    const canonical = base58Encode(decoded);
    if (canonical !== address) throw httpError(400, "The Tron address is not canonical.");
    return { address: canonical, normalized: canonical };
  }
  if (network === "solana") {
    const decoded = base58Decode(address);
    if (decoded.length !== 32 || base58Encode(decoded) !== address) {
      throw httpError(400, "The Solana wallet must be a canonical 32-byte public address.");
    }
    return { address, normalized: address };
  }
  throw httpError(400, "Only Ethereum, Tron and Solana mainnet wallets are supported.");
}

function normalizeUsername(value) {
  if (typeof value !== "string") throw httpError(400, "Enter a member name.");
  const username = value.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{2,27}$/.test(username)) {
    throw httpError(400, "Member names must be 3–28 characters using letters, numbers, hyphens or underscores.");
  }
  return { username, normalized: username.toLowerCase() };
}

function normalizeRole(network, role) {
  const selected = role || "PAYMENT";
  if (!["PAYMENT", "ACROWN_DELIVERY", "PAYMENT_AND_DELIVERY"].includes(selected)) {
    throw httpError(400, "The wallet purpose is not supported.");
  }
  if (selected !== "PAYMENT" && network !== "solana") {
    throw httpError(400, "ACROWN delivery wallets must be on Solana.");
  }
  return selected;
}

function newId(prefix) {
  return prefix + "_" + base64url(randomBytes(18));
}

function sessionCookie(token, origin) {
  const secure = new URL(origin).protocol === "https:" ? "; Secure" : "";
  return SESSION_COOKIE + "=" + token +
    "; Path=/api/supporters; Max-Age=" + SESSION_SECONDS +
    "; HttpOnly; SameSite=Strict" + secure;
}

function clearSessionCookie(origin) {
  const secure = new URL(origin).protocol === "https:" ? "; Secure" : "";
  return SESSION_COOKIE + "=; Path=/api/supporters; Max-Age=0; HttpOnly; SameSite=Strict" + secure;
}

function getCookie(request, name) {
  const cookies = request.headers.get("Cookie") || "";
  for (const part of cookies.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    if (part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }
  return "";
}

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return base64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message))));
}

async function applyRateLimit(db, env, request, action, maximum, seconds) {
  const secret = typeof env.RATE_LIMIT_HMAC_KEY === "string" && env.RATE_LIMIT_HMAC_KEY.length >= 32
    ? env.RATE_LIMIT_HMAC_KEY
    : env.ENVIRONMENT === "local" ? "local-development-only-supporter-rate-key" : "";
  if (!secret) throw httpError(503, "Supporter abuse controls are not configured.");
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const scopeDigest = await hmac(secret, "supporter-rate\0" + action + "\0" + ip);
  const now = Math.floor(Date.now() / 1000);
  const cutoff = now - seconds;
  const result = await db.prepare(
    "INSERT INTO supporter_rate_limits(scope_digest,window_started_at,request_count,updated_at) " +
    "VALUES(?,?,1,?) " +
    "ON CONFLICT(scope_digest) DO UPDATE SET " +
    "window_started_at=CASE WHEN supporter_rate_limits.window_started_at <= ? THEN excluded.window_started_at ELSE supporter_rate_limits.window_started_at END, " +
    "request_count=CASE WHEN supporter_rate_limits.window_started_at <= ? THEN 1 ELSE supporter_rate_limits.request_count + 1 END, " +
    "updated_at=excluded.updated_at " +
    "WHERE supporter_rate_limits.window_started_at <= ? OR supporter_rate_limits.request_count < ?"
  ).bind(scopeDigest, now, now, cutoff, cutoff, cutoff, maximum).run();
  if (Number(result.meta?.changes || 0) !== 1) {
    throw httpError(429, "Too many requests. Please wait before trying again.");
  }
}

function createWalletMessage({ origin, address, network, purpose, challengeId, nonce, issuedAt, expiresAt }) {
  const url = new URL(origin);
  const uri = origin + "/supporters/";
  const statement = "AstroCrown Genesis Programme wallet ownership proof. This is an off-chain message signature only. It does not authorize or submit a blockchain transaction.";
  if (network === "ethereum") {
    return [
      url.host + " wants you to sign in with your Ethereum account:",
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
      "- urn:astrocrown:supporter:network:ethereum",
      "- urn:astrocrown:supporter:purpose:" + purpose.toLowerCase(),
    ].join("\n");
  }
  return [
    "AstroCrown Genesis Programme wallet ownership proof",
    "Domain: " + url.host,
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

async function createChallenge(db, env, request, config, {
  purpose,
  memberId,
  username,
  network,
  address,
  walletRole = "PAYMENT",
  walletId = null,
}) {
  const normalizedAddress = await normalizeWalletAddress(network, address);
  const role = normalizeRole(network, walletRole);
  const now = Math.floor(Date.now() / 1000);
  const challengeId = newId("wch");
  const nonce = base64url(randomBytes(18));
  const issuedAt = new Date(now * 1000).toISOString();
  const expiresAtSeconds = now + CHALLENGE_SECONDS;
  const expiresAt = new Date(expiresAtSeconds * 1000).toISOString();
  const message = createWalletMessage({
    origin: config.origin,
    address: normalizedAddress.address,
    network,
    purpose,
    challengeId,
    nonce,
    issuedAt,
    expiresAt,
  });
  const [nonceDigest, messageDigest] = await Promise.all([hashText(nonce), hashText(message)]);
  await db.prepare(
    "INSERT INTO supporter_wallet_challenges(" +
    "challenge_id,member_id,wallet_id,network,address_normalized,nonce_digest,domain,message_digest," +
    "created_at,expires_at,challenge_purpose,wallet_role,message" +
    ") VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)"
  ).bind(
    challengeId, memberId, walletId, network, normalizedAddress.normalized,
    nonceDigest, new URL(config.origin).host, messageDigest, now, expiresAtSeconds,
    purpose, role, message,
  ).run();
  return {
    challengeId,
    message,
    network,
    address: normalizedAddress.address,
    walletRole: role,
    purpose,
    expiresAt,
    signatureMethod: network === "ethereum"
      ? "personal_sign (off-chain only)"
      : network === "tron" ? "TronLink signMessageV2 (off-chain only)" : "Solana Wallet Standard signMessage (off-chain only)",
  };
}

async function verifyWalletSignature(challenge, signature) {
  const message = challenge.message;
  if (typeof signature !== "string" || signature.length > 512) return false;
  try {
    if (challenge.network === "ethereum") {
      if (!/^0x[0-9a-fA-F]{130}$/.test(signature)) return false;
      const recovered = await recoverMessageAddress({ message, signature });
      return recovered.toLowerCase() === challenge.address_normalized.toLowerCase();
    }
    if (challenge.network === "tron") {
      if (!/^0x[0-9a-fA-F]{130}$/.test(signature)) return false;
      const byteLength = new TextEncoder().encode(message).length;
      const prefix = "\x19TRON Signed Message:\n" + String(byteLength);
      const digest = keccak256(new Uint8Array([...toBytes(prefix), ...toBytes(message)]));
      const recoveredHex = await recoverAddress({ hash: digest, signature });
      const recoveredPayload = new Uint8Array([0x41, ...toBytes(recoveredHex)]);
      const checksum = await tronChecksum(recoveredPayload);
      const recoveredAddress = base58Encode(new Uint8Array([...recoveredPayload, ...checksum]));
      return recoveredAddress === challenge.address_normalized;
    }
    if (challenge.network === "solana") {
      const publicKey = base58Decode(challenge.address_normalized);
      const signatureBytes = fromBase64url(signature);
      if (publicKey.length !== 32 || signatureBytes.length !== 64) return false;
      const key = await crypto.subtle.importKey("raw", publicKey, { name: "Ed25519" }, false, ["verify"]);
      return await crypto.subtle.verify("Ed25519", key, signatureBytes, new TextEncoder().encode(message));
    }
  } catch {
    return false;
  }
  return false;
}

async function consumeChallenge(db, challengeId, purpose, config) {
  if (typeof challengeId !== "string" || !/^wch_[A-Za-z0-9_-]{20,40}$/.test(challengeId)) {
    throw httpError(400, "The wallet challenge identifier is invalid.");
  }
  const now = Math.floor(Date.now() / 1000);
  const consumed = await db.prepare(
    "UPDATE supporter_wallet_challenges SET consumed_at=? " +
    "WHERE challenge_id=? AND challenge_purpose=? AND consumed_at IS NULL AND expires_at>?"
  ).bind(now, challengeId, purpose, now).run();
  if (Number(consumed.meta?.changes || 0) !== 1) {
    throw httpError(410, "This wallet challenge has expired or has already been used.");
  }
  const challenge = await db.prepare(
    "SELECT c.challenge_id,c.member_id,c.wallet_id,c.network,c.address_normalized,c.nonce_digest," +
    "c.domain,c.message_digest,c.created_at,c.expires_at,c.challenge_purpose,c.wallet_role,c.message," +
    "m.username,m.status AS member_status,m.registration_state " +
    "FROM supporter_wallet_challenges c JOIN supporter_members m ON m.member_id=c.member_id " +
    "WHERE c.challenge_id=?"
  ).bind(challengeId).first();
  if (!challenge || challenge.challenge_purpose !== purpose) {
    throw httpError(410, "This wallet challenge is no longer available.");
  }
  if (challenge.expires_at <= now || challenge.domain.length === 0 || !challenge.message) {
    throw httpError(410, "This wallet challenge has expired.");
  }
  if (!constantTimeEqual(await hashText(challenge.message), challenge.message_digest)) {
    throw httpError(409, "The stored wallet challenge has failed its integrity check.");
  }
  const nonceMatch = challenge.message.match(/^Nonce: ([A-Za-z0-9_-]{20,})$/m);
  if (!nonceMatch || !constantTimeEqual(await hashText(nonceMatch[1]), challenge.nonce_digest)) {
    throw httpError(409, "The stored wallet challenge nonce has failed its integrity check.");
  }
  if (config && challenge.domain !== new URL(config.origin).host) {
    throw httpError(409, "The wallet challenge was issued for a different website domain.");
  }
  return challenge;
}

async function createSession(db, memberId) {
  const token = base64url(randomBytes(32));
  const sessionId = newId("ses");
  const createdAt = Math.floor(Date.now() / 1000);
  const expiresAt = createdAt + SESSION_SECONDS;
  const secretDigest = await hashText(token);
  const result = await db.prepare(
    "INSERT INTO supporter_member_sessions(session_id,member_id,secret_digest,created_at,expires_at,last_used_at) " +
    "VALUES(?,?,?,?,?,?)"
  ).bind(sessionId, memberId, secretDigest, createdAt, expiresAt, createdAt).run();
  if (Number(result.meta?.changes || 0) !== 1) throw httpError(503, "The supporter session could not be created.");
  return { token, expiresAt };
}

async function currentMember(db, request) {
  const token = getCookie(request, SESSION_COOKIE);
  if (!token || token.length > 128) return null;
  const secretDigest = await hashText(token);
  const now = Math.floor(Date.now() / 1000);
  const row = await db.prepare(
    "SELECT m.member_id,m.username,m.created_at,m.status,m.registration_state,s.session_id,s.expires_at " +
    "FROM supporter_member_sessions s JOIN supporter_members m ON m.member_id=s.member_id " +
    "WHERE s.secret_digest=? AND s.revoked_at IS NULL AND s.expires_at>? " +
    "AND m.status='ACTIVE' AND m.registration_state='VERIFIED' LIMIT 1"
  ).bind(secretDigest, now).first();
  if (!row) return null;
  await db.prepare("UPDATE supporter_member_sessions SET last_used_at=? WHERE session_id=? AND revoked_at IS NULL")
    .bind(now, row.session_id).run();
  return row;
}

async function displayAddress(challenge) {
  return challenge.network === "ethereum"
    ? getAddress(challenge.address_normalized)
    : challenge.address_normalized;
}

async function memberProfile(db, member) {
  const wallets = await db.prepare(
    "SELECT wallet_id,network,address,wallet_role,ownership_verified_at,proof_method,created_at " +
    "FROM supporter_wallets WHERE member_id=? ORDER BY created_at,network"
  ).bind(member.member_id).all();
  return {
    member: {
      memberId: member.member_id,
      username: member.username,
      status: member.status,
      registeredAt: new Date(Number(member.created_at) * 1000).toISOString(),
    },
    wallets: (wallets.results || []).map((wallet) => ({
      walletId: wallet.wallet_id,
      network: wallet.network,
      address: wallet.address,
      role: wallet.wallet_role,
      ownershipVerifiedAt: wallet.ownership_verified_at
        ? new Date(Number(wallet.ownership_verified_at) * 1000).toISOString()
        : null,
      proofMethod: wallet.proof_method,
    })),
    paymentStatus: "DISABLED",
    contributionsAccepted: false,
  };
}

async function cleanExpiredRegistrationReservations(db, now) {
  await db.prepare(
    "DELETE FROM supporter_wallet_challenges WHERE expires_at<=? AND challenge_purpose='REGISTER'"
  ).bind(now).run();
  await db.prepare(
    "DELETE FROM supporter_members WHERE registration_state IN ('PENDING','EXPIRED') " +
    "AND registration_expires_at IS NOT NULL AND registration_expires_at<=? " +
    "AND NOT EXISTS (SELECT 1 FROM supporter_wallet_challenges c WHERE c.member_id=supporter_members.member_id) " +
    "AND NOT EXISTS (SELECT 1 FROM supporter_wallets w WHERE w.member_id=supporter_members.member_id)"
  ).bind(now).run();
}

async function registrationChallenge(db, env, request, payload, config) {
  await applyRateLimit(db, env, request, "registration-challenge", 8, 3600);
  const { username, normalized } = normalizeUsername(payload.username);
  const network = payload.network;
  if (!NETWORK_ORDER.includes(network)) throw httpError(400, "Choose Ethereum, Tron or Solana.");
  const address = await normalizeWalletAddress(network, payload.address);
  const role = normalizeRole(network, payload.walletRole || "PAYMENT");
  if (role !== "PAYMENT") {
    throw httpError(400, "Register the first wallet as a payment wallet. A Solana delivery wallet can be added after registration.");
  }
  const now = Math.floor(Date.now() / 1000);
  await cleanExpiredRegistrationReservations(db, now);
  const usernameTaken = await db.prepare(
    "SELECT 1 AS found FROM supporter_members WHERE username_normalized=? LIMIT 1"
  ).bind(normalized).first();
  if (usernameTaken) throw httpError(409, "That member name is already reserved. Choose another.");
  const existingWallet = await db.prepare(
    "SELECT 1 AS found FROM supporter_wallets WHERE network=? AND address_normalized=? LIMIT 1"
  ).bind(network, address.normalized).first();
  if (existingWallet) throw httpError(409, "That wallet already belongs to a supporter. Sign in or use the account recovery process.");
  const memberId = newId("mem");
  const reserveUntil = now + CHALLENGE_SECONDS;
  const challengeId = newId("wch");
  const nonce = base64url(randomBytes(18));
  const message = createWalletMessage({
    origin: config.origin,
    address: address.address,
    network,
    purpose: "REGISTER",
    challengeId,
    nonce,
    issuedAt: new Date(now * 1000).toISOString(),
    expiresAt: new Date(reserveUntil * 1000).toISOString(),
  });
  const [nonceDigest, messageDigest] = await Promise.all([hashText(nonce), hashText(message)]);
  try {
    await db.batch([
      db.prepare(
        "INSERT INTO supporter_members(member_id,username,username_normalized,status,created_at,updated_at," +
        "registration_state,registration_expires_at) VALUES(?,?,?,'ACTIVE',?,?,'PENDING',?)"
      ).bind(memberId, username, normalized, now, now, reserveUntil),
      db.prepare(
        "INSERT INTO supporter_wallet_challenges(" +
        "challenge_id,member_id,wallet_id,network,address_normalized,nonce_digest,domain,message_digest," +
        "created_at,expires_at,challenge_purpose,wallet_role,message" +
        ") VALUES(?,?,NULL,?,?,?,?,?,?,?,?,?,?)"
      ).bind(
        challengeId, memberId, network, address.normalized, nonceDigest, new URL(config.origin).host,
        messageDigest, now, reserveUntil, "REGISTER", "PAYMENT", message,
      ),
    ]);
  } catch {
    throw httpError(409, "The member name or wallet was reserved at the same time. Refresh and try another name.");
  }
  return json(200, {
    challengeId,
    username,
    network,
    address: address.address,
    walletRole: "PAYMENT",
    message,
    expiresAt: new Date(reserveUntil * 1000).toISOString(),
    signatureMethod: network === "ethereum"
      ? "personal_sign (off-chain only)"
      : network === "tron" ? "TronLink signMessageV2 (off-chain only)" : "Solana Wallet Standard signMessage (off-chain only)",
    notice: "Signing proves control of this public wallet address. It does not send USDT, move tokens, approve a contract or pay a network fee.",
  });
}

async function loginChallenge(db, env, request, payload, config) {
  await applyRateLimit(db, env, request, "login-challenge", 12, 3600);
  const network = payload.network;
  if (!NETWORK_ORDER.includes(network)) throw httpError(400, "Choose Ethereum, Tron or Solana.");
  const address = await normalizeWalletAddress(network, payload.address);
  const existing = await db.prepare(
    "SELECT w.wallet_id,w.member_id,w.wallet_role,m.username FROM supporter_wallets w " +
    "JOIN supporter_members m ON m.member_id=w.member_id " +
    "WHERE w.network=? AND w.address_normalized=? AND w.ownership_verified_at IS NOT NULL " +
    "AND m.status='ACTIVE' AND m.registration_state='VERIFIED' LIMIT 1"
  ).bind(network, address.normalized).first();
  if (!existing) throw httpError(404, "No verified supporter wallet matched. Check the network and address.");
  const challenge = await createChallenge(db, env, request, config, {
    purpose: "LOGIN",
    memberId: existing.member_id,
    network,
    address: address.address,
    walletRole: existing.wallet_role,
    walletId: existing.wallet_id,
  });
  return json(200, challenge);
}

async function loginVerify(db, env, request, payload, config) {
  await applyRateLimit(db, env, request, "login-verify", 16, 3600);
  const challenge = await consumeChallenge(db, payload.challengeId, "LOGIN", config);
  if (challenge.member_status !== "ACTIVE" || challenge.registration_state !== "VERIFIED") {
    throw httpError(401, "The supporter account is not available.");
  }
  if (!(await verifyWalletSignature(challenge, payload.signature))) {
    throw httpError(401, "The signature did not prove control of the registered wallet.");
  }
  const { token } = await createSession(db, challenge.member_id);
  const member = await db.prepare(
    "SELECT member_id,username,status,created_at FROM supporter_members WHERE member_id=?"
  ).bind(challenge.member_id).first();
  return json(200, await memberProfile(db, member), {
    "Set-Cookie": sessionCookie(token, config.origin),
  });
}

async function linkWalletChallenge(db, env, request, payload, config, member) {
  await applyRateLimit(db, env, request, "link-wallet", 12, 3600);
  const network = payload.network;
  if (!NETWORK_ORDER.includes(network)) throw httpError(400, "Choose Ethereum, Tron or Solana.");
  const address = await normalizeWalletAddress(network, payload.address);
  const role = normalizeRole(network, payload.walletRole || "PAYMENT");
  const owner = await db.prepare(
    "SELECT wallet_id,member_id,wallet_role FROM supporter_wallets WHERE network=? AND address_normalized=? LIMIT 1"
  ).bind(network, address.normalized).first();
  if (owner && owner.member_id !== member.member_id) {
    throw httpError(409, "That wallet is already associated with another supporter.");
  }

  let purpose = "LINK_WALLET";
  let challengeRole = role;
  let walletId = null;
  if (owner) {
    const currentRole = owner.wallet_role;
    const isDelivery = currentRole === "ACROWN_DELIVERY" || currentRole === "PAYMENT_AND_DELIVERY";
    if (network !== "solana" || role === "PAYMENT" || isDelivery) {
      throw httpError(409, "That wallet is already linked to this supporter with the requested purpose.");
    }
    // A Solana payment wallet can be designated as the ACROWN delivery wallet
    // only after a separate, explicit second signature challenge.
    purpose = "DELIVERY";
    challengeRole = "PAYMENT_AND_DELIVERY";
    walletId = owner.wallet_id;
  } else if (role === "ACROWN_DELIVERY") {
    purpose = "DELIVERY";
  }

  const challenge = await createChallenge(db, env, request, config, {
    purpose,
    memberId: member.member_id,
    network,
    address: address.address,
    walletRole: challengeRole,
    walletId,
  });
  return json(200, challenge);
}

async function linkWalletVerify(db, env, request, payload, config, member) {
  await applyRateLimit(db, env, request, "link-wallet-verify", 16, 3600);
  const purpose = payload.purpose === "DELIVERY" ? "DELIVERY" : "LINK_WALLET";
  const challenge = await consumeChallenge(db, payload.challengeId, purpose, config);
  if (challenge.member_id !== member.member_id || challenge.member_status !== "ACTIVE" ||
      challenge.registration_state !== "VERIFIED") {
    throw httpError(403, "This wallet challenge does not belong to the current supporter.");
  }
  if (!(await verifyWalletSignature(challenge, payload.signature))) {
    throw httpError(401, "The signature did not prove control of the new wallet.");
  }
  const now = Math.floor(Date.now() / 1000);
  try {
    if (purpose === "DELIVERY" && challenge.wallet_id) {
      const updated = await db.prepare(
        "UPDATE supporter_wallets SET wallet_role='PAYMENT_AND_DELIVERY',ownership_verified_at=?,proof_method='OFFCHAIN_MESSAGE' " +
        "WHERE wallet_id=? AND member_id=? AND network='solana' AND wallet_role='PAYMENT'"
      ).bind(now, challenge.wallet_id, member.member_id).run();
      if (Number(updated.meta?.changes || 0) !== 1) {
        throw httpError(409, "The existing Solana payment wallet could not be separately verified for ACROWN delivery.");
      }
    } else {
      await db.prepare(
        "INSERT INTO supporter_wallets(wallet_id,member_id,network,address,address_normalized,wallet_role," +
        "ownership_verified_at,proof_method,created_at) VALUES(?,?,?,?,?,?,?,?,?)"
      ).bind(
        newId("wal"), member.member_id, challenge.network, await displayAddress(challenge), challenge.address_normalized,
        challenge.wallet_role, now, "OFFCHAIN_MESSAGE", now,
      ).run();
    }
  } catch (error) {
    if (Number(error?.status) === 409) throw error;
    throw httpError(409, "That wallet is already linked or the member already has a verified Solana delivery wallet.");
  }
  const refreshed = await db.prepare(
    "SELECT member_id,username,status,created_at FROM supporter_members WHERE member_id=?"
  ).bind(member.member_id).first();
  return json(200, await memberProfile(db, refreshed));
}

async function supporterMe(db, request) {
  const member = await currentMember(db, request);
  if (!member) throw httpError(401, "Sign in with a verified supporter wallet.");
  return json(200, await memberProfile(db, member));
}

async function supporterLogout(db, request, config) {
  const token = getCookie(request, SESSION_COOKIE);
  if (token) {
    const digest = await hashText(token);
    const now = Math.floor(Date.now() / 1000);
    await db.prepare(
      "UPDATE supporter_member_sessions SET revoked_at=? WHERE secret_digest=? AND revoked_at IS NULL"
    ).bind(now, digest).run();
  }
  return json(200, { loggedOut: true }, { "Set-Cookie": clearSessionCookie(config.origin) });
}

export async function handleSupporterApi(request, env, config) {
  const db = env?.SUPPORTERS_DB;
  if (!db) return json(503, { error: "The isolated Genesis Programme service is not bound." });
  const url = new URL(request.url);
  try {
    if (url.pathname === "/api/supporters/status" && request.method === "GET") {
      return await supporterStatusResponse(env);
    }
    if (url.pathname === "/api/supporters/me" && request.method === "GET") {
      return await supporterMe(db, request);
    }
    if (url.pathname !== "/api/supporters/registration/challenge" &&
        url.pathname !== "/api/supporters/registration/verify" &&
        url.pathname !== "/api/supporters/login/challenge" &&
        url.pathname !== "/api/supporters/login/verify" &&
        url.pathname !== "/api/supporters/wallet-challenge" &&
        url.pathname !== "/api/supporters/wallet-verify" &&
        url.pathname !== "/api/supporters/logout") {
      return json(404, { error: "The Genesis Programme endpoint does not exist." });
    }
    if (request.method !== "POST") return json(405, { error: "This Genesis Programme endpoint requires POST." });
    const contentType = (request.headers.get("Content-Type") || "").split(";")[0].trim().toLowerCase();
    if (contentType !== "application/json") return json(415, { error: "This endpoint accepts JSON only." });
    const body = await request.text();
    if (new TextEncoder().encode(body).length > MAX_BODY_BYTES) return json(413, { error: "The request is too large." });
    let payload;
    try {
      payload = JSON.parse(body);
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("invalid");
    } catch {
      return json(400, { error: "Enter a valid JSON request." });
    }
    if (url.pathname === "/api/supporters/registration/challenge") {
      return await registrationChallenge(db, env, request, payload, config);
    }
    if (url.pathname === "/api/supporters/registration/verify") {
      await applyRateLimit(db, env, request, "registration-verify", 12, 3600);
      const challenge = await consumeChallenge(db, payload.challengeId, "REGISTER", config);
      if (challenge.member_status !== "ACTIVE" || challenge.registration_state !== "PENDING") {
        throw httpError(409, "This registration is no longer pending.");
      }
      if (!(await verifyWalletSignature(challenge, payload.signature))) {
        throw httpError(401, "The signature did not prove control of the submitted wallet.");
      }
      const now = Math.floor(Date.now() / 1000);
      const walletId = newId("wal");
      const token = base64url(randomBytes(32));
      const sessionId = newId("ses");
      const expiresAt = now + SESSION_SECONDS;
      const secretDigest = await hashText(token);
      const results = await db.batch([
        db.prepare(
          "INSERT INTO supporter_wallets(wallet_id,member_id,network,address,address_normalized,wallet_role," +
          "ownership_verified_at,proof_method,created_at) VALUES(?,?,?,?,?,'PAYMENT',?,'OFFCHAIN_MESSAGE',?)"
        ).bind(
          walletId, challenge.member_id, challenge.network,
          await displayAddress(challenge), challenge.address_normalized, now, now,
        ),
        db.prepare(
          "UPDATE supporter_members SET registration_state='VERIFIED',registration_verified_at=?,registration_expires_at=NULL,updated_at=? " +
          "WHERE member_id=? AND registration_state='PENDING'"
        ).bind(now, now, challenge.member_id),
        db.prepare(
          "INSERT INTO supporter_member_sessions(session_id,member_id,secret_digest,created_at,expires_at,last_used_at) " +
          "VALUES(?,?,?,?,?,?)"
        ).bind(sessionId, challenge.member_id, secretDigest, now, expiresAt, now),
      ]);
      if (results.length !== 3 || Number(results[0]?.meta?.changes || 0) !== 1 ||
      Number(results[1]?.meta?.changes || 0) !== 1 || Number(results[2]?.meta?.changes || 0) !== 1) {
    throw httpError(409, "The supporter registration transaction could not be committed exactly once.");
  }
      const member = await db.prepare(
        "SELECT member_id,username,status,created_at FROM supporter_members WHERE member_id=? AND registration_state='VERIFIED'"
      ).bind(challenge.member_id).first();
      if (!member) throw httpError(503, "The supporter registration could not be confirmed.");
      return json(200, await memberProfile(db, member), {
        "Set-Cookie": sessionCookie(token, config.origin),
      });
    }
    if (url.pathname === "/api/supporters/login/challenge") {
      return await loginChallenge(db, env, request, payload, config);
    }
    if (url.pathname === "/api/supporters/login/verify") {
      return await loginVerify(db, env, request, payload, config);
    }
    if (url.pathname === "/api/supporters/wallet-challenge") {
      const member = await currentMember(db, request);
      if (!member) throw httpError(401, "Sign in before linking another wallet.");
      return await linkWalletChallenge(db, env, request, payload, config, member);
    }
    if (url.pathname === "/api/supporters/wallet-verify") {
      const member = await currentMember(db, request);
      if (!member) throw httpError(401, "Sign in before linking another wallet.");
      return await linkWalletVerify(db, env, request, payload, config, member);
    }
    if (url.pathname === "/api/supporters/logout") return await supporterLogout(db, request, config);
    return json(404, { error: "The Genesis Programme endpoint does not exist." });
  } catch (error) {
    const status = Number(error?.status) || 500;
    if (env?.ENVIRONMENT === "local") {
      console.error("[LOCAL SUPPORTER TEST ONLY]", String(error?.message || "unknown error"));
    }
    return json(status, { error: status < 500 ? error.message : "The Genesis Programme service encountered an unexpected error." });
  }
}

export async function supporterStatusResponse(env) {
  const db = env?.SUPPORTERS_DB;
  if (!db) {
    return json(503, {
      error: "The isolated Genesis Programme database is not bound. Payment acceptance is unavailable.",
    });
  }

  try {
    const [program, result] = await Promise.all([
      db.prepare(
        "SELECT environment,status,activated_at,closes_at,rules_version " +
        "FROM supporter_program WHERE singleton = 1"
      ).first(),
      db.prepare(
        "SELECT network,network_identifier,token_identifier,token_decimals,treasury_address,enabled " +
        "FROM supporter_network_config ORDER BY network"
      ).all(),
    ]);

    const payload = buildSupporterStatus(program, result?.results || []);
    return json(200, payload);
  } catch {
    return json(503, {
      error: "The isolated Genesis Programme database could not be qualified. Contributions remain disabled.",
    });
  }
}

function buildSupporterStatus(program, networkRows) {
  if (!program || program.environment !== "MAINNET" || !Array.isArray(networkRows)) {
    throw new Error("The isolated Genesis Programme database is not initialized correctly.");
  }
  if (!["PRELAUNCH", "OPEN", "PAUSED", "CLOSED"].includes(program.status)) {
    throw new Error("The Genesis Programme has an unrecognized lifecycle state.");
  }
  const byNetwork = new Map(networkRows.map((row) => [row.network, row]));
  if (networkRows.length !== NETWORK_ORDER.length || byNetwork.size !== NETWORK_ORDER.length ||
      NETWORK_ORDER.some((network) => !byNetwork.has(network))) {
    throw new Error("The Genesis Programme database does not contain the exact three-network allowlist.");
  }
  const networks = NETWORK_ORDER.map((network) => {
    const row = byNetwork.get(network);
    const canonical = CANONICAL_NETWORKS[network];
    if (Number(row.token_decimals) !== canonical.tokenDecimals || row.network_identifier !== canonical.networkIdentifier ||
        row.token_identifier !== canonical.tokenIdentifier) {
      throw new Error("The configured network/token identity or USD₮ precision does not match the canonical allowlist.");
    }
    const configuredTreasury = typeof row.treasury_address === "string" ? row.treasury_address.trim() : "";
    const expectedTreasury = network === "ethereum"
      ? canonical.treasuryAddress.toLowerCase()
      : canonical.treasuryAddress;
    const normalizedTreasury = network === "ethereum"
      ? configuredTreasury.toLowerCase()
      : configuredTreasury;
    if (configuredTreasury && normalizedTreasury !== expectedTreasury) {
      throw new Error("The configured Genesis treasury address does not match the owner-approved network configuration.");
    }
    const treasuryConfigured = Boolean(configuredTreasury);
    const networkConfigured = Number(row.enabled) === 1;
    if (networkConfigured && !treasuryConfigured) {
      throw new Error("A network cannot be enabled without its configured Genesis treasury address.");
    }
    return {
      network,
      networkIdentifier: canonical.networkIdentifier,
      tokenIdentifier: canonical.tokenIdentifier,
      tokenDecimals: canonical.tokenDecimals,
      networkConfigured,
      treasuryConfigured,
    };
  });
  return {
    environment: "MAINNET",
    programme: {
      status: String(program.status),
      activatedAt: Number(program.activated_at) > 0 ? new Date(Number(program.activated_at) * 1000).toISOString() : null,
      closesAt: Number(program.closes_at) > 0 ? new Date(Number(program.closes_at) * 1000).toISOString() : null,
      rulesVersion: program.rules_version || null,
    },
    networks,
    paymentAcceptance: {
      enabled: false,
      contributionsAccepted: false,
      reason: "Mainnet payment intake is not enabled. No payment intent or transfer request can be created.",
    },
    purchaseAllowance: {
      separateFromContribution: true,
      automaticTokenIssuance: false,
    },
  };
}

export {
  buildSupporterStatus,
  normalizeWalletAddress,
  createWalletMessage,
  verifyWalletSignature,
  base58Decode,
  base58Encode,
  consumeChallenge,
};