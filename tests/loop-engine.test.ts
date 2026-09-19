import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { executableLoopDefinitions, loopDefinition, loopDefinitions } from "../src/platform/loops/loopRegistry";
import { createLoopRunReport } from "../src/platform/loops/loopEvidence";
import { compactLoopContext, eligibleCandidate, evaluateLoopStop, learningCandidate, selectTournamentWinner } from "../src/platform/loops/loopRunner";
import type { LoopCandidateEvidence, LoopRunReport } from "../src/platform/loops/loopSchema";
import { analyzeAssetManifest } from "../src/platform/assetIntelligence";
import { buildAssetQualityCandidate, profileAssetQuality } from "../src/platform/assetQuality";
import { buildConstructionCandidate } from "../src/platform/constructionWorker";
import { parseExperience } from "../src/lib/configSchema";
import rawExperience from "../config/experience.json";
import rawManifest from "../config/asset-manifest.json";
import type { AssetManifest } from "../src/types/assets";

test("Loop Engine exposes only workers that have production-safe executors",()=>{
  assert.deepEqual(executableLoopDefinitions().map((item)=>item.id),["visual-polish","mobile-translation","motion-polish","performance","asset-quality","construction"]);
  assert.equal(loopDefinitions.length,6);
  assert.equal(loopDefinition("performance")?.executable,true);
  assert.equal(loopDefinition("asset-quality")?.executable,true);
  assert.equal(loopDefinition("construction")?.executable,true);
  for(const definition of loopDefinitions) {
    assert.equal(definition.acceptance.requireHardGates,true);
    assert.equal(definition.acceptance.requireCandidateWin,true);
    assert.equal(definition.memory.forgeLearning,"manual-promotion");
    assert.ok(definition.allowedRepairCommands.length>0);
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
  assert.equal(eligibleCandidate(candidate("no-functional","camera-first",{ functionalPassed:false,comparisonAccepted:true,comparisonWinner:"candidate",preferenceAgreement:.99 }),definition),false);
  assert.equal(eligibleCandidate(candidate("no-motion","camera-first",{ motionScore:null,comparisonAccepted:true,comparisonWinner:"candidate",preferenceAgreement:.99 }),definition),false);
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

test("Asset Intelligence detects pressure, dominant files and duplicate binaries",()=>{
  const shaA="a".repeat(64);
  const shaB="b".repeat(64);
  const report=analyzeAssetManifest({
    models:[
      {path:"/models/hero.glb",bytes:9*1024*1024,sha256:shaA},
      {path:"/models/hero-copy.glb",bytes:9*1024*1024,sha256:shaA},
    ],
    textures:[{path:"/textures/hero.webp",bytes:4*1024*1024,sha256:shaB}],
    hdr:[],
    video:[],
    budgets:{modelMb:12,textureMb:5,hdrMb:8,videoMb:20,totalMb:20},
  });
  assert.ok(report.score<100);
  assert.equal(report.duplicateHashes.length,1);
  assert.ok(report.oversized.some((item)=>item.kind==="models"));
  assert.ok(report.findings.some((item)=>item.severity==="blocker" && /budget/i.test(item.title)));
  assert.equal(report.remoteAssets,0);
});

test("Asset Quality consolidates exact duplicate aliases without changing binary identity",()=>{
  const candidate=buildAssetQualityCandidate(rawExperience,rawManifest,"canonical-reuse");
  assert.equal(candidate.changed,true);
  assert.ok(candidate.removedManifestPaths.length>=1);
  assert.ok(candidate.profileAfter.intelligence.duplicateHashes.length<candidate.profileBefore.intelligence.duplicateHashes.length);
  assert.ok(candidate.profileAfter.intelligence.score>candidate.profileBefore.intelligence.score);
});

test("Asset Quality never consolidates matching hashes across asset classes",()=>{
  const manifest:AssetManifest={
    models:[{path:"/models/shared.glb",bytes:1024,sha256:"d".repeat(64)}],
    textures:[{path:"/textures/shared.webp",bytes:1024,sha256:"d".repeat(64)}],
    hdr:[],
    video:[],
    budgets:{modelMb:10,textureMb:10,hdrMb:10,videoMb:10,totalMb:40},
  };
  const candidate=buildAssetQualityCandidate(parseExperience(rawExperience),manifest,"canonical-reuse");
  assert.equal(candidate.changed,false);
  assert.equal(candidate.removedManifestPaths.length,0);
});

test("Asset Quality prefers registered derivatives only when lineage and savings are explicit",()=>{
  const manifest:AssetManifest=structuredClone(rawManifest);
  const source=manifest.textures.find((item)=>item.path==="/textures/reference/reveal-field.svg")!;
  manifest.textures.push({
    path:"/textures/reference/reveal-field.opt.webp",
    bytes:Math.max(1,Math.floor(source.bytes*.5)),
    sha256:"c".repeat(64),
    derivative:{sourcePath:source.path,operation:"image-optimize",format:"webp",width:640,quality:72},
  });
  const experience=parseExperience(rawExperience);
  experience.scenes[0].media={
    kind:"image",src:source.path,alt:"Reference reveal",transition:"dissolve",maskSoftness:18,layers:[],
    position:[50,50],mobilePosition:[50,50],overlap:.25,direction:"up",zoom:1.05,textEnd:.28,
  };
  const profile=profileAssetQuality(experience,manifest);
  assert.ok(profile.derivativeOpportunities.some((item)=>item.sourcePath===source.path));
  const candidate=buildAssetQualityCandidate(experience,manifest,"registered-derivative");
  assert.equal(candidate.changed,true);
  assert.ok(candidate.replacements.some((item)=>item.to==="/textures/reference/reveal-field.opt.webp"));
  assert.ok(candidate.profileAfter.referencedBytes<candidate.profileBefore.referencedBytes);
});

test("Construction worker preserves client copy and camera endpoints while rebuilding orchestration",()=>{
  const source=parseExperience(rawExperience);
  const candidate=buildConstructionCandidate({
    experience:source,
    manifest:rawManifest,
    context:"Casa Lumen is a premium coastal property experience. Use the existing pavilion model and registered imagery. Preserve all client copy and factual claims. Make the journey cinematic, restrained, spatial and mobile-safe.",
    strategy:"camera-structure",
  });
  assert.equal(candidate.blockers.length,0);
  assert.equal(candidate.changed,true);
  candidate.experience.scenes.forEach((scene,index)=>{
    assert.deepEqual(scene.copy,source.scenes[index].copy);
    assert.deepEqual(scene.camera.from,source.scenes[index].camera.from);
    assert.deepEqual(scene.camera.to,source.scenes[index].camera.to);
    if(scene.mobileCamera && source.scenes[index].mobileCamera) {
      assert.deepEqual(scene.mobileCamera.from,source.scenes[index].mobileCamera!.from);
      assert.deepEqual(scene.mobileCamera.to,source.scenes[index].mobileCamera!.to);
    }
  });
});

test("Construction Loop requires the complete verification stack",()=>{
  const definition=loopDefinition("construction")!;
  for(const verifier of ["schema","functional","assets","motion","mobile","performance","accessibility","visual"] as const) {
    assert.ok(definition.verifiers.includes(verifier));
  }
  assert.deepEqual(definition.strategies.map((item)=>item.id),["hierarchy-first","camera-structure","signature-budget"]);
});

test("Performance Loop has distinct evidence-driven candidate strategies",()=>{
  const definition=loopDefinition("performance")!;
  assert.equal(definition.worker,"performance-repair");
  assert.deepEqual(definition.strategies.map((item)=>item.id),["pixel-pressure","balanced-budget"]);
  assert.ok(definition.verifiers.includes("performance"));
});

test("Loop evidence can bind an executable run to one Control Plane proposal",()=>{
  const definition=loopDefinition("visual-polish")!;
  const report=createLoopRunReport({
    runId:"proposal-bound-run",
    definition,
    projectId:"test-project",
    source:"test",
    baselineFingerprint:"a".repeat(64),
    startedAt:"2026-09-19T14:00:00.000Z",
    controlPlane:{
      proposalId:"proposal-123",
      selectionKey:"copy:opening",
      baselineFingerprint:"b".repeat(16),
      intent:"Strengthen the opening typography hierarchy.",
    },
  });
  assert.equal(report.controlPlane?.proposalId,"proposal-123");
  assert.equal(report.controlPlane?.selectionKey,"copy:opening");
  assert.equal(report.controlPlane?.baselineFingerprint,"b".repeat(16));
});

test("Loop Engine scripts preserve human approval and legacy repair compatibility",()=>{
  const runner=fs.readFileSync("scripts/loop-run.mjs","utf8");
  const accept=fs.readFileSync("scripts/loop-accept.mjs","utf8");
  const legacy=fs.readFileSync("scripts/autonomy-repair-loop.mjs","utf8");
  assert.match(runner,/accepted-experience\.json/);
  assert.match(runner,/accepted-asset-manifest\.json/);
  assert.match(runner,/accepted-interaction-graph\.json/);
  assert.match(runner,/autonomy-asset-repair\.mjs/);
  assert.match(runner,/autonomy-construction\.mjs/);
  assert.match(runner,/autonomy-accessibility-verify\.mjs/);
  assert.match(runner,/current-incumbent\.json/);
  assert.match(runner,/Project Vault does not contain project/);
  assert.match(runner,/proposal-id/);
  assert.match(runner,/selection-key/);
  assert.match(runner,/baseline-fingerprint/);
  assert.match(runner,/parseExperience/);
  assert.match(runner,/boundedFailures/);
  assert.doesNotMatch(runner,/writeFile\([^\n]*config\/experience\.json/);
  assert.match(accept,/Human approval is required/);
  assert.match(accept,/--approve/);
  assert.match(accept,/Project Vault changed after this loop began/);
  assert.match(accept,/bundle fingerprint does not match the run report/);
  assert.match(accept,/assetManifest/);
  assert.match(accept,/interactionGraph/);
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
    id,strategyId,repairSummary:[],functionalPassed:true,motionScore:90,hardGateFailures:[],
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
