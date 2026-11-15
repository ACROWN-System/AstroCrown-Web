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
  "index.html",
  "privacy-transparency.html",
  "robots.txt",
  "supporters/index.html",
  "supporters/supporters.js"
].sort();
assert.deepEqual(actualFiles, expectedFiles, "Only the approved publication files may be deployed.");

const homepage = read("index.html");
const supporterPage = read("supporters/index.html");
const supporterJs = read("supporters/supporters.js");
const privacy = read("privacy-transparency.html");
const accountJs = read("account-continuity/prototype/account-ui.js");
const headers = read("_headers");
const robots = read("robots.txt");

assert.match(homepage, /name="robots" content="noindex, nofollow, noarchive"/i);
assert.match(homepage, /Supporter Programme/);
assert.match(homepage, /Privacy &amp; Transparency Centre/);
assert.match(homepage, /illustrative market values/i);
assert.match(homepage, /no live services connected/i);
assert.match(homepage, /You are viewing an unfinished development preview/i);
assert.match(homepage, /var workerStagingMode = false;/);

assert.match(accountJs, /var forceBrowserDemo = true;/);
assert.match(accountJs, /hosted-preview-no-authentication/);
assert.match(accountJs, /read-only interface demonstration/);

assert.match(supporterPage, /noindex, nofollow, noarchive/i);
assert.match(supporterPage, /USDT contributions and ACROWN purchases are not enabled/i);
assert.match(supporterPage, /DO NOT SEND FUNDS/i);
assert.match(supporterPage, /ACROWN delivery remains (?:on Solana|Solana-based)/i);
assert.match(supporterPage, /Ethereum \(ERC-20\), Tron \(TRC-20\) and Solana \(SPL\)/i);
assert.match(supporterPage, /25 ACROWN per USDT 1/i);
assert.match(supporterPage, /USDT 1,000,000/i);
assert.match(supporterPage, /25,000,000 ACROWN/i);
assert.match(supporterPage, /wallet registration closes at 00:00:00 UTC on the day before the official public-deployment event/i);
assert.match(supporterPage, /full floor-price consideration must reach the ACS reserve/i);
assert.match(supporterPage, /one all-inclusive ACROWN-denominated Paymaster fee/i);
assert.match(supporterPage, /unused personal allowance does not expire merely through non-use/i);
assert.match(supporterPage, /180 consecutive days after launch/i);
assert.match(supporterPage, /all unused wallet-specific allowances cease to be usable/i);
assert.match(supporterPage, /all ordinary\/public ACROWN purchase routes operated or authorized by AstroCrown remain disabled until the official ACROWN launch/i);
assert.match(supporterPage, /registration-countdown-stage/);
assert.match(supporterPage, /launch-countdown-stage/);
assert.match(supporterPage, /data-public-deployment-at=""/);
assert.match(supporterPage, /Wallet loss receives no recovery, replacement, allowance transfer or refund/i);
assert.match(supporterPage, /Each linked wallet has its own allowance and purchase history/i);
assert.match(supporterJs, /initializePublicEventCountdown/);
assert.match(supporterPage, /unused personal allowance/i);
assert.match(supporterPage, /The 25,000,000-ACROWN programme ceiling applies to everyone/i);
assert.doesNotMatch(supporterPage, /no separate per-wallet token ceiling|the wallet may purchase up to the entire remaining programme allowance/i);
assert.match(supporterJs, /TIP6963:announceProvider/);
assert.match(supporterJs, /eth_requestAccounts/);
assert.match(supporterJs, /standard:connect/);
assert.match(supporterPage, /No supporter contributions accepted in this development preview/i);
assert.match(supporterPage, /USDT transfers not enabled/i);
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
