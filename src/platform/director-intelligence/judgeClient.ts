import { createHash } from "node:crypto";
import { z } from "zod";
import { parseDirectorJudgment, unverifiedDirectorJudgment } from "@/src/platform/director-intelligence/judgment";
import { parseDirectorJudgeCalibration } from "@/src/platform/director-intelligence/judgeCalibration";
import type { DirectorJudgmentReport } from "@/src/platform/director-intelligence/types";

const captureSchema=z.object({
  id:z.string().min(1).max(240),
  mimeType:z.enum(["image/png","image/jpeg","image/webp"]),
  data:z.string().min(32).max(12_000_000),
}).strict();

const inputSchema=z.object({
  projectContext:z.string().min(1).max(4000),
  scopeFingerprint:z.string().regex(/^forge1:[a-f0-9]{16}$/),
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
const gatewayResponseSchema=responseSchema.omit({judgeId:true,model:true});

export type DirectorJudgeInput=z.infer<typeof inputSchema>;
export type DirectorJudgeEnvironment=Record<string,string|undefined>;

export function directorJudgeConfigured(environment:DirectorJudgeEnvironment=process.env) {
  const judgeBackend=Boolean(environment.FORGE_DIRECTOR_JUDGE_URL || environment.AI_GATEWAY_API_KEY || environment.VERCEL_OIDC_TOKEN);
  return Boolean(judgeBackend && environment.FORGE_DIRECTOR_JUDGE_CALIBRATION_JSON);
}

export async function runDirectorJudge(rawInput:unknown,environment:DirectorJudgeEnvironment=process.env,fetchImpl:typeof fetch=fetch):Promise<DirectorJudgmentReport> {
  const input=inputSchema.parse(rawInput);
  const url=environment.FORGE_DIRECTOR_JUDGE_URL;
  const calibrationJson=environment.FORGE_DIRECTOR_JUDGE_CALIBRATION_JSON;
  const gatewayToken=environment.AI_GATEWAY_API_KEY || environment.VERCEL_OIDC_TOKEN;
  if(!calibrationJson || (!url && !gatewayToken)) return unverifiedDirectorJudgment("Rendered Director judgment is not configured. Provide a calibrated custom judge URL or AI Gateway credentials plus FORGE_DIRECTOR_JUDGE_CALIBRATION_JSON.");
  const calibration=parseDirectorJudgeCalibration(JSON.parse(calibrationJson));

  const raw=url
    ? await callCustomDirectorJudge(input,environment,url,fetchImpl)
    : await callGatewayDirectorJudge(input,environment,gatewayToken!,fetchImpl);

  if(raw.judgeId!==calibration.judgeId) throw new Error("Director judge identity does not match the calibrated judge record.");
  const evidenceHash=hashEvidence(input.captures);
  return parseDirectorJudgment({
    status:"verified",
    verdict:raw.verdict,
    confidence:raw.confidence,
    confidenceSemantics:"calibrated-preference",
    reasons:raw.reasons,
    blockers:raw.blockers,
    dimensions:raw.dimensions,
    findings:raw.findings,
    evidence:{
      source:"rendered-external-judge",
      judgeId:raw.judgeId,
      model:raw.model,
      calibrationId:calibration.id,
      calibrated:true,
      captureIds:input.captures.map((capture)=>capture.id),
      evidenceHash,
      scopeFingerprint:input.scopeFingerprint,
    },
  });
}

async function callCustomDirectorJudge(input:DirectorJudgeInput,environment:DirectorJudgeEnvironment,url:string,fetchImpl:typeof fetch) {
  const response=await fetchImpl(url,{
    method:"POST",
    headers:{
      "content-type":"application/json",
      ...(environment.FORGE_DIRECTOR_JUDGE_TOKEN?{authorization:"Bearer "+environment.FORGE_DIRECTOR_JUDGE_TOKEN}:{}),
    },
    body:JSON.stringify({
      version:1,
      task:"forge-director-rendered-judgment",
      rubric:directorRubric(),
      projectContext:input.projectContext,
      scopeFingerprint:input.scopeFingerprint,
      planningDisposition:input.planningDisposition,
      treatment:input.treatment,
      captures:input.captures.map((capture)=>({id:capture.id,mimeType:capture.mimeType,data:capture.data})),
    }),
    signal:AbortSignal.timeout(45_000),
  });
  if(!response.ok) throw new Error("Director judge failed with HTTP "+response.status);
  return responseSchema.parse(await response.json());
}

async function callGatewayDirectorJudge(input:DirectorJudgeInput,environment:DirectorJudgeEnvironment,token:string,fetchImpl:typeof fetch) {
  const model=environment.FORGE_AI_GATEWAY_DIRECTOR_MODEL?.trim() || environment.FORGE_AI_GATEWAY_VISUAL_MODEL?.trim() || "openai/gpt-5.6-sol";
  const judgeId="ai-gateway:"+model;
  const content:Array<Record<string,unknown>>=[
    {type:"text",text:[
      "You are Forge's calibrated rendered creative Director judge.",
      directorRubric().rule,
      directorRubric().lock,
      directorRubric().findings,
      "Project context: "+input.projectContext,
      "Planning disposition: "+input.planningDisposition,
      "Treatment: "+JSON.stringify(input.treatment),
      "Judge every finding against a supplied capture id. Never invent unseen states.",
    ].join("\n\n")},
  ];
  for(const capture of input.captures) {
    content.push({type:"text",text:"Capture id: "+capture.id});
    content.push({type:"image_url",image_url:{url:"data:"+capture.mimeType+";base64,"+capture.data}});
  }
  const response=await fetchImpl("https://ai-gateway.vercel.sh/v1/chat/completions",{
    method:"POST",
    headers:{authorization:"Bearer "+token,"content-type":"application/json"},
    body:JSON.stringify({
      model,
      messages:[{role:"user",content}],
      response_format:{
        type:"json_schema",
        json_schema:{
          name:"forge_director_rendered_judgment",
          description:"Evidence-bound rendered creative judgment for Forge.",
          schema:gatewayDirectorJsonSchema(),
        },
      },
    }),
    signal:AbortSignal.timeout(45_000),
  });
  if(!response.ok) throw new Error("AI Gateway Director judge failed ("+response.status+"): "+(await response.text()).slice(0,300));
  const payload=await response.json() as {choices?:Array<{message?:{content?:string|null}}>} ;
  const text=payload.choices?.[0]?.message?.content;
  if(!text) throw new Error("AI Gateway Director judge returned no structured content");
  const parsed=gatewayResponseSchema.parse(JSON.parse(text));
  return responseSchema.parse({...parsed,judgeId,model});
}

function directorRubric() {
  return {
    rule:"Judge only what the supplied rendered evidence supports. Do not infer unseen states.",
    dimensions:["composition","hierarchy","typography","motion","camera","coherence","brandSpecificity","emotionalEffect","usability"],
    lock:"LOCK only when the rendered direction is production-worthy, specific to the brief, and has no material visual blocker.",
    findings:"For every material REVISE concern, return a capture-scoped finding with concrete evidence and a bounded repair instruction. Do not invent unseen states.",
  };
}

function gatewayDirectorJsonSchema() {
  const finding={
    type:"object",
    properties:{
      critic:{type:"string",enum:["composition","typography","camera","motion","continuity","brand","art-direction","color","lighting","material","image-direction","sound","originality","craft","interaction","mobile","performance"]},
      captureId:{type:"string"},
      severity:{type:"string",enum:["blocker","major","minor","advisory"]},
      finding:{type:"string"},
      evidence:{type:"array",items:{type:"string"}},
      affectedSystems:{type:"array",items:{type:"string"}},
      repair:{type:"string"},
      confidence:{type:"number",minimum:0,maximum:1},
    },
    required:["critic","captureId","severity","finding","evidence","affectedSystems","repair","confidence"],
    additionalProperties:false,
  };
  const dimensions={
    type:"object",
    properties:Object.fromEntries(["composition","hierarchy","typography","motion","camera","coherence","brandSpecificity","emotionalEffect","usability"].map((key)=>[key,{type:"number",minimum:0,maximum:10}])),
    additionalProperties:false,
  };
  return {
    type:"object",
    properties:{
      verdict:{type:"string",enum:["LOCK","REVISE","REJECT"]},
      confidence:{type:"number",minimum:0,maximum:1},
      reasons:{type:"array",items:{type:"string"},minItems:1,maxItems:16},
      blockers:{type:"array",items:{type:"string"},maxItems:16},
      findings:{type:"array",items:finding,maxItems:48},
      dimensions,
    },
    required:["verdict","confidence","reasons","blockers","findings","dimensions"],
    additionalProperties:false,
  };
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
