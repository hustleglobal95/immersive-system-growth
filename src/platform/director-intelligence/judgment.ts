import { z } from "zod";
import type { DirectorJudgmentReport, PlanningDisposition } from "@/src/platform/director-intelligence/types";

const dimension=z.number().finite().min(0).max(10);
const evidenceSchema=z.object({
  source:z.enum(["rendered-external-judge","human-review"]),
  judgeId:z.string().min(1).max(160),
  model:z.string().min(1).max(160).optional(),
  calibrationId:z.string().min(1).max(160).optional(),
  calibrated:z.boolean(),
  captureIds:z.array(z.string().min(1).max(240)).min(1).max(24),
  evidenceHash:z.string().regex(/^[a-f0-9]{64}$/),
}).strict();

const verifiedSchema=z.object({
  status:z.literal("verified"),
  verdict:z.enum(["LOCK","REVISE","REJECT"]),
  confidence:z.number().finite().min(0).max(1),
  confidenceSemantics:z.literal("calibrated-preference"),
  reasons:z.array(z.string().min(1).max(800)).min(1).max(16),
  blockers:z.array(z.string().min(1).max(800)).max(16).default([]),
  dimensions:z.object({
    composition:dimension.optional(),
    hierarchy:dimension.optional(),
    typography:dimension.optional(),
    motion:dimension.optional(),
    camera:dimension.optional(),
    coherence:dimension.optional(),
    brandSpecificity:dimension.optional(),
    emotionalEffect:dimension.optional(),
    usability:dimension.optional(),
  }).strict(),
  findings:z.array(z.object({
    critic:z.enum(["composition","typography","camera","motion","continuity","brand","art-direction","color","lighting","material","image-direction","sound","originality","craft","interaction","mobile","performance"]),
    captureId:z.string().min(1).max(240),
    severity:z.enum(["blocker","major","minor","advisory"]),
    finding:z.string().min(8).max(1200),
    evidence:z.array(z.string().min(1).max(600)).max(12).default([]),
    affectedSystems:z.array(z.string().min(1).max(120)).max(12).default([]),
    repair:z.string().min(8).max(1200),
    confidence:z.number().finite().min(0).max(1),
  }).strict()).max(48).default([]),
  evidence:evidenceSchema,
}).strict().superRefine((value,ctx)=>{
  if(value.evidence.source==="rendered-external-judge" && value.evidence.captureIds.length<2) {
    ctx.addIssue({code:"custom",path:["evidence","captureIds"],message:"Rendered creative judgment requires at least two matched captures."});
  }
  if(!value.evidence.calibrated || !value.evidence.calibrationId) {
    ctx.addIssue({code:"custom",path:["evidence"],message:"Verified creative judgment must identify a calibration run."});
  }
  if(value.verdict==="LOCK" && value.blockers.length) {
    ctx.addIssue({code:"custom",path:["blockers"],message:"A LOCK judgment cannot contain unresolved blockers."});
  }
  const captureIds=new Set(value.evidence.captureIds);
  value.findings.forEach((finding,index)=>{
    if(!captureIds.has(finding.captureId)) {
      ctx.addIssue({code:"custom",path:["findings",index,"captureId"],message:"Director finding must reference one of the rendered captures used as judgment evidence."});
    }
  });
});

const unverifiedSchema=z.object({
  status:z.literal("unverified"),
  verdict:z.literal("UNVERIFIED"),
  confidence:z.null(),
  confidenceSemantics:z.literal("none"),
  reasons:z.array(z.string().min(1).max(800)).min(1).max(16),
  blockers:z.array(z.string().min(1).max(800)).max(16).default([]),
  dimensions:z.object({}).strict().default({}),
  findings:z.array(z.never()).max(0).default([]),
  evidence:z.null(),
}).strict();

export const directorJudgmentSchema=z.discriminatedUnion("status",[verifiedSchema,unverifiedSchema]);

export function parseDirectorJudgment(input:unknown):DirectorJudgmentReport {
  return directorJudgmentSchema.parse(input) as DirectorJudgmentReport;
}

export function unverifiedDirectorJudgment(reason="No rendered, calibrated creative judgment has been supplied."):DirectorJudgmentReport {
  return {
    status:"unverified",
    verdict:"UNVERIFIED",
    confidence:null,
    confidenceSemantics:"none",
    reasons:[reason],
    blockers:[],
    dimensions:{},
    findings:[],
    evidence:null,
  };
}

export function judgmentPermitsProduction(planningDisposition:PlanningDisposition,judgment:DirectorJudgmentReport) {
  return planningDisposition==="ADVANCE" &&
    judgment.status==="verified" &&
    judgment.verdict==="LOCK" &&
    judgment.evidence?.calibrated===true &&
    judgment.confidence!==null;
}
