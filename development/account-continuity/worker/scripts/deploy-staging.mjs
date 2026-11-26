import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  appendFile,
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
const rateKeyPath = join(localStateDir, "rate-limit-hmac-key.txt");
const workerBaseApi = "https://api.cloudflare.com/client/v4";
const databaseName = "acrown-account-staging";
const supportersDatabaseName = "acrown-supporters-mainnet";

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

  if (process.env.GITHUB_ACTIONS === "true") {
    const value = process.env.ASTROCROWN_RATE_LIMIT_HMAC_KEY || "";
    if (value.length < 32 || value.trim() !== value) {
      fail("ASTROCROWN_RATE_LIMIT_HMAC_KEY must be configured as a protected GitHub environment secret with at least 32 characters.");
    }
  }

  const suppliedDatabaseId = process.env.ASTROCROWN_STAGING_D1_DATABASE_ID || "";
  if (suppliedDatabaseId && !/^[a-f0-9-]{36}$/i.test(suppliedDatabaseId)) {
    fail("ASTROCROWN_STAGING_D1_DATABASE_ID must be a valid 36-character D1 database UUID.");
  }
  const supportersDatabaseId = process.env.ASTROCROWN_SUPPORTERS_D1_DATABASE_ID || "";
  if (supportersDatabaseId && !/^[a-f0-9-]{36}$/i.test(supportersDatabaseId)) {
    fail("ASTROCROWN_SUPPORTERS_D1_DATABASE_ID must be a valid 36-character D1 database UUID.");
  }
  return { token, accountId, supportersDatabaseId };
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
  // The rate-limit/acknowledgement signing key is supplied to Wrangler only through stdin
  // when setting the corresponding Cloudflare secret; never expose it in its environment.
  delete childEnv.ASTROCROWN_RATE_LIMIT_HMAC_KEY;
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

async function loadOrCreateLocalSecret(path, bytes = 32, environmentVariableName) {
  const supplied = environmentVariableName ? process.env[environmentVariableName] : "";
  if (supplied) {
    if (supplied.length < 32 || supplied.trim() !== supplied) {
      fail(environmentVariableName + " must contain at least 32 characters without leading/trailing whitespace.");
    }
    if (process.env.GITHUB_ACTIONS === "true") {
      process.stdout.write("::add-mask::" + supplied + "\n");
    }
    return supplied;
  }

  if (process.env.GITHUB_ACTIONS === "true") {
    fail(environmentVariableName + " is required as a protected GitHub environment secret; hosted runners do not generate unreported credentials.");
  }

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
  if (!stage || !Array.isArray(stage.d1_databases) || stage.d1_databases.length !== 2) {
    fail("The staging Wrangler configuration must contain separate account and Supporter Programme D1 bindings.");
  }
  if (stage.vars?.ENVIRONMENT !== "staging") fail("The staging environment marker is not exact.");
  if (stage.vars?.STAGING_ACCESS_MODE !== "public") fail("Staging must explicitly select the qualified public-access mode.");
  if (stage.vars?.EXPECTED_ORIGIN !== "https://SET_BEFORE_DEPLOY.invalid") fail("The staging origin is no longer the expected non-deployable sentinel.");
  if (stage.d1_databases[0].database_id !== "00000000-0000-0000-0000-000000000000") {
    fail("The checked-in staging D1 ID is not the expected sentinel. Review the configuration manually.");
  }
  if (stage.d1_databases[0].database_name !== databaseName || stage.d1_databases[0].binding !== "DB") fail("The account staging D1 binding changed unexpectedly.");
  const supportersBinding = stage.d1_databases[1];
  if (
    supportersBinding.binding !== "SUPPORTERS_DB" ||
    supportersBinding.database_name !== supportersDatabaseName ||
    supportersBinding.database_id !== "00000000-0000-0000-0000-000000000000" ||
    supportersBinding.migrations_dir !== "migrations/supporters"
  ) fail("The isolated Supporter Programme D1 sentinel or binding changed unexpectedly.");
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

async function getDatabase(accountId, databaseId, expectedName = databaseName) {
  const result = await cloudflare("GET", "/accounts/" + accountId + "/d1/database/" + encodeURIComponent(databaseId));
  if (!result || result.name !== expectedName || result.uuid !== databaseId) {
    fail("The saved D1 database identity does not match the expected AstroCrown resource: " + expectedName + ".");
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

  const suppliedDatabaseId = process.env.ASTROCROWN_STAGING_D1_DATABASE_ID || "";
  if (state) {
    if (
      state.accountId !== accountId ||
      state.databaseName !== databaseName ||
      typeof state.databaseId !== "string" ||
      !/^[a-f0-9-]{36}$/i.test(state.databaseId)
    ) {
      fail("Saved staging deployment state belongs to a different or invalid Cloudflare resource.");
    }
    if (suppliedDatabaseId && suppliedDatabaseId !== state.databaseId) {
      fail("The protected ASTROCROWN_STAGING_D1_DATABASE_ID does not match the saved local deployment state.");
    }
    await getDatabase(accountId, state.databaseId);
    return state;
  }

  // GitHub-hosted runners are ephemeral. Pin later runs to the UUID recorded
  // as a GitHub environment variable; never adopt a database by name alone.
  if (suppliedDatabaseId) {
    await getDatabase(accountId, suppliedDatabaseId);
    return {
      accountId,
      databaseName,
      databaseId: suppliedDatabaseId,
      createdAt: "identity-supplied-by-protected-github-environment-variable",
    };
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

  const createdState = {
    accountId,
    databaseName,
    databaseId: created.uuid,
    createdAt: new Date().toISOString(),
  };
  await persistCreatedDatabaseState(createdState);
  return createdState;
}

async function resolveSupportersDatabase(accountId, suppliedDatabaseId) {
  if (suppliedDatabaseId) {
    await getDatabase(accountId, suppliedDatabaseId, supportersDatabaseName);
    return {
      accountId,
      databaseName: supportersDatabaseName,
      databaseId: suppliedDatabaseId,
      createdAt: "identity-supplied-by-protected-github-environment-variable",
    };
  }

  const query = "?name=" + encodeURIComponent(supportersDatabaseName) + "&per_page=100&page=1";
  const listed = await cloudflare("GET", "/accounts/" + accountId + "/d1/database" + query);
  if (!Array.isArray(listed) || listed.length !== 0) {
    fail(
      "A Supporter Programme D1 database named " + supportersDatabaseName + " already exists, but its exact UUID was not supplied. " +
      "No database will be adopted by name. Pin its verified UUID as ASTROCROWN_SUPPORTERS_D1_DATABASE_ID."
    );
  }

  const allDatabases = await cloudflare("GET", "/accounts/" + accountId + "/d1/database?per_page=100&page=1");
  if (!Array.isArray(allDatabases)) fail("Cloudflare did not return the D1 database inventory for the Supporter Programme.");
  const totalDatabases = allDatabases.length;
  if (totalDatabases >= 10) {
    fail(
      "The Cloudflare Free allowance is 10 D1 databases and this account already reports " + totalDatabases +
      ". No Supporter Programme database was created and no plan upgrade will be attempted."
    );
  }

  console.log("Creating the separate prelaunch Supporter Programme D1 database. Account and supporter records remain isolated.");
  const created = await cloudflare("POST", "/accounts/" + accountId + "/d1/database", { name: supportersDatabaseName });
  if (!created?.uuid || created.name !== supportersDatabaseName) {
    fail("Cloudflare did not return the expected Supporter Programme D1 identity.");
  }
  return {
    accountId,
    databaseName: supportersDatabaseName,
    databaseId: created.uuid,
    createdAt: new Date().toISOString(),
  };
}

async function publishGithubD1Identity(state) {
  if (process.env.GITHUB_ACTIONS !== "true") return;

  const outputPath = process.env.GITHUB_OUTPUT;
  if (outputPath) {
    await appendFile(outputPath, "staging_d1_database_id=" + state.databaseId + "\n", "utf8");
  }

  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) {
    await appendFile(
      summaryPath,
      [
        "## AstroCrown staging D1 identity",
        "",
        "- Database name: " + databaseName,
        "- Database ID (non-secret): " + state.databaseId,
        "- State: verified or created; remote migration/deployment may still be pending",
        "",
        "Add this exact UUID as the ASTROCROWN_STAGING_D1_DATABASE_ID variable in the cloudflare-staging GitHub environment before any later deployment. Preserve it if a later deployment step fails; do not retry database creation or adopt by name.",
        "",
      ].join("\n") + "\n",
      "utf8",
    );
  }
}

async function publishGithubSupportersD1Identity(state) {
  if (process.env.GITHUB_ACTIONS !== "true") return;

  const outputPath = process.env.GITHUB_OUTPUT;
  if (outputPath) {
    await appendFile(outputPath, "supporters_d1_database_id=" + state.databaseId + "\n", "utf8");
  }

  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) {
    await appendFile(
      summaryPath,
      [
        "## AstroCrown Supporter Programme D1 identity",
        "",
        "- Dedicated database: " + supportersDatabaseName,
        "- Database ID (non-secret): " + state.databaseId,
        "- Purpose: isolated supporter membership, wallet and financial-entitlement records; not the test-account database",
        "",
        "Pin this exact UUID as ASTROCROWN_SUPPORTERS_D1_DATABASE_ID in the protected cloudflare-staging GitHub environment before any later deployment. Preserve it if migration or deployment fails; never adopt another database by name.",
        "",
      ].join("\n") + "\n",
      "utf8",
    );
  }
}

async function publishGithubDeploymentMetadata(state, supportersState, configInfo) {
  if (process.env.GITHUB_ACTIONS !== "true") return;

  const outputPath = process.env.GITHUB_OUTPUT;
  if (outputPath) {
    await appendFile(outputPath, "staging_origin=" + configInfo.origin + "\n", "utf8");
  }

  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) {
    await appendFile(
      summaryPath,
      [
        "## AstroCrown staging deployment",
        "",
        "- Result: initial deployment smoke checks only",
        "- Worker: " + configInfo.scriptName,
        "- Staging origin: " + configInfo.origin,
        "- Account D1 database name: " + databaseName,
        "- Account D1 database ID (non-secret): " + state.databaseId,
        "- Dedicated Supporter Programme D1 database: " + supportersDatabaseName,
        "- Supporter Programme D1 database ID (non-secret): " + supportersState.databaseId,
        "- Access mode: public staging; no shared Basic Authentication prompt",
        "- Full remote browser and credential qualification: still required",
        "",
        "The account D1 UUID is pinned as ASTROCROWN_STAGING_D1_DATABASE_ID; the separate supporter D1 UUID must also be pinned as ASTROCROWN_SUPPORTERS_D1_DATABASE_ID before subsequent runs.",
        "",
      ].join("\n") + "\n",
      "utf8",
    );
  }
}

function writeRemoteConfig(sourceConfig, subdomain, databaseId, supportersDatabaseId) {
  const config = structuredClone(sourceConfig);
  const stage = config.env.staging;
  const scriptName = stage.name;
  const host = scriptName + "." + subdomain + ".workers.dev";
  const origin = "https://" + host;
  stage.vars.EXPECTED_ORIGIN = origin;
  stage.d1_databases[0].database_id = databaseId;
  stage.d1_databases[1].database_id = supportersDatabaseId;
  return writeFile(remoteConfigPath, JSON.stringify(config, null, 2) + "\n", "utf8").then(() => ({ host, origin, scriptName }));
}

async function setSecret(name, value) {
  if (typeof value !== "string" || value.length < 32) fail("Generated staging secret did not meet the minimum length.");
  runNpx(
    ["wrangler", "secret", "put", name, "--env", "staging", "--config", ".wrangler.remote-staging.jsonc"],
    { input: value + "\n", allowCloudflareCredentials: true },
  );
}

async function smokeTest(origin) {
  const homeResponse = await fetch(origin + "/", { signal: AbortSignal.timeout(30000) });
  if (homeResponse.status !== 200) fail("Public staging homepage check failed (HTTP " + homeResponse.status + ").");
  const homepage = await homeResponse.text();
  if (
    !homepage.includes("LIVE PUBLIC TEST ENVIRONMENT") ||
    !homepage.includes("astro-account-runtime") ||
    !homepage.includes("AstroCrown is live for public testing") ||
    !homepage.includes("openly available to anyone on the internet")
  ) fail("Public staging homepage is missing the live-environment marker or public safety notice.");

  const publicSupportersStatus = await fetch(origin + "/api/genesis/status", { signal: AbortSignal.timeout(30000) });
  if (publicSupportersStatus.status !== 200) {
    fail("The read-only public Genesis Programme status endpoint must be available without account acknowledgement (HTTP " + publicSupportersStatus.status + ").");
  }
  const publicSupportersPayload = await publicSupportersStatus.json();
  if (
    publicSupportersPayload.environment !== "MAINNET" ||
    publicSupportersPayload.programme?.status !== "PRELAUNCH" ||
    publicSupportersPayload.paymentAcceptance?.enabled !== false ||
    publicSupportersPayload.paymentAcceptance?.contributionsAccepted !== false ||
    publicSupportersPayload.purchaseAllowance?.automaticTokenIssuance !== false ||
    !Array.isArray(publicSupportersPayload.networks) ||
    publicSupportersPayload.networks.map((item) => item.network).join(",") !== "ethereum,tron,solana" ||
    publicSupportersPayload.networks.some((item) => item.networkConfigured !== false || item.treasuryConfigured !== true)
  ) {
    fail("The public Genesis Programme status must show three-network PRELAUNCH with payment intake disabled.");
  }

  const beforeAcknowledgement = await fetch(origin + "/api/account/status", { signal: AbortSignal.timeout(30000) });
  if (beforeAcknowledgement.status !== 428) {
    fail("Remote account API did not require acknowledgement of the public-staging notice (expected HTTP 428).");
  }

  const acknowledgement = await fetch(origin + "/api/staging/acknowledge", {
    method: "POST",
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ noticeVersion: "2026-11-26-public-test-v5" }),
    signal: AbortSignal.timeout(30000),
  });
  if (acknowledgement.status !== 200) fail("Remote staging notice acknowledgement failed (HTTP " + acknowledgement.status + ").");
  const acknowledgementBody = await acknowledgement.json();
  if (acknowledgementBody.acknowledged !== true) fail("Remote staging did not confirm the notice acknowledgement.");
  const setCookie = acknowledgement.headers.get("Set-Cookie") || "";
  const cookie = setCookie.split(";")[0];
  if (!cookie.startsWith("acrown_staging_notice_ack=")) fail("Remote staging did not issue the signed acknowledgement cookie.");

  const headers = { Cookie: cookie };
  const statusResponse = await fetch(origin + "/api/account/status", { headers, signal: AbortSignal.timeout(30000) });
  if (statusResponse.status !== 200) fail("Remote staging account-status check after acknowledgement failed (HTTP " + statusResponse.status + ").");
  const status = await statusResponse.json();
  if (status.authenticated !== false || status.walletAuthenticationAvailable !== true ||
      status.walletAuthenticationNetworks?.join(",") !== "ethereum,tron,solana") {
    fail("Remote staging did not advertise the exact wallet-primary account networks.");
  }
  if (status.scope !== "staging-test-account-only") fail("Remote account status is missing the staging-only scope marker.");

  const supporters = publicSupportersPayload;
  const negative = await fetch(origin + "/api/wallet-auth/challenge", {
    method: "POST",
    headers: {
      Origin: "https://untrusted.invalid",
      "Content-Type": "application/json",
    },
    body: "{}",
    signal: AbortSignal.timeout(30000),
  });
  if (negative.status !== 403) fail("Remote staging did not reject a wrong-Origin account request with HTTP 403.");
  return { status, supporters };
}

async function reportWorkersUsageModel(accountId) {
  const settings = await cloudflare(
    "GET",
    "/accounts/" + accountId + "/workers/account-settings",
  );
  const usageModel = typeof settings?.default_usage_model === "string"
    ? settings.default_usage_model
    : "not-reported";
  console.log("Cloudflare account default Workers usage model: " + usageModel + ".");
  console.log(
    "The account-settings endpoint reports a usage-model setting; it does not report subscription status or payment methods. " +
    "This value is retained as deployment evidence only and is not treated as proof of an active paid subscription."
  );
  console.log(
    "The no-paid-subscription/no-payment-method condition is supplied by the owner's explicit workflow confirmation. " +
    "This deployment does not change billing settings, add payment methods, or enable paid products."
  );
}

async function requireExistingStagingWorker(accountId, workerName) {
  const scripts = await cloudflare(
    "GET",
    "/accounts/" + accountId + "/workers/scripts?per_page=100&page=1",
  );
  if (!Array.isArray(scripts)) {
    fail("Cloudflare did not return the existing Worker inventory. No D1 resource was created.");
  }
  if (!scripts.some((script) => script && script.id === workerName)) {
    fail(
      "The staging Worker " + workerName + " does not already exist. The configured Workers Editor token can deploy to an existing Worker but cannot create a new Worker. " +
      "Create an empty Worker with this exact name in the Cloudflare dashboard, then rerun. " +
      "This check runs before D1 provisioning, so no database was created."
    );
  }
  console.log("The pre-existing staging Worker was found; the existing Workers Editor token can update/deploy it.");
}

async function main() {
  const { accountId, supportersDatabaseId } = validateEnv();
  const sourceConfig = JSON.parse(await readFile(sourceConfigPath, "utf8"));
  assertSentinelConfig(sourceConfig);

  console.log("Running the local Worker tests, allowlisted homepage build, and non-deploying bundle check before any remote resource is created.");
  runNpm(["test"]);
  runNpm(["run", "build:site"]);
  runNpm(["run", "check:worker"]);

  const subdomainResponse = await cloudflare("GET", "/accounts/" + accountId + "/workers/subdomain");
  const subdomain = validateSubdomain(subdomainResponse?.subdomain);

  // Workers Editor can deploy an existing Worker but cannot create one. Verify
  // the target before D1 provisioning so missing Worker permissions/resources
  // cannot leave an unused remote database behind.
  await requireExistingStagingWorker(accountId, sourceConfig.env.staging.name);
  await reportWorkersUsageModel(accountId);

  const state = await resolveDatabase(accountId);
  // Publish both non-secret D1 UUIDs immediately so later failures do not
  // leave resources without protected identity records.
  await publishGithubD1Identity(state);
  const supportersState = await resolveSupportersDatabase(accountId, supportersDatabaseId);
  await publishGithubSupportersD1Identity(supportersState);
  if (state.subdomain && state.subdomain !== subdomain) {
    fail("The Cloudflare workers.dev subdomain differs from the saved staging state. Review the account/domain change manually.");
  }
  const configInfo = await writeRemoteConfig(sourceConfig, subdomain, state.databaseId, supportersState.databaseId);
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

  const rateLimitKey = await loadOrCreateLocalSecret(
    rateKeyPath,
    32,
    "ASTROCROWN_RATE_LIMIT_HMAC_KEY",
  );
  await publishGithubDeploymentMetadata(completeState, supportersState, configInfo);

  console.log("Applying the staging D1 migration to the isolated remote database.");
  runNpx(
    ["wrangler", "d1", "migrations", "apply", databaseName, "--remote", "--env", "staging", "--config", ".wrangler.remote-staging.jsonc"],
    { input: "y\n", allowCloudflareCredentials: true },
  );

  console.log("Applying the separate Supporter Programme schema to its isolated remote database.");
  runNpx(
    ["wrangler", "d1", "migrations", "apply", supportersDatabaseName, "--remote", "--env", "staging", "--config", ".wrangler.remote-staging.jsonc"],
    { input: "y\n", allowCloudflareCredentials: true },
  );

  console.log("Deploying only the staging Worker environment. Missing secrets keep the service closed.");
  runNpx(["wrangler", "deploy", "--env", "staging", "--config", ".wrangler.remote-staging.jsonc"], { allowCloudflareCredentials: true });

  console.log("Installing the staging-only rate-limit and acknowledgement-signing key.");
  await setSecret("RATE_LIMIT_HMAC_KEY", rateLimitKey);

  console.log("Checking public homepage access, required notice acknowledgement, wallet-primary account status and wrong-Origin rejection.");
  const evidence = await smokeTest(configInfo.origin);

  console.log("");
  console.log("REMOTE STAGING DEPLOYED — INITIAL SMOKE CHECKS PASSED");
  console.log("Staging URL: " + configInfo.origin + "/");
  console.log("Access mode: public live test environment; visitors see the mandatory safety notice before account services.");
  console.log("Account API: wallet-primary identity, one-use origin-bound challenges and server-side rate limits are active.");
  console.log("Account D1 database name: " + databaseName);
  console.log("Account D1 database ID: " + state.databaseId);
  console.log("Supporter Programme D1 database name: " + supportersDatabaseName);
  console.log("Supporter Programme D1 database ID: " + supportersState.databaseId);
  console.log("Supporter Programme status: PRELAUNCH; mainnet payment acceptance remains disabled.");
  console.log("");
  console.log("This is only initial deployment smoke evidence, not full remote account qualification.");
  console.log("Before any real-user use, independently qualify physical wallet providers and browser/device compatibility on the exact staging origin.");
  console.log("Use a wallet you control and synthetic account details only. Review the exact domain, network, address and off-chain message before signing.");
  console.log("This script does not enable billing, add a payment method, deploy production, or delete resources after a failed run.");
  console.log("Record three-pass cleanup and the provider's retention quarantine before closing this staging environment.");
}

main().catch((error) => {
  const message = error?.safeForDisplay ? error.message : String(error?.message || error);
  console.error("STAGING DEPLOYMENT STOPPED: " + message);
  console.error("No automatic resource deletion is performed. Inspect the exact staging-only state and retention before any cleanup.");
  process.exitCode = 1;
});
