"use client";

import { PerformanceMonitor } from "@react-three/drei";
import { useExperienceStore } from "@/src/store/experienceStore";

export function AdaptiveQuality() {
  const setQuality = useExperienceStore((state) => state.setQuality);
  return (
    <PerformanceMonitor
      flipflops={3}
      onDecline={() => setQuality("low")}
      onIncline={() => setQuality("high")}
      onFallback={() => setQuality("low")}
    />
  );
}
