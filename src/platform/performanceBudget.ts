import type { ForgeProject } from "@/src/platform/forgeProjectSchema";

export interface PerformanceSample {
  initialCriticalMb: number;
  scenePreloadMb: number;
  activeMb: number;
  totalMb: number;
  drawCalls: number;
  triangles: number;
  fps: number;
}

export type PerformanceMetric = keyof PerformanceSample;

export interface PerformanceCheck {
  metric: PerformanceMetric;
  value: number;
  budget: number;
  unit: "MB" | "count" | "FPS";
  ratio: number;
  passed: boolean;
}

export interface PerformanceEvaluation {
  status: "pass" | "fail";
  checks: PerformanceCheck[];
  failures: PerformanceCheck[];
}

const metricBudgetMap: Array<{
  metric: PerformanceMetric;
  budget: keyof ForgeProject["performance"];
  unit: PerformanceCheck["unit"];
}> = [
  { metric: "initialCriticalMb", budget: "initialCriticalMb", unit: "MB" },
  { metric: "scenePreloadMb", budget: "scenePreloadMb", unit: "MB" },
  { metric: "activeMb", budget: "maxActiveMb", unit: "MB" },
  { metric: "totalMb", budget: "maxTotalMb", unit: "MB" },
  { metric: "drawCalls", budget: "maxDrawCalls", unit: "count" },
  { metric: "triangles", budget: "maxTriangles", unit: "count" },
];

export function evaluatePerformanceSample(
  project: ForgeProject,
  sample: PerformanceSample,
): PerformanceEvaluation {
  const checks = metricBudgetMap.map(({ metric, budget, unit }) => {
    const value = sample[metric];
    const limit = project.performance[budget];
    return {
      metric,
      value,
      budget: limit,
      unit,
      ratio: value / limit,
      passed: value <= limit,
    };
  });
  const fps = {
    metric: "fps" as const,
    value: sample.fps,
    budget: project.performance.targetFps,
    unit: "FPS" as const,
    ratio: project.performance.targetFps / Math.max(sample.fps, 0.001),
    passed: sample.fps >= project.performance.targetFps,
  };
  checks.push(fps);
  const failures = checks.filter((check) => !check.passed);
  return {
    status: failures.length ? "fail" : "pass",
    checks,
    failures,
  };
}

export function formatPerformanceEvaluation(
  evaluation: PerformanceEvaluation,
): string {
  const lines = evaluation.checks.map((check) => {
    const value = check.unit === "FPS"
      ? check.value.toFixed(1)
      : check.value.toFixed(2);
    const budget = check.unit === "FPS"
      ? check.budget.toFixed(1)
      : check.budget.toFixed(2);
    return (check.passed ? "PASS " : "FAIL ") +
      check.metric +
      ": " +
      value +
      " / " +
      budget +
      " " +
      check.unit;
  });
  return lines.join("\n");
}
