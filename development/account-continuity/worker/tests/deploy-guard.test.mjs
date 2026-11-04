import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
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
