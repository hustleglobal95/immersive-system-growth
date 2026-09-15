import type { MotionEasing } from "@/src/types/experience";

export const motionCurveCatalog = {
  editorial: { easing: "cubic" as MotionEasing, curve: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  cinematic: { easing: "cubic" as MotionEasing, curve: [0.76, 0, 0.24, 1] as [number, number, number, number] },
  mechanical: { easing: "cubic" as MotionEasing, curve: [0.2, 0.8, 0.2, 1] as [number, number, number, number] },
  glide: { easing: "cubic" as MotionEasing, curve: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
  settle: { easing: "cubic" as MotionEasing, curve: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  linear: { easing: "linear" as MotionEasing },
} as const;

export type MotionCurveName = keyof typeof motionCurveCatalog;
export type MotionEnergy = "still" | "restrained" | "confident" | "expressive";
export type StaggerDistribution = "forward" | "reverse" | "center" | "edges" | "alternating";

export const motionEnergyCatalog: Record<MotionEnergy, {
  travel: number;
  overlap: number;
  density: number;
  description: string;
}> = {
  still: { travel: 0.35, overlap: 0.72, density: 0.45, description: "Minimal movement, long dwell, almost editorial stillness." },
  restrained: { travel: 0.65, overlap: 0.58, density: 0.65, description: "Premium default: controlled travel with visible but quiet choreography." },
  confident: { travel: 1, overlap: 0.44, density: 0.82, description: "Clear cinematic movement with overlapping beats and strong spatial intent." },
  expressive: { travel: 1.25, overlap: 0.34, density: 1, description: "High-energy feature moments; reserve for deliberate climaxes." },
};

/** Deterministic normalized stagger slots for reversible scroll animation. */
export function staggerSlots(
  count: number,
  distribution: StaggerDistribution = "forward",
): number[] {
  if (count <= 0) return [];
  if (count === 1) return [0];
  const indexes = Array.from({ length: count }, (_, index) => index);
  const center = (count - 1) / 2;
  const ordered = [...indexes].sort((a, b) => {
    if (distribution === "reverse") return b - a;
    if (distribution === "center") return Math.abs(a - center) - Math.abs(b - center) || a - b;
    if (distribution === "edges") return Math.abs(b - center) - Math.abs(a - center) || a - b;
    if (distribution === "alternating") {
      const rank = (index: number) => index % 2 === 0 ? index / 2 : Math.ceil(count / 2) + (index - 1) / 2;
      return rank(a) - rank(b);
    }
    return a - b;
  });
  const rank = new Map(ordered.map((index, slot) => [index, slot / (count - 1)]));
  return indexes.map((index) => rank.get(index) ?? 0);
}

/** Maps a normalized stagger slot into a bounded scene range. */
export function staggerWindow(slot: number, start = 0.08, end = 0.82, duration = 0.22) {
  const safeStart = clamp01(start);
  const safeEnd = Math.max(safeStart, clamp01(end));
  const at = safeStart + clamp01(slot) * (safeEnd - safeStart);
  return { start: at, end: Math.min(1, at + Math.max(0.01, duration)) };
}

export function numberedNodeOrder(nodes: string[]): string[] {
  return [...nodes].sort((a, b) => {
    const an = numericSuffix(a);
    const bn = numericSuffix(b);
    if (an !== null && bn !== null && an !== bn) return an - bn;
    if (an !== null && bn === null) return -1;
    if (an === null && bn !== null) return 1;
    return a.localeCompare(b);
  });
}

function numericSuffix(value: string): number | null {
  const matches = value.match(/(?:^|[-_. ])(\d{1,4})(?!.*\d)/);
  return matches ? Number(matches[1]) : null;
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}
