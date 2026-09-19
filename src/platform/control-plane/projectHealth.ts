import { analyzeAssetManifest } from "@/src/platform/assetIntelligence";
import type { InteractionGraph } from "@/src/lib/interactionGraph";
import type { AssetManifest } from "@/src/types/assets";
import type { ExperienceConfig } from "@/src/types/experience";

export type ProjectHealthStatus="ready"|"attention"|"blocked";
export type ProjectHealthSeverity="info"|"warning"|"blocker";
export type ProjectHealthDomain="structure"|"assets"|"motion"|"mobile"|"interaction"|"validation";

export interface ProjectHealthIssue {
  id:string;
  domain:ProjectHealthDomain;
  severity:ProjectHealthSeverity;
  title:string;
  detail:string;
  sceneIndex?:number;
  recommendedAction:string;
}

export interface ProjectHealthReport {
  version:1;
  status:ProjectHealthStatus;
  score:number;
  issues:ProjectHealthIssue[];
  metrics:{
    scenes:number;
    scenesWithMotion:number;
    scenesWithMobileCamera:number;
    registeredAssets:number;
    manifestHealth:number;
    interactionNodes:number;
    validationIssues:number;
  };
}

export function evaluateProjectHealth(input:{
  experience:ExperienceConfig;
  manifest:AssetManifest;
  graph:InteractionGraph;
  validationIssues?:string[];
}):ProjectHealthReport {
  const intelligence=analyzeAssetManifest(input.manifest);
  const issues:ProjectHealthIssue[]=[];

  for(const [index,message] of (input.validationIssues ?? []).entries()) {
    issues.push({
      id:"validation-"+index,domain:"validation",severity:"blocker",title:"Project validation failed",detail:message,
      recommendedAction:"Resolve the schema/configuration issue before broad polish or release work.",
    });
  }

  for(const finding of intelligence.findings.filter((item)=>item.severity!=="info").slice(0,8)) {
    issues.push({
      id:"asset-"+finding.id,domain:"assets",severity:finding.severity,title:finding.title,detail:finding.detail,
      recommendedAction:finding.recommendedAction,
    });
  }

  input.experience.scenes.forEach((scene,index)=>{
    if(scene.motionTracks.length===0) issues.push({
      id:"motion-"+scene.id,domain:"motion",severity:"warning",title:scene.label+" has no authored motion",
      detail:"The scene is structurally valid but has no coordinated scene-local motion.",
      sceneIndex:index,recommendedAction:"Compose one deliberate motion idea before adding micro-effects.",
    });
    if(!scene.mobileCamera) issues.push({
      id:"mobile-"+scene.id,domain:"mobile",severity:"warning",title:scene.label+" has no mobile camera",
      detail:"The desktop camera has no authored narrow-viewport translation.",
      sceneIndex:index,recommendedAction:"Author a mobile camera that preserves the defining shot rather than deleting it.",
    });
  });

  if(input.graph.nodes.length<=1) issues.push({
    id:"interaction-thin",domain:"interaction",severity:"info",title:"Interaction layer is minimal",
    detail:"The project has little or no authored stateful behavior.",
    recommendedAction:"Add interaction only where it strengthens the narrative or inspection task.",
  });

  const blockers=issues.filter((issue)=>issue.severity==="blocker").length;
  const warnings=issues.filter((issue)=>issue.severity==="warning").length;
  const infos=issues.filter((issue)=>issue.severity==="info").length;
  const score=Math.max(0,Math.min(100,100-blockers*24-warnings*7-infos*2));
  const status:ProjectHealthStatus=blockers ? "blocked" : warnings ? "attention" : "ready";
  const assetCount=input.manifest.models.length+input.manifest.textures.length+input.manifest.hdr.length+input.manifest.video.length;

  return {
    version:1,status,score,
    issues:issues.sort((a,b)=>severityWeight(b.severity)-severityWeight(a.severity) || a.id.localeCompare(b.id)),
    metrics:{
      scenes:input.experience.scenes.length,
      scenesWithMotion:input.experience.scenes.filter((scene)=>scene.motionTracks.length>0).length,
      scenesWithMobileCamera:input.experience.scenes.filter((scene)=>Boolean(scene.mobileCamera)).length,
      registeredAssets:assetCount,
      manifestHealth:intelligence.score,
      interactionNodes:input.graph.nodes.length,
      validationIssues:(input.validationIssues ?? []).length,
    },
  };
}

function severityWeight(value:ProjectHealthSeverity) {
  return value==="blocker" ? 3 : value==="warning" ? 2 : 1;
}
