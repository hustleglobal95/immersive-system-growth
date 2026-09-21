import { createExperienceEngine } from "@/src/platform/createExperienceEngine";
import type { CameraChoreographyName } from "@/src/platform/cameraChoreography";
import type { MotionArchetypeName } from "@/src/platform/motionArchetypes";
import type { ScenePresentationAdjustment } from "@/src/platform/commands/presentationCommands";
import type {
  SceneLightingRepair,
  SceneSubjectFramingRepair,
  SceneMediaFramingRepair,
  SceneMaterialSurfaceRepair,
} from "@/src/platform/commands/repairCommands";
import type { RenderReviewPlan, VisualCriticFinding } from "@/src/platform/autonomy/visualReview";
import type { ExperienceConfig, SceneDefinition } from "@/src/types/experience";
import { routeVisualFinding } from "@/src/platform/agentic/capabilityRouter";

export type VisualRepairCommand =
  | { type:"scene.adjustPresentation"; input:ScenePresentationAdjustment; findingIds:string[]; rationale:string }
  | { type:"scene.adjustLighting"; input:SceneLightingRepair; findingIds:string[]; rationale:string }
  | { type:"scene.adjustSubjectFraming"; input:SceneSubjectFramingRepair; findingIds:string[]; rationale:string }
  | { type:"scene.adjustMediaFraming"; input:SceneMediaFramingRepair; findingIds:string[]; rationale:string }
  | { type:"scene.adjustMaterialSurface"; input:SceneMaterialSurfaceRepair; findingIds:string[]; rationale:string }
  | { type:"motion.applyArchetype"; input:{sceneId:string;archetype:MotionArchetypeName}; findingIds:string[]; rationale:string }
  | { type:"camera.applyChoreography"; input:{sceneId:string;choreography:CameraChoreographyName}; findingIds:string[]; rationale:string };

export interface VisualRepairPlan {
  version: 1;
  commands: VisualRepairCommand[];
  affectedSceneIds: string[];
  unresolved: VisualCriticFinding[];
  blockers: string[];
  summary: string[];
}

export interface VisualRepairResult {
  ok: boolean;
  candidate: ExperienceConfig;
  errors: string[];
  revisionBefore: number;
  revisionAfter: number;
  fingerprintBefore: string;
  fingerprintAfter: string;
}

type FindingWithId = VisualCriticFinding & { id?:string };
type RepairBucket<T>={patch:T;findings:string[];rationale:string[]};

export function planVisualRepairs(input:{
  findings: FindingWithId[];
  reviewPlan: RenderReviewPlan;
  experience: ExperienceConfig;
  minConfidence?: number;
}):VisualRepairPlan {
  const minConfidence=input.minConfidence ?? 0.6;
  const captureScene=new Map(input.reviewPlan.captures.map((capture)=>[capture.id,capture.sceneId]));
  const scenes=new Map(input.experience.scenes.map((scene)=>[scene.id,scene]));
  const lighting=new Map<string,RepairBucket<SceneLightingRepair>>();
  const subject=new Map<string,RepairBucket<SceneSubjectFramingRepair>>();
  const media=new Map<string,RepairBucket<SceneMediaFramingRepair>>();
  const material=new Map<string,RepairBucket<SceneMaterialSurfaceRepair>>();
  const camera=new Map<string,{choreography:CameraChoreographyName;finding:string;rationale:string}>();
  const motion=new Map<string,{archetype:MotionArchetypeName;finding:string;rationale:string}>();
  const unresolved:VisualCriticFinding[]=[];

  input.findings.forEach((finding,index)=>{
    const findingId=finding.id ?? "finding-"+String(index+1).padStart(3,"0");
    const sceneId=captureScene.get(finding.captureId);
    const scene=sceneId ? scenes.get(sceneId) : undefined;
    if(!sceneId || !scene) {
      unresolved.push(finding);
      return;
    }
    if(finding.severity==="minor" || finding.severity==="advisory" || finding.confidence<minConfidence) {
      unresolved.push(finding);
      return;
    }

    const route=routeVisualFinding(finding);
    const text=[finding.finding,finding.repair,...finding.evidence,...finding.affectedSystems].join(" ").toLowerCase();
    if(route.disposition==="human-review" || route.disposition==="engineering-escalation" || route.allowedRepairCommands.length===0) {
      unresolved.push(finding);
      return;
    }

    let handled=false;
    const rationale=finding.repair || finding.finding;

    if(route.allowedRepairCommands.includes("camera.applyChoreography")
      && (finding.critic==="camera" || finding.affectedSystems.some((item)=>/camera|lens|framing/i.test(item)))) {
      camera.set(sceneId,{choreography:chooseCamera(text),finding:findingId,rationale});
      handled=true;
    }

    if(route.allowedRepairCommands.includes("motion.applyArchetype") && (
      finding.critic==="motion"
      || finding.critic==="continuity"
      || (finding.critic==="typography" && /timing|arriv|settle|reveal|copy/i.test(text))
      || finding.affectedSystems.some((item)=>/motion|transition|copy timing/i.test(item))
    )) {
      motion.set(sceneId,{archetype:chooseMotion(text),finding:findingId,rationale});
      handled=true;
    }

    if(route.allowedRepairCommands.includes("scene.adjustLighting")) {
      const patch=lightingPatch(sceneId,text,finding.severity);
      if(hasRepairFields(patch)) {
        mergeBucket(lighting,sceneId,patch,findingId,rationale,(a,b)=>mergeBounded(a,b,lightingMergeBounds));
        handled=true;
      }
    }

    if(route.allowedRepairCommands.includes("scene.adjustSubjectFraming")) {
      const patch=subjectPatch(sceneId,text,finding.severity);
      if(hasRepairFields(patch)) {
        mergeBucket(subject,sceneId,patch,findingId,rationale,mergeSubject);
        handled=true;
      }
    }

    if(route.allowedRepairCommands.includes("scene.adjustMediaFraming")) {
      const patch=mediaPatch(sceneId,text,finding.severity);
      if(scene.media && hasRepairFields(patch)) {
        mergeBucket(media,sceneId,patch,findingId,rationale,(a,b)=>mergeBounded(a,b,mediaMergeBounds));
        handled=true;
      }
    }

    if(route.allowedRepairCommands.includes("scene.adjustMaterialSurface")) {
      const patch=materialPatch(sceneId,scene,text,finding.severity);
      if(hasRepairFields(patch)) {
        mergeBucket(material,sceneId,patch,findingId,rationale,(a,b)=>mergeBounded(a,b,materialMergeBounds));
        handled=true;
      }
    }

    if(!handled) unresolved.push(finding);
  });

  const commands:VisualRepairCommand[]=[];
  pushBuckets(commands,lighting,"scene.adjustLighting");
  pushBuckets(commands,subject,"scene.adjustSubjectFraming");
  pushBuckets(commands,media,"scene.adjustMediaFraming");
  pushBuckets(commands,material,"scene.adjustMaterialSurface");

  for(const [sceneId,item] of camera) commands.push({
    type:"camera.applyChoreography",
    input:{sceneId,choreography:item.choreography},
    findingIds:[item.finding],
    rationale:item.rationale,
  });
  for(const [sceneId,item] of motion) commands.push({
    type:"motion.applyArchetype",
    input:{sceneId,archetype:item.archetype},
    findingIds:[item.finding],
    rationale:item.rationale,
  });

  const unresolvedBlockers=unresolved.filter((finding)=>finding.severity==="blocker");
  return {
    version:1,
    commands,
    affectedSceneIds:unique(commands.map((command)=>command.input.sceneId)),
    unresolved,
    blockers:unresolvedBlockers.map((finding)=>finding.finding),
    summary:[
      commands.length+" bounded repair command"+(commands.length===1?"":"s")+" proposed.",
      lighting.size+" lighting repair"+(lighting.size===1?"":"s")+".",
      subject.size+" subject-framing repair"+(subject.size===1?"":"s")+".",
      media.size+" media-framing repair"+(media.size===1?"":"s")+".",
      material.size+" authored-material repair"+(material.size===1?"":"s")+".",
      camera.size+" camera choreography repair"+(camera.size===1?"":"s")+".",
      motion.size+" coordinated motion repair"+(motion.size===1?"":"s")+".",
      unresolved.length+" finding"+(unresolved.length===1?"":"s")+" left for review rather than guessed.",
    ],
  };
}

export function applyVisualRepairPlan(experience:ExperienceConfig,plan:VisualRepairPlan):VisualRepairResult {
  if(plan.blockers.length) {
    return {
      ok:false,
      candidate:structuredClone(experience),
      errors:["Unresolved visual blocker: "+plan.blockers.join("; ")],
      revisionBefore:0,
      revisionAfter:0,
      fingerprintBefore:"",
      fingerprintAfter:"",
    };
  }
  if(!plan.commands.length) {
    return {
      ok:false,
      candidate:structuredClone(experience),
      errors:["Visual Director produced no safe repair command."],
      revisionBefore:0,
      revisionAfter:0,
      fingerprintBefore:"",
      fingerprintAfter:"",
    };
  }
  const engine=createExperienceEngine(experience);
  const result=engine.transactionRegistered(
    plan.commands.map((command)=>({type:command.type,input:command.input})),
    {source:"ai",actor:"visual-director",expectedRevision:0,transactionId:"autonomy-visual-repair"},
  );
  return {
    ok:result.ok,
    candidate:result.state,
    errors:result.errors.map((error)=>error.message),
    revisionBefore:result.revisionBefore,
    revisionAfter:result.revisionAfter,
    fingerprintBefore:result.fingerprintBefore,
    fingerprintAfter:result.fingerprintAfter,
  };
}

function lightingPatch(sceneId:string,text:string,severity:VisualCriticFinding["severity"]):SceneLightingRepair {
  const weight=severity==="blocker" ? 1.25 : 1;
  const patch:SceneLightingRepair={sceneId};
  if(/overexpos|washed|too bright|blown highlight|harsh highlight/.test(text)) {
    patch.exposureDelta=-0.12*weight;
    patch.bloomDelta=-0.08*weight;
  } else if(/too dark|underexpos|muddy|lost in shadow|insufficient contrast/.test(text)) {
    patch.exposureDelta=0.1*weight;
  }
  if(/flat light|flat lighting|needs separation|subject separation|rim light/.test(text)) patch.rimDelta=0.55*weight;
  if(/ambient|fill/.test(text) && /too much|flat|reduce|lower/.test(text)) patch.ambientDelta=-0.35*weight;
  if(/key light|key lighting/.test(text) && /weak|increase|stronger/.test(text)) patch.keyDelta=0.65*weight;
  if(/bloom|glow|halo/.test(text) && /too much|overpower|excess|reduce|lower|strong/.test(text)) patch.bloomDelta=-0.14*weight;
  if(/vignette/.test(text) && /too much|heavy|reduce|lower|strong/.test(text)) patch.vignetteDelta=-0.1*weight;
  return patch;
}

function subjectPatch(sceneId:string,text:string,severity:VisualCriticFinding["severity"]):SceneSubjectFramingRepair {
  const weight=severity==="blocker" ? 1.25 : 1;
  const patch:SceneSubjectFramingRepair={sceneId};
  if(/subject|hero|product|object/.test(text) && /too small|weak focal|lost|needs more presence|increase scale/.test(text)) patch.scaleMultiplier=1.07;
  if(/subject|hero|product|object/.test(text) && /too large|cramped|crowd|overlap|reduce scale/.test(text)) patch.scaleMultiplier=0.94;
  if(/move (?:the )?(?:subject|hero|product|object) right|more negative space on left/.test(text)) patch.xDelta=0.18*weight;
  if(/move (?:the )?(?:subject|hero|product|object) left|more negative space on right/.test(text)) patch.xDelta=-0.18*weight;
  if(/move (?:the )?(?:subject|hero|product|object) up/.test(text)) patch.yDelta=0.12*weight;
  if(/move (?:the )?(?:subject|hero|product|object) down/.test(text)) patch.yDelta=-0.12*weight;
  return patch;
}

function mediaPatch(sceneId:string,text:string,severity:VisualCriticFinding["severity"]):SceneMediaFramingRepair {
  const weight=severity==="blocker" ? 1.25 : 1;
  const patch:SceneMediaFramingRepair={sceneId};
  const mediaMention=/media|image|video|crop|plate|photograph/.test(text);
  if(!mediaMention) return patch;
  if(/mobile/.test(text)) {
    if(/shift|move.*right|crop.*left/.test(text)) patch.mobileXDelta=6*weight;
    if(/shift|move.*left|crop.*right/.test(text)) patch.mobileXDelta=-6*weight;
    if(/move.*up|crop.*bottom/.test(text)) patch.mobileYDelta=-5*weight;
    if(/move.*down|crop.*top/.test(text)) patch.mobileYDelta=5*weight;
  } else {
    if(/shift|move.*right|crop.*left/.test(text)) patch.xDelta=5*weight;
    if(/shift|move.*left|crop.*right/.test(text)) patch.xDelta=-5*weight;
    if(/move.*up|crop.*bottom/.test(text)) patch.yDelta=-4*weight;
    if(/move.*down|crop.*top/.test(text)) patch.yDelta=4*weight;
  }
  if(/too tight|cropped too tight|zoomed in|pull back/.test(text)) patch.zoomDelta=-0.025*weight;
  if(/too loose|too wide|needs tighter crop|zoom in/.test(text)) patch.zoomDelta=0.025*weight;
  return patch;
}

function materialPatch(
  sceneId:string,
  scene:SceneDefinition,
  text:string,
  severity:VisualCriticFinding["severity"],
):SceneMaterialSurfaceRepair {
  const weight=severity==="blocker" ? 1.2 : 1;
  const patch:SceneMaterialSurfaceRepair={sceneId};
  if(scene.material.roughness!==null) {
    if(/too glossy|too shiny|plastic|overly reflective/.test(text)) patch.roughnessDelta=0.08*weight;
    if(/too rough|too matte|chalky|dead surface|needs sheen/.test(text)) patch.roughnessDelta=-0.07*weight;
  }
  if(scene.material.metalness!==null) {
    if(/too metallic|chrome-like|too chrome/.test(text)) patch.metalnessDelta=-0.07*weight;
    if(/not metallic enough|needs more metallic|weak metal/.test(text)) patch.metalnessDelta=0.07*weight;
  }
  if(scene.material.clearcoat!==null) {
    if(/clearcoat|coating|lacquer/.test(text) && /too strong|plastic|reduce|lower/.test(text)) patch.clearcoatDelta=-0.08*weight;
    if(/clearcoat|coating|lacquer/.test(text) && /weak|increase|stronger/.test(text)) patch.clearcoatDelta=0.06*weight;
  }
  if(scene.material.tintStrength>0) {
    if(/tint|color cast/.test(text) && /too strong|reduce|neutral/.test(text)) patch.tintStrengthDelta=-0.06*weight;
    if(/tint|color cast/.test(text) && /weak|increase|stronger/.test(text)) patch.tintStrengthDelta=0.05*weight;
  }
  return patch;
}

function chooseCamera(text:string):CameraChoreographyName {
  if(/macro|detail|close|compression|longer lens/.test(text)) return "director-macro-approach";
  if(/pull back|pullback|more space|wider|reveal environment|too tight|cramped/.test(text)) return "director-pullback-reveal";
  if(/lateral|negative space|truck|sideways|separation/.test(text)) return "director-parallax-truck";
  if(/vertical|crane|elevation|rise|height/.test(text)) return "director-crane-reveal";
  if(/orbit|three-quarter|three quarter|around the subject/.test(text)) return "director-hero-orbit";
  if(/s-curve|s curve|floating path/.test(text)) return "director-s-curve";
  if(/dolly zoom|vertigo/.test(text)) return "director-dolly-zoom";
  return "director-precision-push";
}

function chooseMotion(text:string):MotionArchetypeName {
  if(/architecture|assemble|assembly|build|structure/.test(text)) return "architectural-build";
  if(/threshold|enter|passage|handoff|continuity/.test(text)) return "threshold-passage";
  if(/product|object|material|macro|hero/.test(text)) return "product-hero";
  if(/parallax|depth|lateral|layer/.test(text)) return "parallax-story";
  return "editorial-reveal";
}

function hasRepairFields(value:{sceneId:string}) {
  return Object.keys(value).some((key)=>key!=="sceneId");
}

function mergeBucket<T extends {sceneId:string}>(
  map:Map<string,RepairBucket<T>>,
  sceneId:string,
  patch:T,
  findingId:string,
  rationale:string,
  merge:(a:T,b:T)=>T,
) {
  const existing=map.get(sceneId) ?? {patch:{sceneId} as T,findings:[],rationale:[]};
  existing.patch=merge(existing.patch,patch);
  existing.findings.push(findingId);
  existing.rationale.push(rationale);
  map.set(sceneId,existing);
}

function pushBuckets<T extends {sceneId:string}>(
  commands:VisualRepairCommand[],
  map:Map<string,RepairBucket<T>>,
  type:"scene.adjustLighting"|"scene.adjustSubjectFraming"|"scene.adjustMediaFraming"|"scene.adjustMaterialSurface",
) {
  for(const item of map.values()) {
    commands.push({
      type,
      input:item.patch,
      findingIds:unique(item.findings),
      rationale:unique(item.rationale).join(" "),
    } as VisualRepairCommand);
  }
}

const lightingMergeBounds:Record<string,[number,number]>={
  exposureDelta:[-0.4,0.4],
  ambientDelta:[-2,2],
  keyDelta:[-5,5],
  rimDelta:[-5,5],
  bloomDelta:[-0.5,0.5],
  vignetteDelta:[-0.3,0.3],
};
const mediaMergeBounds:Record<string,[number,number]>={
  xDelta:[-16,16],
  yDelta:[-16,16],
  mobileXDelta:[-16,16],
  mobileYDelta:[-16,16],
  zoomDelta:[-0.08,0.08],
};
const materialMergeBounds:Record<string,[number,number]>={
  roughnessDelta:[-0.18,0.18],
  metalnessDelta:[-0.18,0.18],
  clearcoatDelta:[-0.18,0.18],
  tintStrengthDelta:[-0.15,0.15],
};

function mergeBounded<T extends {sceneId:string}>(a:T,b:T,bounds:Record<string,[number,number]>):T {
  const result:{[key:string]:unknown}={sceneId:a.sceneId};
  for(const key of new Set([...Object.keys(a),...Object.keys(b)])) {
    if(key==="sceneId") continue;
    const left=(a as unknown as Record<string,unknown>)[key];
    const right=(b as unknown as Record<string,unknown>)[key];
    if(typeof left==="number" || typeof right==="number") {
      const [min,max]=bounds[key] ?? [-Infinity,Infinity];
      result[key]=Math.max(min,Math.min(max,Number(left ?? 0)+Number(right ?? 0)));
    }
  }
  return result as T;
}

function mergeSubject(a:SceneSubjectFramingRepair,b:SceneSubjectFramingRepair):SceneSubjectFramingRepair {
  const result:SceneSubjectFramingRepair={
    sceneId:a.sceneId,
    xDelta:clampOptional((a.xDelta ?? 0)+(b.xDelta ?? 0),-1,1),
    yDelta:clampOptional((a.yDelta ?? 0)+(b.yDelta ?? 0),-1,1),
  };
  const scale=(a.scaleMultiplier ?? 1)*(b.scaleMultiplier ?? 1);
  if(scale!==1) result.scaleMultiplier=Math.max(0.8,Math.min(1.2,scale));
  if(result.xDelta===0) delete result.xDelta;
  if(result.yDelta===0) delete result.yDelta;
  return result;
}

function clampOptional(value:number,min:number,max:number) {
  return Math.max(min,Math.min(max,value));
}
function unique<T>(values:T[]){ return [...new Set(values)]; }
