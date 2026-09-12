import type { SceneEasing } from "@/src/types/experience";
import { clamp01 } from "@/src/lib/math";
import { applyEasing } from "@/src/lib/easing";

/**
 * Camera motion should feel eased without inheriting the near-zero endpoint
 * velocity of the broader scene curve. Mixing a linear floor into the scene
 * easing preserves its character while preventing the camera from crawling at
 * boundaries and then surging through the middle of a shot.
 */
export function sampleCameraProgress(progress: number, easing: SceneEasing) {
  const p = clamp01(progress);
  if (easing === "linear") return p;
  const authored = applyEasing(p, easing);
  const strength = easing === "cinematic" ? 0.34 : 0.48;
  return p + (authored - p) * strength;
}
