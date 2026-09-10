import { clamp01 } from "@/src/lib/math";
import type { SceneEasing } from "@/src/types/experience";

export const easeLinear = (t: number) => clamp01(t);
export const easeSmooth = (t: number) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};
export const easeCinematic = (t: number) => {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};

export function applyEasing(t: number, easing: SceneEasing) {
  if (easing === "linear") return easeLinear(t);
  if (easing === "smooth") return easeSmooth(t);
  return easeCinematic(t);
}
