import assert from "node:assert/strict";
import test from "node:test";
import raw from "../config/experience.json";
import { parseExperience } from "../src/lib/configSchema";
import { sampleMotionTrack } from "../src/lib/motionSequencer";
import { sampleSpline, sampleSplineArcLength } from "../src/lib/spline";
import { deriveCameraBank } from "../src/lib/cameraMotion";
import { auditCameraMotion } from "../src/lib/cameraDiagnostics";
import {
  cameraChoreographyCatalog,
  createCameraChoreography,
} from "../src/platform/cameraChoreography";
import type { MotionTrack, Vec3 } from "../src/types/experience";

const config = parseExperience(raw);

test("arc-length camera splines reduce accidental speed variance while preserving endpoints", () => {
  const points: Vec3[] = [[0, 0, 0], [0.15, 0.2, 0], [4.5, 1.1, -1.4], [4.8, 1.2, -1.5]];
  const variation = (sampler: (points: Vec3[], t: number) => Vec3) => {
    const samples = Array.from({ length: 81 }, (_, index) => sampler(points, index / 80));
    const steps = samples.slice(1).map((point, index) => distance(samples[index], point));
    const mean = steps.reduce((sum, value) => sum + value, 0) / steps.length;
    return Math.sqrt(steps.reduce((sum, value) => sum + (value - mean) ** 2, 0) / steps.length) / mean;
  };
  assert.deepEqual(sampleSplineArcLength(points, 0), points[0]);
  assert.deepEqual(sampleSplineArcLength(points, 1), points.at(-1));
  assert.ok(variation(sampleSplineArcLength) < variation(sampleSpline) * 0.55);
});

test("director camera choreography is deterministic, endpoint-safe and schema-valid", () => {
  for (const preset of cameraChoreographyCatalog) {
    const tracks = createCameraChoreography(preset.id, config, 0);
    assert.ok(tracks.length >= 3);
    const ids = new Set(tracks.map((track) => track.id));
    assert.equal(ids.size, tracks.length);
    const camera = config.scenes[0].camera;
    const position = tracks.find((track) => track.target === "camera.position" && track.viewport !== "mobile");
    const target = tracks.find((track) => track.target === "camera.target" && track.viewport !== "mobile");
    const fov = tracks.find((track) => track.target === "camera.fov" && track.viewport !== "mobile");
    assert(position && target && fov);
    assert.deepEqual(sampleMotionTrack(position, 0), camera.from.position);
    assert.deepEqual(sampleMotionTrack(position, 1), camera.to.position);
    assert.deepEqual(sampleMotionTrack(target, 0), camera.from.target);
    assert.deepEqual(sampleMotionTrack(target, 1), camera.to.target);
    assert.equal(sampleMotionTrack(fov, 0), camera.from.fov);
    assert.equal(sampleMotionTrack(fov, 1), camera.to.fov);
    const candidate = structuredClone(config);
    candidate.scenes[0].motionTracks = tracks as MotionTrack[];
    assert.doesNotThrow(() => parseExperience(candidate));
  }
});

test("director banking is signed, bounded and absent on straight travel", () => {
  assert.equal(deriveCameraBank([0, 0, 0], [0, 0, -1], [0, 0, -2]), 0);
  const right = deriveCameraBank([0, 0, 0], [0, 0, -1], [1, 0, -2], 5);
  const left = deriveCameraBank([0, 0, 0], [0, 0, -1], [-1, 0, -2], 5);
  assert.ok(right * left < 0);
  assert.ok(Math.abs(right) <= 5 && Math.abs(left) <= 5);
});

test("camera audit reports no hard errors for the shipped experience", () => {
  assert.equal(auditCameraMotion(config).filter((item) => item.level === "error").length, 0);
});

function distance(a: Vec3, b: Vec3) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}
