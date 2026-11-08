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

test("staging artifact replaces the visual-preview notice with accurate test-environment guidance", async () => {
  const html = await readFile(outputPath, "utf8");

  assert.match(html, /STAGING TEST ENVIRONMENT/);
  assert.match(html, /AstroCrown is a staging test environment/);
  assert.match(html, /not the production service/);
  assert.match(html, /temporary test accounts/);
  assert.match(html, /may be reset or deleted at any time/);
  assert.match(html, /non-confidential/);
  assert.match(html, /other testers or service operators/);
  assert.match(html, /sensitive or confidential information/);
  assert.match(html, /dedicated testnet wallet with valueless test tokens/);
  assert.match(html, /mainnet/);
  assert.match(html, /seed phrase, private key, recovery phrase/);

  assert.doesNotMatch(html, /Visual review build/);
  assert.doesNotMatch(html, /visual review only/);
  assert.doesNotMatch(html, /AstroCrown is under development/);
  assert.doesNotMatch(html, /Do not use real assets or make transactions/);
});

test("staging safety notice is a mandatory first-visit acknowledgement gate", async () => {
  const html = await readFile(outputPath, "utf8");

  assert.match(html, /<dialog id="development-notice"/);
  assert.match(html, /id="development-notice-acknowledged" type="checkbox"/);
  assert.match(html, /id="development-notice-continue" type="button" disabled/);
  assert.match(html, /Continue to staging test environment/);
  assert.match(html, /notice\.addEventListener\("cancel", function \(event\) \{\s*event\.preventDefault\(\);/);
  assert.match(html, /acknowledgement\.addEventListener\("change"/);
  assert.match(html, /continueButton\.disabled = !acknowledgement\.checked/);
  assert.match(html, /openNotice\(\);/);
  assert.match(html, /reopen-development-notice/);
});
