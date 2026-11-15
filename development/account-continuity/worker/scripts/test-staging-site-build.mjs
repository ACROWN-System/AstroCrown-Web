import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const workerRoot = resolve(import.meta.dirname, "..");
const publicRoot = resolve(workerRoot, "public");

async function readPublic(path) {
  return readFile(resolve(publicRoot, path), "utf8");
}

test("Worker staging build publishes the Supporter Programme at the shared origin", async () => {
  await access(resolve(publicRoot, "supporters/index.html"));
  await access(resolve(publicRoot, "supporters/supporters.js"));
  const homepage = await readPublic("index.html");
  assert.match(homepage, /href="\.\/supporters\/">Supporter Programme/);
});

test("published Supporter Programme states that contributions are not open", async () => {
  const html = await readPublic("supporters/index.html");
  assert.match(html, /DEVELOPMENT PREVIEW/);
  assert.match(html, /USDT CONTRIBUTIONS NOT OPEN/);
  assert.match(html, /DO NOT SEND FUNDS/);
  assert.match(html, /Ethereum \(ERC-20\), Tron \(TRC-20\) and Solana \(SPL\)/);
  assert.match(html, /25 ACROWN per USDT 1/i);
  assert.match(html, /USDT 1,000,000/i);
  assert.match(html, /25,000,000 ACROWN/i);
  assert.match(html, /wallet registration closes at 00:00:00 UTC on the day before the official public-deployment event/i);
  assert.match(html, /full floor-price consideration must reach the ACS reserve/i);
  assert.match(html, /gas and/or Paymaster fees are additional buyer costs/i);
  assert.match(html, /only when the wallet is eligible/i);
  assert.match(html, /180-day purchase period begins at that operational activation/);
  assert.match(html, /id="supporter-tron-wallet-connect"/);
  assert.match(html, /id="supporter-runtime-status"/);
  assert.match(html, /AstroCrown never receives private keys or recovery phrases/);
  assert.match(html, /Never share your seed phrase or private key/);
});

test("staging supporter wallet script supports off-chain ownership proofs but no transaction submission", async () => {
  const js = await readPublic("supporters/supporters.js");
  assert.match(js, /eip6963:announceProvider/);
  assert.match(js, /TIP6963:announceProvider/);
  assert.match(js, /wallet-standard:app-ready/);
  assert.match(js, /eth_requestAccounts/);
  assert.match(js, /standard:connect/);
  assert.match(js, /personal_sign/);
  assert.match(js, /signMessageV2/);
  assert.match(js, /solana:signMessage/);
  assert.ok(js.includes("function supporterRuntimeMarkerPresent()"));
  assert.ok(js.includes("if (!supporterRuntimeMarkerPresent() || !wallet || !wallet.mainnet || supporterMember) return;"));
  assert.ok(js.includes("/api/supporters/status"));
  assert.match(js, /contributions remain closed/i);
  assert.equal(js.includes('method: "eth_sign"'), false);
  assert.equal(js.includes('method: "eth_signTypedData_v4"'), false);
  assert.equal(js.includes('method: "eth_sendTransaction"'), false);
  assert.equal(js.includes('method: "eth_sendRawTransaction"'), false);
  assert.equal(js.includes('method: "wallet_sendCalls"'), false);
  assert.equal(js.includes(".signTransaction("), false);
  assert.equal(js.includes(".signAndSendTransaction("), false);
});
