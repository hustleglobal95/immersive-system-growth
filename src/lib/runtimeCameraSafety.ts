import type { LiveSpatialBoundInput } from "@/src/lib/spatialCamera";
import type { Vec3 } from "@/src/types/experience";

export interface RuntimeCameraSafetyResult {
  position: Vec3;
  correction: Vec3;
  corrected: boolean;
  obstacleId?: string;
  clearance: number;
}

export function resolveRuntimeCameraSafety(
  position: Vec3,
  bounds: readonly LiveSpatialBoundInput[],
  clearance = 0.14,
): RuntimeCameraSafetyResult {
  let current: Vec3 = [...position];
  let correction: Vec3 = [0, 0, 0];
  let obstacleId: string | undefined;
  let minClearance = Infinity;

  const obstacles = bounds.filter((bound) => bound.role === "obstacle");
  for (let pass = 0; pass < 3; pass += 1) {
    let changed = false;
    for (const bound of obstacles) {
      const normalized = normalizeBound(bound);
      const signed = pointAabbSignedDistance(current, normalized.min, normalized.max);
      minClearance = Math.min(minClearance, signed);
      if (signed >= clearance) continue;
      const push = smallestExitPush(current, normalized.min, normalized.max, clearance);
      current = add(current, push);
      correction = add(correction, push);
      obstacleId = bound.id;
      changed = true;
    }
    if (!changed) break;
  }

  return {
    position: current,
    correction,
    corrected: magnitude(correction) > 1e-7,
    obstacleId,
    clearance: Number.isFinite(minClearance) ? minClearance : 999,
  };
}

export function segmentOccludedBySpatialBounds(
  from: Vec3,
  to: Vec3,
  bounds: readonly LiveSpatialBoundInput[],
  expand = 0.025,
) {
  return bounds.some((bound) => bound.role === "obstacle" && segmentAabb(from, to, bound, expand));
}

function smallestExitPush(point: Vec3, min: Vec3, max: Vec3, clearance: number): Vec3 {
  const expandedMin: Vec3 = [min[0] - clearance, min[1] - clearance, min[2] - clearance];
  const expandedMax: Vec3 = [max[0] + clearance, max[1] + clearance, max[2] + clearance];
  const candidates: Array<{ axis: number; amount: number }> = [
    { axis: 0, amount: expandedMin[0] - point[0] },
    { axis: 0, amount: expandedMax[0] - point[0] },
    { axis: 1, amount: expandedMin[1] - point[1] },
    { axis: 1, amount: expandedMax[1] - point[1] },
    { axis: 2, amount: expandedMin[2] - point[2] },
    { axis: 2, amount: expandedMax[2] - point[2] },
  ];
  candidates.sort((a, b) => Math.abs(a.amount) - Math.abs(b.amount) || a.axis - b.axis);
  const best = candidates[0];
  const push: Vec3 = [0, 0, 0];
  push[best.axis] = best.amount + Math.sign(best.amount || 1) * 0.002;
  return push;
}

function pointAabbSignedDistance(point: Vec3, min: Vec3, max: Vec3) {
  const center: Vec3 = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
  const half: Vec3 = [(max[0] - min[0]) / 2, (max[1] - min[1]) / 2, (max[2] - min[2]) / 2];
  const q: Vec3 = [Math.abs(point[0] - center[0]) - half[0], Math.abs(point[1] - center[1]) - half[1], Math.abs(point[2] - center[2]) - half[2]];
  const outside = Math.hypot(Math.max(q[0], 0), Math.max(q[1], 0), Math.max(q[2], 0));
  return outside + Math.min(Math.max(q[0], Math.max(q[1], q[2])), 0);
}

function segmentAabb(from: Vec3, to: Vec3, bound: LiveSpatialBoundInput, expand: number) {
  const normalized = normalizeBound(bound);
  const min: Vec3 = [normalized.min[0] - expand, normalized.min[1] - expand, normalized.min[2] - expand];
  const max: Vec3 = [normalized.max[0] + expand, normalized.max[1] + expand, normalized.max[2] + expand];
  const direction: Vec3 = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
  let tMin = 0;
  let tMax = 1;
  for (let axis = 0; axis < 3; axis += 1) {
    if (Math.abs(direction[axis]) < 1e-8) {
      if (from[axis] < min[axis] || from[axis] > max[axis]) return false;
      continue;
    }
    const inverse = 1 / direction[axis];
    let a = (min[axis] - from[axis]) * inverse;
    let b = (max[axis] - from[axis]) * inverse;
    if (a > b) [a, b] = [b, a];
    tMin = Math.max(tMin, a);
    tMax = Math.min(tMax, b);
    if (tMin > tMax) return false;
  }
  return tMax > 0.01 && tMin < 0.99;
}

function normalizeBound(bound: LiveSpatialBoundInput) {
  return {
    min: [Math.min(bound.min[0], bound.max[0]), Math.min(bound.min[1], bound.max[1]), Math.min(bound.min[2], bound.max[2])] as Vec3,
    max: [Math.max(bound.min[0], bound.max[0]), Math.max(bound.min[1], bound.max[1]), Math.max(bound.min[2], bound.max[2])] as Vec3,
  };
}
function add(a: Vec3, b: Vec3): Vec3 { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function magnitude(value: Vec3) { return Math.hypot(value[0], value[1], value[2]); }
