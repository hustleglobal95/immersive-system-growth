import type { PerformanceMetric, PerformanceSample } from "@/src/platform/performanceBudget";

export interface PerformanceRegressionPolicy {
  warnPercent: Partial<Record<PerformanceMetric, number>>;
  failPercent: Partial<Record<PerformanceMetric, number>>;
}

export interface PerformanceRegressionCheck {
  metric: PerformanceMetric;
  baseline: number;
  current: number;
  deltaPercent: number;
  direction: "higher-worse" | "lower-worse";
  status: "pass" | "warn" | "fail";
}

export interface PerformanceRegressionReport {
  status: "pass" | "warn" | "fail";
  checks: PerformanceRegressionCheck[];
}

export const defaultPerformanceRegressionPolicy: PerformanceRegressionPolicy = {
  warnPercent: {
    initialCriticalMb: 10,
    scenePreloadMb: 12,
    activeMb: 12,
    totalMb: 12,
    drawCalls: 15,
    triangles: 15,
    fps: 8,
  },
  failPercent: {
    initialCriticalMb: 20,
    scenePreloadMb: 25,
    activeMb: 25,
    totalMb: 25,
    drawCalls: 30,
    triangles: 30,
    fps: 15,
  },
};

const metrics: PerformanceMetric[] = ["initialCriticalMb", "scenePreloadMb", "activeMb", "totalMb", "drawCalls", "triangles", "fps"];

export function comparePerformance(
  baseline: PerformanceSample,
  current: PerformanceSample,
  policy: PerformanceRegressionPolicy = defaultPerformanceRegressionPolicy,
): PerformanceRegressionReport {
  const checks = metrics.map((metric): PerformanceRegressionCheck => {
    const base = baseline[metric];
    const value = current[metric];
    const direction = metric === "fps" ? "lower-worse" as const : "higher-worse" as const;
    const rawDelta = base === 0 ? (value === 0 ? 0 : 100) : ((value - base) / Math.abs(base)) * 100;
    const regressionPercent = direction === "lower-worse" ? -rawDelta : rawDelta;
    const warn = policy.warnPercent[metric] ?? Number.POSITIVE_INFINITY;
    const fail = policy.failPercent[metric] ?? Number.POSITIVE_INFINITY;
    const status = regressionPercent >= fail ? "fail" as const : regressionPercent >= warn ? "warn" as const : "pass" as const;
    return { metric, baseline: base, current: value, deltaPercent: rawDelta, direction, status };
  });
  const status = checks.some((check) => check.status === "fail") ? "fail" : checks.some((check) => check.status === "warn") ? "warn" : "pass";
  return { status, checks };
}

export function formatPerformanceRegression(report: PerformanceRegressionReport) {
  return report.checks.map((check) => {
    const sign = check.deltaPercent >= 0 ? "+" : "";
    return `${check.status.toUpperCase().padEnd(4)} ${check.metric}: ${check.current} vs ${check.baseline} (${sign}${check.deltaPercent.toFixed(1)}%)`;
  }).join("\n");
}
