import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Script } from "node:vm";
import { test } from "node:test";

const html = readFileSync(new URL("../../../index.html", import.meta.url), "utf8");

function extractBetween(source, opening, closing) {
  const openingIndex = source.indexOf(opening);
  assert.notEqual(openingIndex, -1, "Expected opening marker: " + opening);
  const contentStart = openingIndex + opening.length;
  const closingIndex = source.indexOf(closing, contentStart);
  assert.notEqual(closingIndex, -1, "Expected closing marker: " + closing);
  return source.slice(contentStart, closingIndex);
}

const styles = extractBetween(
  html,
  '<style id="astro-interaction-feedback">',
  "</style>"
);
const controller = extractBetween(
  html,
  '<script id="astro-tactile-feedback">',
  "</script>"
);

test("Market Discovery publishes shared hover, press and release styling", () => {
  assert.ok(styles.includes("scale: 1.035"), "Hover must enlarge actionable content.");
  assert.ok(styles.includes("scale: .955"), "Press must visibly compress actionable content.");
  assert.ok(styles.includes("prefers-reduced-motion"), "Reduced-motion preferences must be respected.");
  assert.ok(styles.includes("button:not(:disabled)"), "Disabled buttons must be excluded.");
  assert.ok(styles.includes("[aria-haspopup]"), "Menu triggers must be included.");
});

test("Market Discovery tactile feedback controller is syntactically valid", () => {
  assert.doesNotThrow(() => new Script(controller, { filename: "astro-tactile-feedback.js" }));
});

test("Mechanical push and release sounds respond to pointer and keyboard input", () => {
  assert.ok(controller.includes("AudioContext"), "Sound must be synthesised locally through Web Audio.");
  assert.ok(controller.includes("pointerdown"));
  assert.ok(controller.includes("pointerup"));
  assert.ok(controller.includes("keydown"));
  assert.ok(controller.includes("keyup"));
  assert.ok(controller.includes('playMechanicalSound("push")'));
  assert.ok(controller.includes('playMechanicalSound("release")'));
});

test("Tactile sounds are restrained, dry instrument-like clicks rather than effects", () => {
  assert.ok(controller.includes("function addPrecisionClick("), "Use the dedicated precision-click sound.");
  assert.ok(controller.includes('filter.type = "bandpass"'), "Keep each transient acoustically restrained.");
  assert.ok(controller.includes("output.gain.setValueAtTime(0.62, context.currentTime)"), "Keep the overall sound level low.");
  assert.ok(controller.includes("addPrecisionClick(context, output, 0.035, 0.010, 0, 1550)"), "Press should be a short, soft tick.");
  assert.ok(controller.includes("addPrecisionClick(context, output, 0.032, 0.011, 0, 1900)"), "Release should be a distinct short, soft tack.");
  assert.equal(controller.includes("function addTone("), false, "Remove pitched thuds and resonant tones.");
  assert.equal(controller.includes("function addSoftClick("), false, "Replace the former, more pronounced sound design.");
});

test("A suspended browser audio context resumes before the click is scheduled", async () => {
  const listeners = {};
  const timers = [];
  let scheduledSources = 0;
  let resolveResume;
  let contextInstance;

  function makeParam() {
    return {
      setValueAtTime() {},
      exponentialRampToValueAtTime() {}
    };
  }
  function makeNode() {
    return {
      gain: makeParam(),
      frequency: makeParam(),
      Q: { value: 0 },
      connect() {},
      disconnect() {},
      start() { scheduledSources += 1; },
      stop() {},
      set buffer(value) { this._buffer = value; }
    };
  }
  class MockAudioContext {
    constructor() {
      this.state = "suspended";
      this.currentTime = 0;
      this.sampleRate = 48000;
      this.destination = {};
      contextInstance = this;
    }
    resume() {
      return new Promise(resolve => {
        resolveResume = () => {
          this.state = "running";
          resolve();
        };
      });
    }
    createGain() { return makeNode(); }
    createBiquadFilter() { return makeNode(); }
    createBuffer() {
      return { getChannelData: () => new Float32Array(480) };
    }
    createBufferSource() { return makeNode(); }
  }

  const document = {
    hidden: false,
    activeElement: null,
    addEventListener(name, callback) { listeners[name] = callback; }
  };
  const window = {
    AudioContext: MockAudioContext,
    addEventListener() {},
    setTimeout(callback, delay) { timers.push({ callback, delay }); }
  };
  const sandbox = { window, document, Math, Promise };
  new Script(controller, { filename: "astro-tactile-feedback.js" }).runInNewContext(sandbox);

  const target = {
    nodeType: 1,
    parentElement: null,
    classList: { add() {}, remove() {} },
    closest(selector) {
      return selector === "[data-ac-interaction-feedback='off']" ? null : this;
    },
    hasAttribute() { return false; },
    getAttribute() { return null; }
  };

  listeners.pointerdown({ button: 0, isPrimary: true, target });
  assert.equal(contextInstance.state, "suspended");
  assert.equal(scheduledSources, 0, "Never schedule audio into a suspended context.");
  assert.equal(timers.length, 0, "Do not tear down the output graph before audio starts.");

  resolveResume();
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(contextInstance.state, "running");
  assert.equal(scheduledSources, 1, "Schedule the press click after resume succeeds.");
  assert.equal(timers.length, 1);
  assert.ok(timers[0].delay >= 120, "Keep the output connected through playback.");

  listeners.pointerup();
  assert.equal(scheduledSources, 2, "The release tack should also be emitted.");
});

test("Tactile sound feedback uses no external audio fetches or media files", () => {
  assert.equal(controller.includes("fetch("), false, "Audio must not be fetched from an external service.");
  assert.equal(controller.includes("new Audio("), false, "Audio must not depend on external media files.");
});
