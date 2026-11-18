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
  assert.match(html, /1,000 USD₮ at 25 ACROWN per USD₮ gives a 25,000 ACROWN allowance/);
  assert.match(html, /180-day purchase period begins at that operational activation/);
  assert.match(html, /id="supporter-tron-wallet-connect"/);
  assert.match(html, /id="supporter-runtime-status"/);
  assert.match(html, /AstroCrown never receives private keys or recovery phrases/);
  assert.match(html, /The primary wallet is the identity, recovery anchor and entitlement holder/);
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
  assert.equal(js.includes('method: "eth_sign"'), false);
  assert.equal(js.includes('method: "eth_signTypedData_v4"'), false);
  assert.equal(js.includes('method: "eth_sendTransaction"'), false);
  assert.equal(js.includes('method: "eth_sendRawTransaction"'), false);
  assert.equal(js.includes('method: "wallet_sendCalls"'), false);
  assert.equal(js.includes(".signTransaction("), false);
  assert.equal(js.includes(".signAndSendTransaction("), false);
});
