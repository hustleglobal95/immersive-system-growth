"use client";
import { create } from "zustand";
import type { QualityTier, QualityMode, Vec3, CameraDefinition, CameraState } from "@/src/types/experience";
import type { CameraShotName } from "@/src/lib/cameraShots";
import { constrainQuality, nextQuality } from "@/src/lib/quality";

export interface CameraPreview {
  name: CameraShotName;
  sceneId: string;
  camera: CameraDefinition;
  mobileCamera: CameraDefinition;
}
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
export interface RuntimeOrbitState {
  target: string | null;
  yaw: number;
  pitch: number;
  sensitivity: number;
}
interface ExperienceState {
  mediaPreview: boolean;
  setMediaPreview: (value: boolean) => void;
  cameraPreview: CameraPreview | null;
  setCameraPreview: (value: CameraPreview | null) => void;
  guides: boolean;
  setGuides: (value: boolean) => void;
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
  runtimeProgress: number | null;
  runtimeCamera: CameraState | null;
  orbit: RuntimeOrbitState;
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
  setRuntimeProgress: (progress: number | null) => void;
  setRuntimeCamera: (camera: CameraState | null) => void;
  setOrbitControl: (target: string | null, sensitivity?: number) => void;
  adjustOrbit: (target: string | undefined, deltaX: number, deltaY: number) => void;
  resetOrbit: (target?: string) => void;
  resetRuntimeOverrides: () => void;
  retry: () => void;
  resetLab: () => void;
}

const defaultOrbit: RuntimeOrbitState = {
  target: null,
  yaw: 0,
  pitch: 0,
  sensitivity: 0.006,
};

export const useExperienceStore = create<ExperienceState>((set) => ({
  mediaPreview: false,
  setMediaPreview: (mediaPreview) => set({ mediaPreview }),
  cameraPreview: null,
  setCameraPreview: (cameraPreview) => set({ cameraPreview, freeCamera: false }),
  guides: false,
  setGuides: (guides) => set({ guides }),
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
  runtimeProgress: null,
  runtimeCamera: null,
  orbit: { ...defaultOrbit },
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
    set((state) => ({
      qualityMode,
      quality: constrainQuality(qualityMode, state.adaptiveTier, state.deviceCeiling),
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
    set((state) => {
      if (state.qualityMode !== "auto") return state;
      const adaptiveTier = direction === 0 ? "low" : nextQuality(state.adaptiveTier, direction);
      return {
        adaptiveTier,
        quality: constrainQuality("auto", adaptiveTier, state.deviceCeiling),
      };
    }),
  setReducedMotion: (motionOverride) =>
    set((state) => ({
      motionOverride,
      reducedMotion: motionOverride ?? state.systemReducedMotion,
    })),
  setSystemReducedMotion: (systemReducedMotion) =>
    set((state) => ({
      systemReducedMotion,
      reducedMotion: state.motionOverride ?? systemReducedMotion,
    })),
  setDebug: (debug) => set({ debug }),
  setSelectedHotspot: (selectedHotspot) => set({ selectedHotspot }),
  setRendererStats: (rendererStats) => set({ rendererStats }),
  setFreeCamera: (freeCamera) => set({ freeCamera }),
  setCameraTelemetry: (cameraTelemetry) => set({ cameraTelemetry }),
  setWebglStatus: (webglStatus) => set({ webglStatus }),
  setAssetError: (id, message) =>
    set((state) => {
      const assetErrors = { ...state.assetErrors };
      if (message) assetErrors[id] = message;
      else delete assetErrors[id];
      return { assetErrors };
    }),
  setRuntimeProgress: (runtimeProgress) => set({ runtimeProgress }),
  setRuntimeCamera: (runtimeCamera) => set({ runtimeCamera, freeCamera: false }),
  setOrbitControl: (target, sensitivity) =>
    set((state) => ({
      orbit: {
        ...state.orbit,
        target,
        sensitivity: sensitivity ?? state.orbit.sensitivity,
      },
    })),
  adjustOrbit: (target, deltaX, deltaY) =>
    set((state) => {
      if (!target || state.orbit.target !== target || !Number.isFinite(deltaX) || !Number.isFinite(deltaY)) return state;
      const dx = Math.max(-120, Math.min(120, deltaX));
      const dy = Math.max(-120, Math.min(120, deltaY));
      return {
        orbit: {
          ...state.orbit,
          yaw: state.orbit.yaw + dx * state.orbit.sensitivity,
          pitch: Math.max(-1.35, Math.min(1.35, state.orbit.pitch + dy * state.orbit.sensitivity)),
        },
      };
    }),
  resetOrbit: (target) =>
    set((state) => {
      if (target && state.orbit.target !== target) return state;
      return { orbit: { ...state.orbit, yaw: 0, pitch: 0 } };
    }),
  resetRuntimeOverrides: () => set({ runtimeProgress: null, runtimeCamera: null, orbit: { ...defaultOrbit } }),
  retry: () =>
    set((state) => ({
      retryGeneration: state.retryGeneration + 1,
      webglStatus: "loading",
      assetErrors: {},
    })),
  resetLab: () =>
    set((state) => ({
      mediaPreview: false,
      cameraPreview: null,
      freeCamera: false,
      guides: false,
      debug: false,
      motionOverride: null,
      reducedMotion: state.systemReducedMotion,
      runtimeProgress: null,
      runtimeCamera: null,
      orbit: { ...defaultOrbit },
    })),
}));
