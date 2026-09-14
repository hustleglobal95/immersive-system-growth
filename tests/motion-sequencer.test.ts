import assert from "node:assert/strict";
import test from "node:test";
import raw from "../config/experience.json";
import { parseExperience, type ExperienceConfig } from "../src/lib/configSchema";
import { createMotionPreset } from "../src/platform/motionPresets";
import type { MotionTrack } from "../src/lib/motionSequencer";

const base = parseExperience(raw);
const rigBase = parseExperience({
  ...structuredClone(raw),
  heroModel: "/models/reference/product.glb",
  productRig: {
    model: "/models/reference/product.glb",
    nodes: [
      { id: "body", node: "Body", defaultVisible: true },
      { id: "screen", node: "Screen", defaultVisible: true },
      { id: "button", node: "Button", defaultVisible: true },
    ],
  },
});

function sampleScene(overrides: Partial<ExperienceConfig["scenes"][number]> = {}) {
  const config = structuredClone(base);
  config.scenes[0] = { ...config.scenes[0], ...overrides };
  return config;
}

test("motion tracks sample exact endpoints, cubic curves and reverse seeks deterministically", async () => {
  const { sampleMotionTrack } = await import("../src/lib/motionSequencer");
  const track = number("opacity", "copy.opacity", 0, 1);
  track.keyframes = [
    { id: "a", at: 0, value: 0, easing: "linear" },
    { id: "b", at: 0.5, value: 0.7, easing: [0.22, 0.61, 0.36, 1] },
    { id: "c", at: 1, value: 1, easing: "ease-in-out" },
  ];
  assert.equal(sampleMotionTrack(track, 0), 0);
  assert.equal(sampleMotionTrack(track, 1), 1);
  assert.equal(sampleMotionTrack(track, 0.5), 0.7);
  assert.equal(sampleMotionTrack(track, 0.37), sampleMotionTrack(track, 0.37));
});

test("scene tracks override runtime and auxiliary targets from one normalized time", async () => {
  const { sampleSceneMotion } = await import("../src/lib/motionSequencer");
  const config = sampleScene({
    motionTracks: [
      number("fov", "camera.fov", 42, 34),
      number("copy", "copy.opacity", 0, 1),
      number("bloom", "post.bloom", 0.1, 0.7),
    ],
  });
  const scene = parseExperience(config).scenes[0];
  const sample = sampleSceneMotion(scene, 0.5, "desktop");
  assert.ok(sample.number.has("camera.fov"));
  assert.ok(sample.number.has("copy.opacity"));
  assert.ok(sample.number.has("post.bloom"));
});

test("mobile tracks override all-viewport tracks without changing desktop output", async () => {
  const { sampleSceneMotion } = await import("../src/lib/motionSequencer");
  const all = number("all", "copy.opacity", 0, 1);
  const mobile = { ...number("mobile", "copy.opacity", 1, 0), viewport: "mobile" as const };
  const scene = parseExperience(sampleScene({ motionTracks: [all, mobile] })).scenes[0];
  assert.equal(sampleSceneMotion(scene, 0.25, "desktop").number.get("copy.opacity"), 0.25);
  assert.equal(sampleSceneMotion(scene, 0.25, "mobile").number.get("copy.opacity"), 0.75);
});

test("sequencer presets and dynamic GLB targets are valid and do not mutate the source", () => {
  const source = structuredClone(rigBase);
  const tracks = createMotionPreset("hero-rise", source, 0);
  assert.ok(tracks.length > 0);
  assert.deepEqual(source, rigBase);
  for (const track of tracks) assert.doesNotThrow(() => parseExperience({ ...source, scenes: source.scenes.map((scene, index) => index === 0 ? { ...scene, motionTracks: [track] } : scene) }));
});

test("cinematic focus and mapped-node cascade presets produce valid coordinated tracks", () => {
  const focus = createMotionPreset("cinematic-focus", rigBase, 0);
  const cascade = createMotionPreset("rig-cascade", rigBase, 0);
  assert.deepEqual(focus.map((track) => track.target), ["camera.fov", "post.bloom", "copy.opacity"]);
  assert.equal(cascade.length, Math.min(24, rigBase.productRig?.nodes.length ?? 0));
  assert.ok(cascade.length > 0);
  assert.ok(cascade.every((track) => track.target.startsWith("rig:") && "blend" in track && track.blend === "offset"));
  const config = structuredClone(rigBase);
  config.scenes[0].motionTracks = [...focus, ...cascade];
  assert.doesNotThrow(() => parseExperience(config));
});

test("motion validation rejects duplicate targets, unsafe values and missing mapped resources", () => {
  const duplicate = structuredClone(base);
  duplicate.scenes[0].motionTracks = [number("one", "copy.opacity", 0, 1), number("two", "copy.opacity", 1, 0)];
  assert.throws(() => parseExperience(duplicate), /Duplicate target/);
  const unsafe = structuredClone(base);
  unsafe.scenes[0].motionTracks = [number("opacity", "copy.opacity", -2, 4)];
  assert.throws(() => parseExperience(unsafe), /between 0 and 1/);
  const missingNode = structuredClone(base);
  missingNode.scenes[0].motionTracks = [vector("missing", "rig:not-mapped:position", [0, 0, 0], [1, 0, 0])];
  assert.throws(() => parseExperience(missingNode), /not mapped/);
  const missingLayer = structuredClone(base);
  missingLayer.scenes[0].motionTracks = [number("missing-layer", "layer:unknown:opacity", 0, 1)];
  assert.throws(() => parseExperience(missingLayer), /does not exist/);
  const missingMedia = structuredClone(base);
  delete missingMedia.scenes[0].media;
  missingMedia.scenes[0].motionTracks = [number("missing-media", "media.reveal", 0, 1)];
  assert.throws(() => parseExperience(missingMedia), /requires scene media/);
});

function number(id: string, target: Extract<MotionTrack, { type: "number" }>["target"], from: number, to: number): Extract<MotionTrack, { type: "number" }> {
  return { id, label: id, type: "number", target, blend: "absolute", viewport: "all", muted: false, locked: false, keyframes: [{ id: `${id}-a`, at: 0, value: from, easing: "linear" }, { id: `${id}-b`, at: 1, value: to, easing: "linear" }] };
}

function vector(id: string, target: Extract<MotionTrack, { type: "vector" }>["target"], from: [number, number, number], to: [number, number, number]): Extract<MotionTrack, { type: "vector" }> {
  return { id, label: id, type: "vector", target, blend: "absolute", viewport: "all", muted: false, locked: false, keyframes: [{ id: `${id}-a`, at: 0, value: from, easing: "linear" }, { id: `${id}-b`, at: 1, value: to, easing: "linear" }] };
}
