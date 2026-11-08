  assert.doesNotMatch(workflow, /ASTROCROWN_STAGING_ACCESS_CODE/);
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
  assert.match(deployScript, /delete childEnv\.ASTROCROWN_RATE_LIMIT_HMAC_KEY;/);
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
  assert.match(deployScript, /await persistCreatedDatabaseState\(createdState\);[\s\S]*return createdState;/);
  assert.match(deployScript, /Do not retry database creation/);
});

test("remote smoke checks are not represented as full account qualification", () => {
  assert.match(deployScript, /REMOTE STAGING DEPLOYED — INITIAL SMOKE CHECKS PASSED/);
  assert.match(deployScript, /not full remote account qualification/);
  assert.match(deployScript, /actual stored COSE algorithm is -48/);
});


test("GitHub-hosted public staging requires a protected HMAC key and no shared Basic Auth secret", () => {
  assert.match(deployScript, /process\\.env\\.GITHUB_ACTIONS === "true"/);
  assert.match(deployScript, /ASTROCROWN_RATE_LIMIT_HMAC_KEY/);
  assert.match(deployScript, /at least 32 characters/);
  assert.match(deployScript, /::add-mask::/);
  assert.match(deployScript, /Access mode: public live test environment/);
  assert.doesNotMatch(deployScript, /ASTROCROWN_STAGING_ACCESS_CODE/);
  assert.doesNotMatch(deployScript, /HTTP Basic Auth access code/);
});

test("GitHub-hosted reruns require the recorded D1 UUID and never adopt by database name", () => {
  assert.match(deployScript, /ASTROCROWN_STAGING_D1_DATABASE_ID/);
  assert.match(deployScript, /identity-supplied-by-protected-github-environment-variable/);
  assert.match(deployScript, /never adopt a database by name alone/);
  assert.match(deployScript, /staging_d1_database_id=/);
  assert.match(deployScript, /GITHUB_STEP_SUMMARY/);
});


test("GitHub staging deployment workflow is manual, main-only and environment-scoped", async () => {
  const workflowPath = new URL("../../../../.github/workflows/cloudflare-staging-deployment.yml", import.meta.url);
  const workflow = await readFile(workflowPath, "utf8");
  assert.match(workflow, /^on:\s*\n\s+workflow_dispatch:/m);
  assert.doesNotMatch(workflow, /^\s+push:/m);
  assert.match(workflow, /refs\/heads\/main/);
  assert.match(workflow, /I_CONFIRMED_WORKERS_FREE_NO_CARD/);
  assert.match(workflow, /I_AUTHORIZE_ASTROCROWN_STAGING_DEPLOY/);
  assert.match(workflow, /name: cloudflare-staging/);
  assert.match(workflow, /secrets\.CLOUDFLARE_API_TOKEN_02/);
  assert.match(workflow, /secrets\.ASTROCROWN_RATE_LIMIT_HMAC_KEY/);
  assert.match(workflow, /vars\.ASTROCROWN_STAGING_D1_DATABASE_ID/);
  assert.doesNotMatch(workflow, /upload-artifact/); 
});

test("staging Wrangler environment explicitly selects public mode and keeps local/production distinct", async () => {
  const configPath = new URL("../wrangler.jsonc", import.meta.url);
  const config = JSON.parse(await readFile(configPath, "utf8"));
  assert.equal(config.env.staging.vars.ENVIRONMENT, "staging");
  assert.equal(config.env.staging.vars.STAGING_ACCESS_MODE, "public");
  assert.equal(config.vars.ENVIRONMENT, "local");
  assert.equal(config.env.staging.d1_databases[0].database_id, "00000000-0000-0000-0000-000000000000");
});
