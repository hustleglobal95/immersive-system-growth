import { sampleMotionTrack } from "@/src/lib/motionSequencer";
import { evaluateSpatialCameraTracks, type SpatialBound, type SpatialCameraEvaluation, type SpatialScene } from "@/src/lib/spatialCamera";
import type { MotionTrack, Vec3 } from "@/src/types/experience";

export interface SpatialPlannerStats {
  reroutes: number;
  occlusionReroutes: number;
  compositionRepairs: number;
  routeWaypoints: number;
  failedRoutes: number;
}

export interface SpatialPlannerRepairResult {
  tracks: MotionTrack[];
  evaluation: SpatialCameraEvaluation;
  stats: SpatialPlannerStats;
}

type Viewport = "desktop" | "mobile";
type VectorTrack = Extract<MotionTrack, { type: "vector" }>;
type NumberTrack = Extract<MotionTrack, { type: "number" }>;
type IssueKind = "collision" | "occlusion" | "floor" | "framing";

interface SpatialIssue {
  at: number;
  kind: IssueKind;
  obstacle?: SpatialBound;
}

interface RouteNode {
  point: Vec3;
  label: string;
}

interface RouteResult {
  points: Vec3[];
  cost: number;
}

export function repairSpatialCameraTracksWithPlanner(
  tracks: MotionTrack[],
  spatial: SpatialScene,
  maxPasses = 5,
): SpatialPlannerRepairResult {
  let current = structuredClone(tracks) as MotionTrack[];
  const stats: SpatialPlannerStats = {
    reroutes: 0,
    occlusionReroutes: 0,
    compositionRepairs: 0,
    routeWaypoints: 0,
    failedRoutes: 0,
  };

  for (const viewport of ["desktop", "mobile"] as const) {
    for (let pass = 0; pass < maxPasses; pass += 1) {
      const issue = findFirstIssue(current, spatial, viewport, 72);
      if (!issue) break;
      if (issue.kind === "framing") {
        const repaired = repairComposition(current, spatial, viewport, issue.at, pass + 1);
        if (!repaired.changed) break;
        current = repaired.tracks;
        stats.compositionRepairs += 1;
        continue;
      }

      const position = cameraTrack(current, "camera.position", viewport);
      if (!position || position.type !== "vector") break;
      const beforeAt = clamp(issue.at - 0.085, 0.025, 0.94);
      const afterAt = clamp(issue.at + 0.085, 0.06, 0.975);
      if (afterAt - beforeAt < 0.03) break;
      const from = sampleMotionTrack(position, beforeAt) as Vec3;
      const to = sampleMotionTrack(position, afterAt) as Vec3;
      const route = planVisibilityRoute(from, to, spatial, issue.at, issue.obstacle);
      if (!route || route.points.length <= 2) {
        stats.failedRoutes += 1;
        break;
      }
      const next = insertRoute(position, beforeAt, afterAt, route.points, pass + 1);
      current = current.map((track) => track.id === position.id ? next : track);
      stats.reroutes += 1;
      stats.routeWaypoints += Math.max(0, route.points.length - 2);
      if (issue.kind === "occlusion") stats.occlusionReroutes += 1;
    }
  }

  const desktop = evaluateSpatialCameraTracks(current, spatial, "desktop", 72);
  const mobile = evaluateSpatialCameraTracks(current, spatial, "mobile", 72);
  return { tracks: current, evaluation: worse(desktop, mobile), stats };
}

export function planVisibilityRoute(
  from: Vec3,
  to: Vec3,
  spatial: SpatialScene,
  at = 0.5,
  focusObstacle?: SpatialBound,
): RouteResult | null {
  const obstacles = relevantObstacles(from, to, spatial, focusObstacle);
  const nodes: RouteNode[] = [
    { point: [...from], label: "start" },
    { point: [...to], label: "end" },
  ];
  const clearance = spatial.desiredClearance + 0.12;

  for (const obstacle of obstacles) {
    const expanded = expandedBound(obstacle, clearance);
    const minX = expanded.center[0] - expanded.halfSize[0];
    const maxX = expanded.center[0] + expanded.halfSize[0];
    const minZ = expanded.center[2] - expanded.halfSize[2];
    const maxZ = expanded.center[2] + expanded.halfSize[2];
    const top = expanded.center[1] + expanded.halfSize[1] + clearance * 0.6;
    const levels = uniqueNumbers([
      Math.max(spatial.floorY + clearance, from[1]),
      Math.max(spatial.floorY + clearance, to[1]),
      Math.max(spatial.floorY + clearance, top),
    ]);
    for (const y of levels) {
      for (const [x, z, suffix] of [
        [minX, minZ, "nw"], [maxX, minZ, "ne"], [maxX, maxZ, "se"], [minX, maxZ, "sw"],
      ] as const) {
        const point: Vec3 = [x, y, z];
        if (!pointSafe(point, spatial, at)) continue;
        nodes.push({ point, label: `${obstacle.id}:${suffix}` });
      }
    }
  }

  const subject = subjectCenterAt(spatial, at);
  const edges: Array<Array<{ to: number; cost: number }>> = Array.from({ length: nodes.length }, () => []);
  for (let a = 0; a < nodes.length; a += 1) {
    for (let b = a + 1; b < nodes.length; b += 1) {
      if (!segmentSafe(nodes[a].point, nodes[b].point, spatial, at)) continue;
      const length = distance(nodes[a].point, nodes[b].point);
      const vertical = Math.abs(nodes[a].point[1] - nodes[b].point[1]);
      const deviation = pointLineDistance(midpoint(nodes[a].point, nodes[b].point), from, to);
      const visibilityPenalty = lineOfSightClear(nodes[b].point, subject, spatial) ? 0 : 2.8;
      const cost = length + vertical * 0.24 + deviation * 0.08 + visibilityPenalty;
      edges[a].push({ to: b, cost });
      edges[b].push({ to: a, cost });
    }
  }

  const route = dijkstra(nodes, edges, 0, 1);
  if (!route) return null;
  return { points: simplifyRoute(route.map((index) => nodes[index].point), spatial, at), cost: routeCost(route, nodes) };
}

function findFirstIssue(
  tracks: MotionTrack[],
  spatial: SpatialScene,
  viewport: Viewport,
  samples: number,
): SpatialIssue | null {
  const position = cameraTrack(tracks, "camera.position", viewport);
  const target = cameraTrack(tracks, "camera.target", viewport);
  const fov = cameraTrack(tracks, "camera.fov", viewport);
  if (!position || !target || !fov) return null;

  for (let index = 1; index < samples; index += 1) {
    const at = index / samples;
    const camera = sampleMotionTrack(position, at) as Vec3;
    const subject = subjectCenterAt(spatial, at);
    if (camera[1] < spatial.floorY + 0.08) return { at, kind: "floor" };
    if (!pointSafe(camera, spatial, at)) {
      const obstacle = spatial.obstacles.find((bound) => pointAabbClearance(camera, bound) < spatial.desiredClearance);
      return { at, kind: "collision", obstacle };
    }
    const blocker = spatial.obstacles.find((bound) => segmentIntersectsExpandedAabb(camera, subject, bound, 0.035));
    if (blocker) return { at, kind: "occlusion", obstacle: blocker };

    const aim = sampleMotionTrack(target, at) as Vec3;
    const lens = sampleMotionTrack(fov, at) as number;
    if (!compositionSafe(camera, aim, lens, viewport, subject, framingRadiusAt(spatial, at))) {
      return { at, kind: "framing" };
    }
  }
  return null;
}

function repairComposition(
  tracks: MotionTrack[],
  spatial: SpatialScene,
  viewport: Viewport,
  at: number,
  pass: number,
) {
  const position = cameraTrack(tracks, "camera.position", viewport);
  const target = cameraTrack(tracks, "camera.target", viewport);
  const fov = cameraTrack(tracks, "camera.fov", viewport);
  if (!position || !target || target.type !== "vector" || !fov || fov.type !== "number") return { tracks, changed: false };
  const camera = sampleMotionTrack(position, at) as Vec3;
  const subject = subjectCenterAt(spatial, at);
  const radius = framingRadiusAt(spatial, at);
  const distanceToSubject = Math.max(0.1, distance(camera, subject));
  const desiredFill = viewport === "mobile" ? 0.42 : 0.34;
  const desiredFov = clamp(2 * Math.atan(radius / Math.max(0.001, distanceToSubject * desiredFill)) * 180 / Math.PI, 22, 72);
  const targetTrack = insertVectorKey(target, at, subject, `compose-${pass}`);
  const fovTrack = insertNumberKey(fov, at, desiredFov, `compose-${pass}`);
  return {
    tracks: tracks.map((track) => track.id === target.id ? targetTrack : track.id === fov.id ? fovTrack : track),
    changed: true,
  };
}

function insertRoute(track: VectorTrack, startAt: number, endAt: number, points: Vec3[], pass: number): VectorTrack {
  const distances = [0];
  for (let index = 1; index < points.length; index += 1) distances.push(distances[index - 1] + distance(points[index - 1], points[index]));
  const total = Math.max(0.0001, distances.at(-1) ?? 0.0001);
  const additions = points.map((point, index) => ({
    id: `${track.id}-route-${pass}-${index}`,
    at: startAt + (endAt - startAt) * (distances[index] / total),
    value: [...point] as Vec3,
    easing: "smooth" as const,
  }));
  const retained = track.keyframes.filter((key) => key.at < startAt - 0.00001 || key.at > endAt + 0.00001);
  const keyframes = [...retained, ...additions]
    .sort((a, b) => a.at - b.at)
    .filter((key, index, all) => index === 0 || key.at - all[index - 1].at > 0.00001)
    .slice(0, 80);
  return { ...track, keyframes };
}

function insertVectorKey(track: VectorTrack, at: number, value: Vec3, suffix: string): VectorTrack {
  const safeAt = clamp(at, 0.025, 0.975);
  const keyframes = [
    ...track.keyframes.filter((key) => Math.abs(key.at - safeAt) > 0.005),
    { id: `${track.id}-${suffix}-${Math.round(safeAt * 1000)}`, at: safeAt, value: [...value] as Vec3, easing: "smooth" as const },
  ].sort((a, b) => a.at - b.at).slice(0, 80);
  return { ...track, keyframes };
}

function insertNumberKey(track: NumberTrack, at: number, value: number, suffix: string): NumberTrack {
  const safeAt = clamp(at, 0.025, 0.975);
  const keyframes = [
    ...track.keyframes.filter((key) => Math.abs(key.at - safeAt) > 0.005),
    { id: `${track.id}-${suffix}-${Math.round(safeAt * 1000)}`, at: safeAt, value, easing: "smooth" as const },
  ].sort((a, b) => a.at - b.at).slice(0, 80);
  return { ...track, keyframes };
}

function relevantObstacles(from: Vec3, to: Vec3, spatial: SpatialScene, focus?: SpatialBound) {
  const ranked = spatial.obstacles
    .map((bound) => ({ bound, distance: pointLineDistance(bound.center, from, to) }))
    .sort((a, b) => a.distance - b.distance)
    .filter((item) => item.distance < Math.max(6, distance(from, to) * 1.25))
    .slice(0, 16)
    .map((item) => item.bound);
  if (focus && !ranked.some((bound) => bound.id === focus.id)) ranked.unshift(focus);
  return ranked.slice(0, 18);
}

function pointSafe(point: Vec3, spatial: SpatialScene, at: number) {
  if (point[1] < spatial.floorY + 0.08) return false;
  const subject = subjectCenterAt(spatial, at);
  if (spatial.subject.collidable) {
    const half = collisionHalfSizeAt(spatial, at);
    if (half) {
      const bound: SpatialBound = { id: spatial.subject.id, center: subject, halfSize: half, role: "subject", source: spatial.subject.source };
      if (pointAabbClearance(point, bound) < spatial.desiredClearance) return false;
    } else if (distance(point, subject) < collisionRadiusAt(spatial, at) + spatial.desiredClearance) return false;
  }
  return spatial.obstacles.every((bound) => pointAabbClearance(point, bound) >= spatial.desiredClearance);
}

function segmentSafe(from: Vec3, to: Vec3, spatial: SpatialScene, at: number) {
  if (Math.min(from[1], to[1]) < spatial.floorY + 0.08) return false;
  if (spatial.obstacles.some((bound) => segmentIntersectsExpandedAabb(from, to, bound, spatial.desiredClearance))) return false;
  const subject = subjectCenterAt(spatial, at);
  if (!spatial.subject.collidable) return true;
  const half = collisionHalfSizeAt(spatial, at);
  if (half) {
    const bound: SpatialBound = { id: spatial.subject.id, center: subject, halfSize: half, role: "subject", source: spatial.subject.source };
    return !segmentIntersectsExpandedAabb(from, to, bound, spatial.desiredClearance);
  }
  return segmentSphereClear(from, to, subject, collisionRadiusAt(spatial, at) + spatial.desiredClearance);
}

function lineOfSightClear(from: Vec3, to: Vec3, spatial: SpatialScene) {
  return spatial.obstacles.every((bound) => !segmentIntersectsExpandedAabb(from, to, bound, 0.035));
}

function compositionSafe(camera: Vec3, target: Vec3, fov: number, viewport: Viewport, subject: Vec3, radius: number) {
  const forward = normalize(sub(target, camera));
  let right = normalize(cross(forward, [0, 1, 0]));
  if (magnitude(right) < 0.001) right = [1, 0, 0];
  const up = normalize(cross(right, forward));
  const relative = sub(subject, camera);
  const depth = dot(relative, forward);
  if (depth <= 0.05) return false;
  const tanY = Math.tan(fov * Math.PI / 360);
  const aspect = viewport === "mobile" ? 9 / 16 : 16 / 9;
  const ndcX = dot(relative, right) / Math.max(0.001, depth * tanY * aspect);
  const ndcY = dot(relative, up) / Math.max(0.001, depth * tanY);
  const fill = radius / Math.max(0.001, depth * tanY);
  const safeX = Math.max(0.28, 0.8 - fill * 0.35);
  const safeY = Math.max(0.24, 0.76 - fill * 0.35);
  return Math.abs(ndcX) <= safeX && Math.abs(ndcY) <= safeY && fill >= 0.025 && fill <= 0.9;
}

function dijkstra(nodes: RouteNode[], edges: Array<Array<{ to: number; cost: number }>>, start: number, end: number) {
  const distanceTo = Array(nodes.length).fill(Infinity);
  const previous = Array<number>(nodes.length).fill(-1);
  const visited = new Set<number>();
  distanceTo[start] = 0;
  for (;;) {
    let current = -1;
    let best = Infinity;
    for (let index = 0; index < nodes.length; index += 1) {
      if (!visited.has(index) && distanceTo[index] < best) { current = index; best = distanceTo[index]; }
    }
    if (current < 0) return null;
    if (current === end) break;
    visited.add(current);
    for (const edge of edges[current]) {
      const next = best + edge.cost;
      if (next < distanceTo[edge.to]) { distanceTo[edge.to] = next; previous[edge.to] = current; }
    }
  }
  const route: number[] = [];
  for (let current = end; current >= 0; current = previous[current]) {
    route.push(current);
    if (current === start) break;
  }
  return route.at(-1) === start ? route.reverse() : null;
}

function simplifyRoute(points: Vec3[], spatial: SpatialScene, at: number) {
  if (points.length <= 2) return points;
  const output: Vec3[] = [points[0]];
  let anchor = 0;
  while (anchor < points.length - 1) {
    let next = points.length - 1;
    while (next > anchor + 1 && !segmentSafe(points[anchor], points[next], spatial, at)) next -= 1;
    output.push(points[next]);
    anchor = next;
  }
  return output;
}

function routeCost(route: number[], nodes: RouteNode[]) {
  let total = 0;
  for (let index = 1; index < route.length; index += 1) total += distance(nodes[route[index - 1]].point, nodes[route[index]].point);
  return total;
}

function cameraTrack(tracks: MotionTrack[], target: "camera.position" | "camera.target" | "camera.fov", viewport: Viewport) {
  return tracks.find((track) => track.target === target && track.viewport === viewport)
    ?? tracks.find((track) => track.target === target && track.viewport === "all");
}

function worse(a: SpatialCameraEvaluation, b: SpatialCameraEvaluation) {
  if (a.hardInvalid !== b.hardInvalid) return a.hardInvalid ? a : b;
  return a.score <= b.score ? a : b;
}

function subjectCenterAt(spatial: SpatialScene, at: number): Vec3 {
  return lerpVec(spatial.subject.fromCenter, spatial.subject.toCenter, at);
}
function collisionRadiusAt(spatial: SpatialScene, at: number) { return lerp(spatial.subject.fromCollisionRadius, spatial.subject.toCollisionRadius, at); }
function framingRadiusAt(spatial: SpatialScene, at: number) { return lerp(spatial.subject.fromFramingRadius, spatial.subject.toFramingRadius, at); }
function collisionHalfSizeAt(spatial: SpatialScene, at: number): Vec3 | undefined {
  const a = spatial.subject.fromCollisionHalfSize;
  const b = spatial.subject.toCollisionHalfSize;
  if (!a || !b) return undefined;
  return lerpVec(a, b, at);
}
function expandedBound(bound: SpatialBound, amount: number): SpatialBound {
  return { ...bound, halfSize: [bound.halfSize[0] + amount, bound.halfSize[1] + amount, bound.halfSize[2] + amount] };
}
function pointAabbClearance(point: Vec3, bound: SpatialBound) {
  const q: Vec3 = [Math.abs(point[0] - bound.center[0]) - bound.halfSize[0], Math.abs(point[1] - bound.center[1]) - bound.halfSize[1], Math.abs(point[2] - bound.center[2]) - bound.halfSize[2]];
  const outside = Math.hypot(Math.max(q[0], 0), Math.max(q[1], 0), Math.max(q[2], 0));
  return outside + Math.min(Math.max(q[0], Math.max(q[1], q[2])), 0);
}
function segmentIntersectsExpandedAabb(from: Vec3, to: Vec3, bound: SpatialBound, expand: number) {
  const min: Vec3 = [bound.center[0] - bound.halfSize[0] - expand, bound.center[1] - bound.halfSize[1] - expand, bound.center[2] - bound.halfSize[2] - expand];
  const max: Vec3 = [bound.center[0] + bound.halfSize[0] + expand, bound.center[1] + bound.halfSize[1] + expand, bound.center[2] + bound.halfSize[2] + expand];
  const direction = sub(to, from);
  let tMin = 0, tMax = 1;
  for (let axis = 0; axis < 3; axis += 1) {
    if (Math.abs(direction[axis]) < 1e-8) {
      if (from[axis] < min[axis] || from[axis] > max[axis]) return false;
      continue;
    }
    const inverse = 1 / direction[axis];
    let a = (min[axis] - from[axis]) * inverse;
    let b = (max[axis] - from[axis]) * inverse;
    if (a > b) [a, b] = [b, a];
    tMin = Math.max(tMin, a); tMax = Math.min(tMax, b);
    if (tMin > tMax) return false;
  }
  return tMax > 0.01 && tMin < 0.99;
}
function segmentSphereClear(from: Vec3, to: Vec3, center: Vec3, radius: number) {
  const line = sub(to, from);
  const lengthSq = Math.max(1e-8, dot(line, line));
  const t = clamp(dot(sub(center, from), line) / lengthSq, 0, 1);
  return distance(add(from, mul(line, t)), center) >= radius;
}
function pointLineDistance(point: Vec3, from: Vec3, to: Vec3) {
  const line = sub(to, from);
  const lengthSq = Math.max(1e-8, dot(line, line));
  const t = clamp(dot(sub(point, from), line) / lengthSq, 0, 1);
  return distance(point, add(from, mul(line, t)));
}
function midpoint(a: Vec3, b: Vec3): Vec3 { return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]; }
function distance(a: Vec3, b: Vec3) { return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); }
function add(a: Vec3, b: Vec3): Vec3 { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function sub(a: Vec3, b: Vec3): Vec3 { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function mul(a: Vec3, amount: number): Vec3 { return [a[0] * amount, a[1] * amount, a[2] * amount]; }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function lerpVec(a: Vec3, b: Vec3, t: number): Vec3 { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
function dot(a: Vec3, b: Vec3) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross(a: Vec3, b: Vec3): Vec3 { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function magnitude(a: Vec3) { return Math.hypot(...a); }
function normalize(a: Vec3): Vec3 { const m = magnitude(a); return m < 1e-8 ? [0, 0, 0] : mul(a, 1 / m); }
function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }
function uniqueNumbers(values: number[]) { return [...new Set(values.map((value) => Math.round(value * 1000) / 1000))]; }
