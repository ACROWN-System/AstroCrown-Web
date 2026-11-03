import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const chromePath = process.env.CHROME_BIN;
const baseUrl = process.env.WORKER_BASE_URL || "http://localhost:8787/";
if (!chromePath) throw new Error("CHROME_BIN must name a preinstalled Chrome/Chromium executable.");

const temp = mkdtempSync(join(tmpdir(), "acrown-worker-browser-"));
const debugServer = createServer();
await new Promise((resolve, reject) => {
  debugServer.once("error", reject);
  debugServer.listen(0, "127.0.0.1", resolve);
});
const debugPort = debugServer.address().port;
await new Promise((resolve, reject) => debugServer.close(error => error ? reject(error) : resolve()));

let browser = null;
let socket = null;
let authenticatorId = null;
let nextCommandId = 0;
let browserOutput = "";
const pending = new Map();
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function waitFor(description, predicate, timeout = 30000) {
  const deadline = Date.now() + timeout;
  let lastError = "";
  while (Date.now() < deadline) {
    try {
      const value = await predicate();
      if (value) return value;
    } catch (error) {
      lastError = String(error?.message || error);
    }
    await sleep(100);
  }
  throw new Error("Timed out waiting for " + description + (lastError ? ": " + lastError : ""));
}

function cdp(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++nextCommandId;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error("Chrome DevTools command timed out: " + method));
    }, 20000);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await cdp("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || "Browser expression failed.");
  return result.result?.value;
}

async function trustedClick(selector) {
  const point = await evaluate(
    "(() => { const element = document.querySelector(" + JSON.stringify(selector) + ");" +
    " if (!element) throw new Error('Missing click target: ' + " + JSON.stringify(selector) + ");" +
    " element.scrollIntoView({block:'center',inline:'center'});" +
    " const r = element.getBoundingClientRect();" +
    " return {x:r.left+r.width/2,y:r.top+r.height/2}; })()"
  );
  await cdp("Input.dispatchMouseEvent", { type: "mouseMoved", x: point.x, y: point.y });
  await cdp("Input.dispatchMouseEvent", { type: "mousePressed", x: point.x, y: point.y, button: "left", clickCount: 1 });
  await cdp("Input.dispatchMouseEvent", { type: "mouseReleased", x: point.x, y: point.y, button: "left", clickCount: 1 });
}

async function status() {
  return evaluate("fetch('/api/account/status',{credentials:'same-origin',cache:'no-store'}).then(r=>r.json())");
}

try {
  browser = spawn(chromePath, [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--remote-debugging-port=" + debugPort,
    "--remote-allow-origins=*",
    "--user-data-dir=" + join(temp, "profile"),
    "about:blank",
  ], { stdio: ["ignore", "ignore", "pipe"] });
  browser.stderr.setEncoding("utf8");
  browser.stderr.on("data", chunk => { browserOutput = (browserOutput + chunk).slice(-6000); });

  let target;
  await waitFor("Chrome DevTools page", async () => {
    try {
      const response = await fetch("http://127.0.0.1:" + debugPort + "/json");
      const targets = await response.json();
      target = targets.find(item => item.type === "page" && item.url === "about:blank");
      return Boolean(target?.webSocketDebuggerUrl);
    } catch {
      return false;
    }
  }, 20000);

  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("DevTools websocket connection timed out.")), 10000);
    socket.addEventListener("open", () => { clearTimeout(timer); resolve(); }, { once: true });
    socket.addEventListener("error", () => { clearTimeout(timer); reject(new Error("DevTools websocket connection failed.")); }, { once: true });
  });
  socket.addEventListener("message", event => {
    let message;
    try { message = JSON.parse(String(event.data)); } catch { return; }
    if (!message.id) return;
    const item = pending.get(message.id);
    if (!item) return;
    clearTimeout(item.timer);
    pending.delete(message.id);
    if (message.error) item.reject(new Error(message.error.message || "DevTools command failed."));
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
      automaticPresenceSimulation: true,
    },
  });
  authenticatorId = virtual.authenticatorId;
  assert.ok(authenticatorId, "Chrome must create a virtual CTAP2 authenticator.");

  await cdp("Page.navigate", { url: baseUrl });
  await waitFor("AstroCrown staging homepage", () =>
    evaluate("document.readyState === 'complete' && Boolean(document.getElementById('open-account-dialog'))")
  );
  assert.equal(await evaluate("window.isSecureContext"), true, "localhost must be a WebAuthn secure context.");
  assert.equal(await evaluate("Boolean(window.ethereum)"), false, "ordinary account login must not require a wallet.");
  assert.match(await evaluate("document.body.innerText"), /STAGING ENVIRONMENT/);

  const noticeOpen = await evaluate("Boolean(document.getElementById('development-notice') && document.getElementById('development-notice').open)");
  if (noticeOpen) {
    if (await evaluate("Boolean(document.getElementById('development-notice-acknowledged'))") &&
        !(await evaluate("document.getElementById('development-notice-acknowledged').checked"))) {
      await trustedClick("#development-notice-acknowledged");
    }
    if (await evaluate("Boolean(document.getElementById('development-notice-continue'))")) {
      await trustedClick("#development-notice-continue");
      await waitFor("development notice acknowledgement", () =>
        evaluate("!document.getElementById('development-notice').open"));
    }
  }

  await trustedClick("#open-account-dialog");
  await waitFor("account sign-in modal", () => evaluate("Boolean(document.getElementById('account-dialog')?.open)"));
  assert.equal(await evaluate("Boolean(document.getElementById('account-email'))"), false);
  assert.equal(await evaluate("Boolean(document.getElementById('account-password'))"), false);
  await trustedClick('[data-account-mode="create"]');
  await waitFor("passkey registration form", () => evaluate("Boolean(document.getElementById('account-create-form'))"));
  await trustedClick("#account-terms-accepted");
  await trustedClick("#account-create-form button[type=submit]");
  await waitFor("passkey creation and one-time recovery key", () =>
    evaluate("Boolean(document.getElementById('account-one-time-recovery-key'))"), 45000);

  const identifier = await evaluate("document.getElementById('account-one-time-account-identifier').value");
  const firstKey = await evaluate("document.getElementById('account-one-time-recovery-key').value");
  assert.match(identifier, /^AC-[A-F0-9]{10}$/);
  assert.match(firstKey, /^ACR1-[A-Za-z0-9_-]{43}$/);
  let account = await status();
  assert.equal(account.authenticated, true);
  assert.equal(account.accountIdentifier, identifier);
  assert.equal(account.authMethod, "webauthn");
  assert.equal(account.passkeyCount, 1);
  assert.equal(account.email, null);
  assert.equal(account.role, "user");
  assert.equal(account.recoveryKeyAvailable, true);

  await trustedClick("#account-recovery-key-saved");
  await waitFor("offline recovery key acknowledgement", () => evaluate("!document.getElementById('open-account-hub').disabled"));
  await trustedClick("#open-account-hub");
  await waitFor("ordinary User dashboard", () =>
    evaluate("!document.getElementById('account-dashboard').hidden && Boolean(document.getElementById('account-signout'))"));

  const firstCredentials = await cdp("WebAuthn.getCredentials", { authenticatorId });
  assert.equal(firstCredentials.credentials.length, 1, "registration must create one resident credential.");

  await trustedClick("#account-signout");
  await waitFor("first account session revoked", async () => !(await status()).authenticated);
  await trustedClick("#open-account-dialog");
  await waitFor("discoverable sign-in button", () => evaluate("Boolean(document.getElementById('account-passkey-signin'))"));
  await trustedClick("#account-passkey-signin");
  await waitFor("discoverable passkey sign-in", () => evaluate("Boolean(document.getElementById('open-account-hub'))"), 45000);
  await trustedClick("#open-account-hub");
  await waitFor("User dashboard after passkey sign-in", () =>
    evaluate("!document.getElementById('account-dashboard').hidden"));
  account = await status();
  assert.equal(account.authenticated, true);
  assert.equal(account.accountIdentifier, identifier);
  assert.equal(account.passkeyCount, 1);

  await trustedClick("#account-signout");
  await waitFor("sign-out before recovery", async () => !(await status()).authenticated);
  await cdp("WebAuthn.removeCredential", {
    authenticatorId,
    credentialId: firstCredentials.credentials[0].credentialId,
  });
  const afterLoss = await cdp("WebAuthn.getCredentials", { authenticatorId });
  assert.equal(afterLoss.credentials.length, 0, "the simulated lost passkey must be removed from the authenticator.");

  await trustedClick("#open-account-dialog");
  await waitFor("passkey recovery link", () => evaluate("Boolean(document.getElementById('account-recovery-start'))"));
  await trustedClick("#account-recovery-start");
  await waitFor("offline recovery form", () => evaluate("Boolean(document.getElementById('account-recovery-form'))"));
  await evaluate(
    "document.getElementById('account-recovery-identifier').value=" + JSON.stringify(identifier) + ";" +
    "document.getElementById('account-recovery-secret').value=" + JSON.stringify(firstKey) + ";"
  );
  await trustedClick("#account-recovery-form button[type=submit]");
  await waitFor("replacement passkey and rotated recovery key", () =>
    evaluate("Boolean(document.getElementById('account-one-time-recovery-key'))"), 45000);
  const nextKey = await evaluate("document.getElementById('account-one-time-recovery-key').value");
  assert.match(nextKey, /^ACR1-[A-Za-z0-9_-]{43}$/);
  assert.notEqual(nextKey, firstKey);
  account = await status();
  assert.equal(account.authenticated, true);
  assert.equal(account.accountIdentifier, identifier);
  assert.equal(account.passkeyCount, 1);
  assert.equal(account.recoveryKeyAvailable, true);
  assert.equal(account.activeSessionCount, 1);

  const oldKey = await evaluate(
    "fetch('/api/account/recovery/options',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'}," +
    "body:JSON.stringify({accountIdentifier:" + JSON.stringify(identifier) +
    ",recoveryKey:" + JSON.stringify(firstKey) + "})}).then(async r=>({status:r.status,body:await r.json()}))"
  );
  assert.equal(oldKey.status, 401, "the consumed offline recovery key must no longer work.");

  const nextCredentials = await cdp("WebAuthn.getCredentials", { authenticatorId });
  assert.equal(nextCredentials.credentials.length, 1, "recovery must leave one replacement credential on the authenticator.");
  await trustedClick("#account-recovery-key-saved");
  await waitFor("replacement recovery key acknowledgement", () => evaluate("!document.getElementById('open-account-hub').disabled"));
  await trustedClick("#open-account-hub");
  await waitFor("User dashboard after recovery", () => evaluate("!document.getElementById('account-dashboard').hidden"));
  await trustedClick("#account-signout");
  await waitFor("recovered session revoked by sign-out", async () => !(await status()).authenticated);
  await trustedClick("#open-account-dialog");
  await waitFor("replacement passkey sign-in button", () => evaluate("Boolean(document.getElementById('account-passkey-signin'))"));
  await trustedClick("#account-passkey-signin");
  await waitFor("replacement passkey authenticates", () => evaluate("Boolean(document.getElementById('open-account-hub'))"), 45000);
  await trustedClick("#open-account-hub");
  await waitFor("final recovered User dashboard", () => evaluate("!document.getElementById('account-dashboard').hidden"));
  account = await status();
  assert.equal(account.authenticated, true);
  assert.equal(account.accountIdentifier, identifier);
  assert.equal(account.passkeyCount, 1);

  console.log("PASS: Chrome virtual-authenticator registration, discoverable sign-in, sign-out, passkey-loss simulation, offline recovery, previous-key rejection, recovery-key rotation and replacement-passkey sign-in.");
} catch (error) {
  console.error(String(error?.stack || error));
  if (browserOutput) console.error("Chrome output:\n" + browserOutput);
  process.exitCode = 1;
} finally {
  if (socket) try { socket.close(); } catch {}
  if (browser && browser.exitCode === null) browser.kill("SIGTERM");
  await sleep(250);
  rmSync(temp, { recursive: true, force: true });
}
