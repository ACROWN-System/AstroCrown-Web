#!/usr/bin/env node
/**
 * Dependency-free acceptance tests for the Cloudflare Pages public-preview bundle.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
assert.ok(fs.existsSync(DIST), "Run the Cloudflare Pages build before this test.");

function read(relativePath) {
  const fullPath = path.join(DIST, relativePath);
  assert.ok(fs.existsSync(fullPath), "Missing published file: " + relativePath);
  return fs.readFileSync(fullPath, "utf8");
}
function walk(directory, prefix = "") {
  const output = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const relative = path.posix.join(prefix, entry.name);
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...walk(absolute, relative));
    else output.push(relative);
  }
  return output.sort();
}

const actualFiles = walk(DIST);
const expectedFiles = [
  "_headers",
  "_redirects",
  "account-continuity/prototype/account-prototype.css",
  "account-continuity/prototype/account-ui.js",
  "account-continuity/prototype/admin-wallet-ui.js",
  "assets/genesis-member-dna.svg",
  "index.html",
  "privacy-transparency.html",
  "robots.txt",
  "supporters/index.html",
  "supporters/supporters.js",
  "supporters/wallet-provider-adapters.mjs"
].sort();
assert.deepEqual(actualFiles, expectedFiles, "Only the approved publication files may be deployed.");

const homepage = read("index.html");
const supporterPage = read("supporters/index.html");
const supporterJs = read("supporters/supporters.js");
const walletAdapters = read("supporters/wallet-provider-adapters.mjs");
const privacy = read("privacy-transparency.html");
const accountJs = read("account-continuity/prototype/account-ui.js");
const headers = read("_headers");
const robots = read("robots.txt");

assert.match(homepage, /name="robots" content="noindex, nofollow, noarchive"/i);
assert.match(homepage, /Genesis Programme/);
assert.doesNotMatch(homepage, /Supporter Programme/i);
assert.match(homepage, /Privacy &amp; Transparency Centre/);
assert.match(homepage, /illustrative market values/i);
assert.match(homepage, /no live services connected/i);
assert.match(homepage, /You are viewing an unfinished development preview/i);
assert.match(homepage, /var workerStagingMode = false;/);

assert.match(accountJs, /var forceBrowserDemo = true;/);
assert.match(accountJs, /hosted-preview-no-authentication/);
assert.match(accountJs, /read-only interface demonstration/);

assert.match(supporterPage, /noindex, nofollow, noarchive/i);
assert.match(supporterPage, /USDT qualifying payments and ACROWN purchases are not enabled/i);
assert.match(supporterPage, /DO NOT SEND FUNDS/i);
assert.match(supporterPage, /ACROWN delivery remains (?:on Solana|Solana-based)/i);
assert.match(supporterPage, /Ethereum \(ERC-20\), Tron \(TRC-20\) and Solana \(SPL\)/i);
assert.match(supporterPage, /1,000 USD₮ at 25 ACROWN per USD₮ gives a 25,000 ACROWN allowance/i);
assert.match(supporterPage, /180-day purchase period begins at that operational activation/i);
assert.match(supporterPage, /unused personal allowance/i);
assert.match(supporterPage, /Any approved global ceiling applies to everyone/i);
assert.doesNotMatch(supporterPage, /no separate per-wallet token ceiling|the wallet may purchase up to the entire remaining programme allowance/i);
assert.match(supporterJs, /TIP6963:announceProvider/);
assert.match(supporterJs, /eth_requestAccounts/);
assert.match(supporterJs, /standard:connect/);
assert.match(supporterPage, /No qualifying payments have been published/i);
assert.doesNotMatch(supporterPage, /Supporter Programme|early supporter programme|supporter contribution|supporter funds/i);
assert.match(supporterPage, /USDT transfers not enabled/i);
assert.match(supporterPage, /The primary wallet is the identity, recovery anchor and entitlement holder/i);
assert.match(supporterPage, /Your wallet is your Genesis identity and entitlement/i);
assert.match(supporterPage, /ACROWN purchase entitlement belongs to the primary wallet/i);
assert.match(supporterPage, /A payment is not attributed to the primary wallet until its source address and transaction have both passed verification/i);
assert.match(supporterPage, /gold DNA Genesis Member badge/i);
assert.match(supporterPage, /Explorer links reveal the full public address and its on-chain history/i);
assert.match(supporterPage, /Genesis Member distinction/i);
assert.match(supporterPage, /gold DNA Genesis Member badge/i);
assert.doesNotMatch(supporterPage, /contribution|donation|charity|fundraising|supporter funds/i);
assert.match(read("assets/genesis-member-dna.svg"), /<svg[^>]+viewBox=/i);
// The standalone Pages build is intentionally disconnected: only the staging Worker
// build injects the runtime marker. The shared script must therefore keep member actions
// disabled and return before any challenge/signature request when the marker is absent.
assert.doesNotMatch(supporterPage, /name=["']astro-supporter-runtime["']/i);
assert.match(supporterJs, /function supporterRuntimeMarkerPresent\(\)/);
assert.match(supporterJs, /!supporterRuntimeMarkerPresent\(\)/);
assert.match(supporterJs, /signSupporterChallenge\(wallet, challenge\.message\)/);
assert.match(supporterJs, /personal_sign/);
assert.match(supporterJs, /signMessageV2/);
assert.match(supporterJs, /solana:signMessage/);
assert.match(supporterJs, /discoverDirectEvmProviders/);
assert.match(walletAdapters, /sol_signMessage/);
assert.match(walletAdapters, /signMessageV2/);
assert.match(walletAdapters, /isSolanaMainnet/);
// No transaction or typed-data submission method may be called. Explanatory comments
// may name such methods so that users and auditors know which prompts to reject.
assert.doesNotMatch(supporterJs, /\.request\(\s*\{\s*method\s*:\s*["'](?:eth_sign|eth_signTypedData(?:_v4)?|eth_sendTransaction|eth_sendRawTransaction|wallet_sendCalls)["']/i);
assert.doesNotMatch(supporterJs, /signTransaction\s*\(/);
assert.doesNotMatch(supporterJs, /signAndSendTransaction\s*\(/);

assert.match(privacy, /Privacy &amp; Transparency Centre/);
assert.match(privacy, /noindex, nofollow, noarchive/i);
assert.match(privacy, /what public blockchains reveal/i);
assert.match(headers, /X-Content-Type-Options: nosniff/i);
assert.match(headers, /X-Robots-Tag: noindex, nofollow, noarchive/i);
assert.match(robots, /Disallow:\s*\//);

// Every relative href/src must resolve inside the static publication bundle.
for (const [pagePath, html] of [
  ["index.html", homepage],
  ["privacy-transparency.html", privacy],
  ["supporters/index.html", supporterPage]
]) {
  for (const match of html.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)) {
    const value = match[1].trim();
    if (!value || value.startsWith("#") || /^(?:[a-z]+:|\/\/)/i.test(value)) continue;
    const resolved = new URL(value, "https://site.invalid/" + pagePath);
    const pathname = decodeURIComponent(resolved.pathname).replace(/^\/+/, "");
    if (!pathname || pathname === pagePath) continue;
    const candidate = path.join(DIST, pathname);
    const exists = fs.existsSync(candidate) || fs.existsSync(path.join(candidate, "index.html"));
    assert.ok(exists, "Broken local reference from " + pagePath + ": " + value);
  }
}

console.log("Cloudflare Pages static-preview tests passed.");
console.log("Published allowlist: " + actualFiles.length + " files.");
console.log("The standalone Pages build has no Worker runtime marker or account API; registration/signing controls remain disabled and no transaction/payment method is present.");
