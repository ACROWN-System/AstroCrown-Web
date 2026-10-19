import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";

const chrome = process.env.CHROME_BIN;
if (!chrome) throw new Error("CHROME_BIN must name a preinstalled Chrome/Chromium binary.");
const work = mkdtempSync(join(tmpdir(), "acrown-banner-browser-"));
const [port, debugPort] = await findFreePorts(2);
const base = "http://127.0.0.1:" + port;
let server = null;
let browser = null;
let chromeStderr = "";
let browserExit = null;
let socket = null;
let requestId = 0;
const pending = new Map();

async function findFreePorts(count) {
  const servers = [];
  try {
    for (let index = 0; index < count; index++) {
      const server = createServer();
      await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", resolve);
      });
      servers.push(server);
    }
    const ports = servers.map(server => server.address().port);
    await Promise.all(servers.map(server => new Promise((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
    })));
    return ports;
  } catch (error) {
    await Promise.all(servers.map(server => new Promise(resolve => server.close(() => resolve()))));
    throw error;
  }
}
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
  ], { stdio: ["ignore", "ignore", "pipe"] });
  browser.stderr.setEncoding("utf8");
  browser.stderr.on("data", chunk => { chromeStderr = (chromeStderr + chunk).slice(-6000); });
  browser.on("exit", (code, signal) => { browserExit = { code, signal }; });

  let target;
  await waitFor("Chrome DevTools target", async () => {
    if (browserExit) return true;
    try {
      const response = await fetch("http://127.0.0.1:" + debugPort + "/json");
      if (!response.ok) return false;
      const targets = await response.json();
      target = targets.find(item => item.type === "page" && item.url.includes("/admin/banner-editor"));
      return Boolean(target?.webSocketDebuggerUrl);
    } catch {
      return false;
    }
  }, 25000);
  if (!target?.webSocketDebuggerUrl) {
    throw new Error("Chrome DevTools did not become available. Exit=" + JSON.stringify(browserExit) + "\nChrome stderr:\n" + chromeStderr);
  }

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

  // Test real pointer input, not synthetic DOM events, for the primary canvas interactions.
  const beforeMove = JSON.parse(await evaluate("JSON.stringify((()=>{const e=document.querySelector('.canvas-element');const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,left:parseFloat(e.style.left),width:parseFloat(e.style.width)}})())"));
  await cdp("Input.dispatchMouseEvent", { type: "mouseMoved", x: beforeMove.x, y: beforeMove.y });
  await cdp("Input.dispatchMouseEvent", { type: "mousePressed", x: beforeMove.x, y: beforeMove.y, button: "left", buttons: 1, clickCount: 1 });
  await cdp("Input.dispatchMouseEvent", { type: "mouseMoved", x: beforeMove.x + 28, y: beforeMove.y + 12, button: "left", buttons: 1 });
  await cdp("Input.dispatchMouseEvent", { type: "mouseMoved", x: beforeMove.x + 48, y: beforeMove.y + 18, button: "left", buttons: 1 });
  await cdp("Input.dispatchMouseEvent", { type: "mouseReleased", x: beforeMove.x + 48, y: beforeMove.y + 18, button: "left", buttons: 0, clickCount: 1 });
  const afterMove = JSON.parse(await evaluate("JSON.stringify((()=>{const e=document.querySelector('.canvas-element');return {left:parseFloat(e.style.left),top:parseFloat(e.style.top)}})())"));
  assert.ok(afterMove.left > beforeMove.left + 1, "real pointer drag should move the selected element horizontally");
  assert.match(await evaluate("document.getElementById('saveStatus').textContent"), /Unsaved changes/);

  const beforeResize = JSON.parse(await evaluate("JSON.stringify((()=>{const e=document.querySelector('.canvas-element');const h=e.querySelector('.handle.e');const r=h.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,width:parseFloat(e.style.width)}})())"));
  await cdp("Input.dispatchMouseEvent", { type: "mouseMoved", x: beforeResize.x, y: beforeResize.y });
  await cdp("Input.dispatchMouseEvent", { type: "mousePressed", x: beforeResize.x, y: beforeResize.y, button: "left", buttons: 1, clickCount: 1 });
  await cdp("Input.dispatchMouseEvent", { type: "mouseMoved", x: beforeResize.x + 32, y: beforeResize.y, button: "left", buttons: 1 });
  await cdp("Input.dispatchMouseEvent", { type: "mouseMoved", x: beforeResize.x + 48, y: beforeResize.y, button: "left", buttons: 1 });
  await cdp("Input.dispatchMouseEvent", { type: "mouseReleased", x: beforeResize.x + 48, y: beforeResize.y, button: "left", buttons: 0, clickCount: 1 });
  const afterResize = JSON.parse(await evaluate("JSON.stringify({width:parseFloat(document.querySelector('.canvas-element').style.width)})"));
  assert.ok(afterResize.width > beforeResize.width + 1, "east resize handle should enlarge the element with real pointer input");

  await evaluate("document.getElementById('resizeBand').scrollIntoView({block:'center'});true");
  const beforeBandResize = JSON.parse(await evaluate("JSON.stringify((()=>{const b=document.getElementById('resizeBand').getBoundingClientRect();const x=b.x+b.width/2,y=b.y+b.height/2;return {x,y,height:document.getElementById('bandCanvas').offsetHeight,target:document.elementFromPoint(x,y)?.id,innerWidth:window.innerWidth,innerHeight:window.innerHeight}})())"));
  console.log("BAND_RESIZE_BEFORE", JSON.stringify(beforeBandResize));
  assert.equal(beforeBandResize.target, "resizeBand", "band resize pointer must target the lower-border control: " + JSON.stringify(beforeBandResize));
  await cdp("Input.dispatchMouseEvent", { type: "mouseMoved", x: beforeBandResize.x, y: beforeBandResize.y });
  await cdp("Input.dispatchMouseEvent", { type: "mousePressed", x: beforeBandResize.x, y: beforeBandResize.y, button: "left", buttons: 1, clickCount: 1 });
  await cdp("Input.dispatchMouseEvent", { type: "mouseMoved", x: beforeBandResize.x, y: beforeBandResize.y + 20, button: "left", buttons: 1 });
  await cdp("Input.dispatchMouseEvent", { type: "mouseReleased", x: beforeBandResize.x, y: beforeBandResize.y + 20, button: "left", buttons: 0, clickCount: 1 });
  const afterBandResize = JSON.parse(await evaluate("JSON.stringify({height:document.getElementById('bandCanvas').offsetHeight})"));
  console.log("BAND_RESIZE_AFTER", JSON.stringify(afterBandResize));
  assert.ok(afterBandResize.height >= beforeBandResize.height + 10, "dragging the band lower edge should increase band height: " + JSON.stringify({beforeBandResize,afterBandResize}));
  assert.match(await evaluate("document.getElementById('saveStatus').textContent"), /Unsaved changes/);

  await evaluate("document.getElementById('saveDraftBtn').click()");
  await waitFor("pointer edits save", async () => {
    const text = await evaluate("document.getElementById('saveStatus').textContent");
    return text.includes("Draft saved on this computer. Not published.");
  });

  // Add a second scene and verify each scene's link setting is independent.
  assert.equal(await evaluate("document.getElementById('directionBtn').getAttribute('aria-label')"), "Direction: left to right");
  await evaluate("document.getElementById('addSceneBtn').click()");
  assert.equal(await evaluate("document.getElementById('sceneCounter').textContent"), "2 / 2");
  assert.equal(await evaluate("document.querySelectorAll('.scene-link-row').length"), 2);
  await evaluate("(()=>{const c=document.querySelector('[data-scene-link-toggle=\"slot-1\"]');c.checked=true;c.dispatchEvent(new Event('change',{bubbles:true}));return true})()");
  assert.equal(await evaluate("document.querySelector('[data-scene-link-url=\"slot-1\"]').parentElement.hidden"), false);
  await evaluate("(()=>{const u=document.querySelector('[data-scene-link-url=\"slot-1\"]');u.value='/releases';u.dispatchEvent(new Event('change',{bubbles:true}));return true})()");
  await evaluate("(()=>{const c=document.querySelector('[data-scene-link-toggle=\"slot-2\"]');c.checked=true;c.dispatchEvent(new Event('change',{bubbles:true}));return true})()");
  await evaluate("(()=>{const u=document.querySelector('[data-scene-link-url=\"slot-2\"]');u.value='https://example.org/special';u.dispatchEvent(new Event('change',{bubbles:true}));return true})()");
  const linkSettings = JSON.parse(await evaluate("JSON.stringify(Array.from(document.querySelectorAll('.scene-link-row')).map(r=>({id:r.dataset.sceneId,enabled:r.querySelector('input[type=checkbox]').checked,urlVisible:!r.querySelector('input[type=url]').parentElement.hidden,url:r.querySelector('input[type=url]').value})))"));
  assert.deepEqual(linkSettings, [
    {id:"slot-1",enabled:true,urlVisible:true,url:"/releases"},
    {id:"slot-2",enabled:true,urlVisible:true,url:"https://example.org/special"}
  ], "each scene must retain its own Add link setting and destination");

  // Disabling a scene's link must hide and clear only that scene's destination.
  await evaluate("(()=>{const c=document.querySelector('[data-scene-link-toggle=\"slot-1\"]');c.checked=false;c.dispatchEvent(new Event('change',{bubbles:true}));return true})()");
  const linkOff = JSON.parse(await evaluate("JSON.stringify((()=>{const r=document.querySelector('.scene-link-row[data-scene-id=\"slot-1\"]');return {enabled:r.querySelector('input[type=checkbox]').checked,hidden:r.querySelector('input[type=url]').parentElement.hidden,url:r.querySelector('input[type=url]').value}})())"));
  assert.deepEqual(linkOff,{enabled:false,hidden:true,url:""},"turning Add link off must hide and clear the URL");
  await evaluate("(()=>{const c=document.querySelector('[data-scene-link-toggle=\"slot-1\"]');c.checked=true;c.dispatchEvent(new Event('change',{bubbles:true}));const u=document.querySelector('[data-scene-link-url=\"slot-1\"]');u.value='/releases';u.dispatchEvent(new Event('change',{bubbles:true}));return true})()");

  const directions = [];
  for (let index = 0; index < 4; index++) {
    await evaluate("document.getElementById('directionBtn').click()");
    directions.push(await evaluate("document.getElementById('directionBtn').getAttribute('aria-label')"));
  }
  assert.deepEqual(directions, [
    "Direction: top to bottom",
    "Direction: right to left",
    "Direction: bottom to top",
    "Direction: left to right"
  ], "Direction must follow the exact four-step cycle");

  await evaluate("document.getElementById('directionBtn').focus();true");
  await cdp("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", text: "\r", unmodifiedText: "\r", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
  await cdp("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
  assert.equal(await evaluate("document.getElementById('directionBtn').getAttribute('aria-label')"), "Direction: top to bottom", "Direction control should work with the keyboard");
  for (let index = 0; index < 3; index++) await evaluate("document.getElementById('directionBtn').click()");
  assert.equal(await evaluate("document.getElementById('directionBtn').getAttribute('aria-label')"), "Direction: left to right");

  await evaluate("document.getElementById('addSceneBtn').click()");
  assert.equal(await evaluate("document.getElementById('sceneCounter').textContent"), "3 / 3");
  assert.equal(await evaluate("document.querySelectorAll('.scene-link-row').length"), 3);
  await evaluate("window.confirm=()=>true;document.getElementById('deleteSceneBtn').click();true");
  assert.equal(await evaluate("document.getElementById('sceneCounter').textContent"), "2 / 2");
  assert.equal(await evaluate("document.querySelectorAll('.scene-link-row').length"), 2);

  await evaluate("document.getElementById('saveDraftBtn').click()");
  await waitFor("carousel scene save", async () => {
    const text = await evaluate("document.getElementById('saveStatus').textContent");
    return text.includes("Draft saved on this computer. Not published.");
  });
  const carouselResponse = await fetch(base + "/api/state");
  const carouselSaved = await carouselResponse.json();
  const carouselBanner = carouselSaved.state.banners.find(item => item.id === carouselSaved.state.default_banner_id);
  assert.equal(carouselBanner.carousel_direction, "left-to-right");
  assert.equal(carouselBanner.slots.length, 2);
  assert.equal(carouselBanner.slots[0].add_link, true);
  assert.equal(carouselBanner.slots[0].destination_url, "/releases");
  assert.equal(carouselBanner.slots[1].add_link, true);
  assert.equal(carouselBanner.slots[1].destination_url, "https://example.org/special");

  // Return to the first scene for the stale-write conflict test below.
  await evaluate("document.getElementById('prevSceneBtn').click()");
  assert.equal(await evaluate("document.getElementById('sceneCounter').textContent"), "1 / 2");
  assert.equal(await evaluate("document.getElementById('elementText').value"), "Browser persistence verified");

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
  console.log("PASS: real Chrome verified canvas pointer movement/resizing, band height drag, save/reload/conflict recovery, carousel scene lifecycle, independent links, direction cycle and keyboard activation, and 390px layout.");
} finally {
  try { socket?.close(); } catch {}
  for (const child of [browser, server]) {
    if (child && !child.killed) child.kill("SIGTERM");
  }
  try { rmSync(work, { recursive: true, force: true }); } catch {}
}
