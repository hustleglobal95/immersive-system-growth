import type { CSSProperties } from "react";
import type { MaskPreset, MaskRevealDefinition, QualityTier } from "@/src/types/experience";

export const maskPresetNames = [
  "linear-soft",
  "radial-iris",
  "diagonal-cut",
  "split-center",
  "pixel-grid",
  "noise-dissolve",
  "ink-spread",
  "film-burn",
] as const satisfies readonly MaskPreset[];

export type MaskBackend = "dom" | "webgl" | "static";
export type MaskCapability = {
  quality: QualityTier;
  webglStatus: "loading" | "ready" | "lost" | "failed";
  reducedMotion: boolean;
};

const presetDefaults: Record<MaskPreset, Partial<MaskRevealDefinition>> = {
  "linear-soft": { softness: 10, direction: "right" },
  "radial-iris": { softness: 12, origin: [50, 50] },
  "diagonal-cut": { softness: 8, direction: "right", rotation: -12 },
  "split-center": { softness: 7, origin: [50, 50] },
  "pixel-grid": { softness: 2, intensity: 1.2, seed: 113 },
  "noise-dissolve": { softness: 12, intensity: 1.1, seed: 271 },
  "ink-spread": { softness: 16, intensity: 1.25, seed: 607 },
  "film-burn": { softness: 9, intensity: 1.35, edgeWidth: 7, seed: 911 },
};

export const maskRevealBase: MaskRevealDefinition = {
  preset: "linear-soft",
  renderer: "auto",
  direction: "right",
  origin: [50, 50],
  softness: 12,
  scale: 1,
  rotation: 0,
  intensity: 1,
  seed: 47,
  invert: false,
  edgeColor: "#f97316",
  edgeWidth: 0,
};

export function createMaskReveal(
  preset: MaskPreset,
  current?: Partial<MaskRevealDefinition>,
): MaskRevealDefinition {
  return {
    ...maskRevealBase,
    ...presetDefaults[preset],
    ...current,
    preset,
  };
}

export function resolveMaskBackend(
  mask: MaskRevealDefinition,
  capability: MaskCapability,
): MaskBackend {
  if (capability.reducedMotion) return "static";
  if (mask.renderer === "dom") return "dom";
  const shaderReady = capability.quality === "high" && capability.webglStatus === "ready";
  if (mask.renderer === "webgl") return shaderReady ? "webgl" : "dom";
  return shaderReady && isShaderPreset(mask.preset) ? "webgl" : "dom";
}

export function isShaderPreset(preset: MaskPreset) {
  return preset === "noise-dissolve" || preset === "ink-spread" || preset === "film-burn";
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
// Spatial: the softness band across the mask edge. Cubic, because the shader softens the same
// band with GLSL's smoothstep builtin and the two paths must agree on edge shape.
const smooth = (value: number) => {
  const p = clamp01(value);
  return p * p * (3 - 2 * p);
};
// Timing: how the reveal advances with scroll. Quintic, matched exactly in maskShader.ts.
const smoother = (value: number) => {
  const p = clamp01(value);
  return p * p * p * (p * (p * 6 - 15) + 10);
};
const pct = (value: number) => `${Math.max(0, Math.min(100, value)).toFixed(3)}%`;

export function createCssMaskStyle(
  progress: number,
  mask: MaskRevealDefinition,
): CSSProperties {
  const p = smoother(progress);
  if (p <= 0) return maskStyle("linear-gradient(transparent, transparent)");
  if (p >= 1) return maskStyle("linear-gradient(black, black)");
  const soft = mask.softness * 0.5;
  // The sweep has to carry its own feather, or the band is already inside the frame at the
  // start and still short of the far edge at the end. Travelling from -soft to 100 + soft means
  // progress 0 is genuinely closed and progress 1 genuinely open, with the midpoint unchanged.
  // Every preset's geometry has to travel a range extended by its own feather at both ends, or
  // the reveal starts with a band already inside the frame and finishes a band short of the far
  // edge. The midpoint of each sweep is unchanged.
  const sweep = (range: number, feather: number) => -feather + p * (range + feather * 2);
  const edge = sweep(100, soft);
  const [x, y] = mask.origin;
  const direction = directionCss(mask.direction);
  const reverse = mask.direction === "left" || mask.direction === "up";
  const directedEdge = reverse ? 100 - edge : edge;
  const before = pct(directedEdge - soft);
  const after = pct(directedEdge + soft);
  const visible = reverse
    ? `transparent 0 ${before}, black ${after} 100%`
    : `black 0 ${before}, transparent ${after} 100%`;
  let image: string;
  let size = "100% 100%";
  let repeat = "no-repeat";

  switch (mask.preset) {
    case "radial-iris": {
      const radius = sweep(145, soft) / mask.scale;
      image = `radial-gradient(circle at ${pct(x)} ${pct(y)}, black 0 ${pct(radius - soft)}, transparent ${pct(radius + soft)} 100%)`;
      break;
    }
    case "diagonal-cut":
      image = `linear-gradient(${direction + mask.rotation}deg, ${visible})`;
      break;
    case "split-center": {
      const half = sweep(50, soft) / mask.scale;
      image = `linear-gradient(90deg, transparent 0 ${pct(x - half - soft)}, black ${pct(x - half + soft)} ${pct(x + half - soft)}, transparent ${pct(x + half + soft)} 100%)`;
      break;
    }
    case "pixel-grid": {
      const degrees = Math.max(1, p * 360);
      image = `conic-gradient(from ${mask.rotation}deg at 50% 50%, black 0deg ${degrees.toFixed(3)}deg, transparent ${degrees.toFixed(3)}deg 360deg)`;
      const cell = Math.max(8, Math.round(34 / mask.scale));
      size = `${cell}px ${cell}px`;
      repeat = "repeat";
      break;
    }
    case "noise-dissolve": {
      const radius = sweep(150, soft) / mask.scale;
      image = blobMask(x, y, radius, soft, mask.seed, 4, mask.intensity);
      break;
    }
    case "ink-spread": {
      const radius = sweep(162, soft * 1.4) / mask.scale;
      image = blobMask(x, y, radius, soft * 1.4, mask.seed, 7, mask.intensity);
      break;
    }
    case "film-burn":
      image = `linear-gradient(${direction + mask.rotation}deg, ${visible}), ${blobMask(x, y, sweep(120, soft), soft, mask.seed, 3, mask.intensity)}`;
      break;
    case "linear-soft":
    default:
      image = `linear-gradient(${direction + mask.rotation}deg, ${visible})`;
  }
  if (mask.invert) image = invertMask(image);
  return {
    ...maskStyle(image),
    WebkitMaskSize: size,
    maskSize: size,
    WebkitMaskRepeat: repeat,
    maskRepeat: repeat,
    WebkitMaskPosition: "center",
    maskPosition: "center",
  };
}

function maskStyle(image: string): CSSProperties {
  return { WebkitMaskImage: image, maskImage: image };
}

function directionCss(direction: MaskRevealDefinition["direction"]) {
  return direction === "right" ? 90 : direction === "left" ? 270 : direction === "down" ? 180 : 0;
}

function blobMask(
  x: number,
  y: number,
  radius: number,
  softness: number,
  seed: number,
  count: number,
  intensity: number,
) {
  return Array.from({ length: count }, (_, index) => {
    const angle = hash(seed, index, 1) * Math.PI * 2;
    const distance = hash(seed, index, 2) * Math.min(24, radius * 0.22) * intensity;
    const bx = x + Math.cos(angle) * distance;
    const by = y + Math.sin(angle) * distance;
    const variance = 0.72 + hash(seed, index, 3) * 0.48;
    return `radial-gradient(circle at ${pct(bx)} ${pct(by)}, black 0 ${pct(radius * variance - softness)}, transparent ${pct(radius * variance + softness)} 100%)`;
  }).join(", ");
}

function invertMask(image: string) {
  return image.replaceAll("black", "MASK_WHITE").replaceAll("transparent", "black").replaceAll("MASK_WHITE", "transparent");
}

function hash(seed: number, x: number, y: number) {
  const value = Math.sin(seed * 12.9898 + x * 78.233 + y * 37.719) * 43758.5453;
  return value - Math.floor(value);
}

export function sampleMaskField(
  preset: MaskPreset,
  u: number,
  v: number,
  mask: MaskRevealDefinition,
) {
  const ox = mask.origin[0] / 100;
  const oy = mask.origin[1] / 100;
  const angle = (-mask.rotation * Math.PI) / 180;
  const px = (u - ox) / mask.scale;
  const py = (v - oy) / mask.scale;
  const x = px * Math.cos(angle) - py * Math.sin(angle) + 0.5;
  const y = px * Math.sin(angle) + py * Math.cos(angle) + 0.5;
  const directional =
    mask.direction === "right" ? x : mask.direction === "left" ? 1 - x : mask.direction === "down" ? y : 1 - y;
  const cellX = Math.floor(u * (8 + mask.intensity * 10));
  const cellY = Math.floor(v * (8 + mask.intensity * 10));
  const noise = hash(mask.seed, cellX, cellY);
  const radial = Math.hypot(x - 0.5, y - 0.5) * 1.42;
  let field = directional;
  if (preset === "radial-iris") field = radial;
  else if (preset === "diagonal-cut") field = (x + y) * 0.5;
  else if (preset === "split-center") field = Math.abs(x - 0.5) * 2;
  else if (preset === "pixel-grid") field = noise;
  else if (preset === "noise-dissolve") field = directional * 0.42 + noise * 0.58;
  else if (preset === "ink-spread") field = radial * 0.64 + noise * 0.36;
  else if (preset === "film-burn") field = directional * 0.72 + noise * 0.28;
  return mask.invert ? 1 - clamp01(field) : clamp01(field);
}

export function sampleMaskAlpha(
  progress: number,
  u: number,
  v: number,
  mask: MaskRevealDefinition,
) {
  const p = smoother(progress);
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  const field = sampleMaskField(mask.preset, u, v, mask);
  const feather = Math.max(0.0001, mask.softness / 200);
  // Same swept range as the CSS backend, so the two agree at both ends.
  const swept = -feather + p * (1 + feather * 2);
  const value = clamp01((swept - field + feather) / (feather * 2));
  return smooth(value);
}
