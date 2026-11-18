import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const workerRoot = resolve(import.meta.dirname, "..");
const publicRoot = resolve(workerRoot, "public");

async function readPublic(path) {
  return readFile(resolve(publicRoot, path), "utf8");
}

test("Worker staging build publishes the Genesis Programme at the shared origin", async () => {
  await access(resolve(publicRoot, "supporters/index.html"));
  await access(resolve(publicRoot, "supporters/supporters.js"));
  await access(resolve(publicRoot, "supporters/wallet-provider-adapters.mjs"));
  await access(resolve(publicRoot, "assets/genesis-member-dna.svg"));
  const homepage = await readPublic("index.html");
  assert.match(homepage, /href="\.\/supporters\/">Genesis Programme/);
});

test("published Genesis Programme states that qualifying payments are not open and shows wallet-first identity", async () => {
  const html = await readPublic("supporters/index.html");
  assert.match(html, /DEVELOPMENT PREVIEW/);
  assert.match(html, /USDT QUALIFYING PAYMENTS NOT OPEN/);
  assert.match(html, /DO NOT SEND FUNDS/);
  assert.match(html, /Ethereum \(ERC-20\), Tron \(TRC-20\) and Solana \(SPL\)/);
  assert.match(html, /30×.*USDT 10,000.*25×.*20×.*15×.*10×/s);
  assert.match(html, /USDT 1,000,000.*USDT-denominated/s);
  assert.match(html, /registered wallet owner.*network fee.*separately/s);
  assert.match(html, /full USDT principal.*ACS reserve destination.*V/s);
  assert.match(html, /id="participant-network-fee-policy"/);
  assert.doesNotMatch(html, /25 ACROWN per USD₮|USDT 150 transition threshold|USDT 250,000 target/);
  assert.match(html, /USDT purchase allowance within a programme-wide limit/);
  assert.match(html, /one shared,? programme-wide USDT purchase-allowance pool/i);
  assert.match(html, /Total programme-wide USDT purchase allowance/i);
  assert.doesNotMatch(html, /programme-wide ACROWN cap/);
  assert.match(html, /All Genesis activities freeze exactly 24 hours before the scheduled official ACROWN launch/);
  assert.match(html, /New primary-wallet registration closes permanently at that cutoff and never resumes/);
  assert.match(html, /180 days of inactivity/);
  assert.doesNotMatch(html, /\\b180 days\\b(?! of inactivity)/i);
  assert.match(html, /How does the rolling 180 days of inactivity timer work/);
  assert.match(html, /shared programme-wide countdown starts at ACROWN launch/i);
  assert.match(html, /each completed, finalized purchase of remaining Genesis rights or ACROWN at the ACS floor price resets/i);
  assert.match(html, /id="genesis-public-purchase-inactivity-countdown"/i);
  assert.match(html, /id="genesis-purchase-inactivity-countdown"/i);
  assert.match(html, /only unused shared purchase allowance is subject to the inactivity period/i);
  assert.doesNotMatch(html, /qualified ACS floor-price token-purchase service has actually become available.*countdown/i);
  assert.match(html, /Any one eligible wallet may buy the entire remaining programme-wide allowance/);
  assert.match(html, /there is no personal per-wallet purchase cap/);
  assert.match(html, /id="supporter-tron-wallet-connect"/);
  assert.match(html, /id="supporter-runtime-status"/);
  assert.match(html, /AstroCrown never receives private keys or recovery phrases/);
  assert.match(html, /The primary wallet is the sole Genesis identity, login authority and recovery anchor/);
  assert.match(html, /it does not own a personal share or cap/);
  assert.match(html, /same wallet application on any additional supported network/);
  assert.match(html, /Each address must independently sign a fresh, domain-bound ownership challenge/);
  assert.match(html, /Linked addresses cannot authenticate, recover, rename or administer the Genesis identity/);
  assert.match(html, /must originate from an address already verified and registered in your primary wallet profile/);
  assert.match(html, /Genesis Member distinction/);
  assert.match(html, /gold DNA Genesis Member badge/);
  assert.match(html, /Explorer links expose the full wallet address and associated public transaction history/);
  assert.match(html, /A random display name is generated when the primary wallet is first verified/);
  assert.match(html, /Never share your seed phrase or private key/);
});

test("staging supporter wallet script supports off-chain ownership proofs but no transaction submission", async () => {
  const js = await readPublic("supporters/supporters.js");
  assert.match(js, /eip6963:announceProvider/);
  assert.match(js, /TIP6963:announceProvider/);
  assert.match(js, /wallet-standard:app-ready/);
  assert.match(js, /discoverDirectEvmProviders/);
  assert.match(js, /discoverDirectTronProviders/);
  assert.match(js, /discoverDirectSolanaWallets/);
  assert.match(js, /eth_requestAccounts/);
  assert.match(js, /standard:connect/);
  assert.match(js, /personal_sign/);
  assert.match(js, /signMessageV2/);
  assert.match(js, /solana:signMessage/);
  assert.ok(js.includes("function supporterRuntimeMarkerPresent()"));
  assert.ok(js.includes("if (!supporterRuntimeMarkerPresent() || !wallet || !wallet.mainnet || supporterMember) return;"));
  assert.ok(js.includes("/api/genesis/status"));
  assert.ok(js.includes("/api/genesis/identity/challenge"));
  assert.ok(js.includes("/api/genesis/identity/verify"));
  assert.ok(js.includes("/api/genesis/display-name/challenge"));
  assert.ok(js.includes("/api/genesis/wallet-link/challenge"));
  assert.ok(!js.includes("/api/supporters/registration/"));
  assert.ok(!js.includes("/api/supporters/login/"));
  assert.match(js, /qualifying payments remain closed/i);
  assert.match(js, /window\.setInterval\(tick, 1000\)/);
  assert.match(js, /Latest global timer reset/);
  assert.match(js, /window\.setInterval\(refreshProgrammeStatus, 30000\)/);
  assert.equal(js.includes('method: "eth_sign"'), false);
  assert.equal(js.includes('method: "eth_signTypedData_v4"'), false);
  assert.equal(js.includes('method: "eth_sendTransaction"'), false);
  assert.equal(js.includes('method: "eth_sendRawTransaction"'), false);
  assert.equal(js.includes('method: "wallet_sendCalls"'), false);
  assert.equal(js.includes(".signTransaction("), false);
  assert.equal(js.includes(".signAndSendTransaction("), false);
});
