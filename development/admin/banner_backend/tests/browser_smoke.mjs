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
async function pressKey(key, shift = false) {
  const code = key === " " ? "Space" : key;
  const keyCode = key === "Tab" ? 9 : key === "Enter" ? 13 : key === "Escape" ? 27 : 0;
  const down = { type: "keyDown", key, code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode };
  const up = { type: "keyUp", key, code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode };
  if (key === "Enter") { down.text = "\r"; down.unmodifiedText = "\r"; }
  if (shift) { down.modifiers = 8; up.modifiers = 8; }
  await cdp("Input.dispatchKeyEvent", down);
  await cdp("Input.dispatchKeyEvent", up);
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

  const canvasSemantics = JSON.parse(await evaluate("JSON.stringify({count:document.querySelectorAll('.canvas-element').length,role:document.querySelector('.canvas-element')?.getAttribute('role')||null,handleCount:document.querySelector('.canvas-element')?.querySelectorAll('button.handle').length||0,label:document.querySelector('.canvas-element')?.getAttribute('aria-label')||''})"));
  assert.ok(canvasSemantics.count > 0, "canvas must have a rendered element before checking resize control semantics");
  assert.equal(canvasSemantics.role, "group", "canvas element containing resize buttons must not expose button semantics");
  assert.equal(canvasSemantics.handleCount, 8, "all eight individually labelled resize buttons should remain available");
  assert.match(canvasSemantics.label, /Width and Height fields/, "canvas element should announce keyboard/property alternatives");

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

  // Test banner creation, temporary scheduling, no-close confirmation branches, and save/load.
  await evaluate("document.getElementById('newBannerBtn').click()");
  assert.equal(await evaluate("document.getElementById('bannerSelect').value"), "banner-1");
  assert.equal(await evaluate("document.getElementById('scheduleBannerSelect').value"), "banner-1");
  await evaluate("(()=>{const n=document.getElementById('bannerName');n.value='ACROWN Release Event';n.dispatchEvent(new Event('change',{bubbles:true}));return true})()");
  await evaluate("(()=>{const o=document.getElementById('scheduleOpenAt');o.value='2026-11-05T18:00';o.dispatchEvent(new Event('change',{bubbles:true}));const c=document.getElementById('scheduleCloseEnabled');c.checked=true;c.dispatchEvent(new Event('change',{bubbles:true}));const e=document.getElementById('scheduleCloseAt');e.value='2026-11-05T21:00';e.dispatchEvent(new Event('change',{bubbles:true}));return true})()");
  await evaluate("document.getElementById('addScheduleBtn').click()");
  assert.equal(await evaluate("document.querySelectorAll('.schedule-item').length"), 1, "temporary schedule should be added");
  assert.equal(await evaluate("document.querySelector('.schedule-item .pill').textContent"), "TEMPORARY");

  // Leaving Close blank must open confirmation and must not mutate schedule data yet.
  await evaluate("(()=>{const c=document.getElementById('scheduleCloseEnabled');c.checked=false;c.dispatchEvent(new Event('change',{bubbles:true}));const o=document.getElementById('scheduleOpenAt');o.value='2026-11-06T18:00';o.dispatchEvent(new Event('change',{bubbles:true}));return true})()");
  await evaluate("document.getElementById('addScheduleBtn').click()");
  assert.equal(await evaluate("document.getElementById('openEndedScheduleDialog').hidden"), false);
  assert.equal(await evaluate("document.querySelectorAll('.schedule-item').length"), 1, "open-ended schedule must not be added before confirmation");
  assert.equal(await evaluate("document.activeElement.id"), "confirmDefaultScheduleBtn", "dialog should move initial focus to its primary action");
  await evaluate("document.getElementById('calendarPrevMonth').focus();true");
  await pressKey("Tab");
  assert.equal(await evaluate("document.activeElement.id"), "confirmDefaultScheduleBtn", "Tab must bring outside focus back into the modal");
  await pressKey("Tab");
  assert.equal(await evaluate("document.activeElement.id"), "addScheduleCloseBtn", "Tab should advance within the dialog");
  await pressKey("Tab");
  assert.equal(await evaluate("document.activeElement.id"), "cancelOpenEndedScheduleBtn", "Tab should reach the final dialog action");
  await pressKey("Tab");
  assert.equal(await evaluate("document.activeElement.id"), "confirmDefaultScheduleBtn", "Tab from the final action must wrap to the first");
  await pressKey("Tab", true);
  assert.equal(await evaluate("document.activeElement.id"), "cancelOpenEndedScheduleBtn", "Shift+Tab from the first action must wrap to the last");
  await evaluate("document.getElementById('confirmDefaultScheduleBtn').click()");
  assert.equal(await evaluate("document.activeElement.id"), "addScheduleBtn", "confirming the dialog should return focus to its invoker");
  assert.equal(await evaluate("document.querySelectorAll('.schedule-item').length"), 2);
  assert.equal(await evaluate("Array.from(document.querySelectorAll('.schedule-item .pill')).some(p=>p.textContent==='NEW DEFAULT')"), true);

  // Choosing Add a closing time returns to the form and still does not create a schedule.
  await evaluate("(()=>{const o=document.getElementById('scheduleOpenAt');o.value='2026-11-07T18:00';o.dispatchEvent(new Event('change',{bubbles:true}));return true})()");
  await evaluate("document.getElementById('addScheduleBtn').click()");
  assert.equal(await evaluate("document.getElementById('openEndedScheduleDialog').hidden"), false);
  await evaluate("document.getElementById('addScheduleCloseBtn').click()");
  assert.equal(await evaluate("document.getElementById('scheduleCloseEnabled').checked"), true);
  assert.equal(await evaluate("document.getElementById('scheduleCloseField').hidden"), false);
  assert.equal(await evaluate("document.activeElement.id"), "scheduleCloseAt", "Add a closing time should focus the newly revealed field");
  assert.equal(await evaluate("document.querySelectorAll('.schedule-item').length"), 2);
  await evaluate("(()=>{const e=document.getElementById('scheduleCloseAt');e.value='2026-11-07T20:00';e.dispatchEvent(new Event('change',{bubbles:true}));return true})()");
  await evaluate("document.getElementById('addScheduleBtn').click()");
  assert.equal(await evaluate("document.querySelectorAll('.schedule-item').length"), 3);

  // Cancel is a no-op.
  await evaluate("(()=>{const c=document.getElementById('scheduleCloseEnabled');c.checked=false;c.dispatchEvent(new Event('change',{bubbles:true}));const o=document.getElementById('scheduleOpenAt');o.value='2026-11-08T18:00';o.dispatchEvent(new Event('change',{bubbles:true}));return true})()");
  await evaluate("document.getElementById('addScheduleBtn').click()");
  assert.equal(await evaluate("document.getElementById('openEndedScheduleDialog').hidden"), false);
  await evaluate("document.getElementById('cancelOpenEndedScheduleBtn').click()");
  assert.equal(await evaluate("document.activeElement.id"), "addScheduleBtn", "cancelling the dialog should return focus to its invoker");
  assert.equal(await evaluate("document.querySelectorAll('.schedule-item').length"), 3, "cancel must leave schedules unchanged");
  assert.match(await evaluate("document.getElementById('scheduleFeedback').textContent"), /No schedule change was made/);

  // Escape must dismiss the open-ended dialog without adding a schedule or losing focus context.
  await evaluate("(()=>{const o=document.getElementById('scheduleOpenAt');o.value='2026-11-09T18:00';o.dispatchEvent(new Event('change',{bubbles:true}));return true})()");
  await evaluate("document.getElementById('addScheduleBtn').click()");
  assert.equal(await evaluate("document.getElementById('openEndedScheduleDialog').hidden"), false);
  await pressKey("Escape");
  assert.equal(await evaluate("document.getElementById('openEndedScheduleDialog').hidden"), true, "Escape should close the confirmation dialog");
  assert.equal(await evaluate("document.activeElement.id"), "addScheduleBtn", "Escape should return focus to the dialog invoker");
  assert.equal(await evaluate("document.querySelectorAll('.schedule-item').length"), 3, "Escape must not add a schedule");

  await evaluate("document.getElementById('saveDraftBtn').click()");
  await waitFor("banner schedule save", async () => {
    const text = await evaluate("document.getElementById('saveStatus').textContent");
    return text.includes("Draft saved on this computer. Not published.");
  });
  const schedulesResponse = await fetch(base + "/api/state");
  const schedulesSaved = await schedulesResponse.json();
  const eventBanner = schedulesSaved.state.banners.find(item => item.id === "banner-1");
  assert.equal(eventBanner.name, "ACROWN Release Event");
  assert.equal(schedulesSaved.state.schedules.length, 3);
  assert.equal(schedulesSaved.state.schedules[0].banner_id, "banner-1");
  assert.notEqual(schedulesSaved.state.schedules[0].closes_at, null);
  assert.equal(schedulesSaved.state.schedules.some(item => item.closes_at === null && item.confirmed_default_change === true), true);
  await cdp("Page.reload", { ignoreCache: true });
  await waitForPageReady();
  assert.equal(await evaluate("document.getElementById('scheduleBannerSelect').options.length"), 2, "scheduled banner should survive reload");
  assert.equal(await evaluate("document.querySelectorAll('.schedule-item').length"), 3, "all saved schedules should survive reload");

  // Month navigation and day selection should coordinate dates without mutating schedules.
  const monthBefore = await evaluate("document.getElementById('calendarMonthTitle').textContent");
  await evaluate("document.getElementById('calendarNextMonth').click()");
  const monthNext = await evaluate("document.getElementById('calendarMonthTitle').textContent");
  assert.notEqual(monthNext, monthBefore, "Next month should change the month heading");
  await evaluate("document.getElementById('calendarPrevMonth').click()");
  assert.equal(await evaluate("document.getElementById('calendarMonthTitle').textContent"), monthBefore, "Previous month should restore the prior month");
  await evaluate("document.getElementById('calendarToday').click()");
  const scheduleIds = await evaluate("Array.from(document.querySelectorAll('.schedule-item')).map(item=>item.dataset.scheduleId).join(',')");
  assert.equal(scheduleIds.split(',').length, 3, "calendar navigation must not add or remove schedules");
  // The temporary opening date is known from the test setup.
  await evaluate("(()=>{for(let i=0;i<15&&!Array.from(document.querySelectorAll('[data-date]')).some(d=>d.dataset.date==='2026-11-05');i++)document.getElementById('calendarNextMonth').click();for(let i=0;i<15&&!Array.from(document.querySelectorAll('[data-date]')).some(d=>d.dataset.date==='2026-11-05');i++)document.getElementById('calendarPrevMonth').click();return true})()");
  assert.equal(await evaluate("document.getElementById('calendarGrid').getAttribute('role')"), "group", "calendar should use a simple labelled-button group, not incomplete grid semantics");
  const eventDay = JSON.parse(await evaluate("JSON.stringify((()=>{const d=Array.from(document.querySelectorAll('[data-date]')).find(x=>x.dataset.date==='2026-11-05');return d?{text:d.textContent,aria:d.getAttribute('aria-label'),role:d.getAttribute('role'),pressed:d.getAttribute('aria-pressed'),markers:d.querySelectorAll('.calendar-event').length}:null})())"));
  assert.ok(eventDay, "calendar should render the November 5 event day");
  assert.equal(eventDay.role, null, "native date button should retain its implicit button role");
  assert.ok(eventDay.markers >= 1, "scheduled opening should be marked on its calendar date");
  assert.match(eventDay.aria, /ACROWN Release Event/, "date's accessible label should include the banner name");
  assert.match(eventDay.aria, /opens at/i, "date's accessible label should include event timing");
  const priorScheduleCount = await evaluate("document.querySelectorAll('.schedule-item').length");
  await evaluate("Array.from(document.querySelectorAll('[data-date]')).find(d=>d.dataset.date==='2026-11-05').focus()");
  await pressKey("Enter");
  assert.match(await evaluate("document.getElementById('scheduleOpenAt').value"), /^2026-11-05T/, "keyboard activation should set the Open date");
  assert.equal(await evaluate("document.querySelectorAll('.schedule-item').length"), priorScheduleCount, "activating a calendar date must not create a schedule");

  // Return to the default banner for the stale-write conflict test below.
  await evaluate("(()=>{const s=document.getElementById('bannerSelect');s.value='regular';s.dispatchEvent(new Event('change',{bubbles:true}));return true})()");
  assert.equal(await evaluate("document.getElementById('bannerSelect').value"), "regular");
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
  console.log("PASS: real Chrome verified canvas pointer movement/resizing, band height drag, save/reload/conflict recovery, carousel scene lifecycle, independent links, direction cycle and keyboard activation, banner scheduling, all open-ended confirmation branches, and 390px layout.");
} finally {
  try { socket?.close(); } catch {}
  for (const child of [browser, server]) {
    if (child && !child.killed) child.kill("SIGTERM");
  }
  try { rmSync(work, { recursive: true, force: true }); } catch {}
}
