import { immersiveConstructionPatterns } from "@/src/platform/director-intelligence/constructionKnowledge";
import { doctrineForPatterns } from "@/src/platform/director-intelligence/technicalDoctrine";
import type { AutonomyProjectType } from "@/src/platform/autonomy/types";

export type GuidanceDecision =
  | "brief"
  | "territory"
  | "asset"
  | "camera"
  | "motion"
  | "transition"
  | "interaction"
  | "mobile"
  | "performance"
  | "visual-repair";

export interface DecisionGuidance {
  decision: GuidanceDecision;
  patternIds: string[];
  patternTitles: string[];
  directives: string[];
  avoid: string[];
  doctrineIds: string[];
  doctrinePrinciples: string[];
  confidence: number;
}

const decisionSignals: Record<GuidanceDecision,string[]> = {
  brief: ["story","journey","product","brand","property","hospitality","portfolio"],
  territory: ["concept","signature","memory","distinctive","narrative","cinematic"],
  asset: ["asset","model","image","video","texture","material","photography","geometry"],
  camera: ["camera","lens","framing","orbit","dolly","crane","macro","corridor","threshold"],
  motion: ["motion","scroll","scrub","timing","spring","velocity","animation","assembly"],
  transition: ["transition","handoff","threshold","occlusion","wipe","reveal","continuity"],
  interaction: ["interaction","cursor","drag","hover","gesture","hotspot","pointer","inspect"],
  mobile: ["mobile","touch","portrait","reduced","fallback","coarse pointer"],
  performance: ["performance","prewarm","shader","texture","render","frame","decode","gpu","budget"],
  "visual-repair": ["hierarchy","composition","typography","camera","motion","continuity","focal","overlap","negative space"],
};

export function routeDecisionGuidance(input: {
  decision: GuidanceDecision;
  context: string;
  projectType?: AutonomyProjectType;
  limit?: number;
}): DecisionGuidance {
  const lower = input.context.toLowerCase();
  const decisionTerms = decisionSignals[input.decision];
  const ranked = immersiveConstructionPatterns
    .map((pattern) => {
      const signalScore = pattern.signals.reduce((score,signal) => score + (lower.includes(signal) ? Math.max(1,signal.split(/\s+/).length) : 0),0);
      const decisionScore = decisionTerms.reduce((score,signal) => score + (pattern.signals.includes(signal) || lower.includes(signal) ? 0.4 : 0),0);
      const projectScore = !input.projectType || !pattern.projectTypes?.length ? 0.2 : pattern.projectTypes.includes(input.projectType) ? 1.5 : -0.5;
      return { pattern, score: signalScore + decisionScore + projectScore };
    })
    .sort((a,b) => b.score-a.score)
    .filter((item) => item.score > 0)
    .slice(0,input.limit ?? 6);

  const selected = ranked.length ? ranked : immersiveConstructionPatterns.slice(0,Math.min(3,input.limit ?? 6)).map((pattern) => ({ pattern, score: 0.2 }));
  const patternIds = selected.map((item) => item.pattern.id);
  const doctrine = doctrineForPatterns(patternIds);
  const directives = unique(selected.flatMap((item) => directivesFor(input.decision,item.pattern)));
  const avoid = unique(selected.flatMap((item) => item.pattern.avoid)).slice(0,8);
  const maxScore = Math.max(...selected.map((item) => item.score),0.2);
  return {
    decision: input.decision,
    patternIds,
    patternTitles: selected.map((item) => item.pattern.title),
    directives: directives.slice(0,12),
    avoid,
    doctrineIds: doctrine.map((item) => item.id),
    doctrinePrinciples: unique(doctrine.flatMap((item) => item.principles)).slice(0,10),
    confidence: Number(Math.min(0.96,0.5 + maxScore * 0.08).toFixed(2)),
  };
}

function directivesFor(decision: GuidanceDecision, pattern: (typeof immersiveConstructionPatterns)[number]) {
  if (decision === "camera") return pattern.composition.concat(pattern.motion);
  if (decision === "motion") return pattern.motion.concat(pattern.transitions);
  if (decision === "transition") return pattern.transitions.concat(pattern.composition);
  if (decision === "interaction") return pattern.interaction.concat(pattern.motion);
  if (decision === "mobile") return pattern.mobile.concat(pattern.composition);
  if (decision === "performance") return pattern.implementation.concat(pattern.mobile);
  if (decision === "asset") return pattern.implementation.concat(pattern.composition);
  if (decision === "visual-repair") return pattern.composition.concat(pattern.motion,pattern.transitions);
  return pattern.composition.concat(pattern.motion,pattern.interaction);
}
function unique<T>(values:T[]) { return [...new Set(values.filter(Boolean))]; }
