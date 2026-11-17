import { normalizeWalletAddress, verifyWalletSignature } from "./supporters.js";

const COOKIE = "acrown_genesis_wallet";
const SESSION_SECONDS = 12 * 60 * 60;
const CHALLENGE_SECONDS = 10 * 60;
const MAX_BODY_BYTES = 16_384;
const NETWORKS = new Set(["ethereum", "tron", "solana"]);
const AVATARS = ["person", "crown", "star", "moon", "orbit", "shield"];
const ADJECTIVES = ["Amber", "Azure", "Celestial", "Golden", "Lunar", "Radiant", "Silver", "Stellar"];
const NOUNS = ["Aquila", "Comet", "Nebula", "Orion", "Phoenix", "Pioneer", "Sentinel", "Voyager"];
const RESERVED_NAMES = new Set(["astrocrown", "genesis", "genesis member", "space empire", "nova", "administrator", "admin", "moderator", "support"]);

function response(status, payload, headers = {}) {
  const resultHeaders = new Headers(headers);
  resultHeaders.set("Content-Type", "application/json; charset=utf-8");
  resultHeaders.set("Cache-Control", "no-store, max-age=0");
  resultHeaders.set("X-Content-Type-Options", "nosniff");
  resultHeaders.set("Referrer-Policy", "no-referrer");
  resultHeaders.set("X-Frame-Options", "DENY");
  resultHeaders.set("Cross-Origin-Resource-Policy", "same-origin");
  return new Response(JSON.stringify(payload), { status, headers: resultHeaders });
}

function error(status, message) {
  const result = new Error(message);
  result.status = status;
  return result;
}

function randomBytes(length) {
  return crypto.getRandomValues(new Uint8Array(length));
}

function base64url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\\+/g, "-").replace(/\\//g, "_").replace(/=+$/g, "");
}

async function digest(value) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  return base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)));
}

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return base64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message))));
}

function randomId(prefix) {
  return prefix + "_" + base64url(randomBytes(18));
}

function normalizeDisplayName(value) {
  if (typeof value !== "string") throw error(400, "Enter a display name.");
  const name = value.normalize("NFKC").trim().replace(/\\s+/g, " ");
  if (!/^[A-Za-z0-9][A-Za-z0-9 _-]{2,27}$/.test(name)) {
    throw error(400, "Display names must be 3–28 characters and use basic Latin letters, numbers, spaces, hyphens or underscores.");
  }
  const normalized = name.toLowerCase();
  if (RESERVED_NAMES.has(normalized)) throw error(409, "This display name is reserved and cannot be used.");
  return { name, normalized };
}

function randomDisplayName() {
  const adjective = ADJECTIVES[randomBytes(1)[0] % ADJECTIVES.length];
  const noun = NOUNS[randomBytes(1)[0] % NOUNS.length];
  const number = (1000 + ((randomBytes(2)[0] * 256 + randomBytes(2)[1]) % 9000)).toString();
  return adjective + noun + " " + number;
}

function cookie(token, origin, maxAge = SESSION_SECONDS) {
  const secure = new URL(origin).protocol === "https:" ? "; Secure" : "";
  return COOKIE + "=" + token + "; Path=/api/genesis; Max-Age=" + maxAge + "; HttpOnly; SameSite=Strict" + secure;
}

function requestCookie(request) {
  const all = request.headers.get("Cookie") || "";
  for (const part of all.split(";")) {
    const index = part.indexOf("=");
    if (index >= 0 && part.slice(0, index).trim() === COOKIE) return part.slice(index + 1).trim();
  }
  return "";
}

async function readJson(request) {
  const type = (request.headers.get("Content-Type") || "").split(";")[0].trim().toLowerCase();
  if (type !== "application/json") throw error(415, "This endpoint accepts JSON only.");
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) throw error(413, "The request is too large.");
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid");
    return value;
  } catch {
    throw error(400, "Enter a valid JSON request.");
  }
}

async function rateLimit(db, env, request, action, maximum = 20, seconds = 3600) {
  const secret = typeof env.GENESIS_RATE_LIMIT_HMAC_KEY === "string" && env.GENESIS_RATE_LIMIT_HMAC_KEY.length >= 32
    ? env.GENESIS_RATE_LIMIT_HMAC_KEY
    : typeof env.RATE_LIMIT_HMAC_KEY === "string" && env.RATE_LIMIT_HMAC_KEY.length >= 32
      ? env.RATE_LIMIT_HMAC_KEY
      : env.ENVIRONMENT === "local" ? "local-genesis-rate-limit-key-only" : "";
  if (!secret) throw error(503, "Genesis wallet-identity abuse controls are not configured.");
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const scope = await hmac(secret, "genesis-wallet:" + action + ":" + ip);
  const now = Math.floor(Date.now() / 1000);
  const cutoff = now - seconds;
  const result = await db.prepare(
    "INSERT INTO genesis_rate_limits(scope_digest,window_started_at,request_count,updated_at) VALUES(?,?,1,?) " +
    "ON CONFLICT(scope_digest) DO UPDATE SET " +
    "window_started_at=CASE WHEN genesis_rate_limits.window_started_at<=? THEN excluded.window_started_at ELSE genesis_rate_limits.window_started_at END, " +
    "request_count=CASE WHEN genesis_rate_limits.window_started_at<=? THEN 1 ELSE genesis_rate_limits.request_count+1 END, " +
    "updated_at=excluded.updated_at WHERE genesis_rate_limits.window_started_at<=? OR genesis_rate_limits.request_count<?"
  ).bind(scope, now, now, cutoff, cutoff, cutoff, maximum).run();
  if (Number(result.meta?.changes || 0) !== 1) throw error(429, "Too many requests. Please wait before trying again.");
}

function signatureMethod(network) {
  return network === "ethereum" ? "EIP-191" : network === "tron" ? "TIP-191" : "SOLANA_SIGN_MESSAGE";
}

function createMessage({ origin, network, address, purpose, challengeId, nonce, issuedAt, expiresAt, identityId = null }) {
  const host = new URL(origin).host;
  const identityLine = identityId ? "Genesis wallet identity: " + identityId + "\\n" : "";
  return [
    "AstroCrown Genesis wallet proof",
    "Domain: " + host,
    "URI: " + origin + "/supporters/",
    "Network: " + network + ":mainnet",
    "Address: " + address,
    "Purpose: " + purpose,
    identityLine.trimEnd(),
    "Nonce: " + nonce,
    "Issued At: " + issuedAt,
    "Expiration Time: " + expiresAt,
    "Request ID: " + challengeId,
    "",
    "This is an off-chain message signature only. It does not authorize a transaction, token approval, transfer, payment or gas expenditure.",
    "The primary wallet is the sole Genesis identity and recovery anchor. Genesis cannot restore a wallet or move its entitlements to another wallet."
  ].filter(Boolean).join("\\n");
}

async function issueChallenge(db, config, { identityId = null, network, address, purpose, walletRole = null, requestedDisplayName = null }) {
  if (!NETWORKS.has(network)) throw error(400, "Only Ethereum, TRON and Solana mainnet wallets are supported.");
  const normalized = await normalizeWalletAddress(network, address);
  const now = Math.floor(Date.now() / 1000);
  const expires = now + CHALLENGE_SECONDS;
  const challengeId = randomId("gch");
  const nonce = base64url(randomBytes(18));
  const issuedAt = new Date(now * 1000).toISOString();
  const expiresAt = new Date(expires * 1000).toISOString();
  const message = createMessage({
    origin: config.origin, network, address: normalized.address, purpose, challengeId, nonce,
    issuedAt, expiresAt, identityId
  });
  await db.prepare(
    "INSERT INTO genesis_wallet_challenges(challenge_id,identity_id,network,address,address_normalized,challenge_purpose," +
    "wallet_role,requested_display_name,nonce_digest,domain,message_digest,message,created_at,expires_at) " +
    "VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
  ).bind(
    challengeId, identityId, network, normalized.address, normalized.normalized, purpose, walletRole,
    requestedDisplayName, await digest(nonce), new URL(config.origin).host, await digest(message),
    message, now, expires
  ).run();
  return {
    challengeId, message, network, address: normalized.address, purpose, expiresAt,
    signatureMethod: network === "ethereum" ? "personal_sign (off-chain only)"
      : network === "tron" ? "TronLink signMessageV2 / TIP-191 (off-chain only)"
        : "Solana Wallet Standard signMessage (off-chain only)"
  };
}

async function consumeChallenge(db, challengeId, purpose, config) {
  if (typeof challengeId !== "string" || !/^gch_[A-Za-z0-9_-]{20,40}$/.test(challengeId)) {
    throw error(400, "The wallet challenge identifier is invalid.");
  }
  const now = Math.floor(Date.now() / 1000);
  const consumed = await db.prepare(
    "UPDATE genesis_wallet_challenges SET consumed_at=? WHERE challenge_id=? AND challenge_purpose=? AND consumed_at IS NULL AND expires_at>?"
  ).bind(now, challengeId, purpose, now).run();
  if (Number(consumed.meta?.changes || 0) !== 1) throw error(410, "This wallet challenge has expired or has already been used.");
  const challenge = await db.prepare("SELECT * FROM genesis_wallet_challenges WHERE challenge_id=?").bind(challengeId).first();
  if (!challenge || challenge.challenge_purpose !== purpose || !challenge.message) throw error(410, "This wallet challenge is no longer available.");
  if (challenge.domain !== new URL(config.origin).host ||
      challenge.expires_at <= now ||
      challenge.message_digest !== await digest(challenge.message)) {
    throw error(409, "The wallet challenge failed its domain, expiry or integrity check.");
  }
  const nonceMatch = challenge.message.match(/^Nonce: ([A-Za-z0-9_-]{20,})$/m);
  if (!nonceMatch || challenge.nonce_digest !== await digest(nonceMatch[1])) throw error(409, "The wallet challenge nonce failed its integrity check.");
  return challenge;
}

async function authenticateSignature(challenge, signature) {
  if (!await verifyWalletSignature(challenge, signature)) throw error(401, "The wallet signature did not prove control of the requested address.");
}

async function createSession(db, identityId, origin) {
  const token = base64url(randomBytes(32));
  const now = Math.floor(Date.now() / 1000);
  const expires = now + SESSION_SECONDS;
  await db.prepare(
    "INSERT INTO genesis_wallet_sessions(session_id,identity_id,secret_digest,created_at,expires_at,last_used_at) VALUES(?,?,?,?,?,?)"
  ).bind(randomId("gws"), identityId, await digest(token), now, expires, now).run();
  return cookie(token, origin);
}

async function currentIdentity(db, request) {
  const token = requestCookie(request);
  if (!token || token.length > 128) return null;
  const tokenDigest = await digest(token);
  const now = Math.floor(Date.now() / 1000);
  const row = await db.prepare(
    "SELECT i.*,s.session_id FROM genesis_wallet_sessions s JOIN genesis_wallet_identities i ON i.identity_id=s.identity_id " +
    "WHERE s.secret_digest=? AND s.revoked_at IS NULL AND s.expires_at>? AND i.identity_status='ACTIVE' LIMIT 1"
  ).bind(tokenDigest, now).first();
  if (!row) return null;
  await db.prepare("UPDATE genesis_wallet_sessions SET last_used_at=? WHERE session_id=? AND revoked_at IS NULL")
    .bind(now, row.session_id).run();
  return row;
}

async function identityProfile(db, identity) {
  const [wallets, badge, entitlement] = await Promise.all([
    db.prepare(
      "SELECT network,address,wallet_role,ownership_verified_at,proof_method FROM genesis_wallet_addresses " +
      "WHERE identity_id=? ORDER BY CASE wallet_role WHEN 'PRIMARY' THEN 0 ELSE 1 END,network"
    ).bind(identity.identity_id).all(),
    db.prepare(
      "SELECT badge_code,status,awarded_at,rules_version FROM genesis_member_badges " +
      "WHERE identity_id=? AND status='ACTIVE' ORDER BY awarded_at LIMIT 1"
    ).bind(identity.identity_id).first(),
    db.prepare("SELECT earned_acrown_base_units,consumed_acrown_base_units FROM genesis_wallet_entitlements WHERE identity_id=?")
      .bind(identity.identity_id).first()
  ]);
  return {
    walletIdentity: {
      identityId: identity.identity_id,
      primaryNetwork: identity.primary_network,
      primaryAddress: identity.primary_address,
      displayName: identity.display_name,
      avatarKey: identity.avatar_key,
      status: identity.identity_status
    },
    genesisMember: badge ? {
      status: "ACTIVE",
      badgeCode: badge.badge_code,
      awardedAt: new Date(Number(badge.awarded_at) * 1000).toISOString(),
      rulesVersion: badge.rules_version
    } : { status: "NOT_QUALIFIED", badgeCode: null, awardedAt: null },
    wallets: wallets.results || [],
    entitlement: entitlement ? {
      earnedAcrownBaseUnits: entitlement.earned_acrown_base_units,
      consumedAcrownBaseUnits: entitlement.consumed_acrown_base_units
    } : { earnedAcrownBaseUnits: "0", consumedAcrownBaseUnits: "0" },
    paymentAcceptance: { enabled: false }
  };
}

async function uniqueRandomName(db) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const candidate = normalizeDisplayName(randomDisplayName());
    const taken = await db.prepare("SELECT 1 AS present FROM genesis_wallet_identities WHERE display_name_normalized=? LIMIT 1")
      .bind(candidate.normalized).first();
    if (!taken) return candidate;
  }
  throw error(503, "A unique Genesis display name could not be allocated.");
}

async function getOrCreateIdentity(db, challenge) {
  let identity = await db.prepare(
    "SELECT * FROM genesis_wallet_identities WHERE primary_network=? AND primary_address_normalized=?"
  ).bind(challenge.network, challenge.address_normalized).first();
  if (identity) return identity;

  const linked = await db.prepare(
    "SELECT identity_id,wallet_role FROM genesis_wallet_addresses WHERE network=? AND address_normalized=?"
  ).bind(challenge.network, challenge.address_normalized).first();
  if (linked) throw error(409, "This address is linked to a different primary wallet identity. Authenticate with that identity's primary wallet.");

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const name = await uniqueRandomName(db);
    const now = Math.floor(Date.now() / 1000);
    const identityId = randomId("gid");
    const avatar = AVATARS[randomBytes(1)[0] % AVATARS.length];
    try {
      await db.batch([
        db.prepare(
          "INSERT INTO genesis_wallet_identities(identity_id,primary_network,primary_address,primary_address_normalized," +
          "display_name,display_name_normalized,avatar_key,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)"
        ).bind(identityId, challenge.network, challenge.address, challenge.address_normalized, name.name, name.normalized, avatar, now, now),
        db.prepare(
          "INSERT INTO genesis_wallet_addresses(wallet_address_id,identity_id,network,address,address_normalized,wallet_role," +
          "ownership_verified_at,proof_method,created_at) VALUES(?,?,?,?,?,'PRIMARY',?,?,?)"
        ).bind(randomId("gwa"), identityId, challenge.network, challenge.address, challenge.address_normalized, now, signatureMethod(challenge.network), now),
        db.prepare("INSERT INTO genesis_wallet_entitlements(identity_id,updated_at) VALUES(?,?)").bind(identityId, now)
      ]);
      identity = await db.prepare("SELECT * FROM genesis_wallet_identities WHERE identity_id=?").bind(identityId).first();
      if (identity) return identity;
    } catch (cause) {
      identity = await db.prepare(
        "SELECT * FROM genesis_wallet_identities WHERE primary_network=? AND primary_address_normalized=?"
      ).bind(challenge.network, challenge.address_normalized).first();
      if (identity) return identity;
      const detail = String(cause?.message || cause);
      if (/display_name_normalized|UNIQUE constraint/i.test(detail)) continue;
      throw cause;
    }
  }
  throw error(503, "The wallet identity could not be established safely.");
}

async function nameAvailability(db, name, identityId = null) {
  const normalized = normalizeDisplayName(name);
  const existing = await db.prepare("SELECT identity_id FROM genesis_wallet_identities WHERE display_name_normalized=? LIMIT 1")
    .bind(normalized.normalized).first();
  return { ...normalized, available: !existing || existing.identity_id === identityId };
}

function explorerUrl(network, txHash) {
  if (network === "ethereum" && /^0x[0-9a-fA-F]{64}$/.test(txHash)) return "https://etherscan.io/tx/" + txHash;
  if (network === "tron" && /^[0-9a-fA-F]{64}$/.test(txHash)) return "https://tronscan.org/#/transaction/" + txHash;
  if (network === "solana" && /^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(txHash)) return "https://solscan.io/tx/" + txHash;
  return null;
}

async function directory(db) {
  const rows = await db.prepare(
    "SELECT i.display_name,i.avatar_key,i.genesis_member_status,p.payment_kind,p.network,p.amount_display," +
    "p.asset_identifier,p.transaction_hash,p.transfer_index,p.confirmed_at " +
    "FROM genesis_public_payments p JOIN genesis_wallet_identities i ON i.identity_id=p.identity_id " +
    "JOIN genesis_member_badges b ON b.identity_id=i.identity_id AND b.status='ACTIVE' " +
    "WHERE p.public_visible=1 AND p.finality_status='FINALIZED' AND i.identity_status='ACTIVE' " +
    "ORDER BY p.confirmed_at DESC LIMIT 200"
  ).all();
  return (rows.results || []).map((row) => ({
    displayName: row.display_name,
    avatarKey: row.avatar_key,
    badge: "GENESIS_MEMBER_DNA_GOLD",
    paymentKind: row.payment_kind,
    network: row.network,
    amount: row.amount_display,
    asset: row.asset_identifier,
    confirmedAt: new Date(Number(row.confirmed_at) * 1000).toISOString(),
    explorerUrl: explorerUrl(row.network, row.transaction_hash),
    // The explorer link intentionally exposes the full public wallet address and chain history.
    transactionHash: row.transaction_hash,
    transferIndex: row.transfer_index
  })).filter((row) => row.explorerUrl);
}

export async function handleGenesisWalletApi(request, env, config) {
  const db = env?.SUPPORTERS_DB;
  if (!db) return response(503, { error: "The isolated Genesis Programme service is not bound." });
  const url = new URL(request.url);
  try {
    if (url.pathname === "/api/genesis/name-availability" && request.method === "GET") {
      const name = url.searchParams.get("name") || "";
      const checked = await nameAvailability(db, name);
      return response(200, { available: checked.available, displayName: checked.name, message: checked.available ? "Display name available." : "Display name is already in use." });
    }
    if (url.pathname === "/api/genesis/directory" && request.method === "GET") {
      return response(200, { items: await directory(db), publicLedger: true });
    }
    if (url.pathname === "/api/genesis/me" && request.method === "GET") {
      const identity = await currentIdentity(db, request);
      if (!identity) return response(401, { error: "Connect and prove control of the primary wallet to access this Genesis wallet identity." });
      return response(200, await identityProfile(db, identity));
    }
    if (request.method !== "POST") return response(405, { error: "This Genesis wallet endpoint requires POST." });
    const payload = await readJson(request);

    if (url.pathname === "/api/genesis/identity/challenge") {
      await rateLimit(db, env, request, "identity-challenge");
      const network = String(payload.network || "").toLowerCase();
      const normalized = await normalizeWalletAddress(network, payload.address);
      const existing = await db.prepare(
        "SELECT identity_id FROM genesis_wallet_identities WHERE primary_network=? AND primary_address_normalized=?"
      ).bind(network, normalized.normalized).first();
      const linked = await db.prepare(
        "SELECT identity_id,wallet_role FROM genesis_wallet_addresses WHERE network=? AND address_normalized=?"
      ).bind(network, normalized.normalized).first();
      if (linked && !existing) throw error(409, "This address is already linked to a Genesis identity. Use the primary wallet for that identity.");
      return response(200, await issueChallenge(db, config, {
        identityId: existing?.identity_id || null, network, address: normalized.address, purpose: "IDENTIFY"
      }));
    }

    if (url.pathname === "/api/genesis/identity/verify") {
      await rateLimit(db, env, request, "identity-verify");
      const challenge = await consumeChallenge(db, payload.challengeId, "IDENTIFY", config);
      await authenticateSignature(challenge, payload.signature);
      const identity = await getOrCreateIdentity(db, challenge);
      const setCookie = await createSession(db, identity.identity_id, config.origin);
      return response(200, await identityProfile(db, identity), { "Set-Cookie": setCookie });
    }

    if (url.pathname === "/api/genesis/wallet-link/challenge") {
      await rateLimit(db, env, request, "wallet-link-challenge");
      const identity = await currentIdentity(db, request);
      if (!identity) throw error(401, "Authenticate with the primary wallet before linking another network address.");
      const network = String(payload.network || "").toLowerCase();
      const role = String(payload.walletRole || "PAYMENT").toUpperCase();
      if (!["PAYMENT", "DELIVERY", "PAYMENT_AND_DELIVERY"].includes(role)) throw error(400, "Choose a supported wallet purpose.");
      if ((role === "DELIVERY" || role === "PAYMENT_AND_DELIVERY") && network !== "solana") {
        throw error(400, "The ACROWN delivery address must be on Solana.");
      }
      const normalized = await normalizeWalletAddress(network, payload.address);
      if (network === identity.primary_network && normalized.normalized === identity.primary_address_normalized) {
        throw error(409, "This is already the primary wallet for the Genesis identity.");
      }
      const owner = await db.prepare("SELECT identity_id FROM genesis_wallet_addresses WHERE network=? AND address_normalized=?")
        .bind(network, normalized.normalized).first();
      if (owner) throw error(409, "This address is already linked to a Genesis wallet identity.");
      return response(200, await issueChallenge(db, config, {
        identityId: identity.identity_id, network, address: normalized.address, purpose: "LINK", walletRole: role
      }));
    }

    if (url.pathname === "/api/genesis/wallet-link/verify") {
      await rateLimit(db, env, request, "wallet-link-verify");
      const challenge = await consumeChallenge(db, payload.challengeId, "LINK", config);
      const identity = await currentIdentity(db, request);
      if (!identity || identity.identity_id !== challenge.identity_id) throw error(401, "The primary wallet session no longer authorizes this wallet link.");
      await authenticateSignature(challenge, payload.signature);
      const now = Math.floor(Date.now() / 1000);
      const proof = signatureMethod(challenge.network);
      await db.prepare(
        "INSERT INTO genesis_wallet_addresses(wallet_address_id,identity_id,network,address,address_normalized,wallet_role," +
        "ownership_verified_at,proof_method,created_at) VALUES(?,?,?,?,?,?,?,?,?)"
      ).bind(randomId("gwa"), identity.identity_id, challenge.network, challenge.address, challenge.address_normalized,
        challenge.wallet_role, now, proof, now).run();
      const refreshed = await db.prepare("SELECT * FROM genesis_wallet_identities WHERE identity_id=?").bind(identity.identity_id).first();
      return response(200, await identityProfile(db, refreshed));
    }

    if (url.pathname === "/api/genesis/display-name/challenge") {
      await rateLimit(db, env, request, "display-name-challenge");
      const identity = await currentIdentity(db, request);
      if (!identity) throw error(401, "Authenticate with the primary wallet before changing its display name.");
      const checked = await nameAvailability(db, payload.displayName, identity.identity_id);
      if (!checked.available) throw error(409, "This display name is not available.");
      return response(200, await issueChallenge(db, config, {
        identityId: identity.identity_id,
        network: identity.primary_network,
        address: identity.primary_address,
        purpose: "RENAME",
        requestedDisplayName: checked.name
      }));
    }

    if (url.pathname === "/api/genesis/display-name/verify") {
      await rateLimit(db, env, request, "display-name-verify");
      const challenge = await consumeChallenge(db, payload.challengeId, "RENAME", config);
      const identity = await currentIdentity(db, request);
      if (!identity || identity.identity_id !== challenge.identity_id ||
          identity.primary_network !== challenge.network ||
          identity.primary_address_normalized !== challenge.address_normalized) {
        throw error(401, "The primary wallet session no longer authorizes this display-name change.");
      }
      await authenticateSignature(challenge, payload.signature);
      const name = normalizeDisplayName(challenge.requested_display_name);
      const updated = await db.prepare(
        "UPDATE genesis_wallet_identities SET display_name=?,display_name_normalized=?,updated_at=? " +
        "WHERE identity_id=? AND NOT EXISTS (SELECT 1 FROM genesis_wallet_identities other " +
        "WHERE other.display_name_normalized=? AND other.identity_id!=?)"
      ).bind(name.name, name.normalized, Math.floor(Date.now() / 1000), identity.identity_id, name.normalized, identity.identity_id).run();
      if (Number(updated.meta?.changes || 0) !== 1) throw error(409, "This display name has just been claimed by another wallet. Choose another name.");
      const refreshed = await db.prepare("SELECT * FROM genesis_wallet_identities WHERE identity_id=?").bind(identity.identity_id).first();
      return response(200, await identityProfile(db, refreshed));
    }

    if (url.pathname === "/api/genesis/logout") {
      const token = requestCookie(request);
      if (token) await db.prepare(
        "UPDATE genesis_wallet_sessions SET revoked_at=? WHERE secret_digest=? AND revoked_at IS NULL"
      ).bind(Math.floor(Date.now() / 1000), await digest(token)).run();
      return response(200, { loggedOut: true }, { "Set-Cookie": cookie("", config.origin, 0) });
    }

    return response(404, { error: "The Genesis wallet endpoint does not exist." });
  } catch (cause) {
    const status = Number(cause?.status) || 500;
    if (status >= 500) return response(status, { error: "The Genesis wallet service could not complete this request safely." });
    return response(status, { error: cause.message || "The Genesis wallet request was rejected." });
  }
}
