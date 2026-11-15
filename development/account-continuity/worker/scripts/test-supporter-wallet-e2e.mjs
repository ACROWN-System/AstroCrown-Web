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
  assert.ok(raw, "Expected an HttpOnly supporter session cookie.");
  const pair = raw.split(";", 1)[0];
  assert.match(pair, /^acrown_supporter_session=[A-Za-z0-9_-]{40,}$/);
  return pair;
}

async function request(path, { method = "GET", payload, cookie } = {}) {
  const headers = {
    Origin: origin,
    "CF-Connecting-IP": rateIp,
    Accept: "application/json",
  };
  if (payload !== undefined) headers["Content-Type"] = "application/json";
  if (cookie) headers.Cookie = cookie;
  const response = await fetch(origin + path, {
    method,
    headers,
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
  let data = {};
  try { data = await response.json(); } catch {}
  return { response, data };
}

async function post(path, payload, cookie) {
  const result = await request(path, { method: "POST", payload, cookie });
  assert.equal(
    result.response.status,
    200,
    path + " returned HTTP " + result.response.status + ": " + (result.data.error || "unknown error"),
  );
  return { data: result.data, cookie: cookieFrom(result.response) || cookie };
}

async function profile(cookie) {
  const result = await request("/api/supporters/me", { cookie });
  assert.equal(result.response.status, 200, "Authenticated supporter /me endpoint failed: " + JSON.stringify(result.data));
  return result.data;
}

const evm = privateKeyToAccount("0x" + "0".repeat(63) + "1");
const tron = privateKeyToAccount("0x" + "0".repeat(63) + "2");
const username = "WorkerTest" + Date.now().toString(36).slice(-5);

const registration = await post("/api/supporters/registration/challenge", {
  username,
  network: "ethereum",
  address: evm.address,
});
assert.equal(registration.data.network, "ethereum");
assert.match(registration.data.message, /off-chain message signature only/i);
assert.match(registration.data.message, /Chain ID: 1/);
const registrationSignature = await evm.signMessage({ message: registration.data.message });
const registered = await post("/api/supporters/registration/verify", {
  challengeId: registration.data.challengeId,
  signature: registrationSignature,
});
assert.equal(registered.data.member.username, username);
assert.equal(registered.data.wallets.length, 1);
assert.equal(registered.data.wallets[0].network, "ethereum");
assert.equal(registered.data.wallets[0].ownershipVerifiedAt !== null, true);
let sessionCookie = registered.cookie;

const firstProfile = await profile(sessionCookie);
assert.equal(firstProfile.member.username, username);
assert.equal(firstProfile.wallets.length, 1);

const replay = await request("/api/supporters/registration/verify", {
  method: "POST",
  payload: { challengeId: registration.data.challengeId, signature: registrationSignature },
});
assert.equal(replay.response.status, 410, "A consumed registration challenge must not be reusable.");

const loginChallenge = await post("/api/supporters/login/challenge", {
  network: "ethereum",
  address: evm.address,
}, sessionCookie);
const loginSignature = await evm.signMessage({ message: loginChallenge.data.message });
const loggedIn = await post("/api/supporters/login/verify", {
  challengeId: loginChallenge.data.challengeId,
  signature: loginSignature,
}, sessionCookie);
assert.equal(loggedIn.data.member.username, username);
sessionCookie = loggedIn.cookie;

const tronWalletAddress = tronAddress(tron.address);
const tronChallenge = await post("/api/supporters/wallet-challenge", {
  network: "tron",
  address: tronWalletAddress,
  walletRole: "PAYMENT",
}, sessionCookie);
const tronSignature = await signTronMessage(tron, tronChallenge.data.message);
const linkedTron = await post("/api/supporters/wallet-verify", {
  challengeId: tronChallenge.data.challengeId,
  signature: tronSignature,
  purpose: "LINK_WALLET",
}, sessionCookie);
assert.equal(linkedTron.data.wallets.some((wallet) => wallet.network === "tron" && wallet.role === "PAYMENT"), true);

const solana = await createSolanaSigner();
const solanaPaymentChallenge = await post("/api/supporters/wallet-challenge", {
  network: "solana",
  address: solana.address,
  walletRole: "PAYMENT",
}, sessionCookie);
const solanaPaymentSignature = await solana.sign(solanaPaymentChallenge.data.message);
const linkedSolanaPayment = await post("/api/supporters/wallet-verify", {
  challengeId: solanaPaymentChallenge.data.challengeId,
  signature: solanaPaymentSignature,
  purpose: "LINK_WALLET",
}, sessionCookie);
assert.equal(linkedSolanaPayment.data.wallets.some((wallet) => wallet.network === "solana" && wallet.role === "PAYMENT"), true);

const deliveryChallenge = await post("/api/supporters/wallet-challenge", {
  network: "solana",
  address: solana.address,
  walletRole: "ACROWN_DELIVERY",
}, sessionCookie);
assert.equal(deliveryChallenge.data.purpose, "DELIVERY");
const deliverySignature = await solana.sign(deliveryChallenge.data.message);
const linkedDelivery = await post("/api/supporters/wallet-verify", {
  challengeId: deliveryChallenge.data.challengeId,
  signature: deliverySignature,
  purpose: "DELIVERY",
}, sessionCookie);
assert.equal(
  linkedDelivery.data.wallets.some((wallet) => wallet.network === "solana" && wallet.role === "PAYMENT_AND_DELIVERY"),
  true,
  "The same Solana wallet must require and pass a second, separate delivery-purpose signature.",
);

const finalProfile = await profile(sessionCookie);
assert.equal(finalProfile.wallets.length, 3);
assert.equal(finalProfile.paymentStatus, "DISABLED");
assert.equal(finalProfile.contributionsAccepted, false);
assert.equal(finalProfile.wallets.some((wallet) => wallet.network === "tron"), true);
assert.equal(finalProfile.wallets.some((wallet) => wallet.network === "solana" && wallet.role === "PAYMENT_AND_DELIVERY"), true);

const logout = await post("/api/supporters/logout", {}, sessionCookie);
assert.equal(logout.data.loggedOut, true);
const afterLogout = await request("/api/supporters/me", { cookie: sessionCookie });
assert.equal(afterLogout.response.status, 401, "Logout must revoke the supporter session.");

console.log(JSON.stringify({
  result: "PASS",
  tests: [
    "Ethereum mainnet pseudonymous registration with EIP-191 ownership proof",
    "single-use challenge replay rejection",
    "wallet-based login and HttpOnly session creation",
    "Tron mainnet additional payment wallet with TIP-191 signature",
    "Solana payment wallet with Ed25519 ownership proof",
    "separate second signature to promote that Solana wallet to PAYMENT_AND_DELIVERY",
    "member profile retrieves all three independently verified wallets",
    "logout revokes the supporter session",
    "contributions and purchases remain disabled",
  ],
  member: "synthetic local-only test identity",
  privateKeys: "generated for this local test process only; never transmitted or persisted",
  liveFunds: "none",
}, null, 2));
