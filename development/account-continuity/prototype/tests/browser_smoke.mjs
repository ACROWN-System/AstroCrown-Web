import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
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
const databasePath = join(work, "browser-test.sqlite3");
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
    "server.py", "--port", String(port), "--db", databasePath
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
  const emailActionResult = await evaluate("fetch('/account-continuity/prototype/email-action.html').then(async function (response) { return [response.status, await response.text()]; })");
  assert.equal(emailActionResult[0], 200, "email action landing page must be served locally");
  assert.match(emailActionResult[1], /email-action-reset-form/);
  assert.match(emailActionResult[1], /no-referrer/);
  const emailActionScript = await evaluate("fetch('/account-continuity/prototype/email-action.js').then(async function (response) { return [response.status, await response.text()]; })");
  assert.equal(emailActionScript[0], 200, "email action client must be served locally");
  assert.match(emailActionScript[1], /history\.replaceState/);
  assert.match(emailActionScript[1], /password\/reset\/complete/);
  await cdp("Page.navigate", {
    url: localUrl + "account-continuity/prototype/email-action.html?type=verify&token=BrowserPreviewVerificationToken-1234567890"
  });
  await waitFor("verification landing page requires explicit confirmation", () =>
    evaluate("Boolean(document.getElementById('email-action-verify-form')) && !document.getElementById('email-action-verify-form').hidden"));
  assert.equal(await evaluate("window.location.search"), "",
    "the one-time token must be removed from the address bar");
  assert.match(await evaluate("document.getElementById('email-action-status').textContent"), /Press Verify email address/,
    "opening the link must not consume the token or verify the address automatically");
  await evaluate("window.__emailActionRequest = null; window.fetch = async function (path, init) { window.__emailActionRequest = {path:path, body:JSON.parse(init.body)}; return new Response(JSON.stringify({verified:true, message:'Your email address has been verified.'}), {status:200, headers:{'Content-Type':'application/json'}}); };");
  await evaluate("document.getElementById('email-action-verify-form').requestSubmit()");
  await waitFor("explicit email verification succeeds in the browser action page", () =>
    evaluate("document.getElementById('email-action-status').textContent.includes('verified')"));
  const verificationRequest = await evaluate("window.__emailActionRequest");
  assert.equal(verificationRequest.path, "/api/account/email/verify");
  assert.equal(verificationRequest.body.token, "BrowserPreviewVerificationToken-1234567890",
    "the verification token stays in page memory until the user confirms");
  assert.equal(await evaluate("document.getElementById('email-action-verify-form').hidden"), true);

  const browserResetToken = "BrowserPreviewResetToken-1234567890";
  await cdp("Page.navigate", {
    url: localUrl + "account-continuity/prototype/email-action.html?type=reset&token=" + browserResetToken
  });
  await waitFor("password-reset action page loads", () =>
    evaluate("Boolean(document.getElementById('email-action-reset-form')) && !document.getElementById('email-action-reset-form').hidden"));
  assert.equal(await evaluate("window.location.search"), "",
    "password-reset tokens must also be removed from the address bar");
  await evaluate("window.__emailActionRequest = null; window.fetch = async function (path, init) { window.__emailActionRequest = {path:path, body:JSON.parse(init.body)}; return new Response(JSON.stringify({passwordReset:true, message:'Your password has been reset. Sign in with your new password.'}), {status:200, headers:{'Content-Type':'application/json'}}); };");
  const browserResetPassword = "AstroCrown-Browser-Reset-Password-2026!";
  await evaluate("document.getElementById('email-action-new-password').value = " + JSON.stringify(browserResetPassword));
  await evaluate("document.getElementById('email-action-confirm-password').value = 'Not-the-same-password-2026!'; document.getElementById('email-action-reset-form').requestSubmit()");
  await waitFor("mismatched reset confirmation is rejected locally", () =>
    evaluate("document.getElementById('email-action-status').textContent.includes('does not match')"));
  assert.equal(await evaluate("window.__emailActionRequest"), null,
    "a mismatched confirmation must not be submitted to the server");
  await evaluate("document.getElementById('email-action-confirm-password').value = " + JSON.stringify(browserResetPassword) + "; document.querySelector('[data-password-toggle=email-action-new-password]').click()");
  assert.equal(await evaluate("document.getElementById('email-action-new-password').type"), "text");
  assert.equal(await evaluate("document.querySelector('[data-password-toggle=email-action-new-password]').getAttribute('aria-pressed')"), "true");
  await evaluate("document.querySelector('[data-password-toggle=email-action-new-password]').click()");
  assert.equal(await evaluate("document.getElementById('email-action-new-password').type"), "password");
  await evaluate("document.getElementById('email-action-reset-form').requestSubmit()");
  await waitFor("password reset completes in the browser action page", () =>
    evaluate("document.getElementById('email-action-status').textContent.includes('Sign in with your new password')"));
  const passwordResetRequest = await evaluate("window.__emailActionRequest");
  assert.equal(passwordResetRequest.path, "/api/account/password/reset/complete");
  assert.equal(passwordResetRequest.body.token, browserResetToken);
  assert.equal(passwordResetRequest.body.newPassword, browserResetPassword);
  assert.equal(passwordResetRequest.body.newPasswordConfirmation, browserResetPassword);
  assert.equal(await evaluate("document.getElementById('email-action-reset-form').hidden"), true);

  await cdp("Page.navigate", { url: localUrl });
  await waitFor("homepage restored after email-action check", pageReady);

  await evaluate("document.getElementById('open-account-dialog').click()");
  await waitFor("Account button opens sign-in dialog directly", () => evaluate("document.getElementById('account-dialog').open"));
  assert.match(await evaluate("document.body.innerText"), /A crypto wallet is not required/);
  assert.equal(await evaluate("document.getElementById('account-password').type"), "password");
  await evaluate("document.getElementById('account-password').value = 'Visibility-Test-Password'; document.querySelector('[data-password-toggle=account-password]').click()");
  assert.equal(await evaluate("document.getElementById('account-password').type"), "text",
    "the sign-in password visibility control should reveal the entered value");
  assert.equal(await evaluate("document.querySelector('[data-password-toggle=account-password]').getAttribute('aria-pressed')"), "true");
  assert.equal(await evaluate("document.querySelector('[data-password-toggle=account-password]').getAttribute('aria-label')"), "Hide password");
  await evaluate("document.querySelector('[data-password-toggle=account-password]').click()");
  assert.equal(await evaluate("document.getElementById('account-password').type"), "password",
    "the sign-in password visibility control should hide the entered value again");
  assert.equal(await evaluate("document.querySelector('[data-password-toggle=account-password]').getAttribute('aria-pressed')"), "false");
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
  await evaluate("document.getElementById('account-password').value = 'Signup-Visibility-Test'; document.querySelector('[data-password-toggle=account-password]').click()");
  assert.equal(await evaluate("document.getElementById('account-password').type"), "text",
    "the sign-up password visibility control should reveal the entered value");
  await evaluate("document.querySelector('[data-password-toggle=account-password]').click()");
  assert.equal(await evaluate("document.getElementById('account-password').type"), "password",
    "the sign-up password visibility control should hide the entered value again");
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
  assert.match(await evaluate("document.body.innerText"), /no verification or newsletter message was sent/i);
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

  // Provision this same ordinary test account through the shipped owner-only CLI.
  // This exercises the real SQLite role change rather than inventing an admin API response.
  const adminWallet = "0x1111111111111111111111111111111111111111";
  const grantResult = spawnSync(process.env.PYTHON || "python", [
    join(prototypeDir, "provision_admin.py"),
    "--db", databasePath,
    "--actor", "local-browser-smoke-owner",
    "grant",
    "--email", email,
    "--wallet", adminWallet,
    "--chain-id", "1",
    "--reason", "Owner-approved local browser smoke admin provisioning",
    "--confirm", "GRANT LOCAL ADMIN"
  ], {
    cwd: resolve("."),
    encoding: "utf8",
    timeout: 15000,
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" }
  });
  assert.equal(grantResult.error, undefined, "owner provisioning CLI must start: " + String(grantResult.error || ""));
  assert.equal(grantResult.status, 0,
    "owner provisioning CLI must succeed. stdout=" + grantResult.stdout + " stderr=" + grantResult.stderr);
  assert.match(grantResult.stdout, /Development-only administrator provisioning completed\./);
  assert.match(grantResult.stdout, /A fresh signature from this registered wallet is still required/);

  // A refreshed server status must now identify this existing account as admin.
  await evaluate("window.location.hash = 'top';");
  await waitFor("homepage before checking real administrator role", () => evaluate("document.getElementById('account-dashboard').hidden && window.location.hash === '#top'"));
  await evaluate("window.location.hash = 'account'");
  await waitFor("owner-provisioned administrator entry appears from real account status", () => evaluate("!document.getElementById('account-dashboard').hidden && Boolean(document.querySelector('.account-admin-access-card')) && Boolean(document.getElementById('account-admin-wallet-access'))"));
  const provisionedStatus = await evaluate("fetch('/api/account/status').then(function (response) { return response.json(); })");
  assert.equal(provisionedStatus.role, "admin");
  assert.equal(provisionedStatus.adminRoleAssigned, true);
  assert.equal(provisionedStatus.adminWalletCount, 1);
  assert.equal(provisionedStatus.adminSessionAuthorized, false,
    "role assignment and wallet enrollment alone must not open the administrator dashboard");
  assert.equal(await evaluate("document.getElementById('account-admin-wallet-access').textContent.trim()"), "Open administrator dashboard");
  assert.match(await evaluate("document.body.innerText"), /Wallet verification required/);
  await evaluate("document.getElementById('account-admin-wallet-access').click()");
  await waitFor("administrator access confirmation popup", () => evaluate("Boolean(document.getElementById('admin-access-dialog') && document.getElementById('admin-access-dialog').open)"));
  assert.match(await evaluate("document.getElementById('admin-access-dialog').innerText"), /administrator role.*server|server.*administrator role/i);
  assert.match(await evaluate("document.getElementById('admin-access-dialog').innerText"), /signature does not authorize a blockchain transaction/i);
  assert.equal(await evaluate("window.__walletPromptCount"), 0,
    "opening the administrator popup must not itself request a wallet");
  await evaluate("document.getElementById('admin-access-cancel').click()");
  await waitFor("administrator access popup cancels cleanly", () => evaluate("!document.getElementById('admin-access-dialog').open"));
  assert.equal(await evaluate("window.__walletPromptCount"), 0,
    "cancelling the administrator popup must not request a wallet");

  // A direct #admin route remains blocked without a wallet signature, even though
  // the database has assigned the admin role and enrolled its public address.
  await evaluate("window.location.hash = 'admin'");
  await waitFor("admin dashboard stays closed before wallet proof", () =>
    evaluate("document.getElementById('admin-dashboard').hidden && window.location.hash === '#account'"));
  assert.equal(await evaluate("window.__walletPromptCount"), 0,
    "direct navigation must not trigger a wallet connection");

  // Mock only a previously verified step-up response to cover the separate admin
  // dashboard presentation. The role and wallet registry remain real SQLite data.
  await evaluate("window.__pretendAdminAuthorized = true; window.__nativeFetchForStepUpTest = window.fetch.bind(window); window.fetch = async function(input, init) { var url = typeof input === 'string' ? input : (input && input.url) || ''; if (window.__pretendAdminAuthorized && url.indexOf('/api/admin/status') >= 0) { return new Response(JSON.stringify({authenticated:true, role:'admin', adminRoleAssigned:true, adminSessionAuthorized:true, admin:true, email:" + JSON.stringify(email.toLowerCase()) + ", avatarId:'person', adminWalletAddress:" + JSON.stringify(adminWallet) + ", adminSessionExpiresAt:'test fixture only'}), {status:200, headers:{'Content-Type':'application/json', 'Cache-Control':'no-store'}}); } if (window.__pretendAdminAuthorized && url.indexOf('/api/admin/wallet-options') >= 0) { return new Response(JSON.stringify({wallets:[{address:" + JSON.stringify(adminWallet) + ", chainId:1}]}), {status:200, headers:{'Content-Type':'application/json', 'Cache-Control':'no-store'}}); } return window.__nativeFetchForStepUpTest(input, init); };");
  await evaluate("document.getElementById('account-admin-wallet-access').click()");
  await waitFor("administrator entry confirmation reopens", () => evaluate("Boolean(document.getElementById('admin-access-dialog') && document.getElementById('admin-access-dialog').open)"));
  await evaluate("document.getElementById('admin-access-continue').click()");
  await waitFor("same entry opens the separate administrator dashboard", () => evaluate("window.location.hash === '#admin' && document.getElementById('account-dashboard').hidden && !document.getElementById('admin-dashboard').hidden && document.getElementById('admin-dashboard-title').textContent.trim() === 'Administrator dashboard'"));
  assert.equal(await evaluate("document.getElementById('admin-return-account').textContent.trim()"), "Return to your account");
  assert.equal(await evaluate("window.__walletPromptCount"), 0,
    "the verified-step-up fixture must not request a second wallet connection");
  await evaluate("document.getElementById('admin-return-account').click()");
  await waitFor("administrator returns to the separate regular account dashboard", () => evaluate("window.location.hash === '#account' && !document.getElementById('account-dashboard').hidden && document.getElementById('admin-dashboard').hidden"));
  assert.equal(await evaluate("document.getElementById('account-admin-wallet-access').textContent.trim()"), "Open administrator dashboard");

  await evaluate("window.fetch = window.__nativeFetchForStepUpTest; delete window.__nativeFetchForStepUpTest; delete window.__pretendAdminAuthorized;");

  // Revoke through the same owner CLI and prove the UI removes the entry on refresh.
  const revokeResult = spawnSync(process.env.PYTHON || "python", [
    join(prototypeDir, "provision_admin.py"),
    "--db", databasePath,
    "--actor", "local-browser-smoke-owner",
    "revoke",
    "--email", email,
    "--reason", "Owner-approved local browser smoke admin revocation",
    "--confirm", "REVOKE LOCAL ADMIN"
  ], {
    cwd: resolve("."),
    encoding: "utf8",
    timeout: 15000,
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" }
  });
  assert.equal(revokeResult.error, undefined, "owner revocation CLI must start: " + String(revokeResult.error || ""));
  assert.equal(revokeResult.status, 0,
    "owner revocation CLI must succeed. stdout=" + revokeResult.stdout + " stderr=" + revokeResult.stderr);
  await evaluate("window.location.hash = 'top';");
  await waitFor("homepage before checking revoked administrator role", () => evaluate("document.getElementById('account-dashboard').hidden && window.location.hash === '#top'"));
  await evaluate("window.location.hash = 'account'");
  await waitFor("revoked administrator entry disappears from real account status", () => evaluate("!document.getElementById('account-dashboard').hidden && !document.querySelector('.account-admin-access-card')"));
  const revokedStatus = await evaluate("fetch('/api/account/status').then(function (response) { return response.json(); })");
  assert.equal(revokedStatus.role, "user");
  assert.equal(revokedStatus.adminRoleAssigned, false);
  assert.equal(revokedStatus.adminSessionAuthorized, false);
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
  assert.equal(storedAccount.termsVersion, "development-terms-2026-10-31-v0.3");
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
  await waitFor("browser-preview reset request reports no delivery", () =>
    evaluate("document.getElementById('account-feedback').textContent.includes('No password-reset email was sent')"));
  assert.match(await evaluate("document.getElementById('account-feedback').textContent"), /No password-reset email was sent/);

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
  await evaluate("document.getElementById('account-password').value = 'Browser-Preview-Password-Visibility'; document.querySelector('[data-password-toggle=account-password]').click()");
  assert.equal(await evaluate("document.getElementById('account-password').type"), "text",
    "browser-preview sign-up password can be shown");
  await evaluate("document.querySelector('[data-password-toggle=account-password]').click()");
  assert.equal(await evaluate("document.getElementById('account-password').type"), "password",
    "browser-preview sign-up password can be hidden again");
  await evaluate("window.__walletPromptCount = 0; window.ethereum = { request: async function (request) { window.__walletPromptCount += 1; if (request.method === 'eth_requestAccounts') return ['0x1111111111111111111111111111111111111111']; throw new Error('unexpected wallet call: ' + request.method); } };");

  const demoEmail = "browserdemo" + Date.now().toString(16) + "@example.test";
  const demoPassword = "AstroCrown-Browser-Demo-2026!";
  const demoNewPassword = "AstroCrown-Browser-Updated-2026!";
  await evaluate("document.getElementById('account-email').value = " + JSON.stringify(demoEmail));
  await evaluate("document.getElementById('account-password').value = " + JSON.stringify(demoPassword));
  await evaluate("document.getElementById('account-referral-id').value = 'PREVIEW_22'");
  await evaluate("document.getElementById('account-newsletter-opt-in').checked = true");
  await evaluate("document.getElementById('account-terms-accepted').checked = true");
  await evaluate("document.getElementById('account-create-form').requestSubmit()");
  await waitFor("browser-preview account-created success popup", () => evaluate("Boolean(document.getElementById('open-account-hub'))"), 30000);
  assert.match(await evaluate("document.body.innerText"), /no verification or newsletter message was sent/i);
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
  assert.equal(await evaluate("Boolean(document.querySelector('.account-password-manager'))"), true,
    "the account hub must provide password management");
  await evaluate("document.querySelector('.account-password-manager').open = true; document.getElementById('account-current-password').value = " +
    JSON.stringify(demoPassword) + "; document.querySelector('[data-password-toggle=account-current-password]').click()");
  assert.equal(await evaluate("document.getElementById('account-current-password').type"), "text",
    "the password-change current-password field should support show/hide");
  await evaluate("document.querySelector('[data-password-toggle=account-current-password]').click(); document.getElementById('account-new-password').value = " +
    JSON.stringify(demoNewPassword) + "; document.getElementById('account-new-password-confirmation').value = " +
    JSON.stringify(demoNewPassword) + "; document.getElementById('account-change-password').click();");
  await waitFor("browser-preview password change", () => evaluate("document.getElementById('account-session-feedback').textContent.includes('Password updated')"));
  assert.match(await evaluate("document.getElementById('account-session-feedback').textContent"), /session was renewed/i);
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
  await waitFor("old browser-preview password is rejected after change", () => evaluate("document.getElementById('account-feedback').textContent.includes('did not match')"));
  await evaluate("document.getElementById('account-password').value = " + JSON.stringify(demoNewPassword));
  await evaluate("document.getElementById('account-signin-form').requestSubmit()");
  await waitFor("browser-preview sign-in with new password", () => evaluate("Boolean(document.getElementById('open-account-hub'))"), 20000);
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
  assert.match(await evaluate("document.body.innerText"), /Email delivery is not configured/);
  await evaluate("document.getElementById('account-email').value = " + JSON.stringify(demoEmail));
  await evaluate("document.getElementById('account-reset-request-form').requestSubmit()");
  assert.match(await evaluate("document.getElementById('account-feedback').textContent"), /No password-reset email was sent/);

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


  // The case portal is public to reach and does not depend on a signed-in account.
  await cdp("Page.navigate", { url: localUrl + "account-continuity/prototype/cases.html" });
  await waitFor("independent case portal", () => evaluate("document.readyState === 'complete' && Boolean(document.getElementById('case-create-form'))"));
  assert.match(await evaluate("document.body.innerText"), /Account not required/);
  assert.match(await evaluate("document.body.innerText"), /private access key/);
  const guestAccountStatus = await evaluate("fetch('/api/account/status').then(r => r.json())");
  assert.equal(guestAccountStatus.authenticated, false, "the public case portal must work without an account session");
  await evaluate("document.getElementById('case-kind').value = 'grievance'; document.querySelector('#case-create-form [name=topic]').value = 'account_access'; document.querySelector('#case-create-form [name=title]').value = 'Account termination appeal'; document.querySelector('#case-create-form [name=description]').value = 'I believe my account was terminated in error and request an independent review of the decision.'; document.getElementById('case-create-form').requestSubmit();");
  await waitFor("guest grievance receipt with independent credentials", () => evaluate("!document.getElementById('case-receipt').hidden && document.querySelectorAll('#case-receipt .case-secret-row strong').length === 2"), 20000);
  const caseCredentials = await evaluate("Array.from(document.querySelectorAll('#case-receipt .case-secret-row strong')).map(node => node.textContent)");
  assert.match(caseCredentials[0], /^ACR-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
  assert.ok(caseCredentials[1].length >= 32, "the private case key must have high entropy");
  assert.match(await evaluate("document.getElementById('case-receipt').innerText"), /within 2 working days/);
  await evaluate("document.querySelector('#case-lookup-form [name=referenceCode]').value = " + JSON.stringify(caseCredentials[0]) + "; document.querySelector('#case-lookup-form [name=accessKey]').value = " + JSON.stringify(caseCredentials[1]) + "; document.getElementById('case-lookup-form').requestSubmit();");
  await waitFor("guest opens the case using its separate credentials", () => evaluate("!document.getElementById('case-detail').hidden && document.getElementById('case-detail').innerText.includes('Account termination appeal')"));
  assert.equal(await evaluate("Boolean(document.querySelector('#case-detail [data-download-case-history]'))"), true, "submitters must be able to export their visible case history");
  await evaluate("document.querySelector('#case-message-form [name=message]').value = 'I am adding relevant details after the account restriction and request this remain under review.'; document.getElementById('case-message-form').requestSubmit();");
  await waitFor("guest adds a message to the independent case", () => evaluate("document.getElementById('case-detail').innerText.includes('I am adding relevant details after the account restriction')"));
  const createdRecovery = await evaluate("fetch('/api/cases/recovery-request', {method:'POST', credentials:'same-origin', headers:{'Content-Type':'application/json'}, body:JSON.stringify({caseReference:'', caseTitle:'Account termination appeal', approximateDate:'31 October 2026', contactMethod:'other', contactValue:'Previously established test contact route', explanation:'I lost both the case reference and access key after my account was terminated.'})}).then(async r => ({status:r.status, body:await r.json()}))");
  assert.equal(createdRecovery.status, 201, "recovery requests must not require a case reference or account login");
  const recoveryStatus = await evaluate("fetch('/api/cases/recovery-status', {method:'POST', credentials:'same-origin', headers:{'Content-Type':'application/json'}, body:JSON.stringify({recoveryReference:" + JSON.stringify(createdRecovery.body.recoveryReference) + ", recoveryKey:" + JSON.stringify(createdRecovery.body.recoveryKey) + "})}).then(async r => ({status:r.status, body:await r.json()}))");
  assert.equal(recoveryStatus.status, 200);
  assert.equal(recoveryStatus.body.status, "pending");
  assert.match(recoveryStatus.body.message, /independent identity verification/);

  console.log("PASS: email signup/login, account dashboard, password change and old-password rejection, terms version, security assurance, separate public case portal, guest grievance receipt, high-entropy case key, independent case lookup and reply, loss-of-both-credentials recovery request/status, admin role boundaries and browser-only preview.");

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