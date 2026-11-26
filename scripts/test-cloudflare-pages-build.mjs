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
  "account-continuity/prototype/wallet-identity-assurance.html",
  "account-continuity/prototype/account-ui.js",
  "account-continuity/prototype/admin-wallet-ui.js",
  "assets/genesis-member-dna.svg",
  "index.html",
  "page-entry/feature-status.json",
  "page-entry/page-entry-notice.css",
  "page-entry/page-entry-notice.js",
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
const walletAssurance = read("account-continuity/prototype/wallet-identity-assurance.html");
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
assert.match(homepage, /name="astro-page-id" content="home"/);
assert.match(homepage, /page-entry\/page-entry-notice\.js/);
assert.match(supporterPage, /name="astro-page-id" content="genesis"/);
assert.match(supporterPage, /page-entry\/page-entry-notice\.js/);
assert.match(privacy, /name="astro-page-id" content="legal"/);
const pageNoticeJs = read("page-entry/page-entry-notice.js");
const pageNoticeCss = read("page-entry/page-entry-notice.css");
const featureStatus = JSON.parse(read("page-entry/feature-status.json"));
assert.match(pageNoticeJs, /Before you continue/);
assert.match(pageNoticeJs, /account-continuity\\/prototype\\/privacy-policy\\.html/);
assert.match(pageNoticeJs, /privacy-transparency\\.html/);
assert.match(pageNoticeJs, /globalNotice\.acknowledgement/);
assert.match(pageNoticeCss, /astro-entry-notice/);
assert.equal(featureStatus.notice_version, "2026-11-26-public-test-v2");
assert.match(homepage, new RegExp(featureStatus.notice_version));
assert.match(featureStatus.global_notice.acknowledgement, /I confirm that I have read and understood/);
assert.ok(featureStatus.pages.home && featureStatus.pages.genesis && featureStatus.pages.account);
for (const page of Object.values(featureStatus.pages)) {
  assert.ok(["LIVE · STAGING", "LIVE · MAINNET", "DEVNET", "FOR DEVELOPMENT · READ ONLY"].includes(page.delivery.status));
  for (const feature of page.features) {
    assert.ok(["LIVE · STAGING", "LIVE · MAINNET", "DEVNET", "FOR DEVELOPMENT · READ ONLY"].includes(feature.status));
    if (feature.status === "DEVNET") {
      assert.ok(feature.network && feature.faucet && /^https:\/\//.test(feature.faucet.url));
    }
  }
}

assert.match(accountJs, /var forceBrowserDemo = true;/);
assert.match(accountJs, /function renderWalletPrimaryStatus\(\)/);
assert.match(accountJs, /typeof workerStagingMode/);
assert.match(accountJs, /browserPreviewMode/);
assert.match(accountJs, /Sign in with wallet/);
assert.match(accountJs, /Why wallet\?/);
assert.match(walletAssurance, /name="astro-page-id" content="account"/);
assert.match(walletAssurance, /primary wallet is your account identity/i);
assert.match(walletAssurance, /Current status: FOR DEVELOPMENT · READ ONLY/);
assert.match(accountJs, /hosted-preview-no-authentication/);
assert.match(accountJs, /read-only interface demonstration/);

assert.match(supporterPage, /noindex, nofollow, noarchive/i);
assert.match(supporterPage, /USDT qualifying payments and ACROWN purchases are not enabled/i);
assert.match(supporterPage, /DO NOT SEND FUNDS/i);
assert.match(supporterPage, /ACROWN delivery remains (?:on Solana|Solana-based)/i);
assert.match(supporterPage, /Ethereum \(ERC-20\), Tron \(TRC-20\) and Solana \(SPL\)/i);
assert.match(supporterPage, /30×.*USDT 10,000.*25×.*20×.*15×.*10×/is);
assert.match(supporterPage, /USDT 1,000,000.*USDT-denominated/i);
assert.match(supporterPage, /registered wallet owner.*network fee.*separately/is);
assert.match(supporterPage, /full USDT principal.*ACS reserve destination.*V/is);
assert.match(supporterPage, /id="participant-network-fee-policy"/i);
assert.doesNotMatch(supporterPage, /25 ACROWN per USD₮|USDT 150 transition threshold|USDT 250,000 target/i);
assert.match(supporterPage, /Exactly 24 hours before the scheduled official ACROWN launch, Genesis activity pauses/i);
assert.match(supporterPage, /New Genesis primary-wallet registration remains permanently closed/i);
assert.match(supporterPage, /180 days of inactivity/i);
assert.doesNotMatch(supporterPage, /\b180 days\b(?! of inactivity)/i);
assert.match(supporterPage, /How does the rolling 180 days of inactivity timer work/i);
assert.match(supporterPage, /shared programme-wide countdown starts at ACROWN launch/i);
assert.match(supporterPage, /At official ACROWN launch, the Genesis Programme resumes for all identities registered before the cutoff/i);
assert.match(supporterPage, /Members may continue purchasing remaining Genesis rights/i);
assert.match(supporterPage, /New Genesis primary-wallet registration remains permanently closed/i);
assert.doesNotMatch(supporterPage, /After ACROWN launches and the qualified ACS floor-purchase facility is operational, only wallets registered/i);
assert.match(supporterPage, /each completed, finalized purchase of remaining Genesis rights or ACROWN at the ACS floor price resets/i);
assert.match(supporterPage, /id="genesis-public-purchase-inactivity-countdown"/i);
assert.match(supporterPage, /id="genesis-purchase-inactivity-countdown"/i);
assert.match(supporterPage, /only unused shared purchase allowance is subject to the inactivity period/i);
assert.doesNotMatch(supporterPage, /qualified ACS floor-price token-purchase service has actually become available.*countdown/i);
assert.match(supporterPage, /Any eligible identity registered before the permanent cutoff may purchase any amount up to the entire remaining pool/i);
assert.match(supporterPage, /there is no personal purchase allowance|no personal per-wallet purchase cap/i);
assert.match(supporterPage, /USDT purchase allowance within a programme-wide limit/i);
assert.match(supporterPage, /one shared,? programme-wide USDT purchase-allowance pool/i);
assert.match(supporterPage, /Total programme-wide USDT purchase allowance/i);
assert.doesNotMatch(supporterPage, /programme-wide ACROWN cap/i);
assert.match(supporterPage, /One global allowance pool applies to everyone/i);
assert.match(supporterPage, /Any one eligible pre-freeze registered wallet may purchase the entire remaining pool/i);
assert.match(supporterPage, /no personal allowance balance or per-wallet cap exists/i);
assert.match(supporterJs, /TIP6963:announceProvider/);
assert.match(supporterJs, /eth_requestAccounts/);
assert.match(supporterJs, /standard:connect/);
assert.match(supporterPage, /No qualifying payments have been published/i);
assert.doesNotMatch(supporterPage, /Supporter Programme|early supporter programme|supporter contribution|supporter funds/i);
assert.match(supporterPage, /USDT transfers not enabled/i);
assert.match(supporterPage, /The primary wallet is the sole Genesis identity, login authority and recovery anchor/i);
assert.match(supporterPage, /it is not the owner of a personal share of the programme-wide purchase pool/i);
assert.match(supporterPage, /Your wallet is your Genesis identity and access key/i);
assert.match(supporterPage, /The USDT purchase allowance is one shared Genesis programme-wide pool, not an amount owned by or capped per wallet/i);
assert.match(supporterPage, /A payment is accepted only when its on-chain sender matches an address already verified and linked to that primary identity for the same network/i);
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
