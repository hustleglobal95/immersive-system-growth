import { z } from "zod";
import { parseExperience } from "@/src/lib/configSchema";
import { parseInteractionGraph, type InteractionGraph } from "@/src/lib/interactionGraph";
import { createMotionArchetype, type MotionArchetypeName } from "@/src/platform/motionArchetypes";
import { createCameraChoreography, type CameraChoreographyName } from "@/src/platform/cameraChoreography";
import type { ExperienceConfig, MotionTrack, SceneDefinition } from "@/src/types/experience";

const motionArchetypeSchema=z.enum(["editorial-reveal","parallax-story","threshold-passage","architectural-build","product-hero"]);
const cameraChoreographySchema=z.enum([
  "director-precision-push","director-pullback-reveal","director-parallax-truck","director-crane-reveal",
  "director-hero-orbit","director-s-curve","director-macro-approach","director-dolly-zoom",
]);

const sceneBlueprintSchema=z.object({
  sourceSceneId:z.string().min(1).max(160),
  label:z.string().min(1).max(80),
  role:z.enum(["establish","build","reveal","threshold","proof","resolve"]),
  archetype:motionArchetypeSchema,
  cameraChoreography:cameraChoreographySchema,
  intensity:z.number().int().min(1).max(10),
}).strict();

const interactionRecipeSchema=z.discriminatedUnion("kind",[
  z.object({
    kind:z.literal("scene-sequence"),
    sceneSlot:z.number().int().min(0).max(7),
  }).strict(),
  z.object({
    kind:z.literal("scene-shader"),
    sceneSlot:z.number().int().min(0).max(7),
    target:z.string().regex(/^[a-zA-Z0-9_.:-]{1,160}$/),
    parameter:z.string().regex(/^[a-zA-Z0-9_.:-]{1,160}$/),
    value:z.union([z.number().finite(),z.boolean(),z.string().max(120)]),
  }).strict(),
  z.object({
    kind:z.literal("pointer-orbit"),
    target:z.string().regex(/^[a-zA-Z0-9_.:-]{1,160}$/),
    sensitivity:z.number().min(.0005).max(.05).default(.008),
  }).strict(),
  z.object({
    kind:z.literal("click-sequence"),
    target:z.string().regex(/^[a-zA-Z0-9_.:-]{1,160}$/),
    sceneSlot:z.number().int().min(0).max(7),
  }).strict(),
  z.object({
    kind:z.literal("hover-class"),
    target:z.string().regex(/^[a-zA-Z0-9_.:-]{1,160}$/),
    className:z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_-]{0,79}$/),
  }).strict(),
]);

export const creativeRebuildPlanSchema=z.object({
  version:z.literal(1),
  thesis:z.string().min(12).max(1600),
  failureDiagnosis:z.string().min(12).max(1600),
  structuralReason:z.string().min(12).max(1600),
  sceneBlueprints:z.array(sceneBlueprintSchema).min(3).max(8),
  interactionRecipes:z.array(interactionRecipeSchema).max(12).default([]),
  assetGaps:z.array(z.object({
    name:z.string().min(1).max(140),
    type:z.enum(["model","image","video","texture","hdri","audio","ui"]),
    reason:z.string().min(8).max(800),
    critical:z.boolean(),
  }).strict()).max(16).default([]),
}).strict();

export type CreativeRebuildPlan=z.infer<typeof creativeRebuildPlanSchema>;

export interface CreativeRebuildResult {
  experience:ExperienceConfig;
  interactionGraph:InteractionGraph;
  summary:string[];
  blockers:string[];
}

export function applyCreativeRebuildPlan(input:{
  experience:ExperienceConfig;
  interactionGraph:InteractionGraph;
  plan:CreativeRebuildPlan;
}):CreativeRebuildResult {
  const experience=parseExperience(input.experience);
  const plan=creativeRebuildPlanSchema.parse(input.plan);
  const sourceById=new Map(experience.scenes.map((scene)=>[scene.id,scene]));
  const missing=plan.sceneBlueprints.filter((blueprint)=>!sourceById.has(blueprint.sourceSceneId)).map((blueprint)=>blueprint.sourceSceneId);
  const criticalAssetGaps=plan.assetGaps.filter((gap)=>gap.critical);
  const blockers=[
    ...missing.map((id)=>"Concept Reset referenced unknown source scene "+id+"."),
    ...criticalAssetGaps.map((gap)=>"Critical asset required before rebuild: "+gap.name+" — "+gap.reason),
  ];
  if(blockers.length) return {experience,interactionGraph:parseInteractionGraph(input.interactionGraph),summary:["Concept Reset held because required source state or assets are missing."],blockers};

  const usedIds=new Set<string>();
  const sourceToFirstNewId=new Map<string,string>();
  const scenes=plan.sceneBlueprints.map((blueprint,index)=>{
    const source=structuredClone(sourceById.get(blueprint.sourceSceneId)!);
    const id=uniqueSceneId(blueprint.sourceSceneId,index,usedIds);
    if(!sourceToFirstNewId.has(blueprint.sourceSceneId)) sourceToFirstNewId.set(blueprint.sourceSceneId,id);
    const directed:SceneDefinition={
      ...source,
      id,
      label:blueprint.label,
      range:[index/plan.sceneBlueprints.length,(index+1)/plan.sceneBlueprints.length],
      motionTracks:[],
      world:{
        ...source.world,
        key:clamp(source.world.key*intensityMultiplier(blueprint.intensity,.86,1.12),0,50),
        rim:clamp(source.world.rim*intensityMultiplier(blueprint.intensity,.82,1.18),0,50),
        exposure:clamp(source.world.exposure*intensityMultiplier(blueprint.intensity,.94,1.06),.25,3),
      },
      post:{
        ...source.post,
        bloom:Math.min(source.post.bloom,blueprint.intensity>=9?.32:blueprint.intensity<=4?.18:.26),
        vignette:Math.min(source.post.vignette,blueprint.intensity>=9?.38:blueprint.intensity<=4?.22:.3),
      },
    };
    return directed;
  });

  let rebuilt=parseExperience({
    ...experience,
    scenes,
    hotspots:experience.hotspots.flatMap((hotspot)=>{
      const mapped=sourceToFirstNewId.get(hotspot.sceneId);
      return mapped ? [{...hotspot,sceneId:mapped}] : [];
    }),
  });

  rebuilt=parseExperience({
    ...rebuilt,
    scenes:rebuilt.scenes.map((scene,index)=>{
      const blueprint=plan.sceneBlueprints[index];
      const archetype=createMotionArchetype(blueprint.archetype as MotionArchetypeName,rebuilt,index);
      const camera=createCameraChoreography(blueprint.cameraChoreography as CameraChoreographyName,rebuilt,index);
      return {...scene,motionTracks:mergeTracks([...archetype,...camera])};
    }),
  });

  const interactionGraph=buildInteractionGraph(rebuilt,plan);
  return {
    experience:rebuilt,
    interactionGraph,
    blockers:[],
    summary:[
      "Concept Reset replaced the previous scene topology with "+rebuilt.scenes.length+" directed scenes.",
      "Creative thesis: "+plan.thesis,
      "Failure diagnosis: "+plan.failureDiagnosis,
      "Structural reason: "+plan.structuralReason,
      plan.interactionRecipes.length+" interaction recipe"+(plan.interactionRecipes.length===1?"":"s")+" compiled into a new typed interaction graph.",
      plan.assetGaps.length
        ? plan.assetGaps.length+" non-blocking asset gap"+(plan.assetGaps.length===1?"":"s")+" remain visible for production."
        : "No new critical asset dependency was declared.",
    ],
  };
}

function buildInteractionGraph(experience:ExperienceConfig,plan:CreativeRebuildPlan):InteractionGraph {
  const nodes:InteractionGraph["nodes"]=[];
  const edges:InteractionGraph["edges"]=[];
  const mobileSubstitutions:InteractionGraph["mobileSubstitutions"]=[];
  let y=60;
  let serial=1;
  const connect=(trigger:InteractionGraph["nodes"][number],action:InteractionGraph["nodes"][number])=>{
    nodes.push(trigger,action);
    edges.push({id:"concept-edge-"+serial++,from:trigger.id,to:action.id,branch:"always",priority:0});
    y+=150;
  };

  for(const recipe of plan.interactionRecipes) {
    if(recipe.kind==="scene-sequence") {
      const scene=experience.scenes[recipe.sceneSlot];
      if(!scene) continue;
      connect(
        {id:"concept-trigger-"+serial,label:"Enter "+scene.label,kind:"trigger",position:{x:40,y},event:"scene-enter",sceneId:scene.id,states:["default"]},
        {id:"concept-action-"+serial,label:"Play "+scene.label,kind:"action",position:{x:340,y},action:{type:"sequence",name:scene.id,command:"play",loop:false,release:false}},
      );
    } else if(recipe.kind==="scene-shader") {
      const scene=experience.scenes[recipe.sceneSlot];
      if(!scene) continue;
      connect(
        {id:"concept-trigger-"+serial,label:"Enter "+scene.label,kind:"trigger",position:{x:40,y},event:"scene-enter",sceneId:scene.id,states:["default"]},
        {id:"concept-action-"+serial,label:"Direct shader "+recipe.parameter,kind:"action",position:{x:340,y},action:{type:"shader",target:recipe.target,parameter:recipe.parameter,value:recipe.value,easing:"smooth"}},
      );
    } else if(recipe.kind==="pointer-orbit") {
      connect(
        {id:"concept-trigger-"+serial,label:"Pointer over "+recipe.target,kind:"trigger",position:{x:40,y},event:"pointer",states:["default"]},
        {id:"concept-action-"+serial,label:"Enable orbit "+recipe.target,kind:"action",position:{x:340,y},action:{type:"orbit",target:recipe.target,command:"enable",sensitivity:recipe.sensitivity}},
      );
    } else if(recipe.kind==="click-sequence") {
      const scene=experience.scenes[recipe.sceneSlot];
      if(!scene) continue;
      connect(
        {id:"concept-trigger-"+serial,label:"Activate "+recipe.target,kind:"trigger",position:{x:40,y},event:"click",target:recipe.target,states:["default"]},
        {id:"concept-action-"+serial,label:"Play "+scene.label,kind:"action",position:{x:340,y},action:{type:"sequence",name:scene.id,command:"play",loop:false,release:false}},
      );
    } else {
      const addId="concept-trigger-"+serial;
      const addActionId="concept-action-"+serial;
      connect(
        {id:addId,label:"Reveal "+recipe.target,kind:"trigger",position:{x:40,y},event:"hover-enter",target:recipe.target,states:["default"]},
        {id:addActionId,label:"Add "+recipe.className,kind:"action",position:{x:340,y},action:{type:"class",target:recipe.target,className:recipe.className,mode:"add"}},
      );
      const removeId="concept-trigger-"+serial;
      const removeActionId="concept-action-"+serial;
      connect(
        {id:removeId,label:"Reset "+recipe.target,kind:"trigger",position:{x:40,y},event:"hover-leave",target:recipe.target,states:["default"]},
        {id:removeActionId,label:"Remove "+recipe.className,kind:"action",position:{x:340,y},action:{type:"class",target:recipe.target,className:recipe.className,mode:"remove"}},
      );
      mobileSubstitutions.push({from:"hover-enter",to:"click",target:recipe.target});
    }
  }

  if(!nodes.length) {
    connect(
      {id:"concept-trigger-1",label:"Enter rebuilt experience",kind:"trigger",position:{x:40,y},event:"scene-enter",sceneId:experience.scenes[0].id,states:["default"]},
      {id:"concept-action-1",label:"Emit rebuild ready",kind:"action",position:{x:340,y},action:{type:"emit",name:"concept-reset-ready",payload:{}}},
    );
  }

  return parseInteractionGraph({
    version:1,
    id:"concept-reset-interactions",
    initialState:"default",
    states:["default"],
    variables:{},
    nodes,
    edges,
    mobileSubstitutions,
  });
}

function mergeTracks(tracks:MotionTrack[]) {
  const seen=new Set<string>();
  const result:MotionTrack[]=[];
  for(const track of [...tracks].reverse()) {
    const key=track.viewport+":"+track.target;
    if(seen.has(key)) continue;
    seen.add(key);
    result.unshift(track);
  }
  return result;
}

function intensityMultiplier(intensity:number,min:number,max:number) {
  return min+(max-min)*((intensity-1)/9);
}
function clamp(value:number,min:number,max:number){ return Math.max(min,Math.min(max,value)); }
function slug(value:string){ return value.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,60); }
function uniqueSceneId(base:string,index:number,used:Set<string>) {
  const root=base||"scene-"+(index+1);
  let value=root;
  let counter=2;
  while(used.has(value)) value=root+"-"+counter++;
  used.add(value);
  return value;
}
