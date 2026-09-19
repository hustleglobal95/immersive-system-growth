import { capabilityById } from "@/src/platform/control-plane/capabilityRegistry";
import type { ForgeProposal } from "@/src/platform/control-plane/proposal";
import type { InteractionGraph } from "@/src/lib/interactionGraph";
import type { AssetManifest } from "@/src/types/assets";
import type { ExperienceConfig } from "@/src/types/experience";

export interface VerifiedLoopCandidate {
  runId:string;
  loopId:string;
  projectId:string;
  sourceVersionId?:string;
  proposalId:string;
  selectionKey:string;
  fingerprint:string;
  repairSummary:string[];
  preferenceAgreement:number|null;
  experience:ExperienceConfig;
  assetManifest:AssetManifest;
  interactionGraph:InteractionGraph;
}

export function attachVerifiedLoopCandidate(proposal:ForgeProposal,candidate:VerifiedLoopCandidate):ForgeProposal {
  const capability=capabilityById(proposal.capabilityId);
  if(!capability || capability.dispatch.type!=="loop") throw new Error("Proposal is not backed by a Loop capability.");
  if(capability.dispatch.loop!==candidate.loopId) throw new Error("Loop result does not match the proposal capability.");
  if(candidate.proposalId!==proposal.id) throw new Error("Loop result belongs to a different Control Plane proposal.");
  if(candidate.selectionKey!==proposal.selectionKey) throw new Error("Loop result belongs to a different selected target.");
  const detail=`Verified by ${candidate.loopId} run ${candidate.runId}; candidate survived all required hard gates and pairwise acceptance.`;
  return {
    ...proposal,
    state:"ready",
    verification:{
      ...proposal.verification,
      results:proposal.verification.required.map((verifier)=>({verifier,status:"passed" as const,detail})),
    },
    changes:candidate.repairSummary.slice(0,8).map((summary,index)=>({
      path:`loop:${candidate.loopId}:change-${index+1}`,
      before:"incumbent",
      after:"verified candidate",
      summary,
    })),
    candidate:{
      fingerprint:candidate.fingerprint,
    },
    explanation:`${proposal.explanation} Loop Engine returned a verified winning candidate. Compare Current and Candidate before applying it to the working draft; Project Vault remains authoritative until an explicit checkpoint/promotion.`,
  };
}
