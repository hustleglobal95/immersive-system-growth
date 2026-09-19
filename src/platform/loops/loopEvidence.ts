import { createHash } from "node:crypto";
import { loopRunReportSchema, type LoopDefinition, type LoopRunReport } from "@/src/platform/loops/loopSchema";

export function sha256Text(value:string) { return createHash("sha256").update(value).digest("hex"); }

export function createLoopRunReport(input:{
  runId:string;
  definition:LoopDefinition;
  projectId?:string;
  sourceVersionId?:string;
  source:string;
  baselineFingerprint:string;
  startedAt?:string;
}):LoopRunReport {
  const startedAt=input.startedAt ?? new Date().toISOString();
  return loopRunReportSchema.parse({
    version:1,
    runId:input.runId,
    loopId:input.definition.id,
    projectId:input.projectId,
    sourceVersionId:input.sourceVersionId,
    objective:input.definition.objective,
    status:"running",
    startedAt,
    source:input.source,
    definition:input.definition,
    baselineFingerprint:input.baselineFingerprint,
    currentFingerprint:input.baselineFingerprint,
    acceptedImprovements:0,
    candidateAttempts:0,
    noProgressStreak:0,
    reportedCostUsd:null,
    cycles:[],
    humanApprovalRequired:true,
  });
}

export function repairPlanSignature(plan:unknown) {
  if(!plan || typeof plan!=="object") return undefined;
  const commands=Array.isArray((plan as { commands?:unknown }).commands) ? (plan as { commands:unknown[] }).commands : [];
  if(!commands.length) return undefined;
  return sha256Text(JSON.stringify(commands));
}
