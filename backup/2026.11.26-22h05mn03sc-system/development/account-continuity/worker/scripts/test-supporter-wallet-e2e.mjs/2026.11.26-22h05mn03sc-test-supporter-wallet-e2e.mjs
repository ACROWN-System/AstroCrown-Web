import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, webcrypto } from "node:crypto";
import { privateKeyToAccount } from "viem/accounts";
import { keccak256, toBytes } from "viem";

const origin = process.env.ASTROCROWN_LOCAL_WORKER_ORIGIN || "http://localhost:8787";
const rateIp = "127.0.0.2";

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest();
}

function base58Encode(bytes) {
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let number = BigInt("0x" + Buffer.from(bytes).toString("hex"));
  let encoded = "";
  while (number > 0n) {
    const remainder = Number(number % 58n);
    encoded = alphabet[remainder] + encoded;
    number /= 58n;
  }
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros += 1;
  return "1".repeat(zeros) + encoded;
}

function tronAddress(accountAddress) {
  const payload = new Uint8Array([0x41, ...toBytes(accountAddress)]);
  const checksum = sha256(sha256(payload)).subarray(0, 4);
  return base58Encode(new Uint8Array([...payload, ...checksum]));
}

async function signTronMessage(account, message) {
  const prefix = "\x19TRON Signed Message:\n" + Buffer.byteLength(message, "utf8");
  const hash = keccak256(new Uint8Array([...toBytes(prefix), ...toBytes(message)]));
  return account.sign({ hash });
}

async function createSolanaSigner() {
  const pair = generateKeyPairSync("ed25519");
  const publicDer = new Uint8Array(pair.publicKey.export({ format: "der", type: "spki" }));
  const publicKey = publicDer.slice(-32);
  const address = base58Encode(publicKey);
  const privateDer = new Uint8Array(pair.privateKey.export({ format: "der", type: "pkcs8" }));
  const signingKey = await webcrypto.subtle.importKey("pkcs8", privateDer, { name: "Ed25519" }, false, ["sign"]);
  return {
    address,
    async sign(message) {
      const signature = await webcrypto.subtle.sign("Ed25519", signingKey, new TextEncoder().encode(message));
      return Buffer.from(signature).toString("base64url");
    },
  };
}

function cookieFrom(response) {
  const raw = response.headers.get("set-cookie");
  return raw ? raw.split(";", 1)[0] : "";
}

async function request(pathname, { method = "GET", payload, cookie } = {}) {
  const headers = {
    Origin: origin,
    "CF-Connecting-IP": rateIp,
    Accept: "application/json",
  };
  if (payload !== undefined) headers["Content-Type"] = "application/json";
  if (cookie) headers.Cookie = cookie;
  const response = await fetch(origin + pathname, {
    method,
    headers,
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
  let data = {};
  try { data = await response.json(); } catch {}
  return { response, data };
}

async function post(pathname, payload, cookie) {
  const result = await request(pathname, { method: "POST", payload, cookie });
  assert.equal(
    result.response.status,
    200,
    pathname + " returned HTTP " + result.response.status + ": " + (result.data.error || "unknown error"),
  );
  return { data: result.data, cookie: cookieFrom(result.response) || cookie };
}

async function profile(cookie) {
  const result = await request("/api/genesis/me", { cookie });
  assert.equal(result.response.status, 200, "Authenticated Genesis wallet identity failed: " + JSON.stringify(result.data));
  return result.data;
}

const foreignOriginResponse = await fetch(origin + "/api/genesis/identity/challenge", {
  method: "POST",
  headers: {
    Origin: "https://untrusted.example",
    "CF-Connecting-IP": rateIp,
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  body: JSON.stringify({ network: "ethereum", address: "0x0000000000000000000000000000000000000001" }),
});
assert.equal(foreignOriginResponse.status, 403, "Third-party origins must not use Genesis as a wallet-signature challenge relay.");

const evm = privateKeyToAccount("0x" + "0".repeat(63) + "1");
const secondEvm = privateKeyToAccount("0x" + "0".repeat(63) + "3");
const tron = privateKeyToAccount("0x" + "0".repeat(63) + "2");

// The primary wallet itself creates the Genesis identity. No username or registration form exists.
const primaryChallenge = await post("/api/genesis/identity/challenge", {
  network: "ethereum",
  address: evm.address,
});
assert.equal(primaryChallenge.data.network, "ethereum");
assert.match(primaryChallenge.data.message, /off-chain message signature only/i);
assert.match(primaryChallenge.data.message, /Network: ethereum:mainnet/);
assert.match(primaryChallenge.data.message, /Purpose: IDENTIFY/);
const primarySignature = await evm.signMessage({ message: primaryChallenge.data.message });
const established = await post("/api/genesis/identity/verify", {
  challengeId: primaryChallenge.data.challengeId,
  signature: primarySignature,
});
assert.equal(established.data.walletIdentity.primaryNetwork, "ethereum");
assert.equal(established.data.walletIdentity.primaryAddress, evm.address);
assert.match(established.data.walletIdentity.displayName, /^[A-Za-z0-9][A-Za-z0-9 _-]{2,27}$/);
assert.ok(established.data.walletIdentity.avatarKey);
assert.equal(established.data.genesisMember.status, "NOT_QUALIFIED");
assert.equal(established.data.wallets.length, 1);
assert.equal(established.data.wallets[0].network, "ethereum");
assert.equal(established.data.wallets[0].wallet_role, "PRIMARY");
assert.equal(established.data.paymentAcceptance.enabled, false);
let sessionCookie = established.cookie;
const identityId = established.data.walletIdentity.identityId;

const firstProfile = await profile(sessionCookie);
assert.equal(firstProfile.walletIdentity.identityId, identityId);
assert.equal(firstProfile.walletIdentity.displayName, established.data.walletIdentity.displayName);
assert.equal(firstProfile.programmePurchaseAllowance.scope, "GENESIS_PROGRAMME_GLOBAL");
assert.equal(firstProfile.programmePurchaseAllowance.earnedUsdtBaseUnits, "0");
assert.equal(firstProfile.programmePurchaseAllowance.remainingUsdtBaseUnits, "0");
assert.equal(firstProfile.programmePurchaseAllowance.oneEligibleWalletMayUseEntireRemainder, true);
assert.equal("entitlement" in firstProfile, false);
assert.equal(firstProfile.genesisMember.status, "NOT_QUALIFIED");

// Challenges are single use and cannot be replayed to recreate or reassign a wallet identity.
const replay = await request("/api/genesis/identity/verify", {
  method: "POST",
  payload: { challengeId: primaryChallenge.data.challengeId, signature: primarySignature },
});
assert.equal(replay.response.status, 410, "A consumed primary-wallet challenge must not be reusable.");

// The exact requested public name must be bound into the off-chain signature.
const customName = "Worker Genesis Unique 2026";
const availability = await request("/api/genesis/name-availability?name=" + encodeURIComponent(customName), { cookie: sessionCookie });
assert.equal(availability.response.status, 200);
assert.equal(availability.data.available, true);
const renameChallenge = await post("/api/genesis/display-name/challenge", {
  displayName: customName,
}, sessionCookie);
assert.match(renameChallenge.data.message, new RegExp("Requested public display name: " + customName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
const renameSignature = await evm.signMessage({ message: renameChallenge.data.message });
const renamed = await post("/api/genesis/display-name/verify", {
  challengeId: renameChallenge.data.challengeId,
  signature: renameSignature,
}, sessionCookie);
assert.equal(renamed.data.walletIdentity.displayName, customName);

// A second wallet gets its own identity and cannot take the first wallet's case-insensitive name.
const secondChallenge = await post("/api/genesis/identity/challenge", {
  network: "ethereum",
  address: secondEvm.address,
});
const secondSignature = await secondEvm.signMessage({ message: secondChallenge.data.message });
const secondIdentity = await post("/api/genesis/identity/verify", {
  challengeId: secondChallenge.data.challengeId,
  signature: secondSignature,
});
assert.notEqual(secondIdentity.data.walletIdentity.identityId, identityId);
assert.notEqual(secondIdentity.data.walletIdentity.displayName.toLowerCase(), customName.toLowerCase());
const collision = await request("/api/genesis/name-availability?name=" + encodeURIComponent(customName.toLowerCase()), { cookie: secondIdentity.cookie });
assert.equal(collision.response.status, 200);
assert.equal(collision.data.available, false);
const collisionChallenge = await request("/api/genesis/display-name/challenge", {
  method: "POST",
  payload: { displayName: customName.toLowerCase() },
  cookie: secondIdentity.cookie,
});
assert.equal(collisionChallenge.response.status, 409, "A second wallet must not claim an existing display name.");

// Link distinct chain addresses to the primary wallet only after each chain-specific signature proves control.
const tronWalletAddress = tronAddress(tron.address);
const tronChallenge = await post("/api/genesis/wallet-link/challenge", {
  network: "tron",
  address: tronWalletAddress,
  walletRole: "PAYMENT",
}, sessionCookie);
assert.match(tronChallenge.data.message, /Address purpose: PAYMENT/);
const tronSignature = await signTronMessage(tron, tronChallenge.data.message);
const linkedTron = await post("/api/genesis/wallet-link/verify", {
  challengeId: tronChallenge.data.challengeId,
  signature: tronSignature,
}, sessionCookie);
assert.equal(linkedTron.data.wallets.some((wallet) => wallet.network === "tron" && wallet.wallet_role === "PAYMENT"), true);

const solana = await createSolanaSigner();
const solanaChallenge = await post("/api/genesis/wallet-link/challenge", {
  network: "solana",
  address: solana.address,
  walletRole: "PAYMENT_AND_DELIVERY",
}, sessionCookie);
assert.match(solanaChallenge.data.message, /Address purpose: PAYMENT_AND_DELIVERY/);
const solanaSignature = await solana.sign(solanaChallenge.data.message);
const linkedSolana = await post("/api/genesis/wallet-link/verify", {
  challengeId: solanaChallenge.data.challengeId,
  signature: solanaSignature,
}, sessionCookie);
assert.equal(
  linkedSolana.data.wallets.some((wallet) => wallet.network === "solana" && wallet.wallet_role === "PAYMENT_AND_DELIVERY"),
  true,
);

const finalProfile = await profile(sessionCookie);
assert.equal(finalProfile.wallets.length, 3);
assert.equal(finalProfile.walletIdentity.displayName, customName);
assert.equal(finalProfile.walletIdentity.identityId, identityId);
assert.equal(finalProfile.paymentAcceptance.enabled, false);
assert.equal(finalProfile.programmePurchaseAllowance.scope, "GENESIS_PROGRAMME_GLOBAL");
assert.equal(finalProfile.programmePurchaseAllowance.remainingUsdtBaseUnits, "0");
assert.equal(finalProfile.wallets.some((wallet) => wallet.network === "tron"), true);
assert.equal(finalProfile.wallets.some((wallet) => wallet.network === "solana" && wallet.wallet_role === "PAYMENT_AND_DELIVERY"), true);

// Legacy user-account endpoints are retired rather than creating a second identity model.
const legacy = await request("/api/supporters/me", { cookie: sessionCookie });
assert.equal(legacy.response.status, 410, "Legacy member-account endpoint must be retired.");

// Logout removes only the temporary session; reconnecting the same primary wallet restores the same identity.
const logout = await post("/api/genesis/logout", {}, sessionCookie);
assert.equal(logout.data.loggedOut, true);
const afterLogout = await request("/api/genesis/me", { cookie: sessionCookie });
assert.equal(afterLogout.response.status, 401, "Logout must revoke the temporary wallet session.");

const reconnectChallenge = await post("/api/genesis/identity/challenge", {
  network: "ethereum",
  address: evm.address,
});
const reconnectSignature = await evm.signMessage({ message: reconnectChallenge.data.message });
const reconnected = await post("/api/genesis/identity/verify", {
  challengeId: reconnectChallenge.data.challengeId,
  signature: reconnectSignature,
});
assert.equal(reconnected.data.walletIdentity.identityId, identityId);
assert.equal(reconnected.data.walletIdentity.displayName, customName);
assert.equal(reconnected.data.wallets.length, 3);
assert.equal(reconnected.data.programmePurchaseAllowance.scope, "GENESIS_PROGRAMME_GLOBAL");
assert.equal(reconnected.data.programmePurchaseAllowance.remainingUsdtBaseUnits, "0");
assert.equal(reconnected.data.genesisMember.status, "NOT_QUALIFIED");

console.log(JSON.stringify({
  result: "PASS",
  tests: [
    "primary Ethereum wallet establishes identity without a registered user account",
    "wallet-bound random public name and avatar are generated",
    "off-chain primary-wallet challenge is single-use",
    "foreign origins cannot use Genesis as a wallet-signature challenge relay",
    "custom display name is included in the signed challenge and saved by the primary wallet",
    "case-insensitive public-name collision is rejected",
    "TRON payment address is linked only after TIP-191 proof",
    "Solana payment-and-delivery address is linked only after Ed25519 proof",
    "primary wallet remains the only authentication and recovery anchor",
    "legacy account endpoints return HTTP 410",
    "logout revokes the temporary session and wallet reconnection restores the same identity",
    "Genesis Member status and ACROWN entitlement remain inactive until independently verified qualification",
    "no payment, purchase, entitlement credit, token transfer or live funds are used",
  ],
  identity: "synthetic local-only wallet test identities",
  privateKeys: "generated for this local test process only; never transmitted or persisted",
  liveFunds: "none",
}, null, 2));
