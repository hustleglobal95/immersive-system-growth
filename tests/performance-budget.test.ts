import assert from "node:assert/strict";
import test from "node:test";
import rawProject from "../config/forge-project.json";
import { parseForgeProject } from "../src/platform/forgeProjectSchema";
import {
  evaluatePerformanceSample,
  formatPerformanceEvaluation,
} from "../src/platform/performanceBudget";

const project = parseForgeProject(rawProject);

test("a device sample passes when all budgets and target FPS are met", () => {
  const evaluation = evaluatePerformanceSample(project, {
    initialCriticalMb: 4,
    scenePreloadMb: 12,
    activeMb: 42,
    totalMb: 180,
    drawCalls: 120,
    triangles: 400_000,
    fps: 60,
  });
  assert.equal(evaluation.status, "pass");
  assert.equal(evaluation.failures.length, 0);
  assert.match(formatPerformanceEvaluation(evaluation), /PASS fps/);
});

test("a sample fails with the exact metrics that exceed the release budget", () => {
  const evaluation = evaluatePerformanceSample(project, {
    initialCriticalMb: 9,
    scenePreloadMb: 12,
    activeMb: 42,
    totalMb: 180,
    drawCalls: 260,
    triangles: 400_000,
    fps: 54,
  });
  assert.equal(evaluation.status, "fail");
  assert.deepEqual(
    evaluation.failures.map((check) => check.metric),
    ["initialCriticalMb", "drawCalls", "fps"],
  );
});

test("budget ratios remain inspectable for telemetry dashboards", () => {
  const evaluation = evaluatePerformanceSample(project, {
    initialCriticalMb: 2,
    scenePreloadMb: 4,
    activeMb: 8,
    totalMb: 16,
    drawCalls: 10,
    triangles: 10_000,
    fps: 120,
  });
  const fps = evaluation.checks.find((check) => check.metric === "fps");
  assert.ok(fps);
  assert.equal(fps.ratio, 0.5);
});
