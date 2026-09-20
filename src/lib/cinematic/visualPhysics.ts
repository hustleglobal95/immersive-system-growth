import type { RefractionConfig, SceneTransitionConfig, WarpConfig } from "@/src/lib/cinematic/schema";

export type VisualPhysicsBackend = "webgl" | "fallback";

export function resolveVisualPhysicsBackend(input:{
  quality:"low"|"medium"|"high";
  webgl2:boolean;
  reducedMotion:boolean;
}):VisualPhysicsBackend{
  if(input.reducedMotion||input.quality==="low"||!input.webgl2)return "fallback";
  return "webgl";
}

const clamp01=(value:number)=>Math.max(0,Math.min(1,value));

export function sampleSceneTransition(config:SceneTransitionConfig,progress:number){
  const start=config.range[0],end=config.range[1];
  const normalized=clamp01((progress-start)/Math.max(1e-6,end-start));
  return {
    progress:normalized,
    active:normalized>0&&normalized<1,
    complete:normalized>=1,
  };
}

export function visualPhysicsCost(input:{
  warp?:WarpConfig;
  refraction?:RefractionConfig;
  sceneTransition?:SceneTransitionConfig;
}){
  let score=0;
  if(input.warp)score+=input.warp.mode==="cloth"||input.warp.mode==="water"?2:1;
  if(input.refraction)score+=input.refraction.dispersion>0?2:1;
  if(input.sceneTransition)score+=["noise","pixel","grain","depth"].includes(input.sceneTransition.effect)?2:1;
  return score<=2?"light":score<=4?"medium":"heavy";
}
