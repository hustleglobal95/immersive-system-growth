"use client";

import type { ReactNode } from "react";
import { useSceneVisibility } from "@/src/hooks/useSceneVisibility";

export function SceneZone({ sceneId, children, preloadRadius = 1 }: { sceneId: string; children: ReactNode; preloadRadius?: number }) {
  const { active, nearby } = useSceneVisibility(sceneId, preloadRadius);
  if (!nearby) return null;
  return <group visible={active}>{children}</group>;
}
