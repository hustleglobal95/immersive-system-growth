import assert from "node:assert/strict";
import test from "node:test";
import rawExperience from "../config/experience.json";
import rigRaw from "../recipes/burger-showcase.json";
import { parseExperience } from "../src/lib/configSchema";
import { cubicBezierAtX, sampleMotionTrack } from "../src/lib/motionSequencer";
import { sampleExperience } from "../src/lib/sampleExperience";
import { createMotionPreset, createTrackForTarget, motionTargetOptions } from "../src/platform/motionPresets";
import type { MotionTrack } from "../src/types/experience";

const base = parseExperience(rawExperience);
const rigBase = parseExperience(rigRaw);

test("motion tracks sample exact endpoints, cubic curves and reverse seeks deterministically", () => {
  const track: MotionTrack = {
    id: "camera-fov",
    label: "Camera FOV",
    type: "number",
    target: "camera.fov",
    blend: "absolute",
    viewport: "all",
    muted: false,
    locked: false,
    keyframes: [
      { id: "camera-fov-a", at: 0, value: 32, easing: "cubic", curve: [0.16, 1, 0.3, 1] },
      { id: "camera-fov-b", at: 0.6, value: 58, easing: "ease-in-out" },
      { id: "camera-fov-c", at: 1, value: 42, easing: "smooth" },
    ],
  };
  assert.equal(sampleMotionTrack(track, 0), 32);
  assert.equal(sampleMotionTrack(track, 1), 42);
  assert.equal(sampleMotionTrack(track, Number.NaN), 32);
  assert.equal(cubicBezierAtX(0, [0.16, 1, 0.3, 1]), 0);
  assert.equal(cubicBezierAtX(1, [0.16, 1, 0.3, 1]), 1);
  const samples = Array.from({ length: 201 }, (_, index) => sampleMotionTrack(track, index / 200));
  for (let index = 200; index >= 0; index -= 1) assert.deepEqual(sampleMotionTrack(track, index / 200), samples[index]);
});

test("scene tracks override runtime and auxiliary targets from one normalized time", () => {
  const input = structuredClone(rigBase);
  input.scenes[0].media = {
    kind: "image",
    src: "/textures/reference/reveal-field.svg",
    alt: "Reference reveal",
    transition: "mask",
    maskSoftness: 18,
    layers: [{ id: "flash", kind: "color", color: "#ff5500", blendMode: "screen", opacity: 1, range: [0, 1], motion: "none" }],
    position: [50, 50],
    mobilePosition: [50, 50],
    overlap: 0.25,
    direction: "up",
    zoom: 1.06,
    textEnd: 0.28,
  };
  input.scenes[0].motionTracks = [
    number("camera-fov", "camera.fov", 30, 60),
    vector("hero-position", "hero.position", [0, 0, 0], [2, 1, 0]),
    number("key-light", "world.key", 2, 8),
    number("copy-opacity", "copy.opacity", 0, 1),
    number("media-reveal", "media.reveal", 0, 1),
    number("flash-opacity", "layer:flash:opacity", 0, 0.8),
    vector("bun-position", "rig:top-bun:position", [0, 0, 0], [0, 2, 0]),
  ];
  const config = parseExperience(input);
  const progress = config.scenes[0].range[1] * 0.5;
  const state = sampleExperience(progress, false, config);
  assert.equal(state.camera.fov, 45);
  assert.deepEqual(state.hero.position, [1, 0.5, 0]);
  assert.equal(state.world.key, 5);
  assert.equal(state.motion.copy.opacity, 0.5);
  assert.equal(state.motion.media.reveal, 0.5);
  assert.equal(state.motion.layers.flash, 0.4);
  assert.deepEqual(state.motion.rig["top-bun"].position?.value, [0, 1, 0]);
});

test("mobile tracks override all-viewport tracks without changing desktop output", () => {
  const input = structuredClone(base);
  input.scenes[0].motionTracks = [
    vector("camera-all", "camera.position", [1, 2, 7], [1, 2, 7]),
    { ...vector("camera-mobile", "camera.position", [0, 1, 12], [0, 1, 12]), viewport: "mobile" },
  ];
  const config = parseExperience(input);
  assert.deepEqual(sampleExperience(0.05, false, config, 16 / 9).camera.position, [1, 2, 7]);
  assert.deepEqual(sampleExperience(0.05, false, config, 9 / 16).camera.position, [0, 1, 12]);
});

test("sequencer presets and dynamic GLB targets are valid and do not mutate the source", () => {
  const snapshot = structuredClone(rigBase);
  const options = motionTargetOptions(rigBase, rigBase.scenes[0]);
  const node = options.find((option) => option.target === "rig:top-bun:rotation");
  assert.ok(node);
  const track = createTrackForTarget(rigBase, 0, node, "desktop");
  const preset = createMotionPreset("copy-rise", rigBase, 0);
  const config = structuredClone(rigBase);
  config.scenes[0].motionTracks = [track, ...preset];
  assert.doesNotThrow(() => parseExperience(config));
  assert.deepEqual(rigBase, snapshot);
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
