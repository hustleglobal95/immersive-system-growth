"use client";
import { PerformanceMonitor } from "@react-three/drei";
import { useExperienceStore } from "@/src/store/experienceStore";
export function AdaptiveQuality() {
  return (
    <PerformanceMonitor
      iterations={10}
      ms={250}
      flipflops={3}
      onDecline={() => useExperienceStore.getState().adaptQuality(-1)}
      onIncline={() => useExperienceStore.getState().adaptQuality(1)}
      onFallback={() => useExperienceStore.getState().adaptQuality(0)}
    />
  );
}
