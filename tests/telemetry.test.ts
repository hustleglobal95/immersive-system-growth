import assert from "node:assert/strict";
import test from "node:test";
import { telemetryEventSchema } from "../src/platform/telemetry";

const valid = {
  version: 1,
  projectId: "ember-bun-reference",
  sessionId: "747c9b7c-3584-4af2-9b93-145a65b07f62",
  type: "fps",
  at: "2026-09-11T10:00:00.000Z",
  page: "/",
  device: { width: 390, height: 844, dpr: 3, cores: 6, reducedMotion: false },
  metrics: { average: 58, slowFrames: 2, quality: "medium" },
};
test("telemetry accepts bounded coarse device performance events", () => {
  assert(telemetryEventSchema.safeParse(valid).success);
});
test("telemetry rejects identifiers and unbounded metric objects", () => {
  assert(!telemetryEventSchema.safeParse({ ...valid, email: "person@example.com" }).success);
  assert(!telemetryEventSchema.safeParse({ ...valid, page: "https://example.com/private" }).success);
});
