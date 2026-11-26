import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Script } from "node:vm";
import test from "node:test";

const pageUrl = new URL("../../../../preview/genesis-tron-treasury-proof.html", import.meta.url);
const html = await readFile(pageUrl, "utf8");

function inlineScripts(source) {
  return [...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(match => match[1]);
}

function createTronLinkDiscoveryHarness() {
  const source = inlineScripts(html)[0];
  const start = source.indexOf("let discoveredTronLinkProvider = null;");
  const end = source.indexOf("function createNonce()", start);
  assert.ok(start >= 0 && end > start, "provider-discovery helpers must be present");
  const helperSource = source.slice(start, end) + "\ndiscoverTronLinkProvider;";

  const listeners = new Map();
  const timers = new Map();
  const metrics = { added: 0, removed: 0, requests: 0 };
  let nextTimerId = 0;

  const fakeWindow = {
    tron: null,
    addEventListener(type, listener) {
      metrics.added += 1;
      const current = listeners.get(type) || [];
      current.push(listener);
      listeners.set(type, current);
    },
    removeEventListener(type, listener) {
      metrics.removed += 1;
      const current = listeners.get(type) || [];
      listeners.set(type, current.filter(item => item !== listener));
    },
    setTimeout(callback, delay) {
      const id = ++nextTimerId;
      timers.set(id, { callback, delay });
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
    dispatchEvent(event) {
      if (event.type === "TIP6963:requestProvider") metrics.requests += 1;
      for (const listener of [...(listeners.get(event.type) || [])]) listener(event);
      return true;
    }
  };

  class FakeEvent {
    constructor(type) { this.type = type; }
  }

  const discover = new Script(helperSource).runInNewContext({
    window: fakeWindow,
    Event: FakeEvent
  });

  return {
    discover,
    metrics,
    listeners,
    announce(info, provider) {
      const event = {
        type: "TIP6963:announceProvider",
        detail: { info, provider }
      };
      for (const listener of [...(listeners.get(event.type) || [])]) listener(event);
    },
    runNextTimer() {
      const next = timers.entries().next().value;
      assert.ok(next, "a discovery timeout must be scheduled");
      timers.delete(next[0]);
      next[1].callback();
    }
  };
}

test("Genesis TRON browser proof is pinned to its exact no-index HTTPS URL", () => {
  assert.match(html, /<meta name="robots" content="noindex, nofollow, noarchive">/);
  assert.match(html, /const APPROVED_ORIGIN = "https:\/\/acrown-system\.github\.io"/);
  assert.match(html, /const APPROVED_PATH = "\/AstroCrown-Web\/preview\/genesis-tron-treasury-proof\.html"/);
});

test("Genesis TRON proof discovers the official TronLink provider through TIP-6963 before connecting", () => {
  assert.ok(html.includes("function isTronLinkProvider(candidate)"));
  assert.ok(html.includes("function ensureTronLinkDiscoveryListener()"));
  assert.ok(html.includes("function discoverTronLinkProvider()"));
  assert.ok(html.includes('window.addEventListener("TIP6963:announceProvider", event => {'));
  assert.ok(html.includes("tronLinkDiscoveryListenerInstalled = true;"));
  assert.ok(html.includes('window.dispatchEvent(new Event("TIP6963:requestProvider"))'));
  assert.ok(html.includes('info.name !== "TronLink" && info.rdns !== "org.tronlink.www"'));
  assert.ok(html.includes("provider = await discoverTronLinkProvider()"));
  assert.ok(html.includes("}, 1500);"));
  assert.doesNotMatch(html, /removeEventListener\(["']TIP6963:announceProvider/);
  assert.match(html, /No TronLink provider announced itself to this page/);
});

test("TIP-6963 keeps one announcement listener for the page lifetime after discovery", async () => {
  const harness = createTronLinkDiscoveryHarness();
  const pending = harness.discover();
  const provider = { isTronLink: true, request: async () => [] };

  assert.equal(harness.metrics.added, 1);
  assert.equal(harness.metrics.requests, 1);
  harness.announce({ name: "TronLink", rdns: "org.tronlink.www" }, provider);

  assert.strictEqual(await pending, provider);
  assert.equal(harness.metrics.removed, 0);
  assert.equal(harness.listeners.get("TIP6963:announceProvider").length, 1);
  assert.strictEqual(await harness.discover(), provider);
  assert.equal(harness.metrics.added, 1);
  assert.equal(harness.metrics.requests, 1);
});

test("TIP-6963 retains late announcements after timeout without accumulating listeners", async () => {
  const harness = createTronLinkDiscoveryHarness();
  const firstAttempt = harness.discover();

  assert.equal(harness.metrics.added, 1);
  harness.runNextTimer();
  assert.equal(await firstAttempt, null);
  assert.equal(harness.metrics.removed, 0);

  const lateProvider = { isTronLink: true, request: async () => [] };
  harness.announce({ name: "TronLink", rdns: "org.tronlink.www" }, lateProvider);

  assert.equal(harness.listeners.get("TIP6963:announceProvider").length, 1);
  assert.strictEqual(await harness.discover(), lateProvider);
  assert.equal(harness.metrics.added, 1);
  assert.equal(harness.metrics.removed, 0);
  assert.equal(harness.metrics.requests, 1);
});

test("TIP-6963 coalesces concurrent provider-discovery attempts", async () => {
  const harness = createTronLinkDiscoveryHarness();
  const first = harness.discover();
  const second = harness.discover();

  assert.strictEqual(first, second);
  assert.equal(harness.metrics.added, 1);
  assert.equal(harness.metrics.requests, 1);

  const provider = { isTronLink: true, request: async () => [] };
  harness.announce({ name: "TronLink", rdns: "org.tronlink.www" }, provider);
  assert.strictEqual(await first, provider);
  assert.equal(harness.metrics.removed, 0);
});

test("Genesis TRON proof requires the discovered TronLink provider, address match, and documented Mainnet switch", () => {
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
