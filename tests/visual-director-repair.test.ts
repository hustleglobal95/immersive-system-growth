import assert from "node:assert/strict";
import test from "node:test";
import raw from "../config/experience.json";
import { parseExperience } from "../src/lib/configSchema";
import { createExperienceEngine } from "../src/platform/createExperienceEngine";
import { buildRenderReviewPlan } from "../src/platform/autonomy/visualReview";
import { planVisualRepairs, applyVisualRepairPlan } from "../src/platform/autonomy/repairPlanner";
import { buildPairwiseCriticRequests, pairwiseJudgmentFromResponse, parseVisualDirectorResponse } from "../src/platform/autonomy/visualDirector";
import { forcedOptimizationDecision } from "../src/platform/autonomy/forcedOptimization";
import { parseDirectorJudgment } from "../src/platform/director-intelligence/judgment";

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



test("multiple Visual Director findings clamp combined repair deltas to command limits",()=>{
  const reviewPlan=buildRenderReviewPlan(initial,2);
  const capture=reviewPlan.captures.find((item)=>item.viewport==="desktop")!;
  const findings=[0,1,2,3].map((index)=>({
    id:"bright-"+index,
    critic:"composition" as const,
    captureId:capture.id,
    severity:"major" as const,
    finding:"The hero is washed out by harsh highlights and the frame is too bright.",
    evidence:["Highlight detail is visibly clipped."],
    affectedSystems:["lighting","composition"],
    repair:"Lower exposure and bloom while preserving the product reveal.",
    confidence:0.9,
  }));
  const plan=planVisualRepairs({ findings,reviewPlan,experience:initial });
  const presentation=plan.commands.find((command)=>command.type==="scene.adjustPresentation");
  assert.ok(presentation);
  const input=presentation!.input as { exposureDelta?:number; bloomDelta?:number };
  assert.ok((input.exposureDelta ?? 0) >= -0.4);
  assert.ok((input.bloomDelta ?? 0) >= -0.5);
  const applied=applyVisualRepairPlan(initial,plan);
  assert.equal(applied.ok,true,applied.errors.join("; "));
});

test("originality material and sound findings are never disguised as generic visual repairs",()=>{
  const reviewPlan=buildRenderReviewPlan(initial,2);
  const capture=reviewPlan.captures[0];
  const findings=[
    {
      critic:"originality" as const,captureId:capture.id,severity:"blocker" as const,
      finding:"The signature device repeats a familiar house effect.",
      evidence:["The camera and reveal mechanism are interchangeable with prior work."],
      affectedSystems:["camera","motion"],repair:"Rethink the creative mechanism before polishing.",confidence:.95,
    },
    {
      critic:"material" as const,captureId:capture.id,severity:"major" as const,
      finding:"The hero surface reads like generic chrome rather than the intended material.",
      evidence:["Highlight response does not match the supplied material reference."],
      affectedSystems:["material","lighting"],repair:"Return to material direction and source reference before changing presentation.",confidence:.9,
    },
    {
      critic:"sound" as const,captureId:capture.id,severity:"major" as const,
      finding:"The intended sonic role is undefined for this transition.",
      evidence:["Project context requests a sound-led threshold but no authored sound state exists."],
      affectedSystems:["sound","motion"],repair:"Author the sound system rather than using motion as a substitute.",confidence:.9,
    },
  ];
  const plan=planVisualRepairs({findings,reviewPlan,experience:initial});
  assert.equal(plan.commands.length,0);
  assert.equal(plan.unresolved.length,3);
  assert.ok(plan.blockers.some((item)=>/house effect/i.test(item)));
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

test("Visual Director accepts Art Director and craft discipline findings",()=>{
  const parsed=parseVisualDirectorResponse({
    findings:[
      {
        critic:"art-direction",
        captureId:"wrong",
        severity:"major",
        finding:"The typography and lighting feel like separate visual worlds.",
        evidence:["Type behaves editorially while the light treats the object like a technical demo."],
        affectedSystems:["typography","lighting","composition"],
        repair:"Choose one visual north star and make typography/light share the same hierarchy.",
        confidence:.9,
      },
      {
        critic:"craft",
        captureId:"wrong",
        severity:"minor",
        finding:"A media crop tangency makes the frame feel unfinished.",
        evidence:["The subject edge nearly touches the viewport at the focal transition."],
        affectedSystems:["media crop"],
        repair:"Move the crop enough to create either clear overlap or clear separation.",
        confidence:.84,
      },
    ],
  },"desktop-hero-mid");
  assert.equal(parsed.findings.length,2);
  assert.equal(parsed.findings[0].critic,"art-direction");
  assert.equal(parsed.findings[1].critic,"craft");
  assert.ok(parsed.findings.every((finding)=>finding.captureId==="desktop-hero-mid"));
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


test("verified Director judgment findings become bounded Loop repair inputs",()=>{
  const reviewPlan=buildRenderReviewPlan(initial,3);
  const capture=reviewPlan.captures.find((item)=>item.viewport==="desktop")!;
  const judgment=parseDirectorJudgment({
    status:"verified",
    verdict:"REVISE",
    confidence:.86,
    confidenceSemantics:"calibrated-preference",
    reasons:["The rendered direction is strong but the hero framing is too tight."],
    blockers:["Hero framing needs revision before lock."],
    dimensions:{composition:7.4,camera:7.2,coherence:8.2},
    findings:[{
      critic:"camera",
      captureId:capture.id,
      severity:"major",
      finding:"The camera is too tight and leaves insufficient negative space for the authored copy.",
      evidence:["The hero crop collides with the primary text block in the reviewed frame."],
      affectedSystems:["camera","composition"],
      repair:"Pull back the camera to restore negative space before the copy settles.",
      confidence:.9,
    }],
    evidence:{
      source:"rendered-external-judge",
      judgeId:"calibrated-director",
      model:"fixture",
      calibrationId:"benchmark-v1",
      calibrated:true,
      captureIds:[capture.id,reviewPlan.captures[1].id],
      evidenceHash:"c".repeat(64),
      scopeFingerprint:"forge1:1234567890abcdef",
    },
  });
  const plan=planVisualRepairs({findings:judgment.findings,reviewPlan,experience:initial});
  assert.ok(plan.commands.some((command)=>command.type==="camera.applyChoreography"));
  assert.equal(plan.blockers.length,0);
});

test("Director judgment rejects repair findings that cite unseen captures",()=>{
  const reviewPlan=buildRenderReviewPlan(initial,2);
  assert.throws(()=>parseDirectorJudgment({
    status:"verified",
    verdict:"REVISE",
    confidence:.8,
    confidenceSemantics:"calibrated-preference",
    reasons:["Revision needed."],
    blockers:["Framing issue."],
    dimensions:{composition:6.8},
    findings:[{
      critic:"composition",
      captureId:"not-reviewed",
      severity:"major",
      finding:"The focal hierarchy is unresolved in the supplied frame.",
      evidence:["Subject and copy compete for the same visual priority."],
      affectedSystems:["composition"],
      repair:"Reduce subject dominance and restore a single focal hierarchy.",
      confidence:.88,
    }],
    evidence:{
      source:"rendered-external-judge",
      judgeId:"calibrated-director",
      calibrationId:"benchmark-v1",
      calibrated:true,
      captureIds:[reviewPlan.captures[0].id,reviewPlan.captures[1].id],
      evidenceHash:"d".repeat(64),
      scopeFingerprint:"forge1:1234567890abcdef",
    },
  }));
});
