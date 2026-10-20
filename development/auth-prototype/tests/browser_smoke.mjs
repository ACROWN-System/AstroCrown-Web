import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createServer } from "node:net";

const chrome = process.env.CHROME_BIN;
if (!chrome) throw new Error("CHROME_BIN must name a preinstalled Chrome/Chromium binary.");

const prototypeDir = resolve("development/auth-prototype");
const work = mkdtempSync(join(tmpdir(), "acrown-wallet-browser-"));
const [port, debugPort] = await findFreePorts(2);
const localUrl = "http://localhost:" + port + "/";
let server = null;
let browser = null;
let socket = null;
let requestId = 0;
let serverOutput = "";
let browserOutput = "";
const pending = new Map();

async function findFreePorts(count) {
  const servers = [];
  try {
    for (let index = 0; index < count; index++) {
      const item = createServer();
      await new Promise((resolvePromise, reject) => {
        item.once("error", reject);
        item.listen(0, "127.0.0.1", resolvePromise);
      });
      servers.push(item);
    }
    const ports = servers.map(item => item.address().port);
    await Promise.all(servers.map(item => new Promise((resolvePromise, reject) => {
      item.close(error => error ? reject(error) : resolvePromise());
    })));
    return ports;
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
  const result = await cdp("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || "Browser JavaScript evaluation failed");
  }
  return result.result?.value;
}

async function waitForBrowserTarget() {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch("http://127.0.0.1:" + debugPort + "/json");
      if (response.ok) {
        const targets = await response.json();
        const target = targets.find(item => item.type === "page" && item.url === "about:blank");
        if (target?.webSocketDebuggerUrl) return target;
      }
    } catch {}
    await sleep(100);
  }
  throw new Error("Chrome DevTools page target did not become available. " + browserOutput);
}

try {
  const testEnv = { ...process.env, PYTHONDONTWRITEBYTECODE: "1" };
  server = spawn(process.env.PYTHON || "python", ["server.py", "--port", String(port)], {
    cwd: prototypeDir,
    env: testEnv,
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.setEncoding("utf8");
  server.stderr.setEncoding("utf8");
  server.stdout.on("data", chunk => { serverOutput = (serverOutput + chunk).slice(-3000); });
  server.stderr.on("data", chunk => { serverOutput = (serverOutput + chunk).slice(-3000); });
  await waitFor("local server", async () => {
    const response = await fetch(localUrl);
    return response.ok;
  }, 12000);

  browser = spawn(chrome, [
    "--headless=new", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage",
    "--remote-debugging-port=" + debugPort, "--remote-allow-origins=*",
    "--user-data-dir=" + join(work, "profile"), "about:blank",
  ], { stdio: ["ignore", "ignore", "pipe"] });
  browser.stderr.setEncoding("utf8");
  browser.stderr.on("data", chunk => { browserOutput = (browserOutput + chunk).slice(-5000); });

  const target = await waitForBrowserTarget();
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolvePromise, reject) => {
    const timer = setTimeout(() => reject(new Error("DevTools WebSocket connection timed out")), 10000);
    socket.addEventListener("open", () => { clearTimeout(timer); resolvePromise(); }, { once: true });
    socket.addEventListener("error", () => { clearTimeout(timer); reject(new Error("DevTools WebSocket connection failed")); }, { once: true });
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
  const injectedProvider = [
    "(() => {",
    "const address = '0x52908400098527886E0F7030069857D2E4169EE7';",
    "window.__walletCalls = [];",
    "window.ethereum = {",
    "on: () => {},",
    "request: async ({method, params}) => {",
    "window.__walletCalls.push({method, params});",
    "if (method === 'eth_requestAccounts' || method === 'eth_accounts') return [address];",
    "if (method === 'eth_chainId') return '0x1';",
    "if (method === 'personal_sign') return '0x' + '00'.repeat(65);",
    "throw new Error('Unexpected wallet method: ' + method);",
    "}",
    "};",
    "})();"
  ].join("\n");
  await cdp("Page.addScriptToEvaluateOnNewDocument", { source: injectedProvider });
  await cdp("Page.navigate", { url: localUrl });

  await waitFor("page loaded through a real top-level browser navigation", async () => {
    return await evaluate("document.readyState === 'complete' && document.title.includes('Local Wallet Authentication Test')");
  });
  assert.equal(await evaluate("window.__walletCalls.length"), 0, "page load must not prompt or contact the wallet");
  assert.equal(await evaluate("document.querySelectorAll('input[type=password]').length"), 0, "page must not request a password or secret");
  assert.match(await evaluate("document.body.innerText"), /Never enter or share your seed phrase or private key/);

  await evaluate("document.getElementById('connect-button').click()");
  await waitFor("wallet connection and challenge", async () => {
    const status = await evaluate("document.getElementById('status').textContent");
    const message = await evaluate("document.getElementById('siwe-message').textContent");
    return status.includes("Challenge ready") && message.includes("localhost:" + port);
  });
  assert.match(await evaluate("document.getElementById('siwe-message').textContent"), /Sign in to the local AstroCrown wallet test/);
  assert.equal(await evaluate("window.__walletCalls.filter(x => x.method === 'personal_sign').length"), 0, "connection must not trigger a signature request");

  await evaluate("document.getElementById('sign-button').click()");
  await waitFor("expected rejection of intentionally invalid mock signature", async () => {
    return (await evaluate("document.getElementById('status').textContent")).includes("could not be verified");
  });
  const parsedMethods = JSON.parse(await evaluate("JSON.stringify(window.__walletCalls.map(x => x.method))"));
  assert.ok(parsedMethods.includes("eth_requestAccounts"));
  assert.ok(parsedMethods.includes("eth_chainId"));
  assert.ok(parsedMethods.includes("personal_sign"), "signing method is called only after the sign button");
  assert.equal(parsedMethods.filter(method => method === "personal_sign").length, 1);
  const signRequest = JSON.parse(await evaluate("JSON.stringify(window.__walletCalls.find(x => x.method === 'personal_sign'))"));
  const visibleMessage = await evaluate("document.getElementById('siwe-message').textContent");
  const expectedMessageHex = "0x" + Array.from(new TextEncoder().encode(visibleMessage), byte => byte.toString(16).padStart(2, "0")).join("");
  assert.equal(signRequest.params[0], expectedMessageHex, "wallet must be asked to sign the exact visible SIWE message bytes");
  assert.equal(signRequest.params[1].toLowerCase(), "0x52908400098527886e0f7030069857d2e4169ee7", "wallet signing account must match the selected account");
  assert.ok(parsedMethods.every(method => ["eth_requestAccounts", "eth_accounts", "eth_chainId", "personal_sign"].includes(method)), "mock wallet must not receive transaction or unexpected methods");
  const session = await evaluate("fetch('/api/session', {cache:'no-store'}).then(response => response.json()).then(value => JSON.stringify(value))");
  const sessionState = JSON.parse(session);
  assert.equal(sessionState.authenticated, false, "invalid browser signature must not establish a session");

  console.log("PASS: real headless browser navigation, no auto-prompt, explicit connect/sign clicks, visible SIWE challenge, invalid-signature rejection, and no session without a verified signature.");
} catch (error) {
  console.error("Wallet browser smoke test failed:", error);
  if (serverOutput) console.error("Local server output:", serverOutput);
  if (browserOutput) console.error("Chrome output:", browserOutput);
  process.exitCode = 1;
} finally {
  for (const item of pending.values()) {
    clearTimeout(item.timer);
    item.reject(new Error("Test cleanup"));
  }
  pending.clear();
  try { if (socket && socket.readyState === WebSocket.OPEN) socket.close(); } catch {}
  try { if (browser && browser.exitCode === null) browser.kill("SIGTERM"); } catch {}
  try { if (server && server.exitCode === null) server.kill("SIGTERM"); } catch {}
  await sleep(250);
  rmSync(work, { recursive: true, force: true });
}
