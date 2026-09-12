import rawProject from "../config/forge-project.json";
import { parseForgeProject } from "../src/platform/forgeProjectSchema";
import { evaluatePerformanceSample, formatPerformanceEvaluation } from "../src/platform/performanceBudget";

const project = parseForgeProject(rawProject);
const sample = {
  initialCriticalMb: project.performance.initialCriticalMb,
  scenePreloadMb: project.performance.scenePreloadMb,
  activeMb: project.performance.maxActiveMb,
  totalMb: project.performance.maxTotalMb,
  drawCalls: project.performance.maxDrawCalls,
  triangles: project.performance.maxTriangles,
  fps: project.performance.targetFps,
};
console.log(formatPerformanceEvaluation(evaluatePerformanceSample(project, sample)));
