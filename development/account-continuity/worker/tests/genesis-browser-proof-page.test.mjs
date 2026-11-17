import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Script } from "node:vm";
import test from "node:test";

const pageUrl = new URL("../../../../preview/genesis-ethereum-treasury-proof.html", import.meta.url);
const html = await readFile(pageUrl, "utf8");

function inlineScripts(source) {
  return [...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(match => match[1]);
}

test("Genesis browser proof page is pinned to the approved no-index HTTPS URL", () => {
  assert.match(html, /<meta name="robots" content="noindex, nofollow, noarchive">/);
  assert.match(html, /const APPROVED_ORIGIN = "https:\/\/acrown-system\.github\.io"/);
  assert.match(html, /const APPROVED_PATH = "\/AstroCrown-Web\/preview\/genesis-ethereum-treasury-proof\.html"/);
});

test("Genesis browser proof uses MetaMask account and Ethereum Mainnet checks before signing", () => {
  assert.match(html, /method: "eth_requestAccounts"/);
  assert.match(html, /method: "eth_chainId"/);
  assert.match(html, /chainId !== "0x1"/);
  assert.match(html, /targetAddress\.toLowerCase\(\)/);
  assert.match(html, /method: "eth_accounts"/);
  assert.match(html, /method: "personal_sign"/);
  assert.match(html, /params: \[toHexUtf8\(challenge\.message\), challenge\.connectedAddress\]/);
});

test("Genesis browser proof uses a random one-time nonce and five-minute expiry", () => {
  assert.match(html, /crypto\.getRandomValues\(new Uint8Array\(16\)\)/);
  assert.match(html, /CHALLENGE_LIFETIME_MS = 5 \* 60 \* 1000/);
  assert.match(html, /Nonce: /);
  assert.match(html, /Expiration Time: /);
});

test("proof is downloaded as pending offline verification and is never submitted to a server", () => {
  assert.match(html, /proofStatus: "PENDING_OFFLINE_VERIFICATION"/);
  assert.match(html, /method: "EIP-191 personal_sign"/);
  assert.match(html, /new Blob\(\[proofJson\]/);
  assert.match(html, /link\.download = "astrocrown-genesis-ethereum-proof-/);
  assert.match(html, /externalSubmission: false/);
  assert.doesNotMatch(html, /fetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage|indexedDB/i);
});

test("page does not request a transaction or signing/approval method other than personal_sign", () => {
  const scripts = inlineScripts(html);
  assert.equal(scripts.length, 1);
  const source = scripts[0];
  new Script(source, { filename: pageUrl.pathname });
  const methods = [...source.matchAll(/method:\s*"([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual([...new Set(methods)].sort(), ["eth_accounts", "eth_chainId", "eth_requestAccounts", "personal_sign"]);
  for (const forbidden of ["eth_sendTransaction", "eth_signTransaction", "eth_sendRawTransaction", "wallet_sendCalls", "approve"]) {
    assert.equal(source.includes(forbidden), false, "unexpected wallet method in page: " + forbidden);
  }
});

test("no remote scripts, stylesheets, images or font services are loaded", () => {
  assert.doesNotMatch(html, /<script\b[^>]*\bsrc=/i);
  assert.doesNotMatch(html, /<link\b[^>]*\brel=["']stylesheet["']/i);
  assert.doesNotMatch(html, /https?:\/\/(?!acrown-system\.github\.io)/i);
});
