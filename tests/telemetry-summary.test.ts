import assert from "node:assert/strict";
import test from "node:test";
import type { TelemetryEvent } from "../src/platform/telemetry";
import { summarizeTelemetry } from "../src/platform/telemetrySummary";

const base: TelemetryEvent = {
  version: 1,
  projectId: "ember-bun-reference",
  sessionId: "747c9b7c-3584-4af2-9b93-145a65b07f62",
  type: "fps",
  at: "2026-09-11T10:00:00.000Z",
  page: "/",
  device: { width: 390, height: 844, dpr: 3, reducedMotion: false },
  metrics: { fps: 60, frames: 120, slowFrames: 2, quality: "medium" },
};

test("telemetry summary reports percentile performance and a passing certification", () => {
  const summary = summarizeTelemetry([
    { ...base, type: "session", metrics: {} },
    base,
    { ...base, metrics: { fps: 62, frames: 120, slowFrames: 1, quality: "high" } },
  ], 60);
  assert.equal(summary.sessions, 1);
  assert.equal(summary.fpsSamples, 2);
  assert.equal(summary.p50Fps, 60);
  assert.equal(summary.p95Fps, 60);
  assert.equal(summary.status, "pass");
  assert.equal(summary.slowFrames, 3);
});

test("telemetry summary marks low FPS or WebGL failures for attention", () => {
  const summary = summarizeTelemetry([
    { ...base, metrics: { fps: 48, quality: "low" } },
    { ...base, type: "webgl", metrics: { status: "failed" } },
  ], 60);
  assert.equal(summary.status, "attention");
  assert.equal(summary.webglFailures, 1);
});
