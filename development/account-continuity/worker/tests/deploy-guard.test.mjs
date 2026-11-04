import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const here = new URL(".", import.meta.url);
const workerRoot = new URL("../", here);
const scriptPath = fileURLToPath(new URL("../scripts/deploy-staging.mjs", import.meta.url));

test("remote deployment refuses to run before explicit free/no-card and deployment confirmations", () => {
  const env = { ...process.env };
  delete env.ASTROCROWN_CONFIRM_WORKERS_FREE_NO_CARD;
  delete env.ASTROCROWN_CONFIRM_REMOTE_STAGING_DEPLOY;
  delete env.CLOUDFLARE_API_TOKEN;
  delete env.CLOUDFLARE_ACCOUNT_ID;
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: fileURLToPath(workerRoot),
    env,
    encoding: "utf8",
    timeout: 10000,
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /STOPPED BEFORE NETWORK ACCESS/);
  assert.match(result.stderr, /ASTROCROWN_CONFIRM_WORKERS_FREE_NO_CARD/);
});


const deployScript = await readFile(scriptPath, "utf8");

test("local tests, build and dry-run do not inherit Cloudflare account credentials", () => {
  assert.match(deployScript, /const childEnv = \{ \.\.\.process\.env, WRANGLER_SEND_METRICS: "false" \};/);
  assert.match(deployScript, /if \(options\.allowCloudflareCredentials !== true\)/);
  assert.match(deployScript, /delete childEnv\.CLOUDFLARE_API_TOKEN;/);
  assert.match(deployScript, /delete childEnv\.CLOUDFLARE_ACCOUNT_ID;/);
  assert.match(deployScript, /runNpm\(\["test"\]\);[\s\S]*runNpm\(\["run", "build:site"\]\);[\s\S]*runNpm\(\["run", "check:worker"\]\);/);
});

test("only remote Wrangler migration, deploy and secret operations opt into Cloudflare credentials", () => {
  assert.match(deployScript, /migrations", "apply"[\s\S]*allowCloudflareCredentials: true/);
  assert.match(deployScript, /wrangler", "deploy"[\s\S]*allowCloudflareCredentials: true/);
  assert.match(deployScript, /wrangler", "secret", "put"[\s\S]*allowCloudflareCredentials: true/);
});

test("new D1 identity is persisted exclusively before database setup continues", () => {
  assert.match(deployScript, /flag: "wx"/);
  assert.match(deployScript, /mode: 0o700/);
  assert.match(deployScript, /mode: 0o600/);
  assert.match(deployScript, /await persistCreatedDatabaseState\(state\);[\s\S]*return state;/);
  assert.match(deployScript, /Do not retry database creation/);
});

test("remote smoke checks are not represented as full account qualification", () => {
  assert.match(deployScript, /REMOTE STAGING DEPLOYED — INITIAL SMOKE CHECKS PASSED/);
  assert.match(deployScript, /not full remote account qualification/);
  assert.match(deployScript, /actual stored COSE algorithm is -48/);
});
