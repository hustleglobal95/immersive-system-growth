import type { Vec3 } from "@/src/types/experience";

/**
 * Derive a restrained roll angle from path curvature. This is intentionally
 * opt-in at the rig level for Director choreography tracks, so legacy scenes
 * stay perfectly level while authored cinematic paths can bank into turns.
 */
export function deriveCameraBank(previous: Vec3, current: Vec3, next: Vec3, maxDegrees = 5) {
  if (![...previous, ...current, ...next, maxDegrees].every(Number.isFinite) || maxDegrees <= 0) return 0;
  const a = normalize(sub(current, previous));
  const b = normalize(sub(next, current));
  if (!a || !b) return 0;
  const dot = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  const angle = Math.acos(dot) * 180 / Math.PI;
  if (angle < 0.02) return 0;
  const crossY = a[2] * b[0] - a[0] * b[2];
  const signed = Math.sign(crossY) * Math.min(maxDegrees, angle * 0.42);
  return Math.abs(signed) < 0.02 ? 0 : signed;
}

function sub(a: Vec3, b: Vec3): Vec3 { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function normalize(value: Vec3): Vec3 | null {
  const length = Math.hypot(...value);
  return length > 0.00001 ? [value[0] / length, value[1] / length, value[2] / length] : null;
}
