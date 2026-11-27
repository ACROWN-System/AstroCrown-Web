import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Script } from "node:vm";
import { test } from "node:test";

const homepagePath = new URL("../../../index.html", import.meta.url);
const html = readFileSync(homepagePath, "utf8");
const styleMatch = html.match(/<style id="astro-interaction-feedback">([\\s\\S]*?)<\\/style>/);
const scriptMatch = html.match(/<script id="astro-tactile-feedback">([\\s\\S]*?)<\\/script>/);

test("Market Discovery includes the shared tactile interaction stylesheet", () => {
  assert.ok(styleMatch, "The tactile feedback stylesheet must be published in the homepage.");
  assert.match(styleMatch[1], /scale:\\s*1\\.035/, "Hover must enlarge actionable content.");
  assert.match(styleMatch[1], /scale:\\s*\\.955/, "Press must visibly compress actionable content.");
  assert.match(styleMatch[1], /prefers-reduced-motion/, "Reduced-motion preferences must be respected.");
  assert.match(styleMatch[1], /button:not\\(:disabled\\)/, "Disabled buttons must not receive the interactive treatment.");
});

test("Market Discovery tactile feedback script is syntactically valid", () => {
  assert.ok(scriptMatch, "The tactile feedback controller must be published in the homepage.");
  assert.doesNotThrow(() => new Script(scriptMatch[1], { filename: "astro-tactile-feedback.js" }));
});

test("Push and release sounds are local, user-triggered, and keyboard accessible", () => {
  assert.ok(scriptMatch, "The tactile feedback controller must be present.");
  const script = scriptMatch[1];
  assert.match(script, /AudioContext/);
  assert.match(script, /pointerdown/);
  assert.match(script, /pointerup/);
  assert.match(script, /keydown/);
  assert.match(script, /keyup/);
  assert.match(script, /playMechanicalSound\\("push"\\)/);
  assert.match(script, /playMechanicalSound\\("release"\\)/);
  assert.doesNotMatch(script, /\\bfetch\\s*\\(|new Audio\\s*\\(/, "No external audio fetches or media files may be introduced.");
});
