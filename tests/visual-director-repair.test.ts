import assert from "node:assert/strict";
import test from "node:test";
import raw from "../config/experience.json";
import { parseExperience } from "../src/lib/configSchema";
import { createExperienceEngine } from "../src/platform/createExperienceEngine";
import { buildRenderReviewPlan } from "../src/platform/autonomy/visualReview";
import { planVisualRepairs, applyVisualRepairPlan } from "../src/platform/autonomy/repairPlanner";
import { buildPairwiseCriticRequests, pairwiseJudgmentFromResponse, parseVisualDirectorResponse } from "../src/platform/autonomy/visualDirector";
import { forcedOptimizationDecision } from "../src/platform/autonomy/forcedOptimization";

const initial=parseExperience(raw);

test("Visual Director presentation repair command is bounded, reversible and agent-visible",()=>{
  const engine=createExperienceEngine(initial);
  const scene=initial.scenes[0];
  const before=structuredClone(scene);
  const result=engine.dispatchRegistered("scene.adjustPresentation",{
    sceneId:scene.id,
    exposureDelta:-0.1,
    bloomDelta:-0.08,
    heroScaleMultiplier:0.94,
    heroXDelta:0.12,
  },{ source:"ai",expectedRevision:0 });
  assert.equal(result.ok,true);
  assert.equal(engine.getRevision(),1);
  const changed=engine.getState().scenes[0];
  assert.ok(changed.world.exposure < before.world.exposure);
  assert.ok(changed.post.bloom <= before.post.bloom);
  assert.ok(changed.hero.from.scale < before.hero.from.scale);
  assert.equal(engine.commands.describe("scene.adjustPresentation").agentVisible,true);
  assert.equal(engine.undo(),true);
  assert.deepEqual(engine.getState().scenes[0],before);
});

test("out-of-range Visual Director presentation input is rejected before mutation",()=>{
  const engine=createExperienceEngine(initial);
  const scene=initial.scenes[0];
  const fingerprint=engine.getFingerprint();
  const result=engine.dispatchRegistered("scene.adjustPresentation",{
    sceneId:scene.id,
    exposureDelta:4,
  },{ source:"ai" });
  assert.equal(result.ok,false);
  assert.ok(result.errors.some((error)=>error.code==="command.input.maximum"));
  assert.equal(engine.getFingerprint(),fingerprint);
  assert.equal(engine.getRevision(),0);
});

test("Visual Director turns high-confidence findings into a bounded candidate",()=>{
  const reviewPlan=buildRenderReviewPlan(initial,4);
  const capture=reviewPlan.captures.find((item)=>item.viewport==="desktop")!;
  const findings=[
    {
      id:"composition-1",
      critic:"composition" as const,
      captureId:capture.id,
      severity:"major" as const,
      finding:"The hero product is too large and overlaps the copy, leaving weak negative space.",
      evidence:["The subject owns too much of the right-center frame."],
      affectedSystems:["hero framing","composition"],
      repair:"Reduce hero scale and move the product right to restore negative space on the left.",
      confidence:0.9,
    },
    {
      id:"camera-1",
      critic:"camera" as const,
      captureId:capture.id,
      severity:"major" as const,
      finding:"The camera is too tight for the intended product reveal.",
      evidence:["The lens crops the object before the copy settles."],
      affectedSystems:["camera","lens"],
      repair:"Pull back and reveal more surrounding space before the copy settles.",
      confidence:0.86,
    },
  ];
  const plan=planVisualRepairs({ findings,reviewPlan,experience:initial });
  assert.ok(plan.commands.some((command)=>command.type==="scene.adjustPresentation"));
  assert.ok(plan.commands.some((command)=>command.type==="camera.applyChoreography"));
  assert.equal(plan.blockers.length,0);
  const applied=applyVisualRepairPlan(initial,plan);
  assert.equal(applied.ok,true,applied.errors.join("; "));
  assert.notEqual(applied.fingerprintBefore,applied.fingerprintAfter);
  assert.notDeepEqual(applied.candidate.scenes[0],initial.scenes[0]);
  assert.deepEqual(applied.candidate.scenes.map((scene)=>({ id:scene.id,range:scene.range,copy:scene.copy })),initial.scenes.map((scene)=>({ id:scene.id,range:scene.range,copy:scene.copy })));
  assert.deepEqual(applied.candidate.hotspots,initial.hotspots);
});

test("unmapped visual blockers prevent autonomous candidate generation",()=>{
  const reviewPlan=buildRenderReviewPlan(initial,3);
  const capture=reviewPlan.captures[0];
  const findings=[{
    critic:"performance" as const,
    captureId:capture.id,
    severity:"blocker" as const,
    finding:"The WebGL renderer crashes before the signature state.",
    evidence:["Fatal context failure."],
    affectedSystems:["runtime"],
    repair:"Repair the runtime failure before any visual changes.",
    confidence:1,
  }];
  const plan=planVisualRepairs({ findings,reviewPlan,experience:initial });
  assert.equal(plan.blockers.length,1);
  const applied=applyVisualRepairPlan(initial,plan);
  assert.equal(applied.ok,false);
  assert.match(applied.errors[0],/Unresolved visual blocker/);
});

test("Visual Director response is capture-scoped and schema constrained",()=>{
  const parsed=parseVisualDirectorResponse({
    findings:[{
      critic:"typography",
      captureId:"model-supplied-wrong-id",
      severity:"major",
      finding:"Headline enters before the camera settles and competes with the product.",
      evidence:["Type motion overlaps the strongest camera beat."],
      affectedSystems:["copy timing","motion"],
      repair:"Delay the copy reveal until the camera has settled.",
      confidence:0.88,
    }],
    summary:"One timing conflict.",
  },"desktop-product-mid");
  assert.equal(parsed.findings[0].captureId,"desktop-product-mid");
});

test("pairwise comparison uses reversed order and candidate hard gates fail globally",()=>{
  const [first,second]=buildPairwiseCriticRequests({
    captureId:"desktop-product-mid",
    incumbentId:"incumbent",
    candidateId:"candidate",
    projectContext:"Luxury product reveal with clear copy and one dominant object.",
  });
  assert.equal(first.firstId,"incumbent");
  assert.equal(second.firstId,"candidate");

  const j1=pairwiseJudgmentFromResponse({
    judgeId:"round-1",
    request:first,
    candidateId:"candidate",
    response:{ winner:"second",confidence:0.91,reasons:["Candidate has stronger hierarchy."],firstHardGateFailures:[],secondHardGateFailures:[] },
  });
  const j2=pairwiseJudgmentFromResponse({
    judgeId:"round-2",
    request:second,
    candidateId:"candidate",
    response:{ winner:"first",confidence:0.89,reasons:["Candidate remains stronger after order reversal."],firstHardGateFailures:[],secondHardGateFailures:[] },
  });
  const accepted=forcedOptimizationDecision({ incumbentId:"incumbent",candidateId:"candidate",judgments:[j1,j2] });
  assert.equal(accepted.accepted,true);

  const broken=pairwiseJudgmentFromResponse({
    judgeId:"round-broken",
    request:first,
    candidateId:"candidate",
    response:{ winner:"second",confidence:0.95,reasons:["Looks stronger."],firstHardGateFailures:[],secondHardGateFailures:["Primary CTA is clipped."] },
  });
  const rejected=forcedOptimizationDecision({
    incumbentId:"incumbent",
    candidateId:"candidate",
    judgments:[j1,j2,broken],
    candidateHardGateFailures:broken.hardGateFailures,
  });
  assert.equal(rejected.accepted,false);
  assert.equal(rejected.winner,"invalid");
});
