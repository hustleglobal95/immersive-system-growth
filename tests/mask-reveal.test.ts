import test from "node:test";
import assert from "node:assert/strict";
import { maskRevealSchema, sceneMediaSchema } from "../src/lib/configSchema";
import {
  createCssMaskStyle,
  createMaskReveal,
  maskPresetNames,
  resolveMaskBackend,
  sampleMaskAlpha,
} from "../src/lib/maskReveal";
import { maskPresetIndex, maskRevealFragmentShader } from "../src/lib/maskShader";

test("all eight mask presets have exact deterministic endpoints", () => {
  assert.equal(maskPresetNames.length, 8);
  for (const preset of maskPresetNames) {
    const mask = createMaskReveal(preset);
    for (const [u, v] of [[0, 0], [.25, .7], [.5, .5], [1, 1]]) {
      assert.equal(sampleMaskAlpha(0, u, v, mask), 0, `${preset} start`);
      assert.equal(sampleMaskAlpha(1, u, v, mask), 1, `${preset} end`);
    }
  }
});

test("mask sampling reconstructs the same frame while reversing", () => {
  for (const preset of maskPresetNames) {
    const mask = createMaskReveal(preset, { seed: 391, rotation: 17, softness: 9 });
    const path = [.03, .22, .48, .81, 1, .81, .48, .22, .03];
    const samples = path.map((progress) =>
      [0.1, 0.35, 0.6, 0.9].map((u) => sampleMaskAlpha(progress, u, 1 - u * .7, mask)),
    );
    assert.deepEqual(samples[0], samples[8]);
    assert.deepEqual(samples[1], samples[7]);
    assert.deepEqual(samples[2], samples[6]);
    assert.deepEqual(samples[3], samples[5]);
  }
});

test("CSS masks are valid, finite and preserve exact endpoint visibility", () => {
  for (const preset of maskPresetNames) {
    const mask = createMaskReveal(preset);
    for (const progress of [0, .18, .5, .82, 1]) {
      const style = createCssMaskStyle(progress, mask);
      const value = String(style.maskImage);
      assert.match(value, /gradient/);
      assert(!value.includes("NaN"));
      assert(!value.includes("Infinity"));
    }
    assert.equal(createCssMaskStyle(0, mask).maskImage, "linear-gradient(transparent, transparent)");
    assert.equal(createCssMaskStyle(1, mask).maskImage, "linear-gradient(black, black)");
  }
});

test("automatic backend policy protects reduced and lower-quality devices", () => {
  const organic = createMaskReveal("film-burn");
  const geometric = createMaskReveal("radial-iris");
  assert.equal(resolveMaskBackend(organic, { quality: "high", webglStatus: "ready", reducedMotion: false }), "webgl");
  assert.equal(resolveMaskBackend(organic, { quality: "medium", webglStatus: "ready", reducedMotion: false }), "dom");
  assert.equal(resolveMaskBackend(organic, { quality: "high", webglStatus: "lost", reducedMotion: false }), "dom");
  assert.equal(resolveMaskBackend(geometric, { quality: "high", webglStatus: "ready", reducedMotion: false }), "dom");
  assert.equal(resolveMaskBackend(organic, { quality: "high", webglStatus: "ready", reducedMotion: true }), "static");
});

test("mask schema and shader cover every named preset", () => {
  const indices = maskPresetNames.map(maskPresetIndex);
  assert.equal(new Set(indices).size, maskPresetNames.length);
  assert.match(maskRevealFragmentShader, /uProgress/);
  assert.match(maskRevealFragmentShader, /uEdgeColor/);
  assert(maskRevealSchema.safeParse(createMaskReveal("noise-dissolve")).success);
  assert(!maskRevealSchema.safeParse({ ...createMaskReveal("noise-dissolve"), seed: 10_000 }).success);
  assert(sceneMediaSchema.safeParse({
    kind: "image",
    src: "/textures/reference/reveal-field.svg",
    alt: "Reveal field",
    transition: "mask",
    mask: createMaskReveal("ink-spread"),
  }).success);
});
