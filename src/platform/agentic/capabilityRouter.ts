import { capabilityById, type CapabilityRiskClass, type CapabilityVerifier } from "@/src/platform/control-plane/capabilityRegistry";
import type { VisualCriticFinding } from "@/src/platform/autonomy/visualReview";
import type { AgentTaskDomain } from "@/src/platform/agentic/contextCompiler";

export type RepairCommandType="scene.adjustPresentation"|"motion.applyArchetype"|"camera.applyChoreography";
export type RouteDisposition="bounded-repair"|"preview-required"|"engineering-escalation"|"human-review";

export interface AgenticRoute {
  version:1;
  domain:AgentTaskDomain;
  owner:string;
  disposition:RouteDisposition;
  capabilityId:string|null;
  riskClass:CapabilityRiskClass|null;
  allowedSystems:string[];
  allowedRepairCommands:RepairCommandType[];
  requiredVerifiers:CapabilityVerifier[];
  reason:string;
}

export function routeVisualFinding(finding:VisualCriticFinding):AgenticRoute {
  const domain=classifyFinding(finding);
  const route=routeForDomain(domain,finding);
  if(!route.capabilityId) return route;
  const capability=capabilityById(route.capabilityId);
  if(!capability) {
    return {
      ...route,
      capabilityId:null,
      riskClass:null,
      disposition:"engineering-escalation",
      allowedRepairCommands:[],
      requiredVerifiers:[],
      reason:`No registered Forge capability owns ${domain}; escalate instead of improvising an unregistered edit.`,
    };
  }
  return {
    ...route,
    riskClass:capability.riskClass,
    allowedSystems:[...capability.systems],
    requiredVerifiers:[...capability.verifiers],
    disposition:route.disposition==="bounded-repair" && capability.riskClass==="preview-required" ? "preview-required" : route.disposition,
  };
}

export function classifyFinding(finding:VisualCriticFinding):AgentTaskDomain {
  const systems=finding.affectedSystems.join(" ").toLowerCase();
  if(/camera|lens|framing/.test(systems)) return "camera";
  if(/mobile|responsive|viewport/.test(systems)) return "mobile";
  if(/performance|runtime|fps|loading|preload/.test(systems)) return "performance";
  if(/asset|media source|texture|model|video/.test(systems)) return "asset";
  if(/interaction|pointer|touch|drag|hover/.test(systems)) return "interaction";
  if(/motion|transition|timing|scroll/.test(systems)) return "motion";

  switch(finding.critic) {
    case "camera": return "camera";
    case "motion":
    case "continuity": return "motion";
    case "typography": return "typography";
    case "interaction": return "interaction";
    case "mobile": return "mobile";
    case "performance": return "performance";
    case "material":
    case "image-direction": return "asset";
    case "brand":
    case "originality":
    case "sound": return "director";
    case "composition":
    case "art-direction":
    case "color":
    case "lighting":
    case "craft":
    default: return "composition";
  }
}

function routeForDomain(domain:AgentTaskDomain,finding:VisualCriticFinding):AgenticRoute {
  const base={version:1 as const,domain};
  if(domain==="camera") return {
    ...base,owner:"camera-worker",disposition:"bounded-repair",capabilityId:"scene.direct-camera",riskClass:null,
    allowedSystems:["camera"],allowedRepairCommands:["camera.applyChoreography","scene.adjustPresentation"],
    requiredVerifiers:[],reason:"Camera/framing findings route to the camera worker; presentation may move only to preserve framing hierarchy.",
  };
  if(domain==="motion") return {
    ...base,owner:"motion-worker",disposition:"bounded-repair",capabilityId:"scene.compose-motion",riskClass:null,
    allowedSystems:["motion"],allowedRepairCommands:["motion.applyArchetype"],
    requiredVerifiers:[],reason:"Motion and continuity findings route to deterministic motion archetypes before bespoke animation code.",
  };
  if(domain==="typography") return {
    ...base,owner:"typography-presentation-worker",disposition:"preview-required",capabilityId:"scene.polish",riskClass:null,
    allowedSystems:["studio","motion"],allowedRepairCommands:["scene.adjustPresentation","motion.applyArchetype"],
    requiredVerifiers:[],reason:"Typography may adjust presentation/timing but cannot rewrite semantic copy or the creative thesis.",
  };
  if(domain==="composition") return {
    ...base,owner:"composition-worker",disposition:"preview-required",capabilityId:"scene.polish",riskClass:null,
    allowedSystems:["studio"],allowedRepairCommands:["scene.adjustPresentation"],
    requiredVerifiers:[],reason:"Composition/art-direction findings receive bounded presentation changes and require rendered comparison.",
  };
  if(domain==="mobile") return {
    ...base,owner:"mobile-translation-worker",disposition:"preview-required",capabilityId:"scene.fix-mobile",riskClass:null,
    allowedSystems:["camera","motion","studio"],allowedRepairCommands:["scene.adjustPresentation","camera.applyChoreography","motion.applyArchetype"],
    requiredVerifiers:[],reason:"Mobile findings may recompose travel, framing and timing while preserving the signature idea.",
  };
  if(domain==="performance") return {
    ...base,owner:"performance-worker",disposition:"preview-required",
    capabilityId:/video|media/i.test(finding.affectedSystems.join(" ")) ? "media.optimize-video" : "environment.optimize",
    riskClass:null,allowedSystems:["assets","environment"],allowedRepairCommands:[],requiredVerifiers:[],
    reason:"Performance changes require profiling and visual-regression evidence; the visual repair planner must not guess them.",
  };
  if(domain==="asset") return {
    ...base,owner:"asset-worker",disposition:"preview-required",capabilityId:"asset.improve",riskClass:null,
    allowedSystems:["assets"],allowedRepairCommands:[],requiredVerifiers:[],
    reason:"Asset/material/image-direction findings route to Asset Intelligence and remain outside presentation-only repair.",
  };
  if(domain==="interaction") return {
    ...base,owner:"interaction-worker",disposition:"preview-required",capabilityId:"scene.add-behavior",riskClass:null,
    allowedSystems:["interaction"],allowedRepairCommands:[],requiredVerifiers:[],
    reason:"Interaction changes require functional/touch verification and cannot be inferred as presentation edits.",
  };
  if(domain==="director") return {
    ...base,owner:"director",disposition:"human-review",capabilityId:null,riskClass:null,
    allowedSystems:["director"],allowedRepairCommands:[],requiredVerifiers:[],
    reason:"Brand, originality and sound judgments can alter strategic direction, so they remain Director/human decisions.",
  };
  return {
    ...base,owner:"engineering-agent",disposition:"engineering-escalation",capabilityId:null,riskClass:null,
    allowedSystems:["studio"],allowedRepairCommands:[],requiredVerifiers:[],
    reason:"The requested behavior has no bounded Forge repair owner and requires an explicit engineering task.",
  };
}
