import type { QualityMode, QualityTier } from "@/src/types/experience";
const tiers: QualityTier[] = ["low", "medium", "high"];
export function constrainQuality(
  mode: QualityMode,
  adaptive: QualityTier,
  ceiling: QualityTier,
): QualityTier {
  return tiers[
    Math.min(
      tiers.indexOf(mode === "auto" ? adaptive : mode),
      tiers.indexOf(ceiling),
    )
  ];
}
export function nextQuality(
  current: QualityTier,
  direction: 1 | -1,
): QualityTier {
  return tiers[Math.max(0, Math.min(2, tiers.indexOf(current) + direction))];
}
export function qualityDpr(
  tier: QualityTier,
  deviceDpr: number,
  width: number,
  height: number,
  min: number,
  max: number,
  maxPixels: number,
) {
  const tierCap =
    tier === "high" ? max : tier === "medium" ? Math.min(1.5, max) : min;
  return Math.max(
    0.25,
    Math.min(
      deviceDpr,
      tierCap,
      Math.sqrt(maxPixels / Math.max(1, width * height)),
    ),
  );
}
export function inferDeviceCeiling(
  memory = 4,
  cores = 4,
  narrow = false,
): QualityTier {
  return memory <= 4 || cores <= 4
    ? "low"
    : narrow || memory <= 8 || cores <= 8
      ? "medium"
      : "high";
}
