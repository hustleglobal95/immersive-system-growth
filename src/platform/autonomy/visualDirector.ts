import { z } from "zod";
import type { RenderReviewCapture, VisualCriticDimension, VisualCriticFinding } from "@/src/platform/autonomy/visualReview";
import type { PairwiseJudgment } from "@/src/platform/autonomy/forcedOptimization";

export const visualCriticFindingSchema=z.object({
  critic:z.enum(["composition","typography","camera","motion","continuity","brand","interaction","mobile","performance"]),
  captureId:z.string().min(1).max(240),
  severity:z.enum(["blocker","major","minor","advisory"]),
  finding:z.string().min(8).max(1200),
  evidence:z.array(z.string().min(1).max(600)).max(12).default([]),
  affectedSystems:z.array(z.string().min(1).max(120)).max(12).default([]),
  repair:z.string().min(8).max(1200),
  confidence:z.number().min(0).max(1),
}).strict();

export const visualDirectorResponseSchema=z.object({
  findings:z.array(visualCriticFindingSchema).max(48),
  summary:z.string().max(2400).optional(),
}).strict();

export const pairwiseVisualResponseSchema=z.object({
  winner:z.enum(["first","second","tie"]),
  confidence:z.number().min(0).max(1),
  reasons:z.array(z.string().min(1).max(800)).min(1).max(12),
  hardGateFailures:z.array(z.string().min(1).max(500)).max(12).default([]),
}).strict();

export interface SpecialistCriticBrief {
  id: VisualCriticDimension;
  objective: string;
  checks: string[];
  prohibited: string[];
}

export interface CaptureCriticRequest {
  version:1;
  mode:"single";
  capture:RenderReviewCapture;
  projectContext:string;
  criticBriefs:SpecialistCriticBrief[];
  rules:string[];
}

export interface PairwiseCriticRequest {
  version:1;
  mode:"pairwise";
  captureId:string;
  firstId:string;
  secondId:string;
  projectContext:string;
  rules:string[];
}

export const specialistCriticBriefs:SpecialistCriticBrief[]=[
  {
    id:"composition",
    objective:"Judge focal hierarchy, negative space, balance, crop and whether one dominant subject owns the frame.",
    checks:["One dominant focal point","Copy and subject do not fight","Intentional negative space","No accidental edge collisions or cramped framing"],
    prohibited:["Do not reward visual complexity by itself","Do not suggest generic premium styling"],
  },
  {
    id:"typography",
    objective:"Judge reading order, line breaks, measure, scale, contrast and timing relationship to visual motion.",
    checks:["Headline reads in intended order","Line breaks feel authored","Copy remains legible over media","Typography does not compete with signature motion"],
    prohibited:["Do not rasterize essential copy","Do not recommend decoration without a reading-order reason"],
  },
  {
    id:"camera",
    objective:"Judge lens character, framing, motivated travel, subject perspective and whether the move feels photographed rather than demo-orbit driven.",
    checks:["Lens supports subject","Travel has narrative purpose","Perspective remains believable","Camera settles before information-heavy moments"],
    prohibited:["Do not recommend perpetual orbit","Do not add movement merely to increase activity"],
  },
  {
    id:"motion",
    objective:"Judge timing, easing, mechanical smoothness, contrast between stillness and motion, and simultaneous attention demands.",
    checks:["One attention-driving motion system owns the moment","Motion has clear setup/payoff","No jerky handoff","Copy timing supports camera timing"],
    prohibited:["Do not increase motion density to solve weak composition","Do not make every element animate"],
  },
  {
    id:"continuity",
    objective:"Judge scene-to-scene handoff, persistent anchors, transition motivation and reverse-scroll coherence.",
    checks:["Visual anchor survives the handoff","Incoming scene inherits a meaningful state","No arbitrary reset","Reverse traversal remains plausible"],
    prohibited:["Do not default to opacity fades when a spatial handoff is available"],
  },
  {
    id:"brand",
    objective:"Judge whether the frame feels project-specific rather than transferable to a competitor.",
    checks:["Prompt thesis is visible","Category cliché density is controlled","Signature mechanism belongs to the project","Proof supports the brand/product claim"],
    prohibited:["Do not praise generic luxury/cinematic language as specificity"],
  },
  {
    id:"interaction",
    objective:"Judge whether the obvious action is legible, useful and subordinate to the primary narrative.",
    checks:["One obvious next action","Exploration does not obscure conversion","Pointer/touch behavior has a purpose","No competing controls"],
    prohibited:["Do not add interaction solely for novelty"],
  },
  {
    id:"mobile",
    objective:"Judge whether portrait layout preserves the defining idea, evidence order, primary action and usable framing.",
    checks:["Concept survives medium reduction","No essential desktop-only hover","Primary subject remains framed","Primary action remains reachable"],
    prohibited:["Do not accept a merely shrunken desktop composition"],
  },
  {
    id:"performance",
    objective:"Judge visible first-use hitches, late assets, decode/compile stalls and effects that appear too expensive for their value.",
    checks:["No first-reveal hitch","No late pop-in at handoff","Expensive effect strengthens concept","Idle state can settle"],
    prohibited:["Do not recommend removing the defining idea before cheaper fidelity reductions are considered"],
  },
];

export function buildCaptureCriticRequest(input:{
  capture:RenderReviewCapture;
  projectContext:string;
  dimensions?:VisualCriticDimension[];
}):CaptureCriticRequest {
  const requested=new Set(input.dimensions ?? specialistCriticBriefs.map((item)=>item.id));
  return {
    version:1,
    mode:"single",
    capture:input.capture,
    projectContext:input.projectContext,
    criticBriefs:specialistCriticBriefs.filter((item)=>requested.has(item.id)),
    rules:[
      "Judge the rendered frame, not the elegance of its code.",
      "Return location-specific findings with concrete evidence and a repair instruction.",
      "Prefer comparative, actionable diagnosis over scalar aesthetic scoring.",
      "Use blocker only when the frame cannot be considered production-ready.",
      "Do not invent product facts, brand guidelines or unseen interactions.",
    ],
  };
}

export function parseVisualDirectorResponse(value:unknown,captureId:string):{ findings:VisualCriticFinding[]; summary?:string } {
  const parsed=visualDirectorResponseSchema.parse(value);
  return {
    ...parsed,
    findings:parsed.findings.map((finding)=>({ ...finding,captureId })),
  };
}

export function buildPairwiseCriticRequests(input:{
  captureId:string;
  incumbentId:string;
  candidateId:string;
  projectContext:string;
}):[PairwiseCriticRequest,PairwiseCriticRequest] {
  const rules=[
    "Choose the version that better satisfies the project context and professional craft.",
    "Do not reward novelty or complexity by itself.",
    "Treat broken functionality, missing content, overflow or illegibility as hard-gate failures.",
    "If neither is reliably better, return tie.",
  ];
  return [
    { version:1,mode:"pairwise",captureId:input.captureId,firstId:input.incumbentId,secondId:input.candidateId,projectContext:input.projectContext,rules },
    { version:1,mode:"pairwise",captureId:input.captureId,firstId:input.candidateId,secondId:input.incumbentId,projectContext:input.projectContext,rules },
  ];
}

export function pairwiseJudgmentFromResponse(input:{
  judgeId:string;
  request:PairwiseCriticRequest;
  response:unknown;
}):PairwiseJudgment {
  const parsed=pairwiseVisualResponseSchema.parse(input.response);
  const winnerId=parsed.winner==="first" ? input.request.firstId : parsed.winner==="second" ? input.request.secondId : undefined;
  return {
    judgeId:input.judgeId,
    firstId:input.request.firstId,
    secondId:input.request.secondId,
    winnerId,
    hardGateFailures:parsed.hardGateFailures,
    reasons:parsed.reasons,
    confidence:parsed.confidence,
  };
}
