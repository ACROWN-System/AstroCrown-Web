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

export async function supporterStatusResponse(env) {
  const db = env?.SUPPORTERS_DB;
  if (!db) {
    return json(503, {
      error: "The isolated Genesis Programme database is not bound. Payment acceptance is unavailable.",
    });
  }

  try {
    const [program, result, genesisControl] = await Promise.all([
      db.prepare(
        "SELECT environment,status,activated_at,closes_at,rules_version " +
        "FROM supporter_program WHERE singleton = 1"
      ).first(),
      db.prepare(
        "SELECT network,network_identifier,token_identifier,token_decimals,treasury_address,enabled " +
        "FROM supporter_network_config ORDER BY network"
      ).all(),
      db.prepare(
        "SELECT acrown_launched_at,acs_floor_purchase_opened_at,purchase_window_started_at," +
        "purchase_window_last_purchase_at,purchase_window_closes_at " +
        "FROM genesis_programme_control WHERE singleton=1"
      ).first(),
    ]);

    const now = Math.floor(Date.now() / 1000);
    const lifecycle = {
      acrownLaunchedAt: genesisControl?.acrown_launched_at ? Number(genesisControl.acrown_launched_at) : null,
      acsFloorPurchaseOpenedAt: genesisControl?.acs_floor_purchase_opened_at ? Number(genesisControl.acs_floor_purchase_opened_at) : null,
      purchaseWindowStartedAt: genesisControl?.purchase_window_started_at ? Number(genesisControl.purchase_window_started_at) : null,
      purchaseWindowLastPurchaseAt: genesisControl?.purchase_window_last_purchase_at ? Number(genesisControl.purchase_window_last_purchase_at) : null,
      purchaseWindowClosesAt: genesisControl?.purchase_window_closes_at ? Number(genesisControl.purchase_window_closes_at) : null,
      purchaseWindowRemainingSeconds: genesisControl?.purchase_window_closes_at
        ? Math.max(0, Number(genesisControl.purchase_window_closes_at) - now) : null,
      purchaseWindowOpen: Boolean(genesisControl?.purchase_window_started_at && genesisControl?.purchase_window_closes_at &&
        now >= Number(genesisControl.purchase_window_started_at) && now < Number(genesisControl.purchase_window_closes_at)),
      inactivityPeriodSeconds: 15552000,
      inactivityPeriodLabel: "180 days of inactivity"
    };
    const payload = buildSupporterStatus(program, result?.results || []);
    return json(200, { ...payload, programmeLifecycle: lifecycle });
  } catch {
    return json(503, {
      error: "The isolated Genesis Programme database could not be qualified. Qualifying payments remain disabled.",
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
      qualifyingPaymentsAccepted: false,
      reason: "Mainnet payment intake is not enabled. No payment intent or transfer request can be created.",
    },
    purchaseAllowance: {
      separateFromQualifyingPayment: true,
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
};