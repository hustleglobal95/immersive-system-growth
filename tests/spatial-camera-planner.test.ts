import assert from "node:assert/strict";
import test from "node:test";
import { planVisibilityRoute, repairSpatialCameraTracksWithPlanner } from "../src/lib/spatialPathPlanner";
import { resolveRuntimeCameraSafety, segmentOccludedBySpatialBounds } from "../src/lib/runtimeCameraSafety";
import type { SpatialScene } from "../src/lib/spatialCamera";
import type { MotionTrack, Vec3 } from "../src/types/experience";

const spatial: SpatialScene = {
  sceneId: "planner-test",
  subject: {
    id: "focus",
    fromCenter: [0, 1, -4],
    toCenter: [0, 1, -4],
    fromCollisionRadius: 0,
    toCollisionRadius: 0,
    fromFramingRadius: 0.7,
    toFramingRadius: 0.7,
    collidable: false,
    source: "geometry",
  },
  obstacles: [
    { id: "column", center: [0, 1, 0], halfSize: [0.55, 1, 0.55], role: "obstacle", source: "geometry" },
  ],
  sets: [],
  floorY: -1,
  desiredClearance: 0.2,
};

test("visibility graph routes around blocking geometry deterministically", () => {
  const from: Vec3 = [-3, 1, 0];
  const to: Vec3 = [3, 1, 0];
  const first = planVisibilityRoute(from, to, spatial, 0.5);
  const second = planVisibilityRoute(from, to, spatial, 0.5);
  assert(first);
  assert.deepEqual(first, second);
  assert.ok(first.points.length >= 3, "blocked route should contain at least one detour waypoint");
  assert.deepEqual(first.points[0], from);
  assert.deepEqual(first.points.at(-1), to);
  for (const point of first.points.slice(1, -1)) {
    assert.ok(Math.abs(point[0]) > 0.55 || Math.abs(point[2]) > 0.55 || point[1] > 2, "detour waypoint must clear the obstacle");
  }
});

test("planner repair keeps endpoints and resolves a blocked camera path", () => {
  const tracks: MotionTrack[] = [
    vectorTrack("position", "camera.position", [[0, [-3, 1, 0]], [1, [3, 1, 0]]]),
    vectorTrack("target", "camera.target", [[0, [0, 1, -4]], [1, [0, 1, -4]]]),
    numberTrack("fov", [[0, 48], [1, 48]]),
  ];
  const repaired = repairSpatialCameraTracksWithPlanner(tracks, spatial, 5);
  assert.ok(repaired.stats.reroutes > 0);
  assert.ok(repaired.stats.routeWaypoints > 0);
  const position = repaired.tracks.find((track) => track.target === "camera.position");
  assert(position && position.type === "vector");
  assert.deepEqual(position.keyframes[0].value, [-3, 1, 0]);
  assert.deepEqual(position.keyframes.at(-1)?.value, [3, 1, 0]);
  assert.equal(repaired.evaluation.collisionSamples, 0);
});

test("runtime safety envelope ejects the camera from live geometry without affecting safe positions", () => {
  const bounds = [{ id: "wall", min: [-1, -1, -1] as Vec3, max: [1, 2, 1] as Vec3, role: "obstacle" as const, source: "live" as const }];
  const inside = resolveRuntimeCameraSafety([0, 0.5, 0], bounds, 0.15);
  assert.equal(inside.corrected, true);
  assert.equal(inside.obstacleId, "wall");
  assert.ok(Math.hypot(...inside.correction) > 0.15);
  const safe = resolveRuntimeCameraSafety([4, 1, 0], bounds, 0.15);
  assert.equal(safe.corrected, false);
  assert.deepEqual(safe.position, [4, 1, 0]);
  assert.equal(segmentOccludedBySpatialBounds([-3, 0.5, 0], [3, 0.5, 0], bounds), true);
  assert.equal(segmentOccludedBySpatialBounds([-3, 3, 0], [3, 3, 0], bounds), false);
});

function vectorTrack(id: string, target: "camera.position" | "camera.target", keys: Array<[number, Vec3]>): MotionTrack {
  return {
    id,
    label: id,
    type: "vector",
    target,
    blend: "absolute",
    viewport: "all",
    muted: false,
    locked: false,
    keyframes: keys.map(([at, value], index) => ({ id: `${id}-${index}`, at, value, easing: "linear" as const })),
  };
}

function numberTrack(id: string, keys: Array<[number, number]>): MotionTrack {
  return {
    id,
    label: id,
    type: "number",
    target: "camera.fov",
    blend: "absolute",
    viewport: "all",
    muted: false,
    locked: false,
    keyframes: keys.map(([at, value], index) => ({ id: `${id}-${index}`, at, value, easing: "linear" as const })),
  };
}
