import type { MissionContract } from "@/src/platform/control-plane/mission";
import type { MissionPlanGraph } from "@/src/platform/control-plane/planGraph";
import type { ProjectHealthReport, ProjectHealthSeverity } from "@/src/platform/control-plane/projectHealth";

export type CriticDomain="creative-direction"|"assets"|"motion"|"mobile"|"interaction"|"validation"|"discoverability"|"visual-evidence"|"signature";

export interface VisualEvidenceFinding {
  id:string;
  severity:"info"|"warning"|"blocker";
  title:string;
  detail:string;
  recommendedCapabilityId?:string;
}

export interface ContinuousCriticFinding {
  id:string;
  domain:CriticDomain;
  severity:"info"|"warning"|"blocker";
  title:string;
  detail:string;
  recommendedCapabilityId?:string;
  source:"project-health"|"mission"|"plan"|"visual-evidence";
}

export interface ContinuousCriticReport {
  version:1;
  status:"clear"|"attention"|"blocked";
  findings:ContinuousCriticFinding[];
  topRepair:ContinuousCriticFinding|null;
}

export function critiqueContinuously(input:{
  mission:MissionContract;
  health:ProjectHealthReport;
  plan:MissionPlanGraph;
  visualEvidence?:VisualEvidenceFinding[];
}):ContinuousCriticReport {
  const findings:ContinuousCriticFinding[]=[];

  for(const issue of input.health.issues) {
    findings.push({
      id:`health-${issue.id}`,
      domain:healthDomain(issue.domain),
      severity:issue.severity,
      title:issue.title,
      detail:issue.detail,
      recommendedCapabilityId:capabilityForHealth(issue.domain),
      source:"project-health",
    });
  }

  if(input.mission.differentiators.length<2) {
    findings.push({
      id:"mission-thin-differentiation",
      domain:"creative-direction",
      severity:"warning",
      title:"Mission differentiation is thin",
      detail:"The mission does not yet carry enough distinct project-specific principles to justify flagship-level variation.",
      recommendedCapabilityId:"environment.art-direct",
      source:"mission",
    });
  }

  if(!input.plan.steps.some((step)=>step.id==="signature-moment")) {
    findings.push({
      id:"signature-missing",
      domain:"signature",
      severity:"blocker",
      title:"No signature moment is protected",
      detail:input.mission.signatureMoment,
      source:"plan",
    });
  }

  for(const visual of input.visualEvidence ?? []) {
    findings.push({
      id:`visual-${visual.id}`,
      domain:"visual-evidence",
      severity:visual.severity,
      title:visual.title,
      detail:visual.detail,
      recommendedCapabilityId:visual.recommendedCapabilityId,
      source:"visual-evidence",
    });
  }

  findings.sort((a,b)=>severityWeight(b.severity)-severityWeight(a.severity) || a.id.localeCompare(b.id));
  const status=findings.some((item)=>item.severity==="blocker") ? "blocked"
    : findings.some((item)=>item.severity==="warning") ? "attention"
      : "clear";
  return {version:1,status,findings,topRepair:findings.find((item)=>Boolean(item.recommendedCapabilityId)) ?? findings[0] ?? null};
}

function capabilityForHealth(domain:ProjectHealthReport["issues"][number]["domain"]) {
  if(domain==="assets") return "asset.improve";
  if(domain==="motion") return "scene.compose-motion";
  if(domain==="mobile") return "scene.fix-mobile";
  return undefined;
}

function healthDomain(domain:ProjectHealthReport["issues"][number]["domain"]):CriticDomain {
  return domain==="structure" ? "creative-direction" : domain;
}

function severityWeight(value:ProjectHealthSeverity) {
  return value==="blocker" ? 3 : value==="warning" ? 2 : 1;
}
