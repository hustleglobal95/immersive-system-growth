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
