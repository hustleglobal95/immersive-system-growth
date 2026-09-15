import assert from "node:assert/strict";
import test from "node:test";
import rawModes from "../config/experience-modes.json";
import rawExperience from "../config/experience.json";
import { EXPERIENCE_MODE_IDS, activeExperienceMode, auditExperienceMode, experienceModeClass, parseExperienceModes } from "../src/platform/experienceModes";

const manifest = parseExperienceModes(rawModes);

test("the complete six-mode registry validates", () => {
  assert.deepEqual(manifest.modes.map((mode) => mode.id), EXPERIENCE_MODE_IDS);
  assert.equal(activeExperienceMode(manifest).id, manifest.activeMode);
});

test("duplicate or incomplete registries fail closed", () => {
  assert.throws(() => parseExperienceModes({ ...rawModes, modes: rawModes.modes.slice(0, 5) }));
  assert.throws(() => parseExperienceModes({ ...rawModes, modes: rawModes.modes.map((mode, index) => index === 5 ? { ...mode, id: rawModes.modes[0].id } : mode) }));
});

test("mode classes are stable and CSS safe", () => {
  for (const id of EXPERIENCE_MODE_IDS) assert.equal(experienceModeClass(id), `experience-mode--${id}`);
});

test("product mode reports missing model requirements", () => {
  const product = manifest.modes.find((mode) => mode.id === "3d-product-view");
  assert.ok(product);
  assert.deepEqual(auditExperienceMode(product, { scenes: [{}, {}], assets: [] }), ["3D Product View requires a registered model or product rig"]);
  assert.equal(auditExperienceMode(product, rawExperience).length, 0);
});
