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

const adminWalletFixtureKey = "0x" + "11".repeat(32);
function runAdminWalletFixturePython(code, args = []) {
  return spawnSync(python, ["-c", code, ...args], { encoding: "utf8" });
}
const adminWalletAddressResult = runAdminWalletFixturePython(
  "from eth_account import Account; import sys; print(Account.from_key(sys.argv[1]).address)",
  [adminWalletFixtureKey]
);
if (adminWalletAddressResult.status !== 0) {
  throw new Error("Unable to derive the deterministic admin-wallet browser-test address: " + adminWalletAddressResult.stderr);
}
const adminWalletFixtureAddress = adminWalletAddressResult.stdout.trim();

function signAdminWalletMessage(message) {
  const result = runAdminWalletFixturePython(
    "from eth_account import Account; from eth_account.messages import encode_defunct; import sys; print(Account.sign_message(encode_defunct(text=sys.argv[1]), private_key=sys.argv[2]).signature.hex())",
    [message, adminWalletFixtureKey]
  );
  if (result.status !== 0) {
    throw new Error("Unable to create the deterministic admin-wallet browser-test signature: " + result.stderr);
  }
  let signature = result.stdout.trim();
  if (!signature.startsWith("0x")) signature = "0x" + signature;
  if (!/^0x[0-9a-f]+$/i.test(signature)) {
    throw new Error("The deterministic admin-wallet browser-test signer returned an invalid signature.");
  }
  return signature;
}

async function trustedClick(selector) {
  const point = await evaluate(
    "(() => { const element = document.querySelector(" + JSON.stringify(selector) + ");" +
    " if (!element) throw new Error('Missing click target: ' + " + JSON.stringify(selector) + ");" +
    " element.scrollIntoView({block:'center',inline:'center'});" +
    " const rect = element.getBoundingClientRect();" +
    " return {x:rect.left + rect.width / 2, y:rect.top + rect.height / 2}; })()"
  );
  await cdp("Input.dispatchMouseEvent", { type: "mouseMoved", x: point.x, y: point.y });
  await cdp("Input.dispatchMouseEvent", { type: "mousePressed", x: point.x, y: point.y, button: "left", clickCount: 1 });
  await cdp("Input.dispatchMouseEvent", { type: "mouseReleased", x: point.x, y: point.y, button: "left", clickCount: 1 });
}

async function completePendingAdminWalletSignature() {
  await waitFor("wallet signature request from the browser provider", () =>
    evaluate("typeof window.__resolveAdminWalletSignature === 'function' && typeof window.__pendingAdminWalletMessage === 'string'"));
  const messageHex = await evaluate("window.__pendingAdminWalletMessage");
  assert.match(messageHex, /^0x(?:[0-9a-f]{2})+$/i);
  const message = Buffer.from(messageHex.slice(2), "hex").toString("utf8");
  const signature = signAdminWalletMessage(message);
  await evaluate(
    "window.__resolveAdminWalletSignature(" + JSON.stringify(signature) + ");" +
    "window.__resolveAdminWalletSignature = null; window.__pendingAdminWalletMessage = null;"
  );
}

async function pageReady() {
  return evaluate(
    "document.readyState === 'complete' && Boolean(document.getElementById('open-account-dialog'))"
  );
}

async function waitForAdminWalletEnrollmentReview(description) {
  await waitFor(description, async () => {
    const state = await evaluate(
      "(() => {" +
        "const dialog = document.getElementById('admin-wallet-proof-dialog');" +
        "const message = document.getElementById('admin-wallet-proof-message');" +
        "const notice = document.getElementById('admin-wallet-connect-notice-status');" +
        "const feedback = document.getElementById('account-admin-access-feedback');" +
        "return {" +
          "ready: Boolean(dialog && dialog.open && message && /first AstroCrown administrator wallet/i.test(message.textContent))," +
          "proofDialogExists: Boolean(dialog)," +
          "proofDialogOpen: Boolean(dialog && dialog.open)," +
          "proofMessage: message ? message.textContent : null," +
          "walletConnectNotice: notice ? notice.textContent : null," +
          "adminFeedback: feedback ? feedback.textContent : null," +
          "connectPending: document.documentElement.getAttribute('data-admin-wallet-connect-pending')," +
          "walletCalls: window.__adminWalletCalls || []," +
          "adminApi: window.__adminWalletApi || []," +
          "browserErrors: window.__adminWalletBrowserErrors || []," +
          "walletHeaderClickEvents: window.__walletHeaderClickEvents || []," +
          "walletHeaderCustomEvents: window.__walletHeaderCustomEvents || []," +
          "headerButton: (() => { const b = document.getElementById('wallet-connect-trigger'); if (!b) return null; const r = b.getBoundingClientRect(); const x = r.left + r.width/2; const y = r.top + r.height/2; const top = document.elementFromPoint(x,y); return {rect:{left:r.left,top:r.top,width:r.width,height:r.height},viewport:{width:innerWidth,height:innerHeight},topmost:top ? {tag:top.tagName,id:top.id,classes:top.className} : null,ariaExpanded:b.getAttribute('aria-expanded'),disabled:b.disabled}; })()," +
          "hash: window.location.hash" +
        "};" +
      "})()"
    );
    if (state.ready) return state;
    throw new Error(JSON.stringify(state));
  });
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
  const brandedAccountTitle = await evaluate("(() => { const heading = document.getElementById('account-dialog-title'); const astro = heading.querySelector('.account-dialog-astro'); const crown = heading.querySelector('.account-dialog-crown'); const context = heading.querySelector('.account-dialog-context'); return {label:heading.getAttribute('aria-label'), astro:astro && astro.textContent, crown:crown && crown.textContent, context:context && context.textContent, astroColor:astro && getComputedStyle(astro).color, crownColor:crown && getComputedStyle(crown).color, contextColor:context && getComputedStyle(context).color, contextFontSize:context && parseFloat(getComputedStyle(context).fontSize), logoCount:heading.querySelectorAll('svg,img').length}; })()");
  assert.deepEqual(brandedAccountTitle, {
    label:"AstroCrown account", astro:"ASTRO", crown:"CROWN", context:"Account",
    astroColor:"rgb(242, 245, 251)", crownColor:"rgb(255, 215, 0)",
    contextColor:"rgb(255, 215, 0)", contextFontSize:18, logoCount:0
  }, "the account dialog must use the accessible split-color AstroCrown wordmark and larger gold Account descriptor without a repeated logo");
  assert.equal(await evaluate("Boolean(document.getElementById('account-email'))"), false,
    "the active sign-in view must not request an email address");
  assert.equal(await evaluate("Boolean(document.getElementById('account-password'))"), false,
    "the active sign-in view must not request a password");
  assert.equal(await evaluate("Boolean(document.getElementById('account-passkey-signin'))"), true);
  assert.equal(await evaluate("document.querySelector('#account-passkey-signin + p.account-signin-help a').textContent.trim()"),
    "Why Passkeys?", "the explainer link must sit immediately below the passkey sign-in button");
  assert.equal(await evaluate("document.querySelector('#account-passkey-signin + p.account-signin-help a').getAttribute('href')"),
    "./account-continuity/prototype/security-assurance.html");
  assert.equal(await evaluate("document.querySelectorAll('a[href=\"./account-continuity/prototype/security-assurance.html\"]').length"), 1,
    "the sign-in view must expose one passkey/security explainer link");
  const signInLayout = await evaluate("(() => { const content = document.getElementById('account-content'); const form = content.querySelector('.account-form'); const help = content.querySelector('.account-signin-help'); const divider = content.querySelector('.account-signin-divider'); const recovery = content.querySelector('.account-signin-recovery'); const feedback = content.querySelector('.account-signin-feedback'); const line = divider.getBoundingClientRect(); const bounds = content.getBoundingClientRect(); const targets = [help.querySelector('a'), recovery.querySelector('button'), feedback.querySelector('a')].map(el => { const r = el.getBoundingClientRect(); return {width:r.width,height:r.height}; }); return {ordered: document.getElementById('account-passkey-signin').nextElementSibling === help && form.nextElementSibling === divider && divider.nextElementSibling === recovery && recovery.nextElementSibling === feedback, dividerInset: line.left > bounds.left && line.right < bounds.right && line.width < bounds.width - 35, targets}; })()");
  assert.equal(signInLayout.ordered, true,
    "the passkey link, inset divider, centered recovery action and footer feedback link must appear in the intended order");
  assert.equal(signInLayout.dividerInset, true,
    "the gold divider must leave a visible gap before both popup content edges");
  assert.ok(signInLayout.targets.every(target => target.width >= 25 && target.height >= 25),
    "passkey, recovery and feedback pointer targets must each measure at least 25 by 25 CSS pixels");
  assert.doesNotMatch(await evaluate("document.getElementById('account-content').innerText"),
    /Your authenticator keeps the private key|does not receive your biometric/i,
    "the removed technical paragraph must not reappear in the sign-in view");
  assert.equal(await evaluate("Boolean(document.querySelector('#account-content .account-dialog-description'))"), false,
    "the redundant sign-in explanation must not appear above the passkey button");

  await evaluate("document.querySelector('[data-account-mode=create]').click()");
  await waitFor("passkey registration form", () =>
    evaluate("Boolean(document.getElementById('account-create-form'))"));
  assert.equal(await evaluate("document.getElementById('account-dialog-title').getAttribute('aria-label')"),
    "AstroCrown account", "the same branded heading must remain on Sign Up");
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
  assert.match(await evaluate("document.body.innerText"), /save your account identifier and offline recovery key/i);
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
  assert.equal(await evaluate("Boolean(document.getElementById('open-communications'))"), true,
    "the homepage header must expose the communications bell");
  assert.equal(await evaluate("document.getElementById('communications-unread-count').hidden"), true,
    "the communications badge must remain hidden when there are no pending items");

  const communicationSeed = spawnSync(python, [
    "-c",
    "import sqlite3,sys,uuid; c=sqlite3.connect(sys.argv[1]); a=c.execute('SELECT account_id FROM accounts').fetchone()[0]; c.executemany('INSERT INTO account_communications(communication_id,recipient_account_id,sender_account_id,section,subject,body,created_at,read_at) VALUES (?,?,NULL,?,?,?,?,?)', [(str(uuid.uuid4()),a,'messages','Message '+str(i),'Body '+str(i),'2026-11-01T00:00:00Z','2026-11-01T00:00:00Z') for i in range(55)]); c.commit()",
    databasePath
  ], { encoding: "utf8" });
  assert.equal(communicationSeed.status, 0,
    communicationSeed.stderr || "Unable to seed local communications pagination fixture.");

  await evaluate("document.getElementById('open-communications').click()");
  await waitFor("authenticated user opens private communications", () =>
    evaluate("!document.getElementById('communications-page').hidden && Boolean(document.querySelector('.communications-tabs'))"));
  assert.match(await evaluate("document.getElementById('communications-content').innerText"), /No alerts yet/i);
  await evaluate("document.querySelector('[data-communication-section=messages]').click()");
  await waitFor("Messages section page is loaded", () => evaluate(
    "document.querySelector('[data-communication-section=messages]').getAttribute('aria-selected') === 'true' && " +
    "document.querySelectorAll('#communications-content .communication-item').length === 50 && " +
    "Boolean(document.querySelector('[data-communications-load-older=true]'))"
  ));
  assert.match(await evaluate("document.getElementById('communications-content').innerText"), /Load older Messages/i);
  await evaluate("document.querySelector('[data-communications-load-older=true]').click()");
  await waitFor("older Messages page is appended without loss", () =>
    evaluate("document.querySelectorAll('#communications-content .communication-item').length === 55 && " +
      "!document.querySelector('[data-communications-load-older=true]')"));
  assert.equal(await evaluate("document.querySelectorAll('#communications-content .communication-item').length"), 55);
  await evaluate("window.location.hash = '#account'");
  await waitFor("return from communications to User dashboard", () =>
    evaluate("!document.getElementById('account-dashboard').hidden && document.getElementById('communications-page').hidden"));

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

  // The ordinary homepage Wallet control remains a preview menu for normal
  // users; it must not prompt a wallet before an admin-only request is active.
  await evaluate("document.getElementById('wallet-connect-trigger').click()");
  await waitFor("ordinary-user wallet preview menu", () =>
    evaluate("document.querySelector('#wallet-menu').closest('.menu-slot').classList.contains('is-open')"));
  assert.equal(await evaluate("window.__walletPromptCount"), 0,
    "ordinary users must not be prompted for a wallet by the homepage Wallet button");
  await evaluate("document.getElementById('wallet-connect-trigger').click()");

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

  // Simulate the user's lost authenticator: remove the stored credential from
  // Chrome's virtual device while leaving the server's old public credential
  // active until the recovery ceremony replaces it. This ensures the second
  // makeCredential request is not rejected as an excluded credential already
  // present on the same virtual authenticator.
  await cdp("WebAuthn.removeCredential", {
    authenticatorId,
    credentialId: registeredCredentials.credentials[0].credentialId
  });
  const lostDeviceCredentials = await cdp("WebAuthn.getCredentials", { authenticatorId });
  assert.equal(lostDeviceCredentials.credentials.length, 0,
    "the test authenticator must no longer contain the simulated lost passkey");

  // Recover with the one-time offline key. The old passkey is disabled, all
  // previous sessions are revoked, and the replacement key is displayed once.
  await evaluate("document.getElementById('open-account-dialog').click()");
  await waitFor("passkey sign-in view before recovery", () =>
    evaluate("Boolean(document.getElementById('account-recovery-start'))"));
  assert.equal(await evaluate("document.getElementById('account-dialog-title').getAttribute('aria-label')"),
    "AstroCrown account", "the same branded heading must remain on recovery");
  assert.equal(await evaluate("document.getElementById('account-recovery-start').textContent.trim()"),
    "Lost your passkey? Use a recovery key");
  assert.doesNotMatch(await evaluate("document.querySelector('#account-dialog').innerText"),
    /A crypto wallet is optional and is not required for ordinary account access/i,
    "wallet guidance must not appear beside the offline recovery link");
  await evaluate("document.getElementById('account-recovery-start').click()");
  await waitFor("offline recovery form", () =>
    evaluate("Boolean(document.getElementById('account-recovery-form'))"));
  assert.match(await evaluate("document.querySelector('#account-dialog').innerText"),
    /Your offline recovery key is a one-time backup for regaining access if you lose your passkey/i,
    "the recovery view must explain the offline key's purpose");
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


  // Exercise the administrator access UX through the same Wallet control in
  // the homepage header. The test-only role fixture is an ordinary passkey
  // account promoted in the isolated temporary SQLite database; it starts
  // with no registered administrator wallet.
  const adminRoleFixture = runAdminWalletFixturePython(
    "import sqlite3,sys,uuid; db=sqlite3.connect(sys.argv[1]); cur=db.execute(\"UPDATE accounts SET role='admin' WHERE username=? AND role='user'\", (sys.argv[2],)); account=db.execute('SELECT account_id FROM accounts WHERE username=?',(sys.argv[2],)).fetchone(); assert account; db.execute('INSERT INTO account_admin_permissions(account_id,permission,can_delegate,granted_by_account_id,reason,created_at) VALUES(?,?,?,?,?,?)',(account[0],'admin.messages.send',0,None,'Browser UI communication permission fixture','2026-11-03T00:00:00Z')); db.execute('INSERT INTO accounts(account_id,username,email,password_salt,password_hash,auth_method,created_at) VALUES(?,?,?,?,?,?,?)',(str(uuid.uuid4()),'AC-FEDCBA9876',None,bytes([1])*16,bytes([2])*32,'webauthn','2026-11-03T00:00:00Z')); db.commit(); print(cur.rowcount)",
    [databasePath, accountIdentifier]
  );
  assert.equal(adminRoleFixture.status, 0, adminRoleFixture.stderr || "Administrator role fixture could not be applied");
  assert.equal(adminRoleFixture.stdout.trim(), "1", "the browser test must promote exactly the recovered test account");
  await evaluate("window.location.hash = '#top'");
  await waitFor("homepage before administrator access UX", () =>
    evaluate("document.getElementById('account-dashboard').hidden && !document.getElementById('main-content').hidden"));
  await evaluate("window.location.hash = '#account'");
  await waitFor("server-confirmed administrator entry", () =>
    evaluate("Boolean(document.querySelector('.account-admin-access-card'))"));
  const adminRoleStatus = await evaluate("fetch('/api/account/status').then(r => r.json())");
  assert.equal(adminRoleStatus.adminRoleAssigned, true);
  assert.deepEqual(adminRoleStatus.adminPermissions, ["admin.messages.send"]);
  assert.equal(adminRoleStatus.adminWalletCount, 0);

  const walletProviderSetup = await evaluate(
    "window.__adminWalletCalls = []; window.__adminWalletActivation = []; window.__adminWalletApi = []; window.__adminWalletBrowserErrors = []; window.__walletHeaderClickEvents = []; window.__walletHeaderCustomEvents = [];" +
    "document.addEventListener('click', function (e) { const t = e.target instanceof Element ? e.target : null; const b = t && t.closest('#wallet-connect-trigger'); if (b) { const r = b.getBoundingClientRect(); window.__walletHeaderClickEvents.push({trusted:e.isTrusted,defaultPrevented:e.defaultPrevented,target:t.id || t.tagName,x:e.clientX,y:e.clientY,rect:{left:r.left,top:r.top,width:r.width,height:r.height},pending:document.documentElement.getAttribute('data-admin-wallet-connect-pending'),accountDialogOpen:document.getElementById('account-dialog') && document.getElementById('account-dialog').open,adminDialogOpen:document.getElementById('admin-access-dialog') && document.getElementById('admin-access-dialog').open}); } }, true);" +
    "document.addEventListener('astrocrown:header-wallet-connect', function (e) { window.__walletHeaderCustomEvents.push({trusted:e.isTrusted,pending:document.documentElement.getAttribute('data-admin-wallet-connect-pending')}); }, true);" +
    "window.addEventListener('error', function (e) { window.__adminWalletBrowserErrors.push(String(e.message || e.error || 'window error')); });" +
    "window.addEventListener('unhandledrejection', function (e) { window.__adminWalletBrowserErrors.push('unhandled rejection: ' + String(e.reason && e.reason.message || e.reason)); });"
    "const __originalAdminWalletFetch = window.fetch.bind(window);" +
    "window.fetch = async function () { const response = await __originalAdminWalletFetch.apply(this, arguments); const url = String(arguments[0] || ''); if (url.indexOf('/api/admin/') >= 0) { const body = await response.clone().text(); window.__adminWalletApi.push({url:url,status:response.status,body:body.slice(0,1000)}); } return response; };" +
    "window.__adminWalletAddress = " + JSON.stringify(adminWalletFixtureAddress) + ";" +
    "window.__pendingAdminWalletMessage = null; window.__resolveAdminWalletSignature = null;" +
    "window.ethereum = { request: async function (request) {" +
      "window.__adminWalletCalls.push(request.method);" +
      "if (request.method === 'eth_requestAccounts' || request.method === 'personal_sign') window.__adminWalletActivation.push({method:request.method,active:Boolean(navigator.userActivation && navigator.userActivation.isActive)});" +
      "if (request.method === 'eth_requestAccounts' || request.method === 'eth_accounts') return [window.__adminWalletAddress];" +
      "if (request.method === 'eth_chainId') return '0x1';" +
      "if (request.method === 'personal_sign') {" +
        "window.__pendingAdminWalletMessage = request.params[0];" +
        "return new Promise(function (resolve) { window.__resolveAdminWalletSignature = resolve; });" +
      "}" +
      "throw new Error('Unexpected wallet method in browser test: ' + request.method);" +
    "}}; true"
  );
  assert.equal(walletProviderSetup, true);

  // Opening and cancelling the confirmation dialog must not invoke the wallet.
  await evaluate("document.getElementById('account-admin-wallet-access').click()");
  await waitFor("administrator confirmation dialog", () =>
    evaluate("document.getElementById('admin-access-dialog').open"));
  assert.equal(await evaluate("window.__adminWalletCalls.length"), 0);
  await evaluate("document.getElementById('admin-access-cancel').click()");
  await waitFor("administrator confirmation cancelled", () =>
    evaluate("!document.getElementById('admin-access-dialog').open"));
  assert.equal(await evaluate("window.__adminWalletCalls.length"), 0,
    "cancelling the administrator confirmation must not request a wallet");

  // Continuing starts a cancellable wait for the shared homepage Wallet button.
  await evaluate("document.getElementById('account-admin-wallet-access').click()");
  await waitFor("second administrator confirmation dialog", () =>
    evaluate("document.getElementById('admin-access-dialog').open"));
  await evaluate("document.getElementById('admin-access-continue').click()");
  await waitFor("header-wallet connection notice", () =>
    evaluate("Boolean(document.getElementById('admin-wallet-connect-notice'))"));
  assert.equal(await evaluate("document.documentElement.getAttribute('data-admin-wallet-connect-pending')"), "true");
  assert.equal(await evaluate("window.__adminWalletCalls.length"), 0,
    "the provider must not be prompted until the homepage header Wallet button is clicked");
  await evaluate("document.getElementById('admin-wallet-connect-cancel').click()");
  await waitFor("header-wallet request cancelled", () =>
    evaluate("!document.getElementById('admin-wallet-connect-notice')"));
  assert.equal(await evaluate("window.__adminWalletCalls.length"), 0,
    "cancelling while waiting for the header Wallet button must not call the provider");

  // A first-wallet signature can also be cancelled without enrolling anything.
  await evaluate("document.getElementById('account-admin-wallet-access').click()");
  await waitFor("administrator confirmation before first enrollment", () =>
    evaluate("document.getElementById('admin-access-dialog').open"));
  await evaluate("document.getElementById('admin-access-continue').click()");
  await waitFor("first header-wallet request notice", () =>
    evaluate("Boolean(document.getElementById('admin-wallet-connect-notice'))"));
  await trustedClick("#wallet-connect-trigger");
  await waitForAdminWalletEnrollmentReview("first-wallet enrollment message review");
  assert.equal(await evaluate("document.querySelector('#wallet-menu').closest('.menu-slot').classList.contains('is-open')"), false,
    "the shared header Wallet control must start the pending administrator connection rather than opening its preview menu");
  await evaluate("document.getElementById('admin-wallet-proof-cancel').click()");
  await waitFor("first-wallet enrollment signature cancelled", () =>
    evaluate("!document.getElementById('admin-wallet-proof-dialog').open"));
  let cancelledEnrollmentStatus = await evaluate("fetch('/api/account/status').then(r => r.json())");
  assert.equal(cancelledEnrollmentStatus.adminWalletCount, 0,
    "cancelling the enrollment signature must leave the wallet registry unchanged");
  assert.equal(cancelledEnrollmentStatus.adminSessionAuthorized, false);
  assert.ok((await evaluate("window.__adminWalletCalls")).includes("eth_requestAccounts"));
  assert.equal((await evaluate("window.__adminWalletCalls")).includes("eth_sendTransaction"), false);

  // The first signature enrolls only. A second fresh signature is then shown
  // for the administrator session; cancelling it must keep the console closed.
  await evaluate("document.getElementById('account-admin-wallet-access').click()");
  await waitFor("administrator confirmation for successful enrollment", () =>
    evaluate("document.getElementById('admin-access-dialog').open"));
  await evaluate("document.getElementById('admin-access-continue').click()");
  await waitFor("header-wallet request for successful enrollment", () =>
    evaluate("Boolean(document.getElementById('admin-wallet-connect-notice'))"));
  await trustedClick("#wallet-connect-trigger");
  await waitForAdminWalletEnrollmentReview("first-wallet enrollment review for signing");
  await trustedClick("#admin-wallet-proof-sign");
  await completePendingAdminWalletSignature();
  await waitFor("separate administrator step-up signature review", () =>
    evaluate("document.getElementById('admin-wallet-proof-dialog').open && /Verify an already-authorized AstroCrown administrator session/i.test(document.getElementById('admin-wallet-proof-message').textContent)"));
  const enrolledButNotAuthorized = await evaluate("fetch('/api/account/status').then(r => r.json())");
  assert.equal(enrolledButNotAuthorized.adminRoleAssigned, true);
  assert.equal(enrolledButNotAuthorized.adminWalletCount, 1);
  assert.equal(enrolledButNotAuthorized.adminWalletAuthenticated, false);
  assert.equal(enrolledButNotAuthorized.adminSessionAuthorized, false);
  assert.equal(enrolledButNotAuthorized.admin, false,
    "the first wallet enrollment signature must not itself authorize administrator access");
  await evaluate("document.getElementById('admin-wallet-proof-cancel').click()");
  await waitFor("separate administrator signature cancelled", () =>
    evaluate("!document.getElementById('admin-wallet-proof-dialog').open"));
  const cancelledStepUpStatus = await evaluate("fetch('/api/account/status').then(r => r.json())");
  assert.equal(cancelledStepUpStatus.authenticated, true);
  assert.equal(cancelledStepUpStatus.adminRoleAssigned, true);
  assert.equal(cancelledStepUpStatus.adminWalletCount, 1);
  assert.equal(cancelledStepUpStatus.adminSessionAuthorized, false,
    "cancelling the separate step-up signature must leave administrator access closed");

  // A fresh administrator request reuses the header connection control but
  // requires another one-time signature before the separate console opens.
  await evaluate("document.getElementById('account-admin-wallet-access').click()");
  await waitFor("administrator confirmation for final step-up", () =>
    evaluate("document.getElementById('admin-access-dialog').open"));
  await evaluate("document.getElementById('admin-access-continue').click()");
  await waitFor("header-wallet request for final step-up", () =>
    evaluate("Boolean(document.getElementById('admin-wallet-connect-notice'))"));
  await trustedClick("#wallet-connect-trigger");
  await waitFor("final administrator signature review", () =>
    evaluate("document.getElementById('admin-wallet-proof-dialog').open && /Verify an already-authorized AstroCrown administrator session/i.test(document.getElementById('admin-wallet-proof-message').textContent)"));
  await trustedClick("#admin-wallet-proof-sign");
  await completePendingAdminWalletSignature();
  await waitFor("administrator dashboard after separate wallet step-up", () =>
    evaluate("!document.getElementById('admin-dashboard').hidden && document.getElementById('admin-dashboard').innerText.includes('Administrator access verified')"), 20000);
  const fullyAuthorizedAdmin = await evaluate("fetch('/api/account/status').then(r => r.json())");
  assert.equal(fullyAuthorizedAdmin.adminRoleAssigned, true);
  assert.equal(fullyAuthorizedAdmin.adminWalletCount, 1);
  assert.equal(fullyAuthorizedAdmin.adminWalletAuthenticated, true);
  assert.equal(fullyAuthorizedAdmin.adminSessionAuthorized, true);
  assert.equal(fullyAuthorizedAdmin.admin, true);
  assert.equal(fullyAuthorizedAdmin.adminWalletAddress.toLowerCase(), adminWalletFixtureAddress.toLowerCase());
  assert.equal(await evaluate("Boolean(document.getElementById('admin-communication-send'))"), true,
    "the separate permission must expose the administrator communication composer");
  assert.equal(await evaluate("document.querySelector('#admin-communication-section option[value=alerts]').textContent"), "Alerts");
  assert.equal(await evaluate("document.querySelector('#admin-communication-section option[value=messages]').textContent"), "Messages");
  await evaluate("document.getElementById('admin-communication-recipient').value='AC-FEDCBA9876'; document.getElementById('admin-communication-section').value='messages'; document.getElementById('admin-communication-subject').value='Browser test message'; document.getElementById('admin-communication-body').value='Sender-selected destination is Messages.'; document.getElementById('admin-communication-send').click()");
  await waitFor("administrator sends a private Message", () =>
    evaluate("document.getElementById('admin-communication-feedback').textContent.includes('Delivered to AC-FEDCBA9876 in Messages')"));
  const storedCommunication = runAdminWalletFixturePython(
    "import sqlite3,sys,json; db=sqlite3.connect(sys.argv[1]); row=db.execute('SELECT section,subject,body FROM account_communications WHERE recipient_account_id=(SELECT account_id FROM accounts WHERE username=?) ORDER BY rowid DESC LIMIT 1',('AC-FEDCBA9876',)).fetchone(); print(json.dumps(row))",
    [databasePath]
  );
  assert.equal(storedCommunication.status, 0, storedCommunication.stderr || "The communication database query failed");
  assert.deepEqual(JSON.parse(storedCommunication.stdout), ["messages", "Browser test message", "Sender-selected destination is Messages."]);
  const adminWalletMethods = await evaluate("window.__adminWalletCalls");
  const adminWalletActivation = await evaluate("window.__adminWalletActivation");
  assert.ok(adminWalletActivation.length >= 3);
  assert.ok(adminWalletActivation.every(item => item.active === true),
    "wallet connection and message signing must be triggered from trusted user clicks");
  assert.equal(adminWalletMethods.includes("eth_sendTransaction"), false,
    "administrator enrollment and step-up must never submit a blockchain transaction");
  assert.equal(adminWalletMethods.includes("eth_signTransaction"), false);
  assert.equal(adminWalletMethods.includes("eth_sendRawTransaction"), false);
  assert.equal(adminWalletMethods.includes("eth_getBalance"), false,
    "administrator authentication must not impose a wallet-balance requirement");

  // Ending only the administrator step-up preserves the ordinary account session.
  await evaluate("document.getElementById('admin-end-access').click()");
  await waitFor("administrator step-up ended with User dashboard restored", () =>
    evaluate("!document.getElementById('account-dashboard').hidden && document.getElementById('admin-dashboard').hidden && Boolean(document.getElementById('account-signout'))"));
  const afterAdminStepUpLogout = await evaluate("fetch('/api/account/status').then(r => r.json())");
  assert.equal(afterAdminStepUpLogout.authenticated, true);
  assert.equal(afterAdminStepUpLogout.adminRoleAssigned, true);
  assert.equal(afterAdminStepUpLogout.adminSessionAuthorized, false);

  // Simulate an authorized external role revocation after this account has
  // used the Administrator dashboard. The target keeps its ordinary session,
  // receives the audit-linked Alert in the separate communications page.
  const revokeRoleFixture = runAdminWalletFixturePython(
    "import sqlite3,sys; db=sqlite3.connect(sys.argv[1]); account=db.execute('SELECT account_id FROM accounts WHERE username=?',(sys.argv[2],)).fetchone(); assert account; account_id=account[0]; db.execute(\"UPDATE admin_wallets SET active=0 WHERE account_id=? AND active=1\",(account_id,)); db.execute('DELETE FROM account_admin_permissions WHERE account_id=?',(account_id,)); db.execute(\"UPDATE accounts SET role='user' WHERE account_id=?\",(account_id,)); db.execute('UPDATE sessions SET admin_wallet_address=NULL,admin_authenticated_at=NULL,admin_expires_at=NULL WHERE account_id=?',(account_id,)); db.execute(\"INSERT INTO account_admin_audit(audit_id,event_type,actor,target_account_id,target_wallet_address,reason,created_at,detail) VALUES ('browser-admin-revoke-notice','admin_role_revoked_by_admin','test-authorized-admin',?,NULL,'Administrative appointment withdrawn after review','2026-11-03T00:00:00Z','{}')\",(account_id,)); db.execute('INSERT INTO account_communications(communication_id,recipient_account_id,sender_account_id,section,subject,body,source_audit_id,created_at) VALUES (?,?,?,?,?,?,?,?)',('browser-admin-revoke-communication',account_id,None,'alerts','Administrator privileges removed','Your administrator access was removed.\\n\\nRecorded reason: Administrative appointment withdrawn after review\\nRecorded: 2026-11-03T00:00:00Z','browser-admin-revoke-notice','2026-11-03T00:00:00Z')); db.commit(); print('revoked')",
    [databasePath, accountIdentifier]
  );
  assert.equal(revokeRoleFixture.status, 0, revokeRoleFixture.stderr || "The isolated administrator revocation fixture failed");
  assert.equal(revokeRoleFixture.stdout.trim(), "revoked");
  await evaluate("window.location.hash = '#admin'");
  await waitFor("revoked administrator is returned to User dashboard without admin entry", () =>
    evaluate("!document.getElementById('account-dashboard').hidden && document.getElementById('admin-dashboard').hidden && " +
      "Boolean(document.getElementById('account-signout')) && !document.querySelector('.account-admin-access-card')"));
  assert.equal(await evaluate("Boolean(document.querySelector('.account-admin-access-card'))"), false,
    "a revoked administrator must no longer see the administrator entry button");
  assert.equal(await evaluate("Boolean(document.querySelector('.account-admin-revocation-notice'))"), false,
    "revocation details must no longer be duplicated in the User dashboard");
  const revokedTargetStatus = await evaluate("fetch('/api/account/status').then(r => r.json())");
  assert.equal(revokedTargetStatus.authenticated, true);
  assert.equal(revokedTargetStatus.role, "user");
  assert.equal(revokedTargetStatus.adminRoleAssigned, false);
  assert.equal(revokedTargetStatus.adminSessionAuthorized, false);
  assert.equal(revokedTargetStatus.administratorRevocationNotice.reason,
    "Administrative appointment withdrawn after review");

  assert.equal(revokedTargetStatus.communicationsUnreadCounts.alerts, 1);
  await evaluate("window.location.hash = '#communications'");
  await waitFor("role revocation displayed in Alerts tab", () =>
    evaluate("!document.getElementById('communications-page').hidden && Boolean(document.querySelector('.communication-item.is-alert'))"));
  assert.match(await evaluate("document.getElementById('communications-content').innerText"), /Administrator privileges removed/);
  assert.match(await evaluate("document.getElementById('communications-content').innerText"), /Administrative appointment withdrawn after review/);
  await evaluate("document.querySelector('[data-communication-action=acknowledge]').click()");
  await waitFor("revocation Alert acknowledged in communications inbox", () =>
    evaluate("!document.querySelector('[data-communication-action=acknowledge]') && document.querySelector('.communication-state-label').textContent === 'Acknowledged'"));
  const acknowledgedRevocationStatus = await evaluate("fetch('/api/account/status').then(r => r.json())");
  assert.equal(acknowledgedRevocationStatus.authenticated, true);
  assert.equal(acknowledgedRevocationStatus.role, "user");
  assert.equal(acknowledgedRevocationStatus.administratorRevocationNotice, null,
    "the acknowledgement must persist across account status refreshes");
  assert.deepEqual(acknowledgedRevocationStatus.communicationsUnreadCounts, {alerts:0,messages:0});
  await evaluate("window.location.hash = '#account'");
  await waitFor("return to User dashboard after acknowledging alert", () =>
    evaluate("!document.getElementById('account-dashboard').hidden && document.getElementById('communications-page').hidden"));

  await evaluate("document.getElementById('account-signout').click()");
  await waitFor("recovered account session is cleared before preview checks", () =>
    evaluate("document.getElementById('account-dashboard').hidden && !document.getElementById('open-account-dialog').classList.contains('is-authenticated')"));
  assert.equal((await evaluate("fetch('/api/account/status').then(r => r.json())")).authenticated, false);

  // Hosted-preview mode is intentionally non-authenticating: no fake account state.
  await cdp("Page.navigate", { url: localUrl + "?account-preview-demo=1" });
  await waitFor("hosted-preview-mode homepage", pageReady);
  await evaluate("document.getElementById('open-account-dialog').click()");
  await waitFor("read-only preview sign-in dialog", () => evaluate("document.getElementById('account-dialog').open"));
  assert.equal(await evaluate("document.getElementById('account-demo-notice')"), null,
    "the hosted-preview disclaimer is intentionally omitted from the account dialog");
  assert.equal(await evaluate("document.getElementById('account-passkey-signin').disabled"), true);
  await evaluate("document.querySelector('[data-account-mode=create]').click()");
  await waitFor("read-only preview registration view", () =>
    evaluate("Boolean(document.getElementById('account-create-form'))"));
  assert.equal(await evaluate("document.querySelector('#account-create-form button[type=submit]').disabled"), true);
  assert.equal(await evaluate("Boolean(document.getElementById('account-email'))"), false);
  assert.equal(await evaluate("Boolean(document.getElementById('account-password'))"), false);
  const previewStatus = await evaluate("fetch('/api/account/status').then(r => r.json())");
  assert.equal(previewStatus.authenticated, false);
  // The query-parameter preview disables passkey UI actions; it does not
  // disable the separate loopback backend. Direct same-origin status requests
  // correctly report that the local verifier is available, while the UI's own
  // browserPreviewRequest never calls those authentication endpoints.
  assert.equal(previewStatus.passkeyAvailable, true);

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
