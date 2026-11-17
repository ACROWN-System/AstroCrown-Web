import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { getAddress, isAddress, recoverMessageAddress } from "viem";

const LOCAL_HOST = "127.0.0.1";
const PORT = 8765;
const LOCAL_ORIGIN = `http://${LOCAL_HOST}:${PORT}`;
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export function getEthereumTreasuryProofRuntime(env = process.env) {
  if (env.CODESPACES === "true") {
    const name = String(env.CODESPACE_NAME || "");
    const forwardingDomain = String(env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN || "");
    if (!/^[a-z0-9-]{3,80}$/i.test(name) ||
        !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z]{2,63}$/i.test(forwardingDomain)) {
      throw new Error("GitHub Codespaces forwarding identity is incomplete or invalid; refusing to expose the proof server.");
    }
    const expectedHost = `${name}-${PORT}.${forwardingDomain}`.toLowerCase();
    return Object.freeze({
      mode: "github-codespaces",
      host: "0.0.0.0",
      port: PORT,
      origin: `https://${expectedHost}`,
      expectedHost,
    });
  }
  return Object.freeze({
    mode: "local",
    host: LOCAL_HOST,
    port: PORT,
    origin: LOCAL_ORIGIN,
    expectedHost: `${LOCAL_HOST}:${PORT}`,
  });
}

const RUNTIME = getEthereumTreasuryProofRuntime();
const MAX_BODY_BYTES = 4096;
const PROOF_DIRECTORY = join(homedir(), "Documents", "AstroCrown", "Genesis", "TreasuryProofs");

const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AstroCrown Genesis — Ethereum Treasury Control Proof</title>
<style>
:root{color-scheme:dark;font:16px/1.5 system-ui,sans-serif;background:#080d1b;color:#edf2ff}
body{max-width:820px;margin:36px auto;padding:0 18px}
main{background:#111a2d;border:1px solid #31415f;border-radius:14px;padding:24px}
h1{font-size:1.55rem;margin-top:0}
p{color:#c5d0e5}
.warning{border-left:4px solid #d5a84e;padding:10px 14px;background:#1e1a16}
button{background:#d9b45d;color:#17130b;border:0;border-radius:8px;padding:12px 18px;font-weight:700;cursor:pointer;margin:8px 8px 8px 0}
button:disabled{opacity:.5;cursor:not-allowed}
pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#080d18;border:1px solid #34435f;padding:14px;border-radius:8px}
#status{white-space:pre-wrap;overflow-wrap:anywhere;color:#b8d7ff}
code{overflow-wrap:anywhere}
</style>
</head>
<body>
<main>
<h1>Genesis Programme — Ethereum Treasury Control Proof</h1>
<p>This tool checks control of the supplied public Ethereum address using one short-lived, off-chain <code>personal_sign</code> challenge.</p>
<div class="warning">
<strong>Safety boundary</strong>
<p>It must request only a readable message signature. It must not request a transaction, token approval, transfer, spending permission, seed phrase or private key. Reject any prompt that asks for anything other than signing the displayed message.</p>
</div>
<p><strong>Target address:</strong> <code id="target">Loading…</code></p>
<p><strong>Required network:</strong> Ethereum Mainnet (chain ID 1)</p>
<button id="connect">Connect and prepare proof</button>
<button id="sign" disabled>Sign displayed proof message</button>
<pre id="message">No challenge has been issued.</pre>
<p id="status" role="status">The proof server is restricted to loopback or a private, authenticated GitHub Codespaces forwarded port. It does not contact an external service.</p>
</main>
<script>
"use strict";
const connectButton = document.getElementById("connect");
const signButton = document.getElementById("sign");
const targetElement = document.getElementById("target");
const messageElement = document.getElementById("message");
const statusElement = document.getElementById("status");
let expectedAddress = "";
let challengeMessage = "";
let selectedAddress = "";
let ethereumProvider = null;

function setStatus(value) { statusElement.textContent = value; }
function toHexUtf8(value) {
  return "0x" + Array.from(new TextEncoder().encode(value), byte => byte.toString(16).padStart(2, "0")).join("");
}
async function postJson(path, data) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    cache: "no-store",
    credentials: "same-origin"
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Local proof service returned HTTP " + response.status + ".");
  return body;
}

connectButton.addEventListener("click", async () => {
  connectButton.disabled = true;
  signButton.disabled = true;
  challengeMessage = "";
  messageElement.textContent = "Checking the connected wallet and Ethereum Mainnet…";
  try {
    if (!window.ethereum || window.ethereum.isMetaMask !== true) {
      throw new Error("MetaMask was not detected. Open this page in the Edge profile where the Genesis wallet is installed.");
    }
    ethereumProvider = window.ethereum;
    const accounts = await ethereumProvider.request({ method: "eth_requestAccounts" });
    const chainId = await ethereumProvider.request({ method: "eth_chainId" });
    if (!Array.isArray(accounts) || accounts.length === 0) throw new Error("No MetaMask account was connected.");
    selectedAddress = accounts[0];
    if (chainId !== "0x1") throw new Error("MetaMask is not on Ethereum Mainnet (chain ID 1). Current chain ID: " + chainId + ". No signature was requested. Select Ethereum Mainnet in MetaMask and retry.");
    if (selectedAddress.toLowerCase() !== expectedAddress.toLowerCase()) {
      throw new Error("The connected account does not match the Genesis Ethereum treasury address shown above. No signature was requested. Select the Genesis account and retry.");
    }
    const issued = await postJson("/api/challenge", { address: selectedAddress, chainId });
    challengeMessage = issued.message;
    messageElement.textContent = challengeMessage;
    signButton.disabled = false;
    setStatus("Wallet and chain match. Review every line of the message above. Only then choose “Sign displayed proof message”.");
  } catch (error) {
    setStatus(error && error.message ? error.message : String(error));
  } finally {
    connectButton.disabled = false;
  }
});

signButton.addEventListener("click", async () => {
  signButton.disabled = true;
  try {
    if (!ethereumProvider || !challengeMessage) throw new Error("Prepare a fresh challenge first.");
    const accounts = await ethereumProvider.request({ method: "eth_accounts" });
    const chainId = await ethereumProvider.request({ method: "eth_chainId" });
    if (!Array.isArray(accounts) || !accounts[0] || accounts[0].toLowerCase() !== expectedAddress.toLowerCase()) {
      throw new Error("The selected MetaMask account changed. No signature was requested. Reconnect and prepare a fresh challenge.");
    }
    if (chainId !== "0x1") throw new Error("The selected network changed. No signature was requested. Reconnect on Ethereum Mainnet.");
    const signature = await ethereumProvider.request({
      method: "personal_sign",
      params: [toHexUtf8(challengeMessage), selectedAddress]
    });
    const result = await postJson("/api/verify", { signature });
    setStatus("VERIFIED — " + result.recoveredAddress + "\nEvidence saved in the proof environment: " + result.evidenceFile + "\nNo blockchain transaction was sent.");
    messageElement.textContent = challengeMessage + "\n\nSignature:\n" + signature;
  } catch (error) {
    setStatus(error && error.message ? error.message : String(error));
    signButton.disabled = false;
  }
});

(async () => {
  try {
    const response = await fetch("/api/info", { cache: "no-store" });
    if (!response.ok) throw new Error("Local proof service is unavailable.");
    const info = await response.json();
    expectedAddress = info.expectedAddress;
    targetElement.textContent = expectedAddress;
    setStatus("Ready. The tool will reject any address other than the expected Genesis Ethereum address.");
  } catch (error) {
    setStatus(error.message || String(error));
    connectButton.disabled = true;
  }
})();
</script>
</body>
</html>`;

export function createEthereumTreasuryChallenge({ address, nonce, issuedAt, expirationTime, origin = RUNTIME.origin, expectedOrigin = RUNTIME.origin }) {
  if (!isAddress(address)) throw new TypeError("A valid Ethereum address is required.");
  const normalized = getAddress(address);
  let parsedOrigin;
  try {
    parsedOrigin = new URL(origin);
  } catch {
    throw new TypeError("The challenge origin is invalid.");
  }
  if (parsedOrigin.origin !== expectedOrigin || parsedOrigin.username || parsedOrigin.password ||
      parsedOrigin.pathname !== "/" || parsedOrigin.search || parsedOrigin.hash) {
    throw new TypeError("The challenge origin must exactly match the configured proof origin.");
  }
  if (typeof nonce !== "string" || !/^[a-f0-9]{32}$/.test(nonce)) {
    throw new TypeError("The challenge nonce must be 16 random bytes encoded as lowercase hex.");
  }
  const issued = new Date(issuedAt);
  const expires = new Date(expirationTime);
  if (!Number.isFinite(issued.getTime()) || !Number.isFinite(expires.getTime()) || expires <= issued) {
    throw new TypeError("Challenge timestamps are invalid.");
  }
  return [
    `${parsedOrigin.host} wants you to sign in with your Ethereum account:`,
    normalized,
    "",
    "AstroCrown Genesis Programme — Ethereum treasury control proof.",
    "I confirm control of the public Ethereum address shown above for Genesis Programme treasury onboarding.",
    "This is an off-chain message signature only. It does not authorize a transaction, token approval, transfer, contract interaction, payment or spending.",
    "",
    `URI: ${parsedOrigin.origin}/`,
    "Version: 1",
    "Chain ID: 1",
    `Nonce: ${nonce}`,
    `Issued At: ${issued.toISOString()}`,
    `Expiration Time: ${expires.toISOString()}`,
    "Request ID: ASTROCROWN-GENESIS-ETHEREUM-TREASURY-CONTROL-V1",
    "Resources:",
    "- urn:astrocrown:genesis:treasury:ethereum",
    ""
  ].join("\n");
}

export async function verifyEthereumTreasurySignature({ message, signature, expectedAddress }) {
  if (typeof message !== "string" || typeof signature !== "string" || !/^0x[0-9a-f]{130}$/i.test(signature)) {
    throw new TypeError("A complete personal_sign message and 65-byte signature are required.");
  }
  if (!isAddress(expectedAddress)) throw new TypeError("A valid expected Ethereum address is required.");
  const recoveredAddress = getAddress(await recoverMessageAddress({ message, signature }));
  const expected = getAddress(expectedAddress);
  return { valid: recoveredAddress === expected, recoveredAddress, expectedAddress: expected };
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Content-Security-Policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
  });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  let raw = "";
  for await (const chunk of request) {
    raw += chunk;
    if (Buffer.byteLength(raw) > MAX_BODY_BYTES) throw new Error("Request body is too large.");
  }
  return JSON.parse(raw);
}

async function main() {
  const terminal = createInterface({ input: stdin, output: stdout });
  const supplied = (await terminal.question("Enter the Genesis public Ethereum address (never enter a private key or recovery phrase): ")).trim();
  terminal.close();
  if (!isAddress(supplied)) throw new Error("The supplied Ethereum address is not valid.");
  const expectedAddress = getAddress(supplied);
  let challenge = null;
  let consumed = false;

  const server = createServer(async (request, response) => {
    try {
      if (request.headers.host !== RUNTIME.expectedHost) return sendJson(response, 403, { error: "Unexpected Host header." });
      const url = new URL(request.url || "/", RUNTIME.origin);
      if (request.method === "GET" && url.pathname === "/") {
        response.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
          "Referrer-Policy": "no-referrer",
          "Content-Security-Policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
        });
        response.end(PAGE);
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/info") {
        return sendJson(response, 200, { expectedAddress, chainId: "0x1", origin: RUNTIME.origin });
      }
      if (request.headers.origin !== RUNTIME.origin) return sendJson(response, 403, { error: "Request origin did not match the configured proof page." });
      if (request.method === "POST" && url.pathname === "/api/challenge") {
        if (challenge || consumed) return sendJson(response, 409, { error: "A challenge has already been issued in this session. Restart the local tool for a fresh challenge." });
        const body = await readJson(request);
        if (typeof body.address !== "string" || getAddress(body.address) !== expectedAddress) {
          return sendJson(response, 400, { error: "Connected wallet does not match the expected Genesis Ethereum address." });
        }
        if (body.chainId !== "0x1") return sendJson(response, 400, { error: "Ethereum Mainnet (chain ID 1) is required." });
        const issuedAt = new Date();
        const expirationTime = new Date(issuedAt.getTime() + CHALLENGE_TTL_MS);
        const nonce = randomBytes(16).toString("hex");
        const message = createEthereumTreasuryChallenge({
          address: expectedAddress,
          nonce,
          issuedAt,
          expirationTime,
          origin: RUNTIME.origin,
          expectedOrigin: RUNTIME.origin
        });
        challenge = { message, issuedAt, expirationTime, nonce };
        return sendJson(response, 200, { message, expectedAddress, chainId: "0x1", expiresAt: expirationTime.toISOString() });
      }
      if (request.method === "POST" && url.pathname === "/api/verify") {
        if (!challenge || consumed) return sendJson(response, 410, { error: "No unused challenge is available. Restart the tool and prepare a fresh one." });
        if (Date.now() > challenge.expirationTime.getTime()) {
          consumed = true;
          return sendJson(response, 410, { error: "The challenge expired. Restart the tool to create a new one." });
        }
        const body = await readJson(request);
        const verification = await verifyEthereumTreasurySignature({
          message: challenge.message,
          signature: body.signature,
          expectedAddress
        });
        if (!verification.valid) return sendJson(response, 400, { error: "The signature recovered a different address. No proof was recorded." });
        consumed = true;
        const proof = {
          proofType: "ASTROCROWN_GENESIS_ETHEREUM_TREASURY_CONTROL_V1",
          verification: "VALID",
          verifiedAt: new Date().toISOString(),
          expectedAddress,
          recoveredAddress: verification.recoveredAddress,
          chainId: "0x1",
          domain: RUNTIME.origin,
          nonce: challenge.nonce,
          issuedAt: challenge.issuedAt.toISOString(),
          expirationTime: challenge.expirationTime.toISOString(),
          message: challenge.message,
          signature: body.signature,
          method: "EIP-191 personal_sign",
          note: "Off-chain proof of address control at verifiedAt. No transaction or token approval was requested or sent."
        };
        await mkdir(PROOF_DIRECTORY, { recursive: true });
        const fileName = `genesis-ethereum-treasury-proof-${Date.now()}.json`;
        const evidencePath = join(PROOF_DIRECTORY, fileName);
        await writeFile(evidencePath, JSON.stringify(proof, null, 2) + "\n", { flag: "wx", mode: 0o600 });
        return sendJson(response, 200, { verified: true, recoveredAddress: verification.recoveredAddress, evidenceFile: evidencePath });
      }
      return sendJson(response, 404, { error: "Not found." });
    } catch (error) {
      return sendJson(response, 400, { error: error && error.message ? error.message : "The local proof request failed." });
    }
  });

  server.listen(RUNTIME.port, RUNTIME.host, () => {
    stdout.write("\nGenesis Ethereum treasury proof tool is ready.\n");
    stdout.write(`Mode: ${RUNTIME.mode}\n`);
    stdout.write(`Expected address: ${expectedAddress}\n`);
    if (RUNTIME.mode === "github-codespaces") {
      stdout.write(`Open this HTTPS URL in the Edge profile containing the Genesis MetaMask wallet: ${RUNTIME.origin}\n`);
      stdout.write(`Codespaces port-forward detection hint: http://127.0.0.1:${PORT}\n`);
      stdout.write("In GitHub Codespaces, keep forwarded port 8765 PRIVATE. Never change it to Public.\n");
      stdout.write("The server is bound for the Codespaces proxy but accepts only this exact HTTPS host and origin.\n");
    } else {
      stdout.write(`Open this URL in the Edge profile containing the Genesis MetaMask wallet: ${RUNTIME.origin}\n`);
      stdout.write("The tool listens only on 127.0.0.1.\n");
    }
    stdout.write("No RPC, transaction, token approval or external treasury service is used.\n");
    stdout.write("Press Ctrl+C to stop the proof server.\n");
  });
}

const invoked = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (invoked) {
  main().catch((error) => {
    console.error("Genesis Ethereum proof tool stopped:", error && error.message ? error.message : error);
    process.exitCode = 1;
  });
}
