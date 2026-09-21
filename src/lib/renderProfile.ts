import type { QualityTier } from "@/src/types/experience";
import {
  governedShadowMapSize,
  renderGovernorProfile,
  type RenderGovernorTier,
} from "@/src/lib/renderGovernor";

export interface CinematicRenderProfile {
  antialias: "none" | "smaa";
  bloom: boolean;
  bloomMipmap: boolean;
  bloomScale:number;
  composerMultisampling: number;
  shadows:boolean;
  shadowMapSize: number;
  shadowRadius: number;
  shadowBias: number;
  powerPreference: "default" | "high-performance";
}

const profiles: Record<QualityTier, Omit<CinematicRenderProfile,"bloomScale"|"shadows">> = {
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

export function cinematicRenderProfile(
  tier: QualityTier,
  governorTier:RenderGovernorTier="native",
): CinematicRenderProfile {
  const base=profiles[tier];
  const governor=renderGovernorProfile(tier,governorTier);
  const reduced=governor.postFx==="reduced";
  const off=governor.postFx==="off";
  return {
    ...base,
    antialias:off || (reduced && tier!=="high") ? "none" : base.antialias,
    bloom:base.bloom && !off && (!reduced || tier==="high"),
    bloomMipmap:base.bloomMipmap && governorTier==="native",
    bloomScale:governor.bloomScale,
    shadows:tier==="high" && governor.shadows,
    shadowMapSize:governedShadowMapSize(base.shadowMapSize,tier,governorTier),
    shadowRadius:Math.max(1,base.shadowRadius*governor.shadowScale),
  };
}
