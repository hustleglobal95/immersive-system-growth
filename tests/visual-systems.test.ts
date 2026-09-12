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
const ambient = manifest.systems.find((system) => system.id === "ambient-field");
assert.ok(ambient);

test("visual system manifests validate and expose a deterministic budget", () => {
  assert.equal(manifest.version, 1);
  assert.equal(qualityInstanceCount(ambient, "low"), 32);
  assert.equal(qualityInstanceCount(ambient, "medium"), 88);
  assert.equal(qualityInstanceCount(ambient, "high"), 160);
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
