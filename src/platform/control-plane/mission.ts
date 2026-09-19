import { inferPromptIntelligence } from "@/src/platform/autonomy/promptIntelligence";
import type { AutonomyProjectType, AutonomyTier } from "@/src/platform/autonomy/types";
import type { AssetManifest } from "@/src/types/assets";
import type { ExperienceConfig } from "@/src/types/experience";

export type MissionDecisionKind="creative-world"|"signature-moment"|"final-approval";

export interface MissionHumanDecision {
  id:string;
  kind:MissionDecisionKind;
  label:string;
  reason:string;
}

export interface MissionContract {
  version:1;
  id:string;
  statement:string;
  projectName:string;
  projectType:AutonomyProjectType;
  tier:AutonomyTier;
  audience:string;
  objective:string;
  primaryAction:string;
  brandTruth:string;
  differentiators:string[];
  constraints:string[];
  unknowns:string[];
  signatureMoment:string;
  operatingPrinciples:string[];
  humanDecisions:MissionHumanDecision[];
}

export function compileMission(input:{
  statement:string;
  projectName:string;
  experience:ExperienceConfig;
  manifest:AssetManifest;
}):MissionContract {
  const statement=input.statement.trim();
  if(statement.length<12) throw new Error("Mission requires a meaningful outcome statement.");

  const intelligence=inferPromptIntelligence({
    prompt:statement,
    projectName:input.projectName,
    sceneCount:input.experience.scenes.length,
    manifest:input.manifest,
  });

  const signatureMoment=signatureMomentFor(intelligence.projectType.value,intelligence.brandTruth.value);
  return {
    version:1,
    id:missionId(input.projectName,statement),
    statement,
    projectName:input.projectName,
    projectType:intelligence.projectType.value,
    tier:intelligence.tier.value,
    audience:intelligence.audience.value,
    objective:intelligence.objective.value,
    primaryAction:intelligence.primaryAction.value,
    brandTruth:intelligence.brandTruth.value,
    differentiators:intelligence.differentiators.slice(0,5),
    constraints:intelligence.constraints.slice(0,8),
    unknowns:intelligence.unknowns.slice(0,6),
    signatureMoment,
    operatingPrinciples:[
      "Preserve one clear visual hierarchy before adding spectacle.",
      "Spend complexity on the defining moment instead of distributing it evenly.",
      "Translate the idea for mobile rather than deleting it.",
      "Prefer bounded, reversible production changes before irreversible authority.",
      "Stop and ask for taste decisions; automate subsystem decisions.",
    ],
    humanDecisions:[
      {id:"creative-world",kind:"creative-world",label:"Choose the creative world",reason:"Forge can generate divergent territories, but final taste selection stays human."},
      {id:"signature-moment",kind:"signature-moment",label:"Approve the signature moment",reason:"The project's perceptual peak should be approved before broad polish."},
      {id:"final-approval",kind:"final-approval",label:"Approve final creative release",reason:"Production readiness can be automated; creative release authority stays human."},
    ],
  };
}

function signatureMomentFor(projectType:AutonomyProjectType,brandTruth:string) {
  const type=String(projectType);
  const mapping:Record<string,string>={
    product:"A decisive product transformation or assembly that makes form, mechanism or material impossible to ignore.",
    "real-estate":"A continuous spatial reveal that crosses a threshold and changes the visitor's understanding of the architecture.",
    hospitality:"A threshold moment where atmosphere, camera and material detail make the place feel enterable rather than merely shown.",
    automotive:"A mechanical or spatial reveal that exposes engineering beneath the surface without losing the vehicle's silhouette.",
    fashion:"A controlled transformation where garment, body, texture or environment changes as one authored visual gesture.",
    brand:"One unmistakable brand-world transition that turns the central brand truth into a visual memory.",
    portfolio:"One proof moment where work, process and motion collapse into a single unmistakable point of authorship.",
  };
  return mapping[type] ?? `One unmistakable moment that makes this truth felt rather than stated: ${brandTruth}`;
}

function missionId(projectName:string,statement:string) {
  const source=(projectName+"-"+statement).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,72);
  let hash=2166136261;
  for(const char of statement) hash=Math.imul(hash^char.charCodeAt(0),16777619);
  return `mission-${source || "forge"}-${(hash>>>0).toString(36)}`;
}
