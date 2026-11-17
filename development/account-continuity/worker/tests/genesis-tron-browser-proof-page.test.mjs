import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Script } from "node:vm";
import test from "node:test";

const pageUrl = new URL("../../../../preview/genesis-tron-treasury-proof.html", import.meta.url);
const html = await readFile(pageUrl, "utf8");

function inlineScripts(source) {
  return [...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(match => match[1]);
}

test("Genesis TRON browser proof is pinned to its exact no-index HTTPS URL", () => {
  assert.match(html, /<meta name="robots" content="noindex, nofollow, noarchive">/);
  assert.match(html, /const APPROVED_ORIGIN = "https:\/\/acrown-system\.github\.io"/);
  assert.match(html, /const APPROVED_PATH = "\/AstroCrown-Web\/preview\/genesis-tron-treasury-proof\.html"/);
});

test("Genesis TRON proof requires TronLink, address match, and the documented Mainnet network switch", () => {
  assert.match(html, /window\.tron\.isTronLink !== true/);
  assert.match(html, /method: "eth_requestAccounts"/);
  assert.match(html, /connectedAddress !== targetAddress/);
  assert.match(html, /method: "wallet_switchEthereumChain"/);
  assert.match(html, /MAINNET_CHAIN_ID = "0x2b6653dc"/);
  assert.match(html, /switchResult !== null/);
});

test("Genesis TRON proof uses TIP-191 message signing and local address recovery", () => {
  assert.match(html, /trx\.signMessageV2\(signingChallenge\.message\)/);
  assert.match(html, /trx\.verifyMessageV2\(signingChallenge\.message, signature\)/);
  assert.match(html, /recoveredAddress !== signingChallenge\.connectedAddress/);
  assert.match(html, /browserSignatureVerified: true/);
  assert.match(html, /method: "TRON TIP-191 signMessageV2"/);
});

test("Genesis TRON proof reads the documented chainChanged payload and invalidates on network changes", () => {
  assert.ok(html.includes('walletProvider.on("chainChanged", ({ chainId } = {}) =>'));
  assert.ok(html.includes('activeChainId = typeof chainId === "string" ? chainId : ""'));
  assert.ok(html.includes('walletProvider.on("accountsChanged"'));
  assert.ok(html.includes("invalidateChallenge("));
  assert.ok(html.includes("activeChainId !== MAINNET_CHAIN_ID"));
});

test("Genesis TRON proof uses a random nonce and five-minute challenge", () => {
  assert.match(html, /crypto\.getRandomValues\(new Uint8Array\(16\)\)/);
  assert.match(html, /CHALLENGE_LIFETIME_MS = 5 \* 60 \* 1000/);
  assert.match(html, /Nonce: /);
  assert.match(html, /Expiration Time: /);
});

test("TRON proof is pending offline verification and never submitted to a server", () => {
  assert.match(html, /proofStatus: "PENDING_OFFLINE_VERIFICATION"/);
  assert.match(html, /networkSwitchConfirmedByWallet: true/);
  assert.match(html, /transactionSent: false/);
  assert.match(html, /tokenApprovalRequested: false/);
  assert.match(html, /externalSubmission: false/);
  assert.match(html, /new Blob\(\[proofJson\]/);
  assert.match(html, /link\.download = "astrocrown-genesis-tron-proof-/);
  assert.doesNotMatch(html, /fetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage|indexedDB/i);
});


test("TRON proof rejects a signature or recovery that completes after expiry or challenge invalidation", () => {
  const source = inlineScripts(html)[0];
  const start = source.indexOf('elements.sign.addEventListener("click"');
  const end = source.indexOf('elements.download.addEventListener("click"', start);
  assert.ok(start >= 0 && end > start, "signing handler must exist");
  const handler = source.slice(start, end);
  const signCall = handler.indexOf("await tronWeb.trx.signMessageV2(signingChallenge.message)");
  const verifyCall = handler.indexOf("await tronWeb.trx.verifyMessageV2(signingChallenge.message, signature)", signCall);
  const evidence = handler.indexOf("const evidence = {", verifyCall);
  assert.ok(signCall >= 0 && verifyCall > signCall && evidence > verifyCall);
  const afterSignExpiry = handler.indexOf("Date.now() > Date.parse(signingChallenge.expirationTime)", signCall);
  const afterVerifyExpiry = handler.indexOf("Date.now() > Date.parse(signingChallenge.expirationTime)", verifyCall);
  assert.ok(afterSignExpiry > signCall, "expiry must be rechecked after the wallet signing prompt resolves");
  assert.ok(afterVerifyExpiry > verifyCall && afterVerifyExpiry < evidence, "expiry must be rechecked after recovery and before evidence creation");
  const invalidationChecks = [...handler.matchAll(/challenge !== signingChallenge/g)].map(match => match.index);
  assert.ok(invalidationChecks.length >= 2 && invalidationChecks[0] > signCall && invalidationChecks[1] > verifyCall,
    "account/network invalidation must be checked after both asynchronous operations");
});

test("TRON page requests only connection and network-switch methods, not transactions", () => {
  const scripts = inlineScripts(html);
  assert.equal(scripts.length, 1);
  const source = scripts[0];
  new Script(source, { filename: pageUrl.pathname });
  const methods = [...source.matchAll(/request\(\{\s*method:\s*"([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual([...new Set(methods)].sort(), ["eth_requestAccounts", "wallet_switchEthereumChain"]);
  for (const forbidden of ["eth_sendTransaction", "eth_signTransaction", "eth_sendRawTransaction", "wallet_sendCalls", "sendRawTransaction"]) {
    assert.equal(source.includes(forbidden), false, "unexpected transaction capability: " + forbidden);
  }
  assert.equal(source.includes("tronWeb.trx.sign("), false);
});

test("TRON page uses no remote scripts, stylesheets, images, or font services", () => {
  assert.doesNotMatch(html, /<script\b[^>]*\bsrc=/i);
  assert.doesNotMatch(html, /<link\b[^>]*\brel=["']stylesheet["']/i);
  assert.doesNotMatch(html, /https?:\/\/(?!acrown-system\.github\.io)/i);
  assert.doesNotMatch(html, /TAKHQcuJ3RLsZZxCorWc3rav6M28dS6VTR/);
});
