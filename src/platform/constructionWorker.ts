import { parseExperience } from "@/src/lib/configSchema";
import { inferPromptIntelligence } from "@/src/platform/autonomy/promptIntelligence";
import { runDirectorIntelligence } from "@/src/platform/director-intelligence/orchestrator";
import { applyCreativeExecutionPlan, planCreativeExecution, type CreativeExecutionPlan } from "@/src/studio/creativeAgentPlan";
import type { AssetManifest } from "@/src/types/assets";
import type { ExperienceConfig, SceneDefinition } from "@/src/types/experience";

export type ConstructionStrategy="hierarchy-first"|"camera-structure"|"signature-budget";

export interface ConstructionCandidate {
  changed:boolean;
  experience:ExperienceConfig;
  strategy:ConstructionStrategy;
  summary:string[];
  blockers:string[];
  director:{
    verdict:string;
    hierarchyScore:number;
    territoryId:string;
    constructionMode:string;
    patternIds:string[];
  };
  plan:CreativeExecutionPlan;
}

export function buildConstructionCandidate(input:{
  experience:unknown;
  manifest:AssetManifest;
  context:string;
  strategy:ConstructionStrategy;
}):ConstructionCandidate {
  const experience=parseExperience(input.experience);
  const prompt=inferPromptIntelligence({
    prompt:input.context,
    projectName:experience.meta.name,
    sceneCount:experience.scenes.length,
    manifest:input.manifest,
  });
  const intelligence=runDirectorIntelligence({brief:prompt.brief});
  const variation=input.strategy==="hierarchy-first" ? 0 : input.strategy==="camera-structure" ? 1 : 2;
  const plan=planCreativeExecution({
    idea:input.context,
    experience,
    manifest:input.manifest,
    variation,
    preferredMedia:prompt.recommendedMedia,
  });
  const hierarchyBlockers=intelligence.report.hierarchy.blockers ?? [];
  const blockers=[
    ...(intelligence.report.verdict==="REJECT" ? ["Director rejected every current territory for this brief."] : []),
    ...hierarchyBlockers,
    ...(!plan.validation.valid ? plan.validation.errors : []),
  ];

  const director={
    verdict:intelligence.report.verdict,
    hierarchyScore:intelligence.report.hierarchy.overallScore,
    territoryId:intelligence.report.treatment.selectedTerritoryId,
    constructionMode:intelligence.constructionPlan.mode,
    patternIds:intelligence.construction.patternIds,
  };

  if(blockers.length) {
    return {
      changed:false,
      experience,
      strategy:input.strategy,
      summary:["Construction held because grounded hierarchy/asset requirements are unresolved.",...blockers].slice(0,8),
      blockers,
      director,
      plan,
    };
  }

  const buildable=plan.sceneMoves.filter((move)=>move.assetPlan.canBuildNow).map((move)=>move.sceneIndex);
  let candidate=applyCreativeExecutionPlan(experience,plan,buildable);
  candidate=parseExperience({
    ...candidate,
    scenes:candidate.scenes.map((scene,index)=>constructScene(scene,index,candidate.scenes.length,intelligence.report.treatment.emotionalArc,input.strategy,plan)),
  });

  const changed=JSON.stringify(candidate)!==JSON.stringify(experience);
  const signatureIndex=signatureSceneIndex(candidate.scenes.length,intelligence.report.treatment.emotionalArc);
  const summary=[
    `Director territory ${director.territoryId}; construction mode ${director.constructionMode}; hierarchy ${director.hierarchyScore}/10.`,
    `${buildable.length}/${plan.sceneMoves.length} planned scene moves were asset-ready and eligible for construction.`,
    input.strategy==="hierarchy-first"
      ? "Protected one signature peak and reduced decorative post pressure on lower-intensity chapters."
      : input.strategy==="camera-structure"
        ? "Re-authored camera interpolation semantics while preserving every existing camera endpoint and lens endpoint."
        : "Concentrated expensive presentation pressure around the Director-selected signature beat while preserving surrounding stillness.",
    `Signature scene index: ${signatureIndex}.`,
    changed ? "Candidate changed bounded production state and is ready for full verification." : "No bounded construction change remained after preserving authored targets.",
  ];

  return {changed,experience:candidate,strategy:input.strategy,summary,blockers:[],director,plan};
}

function constructScene(
  scene:SceneDefinition,
  index:number,
  sceneCount:number,
  beats:Array<{intensity:number}>,
  strategy:ConstructionStrategy,
  plan:CreativeExecutionPlan,
):SceneDefinition {
  const beat=beatForScene(index,sceneCount,beats);
  const signature=index===signatureSceneIndex(sceneCount,beats);
  const move=plan.sceneMoves.find((item)=>item.sceneIndex===index);
  let next=structuredClone(scene);

  if(strategy==="camera-structure" && move) {
    const path=pathForArchetype(move.archetype);
    next.camera={...next.camera,path};
    if(next.mobileCamera) next.mobileCamera={...next.mobileCamera,path:mobilePath(path)};
  }

  if(strategy==="hierarchy-first" || strategy==="signature-budget") {
    if(!signature && beat.intensity<=7) {
      next={
        ...next,
        post:{...next.post,bloom:Math.min(next.post.bloom,0.22),vignette:Math.min(next.post.vignette,0.32)},
      };
    }
    if(!signature && beat.intensity<=5 && next.world.exposure>1.18) {
      next={...next,world:{...next.world,exposure:Math.max(0.7,Math.min(next.world.exposure,1.18))}};
    }
  }

  return next;
}

function beatForScene<T>(index:number,sceneCount:number,beats:T[]):T & {intensity:number} {
  if(!beats.length) return {intensity:5} as T & {intensity:number};
  const denominator=Math.max(1,sceneCount-1);
  const beatIndex=Math.min(beats.length-1,Math.round((index/denominator)*(beats.length-1)));
  return beats[beatIndex] as T & {intensity:number};
}

function signatureSceneIndex(sceneCount:number,beats:Array<{intensity:number}>) {
  if(!beats.length || sceneCount<=1) return 0;
  let signatureBeat=0;
  for(let index=1;index<beats.length;index++) if(beats[index].intensity>beats[signatureBeat].intensity) signatureBeat=index;
  return Math.min(sceneCount-1,Math.round((signatureBeat/Math.max(1,beats.length-1))*(sceneCount-1)));
}

function pathForArchetype(archetype:string):SceneDefinition["camera"]["path"] {
  if(archetype==="threshold-passage") return "threshold";
  if(archetype==="architectural-build") return "crane";
  if(archetype==="product-hero") return "macro";
  if(archetype==="parallax-story") return "arc";
  return "dolly";
}

function mobilePath(path:SceneDefinition["camera"]["path"]):SceneDefinition["camera"]["path"] {
  if(path==="macro") return "dolly";
  if(path==="arc") return "dolly";
  return path;
}
