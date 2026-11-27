import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const workerRoot = resolve(import.meta.dirname, "..");
const publicRoot = resolve(workerRoot, "public");

async function readPublic(path) {
  return readFile(resolve(publicRoot, path), "utf8");
}

test("Worker staging build publishes the account and Genesis pages at the shared origin", async () => {
  await access(resolve(publicRoot, "supporters/index.html"));
  await access(resolve(publicRoot, "supporters/supporters.js"));
  await access(resolve(publicRoot, "supporters/wallet-provider-adapters.mjs"));
  await access(resolve(publicRoot, "assets/genesis-member-dna.svg"));
  const homepage = await readPublic("index.html");
  assert.match(homepage, /href="\.\/supporters\/">Genesis Programme/);
  assert.match(homepage, /astro-account-runtime/);
});

test("published Genesis profile is part of the same AstroCrown account", async () => {
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
  assert.match(html, /Exactly 24 hours before the scheduled official ACROWN launch, Genesis activity pauses/);
  assert.match(html, /New Genesis primary-wallet registration remains permanently closed/);
  assert.match(html, /180 days of inactivity/);
  assert.doesNotMatch(html, /\b180 days\b(?! of inactivity)/i);
  assert.match(html, /How does the rolling 180 days of inactivity timer work/);
  assert.match(html, /shared programme-wide countdown starts at ACROWN launch/i);
  assert.match(html, /At official ACROWN launch, the Genesis Programme resumes for all identities registered before the cutoff/i);
  assert.match(html, /Members may continue purchasing remaining Genesis rights/i);
  assert.doesNotMatch(html, /After ACROWN launches and the qualified ACS floor-purchase facility is operational, only wallets registered/i);
  assert.match(html, /each completed, finalized purchase of remaining Genesis rights or ACROWN at the ACS floor price resets/i);
  assert.match(html, /id="genesis-public-purchase-inactivity-countdown"/i);
  assert.match(html, /id="genesis-purchase-inactivity-countdown"/i);
  assert.match(html, /only unused shared purchase allowance is subject to the inactivity period/i);
  assert.doesNotMatch(html, /qualified ACS floor-price token-purchase service has actually become available.*countdown/i);
  assert.match(html, /Any eligible identity registered before the permanent cutoff may purchase any amount up to the entire remaining pool/);
  assert.match(html, /there is no personal per-wallet purchase cap/);
  assert.match(html, /id="supporter-tron-wallet-connect"/);
  assert.match(html, /id="supporter-runtime-status"/);

  assert.match(html, /Your Genesis profile, display name, membership status and programme entitlements belong to your existing AstroCrown account/i);
  assert.match(html, /there is no separate Genesis account or Genesis sign-in/i);
  assert.match(html, /The same primary wallet is automatically recorded as your Ethereum identity/i);
  assert.match(html, /You may optionally link additional network addresses/i);
  assert.match(html, /Each additional address must independently prove control/i);
  assert.match(html, /The linked address proves control of itself only and never becomes an account login or spending authorization/i);
  assert.match(html, /a payment must originate from a pre-verified address on its own network/i);
  assert.match(html, /exact asset, amount, network and destination/i);
  assert.match(html, /separate wallet confirmation/i);
  assert.match(html, /No unlimited or automated spending permission is active/i);
  assert.match(html, /separate, explicit, narrowly capped, time-limited and revocable authorization/i);
  assert.match(html, /AstroCrown never receives private keys or recovery phrases/i);
  assert.match(html, /Never share your seed phrase or private key/i);

  assert.match(html, /id="supporter-account-login"/);
  assert.match(html, /Sign in to your AstroCrown account/);
  assert.match(html, /id="supporter-link-wallet"/);
  assert.match(html, /Verify and link additional address/);
  assert.doesNotMatch(html, /Continue with this primary wallet|Legacy sign-in unavailable|Disconnect wallet session|Create Genesis account|Genesis registration/i);
});

test("published Genesis script reads the existing AstroCrown session and only links optional addresses", async () => {
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
  assert.match(js, /supporterRuntimeMarkerPresent/);
  assert.match(js, /\/api\/genesis\/me/);
  assert.match(js, /\/api\/genesis\/wallet-link\/challenge/);
  assert.match(js, /\/api\/genesis\/wallet-link\/verify/);
  assert.doesNotMatch(js, /\/api\/genesis\/identity\/|\/api\/genesis\/logout/);
  assert.doesNotMatch(js, /\/api\/supporters\/registration\/|\/api\/supporters\/login\//);
  assert.match(js, /The network address has been independently verified and added to your primary wallet profile/i);
  assert.match(js, /qualifying payments remain closed/i);
  assert.match(js, /window\.setInterval\(tick, 1000\)/);
  assert.match(js, /Latest global timer reset/);
  assert.match(js, /window\.setInterval\(refreshProgrammeStatus, 30000\)/);
  for (const method of [
    "eth_sendTransaction",
    "eth_sendRawTransaction",
    "wallet_sendCalls",
    "eth_sign",
    "eth_signTypedData_v4",
  ]) assert.equal(js.includes('method: "' + method + '"'), false, method + " must not be used by the Genesis page");
  assert.equal(js.includes(".signTransaction("), false);
  assert.equal(js.includes(".signAndSendTransaction("), false);
});
