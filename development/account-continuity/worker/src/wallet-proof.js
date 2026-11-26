import {
  getAddress,
  isAddress,
  keccak256,
  recoverAddress,
  recoverMessageAddress,
  toBytes,
} from "viem";

const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function bytesToBigInt(bytes) {
  let value = 0n;
  for (const byte of bytes) value = (value << 8n) | BigInt(byte);
  return value;
}

function hex(bytes) {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

function base58Decode(value) {
  if (typeof value !== "string" || value.length < 1 || value.length > 64) {
    throw fail(400, "The wallet address is invalid.");
  }
  let number = 0n;
  for (const character of value) {
    const digit = BASE58.indexOf(character);
    if (digit < 0) throw fail(400, "The wallet address contains invalid base58 characters.");
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

function fromBase64url(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
    const binary = atob(padded);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

async function sha256(value) {
  const data = typeof value === "string" ? new TextEncoder().encode(value) : value;
  return new Uint8Array(await crypto.subtle.digest("SHA-256", data));
}

function constantTimeEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string" || left.length !== right.length) return false;
  let different = 0;
  for (let index = 0; index < left.length; index += 1) {
    different |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return different === 0;
}

async function tronChecksum(payload) {
  return (await sha256(await sha256(payload))).slice(0, 4);
}

export async function normalizeWalletAddress(network, address) {
  if (typeof address !== "string" || address.length > 128) {
    throw fail(400, "Enter a valid public wallet address.");
  }
  if (network === "ethereum") {
    if (!isAddress(address)) throw fail(400, "The Ethereum wallet address is invalid.");
    const normalized = getAddress(address);
    return { address: normalized, normalized: normalized.toLowerCase() };
  }
  if (network === "tron") {
    const decoded = base58Decode(address);
    if (decoded.length !== 25 || decoded[0] !== 0x41) {
      throw fail(400, "The TRON address is not a valid Mainnet Base58Check address.");
    }
    const payload = decoded.slice(0, 21);
    const expected = await tronChecksum(payload);
    if (!constantTimeEqual(hex(decoded.slice(21)), hex(expected))) {
      throw fail(400, "The TRON address checksum is invalid.");
    }
    const canonical = base58Encode(decoded);
    if (canonical !== address) throw fail(400, "The TRON address is not canonical.");
    return { address: canonical, normalized: canonical };
  }
  if (network === "solana") {
    const decoded = base58Decode(address);
    if (decoded.length !== 32 || base58Encode(decoded) !== address) {
      throw fail(400, "The Solana wallet must be a canonical 32-byte public address.");
    }
    return { address, normalized: address };
  }
  throw fail(400, "Only Ethereum, TRON and Solana Mainnet wallets are supported.");
}

export async function verifyWalletSignature(challenge, signature) {
  const message = challenge?.message;
  if (typeof message !== "string" || typeof signature !== "string" || signature.length > 512) return false;
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
      if (!signatureBytes || publicKey.length !== 32 || signatureBytes.length !== 64) return false;
      const key = await crypto.subtle.importKey("raw", publicKey, { name: "Ed25519" }, false, ["verify"]);
      return await crypto.subtle.verify("Ed25519", key, signatureBytes, new TextEncoder().encode(message));
    }
  } catch {
    return false;
  }
  return false;
}

export { base58Encode };
