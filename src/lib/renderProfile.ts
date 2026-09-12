import type { QualityTier } from "@/src/types/experience";

export interface CinematicRenderProfile {
  antialias: "none" | "smaa";
  bloom: boolean;
  bloomMipmap: boolean;
  composerMultisampling: number;
  shadowMapSize: number;
  shadowRadius: number;
  shadowBias: number;
  powerPreference: "default" | "high-performance";
}

const profiles: Record<QualityTier, CinematicRenderProfile> = {
  low: {
    antialias: "none",
    bloom: false,
    bloomMipmap: false,
    composerMultisampling: 0,
    shadowMapSize: 512,
    shadowRadius: 1,
    shadowBias: -0.0001,
    powerPreference: "default",
  },
  medium: {
    antialias: "smaa",
    bloom: true,
    bloomMipmap: true,
    composerMultisampling: 0,
    shadowMapSize: 1024,
    shadowRadius: 2,
    shadowBias: -0.00015,
    powerPreference: "high-performance",
  },
  high: {
    antialias: "smaa",
    bloom: true,
    bloomMipmap: true,
    composerMultisampling: 0,
    shadowMapSize: 2048,
    shadowRadius: 3,
    shadowBias: -0.0002,
    powerPreference: "high-performance",
  },
};

export function cinematicRenderProfile(tier: QualityTier): CinematicRenderProfile {
  return profiles[tier];
}
