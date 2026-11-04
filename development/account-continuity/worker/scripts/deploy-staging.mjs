import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  chmod,
  mkdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const workerRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceConfigPath = join(workerRoot, "wrangler.jsonc");
const remoteConfigPath = join(workerRoot, ".wrangler.remote-staging.jsonc");
const localStateDir = join(workerRoot, ".wrangler");
const statePath = join(localStateDir, "remote-staging-state.json");
const accessCodePath = join(localStateDir, "staging-access-code.txt");
const rateKeyPath = join(localStateDir, "rate-limit-hmac-key.txt");
const workerBaseApi = "https://api.cloudflare.com/client/v4";
const databaseName = "acrown-account-staging";

function fail(message) {
  const error = new Error(message);
  error.safeForDisplay = true;
  throw error;
}

function requireConfirmation(name, expected, description) {
  if (process.env[name] !== expected) {
    fail(
      "STOPPED BEFORE NETWORK ACCESS. " + description + "\n" +
      "Set " + name + "=" + expected + " only after you have personally checked and approved it."
    );
  }
}

function validateEnv() {
  requireConfirmation(
    "ASTROCROWN_CONFIRM_WORKERS_FREE_NO_CARD",
    "I_CONFIRMED_WORKERS_FREE_NO_CARD",
    "Confirm in the Cloudflare account that Workers Free and D1 Free are selected, no payment method/card is required or attached for this deployment, and no paid product will be enabled."
  );
  requireConfirmation(
    "ASTROCROWN_CONFIRM_REMOTE_STAGING_DEPLOY",
    "I_AUTHORIZE_ASTROCROWN_STAGING_DEPLOY",
    "Confirm that you authorize creation of the isolated AstroCrown staging D1 database and deployment of the staging Worker. This does not authorize a production deployment."
  );

  const token = process.env.CLOUDFLARE_API_TOKEN || "";
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || "";
  if (!token || token.length < 20) fail("CLOUDFLARE_API_TOKEN is missing or too short.");
  if (!/^[a-f0-9]{32}$/i.test(accountId)) fail("CLOUDFLARE_ACCOUNT_ID must be the 32-character account identifier.");
  return { token, accountId };
}

async function cloudflare(method, path, body) {
  const response = await fetch(workerBaseApi + path, {
    method,
    headers: {
      Authorization: "Bearer " + process.env.CLOUDFLARE_API_TOKEN,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  let payload;
  try {
    payload = await response.json();
  } catch {
    fail("Cloudflare API returned a non-JSON response for " + method + " " + path + ".");
  }
  if (!response.ok || payload?.success !== true) {
    const details = Array.isArray(payload?.errors)
      ? payload.errors.map((item) => String(item.message || item.code || "unknown error")).join("; ")
      : "no structured error details";
    fail("Cloudflare API " + method + " " + path + " failed (HTTP " + response.status + "): " + details);
  }
  return payload.result;
}

function runProgram(program, args, options = {}) {
  const windows = process.platform === "win32";
  const childEnv = { ...process.env, WRANGLER_SEND_METRICS: "false" };
  if (options.allowCloudflareCredentials !== true) {
    delete childEnv.CLOUDFLARE_ACCOUNT_ID;
    delete childEnv.CLOUDFLARE_API_TOKEN;
  }
  const result = spawnSync(program, args, {
    cwd: workerRoot,
    env: childEnv,
    input: options.input,
    encoding: "utf8",
    timeout: options.timeout || 180000,
    windowsHide: true,
    shell: windows,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) fail(program + " could not be started: " + result.error.message);
  if (result.status !== 0) fail(program + " " + args.join(" ") + " exited with status " + result.status + ".");
  return result.stdout || "";
}

function runNpm(args, options = {}) {
  return runProgram(process.platform === "win32" ? "npm.cmd" : "npm", args, options);
}

function runNpx(args, options = {}) {
  return runProgram(process.platform === "win32" ? "npx.cmd" : "npx", args, options);
}

async function loadOrCreateLocalSecret(path, bytes = 32) {
  try {
    const current = (await readFile(path, "utf8")).trim();
    if (current.length >= 32) return current;
    fail("An existing local staging secret file is invalid: " + path + ". Inspect it manually; this script will not overwrite it.");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  const generated = randomBytes(bytes).toString("base64url");
  await writeFile(path, generated + "\n", { encoding: "utf8", mode: 0o600, flag: "wx" });
  try { await chmod(path, 0o600); } catch { /* Windows ACLs govern file access on Windows. */ }
  return generated;
}

function assertSentinelConfig(config) {
  const stage = config?.env?.staging;
  if (!stage || !Array.isArray(stage.d1_databases) || stage.d1_databases.length !== 1) {
    fail("The staging Wrangler configuration shape changed; refusing remote deployment.");
  }
  if (stage.vars?.ENVIRONMENT !== "staging") fail("The staging environment marker is not exact.");
  if (stage.vars?.RP_ID !== "SET_BEFORE_DEPLOY") fail("The staging RP ID is no longer the expected non-deployable sentinel.");
  if (stage.vars?.EXPECTED_ORIGIN !== "https://SET_BEFORE_DEPLOY.invalid") fail("The staging origin is no longer the expected non-deployable sentinel.");
  if (stage.d1_databases[0].database_id !== "00000000-0000-0000-0000-000000000000") {
    fail("The checked-in staging D1 ID is not the expected sentinel. Review the configuration manually.");
  }
  if (stage.d1_databases[0].database_name !== databaseName) fail("The staging D1 database name changed unexpectedly.");
  if (!/^astrocrown-account-staging-staging$/.test(stage.name || "")) {
    fail("The staging Worker script name changed unexpectedly; refusing to infer a hostname.");
  }
}

function validateSubdomain(value) {
  if (typeof value !== "string" || !/^[a-z0-9-]{3,63}$/i.test(value)) {
    fail("Cloudflare did not return a valid workers.dev account subdomain. Enable a workers.dev subdomain in the Cloudflare dashboard, then rerun.");
  }
  return value.toLowerCase();
}

async function getDatabase(accountId, databaseId) {
  const result = await cloudflare("GET", "/accounts/" + accountId + "/d1/database/" + encodeURIComponent(databaseId));
  if (!result || result.name !== databaseName || result.uuid !== databaseId) {
    fail("The saved staging D1 database identity does not match this project.");
  }
  return result;
}

async function persistCreatedDatabaseState(state) {
  await mkdir(localStateDir, { recursive: true, mode: 0o700 });
  try { await chmod(localStateDir, 0o700); } catch { /* Windows ACLs govern directory access on Windows. */ }
  try {
    await writeFile(statePath, JSON.stringify(state, null, 2) + "\n", {
      encoding: "utf8",
      mode: 0o600,
      flag: "wx",
    });
    try { await chmod(statePath, 0o600); } catch { /* Windows ACLs govern file access on Windows. */ }
  } catch {
    fail(
      "The remote staging D1 database was created with ID " + state.databaseId +
      ", but its local identity record could not be saved. Do not retry database creation. " +
      "Preserve this ID and reconcile the ignored local state file manually."
    );
  }
}

async function resolveDatabase(accountId) {
  let state = null;
  try {
    state = JSON.parse(await readFile(statePath, "utf8"));
  } catch (error) {
    if (error?.code !== "ENOENT") fail("The local staging deployment state file is invalid. Inspect it manually; do not overwrite it.");
  }

  if (state) {
    if (
      state.accountId !== accountId ||
      state.databaseName !== databaseName ||
      typeof state.databaseId !== "string" ||
      !/^[a-f0-9-]{36}$/i.test(state.databaseId)
    ) {
      fail("Saved staging deployment state belongs to a different or invalid Cloudflare resource.");
    }
    await getDatabase(accountId, state.databaseId);
    return state;
  }

  const query = "?name=" + encodeURIComponent(databaseName) + "&per_page=100&page=1";
  const listed = await cloudflare("GET", "/accounts/" + accountId + "/d1/database" + query);
  if (!Array.isArray(listed) || listed.length !== 0) {
    fail(
      "A D1 database named " + databaseName + " already exists, but this checkout has no matching deployment-state record. " +
      "For safety, no existing database will be adopted automatically. Inspect it and reconcile the state file manually."
    );
  }

  const allDatabases = await cloudflare("GET", "/accounts/" + accountId + "/d1/database?per_page=100&page=1");
  if (!Array.isArray(allDatabases)) fail("Cloudflare did not return the D1 database inventory in the expected format.");
  const totalDatabases = Number(allDatabases.result_info?.total_count ?? allDatabases.length);
  if (!Number.isInteger(totalDatabases) || totalDatabases < 0) fail("Cloudflare returned an invalid D1 database count.");
  if (totalDatabases >= 10) {
    fail(
      "The Cloudflare Workers Free allowance is 10 D1 databases per account and this account already reports " +
      totalDatabases + ". No database was created. Free-tier capacity must be confirmed manually; this script never upgrades a plan."
    );
  }

  console.log("No existing D1 database with the staging name was found and the account inventory reports " +
    totalDatabases + " of 10 Free-tier database slots in use. Creating one isolated staging database.");
  const created = await cloudflare("POST", "/accounts/" + accountId + "/d1/database", { name: databaseName });
  if (!created?.uuid || created.name !== databaseName) fail("Cloudflare did not return the expected new staging D1 identity.");

  const state = {
    accountId,
    databaseName,
    databaseId: created.uuid,
    createdAt: new Date().toISOString(),
  };
  await persistCreatedDatabaseState(state);
  return state;
}

function writeRemoteConfig(sourceConfig, subdomain, databaseId) {
  const config = structuredClone(sourceConfig);
  const stage = config.env.staging;
  const scriptName = stage.name;
  const host = scriptName + "." + subdomain + ".workers.dev";
  const origin = "https://" + host;
  stage.vars.RP_ID = host;
  stage.vars.EXPECTED_ORIGIN = origin;
  stage.d1_databases[0].database_id = databaseId;
  return writeFile(remoteConfigPath, JSON.stringify(config, null, 2) + "\n", "utf8").then(() => ({ host, origin, scriptName }));
}

async function setSecret(name, value) {
  if (typeof value !== "string" || value.length < 32) fail("Generated staging secret did not meet the minimum length.");
  runNpx(
    ["wrangler", "secret", "put", name, "--env", "staging", "--config", ".wrangler.remote-staging.jsonc"],
    { input: value + "\n", allowCloudflareCredentials: true },
  );
}

async function smokeTest(origin, accessCode) {
  const authorization = "Basic " + Buffer.from("staging:" + accessCode, "utf8").toString("base64");
  const headers = { Authorization: authorization };

  const statusResponse = await fetch(origin + "/api/account/status", { headers, signal: AbortSignal.timeout(30000) });
  if (statusResponse.status !== 200) fail("Remote staging account-status check failed (HTTP " + statusResponse.status + ").");
  const status = await statusResponse.json();
  if (status.authenticated !== false || status.passkeyAvailable !== true || status.mlDsaRegistrationAvailable !== true) {
    fail("Remote staging account-status response did not meet the required passkey/ML-DSA-44 qualification.");
  }
  if (status.scope !== "staging-test-account-only") fail("Remote account status is missing the staging-only scope marker.");

  const diagnosticsResponse = await fetch(origin + "/api/diagnostics/runtime", { headers, signal: AbortSignal.timeout(30000) });
  if (diagnosticsResponse.status !== 200) fail("Remote staging runtime-diagnostics check failed (HTTP " + diagnosticsResponse.status + ").");
  const diagnostics = await diagnosticsResponse.json();
  const mldsa44 = diagnostics.webCryptoMlDsaSupport?.["ML-DSA-44"];
  if (!mldsa44?.sign || !mldsa44?.verify || !diagnostics.simpleWebAuthnSupportedRegistrationAlgorithms?.includes(-48)) {
    fail("Remote Worker does not support and advertise ML-DSA-44 as required. Keep staging closed and investigate; do not fall back silently.");
  }

  const homeResponse = await fetch(origin + "/", { headers, signal: AbortSignal.timeout(30000) });
  if (homeResponse.status !== 200) fail("Remote staging homepage check failed (HTTP " + homeResponse.status + ").");
  const homepage = await homeResponse.text();
  if (!homepage.includes("STAGING ENVIRONMENT") || !homepage.includes("astro-account-runtime")) {
    fail("Remote staging homepage is missing its staging warning or account-runtime marker.");
  }

  const negative = await fetch(origin + "/api/passkeys/authentication/options", {
    method: "POST",
    headers: {
      ...headers,
      Origin: "https://untrusted.invalid",
      "Content-Type": "application/json",
    },
    body: "{}",
    signal: AbortSignal.timeout(30000),
  });
  if (negative.status !== 403) fail("Remote staging did not reject a wrong-Origin account request with HTTP 403.");
  return { status, diagnostics };
}

async function main() {
  const { accountId } = validateEnv();
  const sourceConfig = JSON.parse(await readFile(sourceConfigPath, "utf8"));
  assertSentinelConfig(sourceConfig);

  console.log("Running the local Worker tests, allowlisted homepage build, and non-deploying bundle check before any remote resource is created.");
  runNpm(["test"]);
  runNpm(["run", "build:site"]);
  runNpm(["run", "check:worker"]);

  const subdomainResponse = await cloudflare("GET", "/accounts/" + accountId + "/workers/subdomain");
  const subdomain = validateSubdomain(subdomainResponse?.subdomain);

  const state = await resolveDatabase(accountId);
  if (state.subdomain && state.subdomain !== subdomain) {
    fail("The Cloudflare workers.dev subdomain differs from the saved staging state. Review the account/domain change manually.");
  }
  const configInfo = await writeRemoteConfig(sourceConfig, subdomain, state.databaseId);
  const completeState = {
    ...state,
    subdomain,
    workerName: configInfo.scriptName,
    host: configInfo.host,
    origin: configInfo.origin,
    updatedAt: new Date().toISOString(),
  };
  await mkdir(localStateDir, { recursive: true, mode: 0o700 });
  try { await chmod(localStateDir, 0o700); } catch { /* Windows ACLs govern directory access on Windows. */ }
  await writeFile(statePath, JSON.stringify(completeState, null, 2) + "\n", { encoding: "utf8", mode: 0o600 });
  try { await chmod(statePath, 0o600); } catch { /* Windows ACLs govern file access on Windows. */ }

  const accessCode = await loadOrCreateLocalSecret(accessCodePath, 32);
  const rateLimitKey = await loadOrCreateLocalSecret(rateKeyPath, 32);

  console.log("Applying the staging D1 migration to the isolated remote database.");
  runNpx(
    ["wrangler", "d1", "migrations", "apply", databaseName, "--remote", "--env", "staging", "--config", ".wrangler.remote-staging.jsonc"],
    { input: "y\n", allowCloudflareCredentials: true },
  );

  console.log("Deploying only the staging Worker environment. Missing secrets keep the service closed.");
  runNpx(["wrangler", "deploy", "--env", "staging", "--config", ".wrangler.remote-staging.jsonc"], { allowCloudflareCredentials: true });

  console.log("Installing the two staging-only secrets through Wrangler's secret interface.");
  await setSecret("STAGING_ACCESS_CODE", accessCode);
  await setSecret("RATE_LIMIT_HMAC_KEY", rateLimitKey);

  console.log("Checking the exact deployed HTTPS origin, ML-DSA-44 runtime, homepage and wrong-Origin rejection.");
  const evidence = await smokeTest(configInfo.origin, accessCode);

  console.log("");
  console.log("REMOTE STAGING DEPLOYED — INITIAL SMOKE CHECKS PASSED");
  console.log("Staging URL: " + configInfo.origin + "/");
  console.log("HTTP Basic Auth username: staging");
  console.log("HTTP Basic Auth access code: " + accessCode);
  console.log("Local ignored access-code file: " + accessCodePath);
  console.log("Remote D1 database name: " + databaseName);
  console.log("Remote D1 database ID: " + state.databaseId);
  console.log("ML-DSA-44 sign: " + evidence.diagnostics.webCryptoMlDsaSupport["ML-DSA-44"].sign);
  console.log("ML-DSA-44 verify: " + evidence.diagnostics.webCryptoMlDsaSupport["ML-DSA-44"].verify);
  console.log("ML-DSA-44 algorithm -48 advertised first: " + evidence.diagnostics.pqcRegistrationAlgorithmAdvertised);
  console.log("");
  console.log("This is only initial deployment smoke evidence, not full remote account qualification.");
  console.log("A real remote browser must still prove registration, discoverable sign-in, sign-out, recovery, old-key rejection, key rotation and replacement-passkey sign-in.");
  console.log("Claim ML-DSA-44 for a remote credential only after the actual stored COSE algorithm is -48 and a later assertion verifies on this deployed Worker.");
  console.log("Use synthetic data only. The one-time recovery key is displayed by the site and must be kept offline.");
  console.log("This script does not enable billing, add a payment method, deploy production, or delete resources after a failed run.");
  console.log("Record three-pass cleanup and the provider's retention quarantine before closing this staging environment.");
}

main().catch((error) => {
  const message = error?.safeForDisplay ? error.message : String(error?.message || error);
  console.error("STAGING DEPLOYMENT STOPPED: " + message);
  console.error("No automatic resource deletion is performed. Inspect the exact staging-only state and retention before any cleanup.");
  process.exitCode = 1;
});
