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
    if (!response) return false;
    // Drain every Node/Undici response before the polling loop retries. An
    // unconsumed HTML body can leave the parser/socket active during teardown.
    await response.arrayBuffer();
    return response.ok;
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

  const assuranceResult = await evaluate("fetch('/account-continuity/prototype/security-assurance.html').then(async function (response) { return [response.status, await response.text()]; })");
  assert.equal(assuranceResult[0], 200, "security assurance page must be served by the local prototype");
  assert.match(assuranceResult[1], /Development prototype only/);
  assert.match(assuranceResult[1], /Not implemented/);

  await evaluate("document.getElementById('open-account-dialog').click()");
  await waitFor("Account button opens sign-in dialog directly", () => evaluate("document.getElementById('account-dialog').open"));
  assert.match(await evaluate("document.body.innerText"), /A crypto wallet is not required/);
  assert.equal(
    await evaluate("document.getElementById('account-content').firstElementChild.classList.contains('account-tabs')"),
    true,
    "Log In / Sign Up tabs must be the first account-content row"
  );
  assert.equal(await evaluate("Boolean(document.querySelector('.account-dialog-kicker'))"), false,
    "the redundant AstroCrown account-access kicker must be absent");
  assert.equal(await evaluate("document.querySelectorAll('.account-provider-placeholder').length"), 3);
  assert.equal(await evaluate("document.querySelector('.account-or-divider').tagName"), "DIV",
    "Or divider must be static, not a clickable control");
  assert.equal(await evaluate("document.querySelectorAll('.account-or-divider-line').length"), 2,
    "there must be exactly one line segment on each side of Or");
  assert.ok(await evaluate("Math.abs((document.querySelector('.account-or-divider-label').getBoundingClientRect().left + document.querySelector('.account-or-divider-label').getBoundingClientRect().right) / 2 - (document.querySelector('.account-or-divider-line-row').getBoundingClientRect().left + document.querySelector('.account-or-divider-line-row').getBoundingClientRect().right) / 2) <= 1"),
    "Or must be centered across the divider row");
  assert.ok(await evaluate("Math.abs((document.querySelector('.account-or-divider-arrow').getBoundingClientRect().left + document.querySelector('.account-or-divider-arrow').getBoundingClientRect().right) / 2 - (document.querySelector('.account-or-divider-label').getBoundingClientRect().left + document.querySelector('.account-or-divider-label').getBoundingClientRect().right) / 2) <= 1"),
    "downward arrowhead must share the Or label center");
  assert.ok(await evaluate("Array.from(document.querySelectorAll('.account-or-divider-line')).every(function (line) { var image = getComputedStyle(line).backgroundImage; return image.indexOf('linear-gradient') === 0 && image.indexOf('repeating-linear-gradient') === -1; })"),
    "both sides of Or must be continuous gold lines, tapered only at the outer ends");
  assert.equal(await evaluate("Boolean(document.querySelector('.account-or-divider button, .account-or-divider a, #account-other-options'))"), false);
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.account-or-divider')).pointerEvents"), "none");
  assert.ok(await evaluate("Array.from(document.querySelectorAll('.account-or-divider-line')).every(function (line) { var image = getComputedStyle(line).backgroundImage; return image.indexOf('repeating-linear-gradient') === -1 && image.indexOf('linear-gradient') === 0; })"),
    "Or divider side segments must render as solid continuous lines, not dotted or dashed");
  assert.equal(await evaluate(
    "document.querySelector('.account-or-divider-arrow').getBoundingClientRect().top > document.querySelector('.account-or-divider-label').getBoundingClientRect().bottom"
  ), true, "downward arrowhead must sit below Or");
  assert.equal(await evaluate("document.querySelector('.account-provider-placeholders').querySelectorAll('button,a,input').length"), 0,
    "future provider logo slots must not behave like fake provider buttons");
  await evaluate("document.querySelector('[data-account-mode=create]').click()");
  await waitFor("create-account form", () => evaluate("Boolean(document.getElementById('account-create-form'))"));
  await evaluate("window.__walletPromptCount = 0; window.ethereum = { request: async function (request) { window.__walletPromptCount += 1; if (request.method === 'eth_requestAccounts') return ['0x1111111111111111111111111111111111111111']; throw new Error('unexpected wallet call: ' + request.method); } };");

  const email = "e2euser" + Date.now().toString(16) + "@example.test";
  const password = "AstroCrown-Local-Test-2026!";
  await evaluate("document.getElementById('account-email').value = " + JSON.stringify(email));
  await evaluate("document.getElementById('account-password').value = " + JSON.stringify(password));
  await evaluate("document.getElementById('account-referral-id').value = 'ACROWN_E2E_7'");
  await evaluate("document.getElementById('account-newsletter-opt-in').checked = true");
  await evaluate("document.getElementById('account-terms-accepted').checked = true");
  await evaluate("document.getElementById('account-create-form').requestSubmit()");
  await waitFor("account-created success popup", () => evaluate("Boolean(document.getElementById('open-account-hub'))"));
  assert.equal(await evaluate("document.getElementById('open-account-dialog').classList.contains('is-authenticated')"), true);
  assert.equal(await evaluate("document.getElementById('open-account-dialog').querySelectorAll('span').length"), 0,
    "signed-in header control must become a circular icon without the Account text");
  assert.match(await evaluate("document.body.innerText"), /no email or newsletter message was sent/i);
  await evaluate("document.getElementById('open-account-hub').click()");
  await waitFor("user account dashboard after signup", () => evaluate("!document.getElementById('account-dashboard').hidden && Boolean(document.getElementById('account-signout'))"));
  assert.equal(await evaluate("document.querySelector('.account-dashboard-welcome-copy strong').textContent"), email.toLowerCase());
  assert.match(await evaluate("document.body.innerText"), /Email not verified/i);
  assert.match(await evaluate("document.body.innerText"), /Password reset|password reset/);
  assert.doesNotMatch(await evaluate("document.body.innerText"), /recovery codes/i);
  assert.ok(await evaluate("Boolean(document.querySelector('.account-dashboard-card a[href*=' + JSON.stringify('security-assurance.html') + ']'))"),
    "dashboard must link to the separate security assurance page");
  assert.equal(await evaluate("Boolean(document.querySelector('.account-admin-access-card'))"), false,
    "ordinary accounts must not see an administrator access card");
  await evaluate("window.location.hash = 'admin'");
  await waitFor("direct admin route blocked for ordinary user", () => evaluate("document.getElementById('admin-dashboard').hidden && window.location.hash === '#account'"));
  assert.equal(await evaluate("window.__walletPromptCount"), 0,
    "a direct admin-route attempt must not prompt for a wallet");
  assert.equal(await evaluate("Boolean(document.querySelector('.account-admin-access-card'))"), false);

  // Simulate the server returning an already-assigned admin role to verify the
  // role-gated UI and first confirmation popup without granting real privileges.
  // Continue is deliberately not pressed, so no wallet connection/signature runs.
  await evaluate("window.__pretendAdminRole = true; window.__nativeFetchForRoleTest = window.fetch.bind(window); window.fetch = async function(input, init) { var response = await window.__nativeFetchForRoleTest(input, init); var url = typeof input === 'string' ? input : (input && input.url) || ''; if (window.__pretendAdminRole && url.indexOf('/api/account/status') >= 0) { var payload = await response.clone().json(); if (payload.authenticated === true) { payload.role = 'admin'; payload.adminRoleAssigned = true; payload.adminWalletCount = 1; payload.adminWalletAuthenticated = false; payload.adminSessionAuthorized = false; payload.admin = false; } return new Response(JSON.stringify(payload), {status: response.status, headers: {'Content-Type': 'application/json', 'Cache-Control': 'no-store'}}); } return response; }; window.location.hash = 'top';");
  await waitFor("homepage before simulated admin role view", () => evaluate("document.getElementById('account-dashboard').hidden && window.location.hash === '#top'"));
  await evaluate("window.location.hash = 'account'");
  await waitFor("administrator role card appears for a server-reported admin account", () => evaluate("!document.getElementById('account-dashboard').hidden && Boolean(document.querySelector('.account-admin-access-card')) && Boolean(document.getElementById('account-admin-wallet-access'))"));
  assert.equal(await evaluate("document.getElementById('account-admin-wallet-access').textContent.trim()"), "Access administrator account");
  await evaluate("document.getElementById('account-admin-wallet-access').click()");
  await waitFor("administrator access confirmation popup", () => evaluate("Boolean(document.getElementById('admin-access-dialog') && document.getElementById('admin-access-dialog').open"));
  assert.match(await evaluate("document.getElementById('admin-access-dialog').innerText"), /administrator role.*server|server.*administrator role/i);
  assert.match(await evaluate("document.getElementById('admin-access-dialog').innerText"), /signature does not authorize a blockchain transaction/i);
  assert.equal(await evaluate("window.__walletPromptCount"), 0,
    "opening the administrator popup must not itself request a wallet");
  await evaluate("document.getElementById('admin-access-cancel').click()");
  await waitFor("administrator access popup cancels cleanly", () => evaluate("!document.getElementById('admin-access-dialog').open"));
  assert.equal(await evaluate("window.__walletPromptCount"), 0,
    "cancelling the administrator popup must not request a wallet");
  await evaluate("window.__pretendAdminRole = false; window.location.hash = 'top';");
  await waitFor("return to homepage after role-visibility test", () => evaluate("document.getElementById('account-dashboard').hidden && window.location.hash === '#top'"));
  await evaluate("window.location.hash = 'account'");
  await waitFor("revoked role disappears from account dashboard", () => evaluate("!document.getElementById('account-dashboard').hidden && !document.querySelector('.account-admin-access-card')"));
  await evaluate("window.fetch = window.__nativeFetchForRoleTest; delete window.__nativeFetchForRoleTest; delete window.__pretendAdminRole;");
  assert.equal(await evaluate("window.__walletPromptCount"), 0);

  const storedAccount = await evaluate("fetch('/api/account/status').then(r => r.json())");
  assert.equal(storedAccount.email, email.toLowerCase());
  assert.equal(storedAccount.avatarId, "person", "new accounts start with the built-in default avatar");
  await evaluate("document.querySelector('#account-avatar-picker [data-avatar-id=star]').click()");
  await waitFor("locally persisted avatar choice", () => evaluate("document.querySelector('#account-avatar-picker [data-avatar-id=star]').getAttribute('aria-pressed') === 'true'"));
  const avatarAfterUpdate = await evaluate("fetch('/api/account/status').then(r => r.json())");
  assert.equal(avatarAfterUpdate.avatarId, "star");
  assert.equal(await evaluate("document.getElementById('open-account-dialog').getAttribute('data-avatar-id')"), "star");
  const invalidAvatar = await evaluate("fetch('/api/account/avatar', {method:'POST', credentials:'same-origin', headers:{'Content-Type':'application/json'}, body:JSON.stringify({avatarId:'<svg onload=alert(1)>'})}).then(async r => [r.status, await r.json()])");
  assert.equal(invalidAvatar[0], 400, "arbitrary avatar markup must not be accepted");
  assert.equal(avatarAfterUpdate.role, "user");
  assert.equal(avatarAfterUpdate.admin, false);
  assert.equal(storedAccount.referralId, "ACROWN_E2E_7");
  assert.equal(storedAccount.newsletterOptIn, true);
  assert.ok(storedAccount.newsletterConsentAt);
  assert.equal(storedAccount.termsAccepted, true);
  assert.match(storedAccount.termsVersion, /development-draft/);
  assert.equal(storedAccount.emailVerified, false);

  await evaluate("document.getElementById('account-signout').click()");
  await waitFor("home after sign-out", () => evaluate("document.getElementById('account-dashboard').hidden && !document.getElementById('open-account-dialog').classList.contains('is-authenticated')"));
  await evaluate("document.getElementById('open-account-dialog').click()");
  await waitFor("signed-out Log In view", () => evaluate("Boolean(document.getElementById('account-signin-form'))"));
  await evaluate("document.getElementById('account-email').value = " + JSON.stringify(email));
  await evaluate("document.getElementById('account-password').value = " + JSON.stringify(password));
  await evaluate("document.getElementById('account-signin-form').requestSubmit()");
  await waitFor("successful email sign-in", () => evaluate("Boolean(document.getElementById('open-account-hub'))"));
  await evaluate("document.getElementById('account-dialog-close').click()");
  await waitFor("closing success popup without signing out", () => evaluate("!document.getElementById('account-dialog').open"));
  assert.equal(await evaluate("document.getElementById('open-account-dialog').classList.contains('is-authenticated')"), true,
    "closing the success popup must retain the authenticated test state");
  assert.equal(await evaluate("document.getElementById('main-content').hidden"), false,
    "closing the success popup must leave the user on the homepage");
  await evaluate("document.getElementById('open-account-dialog').click()");
  await waitFor("account dashboard after reopening signed-in avatar", () => evaluate("!document.getElementById('account-dashboard').hidden && Boolean(document.getElementById('account-signout'))"));
  assert.equal(await evaluate("document.querySelector('.account-dashboard-welcome-copy strong').textContent"), email.toLowerCase());
  const avatarAfterRelogin = await evaluate("fetch('/api/account/status').then(r => r.json())");
  assert.equal(avatarAfterRelogin.avatarId, "star", "local server should retain the selected avatar after sign-out/sign-in");
  assert.equal(await evaluate("document.getElementById('open-account-dialog').getAttribute('data-avatar-id')"), "star");

  await evaluate("document.getElementById('account-signout').click()");
  await waitFor("home after second sign-out", () => evaluate("document.getElementById('account-dashboard').hidden && !document.getElementById('open-account-dialog').classList.contains('is-authenticated')"));
  await evaluate("document.getElementById('open-account-dialog').click()");
  await waitFor("Log In view after second sign-out", () => evaluate("Boolean(document.getElementById('account-signin-form'))"));
  await evaluate("document.querySelector('[data-account-mode=recover]').click()");
  await waitFor("password-reset information form", () => evaluate("Boolean(document.getElementById('account-reset-request-form'))"));
  await evaluate("document.getElementById('account-email').value = " + JSON.stringify(email));
  await evaluate("document.getElementById('account-reset-request-form').requestSubmit()");
  assert.match(await evaluate("document.getElementById('account-feedback').textContent"), /No email was sent/);

  // Exercise the hosted preview path without allowing any account API request.
  // The query flag selects the same in-memory adapter that activates on remote hosts.
  const previewUrl = localUrl + "?account-preview-demo=1";
  await cdp("Page.navigate", { url: previewUrl });
  await waitFor("browser-preview demo homepage", pageReady);
  await evaluate("window.fetch = function () { return Promise.reject(new Error('Network calls are forbidden in the browser-preview test')); };");
  await evaluate("document.getElementById('open-account-dialog').click()");
  await waitFor("browser-preview Account dialog", () => evaluate("document.getElementById('account-dialog').open"));
  assert.equal(await evaluate("document.getElementById('account-demo-notice').dataset.mode"), "browser-preview-demo");
  assert.match(await evaluate("document.getElementById('account-demo-notice').textContent"), /disappear on reload/);
  assert.equal(await evaluate("document.getElementById('account-content').firstElementChild.classList.contains('account-tabs')"), true);
  assert.equal(await evaluate("document.querySelectorAll('.account-provider-placeholder').length"), 3);
  assert.equal(await evaluate("Boolean(document.querySelector('.account-dialog-kicker'))"), false);
  assert.equal(await evaluate("document.querySelector('.account-or-divider').tagName"), "DIV");
  assert.equal(await evaluate("document.querySelectorAll('.account-or-divider-line').length"), 2);
  assert.ok(await evaluate("Math.abs((document.querySelector('.account-or-divider-label').getBoundingClientRect().left + document.querySelector('.account-or-divider-label').getBoundingClientRect().right) / 2 - (document.querySelector('.account-or-divider-line-row').getBoundingClientRect().left + document.querySelector('.account-or-divider-line-row').getBoundingClientRect().right) / 2) <= 1"),
    "Or must be centered in browser-preview mode");
  assert.equal(await evaluate("Boolean(document.querySelector('.account-or-divider button, .account-or-divider a, #account-other-options'))"), false);
  await evaluate("document.querySelector('[data-account-mode=create]').click()");
  await waitFor("browser-preview create form", () => evaluate("Boolean(document.getElementById('account-create-form'))"));
  await evaluate("window.__walletPromptCount = 0; window.ethereum = { request: async function (request) { window.__walletPromptCount += 1; if (request.method === 'eth_requestAccounts') return ['0x1111111111111111111111111111111111111111']; throw new Error('unexpected wallet call: ' + request.method); } };");

  const demoEmail = "browserdemo" + Date.now().toString(16) + "@example.test";
  const demoPassword = "AstroCrown-Browser-Demo-2026!";
  await evaluate("document.getElementById('account-email').value = " + JSON.stringify(demoEmail));
  await evaluate("document.getElementById('account-password').value = " + JSON.stringify(demoPassword));
  await evaluate("document.getElementById('account-referral-id').value = 'PREVIEW_22'");
  await evaluate("document.getElementById('account-newsletter-opt-in').checked = true");
  await evaluate("document.getElementById('account-terms-accepted').checked = true");
  await evaluate("document.getElementById('account-create-form').requestSubmit()");
  await waitFor("browser-preview account-created success popup", () => evaluate("Boolean(document.getElementById('open-account-hub'))"), 30000);
  assert.match(await evaluate("document.body.innerText"), /no email or newsletter message was sent/i);
  await evaluate("document.getElementById('open-account-hub').click()");
  await waitFor("browser-preview account dashboard", () => evaluate("!document.getElementById('account-dashboard').hidden && Boolean(document.getElementById('account-signout'))"));
  assert.equal(await evaluate("document.querySelector('.account-dashboard-welcome-copy strong').textContent"), demoEmail.toLowerCase());
  assert.equal(await evaluate("document.querySelector('#account-avatar-picker [data-avatar-id=person]').getAttribute('aria-pressed')"), "true");
  await evaluate("document.querySelector('#account-avatar-picker [data-avatar-id=moon]').click()");
  await waitFor("browser-preview avatar choice", () => evaluate("document.querySelector('#account-avatar-picker [data-avatar-id=moon]').getAttribute('aria-pressed') === 'true'"));
  assert.equal(await evaluate("document.getElementById('open-account-dialog').getAttribute('data-avatar-id')"), "moon");
  assert.match(await evaluate("document.body.innerText"), /Crypto-news email: Opted in for this test/i);
  assert.doesNotMatch(await evaluate("document.body.innerText"), /recovery codes/i);
  assert.equal(await evaluate("Boolean(document.querySelector('.account-admin-access-card'))"), false);
  await evaluate("window.location.hash = 'admin'");
  await waitFor("browser-preview direct admin route stays closed", () => evaluate("document.getElementById('admin-dashboard').hidden && window.location.hash === '#account'"));
  assert.equal(await evaluate("window.__walletPromptCount"), 0,
    "ordinary browser-preview access must not prompt for a wallet");

  await evaluate("document.getElementById('account-signout').click()");
  await waitFor("browser-preview home after sign-out", () => evaluate("document.getElementById('account-dashboard').hidden && !document.getElementById('open-account-dialog').classList.contains('is-authenticated')"));
  await evaluate("document.getElementById('open-account-dialog').click()");
  await waitFor("browser-preview Log In view", () => evaluate("Boolean(document.getElementById('account-signin-form'))"));
  await evaluate("document.getElementById('account-email').value = " + JSON.stringify(demoEmail));
  await evaluate("document.getElementById('account-password').value = " + JSON.stringify(demoPassword));
  await evaluate("document.getElementById('account-signin-form').requestSubmit()");
  await waitFor("browser-preview sign-in success popup", () => evaluate("Boolean(document.getElementById('open-account-hub'))"), 20000);
  await evaluate("document.getElementById('open-account-hub').click()");
  await waitFor("browser-preview dashboard after sign-in", () => evaluate("!document.getElementById('account-dashboard').hidden && Boolean(document.getElementById('account-signout'))"));
  assert.equal(await evaluate("document.querySelector('.account-dashboard-welcome-copy strong').textContent"), demoEmail.toLowerCase());
  const previewAvatarAfterRelogin = await evaluate("document.getElementById('open-account-dialog').getAttribute('data-avatar-id')");
  assert.equal(previewAvatarAfterRelogin, "moon", "same-page demo should retain the chosen avatar until reload");

  await evaluate("document.getElementById('account-signout').click()");
  await waitFor("browser-preview home after second sign-out", () => evaluate("document.getElementById('account-dashboard').hidden && !document.getElementById('open-account-dialog').classList.contains('is-authenticated')"));
  await evaluate("document.getElementById('open-account-dialog').click()");
  await waitFor("browser-preview signed out", () => evaluate("Boolean(document.getElementById('account-signin-form'))"));
  await evaluate("document.querySelector('[data-account-mode=recover]').click()");
  await waitFor("browser-preview password-reset form", () => evaluate("Boolean(document.getElementById('account-reset-request-form'))"));
  await evaluate("document.getElementById('account-email').value = " + JSON.stringify(demoEmail));
  await evaluate("document.getElementById('account-reset-request-form').requestSubmit()");
  assert.match(await evaluate("document.getElementById('account-feedback').textContent"), /No email was sent/);

  // The hosted preview has no backend or persistence. Reloading loses the test account.
  await cdp("Page.navigate", { url: previewUrl });
  await waitFor("reloaded browser-preview homepage", pageReady);
  await evaluate("document.getElementById('open-account-dialog').click()");
  await waitFor("reloaded Account dialog", () => evaluate("document.getElementById('account-dialog').open"));
  await evaluate("document.querySelector('[data-account-mode=create]').click()");
  await waitFor("reloaded Sign Up form", () => evaluate("Boolean(document.getElementById('account-create-form'))"));
  await evaluate("document.getElementById('account-email').value = " + JSON.stringify(demoEmail));
  await evaluate("document.getElementById('account-password').value = " + JSON.stringify(demoPassword));
  await evaluate("document.getElementById('account-terms-accepted').checked = true");
  await evaluate("document.getElementById('account-create-form').requestSubmit()");
  await waitFor("same email can be used after page reload", () => evaluate("Boolean(document.getElementById('open-account-hub'))"), 30000);
  await evaluate("document.getElementById('open-account-hub').click()");
  await waitFor("recreated browser-preview account dashboard", () => evaluate("!document.getElementById('account-dashboard').hidden && Boolean(document.getElementById('account-signout'))"));
  assert.equal(await evaluate("document.querySelector('.account-dashboard-welcome-copy strong').textContent"), demoEmail.toLowerCase());
  assert.equal(await evaluate("document.getElementById('open-account-dialog').getAttribute('data-avatar-id')"), "person",
    "the reloaded memory-only preview creates a new disposable account with the default avatar");

  console.log("PASS: email signup/login, success popup, built-in avatar selection and validation, avatar persistence in local account state, circular header control, account dashboard, separate security assurance page, referral/consent handling, reset disclosure, local role boundary and memory-only browser preview.");

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