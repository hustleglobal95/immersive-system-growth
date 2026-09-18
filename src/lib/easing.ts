import { clamp01 } from "@/src/lib/math";
import type { SceneEasing } from "@/src/types/experience";

export const easeLinear = (t: number) => clamp01(t);
export const easeSmooth = (t: number) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};
/**
 * Quintic smootherstep, for anything driven directly by scroll position.
 *
 * The cubic above is continuous in velocity but not in acceleration: its second derivative
 * jumps from zero outside the window to plus or minus six inside, so every move begins and
 * ends with a measurable kink. The quintic zeroes the first and second derivative at both
 * ends, which is what makes a scrubbed handover start and settle instead of catching. It is
 * 25% faster through the middle for the same window, so a move eased with it also reads as
 * more deliberate at its edges.
 */
export const easeSmoother = (t: number) => {
  const x = clamp01(t);
  return x * x * x * (x * (x * 6 - 15) + 10);
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
