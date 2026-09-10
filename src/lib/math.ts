import type { Vec3 } from "@/src/types/experience";

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerpVec3 = (a: Vec3, b: Vec3, t: number): Vec3 => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
];
export const remap01 = (value: number, min: number, max: number) =>
  clamp01((value - min) / Math.max(0.000001, max - min));
