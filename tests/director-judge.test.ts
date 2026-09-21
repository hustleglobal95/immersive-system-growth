import assert from "node:assert/strict";
import test from "node:test";
import { parseDirectorJudgeCalibration } from "../src/platform/director-intelligence/judgeCalibration";
import { directorJudgeConfigured, runDirectorJudge } from "../src/platform/director-intelligence/judgeClient";

const input={
  projectContext:"Aurelia Tower — premium waterfront residence",
  scopeFingerprint:"forge1:1234567890abcdef",
  planningDisposition:"ADVANCE" as const,
  treatment:{thesis:"Elevation becomes a progressive separation from city noise.",selectedTerritoryId:"ascent"},
  captures:[
    {id:"arrival",mimeType:"image/png" as const,data:"a".repeat(64)},
    {id:"signature",mimeType:"image/png" as const,data:"b".repeat(64)},
  ],
};

test("Director judge stays unverified without a measured calibration record",async()=>{
  const result=await runDirectorJudge(input,{});
  assert.equal(result.status,"unverified");
  assert.equal(result.verdict,"UNVERIFIED");
  assert.equal(result.confidence,null);
  assert.equal(result.evidence,null);
});

test("Director judge calibration requires meaningful human benchmark performance",()=>{
  const valid=parseDirectorJudgeCalibration({
    version:1,id:"cal-v1",judgeId:"visual-director-v1",benchmarkSetId:"human-pairs-v1",
    reviewedAt:"2026-09-20T20:00:00.000Z",sampleSize:40,pairwiseAgreement:.82,lockPrecision:.9,falseLockRate:.05,reviewer:"creative-director",
  });
  assert.equal(valid.id,"cal-v1");
  assert.throws(()=>parseDirectorJudgeCalibration({
    version:1,id:"weak",judgeId:"visual-director-v1",benchmarkSetId:"human-pairs-v1",
    reviewedAt:"2026-09-20T20:00:00.000Z",sampleSize:10,pairwiseAgreement:.61,lockPrecision:.65,falseLockRate:.3,reviewer:"creative-director",
  }));
});


test("Director judge can use AI Gateway directly while preserving calibrated identity",async()=>{
  const calibration=JSON.stringify({
    version:1,
    id:"gateway-cal-v1",
    judgeId:"ai-gateway:openai/gpt-5.4",
    benchmarkSetId:"human-pairs-v1",
    reviewedAt:"2026-09-20T20:00:00.000Z",
    sampleSize:40,
    pairwiseAgreement:.82,
    lockPrecision:.9,
    falseLockRate:.05,
    reviewer:"creative-director",
  });
  const environment={
    AI_GATEWAY_API_KEY:"gateway-key",
    FORGE_AI_GATEWAY_DIRECTOR_MODEL:"openai/gpt-5.4",
    FORGE_DIRECTOR_JUDGE_CALIBRATION_JSON:calibration,
  };
  assert.equal(directorJudgeConfigured(environment),true);
  let requestBody:Record<string,unknown>|null=null;
  const result=await runDirectorJudge(input,environment,async(_url,init)=>{
    requestBody=JSON.parse(String(init?.body));
    return new Response(JSON.stringify({
      choices:[{message:{content:JSON.stringify({
        verdict:"LOCK",
        confidence:.9,
        reasons:["The rendered direction is coherent, specific and production-ready."],
        blockers:[],
        findings:[],
        dimensions:{composition:9,hierarchy:9,typography:8.7,motion:8.5,camera:8.8,coherence:9,brandSpecificity:8.6,emotionalEffect:8.8,usability:8.7},
      })}}],
    }),{status:200,headers:{"content-type":"application/json"}});
  });
  assert.equal(result.status,"verified");
  assert.equal(result.verdict,"LOCK");
  assert.equal(result.evidence?.judgeId,"ai-gateway:openai/gpt-5.4");
  assert.equal(result.evidence?.calibrationId,"gateway-cal-v1");
  assert.equal((requestBody as {response_format?:{type?:string}}).response_format?.type,"json_schema");
});

test("AI Gateway Director judge refuses calibration for a different judge identity",async()=>{
  const environment={
    AI_GATEWAY_API_KEY:"gateway-key",
    FORGE_AI_GATEWAY_DIRECTOR_MODEL:"openai/gpt-5.4",
    FORGE_DIRECTOR_JUDGE_CALIBRATION_JSON:JSON.stringify({
      version:1,id:"wrong-cal",judgeId:"different-judge",benchmarkSetId:"human-pairs-v1",
      reviewedAt:"2026-09-20T20:00:00.000Z",sampleSize:40,pairwiseAgreement:.82,lockPrecision:.9,falseLockRate:.05,reviewer:"creative-director",
    }),
  };
  await assert.rejects(()=>runDirectorJudge(input,environment,async()=>new Response(JSON.stringify({
    choices:[{message:{content:JSON.stringify({
      verdict:"REVISE",
      confidence:.85,
      reasons:["Revision needed."],
      blockers:["Hierarchy requires revision."],
      findings:[],
      dimensions:{composition:7},
    })}}],
  }),{status:200,headers:{"content-type":"application/json"}})),/identity does not match/i);
});
