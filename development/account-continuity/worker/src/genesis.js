import { normalizeWalletAddress, verifyWalletSignature } from "./wallet-proof.js";
import { publicGenesisTreasuryReceipts, prepareGenesisRpcPair, formatUsdtAmount, explorerUrl } from "./genesis-receipt-monitor.js";
import { availableProgrammeAllowance, isGenesisRegistrationOpen, calculateGenesisTieredPurchaseAllowance, GENESIS_QUALIFYING_RULES_VERSION, GENESIS_QUALIFYING_PRINCIPAL_CAP_BASE_UNITS, GENESIS_QUALIFYING_ALLOWANCE_CAP_BASE_UNITS } from "../../../supporter-programme/shared/entitlement-rules.mjs";
import { MAINNET_USDT_CONFIG } from "../../../supporter-programme/shared/mainnet-config.mjs";
import { parseGenesisUsdtAmountToBaseUnits } from "../../../supporter-programme/shared/genesis-payment-policy.mjs";
import { genesisPaymentActivationGate } from "./genesis-payment-operations.js";

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

async function loadGenesisProgrammeControl(db) {
  let control = await db.prepare(
    "SELECT * FROM genesis_programme_control WHERE singleton=1"
  ).first();
  if (!control) throw error(503, "The Genesis programme lifecycle control is not initialized.");
  const now = Math.floor(Date.now() / 1000);
  const freezeAt = control.registration_freeze_at === null || control.registration_freeze_at === undefined
    ? null : Number(control.registration_freeze_at);
  if (!control.registration_closed_at && Number.isSafeInteger(freezeAt) && freezeAt > 0 && now >= freezeAt) {
    await db.prepare(
      "UPDATE genesis_programme_control SET registration_closed_at=registration_freeze_at,updated_at=? " +
      "WHERE singleton=1 AND registration_closed_at IS NULL AND registration_freeze_at IS NOT NULL AND registration_freeze_at<=?"
    ).bind(now, now).run();
    control = await db.prepare(
      "SELECT * FROM genesis_programme_control WHERE singleton=1"
    ).first();
  }
  return control;
}

function genesisRegistrationClosed(control, now = Math.floor(Date.now() / 1000)) {
  return Boolean(control?.registration_closed_at)
    || !isGenesisRegistrationOpen(now, control?.scheduled_acrown_launch_at ?? null, control?.registration_closed_at ?? null);
}

function assertGenesisProfileMutationsOpen(control) {
  if (!control?.acrown_launched_at && genesisRegistrationClosed(control)) {
    throw error(423, "Existing Genesis wallet links and profile changes are paused during the 24-hour pre-launch freeze; they resume when ACROWN officially launches. New Genesis identity registration remains permanently closed.");
  }
}

function randomBytes(length) {
  return crypto.getRandomValues(new Uint8Array(length));
}

function base64url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
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
  const name = value.normalize("NFKC").trim().replace(/\s+/g, " ");
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

function createMessage({ origin, network, address, purpose, challengeId, nonce, issuedAt, expiresAt, identityId = null, walletRole = null, requestedDisplayName = null }) {
  const host = new URL(origin).host;
  const identityLine = identityId ? "Genesis wallet identity: " + identityId : "";
  const walletRoleLine = walletRole ? "Address purpose: " + walletRole : "";
  const displayNameLine = requestedDisplayName ? "Requested public display name: " + requestedDisplayName : "";
  return [
    "AstroCrown Genesis wallet proof",
    "Domain: " + host,
    "URI: " + origin + "/supporters/",
    "Network: " + network + ":mainnet",
    "Address: " + address,
    "Purpose: " + purpose,
    identityLine,
    walletRoleLine,
    displayNameLine,
    "Nonce: " + nonce,
    "Issued At: " + issuedAt,
    "Expiration Time: " + expiresAt,
    "Request ID: " + challengeId,
    "",
    "This is an off-chain message signature only. It does not authorize a transaction, token approval, transfer, payment or gas expenditure.",
    "The primary wallet is the sole Genesis identity and recovery anchor. Genesis cannot restore a lost wallet or move its identity, badge or attributable activity history to another wallet. No personal purchase allowance exists."
  ].filter(Boolean).join("\n");
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
    issuedAt, expiresAt, identityId, walletRole, requestedDisplayName
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

async function identityProfile(db, identity, env = {}) {
  await expireStaleGenesisPaymentIntents(db);
  const [wallets, badge, allowance, control, paymentAcceptance, openIntent] = await Promise.all([
    db.prepare(
      "SELECT wallet_address_id,network,address,wallet_role,ownership_verified_at,proof_method FROM genesis_wallet_addresses " +
      "WHERE identity_id=? ORDER BY CASE wallet_role WHEN 'PRIMARY' THEN 0 ELSE 1 END,network"
    ).bind(identity.identity_id).all(),
    db.prepare(
      "SELECT badge_code,status,awarded_at,rules_version FROM genesis_member_badges " +
      "WHERE identity_id=? AND status='ACTIVE' AND ?='ACTIVE' ORDER BY awarded_at LIMIT 1"
    ).bind(identity.identity_id, identity.genesis_member_status).first(),
    db.prepare(
      "SELECT allowance_cap_usdt_base_units,earned_usdt_base_units,reserved_usdt_base_units,consumed_usdt_base_units " +
      "FROM genesis_programme_allowance_state WHERE singleton=1"
    ).first(),
    loadGenesisProgrammeControl(db),
    genesisPaymentAcceptanceSummary(db, env),
    db.prepare(
      "SELECT payment_intent_id,network,asset_identifier,amount_base_units,amount_display,treasury_address," +
      "allowance_credit_usdt_base_units,tier_breakdown_json,rules_version,created_at,expires_at,status " +
      "FROM genesis_payment_intents WHERE identity_id=? AND status='OPEN' ORDER BY created_at DESC LIMIT 1"
    ).bind(identity.identity_id).first()
  ]);
  const earned = allowance?.earned_usdt_base_units || "0";
  const reserved = allowance?.reserved_usdt_base_units || "0";
  const consumed = allowance?.consumed_usdt_base_units || "0";
  const cap = allowance?.allowance_cap_usdt_base_units ?? null;
  const remaining = availableProgrammeAllowance({
    earnedBaseUnits: earned,
    reservedBaseUnits: reserved,
    consumedBaseUnits: consumed,
    capBaseUnits: cap
  });
  const now = Math.floor(Date.now() / 1000);
  const windowStarted = control?.purchase_window_started_at ? Number(control.purchase_window_started_at) : null;
  const windowLastPurchase = control?.purchase_window_last_purchase_at ? Number(control.purchase_window_last_purchase_at) : null;
  const windowCloses = control?.purchase_window_closes_at ? Number(control.purchase_window_closes_at) : null;
  const windowRemainingSeconds = windowCloses ? Math.max(0, windowCloses - now) : null;
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
    } : { status: identity.genesis_member_status || "NOT_QUALIFIED", badgeCode: null, awardedAt: null },
    wallets: wallets.results || [],
    programmePurchaseAllowance: {
      scope: "GENESIS_PROGRAMME_GLOBAL",
      earnedUsdtBaseUnits: earned,
      reservedUsdtBaseUnits: reserved,
      consumedUsdtBaseUnits: consumed,
      capUsdtBaseUnits: cap,
      remainingUsdtBaseUnits: remaining,
      oneEligibleWalletMayUseEntireRemainder: true
    },
    programmeLifecycle: {
      registrationFreezeAt: control?.registration_freeze_at ?? null,
      registrationPermanentlyClosed: Boolean(control?.registration_closed_at),
      purchaseWindowStartedAt: windowStarted,
      purchaseWindowLastPurchaseAt: windowLastPurchase,
      purchaseWindowClosesAt: windowCloses,
      purchaseWindowRemainingSeconds: windowRemainingSeconds,
      purchaseWindowOpen: Boolean(windowStarted && windowCloses && now >= windowStarted && now < windowCloses)
    },
    paymentAcceptance,
    paymentIntent: openIntent ? paymentIntentPublicView(openIntent) : null,
    terms: {
      acceptedVersion: identity.terms_version || null,
      acceptedAt: identity.terms_accepted_at ? new Date(Number(identity.terms_accepted_at) * 1000).toISOString() : null
    }
  };
}

function usdtDisplay(baseUnits) {
  const value = BigInt(baseUnits);
  const whole = value / 1_000_000n;
  const fraction = (value % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "");
  return fraction ? whole.toString() + "." + fraction : whole.toString();
}

function paymentIntentPublicView(row) {
  const network = String(row.network || "");
  const canonical = MAINNET_USDT_CONFIG[network];
  const labels = {
    ethereum: "USDT · Ethereum (ERC-20)",
    tron: "USDT · TRON (TRC-20)",
    solana: "USDT · Solana (SPL)"
  };
  return {
    paymentIntentId: row.payment_intent_id,
    status: row.status,
    asset: "USDT",
    label: labels[network] || "USDT",
    network,
    amount: row.amount_display,
    amountBaseUnits: row.amount_base_units,
    receivingAddress: row.treasury_address,
    tokenIdentifier: canonical ? canonical.tokenIdentifier : row.asset_identifier,
    allowanceCreditUsdtBaseUnits: row.allowance_credit_usdt_base_units,
    allowanceCreditUsdt: usdtDisplay(row.allowance_credit_usdt_base_units),
    tierBreakdown: JSON.parse(row.tier_breakdown_json),
    rulesVersion: row.rules_version,
    createdAt: new Date(Number(row.created_at) * 1000).toISOString(),
    expiresAt: new Date(Number(row.expires_at) * 1000).toISOString(),
    networkFeePolicy: "The registered wallet owner pays the network fee separately using the network's native fee asset/resources. It is not deducted from the USDT principal.",
    paymentMethod: "MANUAL_EXACT_AMOUNT_TRANSFER",
    walletTransactionSubmitted: false
  };
}

async function expireStaleGenesisPaymentIntents(db, now = Math.floor(Date.now() / 1000)) {
  return db.prepare(
    "UPDATE genesis_payment_intents SET status='EXPIRED' " +
    "WHERE status='OPEN' AND expires_at<=?"
  ).bind(now).run();
}

async function genesisPaymentAcceptanceSummary(db, env) {
  const networks = {};
  await Promise.all(["ethereum", "tron", "solana"].map(async (network) => {
    let rpcPairReady = false;
    try {
      prepareGenesisRpcPair(env, network);
      rpcPairReady = true;
    } catch {
      rpcPairReady = false;
    }
    networks[network] = await genesisPaymentActivationGate(db, env, network, rpcPairReady);
  }));
  return {
    enabled: Object.values(networks).some((entry) => entry.enabled),
    asset: "USDT",
    networks,
    activationRequired: true,
    paymentMethod: "MANUAL_EXACT_AMOUNT_TRANSFER",
    walletTransactionSubmittedByWebsite: false
  };
}

async function createGenesisPaymentIntent(db, env, identity, payload) {
  const network = String(payload.network || "").toLowerCase();
  if (!NETWORKS.has(network)) throw error(400, "Choose Ethereum, TRON or Solana for this USDT payment intent.");
  let rpcPairReady = false;
  try {
    prepareGenesisRpcPair(env, network);
    rpcPairReady = true;
  } catch {
    rpcPairReady = false;
  }
  const gate = await genesisPaymentActivationGate(db, env, network, rpcPairReady);
  if (!gate.enabled) {
    throw error(423, "Genesis qualifying-payment acceptance is closed: " + gate.reasons.join(" "));
  }

  const control = await loadGenesisProgrammeControl(db);
  if (genesisRegistrationClosed(control) || control.acrown_launched_at) {
    throw error(423, "New Genesis qualifying-payment intents are closed by the permanent pre-launch cutoff or official launch.");
  }

  const termsVersion = gate.termsVersion;
  if (payload.termsAccepted !== true || payload.termsVersion !== termsVersion) {
    throw error(400, "Read and accept the currently approved Genesis qualifying-payment terms before requesting payment instructions.");
  }

  const walletAddressId = String(payload.walletAddressId || "");
  if (!/^gwa_[A-Za-z0-9_-]{20,40}$/.test(walletAddressId)) {
    throw error(400, "Choose a verified Genesis payment wallet address.");
  }
  const wallet = await db.prepare(
    "SELECT wallet_address_id,identity_id,network,address,address_normalized,wallet_role " +
    "FROM genesis_wallet_addresses WHERE wallet_address_id=? AND identity_id=? AND network=?"
  ).bind(walletAddressId, identity.identity_id, network).first();
  if (!wallet || !["PRIMARY", "PAYMENT", "PAYMENT_AND_DELIVERY"].includes(wallet.wallet_role)) {
    throw error(403, "Qualifying payments must originate from an address already verified and registered in this Genesis primary-wallet profile on the same network.");
  }

  let amountBaseUnits;
  try {
    amountBaseUnits = parseGenesisUsdtAmountToBaseUnits(String(payload.amount || ""));
  } catch (cause) {
    throw error(400, cause.message || "Enter an exact USDT principal amount.");
  }
  const minimum = BigInt(gate.minimumAmountBaseUnits);
  if (BigInt(amountBaseUnits) < minimum) {
    throw error(400, "The minimum qualifying payment is " + usdtDisplay(gate.minimumAmountBaseUnits) + " USDT.");
  }

  const now = Math.floor(Date.now() / 1000);
  await expireStaleGenesisPaymentIntents(db, now);
  const currentIntent = await db.prepare(
    "SELECT payment_intent_id,identity_id,expires_at FROM genesis_payment_intents WHERE status='OPEN' LIMIT 1"
  ).first();
  if (currentIntent) {
    throw error(409, "Another qualifying-payment intent is currently reserving the single global Genesis tranche. It must be confirmed, cancelled or expire before a new one can be created.");
  }

  const allowance = await db.prepare(
    "SELECT allowance_cap_usdt_base_units,earned_usdt_base_units,reserved_usdt_base_units," +
    "consumed_usdt_base_units,qualifying_principal_usdt_base_units,pending_qualifying_principal_usdt_base_units " +
    "FROM genesis_programme_allowance_state WHERE singleton=1"
  ).first();
  if (!allowance ||
      allowance.allowance_cap_usdt_base_units !== GENESIS_QUALIFYING_ALLOWANCE_CAP_BASE_UNITS ||
      BigInt(allowance.pending_qualifying_principal_usdt_base_units || "0") !== 0n) {
    throw error(503, "The shared Genesis USDT allowance ledger is not initialized for the approved rules version.");
  }

  let tranchePlan;
  try {
    tranchePlan = calculateGenesisTieredPurchaseAllowance({
      cumulativeQualifyingPrincipalBeforeBaseUnits: allowance.qualifying_principal_usdt_base_units || "0",
      qualifyingPaymentUsdtBaseUnits: amountBaseUnits,
    });
  } catch (cause) {
    throw error(409, cause.message || "The qualifying payment would exceed the remaining global Genesis tranche capacity.");
  }

  const earned = BigInt(allowance.earned_usdt_base_units || "0");
  const reserved = BigInt(allowance.reserved_usdt_base_units || "0");
  const consumed = BigInt(allowance.consumed_usdt_base_units || "0");
  const cap = BigInt(allowance.allowance_cap_usdt_base_units);
  if (earned + BigInt(tranchePlan.purchaseAllowanceUsdtBaseUnits) + reserved + consumed > cap) {
    throw error(409, "The qualifying payment would exceed the remaining global Genesis purchase allowance.");
  }

  const canonical = MAINNET_USDT_CONFIG[network];
  const paymentIntentId = randomId("gpi");
  const expiresAt = now + 30 * 60;
  const amountDisplay = usdtDisplay(amountBaseUnits);
  const sql = db.prepare(
    "INSERT INTO genesis_payment_intents(" +
    "payment_intent_id,identity_id,source_wallet_address_id,network,asset_identifier,treasury_address," +
    "amount_base_units,amount_display,principal_start_base_units,principal_end_base_units," +
    "allowance_credit_usdt_base_units,tier_breakdown_json,rules_version,terms_version,status,created_at,expires_at" +
    ") VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
  ).bind(
    paymentIntentId,
    identity.identity_id,
    wallet.wallet_address_id,
    network,
    canonical.tokenIdentifier,
    canonical.treasuryAddress,
    amountBaseUnits,
    amountDisplay,
    tranchePlan.cumulativeQualifyingPrincipalBeforeBaseUnits,
    tranchePlan.cumulativeQualifyingPrincipalAfterBaseUnits,
    tranchePlan.purchaseAllowanceUsdtBaseUnits,
    JSON.stringify(tranchePlan.tierBreakdown),
    GENESIS_QUALIFYING_RULES_VERSION,
    termsVersion,
    "OPEN",
    now,
    expiresAt
  );

  try {
    await db.batch([
      db.prepare(
        "UPDATE genesis_wallet_identities SET terms_version=?,terms_accepted_at=?,updated_at=? " +
        "WHERE identity_id=? AND identity_status='ACTIVE'"
      ).bind(termsVersion, now, now, identity.identity_id),
      sql
    ]);
  } catch (cause) {
    if (/unique constraint|genesis_one_open_qualifying_payment_intent|another open/i.test(String(cause?.message || cause))) {
      throw error(409, "Another qualifying-payment intent has reserved the shared Genesis tranche. Refresh the payment status and try again.");
    }
    throw error(409, "The qualifying-payment intent could not reserve the global USDT tranche safely: " + String(cause?.message || "database constraint"));
  }

  const row = await db.prepare(
    "SELECT * FROM genesis_payment_intents WHERE payment_intent_id=? AND identity_id=?"
  ).bind(paymentIntentId, identity.identity_id).first();
  if (!row) throw error(503, "The qualifying-payment intent was not persisted and no payment instructions were created.");
  return {
    paymentIntent: paymentIntentPublicView(row),
    instructions: {
      asset: "USDT",
      label: gate.label,
      network,
      standard: gate.standard,
      amount: amountDisplay,
      amountBaseUnits,
      receivingAddress: canonical.treasuryAddress,
      tokenIdentifier: canonical.tokenIdentifier,
      expiresAt: new Date(expiresAt * 1000).toISOString(),
      networkFeePolicy: "The registered wallet owner pays the network fee separately using the network's native fee asset/resources. It is not deducted from the USDT principal.",
      paymentMethod: "MANUAL_EXACT_AMOUNT_TRANSFER",
      walletTransactionSubmitted: false,
      warning: "Send only the exact USDT amount on the displayed network and canonical token. Do not use another asset, another network or an unregistered sending address."
    },
    qualification: {
      rulesVersion: GENESIS_QUALIFYING_RULES_VERSION,
      proposedPurchaseAllowanceUsdtBaseUnits: tranchePlan.purchaseAllowanceUsdtBaseUnits,
      proposedPurchaseAllowanceUsdt: usdtDisplay(tranchePlan.purchaseAllowanceUsdtBaseUnits),
      tierBreakdown: tranchePlan.tierBreakdown,
      notCreditedUntilIndependentlyVerifiedReceipt: true
    }
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
  if (identity) {
    if (identity.identity_status !== "ACTIVE") throw error(403, "This Genesis wallet identity is suspended or retired.");
    return identity;
  }

  if (genesisRegistrationClosed(await loadGenesisProgrammeControl(db))) {
    throw error(403, "New Genesis primary-wallet registration is permanently closed from the 24-hour pre-launch cutoff.");
  }

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
        ).bind(randomId("gwa"), identityId, challenge.network, challenge.address, challenge.address_normalized, now, signatureMethod(challenge.network), now)
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
    "WHERE p.public_visible=1 AND p.finality_status='FINALIZED' AND i.identity_status='ACTIVE' AND i.genesis_member_status='ACTIVE' " +
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

export { normalizeDisplayName, randomDisplayName, explorerUrl, createMessage };

export async function handleGenesisWalletApi(request, env, config) {
  const db = env?.SUPPORTERS_DB;
  if (!db) return response(503, { error: "The isolated Genesis Programme service is not bound." });
  const url = new URL(request.url);
  try {
    if (url.pathname === "/api/genesis/name-availability" && request.method === "GET") {
      await rateLimit(db, env, request, "name-availability", 60, 3600);
      const name = url.searchParams.get("name") || "";
      const identity = await currentIdentity(db, request);
      const checked = await nameAvailability(db, name, identity?.identity_id || null);
      return response(200, { available: checked.available, displayName: checked.name, message: checked.available ? "Display name available." : "Display name is already in use." });
    }
    if (url.pathname === "/api/genesis/treasury-receipts" && request.method === "GET") {
      await rateLimit(db, env, request, "public-treasury-receipts", 120, 3600);
      return response(200, {
        items: await publicGenesisTreasuryReceipts(db),
        publicReceiptRegister: true,
        operationalSource: "ASTROCROWN_RECEIVING_WALLET_MONITOR",
        explorerPurpose: "COMMUNITY_VERIFICATION_ONLY",
      });
    }
    if (url.pathname === "/api/genesis/directory" && request.method === "GET") {
      await rateLimit(db, env, request, "public-directory", 120, 3600);
      return response(200, { items: await directory(db), publicLedger: true });
    }
    if (url.pathname === "/api/genesis/payment-intents" && request.method === "GET") {
      await rateLimit(db, env, request, "payment-intents-read", 60, 3600);
      const identity = await currentIdentity(db, request);
      if (!identity) throw error(401, "Authenticate with the Genesis primary wallet before viewing payment intents.");
      await expireStaleGenesisPaymentIntents(db);
      const rows = await db.prepare(
        "SELECT * FROM genesis_payment_intents WHERE identity_id=? ORDER BY created_at DESC LIMIT 10"
      ).bind(identity.identity_id).all();
      return response(200, {
        items: (rows.results || []).map(paymentIntentPublicView),
        paymentAcceptance: await genesisPaymentAcceptanceSummary(db, env)
      });
    }
    if (url.pathname === "/api/genesis/me" && request.method === "GET") {
      const identity = await currentIdentity(db, request);
      if (!identity) return response(401, { error: "Connect and prove control of the primary wallet to access this Genesis wallet identity." });
      return response(200, await identityProfile(db, identity, env));
    }
    if (request.method !== "POST") return response(405, { error: "This Genesis wallet endpoint requires POST." });
    let expectedOrigin;
    try {
      expectedOrigin = new URL(config.origin).origin;
    } catch {
      throw error(503, "The Genesis wallet service origin is not configured safely.");
    }
    if (request.headers.get("Origin") !== expectedOrigin) {
      throw error(403, "Genesis wallet challenges and wallet changes are accepted only from the official AstroCrown origin.");
    }
    const payload = await readJson(request);

    if (url.pathname === "/api/genesis/payment-intents" && request.method === "POST") {
      await rateLimit(db, env, request, "payment-intent-create", 12, 3600);
      const identity = await currentIdentity(db, request);
      if (!identity) throw error(401, "Authenticate with your Genesis primary wallet before requesting a qualifying-payment intent.");
      await assertGenesisProfileMutationsOpen(await loadGenesisProgrammeControl(db));
      const result = await createGenesisPaymentIntent(db, env, identity, payload);
      return response(201, result);
    }

    if (url.pathname === "/api/genesis/payment-intents/cancel" && request.method === "POST") {
      await rateLimit(db, env, request, "payment-intent-cancel", 20, 3600);
      const identity = await currentIdentity(db, request);
      if (!identity) throw error(401, "Authenticate with your Genesis primary wallet before cancelling an intent.");
      const intentId = String(payload.paymentIntentId || "");
      if (!/^gpi_[A-Za-z0-9_-]{20,40}$/.test(intentId)) throw error(400, "The payment intent identifier is invalid.");
      const now = Math.floor(Date.now() / 1000);
      await expireStaleGenesisPaymentIntents(db, now);
      const result = await db.prepare(
        "UPDATE genesis_payment_intents SET status='CANCELLED' " +
        "WHERE payment_intent_id=? AND identity_id=? AND status='OPEN' AND expires_at>?"
      ).bind(intentId, identity.identity_id, now).run();
      if (Number(result.meta?.changes || 0) !== 1) throw error(409, "This qualifying-payment intent is no longer open or does not belong to this Genesis identity.");
      return response(200, { cancelled: true, paymentIntentId: intentId });
    }

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
      const control = await loadGenesisProgrammeControl(db);
      if (!existing && genesisRegistrationClosed(control)) {
        throw error(403, "New Genesis wallet registration is permanently closed from 24 hours before the scheduled ACROWN launch. Only a previously registered primary wallet may sign in.");
      }
      return response(200, await issueChallenge(db, config, {
        identityId: existing?.identity_id || null, network, address: normalized.address, purpose: "IDENTIFY"
      }));
    }

    if (url.pathname === "/api/genesis/identity/verify") {
      await rateLimit(db, env, request, "identity-verify");
      const challenge = await consumeChallenge(db, payload.challengeId, "IDENTIFY", config);
      if (!challenge.identity_id && genesisRegistrationClosed(await loadGenesisProgrammeControl(db))) {
        throw error(403, "This wallet was not registered before the permanent Genesis cutoff. New primary-wallet registration is closed.");
      }
      await authenticateSignature(challenge, payload.signature);
      const identity = await getOrCreateIdentity(db, challenge);
      const setCookie = await createSession(db, identity.identity_id, config.origin);
      return response(200, await identityProfile(db, identity), { "Set-Cookie": setCookie });
    }

    if (url.pathname === "/api/genesis/wallet-link/challenge") {
      assertGenesisProfileMutationsOpen(await loadGenesisProgrammeControl(db));
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
      assertGenesisProfileMutationsOpen(await loadGenesisProgrammeControl(db));
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
      return response(200, await identityProfile(db, refreshed, env));
    }

    if (url.pathname === "/api/genesis/display-name/challenge") {
      assertGenesisProfileMutationsOpen(await loadGenesisProgrammeControl(db));
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
      assertGenesisProfileMutationsOpen(await loadGenesisProgrammeControl(db));
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
      let updated;
      try {
        updated = await db.prepare(
          "UPDATE genesis_wallet_identities SET display_name=?,display_name_normalized=?,updated_at=? " +
          "WHERE identity_id=? AND NOT EXISTS (SELECT 1 FROM genesis_wallet_identities other " +
          "WHERE other.display_name_normalized=? AND other.identity_id!=?)"
        ).bind(name.name, name.normalized, Math.floor(Date.now() / 1000), identity.identity_id, name.normalized, identity.identity_id).run();
      } catch (cause) {
        if (/unique constraint|display_name_normalized/i.test(String(cause?.message || cause))) {
          throw error(409, "This display name has just been claimed by another wallet. Choose another name.");
        }
        throw cause;
      }
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
