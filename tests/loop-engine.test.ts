import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { executableLoopDefinitions, loopDefinition, loopDefinitions } from "../src/platform/loops/loopRegistry";
import { createLoopRunReport } from "../src/platform/loops/loopEvidence";
import { compactLoopContext, eligibleCandidate, evaluateLoopStop, learningCandidate, selectTournamentWinner } from "../src/platform/loops/loopRunner";
import type { LoopCandidateEvidence, LoopRunReport } from "../src/platform/loops/loopSchema";

test("Loop Engine exposes only workers that have production-safe executors",()=>{
  assert.deepEqual(executableLoopDefinitions().map((item)=>item.id),["visual-polish","mobile-translation","motion-polish"]);
  assert.equal(loopDefinitions.length,6);
  assert.equal(loopDefinition("performance")?.executable,false);
  assert.equal(loopDefinition("construction")?.executable,false);
  for(const definition of loopDefinitions) {
    assert.equal(definition.acceptance.requireHardGates,true);
    assert.equal(definition.acceptance.requireCandidateWin,true);
    assert.equal(definition.memory.forgeLearning,"manual-promotion");
    assert.ok(definition.humanGates.some((gate)=>/Never overwrite/i.test(gate)));
  }
});

test("candidate tournament rejects hard-gate failures, duplicates and weak preferences",()=>{
  const definition=loopDefinition("visual-polish")!;
  const candidates:LoopCandidateEvidence[]=[
    candidate("hard","hierarchy-first",{ comparisonAccepted:true,comparisonWinner:"candidate",preferenceAgreement:.99,hardGateFailures:["mobile overflow"] }),
    candidate("duplicate","camera-first",{ comparisonAccepted:true,comparisonWinner:"candidate",preferenceAgreement:.98,duplicateOf:"hard" }),
    candidate("weak","cadence-first",{ comparisonAccepted:true,comparisonWinner:"candidate",preferenceAgreement:.6,motionScore:95 }),
    candidate("winner","camera-first",{ comparisonAccepted:true,comparisonWinner:"candidate",preferenceAgreement:.82,motionScore:88 }),
    candidate("runner-up","hierarchy-first",{ comparisonAccepted:true,comparisonWinner:"candidate",preferenceAgreement:.75,motionScore:96 }),
  ];
  assert.equal(eligibleCandidate(candidates[0],definition),false);
  assert.equal(eligibleCandidate(candidates[1],definition),false);
  assert.equal(eligibleCandidate(candidates[2],definition),false);
  assert.equal(selectTournamentWinner(candidates,definition)?.id,"winner");
});

test("Loop Engine stops when no candidate can prove improvement",()=>{
  const report=baseReport("visual-polish");
  report.noProgressStreak=report.definition.budgets.noProgressLimit;
  const decision=evaluateLoopStop(report,Date.parse(report.startedAt)+1000);
  assert.equal(decision?.status,"completed");
  assert.match(decision?.reason ?? "",/saturated/i);
});

test("Loop Engine escalates accepted-state oscillation instead of looping forever",()=>{
  const report=baseReport("visual-polish");
  report.cycles=[
    cycle(1,"base","fp-a"),
    cycle(2,"fp-a","fp-b"),
    cycle(3,"fp-b","fp-a"),
  ];
  report.currentFingerprint="fp-a";
  report.acceptedImprovements=3;
  const decision=evaluateLoopStop(report,Date.parse(report.startedAt)+1000);
  assert.equal(decision?.status,"escalated");
  assert.match(decision?.reason ?? "",/oscillation/i);
});

test("Loop Engine escalates repeated repairs without progress",()=>{
  const report=baseReport("visual-polish");
  report.noProgressStreak=1;
  report.definition={...report.definition,budgets:{...report.definition.budgets,noProgressLimit:2}};
  report.cycles=[
    {
      cycle:1,startedAt:report.startedAt,endedAt:report.startedAt,incumbentFingerprint:"a",noProgress:true,
      candidates:[
        candidate("a1","hierarchy-first",{repairSignature:"repeat"}),
        candidate("a2","camera-first",{repairSignature:"repeat"}),
        candidate("a3","cadence-first",{repairSignature:"repeat"}),
      ],
    },
  ];
  const decision=evaluateLoopStop(report,Date.parse(report.startedAt)+1000);
  assert.equal(decision?.status,"escalated");
  assert.match(decision?.reason ?? "",/same bounded repair/i);
});

test("loop context stays compact and carries only actionable prior evidence",()=>{
  const definition=loopDefinition("mobile-translation")!;
  const context=compactLoopContext({
    definition,
    cycle:2,
    strategyId:"mobile-camera",
    projectContext:"Luxury residence launch.",
    unresolved:Array.from({length:40},(_,index)=>"finding-"+index),
    priorRepairs:Array.from({length:40},(_,index)=>"repair-"+index),
  });
  assert.ok(context.length<=6000);
  assert.match(context,/Judge mobile first/);
  assert.match(context,/finding-0/);
  assert.doesNotMatch(context,/finding-39/);
  assert.match(context,/repair-39/);
  assert.doesNotMatch(context,/repair-0/);
});

test("loop learning remains project-scoped until separately promoted",()=>{
  const report=baseReport("motion-polish");
  report.acceptedImprovements=1;
  report.cycles=[{
    cycle:1,startedAt:report.startedAt,endedAt:report.startedAt,incumbentFingerprint:"base",
    acceptedCandidateId:"win",acceptedFingerprint:"next",noProgress:false,
    candidates:[candidate("win","continuity-first",{comparisonAccepted:true,comparisonWinner:"candidate",preferenceAgreement:.9})],
  }];
  const lesson=learningCandidate(report);
  assert.match(lesson,/Keep this project-scoped/i);
  assert.match(lesson,/multiple projects/i);
});

test("Loop Engine scripts preserve human approval and legacy repair compatibility",()=>{
  const runner=fs.readFileSync("scripts/loop-run.mjs","utf8");
  const accept=fs.readFileSync("scripts/loop-accept.mjs","utf8");
  const legacy=fs.readFileSync("scripts/autonomy-repair-loop.mjs","utf8");
  assert.match(runner,/accepted-experience\.json/);
  assert.match(runner,/current-incumbent\.json/);
  assert.match(runner,/Project Vault does not contain project/);
  assert.doesNotMatch(runner,/writeFile\([^\n]*config\/experience\.json/);
  assert.match(accept,/Human approval is required/);
  assert.match(accept,/--approve/);
  assert.match(legacy,/scripts\/loop-run\.mjs/);
});

function baseReport(id:string):LoopRunReport {
  const definition=loopDefinition(id)!;
  return createLoopRunReport({
    runId:"test-run",
    definition,
    source:"test",
    baselineFingerprint:"baseline",
    startedAt:"2026-09-18T20:00:00.000Z",
  });
}
function candidate(id:string,strategyId:string,patch:Partial<LoopCandidateEvidence>={}):LoopCandidateEvidence {
  return {
    id,strategyId,functionalPassed:true,motionScore:90,hardGateFailures:[],
    comparisonAccepted:false,comparisonWinner:null,preferenceAgreement:null,reason:"",
    ...patch,
  };
}
function cycle(number:number,incumbent:string,accepted:string) {
  return {
    cycle:number,
    startedAt:"2026-09-18T20:00:00.000Z",
    endedAt:"2026-09-18T20:00:01.000Z",
    incumbentFingerprint:incumbent,
    candidates:[candidate("c"+number,"hierarchy-first",{comparisonAccepted:true,comparisonWinner:"candidate",preferenceAgreement:.9,fingerprint:accepted})],
    acceptedCandidateId:"c"+number,
    acceptedFingerprint:accepted,
    noProgress:false,
  };
}
