import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const chrome = process.env.CHROME_BIN;
if (!chrome) throw new Error("CHROME_BIN must name a preinstalled Chrome/Chromium binary.");
const work = mkdtempSync(join(tmpdir(), "acrown-banner-browser-"));
const port = 18765;
const debugPort = 19222;
const base = "http://127.0.0.1:" + port;
let server = null;
let browser = null;
let socket = null;
let requestId = 0;
const pending = new Map();

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
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
async function waitHttp(url) {
  return waitFor("local Python API " + url, async () => {
    const response = await fetch(url);
    return response.ok ? response : null;
  }, 12000);
}
function cdp(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++requestId;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error("CDP timeout: " + method));
    }, 10000);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const response = await cdp("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true
  });
  if (response.exceptionDetails) {
    throw new Error(response.exceptionDetails.text || "Browser JavaScript evaluation failed");
  }
  return response.result?.value;
}
async function waitForPageReady() {
  await waitFor("saved banner draft to load", async () => {
    const text = await evaluate("document.getElementById('saveStatus')?.textContent || ''");
    return text.includes("Saved draft loaded. Nothing is published.");
  });
}

try {
  server = spawn(process.env.PYTHON || "python", [
    "-m", "development.admin.banner_backend.server",
    "--port", String(port),
    "--data-file", join(work, "state.json")
  ], { cwd: process.cwd(), stdio: "ignore" });
  await waitHttp(base + "/api/health");

  browser = spawn(chrome, [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--remote-debugging-port=" + debugPort,
    "--remote-allow-origins=*",
    "--user-data-dir=" + join(work, "chrome-profile"),
    base + "/admin/banner-editor"
  ], { stdio: "ignore" });

  let target;
  await waitFor("Chrome DevTools target", async () => {
    const response = await fetch("http://127.0.0.1:" + debugPort + "/json");
    if (!response.ok) return false;
    const targets = await response.json();
    target = targets.find(item => item.type === "page" && item.url.includes("/admin/banner-editor"));
    return Boolean(target?.webSocketDebuggerUrl);
  }, 15000);

  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Chrome DevTools websocket timeout")), 10000);
    socket.addEventListener("open", () => { clearTimeout(timer); resolve(); }, { once: true });
    socket.addEventListener("error", () => { clearTimeout(timer); reject(new Error("Chrome DevTools websocket failed")); }, { once: true });
  });
  socket.addEventListener("message", event => {
    let message;
    try { message = JSON.parse(String(event.data)); } catch { return; }
    if (!message.id) return;
    const item = pending.get(message.id);
    if (!item) return;
    clearTimeout(item.timer);
    pending.delete(message.id);
    if (message.error) item.reject(new Error(message.error.message || "Chrome DevTools command failed"));
    else item.resolve(message.result || {});
  });
  await cdp("Page.enable");
  await cdp("Runtime.enable");
  await waitForPageReady();

  let initial = JSON.parse(await evaluate("JSON.stringify({text:document.getElementById('elementText').value,saveDisabled:document.getElementById('saveDraftBtn').disabled})"));
  assert.equal(initial.saveDisabled, true, "save should be disabled until there are unsaved changes");

  await evaluate("(()=>{const f=document.getElementById('elementText');f.value='Browser persistence verified';f.dispatchEvent(new Event('change',{bubbles:true}));return true})()");
  const dirty = JSON.parse(await evaluate("JSON.stringify({status:document.getElementById('saveStatus').textContent,saveDisabled:document.getElementById('saveDraftBtn').disabled})"));
  assert.match(dirty.status, /Unsaved changes/);
  assert.equal(dirty.saveDisabled, false, "save should enable after editing");

  await evaluate("document.getElementById('saveDraftBtn').click()");
  await waitFor("draft save confirmation", async () => {
    const text = await evaluate("document.getElementById('saveStatus').textContent");
    return text.includes("Draft saved on this computer. Not published.");
  });
  const storedResponse = await fetch(base + "/api/state");
  const stored = await storedResponse.json();
  const defaultBanner = stored.state.banners.find(item => item.id === stored.state.default_banner_id);
  assert.equal(defaultBanner.slots[0].composition.elements[0].text, "Browser persistence verified");

  await cdp("Page.reload", { ignoreCache: true });
  await waitForPageReady();
  assert.equal(await evaluate("document.getElementById('elementText').value"), "Browser persistence verified");

  await evaluate("(()=>{const el=document.querySelector('.canvas-element');el.focus();el.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));return true})()");
  assert.match(await evaluate("document.getElementById('saveStatus').textContent"), /Unsaved changes/);
  await evaluate("document.getElementById('saveDraftBtn').click()");
  await waitFor("keyboard edit save", async () => {
    const text = await evaluate("document.getElementById('saveStatus').textContent");
    return text.includes("Draft saved on this computer. Not published.");
  });

  // Simulate another editor saving after this tab loaded its revision.
  await evaluate("(()=>{const f=document.getElementById('elementText');f.value='Local edit kept after conflict';f.dispatchEvent(new Event('change',{bubbles:true}));return true})()");
  const currentResponse = await fetch(base + "/api/state");
  const current = await currentResponse.json();
  const newState = JSON.parse(JSON.stringify(current.state));
  const currentBanner = newState.banners.find(item => item.id === newState.default_banner_id);
  currentBanner.slots[0].composition.band_color = "#223344";
  const externalWrite = await fetch(base + "/api/state", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ revision: current.revision, state: newState })
  });
  assert.equal(externalWrite.status, 200, "simulated concurrent write should succeed");

  await evaluate("document.getElementById('saveDraftBtn').click()");
  await waitFor("stale-save conflict message", async () => {
    const text = await evaluate("document.getElementById('saveStatus').textContent");
    return text.includes("Save conflict:");
  });
  const conflict = JSON.parse(await evaluate("JSON.stringify({text:document.getElementById('elementText').value,saveDisabled:document.getElementById('saveDraftBtn').disabled})"));
  assert.equal(conflict.text, "Local edit kept after conflict", "conflict must preserve in-page edits");
  assert.equal(conflict.saveDisabled, true, "stale revision must not be resubmitted");

  await evaluate("window.confirm=()=>true;document.getElementById('reloadDraftBtn').click();true");
  await waitForPageReady();
  assert.equal(await evaluate("document.getElementById('bandColor').value"), "#223344");
  assert.equal(await evaluate("document.getElementById('elementText').value"), "Browser persistence verified");

  await cdp("Emulation.setDeviceMetricsOverride", {
    width: 390, height: 844, deviceScaleFactor: 1, mobile: true
  });
  const viewport = JSON.parse(await evaluate("JSON.stringify({innerWidth:window.innerWidth,scrollWidth:document.documentElement.scrollWidth})"));
  assert.equal(viewport.innerWidth, 390, "narrow viewport was not applied");
  assert.ok(viewport.scrollWidth <= 391, "page should not overflow horizontally at 390px: " + JSON.stringify(viewport));
  await cdp("Emulation.clearDeviceMetricsOverride");
  console.log("PASS: real Chrome verified load, edit, save, reload, keyboard movement, stale-write conflict preservation, confirmed recovery, and 390px layout.");
} finally {
  try { socket?.close(); } catch {}
  for (const child of [browser, server]) {
    if (child && !child.killed) child.kill("SIGTERM");
  }
  try { rmSync(work, { recursive: true, force: true }); } catch {}
}
