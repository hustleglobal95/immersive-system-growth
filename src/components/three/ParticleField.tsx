"use client";

import { Sparkles } from "@react-three/drei";
import { useExperienceStore } from "@/src/store/experienceStore";

export function ParticleField() {
  const quality = useExperienceStore((state) => state.quality);
  const reducedMotion = useExperienceStore((state) => state.reducedMotion);
  if (reducedMotion || quality === "low") return null;
  const count = quality === "high" ? 90 : 42;
  return <Sparkles count={count} scale={[9, 5, 8]} size={1.15} speed={0.12} opacity={0.16} noise={0.8} color="#f8b06b" />;
}
