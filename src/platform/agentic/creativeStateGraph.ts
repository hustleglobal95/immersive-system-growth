import { stateFingerprint } from "@/src/core/journal/stateFingerprint";
import type { runDirectorIntelligence } from "@/src/platform/director-intelligence/orchestrator";

type DirectorRun=ReturnType<typeof runDirectorIntelligence>;

export type CreativeAuthority="director-locked"|"bounded-implementation"|"evidence-derived";

export interface CreativeStateScene {
  id:string;
  label:string;
  purpose:string;
  emotion:string;
  intensity:number;
  informationDensity:number;
  interactionLevel:number;
  proofLevel:number;
  conversionWeight:number;
  medium:string;
  continuityAnchor:string;
  depthStrategy:string;
  motionStrategy:string;
  interactionStrategy:string;
  mobileTranslation:string[];
  artFrame:unknown|null;
}

export interface CreativeStateGraph {
  version:1;
  projectName:string;
  projectType:string;
  tier:string;
  fingerprint:string;
  truth:{
    brandTruth:string;
    objective:string;
    primaryAction:string;
    differentiators:string[];
    constraints:string[];
    authority:CreativeAuthority;
  };
  direction:{
    territoryId:string;
    thesis:string;
    northStar:string;
    memoryPromise:string;
    signatureMoment:{
      name:string;
      description:string;
      whyMemorable:string;
      prerequisites:string[];
      protectFrom:string[];
    };
    emotionalArc:string[];
    visualLanguage:unknown;
    creativeDNA:DirectorRun["creativeDNA"];
    artDirection:DirectorRun["artDirection"];
    disciplineDirections:DirectorRun["disciplineDirections"];
    authority:CreativeAuthority;
  };
  implementation:{
    constructionMode:string;
    persistentCanvasRecommended:boolean;
    maxSimultaneousHeavySystems:number;
    globalRules:string[];
    sceneContracts:CreativeStateScene[];
    authority:CreativeAuthority;
  };
  evidence:{
    planningDisposition:string;
    renderedJudgment:string;
    renderedJudgmentStatus:string;
    blockers:string[];
    unknowns:string[];
    assetBlockers:string[];
    humanGates:Array<{id:string;label:string;reason:string}>;
    authority:CreativeAuthority;
  };
  permissions:{
    strategicFields:string[];
    boundedImplementationFields:string[];
    evidenceOnlyFields:string[];
    rule:string;
  };
}

export interface SignatureSliceGate {
  version:1;
  primarySceneId:string;
  supportSceneIds:string[];
  protectedMoment:string;
  objective:string;
  acceptance:string[];
  stopRule:string;
}

export function buildCreativeStateGraph(director:DirectorRun):CreativeStateGraph {
  const {report}=director;
  const treatment=report.treatment;
  const selected=treatment.territories.find((item)=>item.id===treatment.selectedTerritoryId) ?? treatment.territories[0];
  const artFrames=new Map(director.artDirection.sceneFrames.map((frame)=>[frame.beatId,frame]));
  const constructionByScene=new Map(director.constructionPlan.sceneDecisions.map((scene)=>[scene.sceneId,scene]));
  const sceneContracts:CreativeStateScene[]=treatment.emotionalArc.map((beat)=>{
    const construction=constructionByScene.get(beat.id);
    return {
      id:beat.id,
      label:beat.label,
      purpose:beat.purpose,
      emotion:beat.emotion,
      intensity:beat.intensity,
      informationDensity:beat.informationDensity,
      interactionLevel:beat.interactionLevel,
      proofLevel:beat.proofLevel,
      conversionWeight:beat.conversionWeight,
      medium:construction?.medium ?? "dom",
      continuityAnchor:construction?.continuityAnchor ?? "Preserve continuity with the preceding and following chapter.",
      depthStrategy:construction?.depthStrategy ?? "Use depth only when it clarifies hierarchy.",
      motionStrategy:construction?.motionStrategy ?? "Use motion only when it clarifies state change.",
      interactionStrategy:construction?.interactionStrategy ?? "Keep interaction subordinate to the scene purpose.",
      mobileTranslation:construction?.mobileTranslation ?? [],
      artFrame:artFrames.get(beat.id) ?? null,
    };
  });
  const base= {
    version:1 as const,
    projectName:report.brief.projectName,
    projectType:report.brief.projectType,
    tier:report.brief.tier,
    truth:{
      brandTruth:report.brief.brandTruth,
      objective:report.brief.objective,
      primaryAction:report.brief.primaryAction,
      differentiators:[...report.brief.differentiators],
      constraints:[...report.brief.constraints],
      authority:"director-locked" as const,
    },
    direction:{
      territoryId:selected.id,
      thesis:selected.thesis,
      northStar:director.creativeDNA.northStar,
      memoryPromise:director.creativeDNA.memoryPromise,
      signatureMoment:{
        name:treatment.signatureMoment.name,
        description:treatment.signatureMoment.description,
        whyMemorable:treatment.signatureMoment.whyMemorable,
        prerequisites:[...treatment.signatureMoment.prerequisites],
        protectFrom:[...treatment.signatureMoment.protectFrom],
      },
      emotionalArc:treatment.emotionalArc.map((beat)=>`${beat.label}: ${beat.emotion} (${beat.intensity}/10)`),
      visualLanguage:director.visualLanguages.find((item)=>item.territoryId===treatment.selectedTerritoryId) ?? director.visualLanguages[0],
      creativeDNA:director.creativeDNA,
      artDirection:director.artDirection,
      disciplineDirections:director.disciplineDirections,
      authority:"director-locked" as const,
    },
    implementation:{
      constructionMode:director.constructionPlan.mode,
      persistentCanvasRecommended:director.constructionPlan.persistentCanvasRecommended,
      maxSimultaneousHeavySystems:director.constructionPlan.maxSimultaneousHeavySystems,
      globalRules:[...director.constructionPlan.globalRules],
      sceneContracts,
      authority:"bounded-implementation" as const,
    },
    evidence:{
      planningDisposition:report.planningDisposition,
      renderedJudgment:report.judgment.verdict,
      renderedJudgmentStatus:report.judgment.status,
      blockers:[...report.blockers],
      unknowns:[...report.evidence.unknowns],
      assetBlockers:[...report.assetGap.blockers],
      humanGates:director.humanGates.pending.map((gate)=>({id:gate.id,label:gate.label,reason:gate.reason})),
      authority:"evidence-derived" as const,
    },
    permissions:{
      strategicFields:[
        "truth.brandTruth","truth.objective","truth.primaryAction","truth.differentiators","truth.constraints",
        "direction.territoryId","direction.thesis","direction.northStar","direction.memoryPromise","direction.signatureMoment",
        "direction.creativeDNA","direction.artDirection","direction.disciplineDirections",
      ],
      boundedImplementationFields:[
        "implementation.sceneContracts.camera","implementation.sceneContracts.motion","implementation.sceneContracts.presentation",
        "implementation.sceneContracts.mobileTranslation","implementation.sceneContracts.interaction","implementation.sceneContracts.assetSelection",
      ],
      evidenceOnlyFields:["evidence.planningDisposition","evidence.renderedJudgment","evidence.blockers","evidence.unknowns","evidence.humanGates"],
      rule:"Implementation workers may execute bounded changes but may not rewrite strategic truth. Evidence fields change only when new evidence is produced.",
    },
  };
  return {...base,fingerprint:stateFingerprint(base)};
}

export function buildSignatureSliceGate(graph:CreativeStateGraph):SignatureSliceGate {
  const ordered=[...graph.implementation.sceneContracts];
  const primary=[...ordered].sort((a,b)=>b.intensity-a.intensity || ordered.indexOf(a)-ordered.indexOf(b))[0];
  const primaryIndex=Math.max(0,ordered.findIndex((scene)=>scene.id===primary?.id));
  const supportSceneIds=[
    ordered[Math.max(0,primaryIndex-1)]?.id,
    ordered[Math.min(ordered.length-1,primaryIndex+1)]?.id,
  ].filter((id,index,items):id is string=>Boolean(id)&&id!==primary?.id&&items.indexOf(id)===index);
  return {
    version:1,
    primarySceneId:primary?.id ?? ordered[0]?.id ?? "unknown",
    supportSceneIds,
    protectedMoment:graph.direction.signatureMoment.name,
    objective:`Prove “${graph.direction.thesis}” through the protected signature moment before scaling production across the remaining chapters.`,
    acceptance:[
      "The signature moment is visibly the strongest and most memorable beat.",
      "The incoming and outgoing handoffs feel continuous rather than like separate pages.",
      "Typography and focal subject have an explicit hierarchy with protected negative space.",
      "Desktop and mobile preserve the same idea even when travel, density and simultaneous effects are reduced.",
      "First-use asset loading does not hitch the protected moment.",
      "No supporting effect competes with the signature mechanism.",
    ],
    stopRule:"Do not expand full-site production while the signature slice has a blocker or fails rendered comparative review.",
  };
}
