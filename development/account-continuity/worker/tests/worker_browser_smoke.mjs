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
let browserExit = null;
let browserStartError = null;
const pending = new Map();
const apiEvents = [];
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
    " element.scrollIntoView({block:'center',inline:'center',behavior:'instant'});" +
    " const r = element.getBoundingClientRect();" +
    " return {x:r.left+r.width/2,y:r.top+r.height/2,width:r.width,height:r.height," +
    "viewportWidth:innerWidth,viewportHeight:innerHeight}; })()"
  );
  if (!point.width || !point.height || point.x < 0 || point.y < 0 ||
      point.x >= point.viewportWidth || point.y >= point.viewportHeight) {
    throw new Error("Click target is not in the viewport after instant scrolling: " + JSON.stringify(point));
  }
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
  browser.stderr.on("data", chunk => { browserOutput = (browserOutput + chunk).slice(-12000); });
  browser.on("error", error => { browserStartError = String(error?.message || error); });
  browser.on("exit", (code, signal) => { browserExit = { code, signal }; });

  let target;
  try {
    await waitFor("Chrome DevTools page", async () => {
      if (browserStartError || browserExit) {
        throw new Error("Chrome exited before DevTools became available.");
      }
      try {
        const response = await fetch("http://127.0.0.1:" + debugPort + "/json");
        const targets = await response.json();
        target = targets.find(item => item.type === "page" && item.url === "about:blank");
        return Boolean(target?.webSocketDebuggerUrl);
      } catch {
        return false;
      }
    }, 45000);
  } catch (error) {
    throw new Error(
      String(error?.message || error) +
      "\nChrome launch error: " + (browserStartError || "none") +
      "\nChrome exit: " + JSON.stringify(browserExit) +
      "\nChrome stderr tail: " + (browserOutput || "(empty)")
    );
  }

  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("DevTools websocket connection timed out.")), 10000);
    socket.addEventListener("open", () => { clearTimeout(timer); resolve(); }, { once: true });
    socket.addEventListener("error", () => { clearTimeout(timer); reject(new Error("DevTools websocket connection failed.")); }, { once: true });
  });
  socket.addEventListener("message", event => {
    let message;
    try { message = JSON.parse(String(event.data)); } catch { return; }
    if (!message.id) {
      if (message.method === "Network.responseReceived") {
        const response = message.params.response;
        if (response?.url?.includes("/api/")) apiEvents.push({url:response.url,status:response.status,requestId:message.params.requestId});
      } else if (message.method === "Network.loadingFailed") {
        if (message.params?.type === "XHR" || message.params?.type === "Fetch") apiEvents.push({loadingFailed:true,errorText:message.params.errorText,requestId:message.params.requestId});
      } else if (message.method === "Runtime.exceptionThrown") {
        apiEvents.push({browserException:message.params.exceptionDetails?.text || "uncaught browser exception"});
      }
      return;
    }
    const item = pending.get(message.id);
    if (!item) return;
    clearTimeout(item.timer);
    pending.delete(message.id);
    if (message.error) item.reject(new Error(message.error.message || "DevTools command failed."));
    else item.resolve(message.result || {});
  });

  await cdp("Page.enable");
  await cdp("Runtime.enable");
  await cdp("Network.enable");
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
  const registrationOutcome = await waitFor("passkey registration result", async () => {
    const state = await evaluate(
      "({recoveryKey:Boolean(document.getElementById('account-one-time-recovery-key'))," +
      "feedback:(document.getElementById('account-feedback')?.textContent || '').trim()})"
    );
    if (state.recoveryKey) return { success:true };
    if (state.feedback) return { success:false, feedback:state.feedback };
    return false;
  }, 45000);
  if (!registrationOutcome.success) {
    throw new Error("Passkey registration did not complete: " + registrationOutcome.feedback);
  }

  const identifier = await evaluate("document.getElementById('account-one-time-account-identifier').value");
  const firstKey = await evaluate("document.getElementById('account-one-time-recovery-key').value");
  let currentRecoveryKey = firstKey;
  assert.match(identifier, /^AC-[A-F0-9]{10}$/);
  assert.match(firstKey, /^ACR1-[A-Za-z0-9_-]{43}$/);
  let account = await status();
  assert.equal(account.authenticated, true);
  assert.equal(account.accountIdentifier, identifier);
  assert.equal(account.authMethod, "webauthn");
  assert.equal(account.passkeyCount, 1);
  assert.equal(account.mlDsaRegistrationAvailable, true, "the qualified Worker runtime must offer ML-DSA-44 first.");
  assert.deepEqual(account.passkeyAlgorithmIds, [-48], "the registered test credential must actually use ML-DSA-44 (COSE alg -48), not a classical fallback.");
  assert.equal(account.postQuantumPasskeyCount, 1, "the actual persisted credential must be counted as post-quantum.");
  assert.equal(account.postQuantumPasskeyCount, account.passkeyAlgorithmIds.filter(id => [-48, -49, -50].includes(id)).length);
  console.log("Authenticator credential COSE algorithm: " + account.passkeyAlgorithmIds[0] +
    "; ML-DSA-44 advertised: " + account.mlDsaRegistrationAvailable +
    "; actual active ML-DSA credentials: " + account.postQuantumPasskeyCount);
  assert.equal(account.email, null);
  assert.equal(account.role, "user");
  assert.equal(account.recoveryKeyAvailable, true);


  await trustedClick("#account-recovery-key-saved");
  await waitFor("offline recovery key acknowledgement", () => evaluate("!document.getElementById('open-account-hub').disabled"));
  await trustedClick("#open-account-hub");
  await waitFor("ordinary User dashboard", () =>
    evaluate("!document.getElementById('account-dashboard').hidden && Boolean(document.getElementById('account-signout'))"));
  const stagingDashboard = await evaluate("document.getElementById('account-dashboard').innerText");
  assert.match(stagingDashboard, /Alerts & Messages[\s\S]*Disabled in this staging qualification/);
  assert.equal(await evaluate("Boolean(document.getElementById('open-account-communications'))"), false,
    "the disabled communications API must not have an active dashboard button");
  assert.equal(await evaluate("Boolean(document.querySelector('a[href*=\"cases.html\"]'))"), false,
    "the out-of-scope case portal must not be linked from the staging homepage");
  assert.equal(await evaluate("Boolean(document.querySelector('.account-admin-access-card'))"), false,
    "an ordinary user must not see an administrator entry");

  const firstCredentials = await cdp("WebAuthn.getCredentials", { authenticatorId });
  assert.equal(firstCredentials.credentials.length, 1, "registration must create one resident credential.");

  assert.equal(account.securityManagementAvailable, true,
    "the Worker account summary must explicitly advertise the implemented security controls.");

  const securityApi = await evaluate(
    "fetch('/api/account/security',{credentials:'same-origin',cache:'no-store'}).then(async r=>({status:r.status,body:await r.json()}))"
  );
  assert.equal(securityApi.status, 200,
    "the new account-security endpoint must return a signed-in account's credential/session list: " + JSON.stringify(securityApi.body));
  assert.equal(securityApi.body.available, true);
  let security = securityApi.body;
  const securityButtonState = await evaluate(
    "(() => { const b=document.getElementById('account-security-manage'); const p=document.getElementById('account-security-panel'); " +
    "return {button:!!b,disabled:!!b?.disabled,dashboardHidden:!!document.getElementById('account-dashboard')?.hidden," +
    "panelHidden:!!p?.hidden}; })()"
  );
  assert.equal(securityButtonState.button, true, "the User dashboard must show the security control when the backend enables it.");
  assert.equal(securityButtonState.disabled, false, "the security management control must be usable after account creation.");
  await evaluate(
    "window.__accountSecurityClickCount=0; document.getElementById('account-security-manage').addEventListener('click',()=>window.__accountSecurityClickCount++);"
  );
  await trustedClick("#account-security-manage");
  const securityClickProbe = await evaluate(
    "(() => { const b=document.getElementById('account-security-manage'); const r=b.getBoundingClientRect(); " +
    "const x=r.left+r.width/2,y=r.top+r.height/2,hit=document.elementFromPoint(x,y); " +
    "return {clicks:window.__accountSecurityClickCount,buttonDisabled:b.disabled,buttonVisible:!!(r.width&&r.height)," +
    "rect:{left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}," +
    "viewport:{width:innerWidth,height:innerHeight,scrollX,scrollY}," +
    "hitId:hit?.id || '',hitTag:hit?.tagName || '',panelHidden:document.getElementById('account-security-panel')?.hidden}; })()"
  );
  assert.equal(securityClickProbe.clicks, 1,
    "the real browser click must reach the account-security button: " + JSON.stringify(securityClickProbe));
  await waitFor("account security panel becomes visible", () =>
    evaluate("Boolean(document.getElementById('account-security-panel') && !document.getElementById('account-security-panel').hidden)"));
  await waitFor("account security panel passkey controls load", () =>
    evaluate("document.querySelectorAll('#account-security-panel [data-security-action=\"revoke-passkey\"]').length === 1"), 15000);
  const securityPanelState = await evaluate(
    "(() => { const p=document.getElementById('account-security-panel'); return {text:p?.innerText || '',passkeyActions:p?.querySelectorAll('[data-security-action=\"revoke-passkey\"]').length || 0}; })()"
  );
  assert.equal(securityPanelState.passkeyActions, 1,
    "the User dashboard security panel should render its passkey controls: " + securityPanelState.text);
  assert.equal(security.available, true);
  assert.equal(security.passkeys.length, 1);
  assert.equal(security.sessions.length, 1);
  assert.equal(security.activeRecoveryKey, true);
  assert.equal(typeof security.passkeys[0].passkeyRef, "string");
  assert.equal("credentialId" in security.passkeys[0], false,
    "the security listing must not expose raw WebAuthn credential identifiers.");
  assert.equal("publicKey" in security.passkeys[0], false,
    "the security listing must not expose stored public-key material.");
  const firstPasskeyRef = security.passkeys[0].passkeyRef;

  await trustedClick("#account-security-add-passkey");
  await waitFor("second-step passkey creation control", () =>
    evaluate("Boolean(document.getElementById('account-security-create-passkey') && !document.getElementById('account-security-create-passkey').disabled)"), 45000);
  // Complete step-up on the original device first. Chrome's virtual
  // authenticator environment has one active authenticator at a time.
  await cdp("WebAuthn.removeVirtualAuthenticator", { authenticatorId });
  const secondaryVirtual = await cdp("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "usb",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
  authenticatorId = secondaryVirtual.authenticatorId;
  assert.ok(authenticatorId, "Chrome must activate the independent second virtual authenticator.");
  await trustedClick("#account-security-create-passkey");
  await waitFor("second passkey creation result", async () =>
    evaluate("({count:document.querySelectorAll('#account-security-panel [data-security-action=\"revoke-passkey\"]').length," +
      "feedback:document.getElementById('account-security-feedback')?.textContent || ''})")
      .then(value => value.count === 2 || Boolean(value.feedback && !value.feedback.includes('step-up verified'))), 45000);
  const passkeyCreationState = await evaluate(
    "({count:document.querySelectorAll('#account-security-panel [data-security-action=\"revoke-passkey\"]').length," +
    "feedback:document.getElementById('account-security-feedback')?.textContent || ''})"
  );
  assert.equal(passkeyCreationState.count, 2,
    "the second user gesture must complete the authenticator creation ceremony: " + passkeyCreationState.feedback);
  security = await evaluate(
    "fetch('/api/account/security',{credentials:'same-origin',cache:'no-store'}).then(r=>r.json())"
  );
  assert.equal(security.passkeys.length, 2, "fresh passkey step-up must permit a second account passkey.");
  const secondPasskey = security.passkeys.find(item => item.passkeyRef !== firstPasskeyRef);
  assert.ok(secondPasskey, "the second passkey must have its own opaque reference.");
  const credentialsAfterAdd = await cdp("WebAuthn.getCredentials", { authenticatorId });
  assert.equal(credentialsAfterAdd.credentials.length, 1,
    "the newly active independent authenticator must hold the additional resident passkey.");
  const secondCredential = credentialsAfterAdd.credentials[0];
  assert.notEqual(secondCredential.credentialId, firstCredentials.credentials[0].credentialId,
    "the additional authenticator must create a distinct credential ID.");
  assert.ok(secondCredential, "the newly added passkey must be separately represented by the authenticator.");

  // Establish the current browser session with the second passkey before
  // revoking the first one. The older session remains bound to the first
  // credential and must be invalidated when that credential is revoked.
  await cdp("Network.deleteCookies", { name: "acrown_account_session", url: baseUrl });
  await cdp("Page.reload", { ignoreCache: true });
  await waitFor("homepage before sign-in from the second device", () =>
    evaluate("document.readyState === 'complete' && Boolean(document.getElementById('open-account-dialog'))"));
  await waitFor("unauthenticated account UI has finished initializing", async () =>
    evaluate("fetch('/api/account/status',{credentials:'same-origin',cache:'no-store'}).then(async r => {" +
      "const value=await r.json(); const button=document.getElementById('open-account-dialog'); " +
      "return value.authenticated === false && button?.getAttribute('aria-label') === 'Log In to AstroCrown'; })"));
  await evaluate(
    "window.__secondDeviceOpenClick=0; const button=document.getElementById('open-account-dialog'); " +
    "button.addEventListener('click',()=>window.__secondDeviceOpenClick++);"
  );
  await trustedClick("#open-account-dialog");
  try {
    await waitFor("second-device sign-in dialog opens", () =>
      evaluate("Boolean(document.getElementById('account-dialog')?.open)"), 5000);
  } catch (error) {
    const state = await evaluate(
      "(() => { const b=document.getElementById('open-account-dialog'); const r=b.getBoundingClientRect(); " +
      "const hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2); " +
      "return {clicks:window.__secondDeviceOpenClick,disabled:b.disabled,ariaLabel:b.getAttribute('aria-label')," +
      "rect:{left:r.left,top:r.top,width:r.width,height:r.height}," +
      "hitId:hit?.id || '',hitTag:hit?.tagName || '',dialogOpen:document.getElementById('account-dialog')?.open," +
      "status:fetch('/api/account/status',{credentials:'same-origin'}).then(r=>r.json())}; })()"
    );
    throw new Error(error.message + " Browser header/dialog state: " + JSON.stringify(state));
  }
  await waitFor("second-device passkey sign-in button", () =>
    evaluate("Boolean(document.getElementById('account-passkey-signin'))"));
  await trustedClick("#account-passkey-signin");
  await waitFor("second-device account session", () =>
    evaluate("Boolean(document.getElementById('open-account-hub'))"), 45000);
  await trustedClick("#open-account-hub");
  await waitFor("User dashboard authenticated by second passkey", () =>
    evaluate("!document.getElementById('account-dashboard').hidden"));
  account = await status();
  assert.equal(account.authenticated, true);
  assert.equal(account.activeSessionCount, 2,
    "signing in with the second passkey must create a second session while retaining the first-device session.");
  await trustedClick("#account-security-manage");
  await waitFor("two passkeys and two sessions displayed", () =>
    evaluate("document.querySelectorAll('#account-security-panel [data-security-action=\"revoke-passkey\"]').length === 2"));

  const renameSelector = 'button[data-security-action="rename-passkey"][data-passkey-ref="' + secondPasskey.passkeyRef + '"]';
  const renameInputSelector = 'input[data-passkey-label-input="' + secondPasskey.passkeyRef + '"]';
  await evaluate("document.querySelector(" + JSON.stringify(renameInputSelector) + ").value='Secondary test authenticator'");
  await trustedClick(renameSelector);
  await waitFor("renamed passkey label", () =>
    evaluate("document.getElementById('account-security-panel').innerText.includes('Secondary test authenticator')"));
  security = await evaluate(
    "fetch('/api/account/security',{credentials:'same-origin',cache:'no-store'}).then(r=>r.json())"
  );
  assert.equal(security.passkeys.find(item => item.passkeyRef === secondPasskey.passkeyRef).label,
    "Secondary test authenticator", "passkey names must persist in D1.");

  await evaluate("window.confirm = function () { return true; };");
  await trustedClick('button[data-security-action="revoke-passkey"][data-passkey-ref="' + firstPasskeyRef + '"]');
  await waitFor("second passkey revoked", () =>
    evaluate("document.querySelectorAll('#account-security-panel [data-security-action=\"revoke-passkey\"]').length === 1"));
  security = await evaluate(
    "fetch('/api/account/security',{credentials:'same-origin',cache:'no-store'}).then(r=>r.json())"
  );
  assert.equal(security.passkeys.length, 1, "revoking one passkey must preserve the remaining active passkey.");
  assert.equal(security.passkeys[0].passkeyRef, secondPasskey.passkeyRef);
  account = await status();
  assert.equal(account.activeSessionCount, 1,
    "revoking the first passkey must also invalidate the older session that was established by that credential.");
  assert.equal(await evaluate("document.querySelector('#account-security-panel [data-security-action=\"revoke-passkey\"]').disabled"),
    true, "the last active passkey must not be removable from the normal management screen.");
  // Keep the remaining authenticator available for the recovery and session
  // tests. The server-side revocation is authoritative; no physical credential
  // deletion is needed to prove the credential is rejected by the backend.

  await trustedClick("#account-security-rotate-recovery-key");
  await waitFor("one-time replacement recovery key", () =>
    evaluate("Boolean(document.getElementById('account-security-recovery-key-value'))"), 45000);
  currentRecoveryKey = await evaluate("document.getElementById('account-security-recovery-key-value').value");
  assert.match(currentRecoveryKey, /^ACR1-[A-Za-z0-9_-]{43}$/);
  assert.notEqual(currentRecoveryKey, firstKey, "recovery-key replacement must issue a different high-entropy key.");
  const supersededRecoveryKey = await evaluate(
    "fetch('/api/account/recovery/options',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'}," +
    "body:JSON.stringify({accountIdentifier:" + JSON.stringify(identifier) +
    ",recoveryKey:" + JSON.stringify(firstKey) + "})}).then(async r=>({status:r.status,body:await r.json()}))"
  );
  assert.equal(supersededRecoveryKey.status, 401,
    "the previous offline recovery key must stop working immediately after rotation.");
  await trustedClick('[data-security-action="acknowledge-recovery-key"]');
  await waitFor("replacement recovery-key acknowledgement", () =>
    evaluate("!document.getElementById('account-security-recovery-key-value')"));

  // Create a second active server session without calling logout: clear only the
  // browser cookie, then sign in again. The first server-side session must remain
  // visible as an independently revocable session.
  await cdp("Network.deleteCookies", { name: "acrown_account_session", url: baseUrl });
  await cdp("Page.reload", { ignoreCache: true });
  await waitFor("homepage after clearing only the browser session cookie", () =>
    evaluate("document.readyState === 'complete' && Boolean(document.getElementById('open-account-dialog'))"));
  await trustedClick("#open-account-dialog");
  await waitFor("second-session passkey sign-in", () =>
    evaluate("Boolean(document.getElementById('account-passkey-signin'))"));
  await trustedClick("#account-passkey-signin");
  await waitFor("second server session created", () =>
    evaluate("Boolean(document.getElementById('open-account-hub'))"), 45000);
  await trustedClick("#open-account-hub");
  await waitFor("dashboard with second session", () =>
    evaluate("!document.getElementById('account-dashboard').hidden"));
  account = await status();
  assert.equal(account.authenticated, true);
  assert.equal(account.activeSessionCount, 2,
    "passkey re-authentication without revoking the previous server session must create two active sessions.");

  await trustedClick("#account-security-manage");
  await waitFor("two sessions displayed", () =>
    evaluate("document.querySelectorAll('#account-security-panel [data-security-action=\"revoke-session\"]').length === 1"));
  security = await evaluate(
    "fetch('/api/account/security',{credentials:'same-origin',cache:'no-store'}).then(r=>r.json())"
  );
  assert.equal(security.sessions.length, 2);
  assert.equal(security.sessions.filter(item => item.isCurrent).length, 1);
  assert.equal(security.sessions.filter(item => !item.isCurrent).length, 1);
  await evaluate("window.confirm = function () { return true; };");
  await trustedClick("#account-security-revoke-others");
  await waitFor("other session revoked", async () => {
    const value = await evaluate(
      "fetch('/api/account/security',{credentials:'same-origin',cache:'no-store'}).then(r=>r.json())"
    );
    return value.sessions.length === 1 && value.sessions[0].isCurrent === true;
  });
  account = await status();
  assert.equal(account.authenticated, true,
    "revoking other sessions must not revoke the current browser session.");
  assert.equal(account.activeSessionCount, 1);


  await evaluate("document.getElementById('account-signout').click()");
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

  await evaluate("document.getElementById('account-signout').click()");
  await waitFor("sign-out before recovery", async () => !(await status()).authenticated);
  await cdp("WebAuthn.removeCredential", {
    authenticatorId,
    credentialId: secondCredential.credentialId,
  });
  const afterLoss = await cdp("WebAuthn.getCredentials", { authenticatorId });
  assert.equal(afterLoss.credentials.length, 0, "the simulated lost passkey must be removed from the authenticator.");

  await trustedClick("#open-account-dialog");
  await waitFor("passkey recovery link", () => evaluate("Boolean(document.getElementById('account-recovery-start'))"));
  await trustedClick("#account-recovery-start");
  await waitFor("offline recovery form", () => evaluate("Boolean(document.getElementById('account-recovery-form'))"));
  await evaluate(
    "document.getElementById('account-recovery-identifier').value=" + JSON.stringify(identifier) + ";" +
    "document.getElementById('account-recovery-secret').value=" + JSON.stringify(currentRecoveryKey) + ";"
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
  assert.deepEqual(account.passkeyAlgorithmIds, [-48], "the replacement passkey registered during recovery must also use ML-DSA-44.");
  assert.equal(account.postQuantumPasskeyCount, 1, "recovery must not silently replace the post-quantum credential with a classical fallback.");
  assert.equal(account.recoveryKeyAvailable, true);
  assert.equal(account.activeSessionCount, 1);

  const oldKey = await evaluate(
    "fetch('/api/account/recovery/options',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'}," +
    "body:JSON.stringify({accountIdentifier:" + JSON.stringify(identifier) +
    ",recoveryKey:" + JSON.stringify(currentRecoveryKey) + "})}).then(async r=>({status:r.status,body:await r.json()}))"
  );
  assert.equal(oldKey.status, 401, "the consumed offline recovery key must no longer work.");

  const nextCredentials = await cdp("WebAuthn.getCredentials", { authenticatorId });
  assert.equal(nextCredentials.credentials.length, 1, "recovery must leave one replacement credential on the authenticator.");
  await trustedClick("#account-recovery-key-saved");
  await waitFor("replacement recovery key acknowledgement", () => evaluate("!document.getElementById('open-account-hub').disabled"));
  await trustedClick("#open-account-hub");
  await waitFor("User dashboard after recovery", () => evaluate("!document.getElementById('account-dashboard').hidden"));
  await evaluate("document.getElementById('account-signout').click()");
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
  assert.deepEqual(account.passkeyAlgorithmIds, [-48], "the replacement ML-DSA-44 credential must remain usable after a fresh discoverable sign-in.");
  assert.equal(account.postQuantumPasskeyCount, 1);

  console.log("PASS: Chrome virtual-authenticator account creation and sign-in; security step-up; additional passkey enrollment, label update and revocation; last-passkey protection; recovery-key rotation and prior-key rejection; concurrent-session listing and revocation; passkey-loss recovery and replacement sign-in.");
} catch (error) {
  console.error(String(error?.stack || error));
  try {
    const details = await evaluate(
      "({url:location.href,title:document.title,dialogOpen:Boolean(document.getElementById('account-dialog')?.open)," +
      "feedback:(document.getElementById('account-feedback')?.textContent || '').trim()," +
      "accountText:(document.getElementById('account-content')?.innerText || '').slice(0,1600)})"
    );
    console.error("Account UI diagnostics:", JSON.stringify(details));
  } catch (diagnosticError) {
    console.error("Account UI diagnostics unavailable:", String(diagnosticError?.message || diagnosticError));
  }
  console.error("Account API events:", JSON.stringify(apiEvents));
  if (browserStartError) console.error("Chrome launch error:", browserStartError);
  if (browserExit) console.error("Chrome exit:", JSON.stringify(browserExit));
  if (browserOutput) console.error("Chrome output:\n" + browserOutput);
  process.exitCode = 1;
} finally {
  if (socket) try { socket.close(); } catch {}
  if (browser && browser.exitCode === null) browser.kill("SIGTERM");
  await sleep(250);
  rmSync(temp, { recursive: true, force: true });
}
