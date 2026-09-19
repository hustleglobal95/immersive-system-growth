import { capabilityById } from "@/src/platform/control-plane/capabilityRegistry";
import type { MissionContract } from "@/src/platform/control-plane/mission";
import type { ProjectHealthReport } from "@/src/platform/control-plane/projectHealth";
import type { ForgeSelection } from "@/src/platform/control-plane/selectionContext";

export type MissionStage="direction"|"construction"|"translation"|"polish"|"approval";
export type MissionAutonomy="auto"|"preview"|"human";
export type MissionStepStatus="ready"|"blocked"|"complete";

export interface MissionPlanStep {
  id:string;
  stage:MissionStage;
  label:string;
  reason:string;
  capabilityId?:string;
  target?:ForgeSelection;
  dependencies:string[];
  autonomy:MissionAutonomy;
  status:MissionStepStatus;
  leverage:number;
}

export interface MissionPlanGraph {
  version:1;
  missionId:string;
  steps:MissionPlanStep[];
  ready:string[];
  blocked:string[];
  autonomousCount:number;
  previewCount:number;
  humanDecisionCount:number;
}

export function buildMissionPlan(input:{
  mission:MissionContract;
  health:ProjectHealthReport;
  completedDecisionIds?:string[];
}):MissionPlanGraph {
  const completedDecisions=new Set(input.completedDecisionIds ?? []);
  const steps:MissionPlanStep[]=[];
  const push=(step:MissionPlanStep)=>{steps.push(step);};

  push({
    id:"creative-world",
    stage:"direction",
    label:"Lock the visual world",
    reason:"Choose one coherent creative territory before detailed production compounds.",
    capabilityId:"environment.art-direct",
    target:{kind:"environment",index:0},
    dependencies:[],
    autonomy:"human",
    status:"ready",
    leverage:100,
  });

  const motionIssues=input.health.issues.filter((issue)=>issue.domain==="motion" && typeof issue.sceneIndex==="number");
  for(const issue of motionIssues) {
    const index=issue.sceneIndex!;
    push({
      id:`motion-${index}`,
      stage:"construction",
      label:`Compose scene ${index+1} motion`,
      reason:issue.detail,
      capabilityId:"scene.compose-motion",
      target:{kind:"scene",index},
      dependencies:["creative-world"],
      autonomy:"auto",
      status:"blocked",
      leverage:86,
    });
  }

  const mobileIssues=input.health.issues.filter((issue)=>issue.domain==="mobile" && typeof issue.sceneIndex==="number");
  for(const issue of mobileIssues) {
    const index=issue.sceneIndex!;
    push({
      id:`mobile-${index}`,
      stage:"translation",
      label:`Translate scene ${index+1} for mobile`,
      reason:issue.detail,
      capabilityId:"scene.fix-mobile",
      target:{kind:"scene",index},
      dependencies:motionIssues.some((item)=>item.sceneIndex===index) ? [`motion-${index}`] : ["creative-world"],
      autonomy:"preview",
      status:"blocked",
      leverage:80,
    });
  }

  const assetIssue=input.health.issues.find((issue)=>issue.domain==="assets");
  if(assetIssue && input.health.metrics.registeredAssets>0) {
    push({
      id:"asset-quality",
      stage:"construction",
      label:"Resolve asset pressure",
      reason:assetIssue.detail,
      capabilityId:"asset.improve",
      target:{kind:"asset",index:0,sceneIndex:0},
      dependencies:["creative-world"],
      autonomy:assetIssue.severity==="blocker" ? "preview" : "auto",
      status:"blocked",
      leverage:assetIssue.severity==="blocker" ? 96 : 72,
    });
  }

  const validationBlock=input.health.issues.some((issue)=>issue.domain==="validation" && issue.severity==="blocker");
  if(validationBlock) {
    push({
      id:"validation-gate",
      stage:"construction",
      label:"Resolve project validation",
      reason:"Schema or configuration blockers must be cleared before Forge can safely compound production changes.",
      dependencies:[],
      autonomy:"human",
      status:"ready",
      leverage:110,
    });
  }

  push({
    id:"project-polish",
    stage:"polish",
    label:"Run project-wide perceptual polish",
    reason:"After construction and mobile translation, compare a bounded visual candidate instead of polishing blindly.",
    capabilityId:"scene.polish",
    target:{kind:"scene",index:0},
    dependencies:[
      "creative-world",
      ...motionIssues.map((issue)=>`motion-${issue.sceneIndex}`),
      ...mobileIssues.map((issue)=>`mobile-${issue.sceneIndex}`),
    ],
    autonomy:"preview",
    status:"blocked",
    leverage:78,
  });

  push({
    id:"signature-moment",
    stage:"approval",
    label:"Approve the signature moment",
    reason:input.mission.signatureMoment,
    dependencies:["project-polish"],
    autonomy:"human",
    status:"blocked",
    leverage:98,
  });

  push({
    id:"final-approval",
    stage:"approval",
    label:"Final creative approval",
    reason:"Project Health can prove production readiness; final taste and release authority remain human.",
    dependencies:["signature-moment"],
    autonomy:"human",
    status:"blocked",
    leverage:100,
  });

  const byId=new Map(steps.map((step)=>[step.id,step]));
  const healthComplete=(step:MissionPlanStep)=>{
    if(completedDecisions.has(step.id)) return true;
    if(step.id.startsWith("motion-")) {
      const sceneIndex=Number(step.id.slice("motion-".length));
      return !input.health.issues.some((issue)=>issue.domain==="motion" && issue.sceneIndex===sceneIndex);
    }
    if(step.id.startsWith("mobile-")) {
      const sceneIndex=Number(step.id.slice("mobile-".length));
      return !input.health.issues.some((issue)=>issue.domain==="mobile" && issue.sceneIndex===sceneIndex);
    }
    if(step.id==="asset-quality") return !input.health.issues.some((issue)=>issue.domain==="assets" && issue.severity!=="info");
    if(step.id==="validation-gate") return !validationBlock;
    return false;
  };

  for(const step of steps) {
    if(healthComplete(step)) {
      step.status="complete";
      continue;
    }
    if(step.capabilityId && !capabilityById(step.capabilityId)) {
      step.status="blocked";
      continue;
    }
    const dependenciesComplete=step.dependencies.every((id)=>{
      const dependency=byId.get(id);
      return dependency?.status==="complete";
    });
    step.status=dependenciesComplete ? "ready" : "blocked";
  }

  return {
    version:1,
    missionId:input.mission.id,
    steps,
    ready:steps.filter((step)=>step.status==="ready").map((step)=>step.id),
    blocked:steps.filter((step)=>step.status==="blocked").map((step)=>step.id),
    autonomousCount:steps.filter((step)=>step.autonomy==="auto" && step.status!=="complete").length,
    previewCount:steps.filter((step)=>step.autonomy==="preview" && step.status!=="complete").length,
    humanDecisionCount:steps.filter((step)=>step.autonomy==="human" && step.status!=="complete").length,
  };
}

export function nextMissionStep(plan:MissionPlanGraph) {
  return [...plan.steps]
    .filter((step)=>step.status==="ready")
    .sort((a,b)=>b.leverage-a.leverage || a.id.localeCompare(b.id))[0] ?? null;
}
