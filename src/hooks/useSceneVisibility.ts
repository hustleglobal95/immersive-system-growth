"use client";

import { useExperienceConfig } from "@/src/components/runtime/ExperienceConfigContext";
import { useExperienceStore } from "@/src/store/experienceStore";

export function useSceneVisibility(sceneId: string, preloadRadius = 1) {
  const experience = useExperienceConfig();
  const activeScene = useExperienceStore((state) => state.activeScene);
  const index = experience.scenes.findIndex((scene) => scene.id === sceneId);
  if (index < 0) return { active: false, nearby: false, index: -1 };
  return {
    active: activeScene === index,
    nearby: Math.abs(activeScene - index) <= preloadRadius,
    index,
  };
}
