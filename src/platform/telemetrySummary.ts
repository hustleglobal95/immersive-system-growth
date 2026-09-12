import type { TelemetryEvent } from "@/src/platform/telemetry";

export type TelemetryCertification = "ready" | "pass" | "attention";

export interface TelemetrySummary {
  status: TelemetryCertification;
  sessions: number;
  fpsSamples: number;
  averageFps: number | null;
  p50Fps: number | null;
  p95Fps: number | null;
  slowFrames: number;
  frames: number;
  slowFrameRate: number | null;
  webglFailures: number;
  quality: Record<string, number>;
}

export function summarizeTelemetry(
  events: TelemetryEvent[],
  targetFps: number,
): TelemetrySummary {
  const sessionIds = new Set(events.filter((event) => event.type === "session").map((event) => event.sessionId));
  const fpsValues = events
    .filter((event) => event.type === "fps")
    .map((event) => numberMetric(event.metrics.fps) ?? numberMetric(event.metrics.average))
    .filter((value): value is number => value !== null && value >= 0);
  const ordered = [...fpsValues].sort((a, b) => a - b);
  const frames = sumMetric(events, "frames");
  const slowFrames = sumMetric(events, "slowFrames");
  const webglFailures = events.filter((event) => event.type === "webgl" && String(event.metrics.status ?? "").toLowerCase() === "failed").length;
  const quality: Record<string, number> = {};
  events.forEach((event) => {
    const value = event.metrics.quality;
    if (typeof value === "string" && value.length) quality[value] = (quality[value] ?? 0) + 1;
  });
  const p50Fps = percentile(ordered, 0.5);
  const status: TelemetryCertification =
    !fpsValues.length
      ? "ready"
      : p50Fps !== null && p50Fps >= targetFps && webglFailures === 0
        ? "pass"
        : "attention";
  return {
    status,
    sessions: sessionIds.size,
    fpsSamples: fpsValues.length,
    averageFps: fpsValues.length ? fpsValues.reduce((total, value) => total + value, 0) / fpsValues.length : null,
    p50Fps,
    p95Fps: percentile(ordered, 0.95),
    slowFrames,
    frames,
    slowFrameRate: frames ? slowFrames / frames : null,
    webglFailures,
    quality,
  };
}

function numberMetric(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function sumMetric(events: TelemetryEvent[], key: string): number {
  return events.reduce((total, event) => total + (numberMetric(event.metrics[key]) ?? 0), 0);
}

function percentile(values: number[], rank: number): number | null {
  if (!values.length) return null;
  const index = Math.min(values.length - 1, Math.max(0, Math.ceil(values.length * rank) - 1));
  return values[index];
}
