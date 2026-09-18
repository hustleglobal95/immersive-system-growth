import test from "node:test";
import assert from "node:assert/strict";
import raw from "../config/experience.json";
import { parseExperience } from "../src/lib/configSchema";
import { sampleExperience } from "../src/lib/sampleExperience";
import { analyzeMotionQuality, buildMotionReviewPlan, type MotionReviewPoint, type MotionSnapshot } from "../src/platform/autonomy/motionQuality";
import { evaluateCandidateGates } from "../src/platform/autonomy/candidateGates";
import { buildMotionSequenceCriticRequest, parseMotionSequenceResponse } from "../src/platform/autonomy/motionDirector";

const experience=parseExperience(raw);

function snapshot(point:MotionReviewPoint):MotionSnapshot {
  const sampled=sampleExperience(point.progress,false,experience,16/9);
  return {
    progress:point.progress,
    viewport:"desktop",
    sceneIndex:sampled.sceneIndex,
    sceneId:sampled.scene.id,
    localProgress:sampled.localProgress,
    camera:sampled.camera,
    hero:sampled.hero,
    renderer:{ frameMs:16.7,webglStatus:"ready",quality:"high" },
    reducedMotion:false,
  };
}

test("motion review plan samples scenes and both sides of every boundary",()=>{
  const plan=buildMotionReviewPlan(experience,8);
  assert.equal(plan.samplesPerScene,8);
  assert.equal(plan.points.filter((point)=>point.kind==="sample").length,experience.scenes.length*8);
  assert.equal(plan.points.filter((point)=>point.kind==="boundary-before").length,experience.scenes.length-1);
  assert.equal(plan.points.filter((point)=>point.kind==="boundary-after").length,experience.scenes.length-1);
});

test("deterministic sampling is reversible at identical progress",()=>{
  const plan=buildMotionReviewPlan(experience,6);
  const forward=plan.points.map((point)=>({ point,snapshot:snapshot(point) }));
  const reverse=[...plan.points].reverse().map((point)=>({ point,snapshot:snapshot(point) })).reverse();
  const report=analyzeMotionQuality({ plan,forward,reverse,viewport:"desktop" });
  assert.equal(report.reversible,true);
  assert.equal(report.finite,true);
  assert.ok(!report.findings.some((finding)=>finding.code==="motion.reverse.drift"));
});

test("motion analysis hard-fails forward/reverse state drift",()=>{
  const plan=buildMotionReviewPlan(experience,5);
  const forward=plan.points.map((point)=>({ point,snapshot:snapshot(point) }));
  const reverse=plan.points.map((point)=>({ point,snapshot:snapshot(point) }));
  const changed=structuredClone(reverse[0].snapshot);
  changed.camera.position=[changed.camera.position[0]+1,changed.camera.position[1],changed.camera.position[2]];
  reverse[0]={ ...reverse[0],snapshot:changed };
  const report=analyzeMotionQuality({ plan,forward,reverse,viewport:"desktop" });
  assert.equal(report.reversible,false);
  assert.ok(report.hardGateFailures.length>0);
  assert.ok(report.findings.some((finding)=>finding.code==="motion.reverse.drift" && finding.severity==="blocker"));
});

test("motion analysis blocks severe scene-boundary discontinuity",()=>{
  const beforePoint:MotionReviewPoint={ id:"a-boundary-before",progress:0.499,sceneId:"a",kind:"boundary-before" };
  const afterPoint:MotionReviewPoint={ id:"b-boundary-after",progress:0.501,sceneId:"b",kind:"boundary-after" };
  const plan={ version:1 as const,samplesPerScene:5,points:[beforePoint,afterPoint] };
  const make=(point:MotionReviewPoint,position:[number,number,number]):MotionSnapshot=>({
    progress:point.progress,
    viewport:"desktop",
    sceneIndex:point.sceneId==="a"?0:1,
    sceneId:point.sceneId,
    localProgress:0.5,
    camera:{ position,target:[0,0,0],fov:42 },
    hero:{ position:[0,0,0],rotation:[0,0,0],scale:1 },
    renderer:{ frameMs:16.7,webglStatus:"ready",quality:"high" },
  });
  const forward=[
    { point:beforePoint,snapshot:make(beforePoint,[0,0,8]) },
    { point:afterPoint,snapshot:make(afterPoint,[10,0,8]) },
  ];
  const reverse=forward.map((item)=>({ point:item.point,snapshot:structuredClone(item.snapshot) }));
  const report=analyzeMotionQuality({ plan,forward,reverse,viewport:"desktop" });
  assert.ok(report.hardGateFailures.length>0);
  assert.ok(report.findings.some((finding)=>finding.code==="motion.boundary.discontinuity" && finding.severity==="blocker"));
});


test("candidate gates reject browser failures and material motion regression",()=>{
  const report=evaluateCandidateGates({
    functionalHardGateFailures:["mobile: final scene unreachable"],
    incumbentMotionScore:94,
    candidateMotionScore:88,
  });
  assert.equal(report.passed,false);
  assert.ok(report.failures.some((item)=>item.includes("mobile")));
  assert.ok(report.motionRegression.some((item)=>item.includes("94") && item.includes("88")));
});

test("candidate gates allow small motion-score noise when all hard gates pass",()=>{
  const report=evaluateCandidateGates({
    incumbentMotionScore:94,
    candidateMotionScore:92,
    maxMotionRegression:3,
  });
  assert.equal(report.passed,true);
  assert.deepEqual(report.failures,[]);
});

test("motion-sequence critic requests and responses stay schema constrained",()=>{
  const request=buildMotionSequenceCriticRequest({
    sceneId:"approach",
    viewport:"desktop",
    projectContext:"Cinematic architecture arrival.",
    progresses:[0.01,0.04,0.07,0.1,0.13],
    deterministicMetrics:{
      sampleCount:20,
      boundaryCount:6,
      maxFrameMs:18,
      medianFrameMs:16.7,
      maxCameraStep:0.4,
      maxHeroStep:0.2,
      maxCameraVelocityRatio:1.8,
      maxHeroVelocityRatio:1.5,
      maxRuntimeCameraDrift:0.12,
    },
  });
  assert.equal(request.mode,"motion-sequence");
  assert.equal(request.progresses.length,5);
  const parsed=parseMotionSequenceResponse({
    findings:[{
      dimension:"camera",
      severity:"major",
      sceneId:"approach",
      finding:"The camera accelerates too abruptly near the midpoint.",
      evidence:["Frame spacing compresses visibly between the third and fourth samples."],
      repair:"Reduce the midpoint acceleration and lengthen the settle before the handoff.",
      confidence:0.88,
    }],
    summary:"One visible camera cadence issue.",
  });
  assert.equal(parsed.findings[0].dimension,"camera");
  assert.equal(parsed.findings[0].severity,"major");
});
