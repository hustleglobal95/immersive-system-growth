import assert from "node:assert/strict";
import test from "node:test";
import raw from "../config/experience.json";
import { parseExperience } from "../src/lib/configSchema";
import { applyMaskPreset, applyMediaTransition, applyScenePreset, moveSceneBoundary, replaceScene } from "../src/platform/studioPresets";

test("Studio presets remain schema-valid and deterministic", () => {
  const config = parseExperience(raw);
  const scene = applyScenePreset(config.scenes[0], "product-reveal");
  const changed = replaceScene(config, 0, scene);
  assert.equal(parseExperience(changed).scenes[0].hero.motion, "rise");
  assert.deepEqual(applyScenePreset(config.scenes[0], "product-reveal"), scene);
});

test("timeline boundaries stay contiguous and media transitions are editable", () => {
  const config = parseExperience(raw);
  const moved = moveSceneBoundary(config, 1, 0.22);
  assert.equal(moved.scenes[0].range[1], moved.scenes[1].range[0]);
  assert.doesNotThrow(() => parseExperience(moved));
  const withMedia = { ...config.scenes[0], media: { kind: "image" as const, src: "/textures/test.jpg", alt: "Test", transition: "slide" as const, position: [50, 50] as [number, number], mobilePosition: [50, 50] as [number, number], overlap: 0.25, direction: "up" as const, zoom: 1.06, textEnd: 0.28, maskSoftness: 18 } };
  assert.equal(applyMediaTransition(withMedia, "wipe").media?.transition, "wipe");
  const masked = applyMaskPreset(withMedia, "film-burn", { seed: 4096 });
  assert.equal(masked.media?.transition, "mask");
  assert.equal(masked.media?.mask?.preset, "film-burn");
  assert.equal(masked.media?.mask?.seed, 4096);
  assert.doesNotThrow(() => parseExperience(replaceScene(config, 0, masked)));
});
