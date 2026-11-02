import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createServer as createNetServer } from "node:net";

const chrome = process.env.CHROME_BIN;
if (!chrome) throw new Error("CHROME_BIN must name a preinstalled Chrome/Chromium binary.");
const python = process.env.PYTHON || "python";
const prototypeDir = resolve("development/account-continuity/prototype");
const work = mkdtempSync(join(tmpdir(), "acrown-passkey-browser-"));
const [port, debugPort] = await freePorts(2);
const localUrl = "http://localhost:" + port + "/";
const databasePath = join(work, "passkey-browser-test.sqlite3");
let server = null;
let browser = null;
let socket = null;
let requestId = 0;
let browserOutput = "";
let authenticatorId = null;
const pending = new Map();

async function freePorts(count) {
  const servers = [];
  try {
    for (let i = 0; i < count; i += 1) {
      const item = createNetServer();
      await new Promise((resolvePromise, reject) => {
        item.once("error", reject);
        item.listen(0, "127.0.0.1", resolvePromise);
      });
      servers.push(item);
    }
    const values = servers.map(item => item.address().port);
    await Promise.all(servers.map(item => new Promise((resolvePromise, reject) =>
      item.close(error => error ? reject(error) : resolvePromise()))));
    return values;
  } catch (error) {
    await Promise.all(servers.map(item => new Promise(resolvePromise => item.close(() => resolvePromise()))));
    throw error;
  }
}

const sleep = ms => new Promise(resolvePromise => setTimeout(resolvePromise, ms));

async function waitFor(description, predicate, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = "";
  while (Date.now() < deadline) {
    try {
      const result = await predicate();
      if (result) return result;
    } catch (error) {
      lastError = String(error?.message || error);
    }
    await sleep(100);
  }
  throw new Error("Timed out waiting for " + description + (lastError ? ": " + lastError : ""));
}

function cdp(method, params = {}) {
  return new Promise((resolvePromise, reject) => {
    const id = ++requestId;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error("CDP timeout: " + method));
    }, 15000);
    pending.set(id, { resolve: resolvePromise, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await cdp("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || "Browser expression failed");
  }
  return result.result?.value;
}

async function pageReady() {
  return evaluate(
    "document.readyState === 'complete' && Boolean(document.getElementById('open-account-dialog'))"
  );
}

try {
  const env = { ...process.env, PYTHONDONTWRITEBYTECODE: "1" };
  server = spawn(python, [
    "server.py", "--port", String(port), "--db", databasePath
  ], {
    cwd: prototypeDir,
    env,
    stdio: ["ignore", "ignore", "pipe"]
  });
  server.stderr.setEncoding("utf8");
  server.stderr.on("data", chunk => {
    browserOutput = (browserOutput + chunk).slice(-6000);
  });

  await waitFor("local passkey account server", async () => {
    const response = await fetch(localUrl).catch(() => null);
    if (!response) return false;
    await response.arrayBuffer();
    return response.ok;
  }, 15000);

  browser = spawn(chrome, [
    "--headless=new", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage",
    "--remote-debugging-port=" + debugPort, "--remote-allow-origins=*",
    "--user-data-dir=" + join(work, "profile"), "about:blank"
  ], { stdio: ["ignore", "ignore", "pipe"] });
  browser.stderr.setEncoding("utf8");
  browser.stderr.on("data", chunk => {
    browserOutput = (browserOutput + chunk).slice(-8000);
  });

  let target;
  await waitFor("Chrome DevTools target", async () => {
    try {
      const response = await fetch("http://127.0.0.1:" + debugPort + "/json");
      const targets = await response.json();
      target = targets.find(item => item.type === "page" && item.url === "about:blank");
      return target && target.webSocketDebuggerUrl;
    } catch {
      return false;
    }
  }, 20000);

  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolvePromise, reject) => {
    const timer = setTimeout(() => reject(new Error("DevTools connection timed out")), 10000);
    socket.addEventListener("open", () => {
      clearTimeout(timer);
      resolvePromise();
    }, { once: true });
    socket.addEventListener("error", () => {
      clearTimeout(timer);
      reject(new Error("DevTools connection failed"));
    }, { once: true });
  });

  socket.addEventListener("message", event => {
    let message;
    try {
      message = JSON.parse(String(event.data));
    } catch {
      return;
    }
    if (!message.id) return;
    const item = pending.get(message.id);
    if (!item) return;
    clearTimeout(item.timer);
    pending.delete(message.id);
    if (message.error) item.reject(new Error(message.error.message || "DevTools command failed"));
    else item.resolve(message.result || {});
  });

  await cdp("Page.enable");
  await cdp("Runtime.enable");
  await cdp("WebAuthn.enable", { enableUI: false });
  const virtual = await cdp("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true
    }
  });
  authenticatorId = virtual.authenticatorId;
  assert.ok(authenticatorId, "Chrome must create a virtual CTAP2 authenticator");

  await cdp("Page.navigate", { url: localUrl });
  await waitFor("homepage load", pageReady);
  assert.equal(await evaluate("window.isSecureContext"), true, "localhost must be a WebAuthn secure context");
  assert.equal(await evaluate("Boolean(window.ethereum)"), false, "ordinary account access must not request a crypto wallet");

  const assurance = await evaluate(
    "fetch('/account-continuity/prototype/security-assurance.html').then(async r => [r.status, await r.text()])"
  );
  assert.equal(assurance[0], 200, "security assurance page must be served locally");
  assert.match(assurance[1], /Development prototype only/);

  const terms = await evaluate(
    "fetch('/account-continuity/prototype/terms-of-use.html').then(async r => [r.status, await r.text()])"
  );
  const privacy = await evaluate(
    "fetch('/account-continuity/prototype/privacy-policy.html').then(async r => [r.status, await r.text()])"
  );
  assert.equal(terms[0], 200);
  assert.equal(privacy[0], 200);
  assert.match(terms[1], /DRAFT ONLY/);
  assert.match(privacy[1], /DRAFT ONLY/);

  await evaluate("document.getElementById('open-account-dialog').click()");
  await waitFor("passkey sign-in dialog", () => evaluate("document.getElementById('account-dialog').open"));
  assert.equal(await evaluate("Boolean(document.getElementById('account-email'))"), false,
    "the active sign-in view must not request an email address");
  assert.equal(await evaluate("Boolean(document.getElementById('account-password'))"), false,
    "the active sign-in view must not request a password");
  assert.equal(await evaluate("Boolean(document.getElementById('account-passkey-signin'))"), true);
  assert.match(await evaluate("document.body.innerText"), /No email address or password is required/i);

  await evaluate("document.querySelector('[data-account-mode=create]').click()");
  await waitFor("passkey registration form", () =>
    evaluate("Boolean(document.getElementById('account-create-form'))"));
  assert.equal(await evaluate("Boolean(document.getElementById('account-email'))"), false);
  assert.equal(await evaluate("Boolean(document.getElementById('account-password'))"), false);
  assert.equal(await evaluate("document.getElementById('account-terms-accepted').required"), true);
  await evaluate("document.getElementById('account-referral-id').value = 'ACROWN_PASSKEY_E2E'");
  await evaluate("document.getElementById('account-create-form').requestSubmit()");
  await sleep(300);
  assert.equal(await evaluate("Boolean(document.getElementById('open-account-hub'))"), false,
    "registration must not proceed before the terms checkbox is accepted");

  await evaluate("document.getElementById('account-terms-accepted').checked = true");
  await evaluate("document.getElementById('account-create-form').requestSubmit()");
  await waitFor("real WebAuthn passkey registration and one-time recovery-key display", () =>
    evaluate("Boolean(document.getElementById('account-one-time-recovery-key'))"), 30000);
  assert.equal(await evaluate("document.getElementById('open-account-dialog').classList.contains('is-authenticated')"), true);
  assert.equal(await evaluate("document.getElementById('open-account-hub').textContent.trim()"), "Open your dashboard");
  assert.equal(await evaluate("document.getElementById('open-account-hub').disabled"), true,
    "the dashboard action stays blocked until the user acknowledges saving the recovery key");
  const successAccountIdentifier = await evaluate("document.getElementById('account-one-time-account-identifier').value");
  assert.match(successAccountIdentifier, /^AC-[A-F0-9]{10}$/);
  const initialRecoveryKey = await evaluate("document.getElementById('account-one-time-recovery-key').value");
  assert.match(initialRecoveryKey, /^ACR1-[A-Za-z0-9_-]{43}$/);
  assert.match(await evaluate("document.body.innerText"), /save your offline recovery key now/i);
  assert.doesNotMatch(await evaluate("document.body.innerText"), /verification email|password reset/i);
  await evaluate("document.getElementById('account-recovery-key-saved').checked = true; document.getElementById('account-recovery-key-saved').dispatchEvent(new Event('change', {bubbles:true}));");
  assert.equal(await evaluate("document.getElementById('open-account-hub').disabled"), false);

  const registeredCredentials = await cdp("WebAuthn.getCredentials", { authenticatorId });
  assert.equal(registeredCredentials.credentials.length, 1,
    "the virtual authenticator must retain a discoverable passkey");
  assert.equal(registeredCredentials.credentials[0].isResidentCredential, true,
    "the registered passkey must be discoverable");
  assert.equal(registeredCredentials.credentials[0].rpId, "localhost");

  await evaluate("document.getElementById('open-account-hub').click()");
  await waitFor("User dashboard after passkey registration", () =>
    evaluate("!document.getElementById('account-dashboard').hidden && Boolean(document.getElementById('account-signout'))"));
  const accountIdentifier = successAccountIdentifier;
  assert.equal(await evaluate("document.querySelector('.account-dashboard-welcome-copy strong').textContent"), accountIdentifier);
  assert.equal(await evaluate("Boolean(document.querySelector('.account-user-services-card'))"), true);
  assert.match(await evaluate("document.querySelector('.account-user-services-card').innerText"),
    /regular users and administrators/i);
  assert.equal(await evaluate("Boolean(document.querySelector('.account-admin-access-card'))"), false,
    "ordinary passkey account must not see administrator access");
  assert.equal(await evaluate("Boolean(document.querySelector('.account-password-manager'))"), false,
    "the passkey dashboard must not offer password management");
  assert.equal(await evaluate("Boolean(document.querySelector('#account-session-current-password'))"), false,
    "session management must not fall back to password proof");

  const accountStatus = await evaluate("fetch('/api/account/status').then(r => r.json())");
  assert.equal(accountStatus.authenticated, true);
  assert.equal(accountStatus.authMethod, "webauthn");
  assert.equal(accountStatus.passkeyCount, 1);
  assert.equal(accountStatus.email, null);
  assert.equal(accountStatus.emailVerified, false);
  assert.equal(accountStatus.role, "user");

  const databaseCheck = spawnSync(python, [
    "-c",
    "import json,sqlite3,sys; c=sqlite3.connect(sys.argv[1]); c.row_factory=sqlite3.Row; a=dict(c.execute('SELECT username,email,auth_method,role FROM accounts').fetchone()); p=dict(c.execute('SELECT sign_count,active,backed_up FROM account_passkey_credentials').fetchone()); print(json.dumps({'account':a,'passkey':p,'sessions':c.execute('SELECT COUNT(*) FROM sessions').fetchone()[0]}))",
    databasePath
  ], { encoding: "utf8" });
  assert.equal(databaseCheck.status, 0, databaseCheck.stderr || "SQLite verification command failed");
  const stored = JSON.parse(databaseCheck.stdout);
  assert.equal(stored.account.email, null, "passkey accounts must not acquire an email identifier");
  assert.equal(stored.account.auth_method, "webauthn");
  assert.equal(stored.account.role, "user");
  assert.equal(stored.passkey.active, 1);
  assert.equal(stored.sessions, 1);

  // A direct administrator route remains denied and does not trigger a wallet prompt.
  await evaluate("window.__walletPromptCount = 0; window.ethereum = { request: async function () { window.__walletPromptCount += 1; throw new Error('unexpected wallet request'); } }; window.location.hash = 'admin'");
  await waitFor("direct admin route blocked for ordinary passkey user", () =>
    evaluate("document.getElementById('admin-dashboard').hidden && window.location.hash === '#account'"));
  assert.equal(await evaluate("window.__walletPromptCount"), 0);

  // Sign out, then authenticate with the discoverable credential without an account label.
  await evaluate("document.getElementById('account-signout').click()");
  await waitFor("home after passkey sign-out", () =>
    evaluate("document.getElementById('account-dashboard').hidden && !document.getElementById('open-account-dialog').classList.contains('is-authenticated')"));
  await evaluate("document.getElementById('open-account-dialog').click()");
  await waitFor("passkey sign-in view after sign-out", () =>
    evaluate("Boolean(document.getElementById('account-passkey-signin'))"));
  await evaluate("document.getElementById('account-passkey-signin').click()");
  await waitFor("discoverable passkey sign-in to complete", () =>
    evaluate("Boolean(document.getElementById('open-account-hub'))"), 30000);
  assert.match(await evaluate("document.body.innerText"), /signed in to the development account with your passkey|signed in to AstroCrown with your passkey/i);
  await evaluate("document.getElementById('open-account-hub').click()");
  await waitFor("User dashboard after passkey sign-in", () =>
    evaluate("!document.getElementById('account-dashboard').hidden && Boolean(document.getElementById('account-signout'))"));
  assert.equal(await evaluate("document.querySelector('.account-dashboard-welcome-copy strong').textContent"), accountIdentifier);
  const signedInStatus = await evaluate("fetch('/api/account/status').then(r => r.json())");
  assert.equal(signedInStatus.authenticated, true);
  assert.equal(signedInStatus.passkeyCount, 1);
  assert.equal(signedInStatus.accountIdentifier, accountIdentifier);

  await evaluate("document.getElementById('account-signout').click()");
  await waitFor("signed-in WebAuthn session is cleared before recovery", () =>
    evaluate("document.getElementById('account-dashboard').hidden && !document.getElementById('open-account-dialog').classList.contains('is-authenticated')"));
  const clearedStatus = await evaluate("fetch('/api/account/status').then(r => r.json())");
  assert.equal(clearedStatus.authenticated, false);

  // Recover with the one-time offline key. The old passkey is disabled, all
  // previous sessions are revoked, and the replacement key is displayed once.
  await evaluate("document.getElementById('open-account-dialog').click()");
  await waitFor("passkey sign-in view before recovery", () =>
    evaluate("Boolean(document.getElementById('account-recovery-start'))"));
  await evaluate("document.getElementById('account-recovery-start').click()");
  await waitFor("offline recovery form", () =>
    evaluate("Boolean(document.getElementById('account-recovery-form'))"));
  await evaluate("document.getElementById('account-recovery-identifier').value = " +
    JSON.stringify(accountIdentifier) + "; document.getElementById('account-recovery-secret').value = " +
    JSON.stringify(initialRecoveryKey) + "; document.getElementById('account-recovery-form').requestSubmit();");
  await waitFor("recovery passkey replacement and rotated key", () =>
    evaluate("Boolean(document.getElementById('account-one-time-recovery-key'))"), 30000);
  assert.match(await evaluate("document.body.innerText"), /your account has been recovered/i);
  const replacementRecoveryKey = await evaluate("document.getElementById('account-one-time-recovery-key').value");
  assert.match(replacementRecoveryKey, /^ACR1-[A-Za-z0-9_-]{43}$/);
  assert.notEqual(replacementRecoveryKey, initialRecoveryKey);
  assert.equal(await evaluate("document.getElementById('open-account-hub').disabled"), true);
  await evaluate("document.getElementById('account-recovery-key-saved').checked = true; document.getElementById('account-recovery-key-saved').dispatchEvent(new Event('change', {bubbles:true}));");
  await evaluate("document.getElementById('open-account-hub').click()");
  await waitFor("User dashboard after recovery", () =>
    evaluate("!document.getElementById('account-dashboard').hidden && Boolean(document.getElementById('account-signout'))"));
  const recoveredStatus = await evaluate("fetch('/api/account/status').then(r => r.json())");
  assert.equal(recoveredStatus.authenticated, true);
  assert.equal(recoveredStatus.accountIdentifier, accountIdentifier);
  assert.equal(recoveredStatus.passkeyCount, 1);
  assert.equal(recoveredStatus.recoveryKeyAvailable, true);
  assert.equal(recoveredStatus.activeSessionCount, 1);

  const recoveryDatabaseCheck = spawnSync(python, [
    "-c",
    "import json,sqlite3,sys; c=sqlite3.connect(sys.argv[1]); c.row_factory=sqlite3.Row; p=[dict(x) for x in c.execute('SELECT credential_id,active FROM account_passkey_credentials ORDER BY credential_id')]; r=[dict(x) for x in c.execute('SELECT key_version,used_at FROM account_recovery_keys ORDER BY key_version')]; print(json.dumps({'passkeys':p,'recoveryKeys':r,'sessions':c.execute('SELECT COUNT(*) FROM sessions').fetchone()[0]}))",
    databasePath
  ], { encoding: "utf8" });
  assert.equal(recoveryDatabaseCheck.status, 0, recoveryDatabaseCheck.stderr || "SQLite recovery verification failed");
  const recoveredStored = JSON.parse(recoveryDatabaseCheck.stdout);
  assert.equal(recoveredStored.passkeys.length, 2);
  assert.equal(recoveredStored.passkeys.filter(item => item.active === 1).length, 1);
  assert.equal(recoveredStored.passkeys.filter(item => item.active === 0).length, 1);
  assert.deepEqual(recoveredStored.recoveryKeys.map(item => item.key_version), [1, 2]);
  assert.ok(recoveredStored.recoveryKeys[0].used_at);
  assert.equal(recoveredStored.recoveryKeys[1].used_at, null);
  assert.equal(recoveredStored.sessions, 1);

  const oldRecoveryResult = await evaluate("fetch('/api/account/recovery/options', {method:'POST', credentials:'same-origin', headers:{'Content-Type':'application/json'}, body:JSON.stringify({accountIdentifier:" +
    JSON.stringify(accountIdentifier) + ",recoveryKey:" + JSON.stringify(initialRecoveryKey) + "})}).then(async r => ({status:r.status,body:await r.json()}))");
  assert.equal(oldRecoveryResult.status, 401, "the previous recovery key must be single-use");
  const newRecoveryResult = await evaluate("fetch('/api/account/recovery/options', {method:'POST', credentials:'same-origin', headers:{'Content-Type':'application/json'}, body:JSON.stringify({accountIdentifier:" +
    JSON.stringify(accountIdentifier) + ",recoveryKey:" + JSON.stringify(replacementRecoveryKey) + "})}).then(async r => ({status:r.status,body:await r.json()}))");
  assert.equal(newRecoveryResult.status, 200, "the replacement recovery key must be active");

  await evaluate("document.getElementById('account-signout').click()");
  await waitFor("recovered account session is cleared before preview checks", () =>
    evaluate("document.getElementById('account-dashboard').hidden && !document.getElementById('open-account-dialog').classList.contains('is-authenticated')"));
  assert.equal((await evaluate("fetch('/api/account/status').then(r => r.json())")).authenticated, false);

  // Hosted-preview mode is intentionally non-authenticating: no fake account state.
  await cdp("Page.navigate", { url: localUrl + "?account-preview-demo=1" });
  await waitFor("hosted-preview-mode homepage", pageReady);
  await evaluate("document.getElementById('open-account-dialog').click()");
  await waitFor("read-only preview sign-in dialog", () => evaluate("document.getElementById('account-dialog').open"));
  assert.equal(await evaluate("document.getElementById('account-demo-notice').dataset.mode"),
    "hosted-preview-no-authentication");
  assert.equal(await evaluate("document.getElementById('account-passkey-signin').disabled"), true);
  assert.match(await evaluate("document.getElementById('account-demo-notice').textContent"),
    /cannot create accounts or authenticate users/i);
  await evaluate("document.querySelector('[data-account-mode=create]').click()");
  await waitFor("read-only preview registration view", () =>
    evaluate("Boolean(document.getElementById('account-create-form'))"));
  assert.equal(await evaluate("document.querySelector('#account-create-form button[type=submit]').disabled"), true);
  assert.equal(await evaluate("Boolean(document.getElementById('account-email'))"), false);
  assert.equal(await evaluate("Boolean(document.getElementById('account-password'))"), false);
  const previewStatus = await evaluate("fetch('/api/account/status').then(r => r.json())");
  assert.equal(previewStatus.authenticated, false);
  assert.equal(previewStatus.passkeyAvailable, false);

  await cdp("Page.navigate", { url: localUrl });
  await waitFor("local homepage before case-portal check", pageReady);
  const signedOutState = await evaluate("fetch('/api/account/status').then(r => r.json())");
  assert.equal(signedOutState.authenticated, false,
    "the preview and local account test must not leave an active member session in a new browser context");

  // The case portal is intentionally independent from account authentication.
  await cdp("Page.navigate", { url: localUrl + "account-continuity/prototype/cases.html" });
  await waitFor("independent case portal", () =>
    evaluate("document.readyState === 'complete' && Boolean(document.getElementById('case-create-form'))"));
  assert.match(await evaluate("document.body.innerText"), /Account not required/);
  assert.match(await evaluate("document.body.innerText"), /private access key/);
  const guestAccountStatus = await evaluate("fetch('/api/account/status').then(r => r.json())");
  assert.equal(guestAccountStatus.authenticated, false);
  await evaluate("document.getElementById('case-kind').value = 'grievance'; document.querySelector('#case-create-form [name=topic]').value = 'account_access'; document.querySelector('#case-create-form [name=title]').value = 'Account termination appeal'; document.querySelector('#case-create-form [name=description]').value = 'I believe my account was terminated in error and request an independent review of the decision.'; document.getElementById('case-create-form').requestSubmit();");
  await waitFor("guest grievance receipt with independent credentials", () =>
    evaluate("!document.getElementById('case-receipt').hidden && document.querySelectorAll('#case-receipt .case-secret-row strong').length === 2"), 20000);
  const caseCredentials = await evaluate(
    "Array.from(document.querySelectorAll('#case-receipt .case-secret-row strong')).map(node => node.textContent)"
  );
  assert.match(caseCredentials[0], /^ACR-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
  assert.ok(caseCredentials[1].length >= 32, "the private case key must have high entropy");
  assert.match(await evaluate("document.getElementById('case-receipt').innerText"), /within 2 working days/);
  await evaluate("document.querySelector('#case-lookup-form [name=referenceCode]').value = " +
    JSON.stringify(caseCredentials[0]) + "; document.querySelector('#case-lookup-form [name=accessKey]').value = " +
    JSON.stringify(caseCredentials[1]) + "; document.getElementById('case-lookup-form').requestSubmit();");
  await waitFor("guest opens the case using its separate credentials", () =>
    evaluate("!document.getElementById('case-detail').hidden && document.getElementById('case-detail').innerText.includes('Account termination appeal')"));
  assert.equal(await evaluate("Boolean(document.querySelector('#case-detail [data-download-case-history]'))"), true);
  await evaluate("document.querySelector('#case-message-form [name=message]').value = 'I am adding relevant details after the account restriction and request this remain under review.'; document.getElementById('case-message-form').requestSubmit();");
  await waitFor("guest adds a message to the independent case", () =>
    evaluate("document.getElementById('case-detail').innerText.includes('I am adding relevant details after the account restriction')"));
  const createdRecovery = await evaluate("fetch('/api/cases/recovery-request', {method:'POST', credentials:'same-origin', headers:{'Content-Type':'application/json'}, body:JSON.stringify({caseReference:'', caseTitle:'Account termination appeal', approximateDate:'31 October 2026', contactMethod:'other', contactValue:'Previously established test contact route', explanation:'I lost both the case reference and access key after my account was terminated.'})}).then(async r => ({status:r.status, body:await r.json()}))");
  assert.equal(createdRecovery.status, 201);
  const recoveryStatus = await evaluate("fetch('/api/cases/recovery-status', {method:'POST', credentials:'same-origin', headers:{'Content-Type':'application/json'}, body:JSON.stringify({recoveryReference:" +
    JSON.stringify(createdRecovery.body.recoveryReference) + ", recoveryKey:" +
    JSON.stringify(createdRecovery.body.recoveryKey) + "})}).then(async r => ({status:r.status, body:await r.json()}))");
  assert.equal(recoveryStatus.status, 200);
  assert.equal(recoveryStatus.body.status, "pending");
  assert.match(recoveryStatus.body.message, /independent identity verification/);

  console.log("PASS: real WebAuthn registration and discoverable sign-in, passkey persistence without email, user-verification and resident-key options, no-password UI, preview non-authentication, ordinary/admin separation, and independent guest case portal.");
} catch (error) {
  console.error(String(error?.stack || error));
  if (browserOutput) console.error("Browser/server output:\n" + browserOutput);
  process.exitCode = 1;
} finally {
  if (socket) try { socket.close(); } catch {}
  if (browser && browser.exitCode === null) browser.kill("SIGTERM");
  if (server && server.exitCode === null) server.kill("SIGTERM");
  await new Promise(resolvePromise => setTimeout(resolvePromise, 200));
  rmSync(work, { recursive: true, force: true });
}
