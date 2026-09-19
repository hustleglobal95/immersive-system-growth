import type { LoopCandidateEvidence, LoopDefinition, LoopRunReport } from "@/src/platform/loops/loopSchema";

export interface LoopStopDecision {
  stop:boolean;
  status:"completed"|"stopped"|"escalated";
  reason:string;
}

export function eligibleCandidate(candidate:LoopCandidateEvidence,definition:LoopDefinition) {
  if(candidate.duplicateOf) return false;
  if(definition.acceptance.requireHardGates && candidate.hardGateFailures.length) return false;
  if(definition.acceptance.requireCandidateWin && (!candidate.comparisonAccepted || candidate.comparisonWinner!=="candidate")) return false;
  if((candidate.preferenceAgreement ?? 0) < definition.acceptance.minPreferenceAgreement) return false;
  return true;
}

export function selectTournamentWinner(candidates:LoopCandidateEvidence[],definition:LoopDefinition) {
  return candidates
    .filter((candidate)=>eligibleCandidate(candidate,definition))
    .sort((a,b)=>{
      const agreement=(b.preferenceAgreement ?? 0)-(a.preferenceAgreement ?? 0);
      if(agreement!==0) return agreement;
      const motion=(b.motionScore ?? -Infinity)-(a.motionScore ?? -Infinity);
      if(motion!==0) return motion;
      return a.id.localeCompare(b.id);
    })[0] ?? null;
}

export function evaluateLoopStop(report:LoopRunReport,now=Date.now()):LoopStopDecision|null {
  const budget=report.definition.budgets;
  const elapsed=now-Date.parse(report.startedAt);
  if(budget.maxReportedCostUsd!==undefined && report.reportedCostUsd!==null && report.reportedCostUsd>=budget.maxReportedCostUsd) {
    return { stop:true,status:"stopped",reason:`Reported loop cost reached the $${budget.maxReportedCostUsd.toFixed(2)} budget.` };
  }
  if(elapsed>=budget.maxWallTimeMs) return { stop:true,status:"stopped",reason:"Loop wall-time budget was exhausted." };
  if(report.candidateAttempts>=budget.maxCandidateAttempts) return { stop:true,status:"stopped",reason:"Candidate-attempt budget was exhausted." };
  if(report.noProgressStreak>=budget.noProgressLimit) {
    return { stop:true,status:"completed",reason:"No candidate established a safe improvement over the incumbent. The loop is saturated at the current evidence level." };
  }
  const fingerprints=report.cycles.flatMap((cycle)=>cycle.acceptedFingerprint ? [cycle.acceptedFingerprint] : []);
  const last=fingerprints.at(-1);
  if(last && fingerprints.slice(0,-1).includes(last)) {
    return { stop:true,status:"escalated",reason:"Accepted state fingerprint repeated. Loop oscillation detected; human diagnosis is required." };
  }
  const signatures=report.cycles.flatMap((cycle)=>cycle.candidates.flatMap((candidate)=>candidate.repairSignature ? [candidate.repairSignature] : []));
  const recent=signatures.slice(-Math.max(2,report.definition.strategies.length*2));
  const counts=new Map<string,number>();
  for(const signature of recent) counts.set(signature,(counts.get(signature) ?? 0)+1);
  if([...counts.values()].some((count)=>count>=3) && report.noProgressStreak>0) {
    return { stop:true,status:"escalated",reason:"The same bounded repair keeps recurring without improvement. Escalate the unresolved blocker instead of repeating the edit." };
  }
  if(report.cycles.length>=budget.maxCycles) {
    return { stop:true,status:"completed",reason:report.acceptedImprovements ? "Maximum cycle budget reached after preserving the strongest accepted incumbent." : "Maximum cycle budget reached without a proven improvement." };
  }
  return null;
}

export function compactLoopContext(input:{
  definition:LoopDefinition;
  cycle:number;
  strategyId:string;
  projectContext?:string;
  unresolved?:string[];
  priorRepairs?:string[];
}) {
  const strategy=input.definition.strategies.find((item)=>item.id===input.strategyId);
  const sections=[
    `Forge Loop: ${input.definition.label}`,
    `Objective: ${input.definition.objective}`,
    strategy ? `Candidate strategy: ${strategy.label}. ${strategy.instruction}` : "",
    input.projectContext ? `Project context: ${input.projectContext}` : "",
    input.unresolved?.length ? "Unresolved evidence: " + input.unresolved.slice(0,8).join(" | ") : "",
    input.priorRepairs?.length ? "Do not blindly repeat prior repairs: " + input.priorRepairs.slice(-8).join(" | ") : "",
    "Preserve client facts, semantic structure, primary conversion intent and identity-critical assets unless the loop contract explicitly permits a change.",
    "Return bounded, reversible repairs only. If evidence does not support a safe repair, leave the finding unresolved.",
  ].filter(Boolean);
  return sections.join("\n").slice(0,6000);
}

export function learningCandidate(report:LoopRunReport) {
  if(!report.acceptedImprovements) return "No generalized lesson proposed. The run did not prove an improvement.";
  const winners=report.cycles.flatMap((cycle)=>cycle.candidates.filter((candidate)=>candidate.id===cycle.acceptedCandidateId));
  const strategies=[...new Set(winners.map((winner)=>winner.strategyId))];
  return `Loop evidence suggests ${strategies.join(", ") || "the accepted repair strategy"} improved ${report.loopId} for this project. Keep this project-scoped until the same lesson is independently supported by multiple projects.`;
}
