import { parseExperience } from "@/src/lib/configSchema";
import type { ForgeCommand, CommandContext, CommandError, CommandResult } from "@/src/core/commands/command";
import { commandFailure } from "@/src/core/commands/command";
import { forgeEvent } from "@/src/core/events/eventBus";
import type { ExperienceConfig, SceneDefinition } from "@/src/types/experience";

export interface ScenePresentationAdjustment {
  sceneId: string;
  exposureDelta?: number;
  ambientDelta?: number;
  keyDelta?: number;
  rimDelta?: number;
  bloomDelta?: number;
  vignetteDelta?: number;
  heroScaleMultiplier?: number;
  heroXDelta?: number;
  heroYDelta?: number;
  mediaXDelta?: number;
  mediaYDelta?: number;
  mobileMediaXDelta?: number;
  mobileMediaYDelta?: number;
}

const bounds = {
  exposureDelta: [-0.4, 0.4],
  ambientDelta: [-2, 2],
  keyDelta: [-5, 5],
  rimDelta: [-5, 5],
  bloomDelta: [-0.5, 0.5],
  vignetteDelta: [-0.3, 0.3],
  heroScaleMultiplier: [0.75, 1.25],
  heroXDelta: [-1.5, 1.5],
  heroYDelta: [-1.5, 1.5],
  mediaXDelta: [-20, 20],
  mediaYDelta: [-20, 20],
  mobileMediaXDelta: [-20, 20],
  mobileMediaYDelta: [-20, 20],
} as const;

export class AdjustScenePresentationCommand implements ForgeCommand<
  ExperienceConfig,
  ScenePresentationAdjustment,
  { sceneId: string; adjusted: string[] }
> {
  readonly type = "scene.adjustPresentation";
  constructor(readonly input: ScenePresentationAdjustment) {}

  validate({ state }: CommandContext<ExperienceConfig>): CommandError[] {
    const errors: CommandError[] = [];
    if (!state.scenes.some((scene) => scene.id === this.input.sceneId)) {
      errors.push({ code:"scene.notFound", message:"Scene " + this.input.sceneId + " was not found." });
      return errors;
    }
    for (const [key, range] of Object.entries(bounds)) {
      const value = this.input[key as keyof ScenePresentationAdjustment];
      if (typeof value !== "number") continue;
      if (!Number.isFinite(value) || value < range[0] || value > range[1]) {
        errors.push({ code:"repair.adjustment.outOfRange", message:key + " must be between " + range[0] + " and " + range[1] + ".", path:key });
      }
    }
    if (!Object.keys(this.input).some((key) => key !== "sceneId")) {
      errors.push({ code:"repair.adjustment.empty", message:"Presentation repair must change at least one bounded field." });
    }
    return errors;
  }

  execute({ state, transactionId }: CommandContext<ExperienceConfig>): CommandResult<ExperienceConfig, { sceneId: string; adjusted: string[] }> {
    const index = state.scenes.findIndex((scene) => scene.id === this.input.sceneId);
    if (index < 0) return commandFailure(state,"scene.notFound","Scene " + this.input.sceneId + " was not found.");
    const errors = this.validate({ state, transactionId });
    if (errors.length) return { ok:false, state, errors };

    const previous = structuredClone(state.scenes[index]);
    const scene = structuredClone(previous);
    const adjusted:string[] = [];

    applyNumber(scene.world,"exposure",this.input.exposureDelta,0.25,3,adjusted);
    applyNumber(scene.world,"ambient",this.input.ambientDelta,0,20,adjusted);
    applyNumber(scene.world,"key",this.input.keyDelta,0,50,adjusted);
    applyNumber(scene.world,"rim",this.input.rimDelta,0,50,adjusted);
    applyNumber(scene.post,"bloom",this.input.bloomDelta,0,2,adjusted);
    applyNumber(scene.post,"vignette",this.input.vignetteDelta,0,1,adjusted);

    if (typeof this.input.heroScaleMultiplier === "number") {
      scene.hero.from.scale = clamp(scene.hero.from.scale * this.input.heroScaleMultiplier,0.001,100);
      scene.hero.to.scale = clamp(scene.hero.to.scale * this.input.heroScaleMultiplier,0.001,100);
      adjusted.push("hero.scale");
    }
    if (typeof this.input.heroXDelta === "number" || typeof this.input.heroYDelta === "number") {
      const dx = this.input.heroXDelta ?? 0;
      const dy = this.input.heroYDelta ?? 0;
      scene.hero.from.position = [scene.hero.from.position[0] + dx, scene.hero.from.position[1] + dy, scene.hero.from.position[2]];
      scene.hero.to.position = [scene.hero.to.position[0] + dx, scene.hero.to.position[1] + dy, scene.hero.to.position[2]];
      adjusted.push("hero.position");
    }
    if (scene.media) {
      const dx = this.input.mediaXDelta ?? 0;
      const dy = this.input.mediaYDelta ?? 0;
      if (dx || dy) {
        scene.media.position = [clamp(scene.media.position[0] + dx,0,100),clamp(scene.media.position[1] + dy,0,100)];
        adjusted.push("media.position");
      }
      const mdx = this.input.mobileMediaXDelta ?? 0;
      const mdy = this.input.mobileMediaYDelta ?? 0;
      if (mdx || mdy) {
        scene.media.mobilePosition = [clamp(scene.media.mobilePosition[0] + mdx,0,100),clamp(scene.media.mobilePosition[1] + mdy,0,100)];
        adjusted.push("media.mobilePosition");
      }
    }

    const next = structuredClone(state);
    next.scenes[index] = scene;
    let validated:ExperienceConfig;
    try {
      validated = parseExperience(next);
    } catch (error) {
      return commandFailure(state,"repair.adjustment.invalid",error instanceof Error ? error.message : String(error));
    }
    return {
      ok:true,
      state:validated,
      output:{ sceneId:this.input.sceneId, adjusted:[...new Set(adjusted)] },
      events:[forgeEvent("scene.presentationAdjusted",{ sceneId:this.input.sceneId, adjusted:[...new Set(adjusted)] },transactionId)],
      inverse:new RestoreScenePresentationCommand({ sceneId:this.input.sceneId, scene:previous }),
      affectedIds:[this.input.sceneId],
    };
  }
}

class RestoreScenePresentationCommand implements ForgeCommand<
  ExperienceConfig,
  { sceneId:string; scene:SceneDefinition },
  { sceneId:string }
> {
  readonly type = "scene.restorePresentation";
  constructor(readonly input:{ sceneId:string; scene:SceneDefinition }) {}
  validate({ state }:CommandContext<ExperienceConfig>):CommandError[] {
    return state.scenes.some((scene) => scene.id === this.input.sceneId) ? [] : [{ code:"scene.notFound", message:"Scene " + this.input.sceneId + " was not found." }];
  }
  execute({ state,transactionId }:CommandContext<ExperienceConfig>):CommandResult<ExperienceConfig,{ sceneId:string }> {
    const index=state.scenes.findIndex((scene)=>scene.id===this.input.sceneId);
    if(index<0) return commandFailure(state,"scene.notFound","Scene " + this.input.sceneId + " was not found.");
    const current=structuredClone(state.scenes[index]);
    const next=structuredClone(state);
    next.scenes[index]=structuredClone(this.input.scene);
    const validated=parseExperience(next);
    return {
      ok:true,
      state:validated,
      output:{ sceneId:this.input.sceneId },
      events:[forgeEvent("scene.presentationRestored",{ sceneId:this.input.sceneId },transactionId)],
      inverse:new RestoreScenePresentationCommand({ sceneId:this.input.sceneId,scene:current }),
      affectedIds:[this.input.sceneId],
    };
  }
}

function applyNumber<T extends Record<string,number>>(target:T,key:keyof T,delta:number|undefined,min:number,max:number,adjusted:string[]) {
  if(typeof delta!=="number" || delta===0) return;
  target[key]=clamp(target[key]+delta,min,max) as T[keyof T];
  adjusted.push(String(key));
}
function clamp(value:number,min:number,max:number){ return Math.max(min,Math.min(max,value)); }
