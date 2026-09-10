import type { CameraPathPreset, Vec3 } from "@/src/types/experience";
import { lerp, lerpVec3 } from "@/src/lib/math";

function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function sampleCameraPath(
  from: Vec3,
  to: Vec3,
  t: number,
  preset: CameraPathPreset,
): Vec3 {
  const base = lerpVec3(from, to, t);
  const wave = Math.sin(Math.PI * t);
  const fullWave = Math.sin(Math.PI * 2 * t);

  switch (preset) {
    case "arc":
      return add(base, [wave * 0.9, wave * 0.18, wave * 0.25]);
    case "orbit":
      return add(base, [
        fullWave * 0.55,
        wave * 0.25,
        (Math.cos(Math.PI * 2 * t) - 1) * 0.35,
      ]);
    case "crane":
      return add(base, [0, wave * 0.7, 0]);
    case "threshold":
      return add(base, [wave * 0.12, 0, -wave * 0.6]);
    case "flyby":
      return add(base, [fullWave * 0.95, wave * 0.1, -wave * 0.15]);
    case "swoop":
      return add(base, [wave * 0.5, -wave * 0.85, -wave * 0.2]);
    case "macro":
      return add(base, [0, wave * 0.06, -wave * 0.95]);
    case "pullback":
      return add(base, [-wave * 0.18, wave * 0.2, wave * 0.75]);
    case "dolly":
    case "linear":
    default:
      return base;
  }
}

export function sampleFov(from: number, to: number, t: number) {
  return lerp(from, to, t);
}
