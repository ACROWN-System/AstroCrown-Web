import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { before, test } from "node:test";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const workerRoot = resolve(testDirectory, "..");
const outputPath = resolve(workerRoot, "public", "index.html");

before(() => {
  execFileSync(
    process.execPath,
    [resolve(workerRoot, "scripts", "build-staging-site.mjs")],
    { cwd: workerRoot, stdio: "pipe" },
  );
});

test("staging artifact replaces the visual-preview notice with live public-test guidance", async () => {
  const html = await readFile(outputPath, "utf8");

  assert.match(html, /LIVE PUBLIC TEST ENVIRONMENT/);
  assert.match(html, /AstroCrown is live for public testing/);
  assert.match(html, /live, publicly accessible AstroCrown test environment/);
  assert.match(html, /not the production commercial service/);
  assert.match(html, /Test accounts and records are temporary/i);
  assert.match(html, /may be reset or deleted without notice/);

  const registry = JSON.parse(await readFile(resolve(workerRoot, "public", "page-entry", "feature-status.json"), "utf8"));
  assert.match(registry.global_notice.introduction, /Public submissions may be visible to anyone on the internet/);
  assert.ok(registry.global_notice.rules.some(rule => /copy, save, screenshot, quote or redistribute/.test(rule)));
  assert.match(html, /including visitors without accounts/);
  assert.match(html, /personal, identifying, sensitive, confidential or third-party information/);
  assert.match(html, /provider-managed backups/);

  assert.match(html, /Only features explicitly marked LIVE with their environment are functional/);
  assert.match(html, /DEVNET features are restricted to their named test network and verified faucet/);
  assert.match(html, /FOR DEVELOPMENT · READ ONLY features do not provide operational transactions/);
  assert.match(html, /off-chain ownership message is not a blockchain transaction/);
  assert.match(html, /seed phrase, private key, wallet recovery phrase/);
  assert.doesNotMatch(html, /separate disposable wallet/);

  assert.doesNotMatch(html, /Visual review build/);
  assert.doesNotMatch(html, /visual review only/);
  assert.doesNotMatch(html, /AstroCrown is under development/);
  assert.doesNotMatch(html, /Do not use real assets or make transactions/);
});

test("staging safety notice is a mandatory first-visit gate with server acknowledgement", async () => {
  const html = await readFile(outputPath, "utf8");

  assert.match(html, /<dialog id="development-notice"/);
  assert.match(html, /id="development-notice-acknowledged" type="checkbox"/);
  assert.match(html, /id="development-notice-continue" type="button" disabled/);
  assert.match(html, /Continue to AstroCrown/);
  assert.match(html, /notice\.addEventListener\("cancel", function \(event\) \{\s*event\.preventDefault\(\);/);
  assert.match(html, /acknowledgement\.addEventListener\("change"/);
  assert.match(html, /acknowledgementPending/);
  assert.match(html, /fetch\("\/api\/staging\/acknowledge"/);
  assert.match(html, /2026-11-26-public-test-v3/);
  assert.match(html, /openNotice\(\);/);
  assert.match(html, /reopen-development-notice/);
});
