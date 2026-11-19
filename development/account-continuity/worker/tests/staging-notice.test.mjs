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
  assert.match(html, /temporary test accounts/);
  assert.match(html, /may be reset or deleted at any time/);

  assert.match(html, /Default-to-public rule/);
  assert.match(html, /openly available to anyone on the internet/);
  assert.match(html, /including visitors without accounts/);
  assert.match(html, /read, copy, save, screenshot, index, quote or redistribute/);
  assert.match(html, /personal, identifying, sensitive, confidential or third-party information/);
  assert.match(html, /provider-managed backups/);

  assert.match(html, /separate disposable wallet and valueless test tokens/);
  assert.match(html, /feature is clearly marked as enabled/);
  assert.match(html, /mainnet/);
  assert.match(html, /seed phrase, private key, recovery phrase/);

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
  assert.match(html, /Continue to public test environment/);
  assert.match(html, /notice\.addEventListener\("cancel", function \(event\) \{\s*event\.preventDefault\(\);/);
  assert.match(html, /acknowledgement\.addEventListener\("change"/);
  assert.match(html, /acknowledgementPending/);
  assert.match(html, /fetch\("\/api\/staging\/acknowledge"/);
  assert.match(html, /2026-11-08-public-test-v1/);
  assert.match(html, /openNotice\(\);/);
  assert.match(html, /reopen-development-notice/);
});
