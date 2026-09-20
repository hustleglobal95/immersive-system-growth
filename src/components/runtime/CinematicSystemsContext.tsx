"use client";

import { createContext, useContext, type ReactNode } from "react";
import { cinematicSystems as productionCinematicSystems } from "@/src/lib/cinematic/config";
import type { CinematicSystemsManifest } from "@/src/lib/cinematic/schema";

const CinematicSystemsContext = createContext<CinematicSystemsManifest>(productionCinematicSystems);

export function CinematicSystemsProvider({
  value,
  children,
}: {
  value: CinematicSystemsManifest;
  children: ReactNode;
}) {
  return <CinematicSystemsContext.Provider value={value}>{children}</CinematicSystemsContext.Provider>;
}

export function useCinematicSystemsConfig() {
  return useContext(CinematicSystemsContext);
}

export function cinematicSceneFrom(manifest: CinematicSystemsManifest, sceneId: string) {
  return manifest.scenes.find((scene) => scene.id === sceneId) ?? null;
}
