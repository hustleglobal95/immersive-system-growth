import { clamp01, remap01 } from "@/src/lib/math";
export function panelVisibility(progress: number, range: [number, number]) {
  const p = clamp01(progress),
    local = remap01(p, ...range);
  if (p < range[0] || p > range[1]) return 0;
  // Never fade away the arrival or conversion endpoints.
  return Math.min(
    range[0] === 0 ? 1 : Math.min(1, local / 0.08),
    range[1] === 1 ? 1 : Math.min(1, (1 - local) / 0.08),
  );
}
