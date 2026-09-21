import { createExperienceEngine } from "@/src/platform/createExperienceEngine";
import type { CameraChoreographyName } from "@/src/platform/cameraChoreography";
import type { MotionArchetypeName } from "@/src/platform/motionArchetypes";
import type { ScenePresentationAdjustment } from "@/src/platform/commands/presentationCommands";
import type { RenderReviewPlan, VisualCriticFinding } from "@/src/platform/autonomy/visualReview";
import type { ExperienceConfig } from "@/src/types/experience";
import { routeVisualFinding } from "@/src/platform/agentic/capabilityRouter";

export interface VisualRepairCommand {
  type: "scene.adjustPresentation" | "motion.applyArchetype" | "camera.applyChoreography";
  input: ScenePresentationAdjustment | { sceneId:string; archetype:MotionArchetypeName } | { sceneId:string; choreography:CameraChoreographyName };
  findingIds: string[];
  rationale: string;
}

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

export function planVisualRepairs(input:{
  findings: FindingWithId[];
  reviewPlan: RenderReviewPlan;
  experience: ExperienceConfig;
  minConfidence?: number;
}):VisualRepairPlan {
  const minConfidence=input.minConfidence ?? 0.6;
  const captureScene=new Map(input.reviewPlan.captures.map((capture)=>[capture.id,capture.sceneId]));
  const sceneIds=new Set(input.experience.scenes.map((scene)=>scene.id));
  const presentation=new Map<string,{ patch:ScenePresentationAdjustment; findings:string[]; rationale:string[] }>();
  const camera=new Map<string,{ choreography:CameraChoreographyName; finding:string; rationale:string }>();
  const motion=new Map<string,{ archetype:MotionArchetypeName; finding:string; rationale:string }>();
  const unresolved:VisualCriticFinding[]=[];

  input.findings.forEach((finding,index)=>{
    const findingId=finding.id ?? "finding-" + String(index+1).padStart(3,"0");
    const sceneId=captureScene.get(finding.captureId);
    if(!sceneId || !sceneIds.has(sceneId)) {
      unresolved.push(finding);
      return;
    }
    if((finding.severity==="minor" || finding.severity==="advisory") || finding.confidence < minConfidence) {
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

    if(route.allowedRepairCommands.includes("camera.applyChoreography") && (finding.critic==="camera" || finding.affectedSystems.some((item)=>/camera|lens|framing/i.test(item)))) {
      camera.set(sceneId,{
        choreography:chooseCamera(text),
        finding:findingId,
        rationale:finding.repair || finding.finding,
      });
      handled=true;
    }

    if(
      route.allowedRepairCommands.includes("motion.applyArchetype") && (
      finding.critic==="motion" ||
      finding.critic==="continuity" ||
      (finding.critic==="typography" && /timing|arriv|settle|reveal|copy/i.test(text)) ||
      finding.affectedSystems.some((item)=>/motion|transition|copy timing/i.test(item))
      )
    ) {
      motion.set(sceneId,{
        archetype:chooseMotion(text),
        finding:findingId,
        rationale:finding.repair || finding.finding,
      });
      handled=true;
    }

    const patch=presentationPatch(sceneId,text,finding.severity);
    if(route.allowedRepairCommands.includes("scene.adjustPresentation") && Object.keys(patch).length > 1) {
      const existing=presentation.get(sceneId) ?? { patch:{ sceneId },findings:[],rationale:[] };
      existing.patch=mergePresentation(existing.patch,patch);
      existing.findings.push(findingId);
      existing.rationale.push(finding.repair || finding.finding);
      presentation.set(sceneId,existing);
      handled=true;
    }

    if(!handled) unresolved.push(finding);
  });

  const commands:VisualRepairCommand[]=[];
  for(const [sceneId,item] of presentation) {
    commands.push({
      type:"scene.adjustPresentation",
      input:item.patch,
      findingIds:item.findings,
      rationale:unique(item.rationale).join(" "),
    });
  }
  for(const [sceneId,item] of camera) {
    commands.push({
      type:"camera.applyChoreography",
      input:{ sceneId,choreography:item.choreography },
      findingIds:[item.finding],
      rationale:item.rationale,
    });
  }
  for(const [sceneId,item] of motion) {
    commands.push({
      type:"motion.applyArchetype",
      input:{ sceneId,archetype:item.archetype },
      findingIds:[item.finding],
      rationale:item.rationale,
    });
  }

  const unresolvedBlockers=unresolved.filter((finding)=>finding.severity==="blocker");
  return {
    version:1,
    commands,
    affectedSceneIds:unique(commands.map((command)=>String((command.input as { sceneId:string }).sceneId))),
    unresolved,
    blockers:unresolvedBlockers.map((finding)=>finding.finding),
    summary:[
      commands.length + " bounded repair command" + (commands.length===1 ? "" : "s") + " proposed.",
      presentation.size + " scene presentation adjustment" + (presentation.size===1 ? "" : "s") + ".",
      camera.size + " camera choreography repair" + (camera.size===1 ? "" : "s") + ".",
      motion.size + " coordinated motion repair" + (motion.size===1 ? "" : "s") + ".",
      unresolved.length + " finding" + (unresolved.length===1 ? "" : "s") + " left for review rather than guessed.",
    ],
  };
}

export function applyVisualRepairPlan(experience:ExperienceConfig,plan:VisualRepairPlan):VisualRepairResult {
  if(plan.blockers.length) {
    return {
      ok:false,
      candidate:structuredClone(experience),
      errors:["Unresolved visual blocker: " + plan.blockers.join("; ")],
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
    plan.commands.map((command)=>({ type:command.type,input:command.input })),
    { source:"ai",actor:"visual-director",expectedRevision:0,transactionId:"autonomy-visual-repair" },
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

function presentationPatch(sceneId:string,text:string,severity:VisualCriticFinding["severity"]):ScenePresentationAdjustment {
  const weight=severity==="blocker" ? 1.25 : 1;
  const patch:ScenePresentationAdjustment={ sceneId };
  if(/overexpos|washed|too bright|blown highlight|harsh highlight/.test(text)) {
    patch.exposureDelta=-0.12*weight;
    patch.bloomDelta=-0.08*weight;
  } else if(/too dark|underexpos|muddy|lost in shadow|insufficient contrast/.test(text)) {
    patch.exposureDelta=0.1*weight;
  }
  if(/bloom|glow|halo/.test(text) && /too much|overpower|excess|reduce|lower|strong/.test(text)) patch.bloomDelta=-0.14*weight;
  if(/vignette/.test(text) && /too much|heavy|reduce|lower|strong/.test(text)) patch.vignetteDelta=-0.1*weight;
  if(/subject|hero|product|object/.test(text) && /too small|weak focal|lost|needs more presence|increase scale/.test(text)) patch.heroScaleMultiplier=1.07;
  if(/subject|hero|product|object/.test(text) && /too large|cramped|crowd|overlap|reduce scale/.test(text)) patch.heroScaleMultiplier=0.94;
  if(/move (?:the )?(?:subject|hero|product|object) right|more negative space on left/.test(text)) patch.heroXDelta=0.18*weight;
  if(/move (?:the )?(?:subject|hero|product|object) left|more negative space on right/.test(text)) patch.heroXDelta=-0.18*weight;
  if(/move (?:the )?(?:subject|hero|product|object) up/.test(text)) patch.heroYDelta=0.12*weight;
  if(/move (?:the )?(?:subject|hero|product|object) down/.test(text)) patch.heroYDelta=-0.12*weight;
  if(/mobile/.test(text) && /media|image|video|crop/.test(text)) {
    if(/shift|move.*right|crop.*left/.test(text)) patch.mobileMediaXDelta=6*weight;
    if(/shift|move.*left|crop.*right/.test(text)) patch.mobileMediaXDelta=-6*weight;
    if(/move.*up|crop.*bottom/.test(text)) patch.mobileMediaYDelta=-5*weight;
    if(/move.*down|crop.*top/.test(text)) patch.mobileMediaYDelta=5*weight;
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

function mergePresentation(a:ScenePresentationAdjustment,b:ScenePresentationAdjustment):ScenePresentationAdjustment {
  const result:ScenePresentationAdjustment={ sceneId:a.sceneId };
  const additive:(keyof ScenePresentationAdjustment)[]=[
    "exposureDelta","ambientDelta","keyDelta","rimDelta","bloomDelta","vignetteDelta",
    "heroXDelta","heroYDelta","mediaXDelta","mediaYDelta","mobileMediaXDelta","mobileMediaYDelta",
  ];
  const limits:Partial<Record<keyof ScenePresentationAdjustment,[number,number]>>={
    exposureDelta:[-0.4,0.4],ambientDelta:[-2,2],keyDelta:[-5,5],rimDelta:[-5,5],
    bloomDelta:[-0.5,0.5],vignetteDelta:[-0.3,0.3],heroXDelta:[-1.5,1.5],heroYDelta:[-1.5,1.5],
    mediaXDelta:[-20,20],mediaYDelta:[-20,20],mobileMediaXDelta:[-20,20],mobileMediaYDelta:[-20,20],
  };
  for(const key of additive) {
    const left=a[key];
    const right=b[key];
    if(typeof left==="number" || typeof right==="number") {
      const range=limits[key] ?? [-Infinity,Infinity];
      // ScenePresentationAdjustment has no index signature, so the widening needs the explicit
      // two-step the compiler asks for rather than a direct assertion.
      (result as unknown as Record<string,unknown>)[key]=Math.max(range[0],Math.min(range[1],Number(left ?? 0)+Number(right ?? 0)));
    }
  }
  const scaleA=a.heroScaleMultiplier ?? 1;
  const scaleB=b.heroScaleMultiplier ?? 1;
  if(scaleA!==1 || scaleB!==1) result.heroScaleMultiplier=Math.max(0.75,Math.min(1.25,scaleA*scaleB));
  return result;
}
function unique<T>(values:T[]){ return [...new Set(values)]; }
