import assert from "node:assert/strict";
import test from "node:test";
import raw from "../config/experience.json";
import automotiveRaw from "../recipes/automotive.json";
import burgerRaw from "../recipes/burger-showcase.json";
import productRaw from "../recipes/product.json";
import realEstateRaw from "../recipes/real-estate.json";
import restaurantRaw from "../recipes/restaurant.json";
import saasRaw from "../recipes/saas.json";
import { parseExperience } from "../src/lib/configSchema";
import { validateInvariants } from "../src/core/invariants/invariants";
import { sceneInvariants } from "../src/domain/scene/invariants";
import { RuntimeHealthRegistry } from "../src/runtime/health/runtimeHealth";
import { comparePerformance } from "../src/platform/performanceRegression";
import type { PerformanceSample } from "../src/platform/performanceBudget";

const fixtures = {
  default: raw,
  automotive: automotiveRaw,
  burger: burgerRaw,
  product: productRaw,
  realEstate: realEstateRaw,
  restaurant: restaurantRaw,
  saas: saasRaw,
};

test("golden production recipes remain schema-valid and satisfy scene invariants", () => {
  for (const [name, fixture] of Object.entries(fixtures)) {
    const experience = parseExperience(fixture);
    const violations = validateInvariants(experience, sceneInvariants).filter((item) => item.level === "error");
    assert.deepEqual(violations, [], `${name} fixture should satisfy core scene invariants`);
  }
});

test("generated stress fixture preserves invariants at flagship-scale scene counts", () => {
  const base = parseExperience(raw);
  const source = structuredClone(base.scenes[0]);
  const scenes = Array.from({ length: 16 }, (_, index) => ({
    ...structuredClone(source),
    id: `stress-scene-${index + 1}`,
    label: `Stress Scene ${index + 1}`,
    range: [index / 16, (index + 1) / 16] as [number, number],
    blocks: source.blocks.map((block, blockIndex) => ({
      ...structuredClone(block),
      id: `stress-block-${index}-${blockIndex}`,
    })),
    motionTracks: Array.from({ length: 4 }, (__, trackIndex) => ({
      ...structuredClone(source.motionTracks[trackIndex % Math.max(1, source.motionTracks.length)] ?? {
        id: "generated",
        label: "Generated",
        type: "number",
        target: ["copy.opacity", "copy.y", "camera.fov", "world.exposure"][trackIndex],
        blend: "absolute",
        viewport: "all",
        muted: false,
        locked: false,
        keyframes: [
          { id: `generated-${index}-${trackIndex}-0`, at: 0, value: [0, 0, 42, 1][trackIndex], easing: "linear" },
          { id: `generated-${index}-${trackIndex}-1`, at: 1, value: [1, 1, 46, 1.1][trackIndex], easing: "linear" },
        ],
      }),
      id: `stress-${index}-${trackIndex}`,
    })),
  }));
  // The generator renames every scene, so everything that references a scene by id has to
  // be carried across with it. Otherwise the fixture describes a config that cannot exist
  // and the scale invariants never get exercised at all.
  const remap = new Map(base.scenes.map((scene, index) => [scene.id, scenes[index % scenes.length].id]));
  const rename = (sceneId: string) => remap.get(sceneId) ?? scenes[0].id;
  const hotspots = base.hotspots.map((hotspot) => ({
    ...structuredClone(hotspot),
    sceneId: rename(hotspot.sceneId),
  }));
  const assets = base.assets.map((asset) => {
    const next = structuredClone(asset);
    if (next.scenes) next.scenes = next.scenes.map(rename);
    if (next.kind === "model" && next.animation) next.animation.sceneId = rename(next.animation.sceneId);
    if (next.kind === "video" && next.sceneId) next.sceneId = rename(next.sceneId);
    return next;
  });
  let stress: ReturnType<typeof parseExperience>;
  try {
    stress = parseExperience({ ...structuredClone(base), scenes, hotspots, assets });
  } catch (error) {
    assert.fail(error instanceof Error ? error.message : String(error));
  }
  assert.equal(stress.scenes.length, 16);
  const stressSceneIds = new Set(stress.scenes.map((scene) => scene.id));
  assert.equal(stress.hotspots.length, base.hotspots.length);
  assert.ok(stress.hotspots.every((hotspot) => stressSceneIds.has(hotspot.sceneId)));
  assert.ok(
    stress.assets.every((asset) => (asset.scenes ?? []).every((sceneId) => stressSceneIds.has(sceneId))),
  );
  assert.ok(stress.scenes.reduce((sum, scene) => sum + scene.motionTracks.length, 0) >= 64);
  assert.deepEqual(validateInvariants(stress, sceneInvariants).filter((item) => item.level === "error"), []);
});

test("runtime health degrades locally and preserves subsystem detail", () => {
  const health = new RuntimeHealthRegistry();
  health.report("webgl", "healthy", undefined, { fps: 60 });
  health.report("media", "degraded", "Video unavailable; poster fallback active.");
  const snapshot = health.snapshot();
  assert.equal(snapshot.status, "degraded");
  assert.equal(snapshot.entries.webgl.status, "healthy");
  assert.equal(snapshot.entries.media.status, "degraded");
  assert.equal(snapshot.errors.at(-1)?.subsystem, "media");
});

test("performance regression policy catches relative degradation in both cost and FPS metrics", () => {
  const baseline: PerformanceSample = {
    initialCriticalMb: 5,
    scenePreloadMb: 4,
    activeMb: 12,
    totalMb: 30,
    drawCalls: 100,
    triangles: 300000,
    fps: 60,
  };
  const healthy = comparePerformance(baseline, { ...baseline, initialCriticalMb: 5.2, fps: 59 });
  assert.equal(healthy.status, "pass");

  const regressed = comparePerformance(baseline, { ...baseline, initialCriticalMb: 6.5, drawCalls: 140, fps: 48 });
  assert.equal(regressed.status, "fail");
  assert.equal(regressed.checks.find((item) => item.metric === "fps")?.status, "fail");
});
