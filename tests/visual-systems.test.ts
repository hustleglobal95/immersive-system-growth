import assert from "node:assert/strict";
import test from "node:test";
import rawManifest from "../config/visual-systems.json";
import {
  parseVisualSystems,
  qualityInstanceCount,
  sampleInstancedField,
  visualSystemMode,
} from "../src/platform/visualSystems";

const manifest = parseVisualSystems(rawManifest);
const ambient = manifest.systems.find((system) => system.kind === "instanced-field");
assert.ok(ambient);

test("visual system manifests validate and expose a deterministic budget", () => {
  assert.equal(manifest.version, 1);
  const low = qualityInstanceCount(ambient, "low");
  const medium = qualityInstanceCount(ambient, "medium");
  const high = qualityInstanceCount(ambient, "high");
  assert.equal(low, Math.max(1, Math.round(ambient.instanceCount * 0.2)));
  assert.equal(medium, Math.max(1, Math.round(ambient.instanceCount * 0.55)));
  assert.equal(high, ambient.instanceCount);
  assert.ok(low <= medium && medium <= high);
});

test("instanced field sampling is deterministic for the same seed", () => {
  assert.deepEqual(sampleInstancedField(ambient, 4), sampleInstancedField(ambient, 4));
  assert.notDeepEqual(
    sampleInstancedField(ambient, 4),
    sampleInstancedField({ ...ambient, seed: ambient.seed + 1 }, 4),
  );
});

test("visual systems have an explicit reduced-motion fallback", () => {
  assert.equal(visualSystemMode(ambient, "high", false), "dynamic");
  assert.equal(visualSystemMode(ambient, "high", true), "static");
  assert.equal(visualSystemMode({ ...ambient, fallback: "hidden" }, "high", false), "hidden");
});

test("invalid visual system definitions are rejected", () => {
  assert.throws(() =>
    parseVisualSystems({
      ...rawManifest,
      systems: [rawManifest.systems[0], rawManifest.systems[0]],
    }),
  );
});
