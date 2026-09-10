"use client";

import { create } from "zustand";
import type { QualityTier, Vec3 } from "@/src/types/experience";

interface PointerState { x: number; y: number; }
interface RendererStats { calls: number; triangles: number; lines: number; points: number; }
interface CameraTelemetry { position: Vec3; target: Vec3; fov: number; }

interface ExperienceState {
  progress: number;
  velocity: number;
  direction: number;
  activeScene: number;
  pointer: PointerState;
  quality: QualityTier;
  reducedMotion: boolean;
  debug: boolean;
  selectedHotspot: string | null;
  rendererStats: RendererStats;
  freeCamera: boolean;
  cameraTelemetry: CameraTelemetry;
  setScrollState: (progress: number, velocity: number, direction: number, activeScene: number) => void;
  setPointer: (pointer: PointerState) => void;
  setQuality: (quality: QualityTier) => void;
  setReducedMotion: (value: boolean) => void;
  setDebug: (value: boolean) => void;
  setSelectedHotspot: (id: string | null) => void;
  setRendererStats: (stats: RendererStats) => void;
  setFreeCamera: (value: boolean) => void;
  setCameraTelemetry: (value: CameraTelemetry) => void;
}

export const useExperienceStore = create<ExperienceState>((set) => ({
  progress: 0,
  velocity: 0,
  direction: 0,
  activeScene: 0,
  pointer: { x: 0, y: 0 },
  quality: "high",
  reducedMotion: false,
  debug: false,
  selectedHotspot: null,
  rendererStats: { calls: 0, triangles: 0, lines: 0, points: 0 },
  freeCamera: false,
  cameraTelemetry: { position: [0, 0, 8], target: [0, 0, 0], fov: 42 },
  setScrollState: (progress, velocity, direction, activeScene) => set({ progress, velocity, direction, activeScene }),
  setPointer: (pointer) => set({ pointer }),
  setQuality: (quality) => set({ quality }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  setDebug: (debug) => set({ debug }),
  setSelectedHotspot: (selectedHotspot) => set({ selectedHotspot }),
  setRendererStats: (rendererStats) => set({ rendererStats }),
  setFreeCamera: (freeCamera) => set({ freeCamera }),
  setCameraTelemetry: (cameraTelemetry) => set({ cameraTelemetry }),
}));
