import { z } from "zod";
import type { ResolvedCapability } from "@/src/platform/control-plane/capabilityRegistry";
import type { SelectionContext } from "@/src/platform/control-plane/selectionContext";

const verifierSchema=z.enum(["schema","functional","visual","motion","mobile","performance","accessibility","assets"]);
const riskSchema=z.enum(["instant-reversible","preview-required","approval-required"]);
const executionSchema=z.enum(["fast","deep","editor","navigation"]);

export const forgeProposalSchema=z.object({
  version:z.literal(1),
  id:z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  createdAt:z.iso.datetime(),
  state:z.enum(["draft","ready","verifying","accepted","rejected","failed"]),
  capabilityId:z.string().regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/),
  selectionKey:z.string().min(1).max(320),
  baselineFingerprint:z.string().min(16).max(128).optional(),
  intent:z.object({
    source:z.enum(["semantic-action","command","next-action","system"]),
    raw:z.string().min(1).max(1200),
    normalized:z.string().min(1).max(240),
  }).strict(),
  executionClass:executionSchema,
  riskClass:riskSchema,
  mutationScope:z.object({
    systems:z.array(z.string().min(1).max(80)).min(1).max(16),
    allowedPaths:z.array(z.string().min(1).max(240)).max(48),
    preserved:z.array(z.string().min(1).max(240)).max(48),
  }).strict(),
  plan:z.array(z.object({
    id:z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    label:z.string().min(1).max(160),
    system:z.string().min(1).max(80),
    operation:z.string().min(1).max(240),
  }).strict()).min(1).max(24),
  verification:z.object({
    required:z.array(verifierSchema).max(8),
    results:z.array(z.object({
      verifier:verifierSchema,
      status:z.enum(["pending","passed","failed","not-applicable"]),
      detail:z.string().max(600).default(""),
    }).strict()).max(8).default([]),
  }).strict(),
  explanation:z.string().min(1).max(1200),
  changes:z.array(z.object({
    path:z.string().min(1).max(300),
    before:z.string().max(300),
    after:z.string().max(300),
    summary:z.string().min(1).max(500),
  }).strict()).max(48).default([]),
  candidate:z.object({
    experiencePath:z.string().max(1000).optional(),
    assetManifestPath:z.string().max(1000).optional(),
    interactionGraphPath:z.string().max(1000).optional(),
    fingerprint:z.string().max(128).optional(),
  }).strict().optional(),
}).strict();

export type ForgeProposal=z.infer<typeof forgeProposalSchema>;

export function createProposalDraft(input:{
  id:string;
  createdAt:string;
  capability:ResolvedCapability;
  context:SelectionContext;
  intent:string;
  baselineFingerprint?:string;
  source?:"semantic-action"|"command"|"next-action"|"system";
}):ForgeProposal {
  const scope=mutationScope(input.capability,input.context);
  const plan=defaultPlan(input.capability,input.context);
  return forgeProposalSchema.parse({
    version:1,
    id:input.id,
    createdAt:input.createdAt,
    state:"draft",
    capabilityId:input.capability.id,
    selectionKey:input.context.selectionKey,
    baselineFingerprint:input.baselineFingerprint,
    intent:{
      source:input.source ?? "semantic-action",
      raw:input.intent,
      normalized:normalizeIntent(input.intent),
    },
    executionClass:input.capability.executionClass,
    riskClass:input.capability.riskClass,
    mutationScope:scope,
    plan,
    verification:{
      required:input.capability.verifiers,
      results:input.capability.verifiers.map((verifier)=>({verifier,status:"pending",detail:""})),
    },
    explanation:`${input.capability.description} Target: ${input.context.label}.`,
    changes:[],
  });
}

export function proposalRequiresPreview(proposal:ForgeProposal) {
  return proposal.riskClass==="preview-required" || proposal.riskClass==="approval-required";
}

export function proposalCanMutateAuthoritativeState(proposal:ForgeProposal) {
  if(proposal.riskClass!=="approval-required" || proposal.state!=="accepted") return false;
  const results=new Map(proposal.verification.results.map((result)=>[result.verifier,result.status]));
  return proposal.verification.required.every((verifier)=>results.get(verifier)==="passed");
}

function mutationScope(capability:ResolvedCapability,context:SelectionContext) {
  const sceneBase=`scenes[${context.sceneIndex}]`;
  const allowedPaths:string[]=[];
  if(capability.systems.includes("camera")) allowedPaths.push(sceneBase+".camera",sceneBase+".mobileCamera");
  if(capability.systems.includes("motion") || capability.systems.includes("sequencer")) allowedPaths.push(sceneBase+".motionTracks");
  if(capability.systems.includes("environment")) allowedPaths.push(sceneBase+".world",sceneBase+".post",sceneBase+".material");
  if(capability.systems.includes("interaction")) allowedPaths.push("interactionGraph");
  if(capability.systems.includes("assets")) allowedPaths.push("assetManifest");
  if(capability.systems.includes("loops")) allowedPaths.push("candidateProjectState");

  return {
    systems:[...new Set(capability.systems)],
    allowedPaths:[...new Set(allowedPaths)],
    preserved:[
      "client factual claims",
      "semantic scene identity",
      "authoritative production state until acceptance",
      ...(context.kind==="camera" ? ["unselected scenes"] : []),
      ...(context.kind==="node" ? ["unselected rig-node rest poses"] : []),
    ],
  };
}

function defaultPlan(capability:ResolvedCapability,context:SelectionContext) {
  const systems=capability.systems.length ? capability.systems : ["studio"];
  return systems.slice(0,6).map((system,index)=>({
    id:`step-${index+1}`,
    label:index===0 ? capability.label : `Coordinate ${system}`,
    system,
    operation:index===0
      ? `Resolve ${capability.id} against ${context.selectionKey} without mutating authoritative state.`
      : `Apply only the bounded ${system} portion of the proposal.`,
  }));
}

function normalizeIntent(value:string) {
  return value.trim().toLowerCase().replace(/\s+/g," ").slice(0,240);
}
