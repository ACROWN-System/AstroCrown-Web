import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createServer as createNetServer } from "node:net";

const chrome = process.env.CHROME_BIN;
if (!chrome) throw new Error("CHROME_BIN must name a preinstalled Chrome/Chromium binary.");
const prototypeDir = resolve("development/account-continuity/prototype");
const work = mkdtempSync(join(tmpdir(), "acrown-account-browser-"));
const [port, debugPort] = await freePorts(2);
const localUrl = "http://localhost:" + port + "/";
let server = null;
let browser = null;
let socket = null;
let requestId = 0;
let browserOutput = "";
const pending = new Map();

async function freePorts(count) {
  const servers = [];
  try {
    for (let i = 0; i < count; i++) {
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
async function waitFor(description, predicate, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = "";
  while (Date.now() < deadline) {
    try {
      const result = await predicate();
      if (result) return result;
    } catch (error) { lastError = String(error?.message || error); }
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
    }, 10000);
    pending.set(id, { resolve: resolvePromise, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await cdp("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || "Browser expression failed");
  return result.result?.value;
}
async function pageReady() {
  return await evaluate("document.readyState === 'complete' && Boolean(document.getElementById('open-account-dialog'))");
}

try {
  const env = { ...process.env, PYTHONDONTWRITEBYTECODE: "1" };
  server = spawn(process.env.PYTHON || "python", [
    "server.py", "--port", String(port), "--db", join(work, "browser-test.sqlite3")
  ], { cwd: prototypeDir, env, stdio: ["ignore", "ignore", "pipe"] });
  server.stderr.setEncoding("utf8");
  server.stderr.on("data", chunk => { browserOutput = (browserOutput + chunk).slice(-4000); });

  await waitFor("local account server", async () => {
    const response = await fetch(localUrl).catch(() => null);
    return response && response.ok;
  }, 12000);

  browser = spawn(chrome, [
    "--headless=new", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage",
    "--remote-debugging-port=" + debugPort, "--remote-allow-origins=*",
    "--user-data-dir=" + join(work, "profile"), "about:blank"
  ], { stdio: ["ignore", "ignore", "pipe"] });
  browser.stderr.setEncoding("utf8");
  browser.stderr.on("data", chunk => { browserOutput = (browserOutput + chunk).slice(-6000); });

  let target;
  await waitFor("Chrome DevTools target", async () => {
    try {
      const response = await fetch("http://127.0.0.1:" + debugPort + "/json");
      const targets = await response.json();
      target = targets.find(item => item.type === "page" && item.url === "about:blank");
      return target && target.webSocketDebuggerUrl;
    } catch { return false; }
  }, 20000);
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolvePromise, reject) => {
    const timer = setTimeout(() => reject(new Error("DevTools connection timed out")), 10000);
    socket.addEventListener("open", () => { clearTimeout(timer); resolvePromise(); }, { once: true });
    socket.addEventListener("error", () => { clearTimeout(timer); reject(new Error("DevTools connection failed")); }, { once: true });
  });
  socket.addEventListener("message", event => {
    let message;
    try { message = JSON.parse(String(event.data)); } catch { return; }
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
  await cdp("Page.navigate", { url: localUrl });
  await waitFor("homepage load", pageReady);
  assert.equal(await evaluate("Boolean(window.ethereum)"), false, "ordinary account test must not require a wallet");

  await evaluate("document.getElementById('open-account-dialog').click()");
  await waitFor("Account button opens sign-in dialog directly", () => evaluate("document.getElementById('account-dialog').open"));
  assert.match(await evaluate("document.body.innerText"), /A crypto wallet is not required/);
  await evaluate("document.querySelector('[data-account-mode=create]').click()");
  await waitFor("create-account form", () => evaluate("Boolean(document.getElementById('account-create-form'))"));

  const username = "e2euser" + Date.now().toString(16);
  const oldPassword = "AstroCrown-Local-Test-2026!";
  await evaluate("document.getElementById('account-username').value = " + JSON.stringify(username));
  await evaluate("document.getElementById('account-password').value = " + JSON.stringify(oldPassword));
  await evaluate("document.getElementById('account-confirm-password').value = " + JSON.stringify(oldPassword));
  await evaluate("document.getElementById('account-create-form').requestSubmit()");
  await waitFor("recovery codes after successful creation", () => evaluate("document.querySelectorAll('#recovery-code-list code').length === 8"));
  const oneTimeCode = await evaluate("document.querySelector('#recovery-code-list code').textContent");
  assert.match(oneTimeCode, /^[A-F0-9]{4}(-[A-F0-9]{4}){5}$/);
  await evaluate("document.getElementById('acknowledge-recovery').click()");
  await waitFor("signed-in account page", () => evaluate("document.getElementById('account-signout') && document.getElementById('manage-recovery')"));
  assert.equal(await evaluate("document.querySelector('.account-account-name').textContent"), username.toLowerCase());
  assert.match(await evaluate("document.body.innerText"), /Recovery codes enabled/);

  await evaluate("document.getElementById('account-signout').click()");
  await waitFor("signed-out login view", () => evaluate("Boolean(document.getElementById('account-signin-form'))"));
  await evaluate("document.getElementById('account-username').value = " + JSON.stringify(username));
  await evaluate("document.getElementById('account-password').value = " + JSON.stringify(oldPassword));
  await evaluate("document.getElementById('account-signin-form').requestSubmit()");
  await waitFor("successful sign-in", () => evaluate("Boolean(document.getElementById('account-signout'))"));
  assert.equal(await evaluate("document.querySelector('.account-account-name').textContent"), username.toLowerCase());

  await evaluate("document.getElementById('account-signout').click()");
  await waitFor("login form after second sign-out", () => evaluate("Boolean(document.getElementById('account-signin-form'))"));
  await evaluate("document.querySelector('[data-account-mode=recover]').click()");
  await waitFor("password recovery form", () => evaluate("Boolean(document.getElementById('account-recover-form'))"));
  const newPassword = "Replacement-Passphrase-2026!";
  await evaluate("document.getElementById('account-username').value = " + JSON.stringify(username));
  await evaluate("document.getElementById('recovery-code').value = " + JSON.stringify(oneTimeCode));
  await evaluate("document.getElementById('new-password').value = " + JSON.stringify(newPassword));
  await evaluate("document.getElementById('confirm-new-password').value = " + JSON.stringify(newPassword));
  await evaluate("document.getElementById('account-recover-form').requestSubmit()");
  await waitFor("return to sign in after recovery", () => evaluate("Boolean(document.getElementById('account-signin-form'))"));
  assert.match(await evaluate("document.getElementById('account-feedback').textContent"), /Password reset/);

  const reuseExpression = "fetch('/api/account/recover', {method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:" +
    JSON.stringify(username) + ",recoveryCode:" + JSON.stringify(oneTimeCode) +
    ",newPassword:'Another-Recovery-Passphrase-2026!'})}).then(r=>r.status)";
  const reused = await evaluate(reuseExpression);
  assert.equal(reused, 401, "recovery codes must be single-use");
  await evaluate("document.getElementById('account-username').value = " + JSON.stringify(username));
  await evaluate("document.getElementById('account-password').value = " + JSON.stringify(newPassword));
  await evaluate("document.getElementById('account-signin-form').requestSubmit()");
  await waitFor("sign-in with recovered password", () => evaluate("Boolean(document.getElementById('account-signout'))"));
  assert.equal(await evaluate("document.querySelector('.account-account-name').textContent"), username.toLowerCase());

  console.log("PASS: Account button, local registration, recovery-code setup, sign-out, sign-in, password reset, single-use code enforcement and restored login.");
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