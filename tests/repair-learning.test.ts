import test from "node:test";
import assert from "node:assert/strict";
import rawExperience from "../config/experience.json";
import { parseExperience } from "../src/lib/configSchema";
import { createExperienceEngine } from "../src/platform/createExperienceEngine";
import { buildRenderReviewPlan } from "../src/platform/autonomy/visualReview";
import { planVisualRepairs } from "../src/platform/autonomy/repairPlanner";
import { loopDefinition } from "../src/platform/loops/loopRegistry";
import { createLoopRunReport } from "../src/platform/loops/loopEvidence";
import type { LoopRunReport } from "../src/platform/loops/loopSchema";
import { createProjectLearningRecord, evaluateProjectLearning, promoteProjectLearningPattern } from "../src/platform/learning/projectLearning";
import { createEmptyMemoryGraph } from "../src/platform/director-intelligence/memory";

const base=parseExperience(rawExperience);

test("domain repair commands mutate only their owned scene fields and remain reversible",()=>{
  const source=parseExperience(rawExperience);
  const mediaIndex=source.scenes.findIndex((scene)=>Boolean(scene.media));
  assert.ok(mediaIndex>=0);
  const scene=source.scenes[mediaIndex];
  scene.material.roughness=.42;
  scene.material.metalness=.65;
  scene.material.clearcoat=.3;
  scene.material.tintStrength=.1;

  {
    const engine=createExperienceEngine(source);
    const before=structuredClone(engine.getState().scenes[mediaIndex]);
    const result=engine.dispatchRegistered("scene.adjustLighting",{
      sceneId:scene.id,exposureDelta:-.1,bloomDelta:-.08,rimDelta:.5,
    },{source:"ai"});
    assert.equal(result.ok,true,result.errors.map((error)=>error.message).join("; "));
    const after=engine.getState().scenes[mediaIndex];
    assert.notDeepEqual(after.world,before.world);
    assert.notDeepEqual(after.post,before.post);
    assert.deepEqual(after.hero,before.hero);
    assert.deepEqual(after.media,before.media);
    assert.deepEqual(after.material,before.material);
    assert.equal(engine.undo(),true);
    assert.deepEqual(engine.getState().scenes[mediaIndex],before);
  }

  {
    const engine=createExperienceEngine(source);
    const before=structuredClone(engine.getState().scenes[mediaIndex]);
    const result=engine.dispatchRegistered("scene.adjustSubjectFraming",{
      sceneId:scene.id,scaleMultiplier:.94,xDelta:.16,
    },{source:"ai"});
    assert.equal(result.ok,true,result.errors.map((error)=>error.message).join("; "));
    const after=engine.getState().scenes[mediaIndex];
    assert.notDeepEqual(after.hero,before.hero);
    assert.deepEqual(after.world,before.world);
    assert.deepEqual(after.post,before.post);
    assert.deepEqual(after.media,before.media);
    assert.deepEqual(after.material,before.material);
  }

  {
    const engine=createExperienceEngine(source);
    const before=structuredClone(engine.getState().scenes[mediaIndex]);
    const result=engine.dispatchRegistered("scene.adjustMediaFraming",{
      sceneId:scene.id,xDelta:5,mobileYDelta:-4,zoomDelta:.02,
    },{source:"ai"});
    assert.equal(result.ok,true,result.errors.map((error)=>error.message).join("; "));
    const after=engine.getState().scenes[mediaIndex];
    assert.notDeepEqual(after.media,before.media);
    assert.deepEqual(after.world,before.world);
    assert.deepEqual(after.post,before.post);
    assert.deepEqual(after.hero,before.hero);
    assert.deepEqual(after.material,before.material);
  }

  {
    const engine=createExperienceEngine(source);
    const before=structuredClone(engine.getState().scenes[mediaIndex]);
    const result=engine.dispatchRegistered("scene.adjustMaterialSurface",{
      sceneId:scene.id,roughnessDelta:.08,metalnessDelta:-.05,clearcoatDelta:.04,
    },{source:"ai"});
    assert.equal(result.ok,true,result.errors.map((error)=>error.message).join("; "));
    const after=engine.getState().scenes[mediaIndex];
    assert.notDeepEqual(after.material,before.material);
    assert.deepEqual(after.world,before.world);
    assert.deepEqual(after.post,before.post);
    assert.deepEqual(after.hero,before.hero);
    assert.deepEqual(after.media,before.media);
  }
});

test("material repair cannot invent an unowned material override",()=>{
  const source=parseExperience(rawExperience);
  const scene=source.scenes[0];
  scene.material.roughness=null;
  const engine=createExperienceEngine(source);
  const before=engine.getFingerprint();
  const denied=engine.dispatchRegistered("scene.adjustMaterialSurface",{
    sceneId:scene.id,roughnessDelta:.1,
  },{source:"ai"});
  assert.equal(denied.ok,false);
  assert.ok(denied.errors.some((error)=>/Cannot introduce roughness/i.test(error.message)));
  assert.equal(engine.getFingerprint(),before);

  const authored=parseExperience(rawExperience);
  authored.scenes[0].material.roughness=.5;
  const owned=createExperienceEngine(authored);
  const allowed=owned.dispatchRegistered("scene.adjustMaterialSurface",{
    sceneId:authored.scenes[0].id,roughnessDelta:.1,
  },{source:"ai"});
  assert.equal(allowed.ok,true,allowed.errors.map((error)=>error.message).join("; "));
  assert.equal(owned.getState().scenes[0].material.roughness,.6);
});

test("Visual Director routes repairable findings to narrow commands and leaves unowned material unresolved",()=>{
  const experience=parseExperience(rawExperience);
  const reviewPlan=buildRenderReviewPlan(experience,3);
  const capture=reviewPlan.captures.find((item)=>item.viewport==="desktop")!;
  const sceneIndex=experience.scenes.findIndex((scene)=>scene.id===capture.sceneId);
  assert.ok(sceneIndex>=0);
  experience.scenes[sceneIndex].material.roughness=.4;

  const plan=planVisualRepairs({
    experience,
    reviewPlan,
    findings:[
      {
        id:"light",
        critic:"composition",
        captureId:capture.id,
        severity:"major",
        finding:"The frame is too bright and the hero highlight is washed out.",
        evidence:["Highlight detail is clipped."],
        affectedSystems:["lighting","composition"],
        repair:"Lower exposure and bloom.",
        confidence:.95,
      },
      {
        id:"subject",
        critic:"composition",
        captureId:capture.id,
        severity:"major",
        finding:"The hero product is too large and crowds the copy.",
        evidence:["Negative space has collapsed."],
        affectedSystems:["hero framing"],
        repair:"Reduce the hero scale.",
        confidence:.92,
      },
      {
        id:"material",
        critic:"material",
        captureId:capture.id,
        severity:"major",
        finding:"The authored hero surface is too glossy and overly reflective.",
        evidence:["Highlights are too sharp for the approved material reference."],
        affectedSystems:["material"],
        repair:"Increase roughness slightly without replacing the material.",
        confidence:.9,
      },
    ],
  });
  assert.ok(plan.commands.some((command)=>command.type==="scene.adjustLighting"));
  assert.ok(plan.commands.some((command)=>command.type==="scene.adjustSubjectFraming"));
  assert.ok(plan.commands.some((command)=>command.type==="scene.adjustMaterialSurface"));
  assert.equal(plan.commands.some((command)=>command.type==="scene.adjustPresentation"),false);

  const unowned=parseExperience(rawExperience);
  const unownedIndex=unowned.scenes.findIndex((scene)=>scene.id===capture.sceneId);
  unowned.scenes[unownedIndex].material.roughness=null;
  const held=planVisualRepairs({
    experience:unowned,
    reviewPlan,
    findings:[{
      critic:"material",
      captureId:capture.id,
      severity:"major",
      finding:"The hero surface is too glossy and overly reflective.",
      evidence:["Surface response is wrong."],
      affectedSystems:["material"],
      repair:"Increase roughness.",
      confidence:.9,
    }],
  });
  assert.equal(held.commands.some((command)=>command.type==="scene.adjustMaterialSurface"),false);
  assert.equal(held.unresolved.length,1);
});

test("combined lighting findings are clamped before command execution",()=>{
  const experience=parseExperience(rawExperience);
  const reviewPlan=buildRenderReviewPlan(experience,2);
  const capture=reviewPlan.captures.find((item)=>item.viewport==="desktop")!;
  const findings=Array.from({length:8},(_,index)=>({
    id:"bright-"+index,
    critic:"composition" as const,
    captureId:capture.id,
    severity:"blocker" as const,
    finding:"The frame is too bright with harsh blown highlights.",
    evidence:["Highlight clipping."],
    affectedSystems:["lighting"],
    repair:"Lower exposure and bloom.",
    confidence:.95,
  }));
  const plan=planVisualRepairs({experience,reviewPlan,findings});
  const lighting=plan.commands.find((command)=>command.type==="scene.adjustLighting");
  assert.ok(lighting);
  if(lighting?.type!=="scene.adjustLighting") return;
  assert.equal(lighting.input.exposureDelta,-.4);
  assert.ok((lighting.input.bloomDelta ?? 0)>=-.5);
});

test("Project Learning accepts only proven human-promoted winners",()=>{
  const report=provenReport("alpha","hierarchy-first",.88);
  const record=createProjectLearningRecord({
    report,
    projectId:"alpha",
    acceptedVersionId:"v-20260921150000000-deadbeef",
    approvedBy:{id:"owner",name:"Owner",role:"loop-approver"},
    approvedAt:"2026-09-21T15:00:00.000Z",
    creativeStateFingerprint:"c".repeat(64),
    buildPacketFingerprint:"d".repeat(64),
  });
  assert.equal(record.status,"human-approved");
  assert.equal(record.winners.length,1);
  assert.equal(record.winners[0].strategyId,"hierarchy-first");
  assert.equal(record.evidenceSummary.hardGateFailures,0);
  assert.equal(record.provenance.source,"forge-loop-human-promotion");

  const rejected=structuredClone(report);
  rejected.cycles[0].candidates[0].comparisonAccepted=false;
  assert.throws(()=>createProjectLearningRecord({
    report:rejected,
    projectId:"alpha",
    acceptedVersionId:"v-20260921150000001-deadbeef",
    approvedBy:{id:"owner",name:"Owner",role:"loop-approver"},
  }),/comparative candidate-win evidence/i);

  const hardGate=structuredClone(report);
  hardGate.cycles[0].candidates[0].hardGateFailures=["CTA clipped"];
  assert.throws(()=>createProjectLearningRecord({
    report:hardGate,
    projectId:"alpha",
    acceptedVersionId:"v-20260921150000002-deadbeef",
    approvedBy:{id:"owner",name:"Owner",role:"loop-approver"},
  }),/hard-gate failures/i);
});

test("only review-ready cross-project learning can enter Creative Memory and promotion is idempotent",()=>{
  const records=["alpha","bravo","charlie"].map((projectId,index)=>createProjectLearningRecord({
    report:provenReport(projectId,"hierarchy-first",[.84,.8,.79][index]),
    projectId,
    acceptedVersionId:`v-20260921151${index}00000-deadbeef`,
    approvedBy:{id:"owner",name:"Owner",role:"loop-approver"},
    approvedAt:`2026-09-21T15:1${index}:00.000Z`,
  }));
  const early=evaluateProjectLearning(records.slice(0,2)).patterns[0];
  assert.throws(()=>promoteProjectLearningPattern({
    graph:createEmptyMemoryGraph(),
    pattern:early,
    approvedBy:"Kevin",
  }),/Only review-ready/i);

  const mature=evaluateProjectLearning(records).patterns[0];
  const graph=promoteProjectLearningPattern({
    graph:createEmptyMemoryGraph(),
    pattern:mature,
    approvedBy:"Kevin",
  });
  assert.ok(graph.nodes.some((node)=>node.type==="Lesson" && node.projectId==="forge-learning" && node.text.includes(mature.key)));
  const repeated=promoteProjectLearningPattern({graph,pattern:mature,approvedBy:"Kevin"});
  assert.equal(repeated.nodes.length,graph.nodes.length);
});

test("cross-project learning stays a hypothesis until independent evidence clears the review threshold",()=>{
  const records=["alpha","bravo","charlie"].map((projectId,index)=>createProjectLearningRecord({
    report:provenReport(projectId,"hierarchy-first",[.84,.8,.79][index]),
    projectId,
    acceptedVersionId:`v-20260921150${index}00000-deadbeef`,
    approvedBy:{id:"owner",name:"Owner",role:"loop-approver"},
    approvedAt:`2026-09-21T15:0${index}:00.000Z`,
  }));

  const early=evaluateProjectLearning(records.slice(0,2));
  assert.equal(early.patterns[0].status,"hypothesis");
  assert.equal(early.patterns[0].projects,2);

  const mature=evaluateProjectLearning(records);
  assert.equal(mature.patterns[0].status,"review-ready");
  assert.equal(mature.patterns[0].projects,3);
  assert.match(mature.promotionPolicy,/No project-learning pattern becomes global Forge doctrine automatically/i);
  assert.match(mature.patterns[0].rule,/human review/i);
});

function provenReport(projectId:string,strategyId:string,agreement:number):LoopRunReport {
  const definition=loopDefinition("visual-polish")!;
  const report=createLoopRunReport({
    runId:"run-"+projectId,
    definition,
    projectId,
    source:"test",
    sourceVersionId:"v-20260921140000000-source",
    baselineFingerprint:"a".repeat(64),
    startedAt:"2026-09-21T14:00:00.000Z",
    controlPlane:{
      proposalId:"proposal-"+projectId,
      selectionKey:"scene:opening",
      baselineFingerprint:"a".repeat(64),
      intent:"Strengthen hierarchy without changing project truth.",
    },
  });
  report.status="completed";
  report.currentFingerprint="b".repeat(64);
  report.acceptedImprovements=1;
  report.endedAt="2026-09-21T14:05:00.000Z";
  report.learningCandidate="Winning hierarchy-first repair improved the reviewed scene for this project.";
  report.cycles=[{
    cycle:1,
    startedAt:"2026-09-21T14:00:30.000Z",
    endedAt:"2026-09-21T14:04:30.000Z",
    incumbentFingerprint:"a".repeat(64),
    candidates:[{
      id:"winner-"+projectId,
      strategyId,
      fingerprint:"b".repeat(64),
      repairSignature:"e".repeat(64),
      repairSummary:["Improved focal hierarchy while preserving copy and interaction."],
      functionalPassed:true,
      motionScore:92,
      performanceScoreBefore:86,
      performanceScoreAfter:88,
      rafP95Before:18,
      rafP95After:16.5,
      accessibilityPassed:true,
      assetScoreBefore:90,
      assetScoreAfter:90,
      referencedAssetBytesBefore:1000000,
      referencedAssetBytesAfter:1000000,
      hardGateFailures:[],
      comparisonAccepted:true,
      comparisonWinner:"candidate",
      preferenceAgreement:agreement,
      reason:"Candidate won both visual orders with no hard-gate failures.",
    }],
    acceptedCandidateId:"winner-"+projectId,
    acceptedFingerprint:"b".repeat(64),
    noProgress:false,
  }];
  return report;
}
