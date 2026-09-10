"use client";

import type { ReactNode } from "react";
import type { QualityTier } from "@/src/types/experience";
import { useExperienceStore } from "@/src/store/experienceStore";

const rank: Record<QualityTier, number> = { low: 0, medium: 1, high: 2 };

export function QualityGate({ min = "medium", children }: { min?: QualityTier; children: ReactNode }) {
  const quality = useExperienceStore((state) => state.quality);
  if (rank[quality] < rank[min]) return null;
  return children;
}
