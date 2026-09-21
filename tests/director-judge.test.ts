import assert from "node:assert/strict";
import test from "node:test";
import { parseDirectorJudgeCalibration } from "../src/platform/director-intelligence/judgeCalibration";
import { runDirectorJudge } from "../src/platform/director-intelligence/judgeClient";

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
