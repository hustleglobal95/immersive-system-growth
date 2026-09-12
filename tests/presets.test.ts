import assert from "node:assert/strict";
import test from "node:test";
import rawExperience from "../config/experience.json";
import rawPresetPack from "../config/presets.json";
import { sceneMediaSchema, parseExperience } from "../src/lib/configSchema";
import { applyForgePreset, parsePresetPack, presetCatalog } from "../src/platform/presetRegistry";

test("the preset pack is versioned and has unique reusable definitions", () => {
  const pack = parsePresetPack(rawPresetPack);
  assert.equal(pack.version, 1);
  assert.equal(new Set(pack.presets.map((preset) => preset.id)).size, pack.presets.length);
  assert.equal(pack.presets.filter((preset) => preset.kind === "motion").length, 8);
  assert.equal(pack.presets.filter((preset) => preset.kind === "transition").length, 6);
  assert.equal(presetCatalog.length, pack.presets.length);
});

test("motion presets are applied with namespaced track IDs without mutating the source", () => {
  const base = parseExperience(rawExperience);
  const next = applyForgePreset(base, 0, "cinematic-focus");
  assert.notDeepEqual(next, base);
  assert.equal(base.scenes[0].motionTracks.length, 0);
  assert.ok(next.scenes[0].motionTracks.length >= 3);
  assert.ok(next.scenes[0].motionTracks.every((track) => track.id.startsWith("cinematic-focus-")));
});

test("transition presets update media settings and preserve reversibility data", () => {
  const base = parseExperience(rawExperience);
  const withMedia = structuredClone(base);
  withMedia.scenes[0].media = sceneMediaSchema.parse({
    kind: "image",
    src: "/textures/reference/reveal-field.svg",
    alt: "Reference reveal",
    transition: "slide",
    layers: [],
  });
  const next = applyForgePreset(withMedia, 0, "transition-noise-mask");
  assert.equal(next.scenes[0].media?.transition, "mask");
  assert.equal(next.scenes[0].media?.mask?.preset, "noise-dissolve");
  assert.equal(next.scenes[0].media?.mask?.direction, "right");
  assert.deepEqual(withMedia.scenes[0].media?.layers, []);
});

test("media-only presets fail clearly when no scene media exists", () => {
  const base = parseExperience(rawExperience);
  assert.throws(() => applyForgePreset(base, 0, "transition-film-burn"), /requires scene media/);
});