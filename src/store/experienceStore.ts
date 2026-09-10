"use client";
import { create } from "zustand";
import type { QualityTier, QualityMode, Vec3 } from "@/src/types/experience";
import { constrainQuality, nextQuality } from "@/src/lib/quality";
interface PointerState {
  x: number;
  y: number;
}
export interface RendererStats {
  calls: number;
  triangles: number;
  lines: number;
  points: number;
  textures: number;
  geometries: number;
  frameMs: number;
}
interface CameraTelemetry {
  position: Vec3;
  target: Vec3;
  fov: number;
}
interface ExperienceState {
  guides:boolean; setGuides:(value:boolean)=>void;
  progress: number;
  velocity: number;
  direction: number;
  activeScene: number;
  pointer: PointerState;
  quality: QualityTier;
  qualityMode: QualityMode;
  adaptiveTier: QualityTier;
  deviceCeiling: QualityTier;
  profileReady: boolean;
  reducedMotion: boolean;
  systemReducedMotion: boolean;
  motionOverride: boolean | null;
  debug: boolean;
  freeCamera: boolean;
  selectedHotspot: string | null;
  rendererStats: RendererStats;
  cameraTelemetry: CameraTelemetry;
  webglStatus: "loading" | "ready" | "lost" | "failed";
  assetErrors: Record<string, string>;
  retryGeneration: number;
  setScrollState: (
    progress: number,
    velocity: number,
    direction: number,
    activeScene: number,
  ) => void;
  setPointer: (pointer: PointerState) => void;
  setQuality: (mode: QualityMode) => void;
  setProfile: (ceiling: QualityTier, mode: QualityMode) => void;
  adaptQuality: (direction: 1 | -1 | 0) => void;
  setReducedMotion: (value: boolean | null) => void;
  setSystemReducedMotion: (value: boolean) => void;
  setDebug: (value: boolean) => void;
  setSelectedHotspot: (id: string | null) => void;
  setRendererStats: (stats: RendererStats) => void;
  setFreeCamera: (value: boolean) => void;
  setCameraTelemetry: (value: CameraTelemetry) => void;
  setWebglStatus: (status: ExperienceState["webglStatus"]) => void;
  setAssetError: (id: string, message: string | null) => void;
  retry: () => void;
  resetLab: () => void;
}
export const useExperienceStore = create<ExperienceState>((set) => ({
  guides:false,setGuides:(guides)=>set({guides}),
  progress: 0,
  velocity: 0,
  direction: 0,
  activeScene: 0,
  pointer: { x: 0, y: 0 },
  quality: "low",
  qualityMode: "auto",
  adaptiveTier: "low",
  deviceCeiling: "low",
  profileReady: false,
  reducedMotion: true,
  systemReducedMotion: true,
  motionOverride: null,
  debug: false,
  freeCamera: false,
  selectedHotspot: null,
  webglStatus: "loading",
  assetErrors: {},
  retryGeneration: 0,
  rendererStats: {
    calls: 0,
    triangles: 0,
    lines: 0,
    points: 0,
    textures: 0,
    geometries: 0,
    frameMs: 0,
  },
  cameraTelemetry: { position: [0, 0, 8], target: [0, 0, 0], fov: 42 },
  setScrollState: (progress, velocity, direction, activeScene) =>
    set({ progress, velocity, direction, activeScene }),
  setPointer: (pointer) => set({ pointer }),
  setQuality: (qualityMode) =>
    set((s) => ({
      qualityMode,
      quality: constrainQuality(qualityMode, s.adaptiveTier, s.deviceCeiling),
    })),
  setProfile: (deviceCeiling, qualityMode) =>
    set({
      deviceCeiling,
      qualityMode,
      adaptiveTier: deviceCeiling,
      quality: constrainQuality(qualityMode, deviceCeiling, deviceCeiling),
      profileReady: true,
    }),
  adaptQuality: (direction) =>
    set((s) => {
      if (s.qualityMode !== "auto") return s;
      const adaptiveTier =
        direction === 0 ? "low" : nextQuality(s.adaptiveTier, direction);
      return {
        adaptiveTier,
        quality: constrainQuality("auto", adaptiveTier, s.deviceCeiling),
      };
    }),
  setReducedMotion: (motionOverride) =>
    set((s) => ({
      motionOverride,
      reducedMotion: motionOverride ?? s.systemReducedMotion,
    })),
  setSystemReducedMotion: (systemReducedMotion) =>
    set((s) => ({
      systemReducedMotion,
      reducedMotion: s.motionOverride ?? systemReducedMotion,
    })),
  setDebug: (debug) => set({ debug }),
  setSelectedHotspot: (selectedHotspot) => set({ selectedHotspot }),
  setRendererStats: (rendererStats) => set({ rendererStats }),
  setFreeCamera: (freeCamera) => set({ freeCamera }),
  setCameraTelemetry: (cameraTelemetry) => set({ cameraTelemetry }),
  setWebglStatus: (webglStatus) => set({ webglStatus }),
  setAssetError: (id, message) =>
    set((s) => {
      const assetErrors = { ...s.assetErrors };
      if (message) assetErrors[id] = message;
      else delete assetErrors[id];
      return { assetErrors };
    }),
  retry: () =>
    set((s) => ({
      retryGeneration: s.retryGeneration + 1,
      webglStatus: "loading",
      assetErrors: {},
    })),
  resetLab: () =>
    set((s) => ({
      freeCamera: false,
      guides: false,
      debug: false,
      motionOverride: null,
      reducedMotion: s.systemReducedMotion,
    })),
}));
