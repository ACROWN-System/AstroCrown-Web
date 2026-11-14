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
  assert.match(html, /1,000 USD₮ at 25 ACROWN per USD₮ gives a 25,000 ACROWN allowance/);
  assert.match(html, /180-day purchase period begins at that operational activation/);
  assert.match(html, /id="supporter-tron-wallet-connect"/);
});

test("published supporter wallet script is display-only and has no signing or transfer calls", async () => {
  const js = await readPublic("supporters/supporters.js");
  assert.match(js, /eip6963:announceProvider/);
  assert.match(js, /TIP6963:announceProvider/);
  assert.match(js, /wallet-standard:app-ready/);
  assert.match(js, /eth_requestAccounts/);
  assert.match(js, /standard:connect/);
  assert.doesNotMatch(
    js,
    /\b(?:personal_sign|eth_sign|eth_sendTransaction|sendTransaction|signAndSendTransaction|signMessage)\s*\(/i
  );
});
