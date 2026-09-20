import { createHash } from "node:crypto";
import { z } from "zod";
import { parseDirectorJudgment, unverifiedDirectorJudgment } from "@/src/platform/director-intelligence/judgment";
import type { DirectorJudgmentReport } from "@/src/platform/director-intelligence/types";

const captureSchema=z.object({
  id:z.string().min(1).max(240),
  mimeType:z.enum(["image/png","image/jpeg","image/webp"]),
  data:z.string().min(32).max(12_000_000),
}).strict();

const inputSchema=z.object({
  projectContext:z.string().min(1).max(4000),
  planningDisposition:z.enum(["ADVANCE","REVISE","RESEARCH REQUIRED","ASSET BLOCKED","REJECT"]),
  treatment:z.object({
    thesis:z.string().min(1).max(1600),
    selectedTerritoryId:z.string().min(1).max(160),
  }).passthrough(),
  captures:z.array(captureSchema).min(2).max(12),
}).strict();

const responseSchema=z.object({
  judgeId:z.string().min(1).max(160),
  model:z.string().min(1).max(160).optional(),
  verdict:z.enum(["LOCK","REVISE","REJECT"]),
  confidence:z.number().finite().min(0).max(1),
  reasons:z.array(z.string().min(1).max(800)).min(1).max(16),
  blockers:z.array(z.string().min(1).max(800)).max(16).default([]),
  dimensions:z.object({
    composition:z.number().min(0).max(10).optional(),
    hierarchy:z.number().min(0).max(10).optional(),
    typography:z.number().min(0).max(10).optional(),
    motion:z.number().min(0).max(10).optional(),
    camera:z.number().min(0).max(10).optional(),
    coherence:z.number().min(0).max(10).optional(),
    brandSpecificity:z.number().min(0).max(10).optional(),
    emotionalEffect:z.number().min(0).max(10).optional(),
    usability:z.number().min(0).max(10).optional(),
  }).strict(),
}).strict();

export type DirectorJudgeInput=z.infer<typeof inputSchema>;

export function directorJudgeConfigured(environment:NodeJS.ProcessEnv=process.env) {
  return Boolean(environment.FORGE_DIRECTOR_JUDGE_URL && environment.FORGE_DIRECTOR_JUDGE_CALIBRATION_ID);
}

export async function runDirectorJudge(rawInput:unknown,environment:NodeJS.ProcessEnv=process.env):Promise<DirectorJudgmentReport> {
  const input=inputSchema.parse(rawInput);
  const url=environment.FORGE_DIRECTOR_JUDGE_URL;
  const calibrationId=environment.FORGE_DIRECTOR_JUDGE_CALIBRATION_ID;
  if(!url || !calibrationId) return unverifiedDirectorJudgment("Rendered Director judgment is not configured. FORGE_DIRECTOR_JUDGE_URL and FORGE_DIRECTOR_JUDGE_CALIBRATION_ID are required.");

  const response=await fetch(url,{
    method:"POST",
    headers:{
      "content-type":"application/json",
      ...(environment.FORGE_DIRECTOR_JUDGE_TOKEN?{authorization:"Bearer "+environment.FORGE_DIRECTOR_JUDGE_TOKEN}:{}),
    },
    body:JSON.stringify({
      version:1,
      task:"forge-director-rendered-judgment",
      rubric:{
        rule:"Judge only what the supplied rendered evidence supports. Do not infer unseen states.",
        dimensions:["composition","hierarchy","typography","motion","camera","coherence","brandSpecificity","emotionalEffect","usability"],
        lock:"LOCK only when the rendered direction is production-worthy, specific to the brief, and has no material visual blocker.",
      },
      projectContext:input.projectContext,
      planningDisposition:input.planningDisposition,
      treatment:input.treatment,
      captures:input.captures.map((capture)=>({id:capture.id,mimeType:capture.mimeType,data:capture.data})),
    }),
    signal:AbortSignal.timeout(45_000),
  });
  if(!response.ok) throw new Error("Director judge failed with HTTP "+response.status);
  const raw=responseSchema.parse(await response.json());
  const evidenceHash=hashEvidence(input.captures);
  return parseDirectorJudgment({
    status:"verified",
    verdict:raw.verdict,
    confidence:raw.confidence,
    confidenceSemantics:"calibrated-preference",
    reasons:raw.reasons,
    blockers:raw.blockers,
    dimensions:raw.dimensions,
    evidence:{
      source:"rendered-external-judge",
      judgeId:raw.judgeId,
      model:raw.model,
      calibrationId,
      calibrated:true,
      captureIds:input.captures.map((capture)=>capture.id),
      evidenceHash,
    },
  });
}

function hashEvidence(captures:DirectorJudgeInput["captures"]) {
  const hash=createHash("sha256");
  for(const capture of [...captures].sort((a,b)=>a.id.localeCompare(b.id))) {
    hash.update(capture.id);
    hash.update("\0");
    hash.update(capture.mimeType);
    hash.update("\0");
    hash.update(capture.data);
    hash.update("\0");
  }
  return hash.digest("hex");
}
