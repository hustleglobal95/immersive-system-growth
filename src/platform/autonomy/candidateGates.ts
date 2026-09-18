export interface CandidateGateInput {
  visualHardGateFailures?:string[];
  judgeHardGateFailures?:string[];
  missingMatchedCaptures?:string[];
  functionalHardGateFailures?:string[];
  candidateMotionHardGateFailures?:string[];
  incumbentMotionScore?:number|null;
  candidateMotionScore?:number|null;
  maxMotionRegression?:number;
}

export interface CandidateGateReport {
  passed:boolean;
  failures:string[];
  motionRegression:string[];
}

export function evaluateCandidateGates(input:CandidateGateInput):CandidateGateReport {
  const regressionLimit=input.maxMotionRegression ?? 3;
  const incumbent=numberOrNull(input.incumbentMotionScore);
  const candidate=numberOrNull(input.candidateMotionScore);
  const motionRegression=incumbent!==null && candidate!==null && candidate<incumbent-regressionLimit
    ? ["motion quality regressed from "+incumbent+" to "+candidate]
    : [];
  const failures=[...new Set([
    ...(input.visualHardGateFailures ?? []),
    ...(input.judgeHardGateFailures ?? []),
    ...(input.missingMatchedCaptures ?? []).map((id)=>id+": missing matched A/B capture"),
    ...(input.functionalHardGateFailures ?? []),
    ...(input.candidateMotionHardGateFailures ?? []),
    ...motionRegression,
  ].filter(Boolean))];
  return { passed:failures.length===0,failures,motionRegression };
}

function numberOrNull(value:number|null|undefined) {
  return typeof value==="number" && Number.isFinite(value) ? value : null;
}
