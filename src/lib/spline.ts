import type { Vec3 } from "@/src/types/experience";
import { clamp01 } from "@/src/lib/math";

function catmull(a: number, b: number, c: number, d: number, t: number) {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * b +
      (-a + c) * t +
      (2 * a - 5 * b + 4 * c - d) * t2 +
      (-a + 3 * b - 3 * c + d) * t3)
  );
}

export function sampleSpline(points: Vec3[], t: number): Vec3 {
  if (points.length === 0) return [0, 0, 0];
  if (points.length === 1) return points[0];
  const x = clamp01(t) * (points.length - 1);
  const i = Math.min(points.length - 2, Math.floor(x));
  const local = x - i;
  const p0 = points[Math.max(0, i - 1)];
  const p1 = points[i];
  const p2 = points[Math.min(points.length - 1, i + 1)];
  const p3 = points[Math.min(points.length - 1, i + 2)];
  return [
    catmull(p0[0], p1[0], p2[0], p3[0], local),
    catmull(p0[1], p1[1], p2[1], p3[1], local),
    catmull(p0[2], p1[2], p2[2], p3[2], local),
  ];
}

/**
 * Re-parameterizes a Catmull-Rom spline by approximate traveled distance.
 * Camera waypoints use this sampler so uneven control-point spacing does not
 * turn into accidental speed ramps. The spline shape and exact endpoints stay unchanged.
 */
export function sampleSplineArcLength(points: Vec3[], t: number, samples?: number): Vec3 {
  const progress = clamp01(t);
  if (points.length < 2 || progress <= 0 || progress >= 1) return sampleSpline(points, progress);
  const divisions = Math.max(24, Math.min(320, samples ?? (points.length - 1) * 32));
  const distances = new Float64Array(divisions + 1);
  let previous = sampleSpline(points, 0);
  let total = 0;
  for (let index = 1; index <= divisions; index += 1) {
    const point = sampleSpline(points, index / divisions);
    total += Math.hypot(point[0] - previous[0], point[1] - previous[1], point[2] - previous[2]);
    distances[index] = total;
    previous = point;
  }
  if (total < 0.000001) return sampleSpline(points, progress);
  const target = total * progress;
  let low = 0;
  let high = divisions;
  while (low + 1 < high) {
    const middle = (low + high) >> 1;
    if (distances[middle] < target) low = middle;
    else high = middle;
  }
  const span = Math.max(0.000001, distances[high] - distances[low]);
  const local = (target - distances[low]) / span;
  const parameter = (low + local) / divisions;
  return sampleSpline(points, parameter);
}
