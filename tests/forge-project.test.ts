import assert from "node:assert/strict";
import test from "node:test";
import rawForgeProject from "../config/forge-project.json";
import {
  CURRENT_FORGE_PROJECT_SCHEMA_VERSION,
  parseForgeProject,
  parseForgeProjectWithReport,
} from "../src/platform/forgeProjectSchema";

const project = parseForgeProject(rawForgeProject);

test("the canonical manifest references the six validated project documents", () => {
  assert.equal(project.paths.experience, "config/experience.json");
  assert.equal(project.paths.studioProject, "config/studio-project.json");
  assert.equal(project.paths.creativeDirection, "config/creative-direction.json");
  assert.equal(project.paths.assetManifest, "config/asset-manifest.json");
  assert.equal(project.paths.visualSystems, "config/visual-systems.json");
  assert.equal(project.paths.experienceModes, "config/experience-modes.json");
});

test("the canonical manifest is persisted at the current schema version", () => {
  assert.equal(project.schemaVersion, CURRENT_FORGE_PROJECT_SCHEMA_VERSION);
  assert.equal(project.engineering.strictInvariants, true);
  assert.equal(project.engineering.commandTransactions, true);
  assert.equal(project.engineering.performanceRegressionGate, true);
  assert.equal(project.engineering.visualEvidenceRequired, true);
});

test("legacy schema-one manifests migrate deterministically before validation", () => {
  const legacy = structuredClone(rawForgeProject) as Record<string, unknown>;
  delete legacy.schemaVersion;
  delete legacy.engineering;
  const result = parseForgeProjectWithReport(legacy);
  assert.deepEqual(result.applied, [1]);
  assert.equal(result.project.schemaVersion, CURRENT_FORGE_PROJECT_SCHEMA_VERSION);
  assert.equal(result.project.engineering.strictInvariants, true);
  assert.equal((legacy as { schemaVersion?: number }).schemaVersion, undefined, "migration must not mutate the caller's input");
});

test("current manifests are migration-idempotent", () => {
  const result = parseForgeProjectWithReport(rawForgeProject);
  assert.deepEqual(result.applied, []);
  assert.deepEqual(result.project, project);
});

test("the performance budgets are ordered from critical to total", () => {
  assert.ok(project.performance.initialCriticalMb <= project.performance.scenePreloadMb);
  assert.ok(project.performance.scenePreloadMb <= project.performance.maxActiveMb);
  assert.ok(project.performance.maxActiveMb <= project.performance.maxTotalMb);
});

test("unsafe, contradictory or future project manifests are rejected", () => {
  assert.throws(() => parseForgeProject({
    ...rawForgeProject,
    paths: { ...rawForgeProject.paths, experience: "../outside.json" },
  }));
  assert.throws(() => parseForgeProject({
    ...rawForgeProject,
    performance: { ...rawForgeProject.performance, maxTotalMb: 10 },
  }), /Total asset budget/);
  assert.throws(() => parseForgeProject({ ...rawForgeProject, schemaVersion: 999 }), /newer than supported schema/);
});