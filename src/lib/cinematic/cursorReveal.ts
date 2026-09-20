import type { CursorRevealConfig, QualityTier } from "@/src/lib/cinematic/schema";

export type CursorRevealBackend = "canvas" | "webgl-trail" | "webgl-fluid";

export interface CursorRevealCapability {
  quality: QualityTier | "low" | "medium" | "high";
  webgl2: boolean;
  floatTargets: boolean;
  reducedMotion: boolean;
}

export interface CursorRevealPointer {
  pointerType: string;
  down: boolean;
  active: boolean;
}

export const cursorRevealModeNames = ["lens", "trail", "fluid"] as const;

export function resolveCursorRevealBackend(config: CursorRevealConfig, capability: CursorRevealCapability): CursorRevealBackend {
  if (capability.reducedMotion || config.renderer === "canvas" || capability.quality === "low" || !capability.webgl2) return "canvas";
  if (config.mode === "fluid" && capability.floatTargets && config.renderer !== "canvas") return "webgl-fluid";
  if (config.renderer === "gpu" || config.renderer === "auto") return "webgl-trail";
  return "canvas";
}

export function shouldInjectCursorReveal(config: CursorRevealConfig, pointer: CursorRevealPointer) {
  if (!pointer.active) return false;
  if (pointer.pointerType === "touch") {
    if (config.touch === "disabled") return false;
    if (config.touch === "drag" && !pointer.down) return false;
  }
  return true;
}

export function cursorRevealIdleDecay(config: CursorRevealConfig, idleMs: number, deltaSeconds: number) {
  if (config.mode === "lens") return 0;
  if (idleMs <= config.lingerMs) return 1;
  const base = Math.exp(-Math.max(0, deltaSeconds) / Math.max(0.05, config.fadeSeconds));
  return Math.max(0, Math.min(1, base * (0.35 + config.trailPersistence * 0.65)));
}

export function cursorRevealBrush(config: CursorRevealConfig, speed: number, pressure: number) {
  const pressureBoost = pressure > 0 ? 0.7 + Math.min(1, pressure) * 0.6 : 1;
  const motionBoost = 1 + Math.min(2, Math.max(0, speed)) * 0.08 * config.motionStrength;
  return {
    radius: Math.max(0.01, Math.min(0.5, config.brushSize * pressureBoost)),
    strength: Math.max(0, Math.min(3, config.brushStrength * motionBoost)),
  };
}
