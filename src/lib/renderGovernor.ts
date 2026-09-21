import type { QualityTier } from "@/src/types/experience";

export type RenderGovernorTier="native"|"balanced"|"performance"|"survival";
export type RenderPressureDirection=-1|0|1;

export interface RenderGovernorTelemetry {
  frameMean:number;
  frameP95:number;
  samples:number;
  updatedAt:number;
}

export interface RenderGovernorState {
  tier:RenderGovernorTier;
  pressureStreak:number;
  transitions:number;
  lastReason:string;
  telemetry:RenderGovernorTelemetry;
}

export interface RenderGovernorProfile {
  tier:RenderGovernorTier;
  dprScale:number;
  minDpr:number;
  postFx:"full"|"reduced"|"off";
  bloomScale:number;
  shadows:boolean;
  shadowScale:number;
  particleScale:number;
  reconstruction:"native"|"browser-spatial";
  preserveSubjectTier:boolean;
}

const tiers:RenderGovernorTier[]=["native","balanced","performance","survival"];

export const initialRenderGovernorState:RenderGovernorState={
  tier:"native",
  pressureStreak:0,
  transitions:0,
  lastReason:"initial",
  telemetry:{frameMean:0,frameP95:0,samples:0,updatedAt:0},
};

export function nextRenderGovernorTier(current:RenderGovernorTier,direction:-1|1):RenderGovernorTier {
  const index=tiers.indexOf(current);
  return tiers[Math.max(0,Math.min(tiers.length-1,index+direction))];
}

export function renderGovernorProfile(
  quality:QualityTier,
  tier:RenderGovernorTier,
):RenderGovernorProfile {
  const base:Record<RenderGovernorTier,Omit<RenderGovernorProfile,"tier"|"preserveSubjectTier">>={
    native:{
      dprScale:1,
      minDpr:.75,
      postFx:"full",
      bloomScale:1,
      shadows:true,
      shadowScale:1,
      particleScale:1,
      reconstruction:"native",
    },
    balanced:{
      dprScale:.88,
      minDpr:.68,
      postFx:"full",
      bloomScale:.72,
      shadows:true,
      shadowScale:.75,
      particleScale:.72,
      reconstruction:"browser-spatial",
    },
    performance:{
      dprScale:.72,
      minDpr:.58,
      postFx:"reduced",
      bloomScale:.35,
      shadows:quality==="high",
      shadowScale:.5,
      particleScale:.4,
      reconstruction:"browser-spatial",
    },
    survival:{
      dprScale:.58,
      minDpr:.5,
      postFx:"off",
      bloomScale:0,
      shadows:false,
      shadowScale:0,
      particleScale:.15,
      reconstruction:"browser-spatial",
    },
  };
  return {
    tier,
    ...base[tier],
    preserveSubjectTier:true,
  };
}

export function governedDpr(baseDpr:number,quality:QualityTier,tier:RenderGovernorTier) {
  const profile=renderGovernorProfile(quality,tier);
  return Math.max(profile.minDpr,Math.min(baseDpr,baseDpr*profile.dprScale));
}

export function governedParticleCount(count:number,quality:QualityTier,tier:RenderGovernorTier) {
  const scale=renderGovernorProfile(quality,tier).particleScale;
  return Math.max(count>0 ? 1 : 0,Math.floor(count*scale));
}

export function governedShadowMapSize(base:number,quality:QualityTier,tier:RenderGovernorTier) {
  const profile=renderGovernorProfile(quality,tier);
  if(!profile.shadows) return 0;
  const scaled=base*profile.shadowScale;
  if(scaled>=1536) return 2048;
  if(scaled>=768) return 1024;
  return 512;
}

export function percentile95(values:number[]) {
  if(!values.length) return 0;
  const sorted=[...values].sort((a,b)=>a-b);
  return sorted[Math.min(sorted.length-1,Math.floor((sorted.length-1)*.95))];
}

export function mean(values:number[]) {
  return values.length ? values.reduce((sum,value)=>sum+value,0)/values.length : 0;
}
