import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import rawBlueprint from "../config/interactive3d-blueprint.example.json";
import rawExperience from "../config/experience.json";
import rawManifest from "../config/asset-manifest.json";
import rawGraph from "../config/interaction-graph.json";
import { parseInteractive3DBlueprint } from "../src/platform/interactive3dBlueprint";
import { evaluateInteractive3DBlueprintPolicy } from "../src/platform/interactive3dPolicy";
import { compileInteractive3DBlueprint } from "../src/platform/interactive3dCompiler";
import { buildForgeBuildPacket } from "../src/platform/buildPacket";
import { runDirectorIntelligence } from "../src/platform/director-intelligence/orchestrator";

test("interactive 3D blueprint compiles into existing Forge-native systems", () => {
  const blueprint = parseInteractive3DBlueprint(rawBlueprint);
  const policy = evaluateInteractive3DBlueprintPolicy(blueprint);
  assert.equal(policy.passed, true);
  const plan = compileInteractive3DBlueprint(blueprint);
  assert.equal(plan.renderer.productionBaseline, "webgl");
  assert.equal(plan.renderer.persistentCanvas, true);
  assert.equal(plan.signatureSlice.sceneId, "hero-reveal");
  assert.equal(plan.scenes[0].camera.choreography, "director-pullback-reveal");
  assert.ok(plan.scenes[0].recipes.includes("forge.persistent-canvas"));
  assert.ok(plan.scenes[0].recipes.includes("forge.camera-director"));
  assert.equal(plan.assetJobs[0].disposition, "generate");
  assert.ok(plan.assetJobs[0].runtimeContract.some((item) => /GLB/i.test(item)));
  assert.ok(plan.safeRepairPaths.includes("performance.maxDrawCalls"));
});

test("interactive 3D policy blocks unbounded camera output and arbitrary remote model URLs", () => {
  const candidate = structuredClone(rawBlueprint);
  candidate.experience.scenes[0].camera.move = "custom";
  candidate.assets[0].status = "existing";
  candidate.assets[0].source = "https://example.com/untrusted.glb";
  const report = evaluateInteractive3DBlueprintPolicy(candidate);
  assert.equal(report.passed, false);
  assert.ok(report.blockers.some((item) => item.code === "camera.custom-unbounded"));
  assert.ok(report.blockers.some((item) => item.code === "asset.remote-model-url"));
});

test("interactive 3D policy requires cold-first-use prewarm work for 3D scenes", () => {
  const candidate = structuredClone(rawBlueprint);
  candidate.experience.scenes[1].prewarm = [];
  const report = evaluateInteractive3DBlueprintPolicy(candidate);
  assert.equal(report.passed, false);
  assert.ok(report.blockers.some((item) => item.code === "scene.prewarm-required"));
});

test("Forge Build Packet carries the compiled interactive 3D contract into implementation", () => {
  const blueprint = parseInteractive3DBlueprint(rawBlueprint);
  const director = runDirectorIntelligence({
    brief: compileInteractive3DBlueprint(blueprint).directorBrief,
  });
  const packet = buildForgeBuildPacket({
    director,
    currentState: {
      experience: rawExperience,
      assetManifest: rawManifest,
      interactionGraph: rawGraph,
    },
    repoContract: fs.readFileSync("CLAUDE.md", "utf8"),
    interactive3dBlueprint: blueprint,
  });
  assert.match(packet, /## INTERACTIVE 3D COMPILER CONTRACT/);
  assert.match(packet, /forge-interactive-3d/);
  assert.match(packet, /forge\.persistent-canvas/);
  assert.match(packet, /AI may choose Blueprint data and approved Forge recipes/);
});
