import { capabilityById } from "@/src/platform/control-plane/capabilityRegistry";
import type { MissionPlanGraph, MissionPlanStep } from "@/src/platform/control-plane/planGraph";

export type OperatorMode="guide"|"copilot"|"autopilot";
export type AutopilotDisposition="recommend"|"execute"|"prepare-review"|"human-gate"|"blocked";

export interface AutopilotDecision {
  stepId:string;
  disposition:AutopilotDisposition;
  reason:string;
}

export interface AutopilotSession {
  version:1;
  mode:OperatorMode;
  decisions:AutopilotDecision[];
  executable:number;
  reviewRequired:number;
  humanRequired:number;
  blocked:number;
  next:AutopilotDecision|null;
}

export function decideAutopilot(step:MissionPlanStep,mode:OperatorMode):AutopilotDecision {
  if(step.status==="complete") return {stepId:step.id,disposition:"blocked",reason:"Step is already complete."};
  if(step.status==="blocked") return {stepId:step.id,disposition:"blocked",reason:"Dependencies or production gates are not resolved yet."};
  if(step.autonomy==="human") return {stepId:step.id,disposition:"human-gate",reason:"This is a taste or authority decision reserved for the operator."};
  if(mode==="guide") return {stepId:step.id,disposition:"recommend",reason:"Guide mode recommends the next operation without executing it."};

  const capability=step.capabilityId ? capabilityById(step.capabilityId) : null;
  if(!capability) return {stepId:step.id,disposition:"human-gate",reason:"No bounded capability owns this step."};

  if(capability.riskClass==="approval-required") {
    return {stepId:step.id,disposition:"human-gate",reason:"Capability requires explicit approval."};
  }
  if(capability.riskClass==="preview-required" || step.autonomy==="preview") {
    return {stepId:step.id,disposition:"prepare-review",reason:"Forge may prepare and verify the candidate, but acceptance stays human."};
  }
  if(mode==="copilot" || mode==="autopilot") {
    return {stepId:step.id,disposition:"execute",reason:"Capability is bounded and reversible, so Forge may execute the operation."};
  }
  return {stepId:step.id,disposition:"recommend",reason:"Operation remains advisory."};
}

export function createAutopilotSession(plan:MissionPlanGraph,mode:OperatorMode):AutopilotSession {
  const decisions=plan.steps
    .filter((step)=>step.status!=="complete")
    .map((step)=>decideAutopilot(step,mode));
  const ranked=decisions
    .filter((decision)=>decision.disposition!=="blocked")
    .sort((a,b)=>decisionWeight(b.disposition)-decisionWeight(a.disposition) || a.stepId.localeCompare(b.stepId));
  return {
    version:1,
    mode,
    decisions,
    executable:decisions.filter((item)=>item.disposition==="execute").length,
    reviewRequired:decisions.filter((item)=>item.disposition==="prepare-review").length,
    humanRequired:decisions.filter((item)=>item.disposition==="human-gate").length,
    blocked:decisions.filter((item)=>item.disposition==="blocked").length,
    next:ranked[0] ?? null,
  };
}

function decisionWeight(value:AutopilotDisposition) {
  return value==="execute" ? 5 : value==="prepare-review" ? 4 : value==="human-gate" ? 3 : value==="recommend" ? 2 : 0;
}
