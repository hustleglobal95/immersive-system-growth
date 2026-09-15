import assert from "node:assert/strict";
import test from "node:test";
import rawForgeProject from "../config/forge-project.json";
import { parseForgeProject } from "../src/platform/forgeProjectSchema";

const project = parseForgeProject(rawForgeProject);

test("the canonical manifest references the six validated project documents", () => {
  assert.equal(project.paths.experience, "config/experience.json");
  assert.equal(project.paths.studioProject, "config/studio-project.json");
  assert.equal(project.paths.creativeDirection, "config/creative-direction.json");
  assert.equal(project.paths.assetManifest, "config/asset-manifest.json");
  assert.equal(project.paths.visualSystems, "config/visual-systems.json");
  assert.equal(project.paths.experienceModes, "config/experience-modes.json");
});

test("the performance budgets are ordered from critical to total", () => {
  assert.ok(project.performance.initialCriticalMb <= project.performance.scenePreloadMb);
  assert.ok(project.performance.scenePreloadMb <= project.performance.maxActiveMb);
  assert.ok(project.performance.maxActiveMb <= project.performance.maxTotalMb);
});

test("unsafe or contradictory project manifests are rejected", () => {
  assert.throws(() => parseForgeProject({
    ...rawForgeProject,
    paths: { ...rawForgeProject.paths, experience: "../outside.json" },
  }));
  assert.throws(() => parseForgeProject({
    ...rawForgeProject,
    performance: { ...rawForgeProject.performance, maxTotalMb: 10 },
  }), /Total asset budget/);
});