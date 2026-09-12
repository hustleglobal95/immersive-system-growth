import assert from "node:assert/strict";
import test from "node:test";
import raw from "../config/experience.json";
import realEstateRaw from "../recipes/real-estate.json";
import { parseExperience } from "../src/lib/configSchema";
import { sampleMotionTrack } from "../src/lib/motionSequencer";
import { sampleSpline, sampleSplineArcLength } from "../src/lib/spline";
import { sampleCameraPath } from "../src/lib/cameraPaths";
import { sampleCameraProgress } from "../src/lib/cameraTiming";
import { deriveCameraBank } from "../src/lib/cameraMotion";
import { auditCameraMotion } from "../src/lib/cameraDiagnostics";
import {
  buildSpatialScene,
  evaluateSpatialCameraTracks,
  repairSpatialCameraTracks,
  type SpatialScene,
} from "../src/lib/spatialCamera";
import {
  cameraChoreographyCatalog,
  createCameraChoreography,
} from "../src/platform/cameraChoreography";
import { applyCameraDirector, directCamera } from "../src/platform/cameraDirector";
import type { MotionTrack, Vec3 } from "../src/types/experience";

const config = parseExperience(raw);
const realEstate = parseExperience(realEstateRaw);

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

test("procedural camera paths preserve exact endpoints and regularize traveled distance", () => {
  const from: Vec3 = [0, 0.3, 8];
  const to: Vec3 = [2.1, 1.2, 5.8];
  for (const preset of ["arc", "orbit", "crane", "threshold", "flyby", "swoop", "macro", "pullback", "subject-orbit"] as const) {
    const samples = Array.from({ length: 97 }, (_, index) => sampleCameraPath(from, to, index / 96, preset));
    assert.deepEqual(samples[0], from);
    assert.deepEqual(samples.at(-1), to);
    const steps = samples.slice(1).map((point, index) => distance(samples[index], point)).filter((value) => value > 1e-8);
    const mean = steps.reduce((sum, value) => sum + value, 0) / steps.length;
    const maxDeviation = Math.max(...steps.map((value) => Math.abs(value - mean) / mean));
    assert.ok(maxDeviation < 0.16, `${preset} path should maintain controlled travel speed`);
  }
});

test("camera timing keeps cinematic character without endpoint stalls", () => {
  for (const easing of ["smooth", "cinematic"] as const) {
    const samples = Array.from({ length: 101 }, (_, index) => sampleCameraProgress(index / 100, easing));
    assert.equal(samples[0], 0);
    assert.equal(samples.at(-1), 1);
    assert.ok(samples.every((value, index) => index === 0 || value > samples[index - 1]));
    const steps = samples.slice(1).map((value, index) => value - samples[index]);
    const ratio = Math.max(...steps) / Math.min(...steps);
    assert.ok(ratio < 3.25, `${easing} camera timing should remain physically controlled`);
  }
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

test("intent-aware camera director is deterministic, spatially scored and produces valid editable tracks", () => {
  for (let sceneIndex = 0; sceneIndex < config.scenes.length; sceneIndex += 1) {
    const first = directCamera(config, sceneIndex);
    const second = directCamera(config, sceneIndex);
    assert.equal(first.shot, second.shot);
    assert.equal(first.intent, second.intent);
    assert.equal(first.rationale, second.rationale);
    assert.deepEqual(first.tracks, second.tracks);
    assert.ok(first.confidence >= 0.5 && first.confidence <= 0.97);
    assert.ok(first.alternatives.length >= 3);
    assert.ok(Number.isFinite(first.spatial.evaluation.minClearance));
    const applied = applyCameraDirector(config, sceneIndex);
    assert.equal(applied.plan.shot, first.shot);
    assert.doesNotThrow(() => parseExperience(applied.experience));
    const scene = applied.experience.scenes[sceneIndex];
    assert.ok(scene.motionTracks.some((track) => track.target === "camera.position"));
    assert.ok(scene.motionTracks.some((track) => track.target === "camera.target"));
    assert.ok(scene.motionTracks.some((track) => track.target === "camera.fov"));
  }
});

test("spatial camera planner detects collisions and inserts deterministic clearance detours", () => {
  const tracks = straightCameraTracks([0, 0, 5], [0, 0, -5], [6, 0, 0]);
  const spatial: SpatialScene = {
    sceneId: "test",
    subject: {
      id: "hero",
      fromCenter: [6, 0, 0],
      toCenter: [6, 0, 0],
      fromCollisionRadius: 0.5,
      toCollisionRadius: 0.5,
      fromFramingRadius: 0.5,
      toFramingRadius: 0.5,
      collidable: true,
      source: "proxy",
    },
    obstacles: [{ id: "wall", center: [0, 0, 0], halfSize: [1, 1, 1], role: "obstacle", source: "geometry" }],
    sets: [],
    floorY: -3,
    desiredClearance: 0.3,
  };
  const before = evaluateSpatialCameraTracks(tracks, spatial, "desktop", 64);
  const repaired = repairSpatialCameraTracks(tracks, spatial, 3);
  assert.ok(before.collisionSamples > 0);
  assert.ok(repaired.reroutes > 0);
  assert.ok(repaired.evaluation.collisionSamples < before.collisionSamples);
  assert.deepEqual(repairSpatialCameraTracks(tracks, spatial, 3), repaired);
});

test("spatial camera planner detects subject occlusion through scene geometry", () => {
  const tracks = straightCameraTracks([0, 0, 5], [0, 0, 5], [0, 0, 0]);
  const spatial: SpatialScene = {
    sceneId: "test",
    subject: {
      id: "hero",
      fromCenter: [0, 0, 0],
      toCenter: [0, 0, 0],
      fromCollisionRadius: 0.6,
      toCollisionRadius: 0.6,
      fromFramingRadius: 0.6,
      toFramingRadius: 0.6,
      collidable: true,
      source: "proxy",
    },
    obstacles: [{ id: "blocker", center: [0, 0, 2.5], halfSize: [0.5, 0.5, 0.5], role: "obstacle", source: "geometry" }],
    sets: [],
    floorY: -3,
    desiredClearance: 0.3,
  };
  const evaluation = evaluateSpatialCameraTracks(tracks, spatial, "desktop", 24);
  assert.ok(evaluation.occlusionSamples > 0);
  assert.ok(evaluation.score < 8);
});

test("navigable sets use authored camera focus and structural blockers instead of a solid root box", () => {
  const spatial = buildSpatialScene(realEstate, 2, [
    { id: "asset:pavilion", min: [-3.2, -1.3, -3.2], max: [3.2, 1.7, 3.2], role: "set", source: "geometry" },
    { id: "set:pavilion:left-wall-1", min: [-3.1, -1.2, -3], max: [-2.9, 1.6, 3], role: "obstacle", source: "geometry" },
  ]);
  assert.equal(spatial.subject.id, "set-focus");
  assert.equal(spatial.subject.collidable, false);
  assert.deepEqual(spatial.subject.fromCenter, realEstate.scenes[2].camera.from.target);
  assert.deepEqual(spatial.subject.toCenter, realEstate.scenes[2].camera.to.target);
  assert.ok(spatial.sets.some((bound) => bound.id === "pavilion"));
  assert.ok(spatial.obstacles.some((bound) => bound.id.startsWith("set:pavilion:")));
  assert.ok(!spatial.obstacles.some((bound) => bound.id === "pavilion"));
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

function straightCameraTracks(from: Vec3, to: Vec3, target: Vec3): MotionTrack[] {
  return [
    { id: "test-position", label: "Test position", type: "vector", target: "camera.position", blend: "absolute", viewport: "all", muted: false, locked: false, keyframes: [
      { id: "test-position-a", at: 0, value: from, easing: "linear" },
      { id: "test-position-b", at: 1, value: to, easing: "linear" },
    ] },
    { id: "test-target", label: "Test target", type: "vector", target: "camera.target", blend: "absolute", viewport: "all", muted: false, locked: false, keyframes: [
      { id: "test-target-a", at: 0, value: target, easing: "linear" },
      { id: "test-target-b", at: 1, value: target, easing: "linear" },
    ] },
    { id: "test-fov", label: "Test FOV", type: "number", target: "camera.fov", blend: "absolute", viewport: "all", muted: false, locked: false, keyframes: [
      { id: "test-fov-a", at: 0, value: 45, easing: "linear" },
      { id: "test-fov-b", at: 1, value: 45, easing: "linear" },
    ] },
  ] as MotionTrack[];
}

function distance(a: Vec3, b: Vec3) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}
