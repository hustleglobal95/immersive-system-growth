import type { ObjectMotionPreset, ObjectState, Vec3 } from "@/src/types/experience";
import { lerp, lerpVec3 } from "@/src/lib/math";

function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function sampleObjectMotion(from: ObjectState, to: ObjectState, t: number, preset: ObjectMotionPreset = "linear"): ObjectState {
  let position = lerpVec3(from.position, to.position, t);
  let rotation = lerpVec3(from.rotation, to.rotation, t);
  let scale = lerp(from.scale, to.scale, t);
  const wave = Math.sin(Math.PI * t);

  switch (preset) {
    case "handoff":
      position = add(position, [wave * 0.25, wave * 0.08, -wave * 0.35]);
      break;
    case "rise":
      position = add(position, [0, wave * 0.8, 0]);
      break;
    case "drop":
      position = add(position, [0, -wave * 0.8, 0]);
      break;
    case "spiral":
      position = add(position, [Math.sin(t * Math.PI * 2) * 0.35 * wave, wave * 0.3, Math.cos(t * Math.PI * 2) * 0.35 * wave]);
      rotation = add(rotation, [0, wave * Math.PI, wave * 0.2]);
      break;
    case "scale-through":
      scale *= 1 + wave * 1.65;
      position = add(position, [0, 0, -wave * 0.45]);
      break;
    case "linear":
    default:
      break;
  }

  return { position, rotation, scale };
}
