import type { OcclusionLayerConfig } from "@/src/lib/cinematic/schema";
export interface OcclusionSample { visible:boolean; translate:number; opacity:number; blur:number; depth:number }
const clamp01=(v:number)=>Math.max(0,Math.min(1,v));
export function sampleOcclusion(config:OcclusionLayerConfig,progress:number):OcclusionSample{const local=clamp01((progress-config.range[0])/Math.max(1e-6,config.range[1]-config.range[0])),envelope=Math.sin(local*Math.PI);return{visible:progress>=config.range[0]&&progress<=config.range[1],translate:config.from+(config.to-config.from)*local,opacity:config.opacity*envelope,blur:config.blur*(1-envelope*.65),depth:config.depth};}
