import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { privateKeyToAccount } from "viem/accounts";
import { createServer } from "node:net";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
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


function sqlLiteral(value) {
  return "'" + String(value).replace(/'/g, "''") + "'";
}
function executeLocalD1Fixture(sql, label, expectFailure = false) {
  const file = join(temp, "admin-governance-fixture.sql");
  writeFileSync(file, sql, { mode: 0o600 });
  const result = spawnSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["wrangler", "d1", "execute", "acrown-account-staging", "--local", "--file", file],
    { cwd: process.cwd(), encoding: "utf8", timeout: 45000 }
  );
  if (expectFailure) return result;
  if (result.error || result.status !== 0) {
    throw new Error(label + " failed against local D1. " +
      String(result.error?.message || "") + "\n" +
      String(result.stderr || "") + "\n" + String(result.stdout || ""));
  }
  return result.stdout || "";
}
function resetLocalAdminWalletRateLimits(label) {
  // Reset only the disposable Wrangler --local test database. Production
  // anti-abuse limits are unchanged.
  executeLocalD1Fixture(
    "DELETE FROM auth_rate_events WHERE action IN (" +
      ["admin-wallet-enrollment-options","admin-wallet-enrollment-verify",
       "admin-wallet-step-up-options","admin-wallet-step-up-verify"].map(sqlLiteral).join(",") + ");",
    label
  );
}
async function setBrowserAccountSession(token) {
  const result = await cdp("Network.setCookie", {
    name: "acrown_account_session", value: token, url: baseUrl,
    httpOnly: true, sameSite: "Strict",
  });
  if (result.success === false) throw new Error("Chrome refused the local test account session cookie.");
}

async function installTestWalletProvider(address) {
  const js = "(" + function (walletAddress) {
    window.ethereum = {
      request: async function ({ method, params = [] }) {
        if (method === "eth_requestAccounts" || method === "eth_accounts") return [walletAddress];
        if (method === "eth_chainId") return "0x1";
        if (method === "personal_sign") {
          const encoded = params[0];
          if (typeof encoded !== "string" || !/^0x(?:[0-9a-f]{2})+$/i.test(encoded)) {
            throw new Error("Test wallet received a malformed EIP-191 message.");
          }
          const hex = encoded.slice(2);
          const bytes = new Uint8Array(hex.match(/.{2}/g).map(value => Number.parseInt(value, 16)));
          window.__acrownPendingWalletMessage = new TextDecoder().decode(bytes);
          return new Promise(resolve => { window.__acrownResolveWalletSignature = resolve; });
        }
        throw new Error("Test wallet method is not enabled: " + method);
      }
    };
    window.confirm = function () { return true; };
    return true;
  }.toString() + ")(" + JSON.stringify(address) + ")";
  await evaluate(js);
}
async function completeTestWalletSignature(account) {
  await trustedClick("#admin-wallet-proof-sign");
  const message = await waitFor("test wallet SIWE message", async () =>
    evaluate("window.__acrownPendingWalletMessage || null")
  );
  assert.equal(typeof message, "string");
  const signature = await account.signMessage({ message });
  await evaluate(
    "window.__acrownResolveWalletSignature(" + JSON.stringify(signature) + ");" +
    "window.__acrownPendingWalletMessage=null;window.__acrownResolveWalletSignature=null;true"
  );
}
async function connectTestWalletFromHeader(account) {
  await waitFor("header wallet connect request", async () =>
    evaluate("document.documentElement.getAttribute('data-admin-wallet-connect-pending') === 'true'")
  );
  await trustedClick("#wallet-connect-trigger");
  await waitFor("administrator signature review dialog", async () =>
    evaluate("Boolean(document.getElementById('admin-wallet-proof-dialog')?.open)")
  );
  await completeTestWalletSignature(account);
}
async function testAdminWalletDashboardUi(rootAccount, secondWalletAccount) {
  const uiAdditionalWalletAccount = privateKeyToAccount("0x" + "66".repeat(32));
  resetLocalAdminWalletRateLimits("Reset disposable local wallet-test throttles before header/dashboard UI qualification");
  const ended = await postWorkerJson("/api/admin/wallet-logout", {});
  assert.equal(ended.status, 200);
  assert.equal(ended.body.authenticated, true);
  assert.equal(ended.body.adminSessionAuthorized, false);

  await evaluate("window.location.hash='#admin';true");
  await waitFor("ordinary account after admin step-up logout", async () =>
    evaluate(
      "window.location.hash === '#account' && " +
      "!document.getElementById('account-dashboard').hidden && " +
      "Boolean(document.getElementById('account-admin-wallet-access'))"
    )
  );

  await installTestWalletProvider(rootAccount.address);
  await trustedClick("#account-admin-wallet-access");
  await waitFor("administrator access confirmation", async () =>
    evaluate("Boolean(document.getElementById('admin-access-dialog')?.open)")
  );
  await trustedClick("#admin-access-continue");
  await connectTestWalletFromHeader(rootAccount);
  await waitFor("server-verified Administrator dashboard", async () =>
    evaluate(
      "window.location.hash === '#admin' && " +
      "!document.getElementById('admin-dashboard').hidden"
    )
  );
  assert.equal(
    await evaluate("document.querySelectorAll('#admin-dashboard-content [data-admin-wallet-revoke=\"true\"]').length"),
    0,
    "the dashboard must not offer removal of the last active administrator wallet."
  );

  // Add a second, distinct EVM wallet using the same shared header Wallet
  // button and the separate one-time enrollment signature.
  await installTestWalletProvider(uiAdditionalWalletAccount.address);
  await evaluate(
    "window.__acrownWalletUiTrace=[];" +
    "document.getElementById('admin-dashboard-content').addEventListener('click',event=>{" +
    "const button=event.target?.closest?.('button');" +
    "window.__acrownWalletUiTrace.push({type:'click',id:event.target?.id||'',tag:event.target?.tagName||''," +
    "closestButtonId:button?.id||'',closestButtonDisabled:button?.disabled??null," +
    "insideAdmin:!!button&&document.getElementById('admin-dashboard-content').contains(button)});" +
    "},true);" +
    "document.addEventListener('astrocrown:request-admin-wallet-enrollment',()=>{" +
    "window.__acrownWalletUiTrace.push({type:'request-admin-wallet-enrollment'});" +
    "});true"
  );
  const addWalletButtonState = await evaluate(
    "(() => {const b=document.getElementById('admin-add-wallet');" +
    "const r=b?.getBoundingClientRect();const hit=r&&document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);" +
    "return {exists:!!b,disabled:!!b?.disabled,outerHTML:b?.outerHTML||'',tag:hit?.tagName||'',hitId:hit?.id||''," +
    "closestButtonId:hit?.closest?.('button')?.id||'',insideAdmin:!!b&&document.getElementById('admin-dashboard-content').contains(b)};})()"
  );
  assert.ok(addWalletButtonState.exists && !addWalletButtonState.disabled && addWalletButtonState.insideAdmin,
    "Add another wallet must be an enabled Admin dashboard control: " + JSON.stringify(addWalletButtonState));
  await trustedClick("#admin-add-wallet");
  const enrollmentUiTrace = await waitFor("administrator wallet enrollment button trace", async () =>
    evaluate("window.__acrownWalletUiTrace.length ? window.__acrownWalletUiTrace : null")
  );
  if (!enrollmentUiTrace.some(item => item.type === "request-admin-wallet-enrollment")) {
    throw new Error("The Add another wallet button click did not dispatch its enrollment request: " +
      JSON.stringify(enrollmentUiTrace) + "; feedback=" +
      await evaluate("document.getElementById('admin-wallet-enrollment-feedback')?.textContent || ''"));
  }
  await connectTestWalletFromHeader(uiAdditionalWalletAccount);
  await waitFor("User dashboard after additional wallet enrollment", async () =>
    evaluate(
      "window.location.hash === '#account' && " +
      "!document.getElementById('account-dashboard').hidden"
    )
  );

  // Enrollment invalidates the old step-up. Re-enter using the newly added
  // second wallet and the same shared header button.
  await trustedClick("#account-admin-wallet-access");
  await waitFor("administrator access confirmation after enrollment", async () =>
    evaluate("Boolean(document.getElementById('admin-access-dialog')?.open)")
  );
  await trustedClick("#admin-access-continue");
  await connectTestWalletFromHeader(uiAdditionalWalletAccount);
  await waitFor("Administrator dashboard after second-wallet step-up", async () =>
    evaluate(
      "window.location.hash === '#admin' && " +
      "!document.getElementById('admin-dashboard').hidden"
    )
  );

  const beforeRevoke = await getWorkerJson("/api/admin/wallet-options");
  assert.equal(beforeRevoke.status, 200);
  assert.equal(beforeRevoke.body.wallets.length, 2);
  assert.equal(
    await evaluate("document.querySelectorAll('#admin-dashboard-content [data-admin-wallet-revoke=\"true\"]').length"),
    2,
    "each wallet should have a revoke control while another active wallet remains."
  );

  const rootSelector = "#admin-dashboard-content [data-admin-wallet-revoke='true'][data-wallet-address='" + rootAccount.address + "']";
  await evaluate(
    "window.__adminWalletRevokeClickTrace=[];" +
    "document.addEventListener('click',event=>{" +
    "const button=event.target?.closest?.('[data-admin-wallet-revoke=\"true\"]');" +
    "if(button)window.__adminWalletRevokeClickTrace.push({address:button.dataset.walletAddress,disabled:button.disabled,defaultPrevented:event.defaultPrevented});" +
    "},true);window.confirm=()=>true;true"
  );
  const preRevokeButton = await evaluate(
    "(() => {const b=document.querySelector(" + JSON.stringify(rootSelector) + ");" +
    "if(!b)return null;const r=b.getBoundingClientRect();const h=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);" +
    "return {disabled:b.disabled,address:b.dataset.walletAddress,chainId:b.dataset.walletChainId," +
    "hitId:h?.id||'',hitTag:h?.tagName||'',visible:!!(r.width&&r.height)};})()"
  );
  assert.ok(preRevokeButton && !preRevokeButton.disabled && preRevokeButton.visible,
    "the other-wallet revoke control must be interactable: " + JSON.stringify(preRevokeButton));
  await trustedClick(rootSelector);
  await waitFor("wallet revoke button click event", async () =>
    evaluate("window.__adminWalletRevokeClickTrace.length > 0")
  );
  await waitFor("wallet revocation UI refresh", async () =>
    evaluate(
      "window.location.hash === '#admin' && " +
      "!document.getElementById('admin-dashboard').hidden && " +
      "document.querySelectorAll('#admin-dashboard-content [data-admin-wallet-revoke=\"true\"]').length === 0"
    )
  );
  const afterRevoke = await getWorkerJson("/api/admin/wallet-options");
  assert.equal(afterRevoke.status, 200);
  assert.equal(afterRevoke.body.wallets.length, 1);
  assert.equal(afterRevoke.body.wallets[0].address.toLowerCase(), uiAdditionalWalletAccount.address.toLowerCase());
  const currentAdmin = await getWorkerJson("/api/admin/status");
  assert.equal(currentAdmin.status, 200,
    "revoking another wallet must preserve the wallet currently authorizing this administrator session.");

  await trustedClick("#admin-end-access");
  await waitFor("User dashboard after admin access ended in UI", async () =>
    evaluate(
      "window.location.hash === '#account' && " +
      "!document.getElementById('account-dashboard').hidden"
    )
  );
  const ordinary = await status();
  assert.equal(ordinary.authenticated, true);
  assert.equal(ordinary.role, "admin");
  assert.equal(ordinary.adminSessionAuthorized, false);
  console.log("PASS: shared homepage Wallet UI, explicit Administrator access confirmation, signature-review dialog, server step-up, additional wallet enrollment, visible wallet revocation controls, retained current wallet session, and ordinary-session preservation.");
}

async function postWorkerJson(path, payload) {
  const body = JSON.stringify(payload);
  return evaluate(
    "fetch(" + JSON.stringify(path) + ",{method:'POST',credentials:'same-origin'," +
    "headers:{'Content-Type':'application/json'},body:" + JSON.stringify(body) + "})" +
    ".then(async r=>({status:r.status,body:await r.json()}))"
  );
}
async function getWorkerJson(path) {
  return evaluate(
    "fetch(" + JSON.stringify(path) + ",{credentials:'same-origin',cache:'no-store'})" +
    ".then(async r=>({status:r.status,body:await r.json()}))"
  );
}
async function signSiwe(account, challenge) {
  assert.equal(challenge.status, 200, JSON.stringify(challenge.body));
  assert.equal(challenge.body.transactionAuthorized, false);
  assert.match(challenge.body.message, /wants you to sign in with your Ethereum account:/);
  assert.ok(challenge.body.message.includes("Version: 1"));
  assert.ok(challenge.body.message.includes("Chain ID: 1"));
  assert.ok(challenge.body.message.includes("Nonce: "));
  assert.ok(challenge.body.message.includes("Expiration Time: "));
  assert.ok(challenge.body.message.includes("does not authorize a transaction."));
  const signature = await account.signMessage({ message: challenge.body.message });
  return {
    challengeId: challenge.body.challengeId,
    message: challenge.body.message,
    signature,
  };
}
async function stepUpAdminWallet(account) {
  const challenge = await postWorkerJson("/api/admin/wallet-challenge", {
    address: account.address,
    chainId: 1,
  });
  assert.equal(challenge.status, 200, JSON.stringify(challenge.body));
  assert.equal(challenge.body.purpose, "administrator-session-step-up");
  const proof = await signSiwe(account, challenge);
  return postWorkerJson("/api/admin/wallet-verify", proof);
}
async function enrollAdminWallet(account) {
  const challenge = await postWorkerJson("/api/admin/wallet-enrollment-challenge", {
    address: account.address,
    chainId: 1,
  });
  assert.equal(challenge.status, 200, JSON.stringify(challenge.body));
  assert.equal(challenge.body.purpose, "administrator-wallet-enrollment");
  const proof = await signSiwe(account, challenge);
  return postWorkerJson("/api/admin/wallet-enrollment-verify", proof);
}
async function testAdminGovernanceFixture(accountIdentifier) {
  // Local-only fixture: seed the first administrator ROLE and its separately
  // delegable permissions. Real EIP-4361 wallet enrollment and EIP-191
  // signature recovery then run through the Worker API below. Private keys
  // here are deterministic test vectors only and never enter Worker config.
  const cookies = await cdp("Network.getCookies", { urls: [baseUrl] });
  const rootCookie = (cookies.cookies || []).find(item => item.name === "acrown_account_session" && item.value);
  assert.ok(rootCookie, "the initial test account needs an active ordinary session.");
  const rootToken = rootCookie.value;
  const rootHash = createHash("sha256").update(rootToken).digest("base64url");
  const rootAccount = privateKeyToAccount("0x" + "11".repeat(32));
  const secondWalletAccount = privateKeyToAccount("0x" + "22".repeat(32));
  const thirdWalletAccount = privateKeyToAccount("0x" + "33".repeat(32));
  const targetWalletAccount = privateKeyToAccount("0x" + "44".repeat(32));
  const wrongSigner = privateKeyToAccount("0x" + "55".repeat(32));
  const targetAccountId = "fixture-admin-target-" + randomUUID();
  const successorAccountId = "fixture-admin-successor-" + randomUUID();
  const targetIdentifier = "AC-" + randomBytes(5).toString("hex").toUpperCase();
  const successorIdentifier = "AC-" + randomBytes(5).toString("hex").toUpperCase();
  const targetHandle = randomBytes(32).toString("base64url");
  const successorHandle = randomBytes(32).toString("base64url");
  const targetToken = randomBytes(32).toString("base64url");
  const targetHash = createHash("sha256").update(targetToken).digest("base64url");
  const now = Math.floor(Date.now() / 1000);
  const createdAt = new Date().toISOString();
  const sql = [
    "INSERT INTO auth_admin_roles(account_id,granted_by_account_id,reason,created_at) " +
      "SELECT account_id,NULL,'hosted local test fixture bootstrap'," + sqlLiteral(createdAt) +
      " FROM auth_accounts WHERE account_identifier=" + sqlLiteral(accountIdentifier) + ";",
    "INSERT INTO auth_admin_permissions(account_id,permission,can_delegate,granted_by_account_id,reason,created_at) " +
      "SELECT account_id,'admin.roles.grant',1,NULL,'hosted local test fixture'," + sqlLiteral(createdAt) +
      " FROM auth_accounts WHERE account_identifier=" + sqlLiteral(accountIdentifier) + ";",
    "INSERT INTO auth_admin_permissions(account_id,permission,can_delegate,granted_by_account_id,reason,created_at) " +
      "SELECT account_id,'admin.roles.revoke',1,NULL,'hosted local test fixture'," + sqlLiteral(createdAt) +
      " FROM auth_accounts WHERE account_identifier=" + sqlLiteral(accountIdentifier) + ";",
    "INSERT INTO auth_accounts(account_id,account_identifier,user_handle,created_at,avatar_id,referral_id,terms_version,terms_accepted_at,role) VALUES (" +
      [targetAccountId,targetIdentifier,targetHandle,createdAt,"person","","development-terms-2026-10-31-v0.3",createdAt,"user"].map(sqlLiteral).join(",") + ");",
    "INSERT INTO auth_accounts(account_id,account_identifier,user_handle,created_at,avatar_id,referral_id,terms_version,terms_accepted_at,role) VALUES (" +
      [successorAccountId,successorIdentifier,successorHandle,createdAt,"person","","development-terms-2026-10-31-v0.3",createdAt,"user"].map(sqlLiteral).join(",") + ");",
    "INSERT INTO auth_sessions(token_hash,account_id,session_ref,authenticated_credential_id,created_at,expires_at) VALUES (" +
      [targetHash,targetAccountId,randomBytes(16).toString("hex"),null,now,now+1800].map(sqlLiteral).join(",") + ");",
  ].join("\n");
  executeLocalD1Fixture(sql, "Seed local administrator role fixture");

  const unsupportedPermissionInsert = executeLocalD1Fixture(
    "INSERT INTO auth_admin_permissions(account_id,permission,can_delegate,granted_by_account_id,reason,created_at) " +
      "SELECT account_id,'admin.messages.send',0,NULL,'unsupported permission constraint test'," + sqlLiteral(createdAt) +
      " FROM auth_admin_roles WHERE account_id=(SELECT account_id FROM auth_accounts WHERE account_identifier=" +
      sqlLiteral(accountIdentifier) + ");",
    "Attempt direct insertion of an unimplemented administrator permission",
    true
  );
  assert.notEqual(unsupportedPermissionInsert.status, 0,
    "the D1 schema must reject administrator permissions for actions that are not implemented.");
  assert.match(String(unsupportedPermissionInsert.stderr || "") + String(unsupportedPermissionInsert.stdout || ""),
    /check constraint failed/i);

  let rootStatus = await status();
  assert.equal(rootStatus.role, "admin");
  assert.equal(rootStatus.adminRoleAssigned, true);
  assert.equal(rootStatus.adminSessionAuthorized, false);
  assert.deepEqual(rootStatus.adminPermissions, ["admin.roles.grant", "admin.roles.revoke"]);
  assert.deepEqual(rootStatus.adminDelegablePermissions, ["admin.roles.grant", "admin.roles.revoke"]);
  const noStepUp = await getWorkerJson("/api/admin/status");
  assert.equal(noStepUp.status, 403, "role assignment alone must not authorize the Administrator dashboard.");

  const emptyWallets = await getWorkerJson("/api/admin/wallet-options");
  assert.equal(emptyWallets.status, 200);
  assert.deepEqual(emptyWallets.body.wallets, []);
  assert.equal(emptyWallets.body.maxWallets, 3);

  // Invalid EIP-191 signature consumes the enrollment challenge. A later
  // correct signature against the same challenge must be rejected as replay.
  const invalidEnrollmentChallenge = await postWorkerJson("/api/admin/wallet-enrollment-challenge", {
    address: rootAccount.address,
    chainId: 1,
  });
  assert.equal(invalidEnrollmentChallenge.status, 200);
  const invalidEnrollmentSignature = await wrongSigner.signMessage({
    message: invalidEnrollmentChallenge.body.message,
  });
  const invalidEnrollment = await postWorkerJson("/api/admin/wallet-enrollment-verify", {
    challengeId: invalidEnrollmentChallenge.body.challengeId,
    message: invalidEnrollmentChallenge.body.message,
    signature: invalidEnrollmentSignature,
  });
  assert.equal(invalidEnrollment.status, 401, "a signature from another EOA must not enroll the proposed wallet.");
  const replayedEnrollmentSignature = await rootAccount.signMessage({
    message: invalidEnrollmentChallenge.body.message,
  });
  const replayedEnrollment = await postWorkerJson("/api/admin/wallet-enrollment-verify", {
    challengeId: invalidEnrollmentChallenge.body.challengeId,
    message: invalidEnrollmentChallenge.body.message,
    signature: replayedEnrollmentSignature,
  });
  assert.equal(replayedEnrollment.status, 401, "a failed signature must consume its one-use SIWE enrollment challenge.");

  const enrolledRoot = await enrollAdminWallet(rootAccount);
  assert.equal(enrolledRoot.status, 200, JSON.stringify(enrolledRoot.body));
  assert.equal(enrolledRoot.body.adminRoleAssigned, true);
  assert.equal(enrolledRoot.body.adminWalletCount, 1);
  assert.equal(enrolledRoot.body.adminWalletAuthenticated, false);
  assert.equal(enrolledRoot.body.adminSessionAuthorized, false);
  assert.equal(enrolledRoot.body.transactionAuthorized, false);
  assert.equal(enrolledRoot.body.walletEnrolledAddress.toLowerCase(), rootAccount.address.toLowerCase());

  const duplicateRootWallet = await postWorkerJson("/api/admin/wallet-enrollment-challenge", {
    address: rootAccount.address,
    chainId: 1,
  });
  assert.equal(duplicateRootWallet.status, 409, "an already enrolled wallet cannot be enrolled again.");

  // Enrollment does not grant admin access. A separate signature-purpose
  // challenge is required to create a ten-minute administrator session.
  const wrongStepUpChallenge = await postWorkerJson("/api/admin/wallet-challenge", {
    address: rootAccount.address,
    chainId: 1,
  });
  assert.equal(wrongStepUpChallenge.status, 200);
  const wrongStepUpSignature = await wrongSigner.signMessage({
    message: wrongStepUpChallenge.body.message,
  });
  const wrongStepUp = await postWorkerJson("/api/admin/wallet-verify", {
    challengeId: wrongStepUpChallenge.body.challengeId,
    message: wrongStepUpChallenge.body.message,
    signature: wrongStepUpSignature,
  });
  assert.equal(wrongStepUp.status, 401);
  const replayedStepUpSignature = await rootAccount.signMessage({
    message: wrongStepUpChallenge.body.message,
  });
  const replayedStepUp = await postWorkerJson("/api/admin/wallet-verify", {
    challengeId: wrongStepUpChallenge.body.challengeId,
    message: wrongStepUpChallenge.body.message,
    signature: replayedStepUpSignature,
  });
  assert.equal(replayedStepUp.status, 401, "a failed signature must consume its one-use session step-up challenge.");

  const rootStepUp = await stepUpAdminWallet(rootAccount);
  assert.equal(rootStepUp.status, 200, JSON.stringify(rootStepUp.body));
  assert.equal(rootStepUp.body.adminSessionAuthorized, true);
  assert.equal(rootStepUp.body.adminWalletAuthenticated, true);
  assert.equal(rootStepUp.body.adminWalletAddress.toLowerCase(), rootAccount.address.toLowerCase());
  assert.ok(Date.parse(rootStepUp.body.adminSessionExpiresAt) <= Date.now() + 610000,
    "administrator step-up must not exceed ten minutes.");
  assert.equal((await getWorkerJson("/api/admin/status")).status, 200);

  // Add a second independent EOA while the first wallet has an active
  // administrator step-up. Enrollment invalidates the old admin step-up.
  const enrolledSecond = await enrollAdminWallet(secondWalletAccount);
  assert.equal(enrolledSecond.status, 200, JSON.stringify(enrolledSecond.body));
  assert.equal(enrolledSecond.body.adminWalletCount, 2);
  assert.equal(enrolledSecond.body.adminSessionAuthorized, false);
  assert.equal((await postWorkerJson("/api/admin/wallet-enrollment-challenge", {
    address: thirdWalletAccount.address,
    chainId: 1,
  })).status, 403, "additional wallet enrollment requires another fresh signature after inventory changes.");

  resetLocalAdminWalletRateLimits("Reset disposable local wallet-test throttles between enrollment devices");
  const secondStepUp = await stepUpAdminWallet(secondWalletAccount);
  assert.equal(secondStepUp.status, 200, JSON.stringify(secondStepUp.body));
  assert.equal(secondStepUp.body.adminSessionAuthorized, true);
  const enrolledThird = await enrollAdminWallet(thirdWalletAccount);
  assert.equal(enrolledThird.status, 200, JSON.stringify(enrolledThird.body));
  assert.equal(enrolledThird.body.adminWalletCount, 3);
  assert.equal(enrolledThird.body.adminSessionAuthorized, false);

  const fullWalletRegistry = await getWorkerJson("/api/admin/wallet-options");
  assert.equal(fullWalletRegistry.status, 200);
  assert.equal(fullWalletRegistry.body.wallets.length, 3);
  assert.equal(fullWalletRegistry.body.maxWallets, 3);
  const stepUpThird = await stepUpAdminWallet(thirdWalletAccount);
  assert.equal(stepUpThird.status, 200, JSON.stringify(stepUpThird.body));

  const fourthWalletLimit = await postWorkerJson("/api/admin/wallet-enrollment-challenge", {
    address: wrongSigner.address,
    chainId: 1,
  });
  assert.equal(fourthWalletLimit.status, 409, "the fourth active administrator wallet must be refused.");

  const revokedSecondWallet = await postWorkerJson("/api/admin/wallet-revoke", {
    address: secondWalletAccount.address,
    chainId: 1,
  });
  assert.equal(revokedSecondWallet.status, 200, JSON.stringify(revokedSecondWallet.body));
  assert.equal(revokedSecondWallet.body.adminWalletCount, 2);
  assert.equal(revokedSecondWallet.body.adminSessionAuthorized, true,
    "revoking a different wallet must preserve the current wallet-verified administrator session.");

  const revokedCurrentWallet = await postWorkerJson("/api/admin/wallet-revoke", {
    address: thirdWalletAccount.address,
    chainId: 1,
  });
  assert.equal(revokedCurrentWallet.status, 200, JSON.stringify(revokedCurrentWallet.body));
  assert.equal(revokedCurrentWallet.body.adminWalletCount, 1);
  assert.equal(revokedCurrentWallet.body.adminSessionAuthorized, false,
    "revoking the wallet used for this admin session must end its administrator step-up.");
  assert.equal(revokedCurrentWallet.body.adminRoleAssigned, true,
    "wallet revocation must not revoke the separate administrator role.");

  const rootBeforeLastRemoval = await stepUpAdminWallet(rootAccount);
  assert.equal(rootBeforeLastRemoval.status, 200, JSON.stringify(rootBeforeLastRemoval.body));
  const lastWalletRemoval = await postWorkerJson("/api/admin/wallet-revoke", {
    address: rootAccount.address,
    chainId: 1,
  });
  assert.equal(lastWalletRemoval.status, 409,
    "the last active administrator wallet must be protected even after a fresh step-up.");

  const endedAdminSession = await postWorkerJson("/api/admin/wallet-logout", {});
  assert.equal(endedAdminSession.status, 200);
  assert.equal(endedAdminSession.body.authenticated, true);
  assert.equal(endedAdminSession.body.adminSessionAuthorized, false,
    "ending administrator access must preserve the ordinary account session.");
  assert.equal((await getWorkerJson("/api/admin/status")).status, 403);
  const rootReadyForGovernance = await stepUpAdminWallet(rootAccount);
  assert.equal(rootReadyForGovernance.status, 200);

  const selfGrant = await postWorkerJson("/api/admin/roles/grant", {
    accountIdentifier,
    reason: "Prevent self appointment",
    permissions: [],
  });
  assert.equal(selfGrant.status, 400);

  const overDelegation = await postWorkerJson("/api/admin/roles/grant", {
    accountIdentifier: targetIdentifier,
    reason: "Attempt to delegate an unavailable permission",
    permissions: ["admin.messages.send"],
  });
  assert.equal(overDelegation.status, 400,
    "permissions without an implemented server operation must not be assignable.");

  const granted = await postWorkerJson("/api/admin/roles/grant", {
    accountIdentifier: targetIdentifier,
    reason: "Appoint reviewed member",
    permissions: ["admin.roles.grant"],
  });
  assert.equal(granted.status, 200, JSON.stringify(granted.body));
  assert.equal(granted.body.role, "admin");
  assert.deepEqual(granted.body.adminPermissions, ["admin.roles.grant"]);
  assert.equal(granted.body.adminWalletCount, 0);
  assert.equal(granted.body.walletEnrolled, false);

  const duplicate = await postWorkerJson("/api/admin/roles/grant", {
    accountIdentifier: targetIdentifier,
    reason: "Duplicate appointment",
    permissions: [],
  });
  assert.equal(duplicate.status, 409);

  await setBrowserAccountSession(targetToken);
  const targetState = await status();
  assert.equal(targetState.role, "admin");
  assert.equal(targetState.adminSessionAuthorized, false);
  assert.deepEqual(targetState.adminPermissions, ["admin.roles.grant"]);
  assert.deepEqual(targetState.adminDelegablePermissions, []);

  const targetWalletEnrollment = await enrollAdminWallet(targetWalletAccount);
  assert.equal(targetWalletEnrollment.status, 200, JSON.stringify(targetWalletEnrollment.body));
  assert.equal(targetWalletEnrollment.body.adminWalletCount, 1);
  assert.equal(targetWalletEnrollment.body.adminSessionAuthorized, false);
  const targetStepUp = await stepUpAdminWallet(targetWalletAccount);
  assert.equal(targetStepUp.status, 200, JSON.stringify(targetStepUp.body));
  assert.equal(targetStepUp.body.adminSessionAuthorized, true);

  const targetEscalation = await postWorkerJson("/api/admin/roles/grant", {
    accountIdentifier: successorIdentifier,
    reason: "Attempt to re-delegate a non-delegable permission",
    permissions: ["admin.roles.grant"],
  });
  assert.equal(targetEscalation.status, 403);

  const targetUnauthorizedRevoke = await postWorkerJson("/api/admin/roles/revoke", {
    accountIdentifier,
    reason: "Attempt revoke without separate permission",
  });
  assert.equal(targetUnauthorizedRevoke.status, 403);

  // Simulate the owner/NOVA invalidating every enrolled wallet after a
  // security review. A passkey-only account session must not be able to
  // replace the complete admin-wallet set and silently restore admin access.
  const walletLossAuditId = randomBytes(16).toString("hex");
  const walletLossAt = new Date().toISOString();
  executeLocalD1Fixture([
    "INSERT INTO auth_admin_wallet_audit(audit_id,event_type,account_id,wallet_id,address,chain_id,created_at,detail_json) " +
      "SELECT " + sqlLiteral(walletLossAuditId) + ",'admin_wallet_revoked',account_id,wallet_id,address,chain_id," +
      sqlLiteral(walletLossAt) + "," + sqlLiteral(JSON.stringify({ reason: "test-only simulated all-wallet invalidation" })) +
      " FROM auth_admin_wallets WHERE account_id=" + sqlLiteral(targetAccountId) + " AND active=1;",
    "UPDATE auth_admin_wallets SET active=0 WHERE account_id=" + sqlLiteral(targetAccountId) + " AND active=1;",
  ].join("\n"), "Simulate owner-authorized invalidation of all target admin wallets");
  await setBrowserAccountSession(targetToken);
  const walletLossState = await status();
  assert.equal(walletLossState.authenticated, true);
  assert.equal(walletLossState.role, "admin");
  assert.equal(walletLossState.adminRoleAssigned, true);
  assert.equal(walletLossState.adminWalletCount, 0);
  assert.equal(walletLossState.adminWalletEverEnrolled, true);
  assert.equal(walletLossState.adminWalletRecoveryRequired, true);
  assert.equal(walletLossState.adminSessionAuthorized, false);
  resetLocalAdminWalletRateLimits("Reset local wallet-test throttles before all-wallet-loss negative case");
  const selfServiceWalletRecovery = await postWorkerJson("/api/admin/wallet-enrollment-challenge", {
    address: wrongSigner.address,
    chainId: 1,
  });
  assert.equal(selfServiceWalletRecovery.status, 409,
    "an ordinary passkey session must not replace every previously registered admin wallet.");
  assert.match(selfServiceWalletRecovery.body.error, /owner-authorized recovery/i);
  await evaluate("window.location.hash='#home';true");
  await evaluate("window.location.hash='#admin';true");
  await waitFor("User dashboard after all-wallet-loss admin route denial", async () =>
    evaluate(
      "window.location.hash === '#account' && " +
      "!document.getElementById('account-dashboard').hidden && " +
      "Boolean(document.querySelector('.account-admin-access-card'))"
    )
  );
  const walletLossUi = await evaluate(
    "(() => {const card=document.querySelector('.account-admin-access-card');" +
    "const button=document.getElementById('account-admin-wallet-access');" +
    "return {text:card?.innerText||'',disabled:!!button?.disabled,label:button?.textContent?.trim()||''};})()"
  );
  assert.match(walletLossUi.text, /owner-authorized recovery review is required/i);
  assert.equal(walletLossUi.disabled, true,
    "the User dashboard must not present self-service admin wallet recovery as available.");
  assert.equal(walletLossUi.label, "Administrator recovery required");

  await setBrowserAccountSession(rootToken);
  const rootFinalStepUp = await stepUpAdminWallet(rootAccount);
  assert.equal(rootFinalStepUp.status, 200, JSON.stringify(rootFinalStepUp.body));
  const revoked = await postWorkerJson("/api/admin/roles/revoke", {
    accountIdentifier: targetIdentifier,
    reason: "Remove reviewed administrator authority",
  });
  assert.equal(revoked.status, 200, JSON.stringify(revoked.body));
  assert.equal(revoked.body.revoked, true);
  assert.equal(revoked.body.role, "user");
  assert.equal(revoked.body.revokedWalletCount, 0,
    "the wallet was already inactive after the all-wallet-loss recovery test.");
  assert.deepEqual(revoked.body.revokedPermissions, ["admin.roles.grant"]);

  await setBrowserAccountSession(targetToken);
  const afterRevocation = await status();
  assert.equal(afterRevocation.authenticated, true);
  assert.equal(afterRevocation.role, "user");
  assert.equal(afterRevocation.adminRoleAssigned, false);
  assert.equal(afterRevocation.adminSessionAuthorized, false);
  assert.equal(afterRevocation.adminWalletCount, 0);
  assert.equal(afterRevocation.administratorRevocationNotice.reason, "Remove reviewed administrator authority");
  const noticeId = afterRevocation.administratorRevocationNotice.noticeId;

  await setBrowserAccountSession(rootToken);
  const crossAccountAck = await postWorkerJson("/api/account/administrator-notice/acknowledge", { noticeId });
  assert.equal(crossAccountAck.status, 404);

  await setBrowserAccountSession(targetToken);
  const ack = await postWorkerJson("/api/account/administrator-notice/acknowledge", { noticeId });
  assert.equal(ack.status, 200);
  assert.equal(ack.body.role, "user");
  assert.equal(ack.body.administratorRevocationNotice, null);

  await setBrowserAccountSession(rootToken);
  rootStatus = await status();
  assert.equal(rootStatus.role, "admin");
  assert.equal(rootStatus.adminSessionAuthorized, true);

  const auditTamper = executeLocalD1Fixture(
    "UPDATE auth_admin_governance_audit SET detail_json='{}' WHERE event_type='admin_role_granted';",
    "Attempted governance audit tamper",
    true
  );
  assert.notEqual(auditTamper.status, 0, "administrator audit must be immutable at the database layer.");
  assert.match(String(auditTamper.stderr || "") + String(auditTamper.stdout || ""), /append-only/i);
  const walletAuditTamper = executeLocalD1Fixture(
    "UPDATE auth_admin_wallet_audit SET detail_json='{}' WHERE event_type='admin_wallet_enrolled';",
    "Attempted wallet audit tamper",
    true
  );
  assert.notEqual(walletAuditTamper.status, 0, "administrator wallet audit must be immutable at the database layer.");
  assert.match(String(walletAuditTamper.stderr || "") + String(walletAuditTamper.stdout || ""), /append-only/i);

  await testAdminWalletDashboardUi(rootAccount, secondWalletAccount);
  console.log("PASS: local admin role/permission governance plus real EIP-4361/EIP-191 wallet enrollment, nonce replay rejection, distinct ten-minute wallet step-up, three-wallet limit, self-revocation safety, admin-session logout, and target-only notice lifecycle.");
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
  assert.equal(account.adminRoleAssigned, false);
  assert.equal(account.adminSessionAuthorized, false);
  assert.equal(account.adminPermissions.length, 0);
  assert.equal(account.recoveryKeyAvailable, true);

  const ordinaryRoleGrantAttempt = await evaluate(
    "fetch('/api/admin/roles/grant',{method:'POST',credentials:'same-origin'," +
    "headers:{'Content-Type':'application/json'}," +
    "body:JSON.stringify({accountIdentifier:" + JSON.stringify(identifier) +
    ",reason:'Attempted ordinary-account self promotion',permissions:['admin.roles.grant']})})" +
    ".then(async r=>({status:r.status,body:await r.json()}))"
  );
  assert.equal(ordinaryRoleGrantAttempt.status, 403,
    "an ordinary passkey-authenticated member must not grant an administrator role, including to themselves.");
  const ordinaryAdminDashboardAttempt = await evaluate(
    "fetch('/api/admin/status',{credentials:'same-origin',cache:'no-store'})" +
    ".then(async r=>({status:r.status,body:await r.json()}))"
  );
  assert.equal(ordinaryAdminDashboardAttempt.status, 403,
    "an ordinary account must not enter the Administrator dashboard by changing client state or supplying a role.");
  account = await status();
  assert.equal(account.role, "user");
  assert.equal(account.adminRoleAssigned, false);
  assert.equal(account.admin, false);


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
  // The development notice intentionally reappears on every fresh homepage
  // load. Acknowledge it as a user would before interacting with the header.
  const secondNoticeOpen = await evaluate(
    "Boolean(document.getElementById('development-notice') && document.getElementById('development-notice').open)"
  );
  if (secondNoticeOpen) {
    if (!(await evaluate("document.getElementById('development-notice-acknowledged').checked"))) {
      await trustedClick("#development-notice-acknowledged");
    }
    await trustedClick("#development-notice-continue");
    await waitFor("second homepage development notice acknowledgement", () =>
      evaluate("!document.getElementById('development-notice').open"));
  }
  await waitFor("unauthenticated account UI has finished initializing", async () =>
    evaluate("fetch('/api/account/status',{credentials:'same-origin',cache:'no-store'}).then(async r => {" +
      "const value=await r.json(); const button=document.getElementById('open-account-dialog'); " +
      "return value.authenticated === false && button?.getAttribute('aria-label') === 'Log In to AstroCrown'; })"));
  // Opening the dialog itself does not require WebAuthn user activation.
  // Use the button's own click handler directly because this is a second
  // navigation after reload; the actual passkey-sign-in action below continues
  // to use a trusted CDP pointer gesture.
  await evaluate("document.getElementById('open-account-dialog').click()");
  await waitFor("second-device sign-in dialog opens", () =>
    evaluate("Boolean(document.getElementById('account-dialog')?.open)"));
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
  await waitFor("second-device security management button rendered", () =>
    evaluate("Boolean(document.getElementById('account-security-manage'))"));
  const manageButtonBeforeClick = await evaluate(
    "(() => { const b=document.getElementById('account-security-manage'); const r=b.getBoundingClientRect(); " +
    "return {disabled:b.disabled,rect:{left:r.left,top:r.top,width:r.width,height:r.height}," +
    "dialogOpen:document.getElementById('account-dialog')?.open,dashboardHidden:document.getElementById('account-dashboard')?.hidden," +
    "hash:location.hash}; })()"
  );
  assert.equal(manageButtonBeforeClick.disabled, false,
    "account security must be enabled after the second passkey sign-in: " + JSON.stringify(manageButtonBeforeClick));
  await evaluate(
    "window.__secondDeviceSecurityClick=0; document.getElementById('account-security-manage').addEventListener('click',()=>window.__secondDeviceSecurityClick++);"
  );
  // This button only opens a read-only panel; sensitive operations inside the
  // panel still require a trusted passkey gesture and a server-side step-up.
  await evaluate("document.getElementById('account-security-manage').click()");
  try {
    await waitFor("two passkeys and two sessions displayed", () =>
      evaluate("document.querySelectorAll('#account-security-panel [data-security-action=\"revoke-passkey\"]').length === 2 && " +
        "document.querySelectorAll('#account-security-panel [data-security-action=\"revoke-session\"]').length === 1"), 8000);
  } catch (error) {
    const state = await evaluate(
      "(() => { const b=document.getElementById('account-security-manage'); const p=document.getElementById('account-security-panel'); " +
      "return {clicks:window.__secondDeviceSecurityClick,buttonDisabled:b?.disabled,panelHidden:p?.hidden," +
      "panelText:p?.innerText || '',revokePasskeyCount:p?.querySelectorAll('[data-security-action=\"revoke-passkey\"]').length || 0," +
      "revokeSessionCount:p?.querySelectorAll('[data-security-action=\"revoke-session\"]').length || 0," +
      "accountDialogOpen:document.getElementById('account-dialog')?.open,dashboardHidden:document.getElementById('account-dashboard')?.hidden}; })()"
    );
    throw new Error(error.message + " Second-device security panel state: " + JSON.stringify(state));
  }

  const renameSelector = 'button[data-security-action="rename-passkey"][data-passkey-ref="' + secondPasskey.passkeyRef + '"]';
  const renameInputSelector = 'input[data-passkey-label-input="' + secondPasskey.passkeyRef + '"]';
  await evaluate("document.querySelector(" + JSON.stringify(renameInputSelector) + ").value='Secondary test authenticator'");
  const renameButtonState = await evaluate(
    "(() => { const b=document.querySelector(" + JSON.stringify(renameSelector) + "); const r=b.getBoundingClientRect(); " +
    "const hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2); " +
    "window.__renameButtonClicks=0; b.addEventListener('click',()=>window.__renameButtonClicks++); " +
    "return {found:!!b,disabled:b?.disabled,rect:{left:r.left,top:r.top,width:r.width,height:r.height}," +
    "viewport:{width:innerWidth,height:innerHeight},hitId:hit?.id || '',hitTag:hit?.tagName || ''," +
    "hitWithinButton:!!(hit && b.contains(hit))}; })()"
  );
  assert.equal(renameButtonState.found, true, "the passkey rename control must exist.");
  assert.equal(renameButtonState.disabled, false, "the passkey rename control must be enabled: " + JSON.stringify(renameButtonState));
  // Renaming is a normal button action; the server-side change still requires
  // fresh WebAuthn verification. Keep the authenticator assertion challenge
  // inside the action handler, not in the test harness.
  await evaluate("document.querySelector(" + JSON.stringify(renameSelector) + ").click()");
  try {
    await waitFor("renamed passkey label", () =>
      evaluate("document.getElementById('account-security-panel').innerText.includes('Secondary test authenticator')"), 15000);
  } catch (error) {
    const renameState = await evaluate(
      "({clicks:window.__renameButtonClicks,buttonDisabled:document.querySelector(" + JSON.stringify(renameSelector) + ")?.disabled," +
      "feedback:document.getElementById('account-security-feedback')?.textContent || '',panelText:document.getElementById('account-security-panel')?.innerText || ''})"
    );
    throw new Error(error.message + " Rename control state: " + JSON.stringify(renameButtonState) +
      " / " + JSON.stringify(renameState));
  }
  security = await evaluate(
    "fetch('/api/account/security',{credentials:'same-origin',cache:'no-store'}).then(r=>r.json())"
  );
  assert.equal(security.passkeys.find(item => item.passkeyRef === secondPasskey.passkeyRef).label,
    "Secondary test authenticator", "passkey names must persist in D1.");

  await evaluate("window.confirm = function () { return true; };");
  // This invokes the ordinary dashboard handler; the server still demands a
  // fresh, one-use WebAuthn step-up before it will revoke the credential.
  await evaluate(
    "document.querySelector(" + JSON.stringify('button[data-security-action="revoke-passkey"][data-passkey-ref="' + firstPasskeyRef + '"]') + ").click()"
  );
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
  // A fresh page load deliberately re-displays the development notice. It
  // must be acknowledged before the account header can be used.
  const sessionReloadNoticeOpen = await evaluate(
    "Boolean(document.getElementById('development-notice') && document.getElementById('development-notice').open)"
  );
  if (sessionReloadNoticeOpen) {
    if (!(await evaluate("document.getElementById('development-notice-acknowledged').checked"))) {
      await trustedClick("#development-notice-acknowledged");
    }
    await trustedClick("#development-notice-continue");
    await waitFor("session-reload development notice acknowledgement", () =>
      evaluate("!document.getElementById('development-notice').open"));
  }
  await waitFor("unauthenticated header before a new passkey session", async () =>
    evaluate("fetch('/api/account/status',{credentials:'same-origin',cache:'no-store'}).then(async r => {" +
      "const value=await r.json(); return value.authenticated === false && " +
      "document.getElementById('open-account-dialog')?.getAttribute('aria-label') === 'Log In to AstroCrown'; })"));
  await evaluate("document.getElementById('open-account-dialog').click()");
  await waitFor("second-session sign-in dialog opens", () =>
    evaluate("Boolean(document.getElementById('account-dialog')?.open)"));
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

  await evaluate("document.getElementById('account-security-manage').click()");
  await waitFor("two sessions displayed", () =>
    evaluate("document.querySelectorAll('#account-security-panel [data-security-action=\"revoke-session\"]').length === 1"));
  security = await evaluate(
    "fetch('/api/account/security',{credentials:'same-origin',cache:'no-store'}).then(r=>r.json())"
  );
  assert.equal(security.sessions.length, 2);
  assert.equal(security.sessions.filter(item => item.isCurrent).length, 1);
  assert.equal(security.sessions.filter(item => !item.isCurrent).length, 1);
  await evaluate("window.confirm = function () { return true; };");
  await evaluate("document.getElementById('account-security-revoke-others').click()");
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

  await testAdminGovernanceFixture(identifier);
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
