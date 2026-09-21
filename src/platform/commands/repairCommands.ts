import { parseExperience } from "@/src/lib/configSchema";
import type { ForgeCommand, CommandContext, CommandError, CommandResult } from "@/src/core/commands/command";
import { commandFailure } from "@/src/core/commands/command";
import { forgeEvent } from "@/src/core/events/eventBus";
import type { ExperienceConfig, SceneDefinition } from "@/src/types/experience";

export interface SceneLightingRepair {
  sceneId:string;
  exposureDelta?:number;
  ambientDelta?:number;
  keyDelta?:number;
  rimDelta?:number;
  bloomDelta?:number;
  vignetteDelta?:number;
}

export interface SceneSubjectFramingRepair {
  sceneId:string;
  scaleMultiplier?:number;
  xDelta?:number;
  yDelta?:number;
}

export interface SceneMediaFramingRepair {
  sceneId:string;
  xDelta?:number;
  yDelta?:number;
  mobileXDelta?:number;
  mobileYDelta?:number;
  zoomDelta?:number;
}

export interface SceneMaterialSurfaceRepair {
  sceneId:string;
  roughnessDelta?:number;
  metalnessDelta?:number;
  clearcoatDelta?:number;
  tintStrengthDelta?:number;
}

const lightingBounds={
  exposureDelta:[-0.4,0.4],
  ambientDelta:[-2,2],
  keyDelta:[-5,5],
  rimDelta:[-5,5],
  bloomDelta:[-0.5,0.5],
  vignetteDelta:[-0.3,0.3],
} as const;

const subjectBounds={
  scaleMultiplier:[0.8,1.2],
  xDelta:[-1,1],
  yDelta:[-1,1],
} as const;

const mediaBounds={
  xDelta:[-16,16],
  yDelta:[-16,16],
  mobileXDelta:[-16,16],
  mobileYDelta:[-16,16],
  zoomDelta:[-0.08,0.08],
} as const;

const materialBounds={
  roughnessDelta:[-0.18,0.18],
  metalnessDelta:[-0.18,0.18],
  clearcoatDelta:[-0.18,0.18],
  tintStrengthDelta:[-0.15,0.15],
} as const;

export class AdjustSceneLightingCommand implements ForgeCommand<ExperienceConfig,SceneLightingRepair,{sceneId:string;adjusted:string[]}> {
  readonly type="scene.adjustLighting";
  constructor(readonly input:SceneLightingRepair){}

  validate({state}:CommandContext<ExperienceConfig>):CommandError[] {
    const scene=state.scenes.find((item)=>item.id===this.input.sceneId);
    if(!scene) return [{code:"scene.notFound",message:"Scene "+this.input.sceneId+" was not found."}];
    return validateBoundedInput(this.input,lightingBounds,"repair.lighting");
  }

  execute({state,transactionId}:CommandContext<ExperienceConfig>):CommandResult<ExperienceConfig,{sceneId:string;adjusted:string[]}> {
    return mutateScene(state,transactionId,this.input.sceneId,"scene.lightingAdjusted",(scene,adjusted)=>{
      applyDelta(scene.world,"exposure",this.input.exposureDelta,0.25,3,adjusted,"world.exposure");
      applyDelta(scene.world,"ambient",this.input.ambientDelta,0,20,adjusted,"world.ambient");
      applyDelta(scene.world,"key",this.input.keyDelta,0,50,adjusted,"world.key");
      applyDelta(scene.world,"rim",this.input.rimDelta,0,50,adjusted,"world.rim");
      applyDelta(scene.post,"bloom",this.input.bloomDelta,0,2,adjusted,"post.bloom");
      applyDelta(scene.post,"vignette",this.input.vignetteDelta,0,1,adjusted,"post.vignette");
    },this.validate.bind(this));
  }
}

export class AdjustSceneSubjectFramingCommand implements ForgeCommand<ExperienceConfig,SceneSubjectFramingRepair,{sceneId:string;adjusted:string[]}> {
  readonly type="scene.adjustSubjectFraming";
  constructor(readonly input:SceneSubjectFramingRepair){}

  validate({state}:CommandContext<ExperienceConfig>):CommandError[] {
    const scene=state.scenes.find((item)=>item.id===this.input.sceneId);
    if(!scene) return [{code:"scene.notFound",message:"Scene "+this.input.sceneId+" was not found."}];
    return validateBoundedInput(this.input,subjectBounds,"repair.subject");
  }

  execute({state,transactionId}:CommandContext<ExperienceConfig>):CommandResult<ExperienceConfig,{sceneId:string;adjusted:string[]}> {
    return mutateScene(state,transactionId,this.input.sceneId,"scene.subjectFramingAdjusted",(scene,adjusted)=>{
      if(typeof this.input.scaleMultiplier==="number" && this.input.scaleMultiplier!==1) {
        scene.hero.from.scale=clamp(scene.hero.from.scale*this.input.scaleMultiplier,0.001,100);
        scene.hero.to.scale=clamp(scene.hero.to.scale*this.input.scaleMultiplier,0.001,100);
        adjusted.push("hero.scale");
      }
      const dx=this.input.xDelta ?? 0;
      const dy=this.input.yDelta ?? 0;
      if(dx || dy) {
        scene.hero.from.position=[scene.hero.from.position[0]+dx,scene.hero.from.position[1]+dy,scene.hero.from.position[2]];
        scene.hero.to.position=[scene.hero.to.position[0]+dx,scene.hero.to.position[1]+dy,scene.hero.to.position[2]];
        adjusted.push("hero.position");
      }
    },this.validate.bind(this));
  }
}

export class AdjustSceneMediaFramingCommand implements ForgeCommand<ExperienceConfig,SceneMediaFramingRepair,{sceneId:string;adjusted:string[]}> {
  readonly type="scene.adjustMediaFraming";
  constructor(readonly input:SceneMediaFramingRepair){}

  validate({state}:CommandContext<ExperienceConfig>):CommandError[] {
    const scene=state.scenes.find((item)=>item.id===this.input.sceneId);
    if(!scene) return [{code:"scene.notFound",message:"Scene "+this.input.sceneId+" was not found."}];
    const errors=validateBoundedInput(this.input,mediaBounds,"repair.media");
    if(!scene.media) errors.push({code:"repair.media.missing",message:"Scene "+this.input.sceneId+" has no media plate to reframe."});
    return errors;
  }

  execute({state,transactionId}:CommandContext<ExperienceConfig>):CommandResult<ExperienceConfig,{sceneId:string;adjusted:string[]}> {
    return mutateScene(state,transactionId,this.input.sceneId,"scene.mediaFramingAdjusted",(scene,adjusted)=>{
      if(!scene.media) return;
      const dx=this.input.xDelta ?? 0;
      const dy=this.input.yDelta ?? 0;
      if(dx || dy) {
        scene.media.position=[clamp(scene.media.position[0]+dx,0,100),clamp(scene.media.position[1]+dy,0,100)];
        adjusted.push("media.position");
      }
      const mdx=this.input.mobileXDelta ?? 0;
      const mdy=this.input.mobileYDelta ?? 0;
      if(mdx || mdy) {
        scene.media.mobilePosition=[clamp(scene.media.mobilePosition[0]+mdx,0,100),clamp(scene.media.mobilePosition[1]+mdy,0,100)];
        adjusted.push("media.mobilePosition");
      }
      if(typeof this.input.zoomDelta==="number" && this.input.zoomDelta!==0) {
        scene.media.zoom=clamp(scene.media.zoom+this.input.zoomDelta,1,1.18);
        adjusted.push("media.zoom");
      }
    },this.validate.bind(this));
  }
}

export class AdjustSceneMaterialSurfaceCommand implements ForgeCommand<ExperienceConfig,SceneMaterialSurfaceRepair,{sceneId:string;adjusted:string[]}> {
  readonly type="scene.adjustMaterialSurface";
  constructor(readonly input:SceneMaterialSurfaceRepair){}

  validate({state}:CommandContext<ExperienceConfig>):CommandError[] {
    const scene=state.scenes.find((item)=>item.id===this.input.sceneId);
    if(!scene) return [{code:"scene.notFound",message:"Scene "+this.input.sceneId+" was not found."}];
    const errors=validateBoundedInput(this.input,materialBounds,"repair.material");
    const checks=[
      ["roughnessDelta","roughness"],
      ["metalnessDelta","metalness"],
      ["clearcoatDelta","clearcoat"],
    ] as const;
    for(const [inputKey,materialKey] of checks) {
      if(typeof this.input[inputKey]==="number" && scene.material[materialKey]===null) {
        errors.push({
          code:"repair.material.unowned",
          message:"Cannot introduce "+materialKey+" from visual criticism. Author an explicit material override first.",
          path:inputKey,
        });
      }
    }
    if(typeof this.input.tintStrengthDelta==="number" && scene.material.tintStrength===0) {
      errors.push({
        code:"repair.material.unowned",
        message:"Cannot introduce material tint from visual criticism. Author a non-zero tint override first.",
        path:"tintStrengthDelta",
      });
    }
    return errors;
  }

  execute({state,transactionId}:CommandContext<ExperienceConfig>):CommandResult<ExperienceConfig,{sceneId:string;adjusted:string[]}> {
    return mutateScene(state,transactionId,this.input.sceneId,"scene.materialSurfaceAdjusted",(scene,adjusted)=>{
      applyNullableMaterial(scene,"roughness",this.input.roughnessDelta,adjusted);
      applyNullableMaterial(scene,"metalness",this.input.metalnessDelta,adjusted);
      applyNullableMaterial(scene,"clearcoat",this.input.clearcoatDelta,adjusted);
      if(typeof this.input.tintStrengthDelta==="number" && this.input.tintStrengthDelta!==0 && scene.material.tintStrength>0) {
        scene.material.tintStrength=clamp(scene.material.tintStrength+this.input.tintStrengthDelta,0,1);
        adjusted.push("material.tintStrength");
      }
    },this.validate.bind(this));
  }
}

class RestoreBoundedSceneRepairCommand implements ForgeCommand<ExperienceConfig,{sceneId:string;scene:SceneDefinition},{sceneId:string}> {
  readonly type="scene.restoreBoundedRepair";
  constructor(readonly input:{sceneId:string;scene:SceneDefinition}){}
  validate({state}:CommandContext<ExperienceConfig>):CommandError[] {
    return state.scenes.some((scene)=>scene.id===this.input.sceneId)
      ? []
      : [{code:"scene.notFound",message:"Scene "+this.input.sceneId+" was not found."}];
  }
  execute({state,transactionId}:CommandContext<ExperienceConfig>):CommandResult<ExperienceConfig,{sceneId:string}> {
    const index=state.scenes.findIndex((scene)=>scene.id===this.input.sceneId);
    if(index<0) return commandFailure(state,"scene.notFound","Scene "+this.input.sceneId+" was not found.");
    const current=structuredClone(state.scenes[index]);
    const next=structuredClone(state);
    next.scenes[index]=structuredClone(this.input.scene);
    let validated:ExperienceConfig;
    try { validated=parseExperience(next); }
    catch(error) { return commandFailure(state,"repair.restore.invalid",error instanceof Error ? error.message : String(error)); }
    return {
      ok:true,
      state:validated,
      output:{sceneId:this.input.sceneId},
      events:[forgeEvent("scene.boundedRepairRestored",{sceneId:this.input.sceneId},transactionId)],
      inverse:new RestoreBoundedSceneRepairCommand({sceneId:this.input.sceneId,scene:current}),
      affectedIds:[this.input.sceneId],
    };
  }
}

function mutateScene(
  state:ExperienceConfig,
  transactionId:string|undefined,
  sceneId:string,
  eventType:string,
  apply:(scene:SceneDefinition,adjusted:string[])=>void,
  validate:(context:CommandContext<ExperienceConfig>)=>CommandError[],
):CommandResult<ExperienceConfig,{sceneId:string;adjusted:string[]}> {
  const index=state.scenes.findIndex((scene)=>scene.id===sceneId);
  if(index<0) return commandFailure(state,"scene.notFound","Scene "+sceneId+" was not found.");
  const errors=validate({state,transactionId});
  if(errors.length) return {ok:false,state,errors};
  const previous=structuredClone(state.scenes[index]);
  const scene=structuredClone(previous);
  const adjusted:string[]=[];
  apply(scene,adjusted);
  if(!adjusted.length) return commandFailure(state,"repair.adjustment.noop","Bounded repair did not change the scene.");
  const next=structuredClone(state);
  next.scenes[index]=scene;
  let validated:ExperienceConfig;
  try { validated=parseExperience(next); }
  catch(error) { return commandFailure(state,"repair.adjustment.invalid",error instanceof Error ? error.message : String(error)); }
  const uniqueAdjusted=[...new Set(adjusted)];
  return {
    ok:true,
    state:validated,
    output:{sceneId,adjusted:uniqueAdjusted},
    events:[forgeEvent(eventType,{sceneId,adjusted:uniqueAdjusted},transactionId)],
    inverse:new RestoreBoundedSceneRepairCommand({sceneId,scene:previous}),
    affectedIds:[sceneId],
  };
}

function validateBoundedInput<T extends {sceneId:string}>(
  input:T,
  bounds:Record<string,readonly [number,number]>,
  codePrefix:string,
):CommandError[] {
  const errors:CommandError[]=[];
  let changes=0;
  for(const [key,range] of Object.entries(bounds)) {
    const value=(input as unknown as Record<string,unknown>)[key];
    if(value===undefined) continue;
    changes++;
    if(typeof value!=="number" || !Number.isFinite(value) || value<range[0] || value>range[1]) {
      errors.push({code:codePrefix+".outOfRange",message:key+" must be between "+range[0]+" and "+range[1]+".",path:key});
    }
  }
  if(!changes) errors.push({code:codePrefix+".empty",message:"Bounded repair must change at least one permitted field."});
  return errors;
}

function applyDelta<T extends object>(target:T,key:string,delta:number|undefined,min:number,max:number,adjusted:string[],label:string) {
  if(typeof delta!=="number" || delta===0) return;
  const record=target as Record<string,unknown>;
  const current=record[key];
  if(typeof current!=="number") return;
  record[key]=clamp(current+delta,min,max);
  adjusted.push(label);
}

function applyNullableMaterial(
  scene:SceneDefinition,
  key:"roughness"|"metalness"|"clearcoat",
  delta:number|undefined,
  adjusted:string[],
) {
  if(typeof delta!=="number" || delta===0) return;
  const current=scene.material[key];
  if(current===null) return;
  scene.material[key]=clamp(current+delta,0,1);
  adjusted.push("material."+key);
}

function clamp(value:number,min:number,max:number){ return Math.max(min,Math.min(max,value)); }
