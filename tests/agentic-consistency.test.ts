import test from "node:test";
import assert from "node:assert/strict";
import { runDirectorIntelligence } from "../src/platform/director-intelligence/orchestrator";
import { parseDirectorBrief } from "../src/platform/directorSchema";
import { parseExperience } from "../src/lib/configSchema";
import { parseAssetManifest } from "../src/platform/assetManifestSchema";
import { parseInteractionGraph } from "../src/lib/interactionGraph";
import { buildCreativeStateGraph, buildSignatureSliceGate } from "../src/platform/agentic/creativeStateGraph";
import { compileAgentContext } from "../src/platform/agentic/contextCompiler";
import { routeVisualFinding } from "../src/platform/agentic/capabilityRouter";
import { buildRenderReviewPlan } from "../src/platform/autonomy/visualReview";
import { planVisualRepairs } from "../src/platform/autonomy/repairPlanner";
import rawBrief from "../config/director-brief.example.json";
import rawExperience from "../config/experience.json";
import rawManifest from "../config/asset-manifest.json";
import rawGraph from "../config/interaction-graph.json";

const director=()=>runDirectorIntelligence({brief:parseDirectorBrief(rawBrief)});

test("Creative State Graph is deterministic and protects strategic truth from implementation workers",()=>{
  const first=buildCreativeStateGraph(director());
  const second=buildCreativeStateGraph(director());
  assert.equal(first.fingerprint,second.fingerprint);
  assert.equal(first.truth.authority,"director-locked");
  assert.equal(first.direction.authority,"director-locked");
  assert.equal(first.implementation.authority,"bounded-implementation");
  assert.equal(first.evidence.authority,"evidence-derived");
  assert.ok(first.permissions.strategicFields.includes("direction.thesis"));
  assert.match(first.permissions.rule,/may not rewrite strategic truth/i);
  assert.ok(first.implementation.sceneContracts.length>=5);
});

test("Signature Slice Gate selects the strongest beat and blocks premature full-site expansion",()=>{
  const graph=buildCreativeStateGraph(director());
  const gate=buildSignatureSliceGate(graph);
  const primary=graph.implementation.sceneContracts.find((scene)=>scene.id===gate.primarySceneId);
  const max=Math.max(...graph.implementation.sceneContracts.map((scene)=>scene.intensity));
  assert.equal(primary?.intensity,max);
  assert.ok(gate.supportSceneIds.length<=2);
  assert.match(gate.stopRule,/Do not expand full-site production/i);
  assert.ok(gate.acceptance.some((rule)=>/mobile/i.test(rule)));
});

test("Context Compiler returns task-scoped context and hides unrelated heavy state",()=>{
  const graph=buildCreativeStateGraph(director());
  const experience=parseExperience(rawExperience);
  const assetManifest=parseAssetManifest(rawManifest);
  const interactionGraph=parseInteractionGraph(rawGraph);
  const sceneId=graph.implementation.sceneContracts[0].id;
  const capsule=compileAgentContext({
    graph,
    task:{id:"camera-hero",domain:"camera",sceneId,objective:"Improve hero framing without changing the creative thesis."},
    currentState:{experience,assetManifest,interactionGraph},
  });
  assert.equal(capsule.scene?.id,sceneId);
  assert.ok(capsule.runtime.scene);
  assert.ok(["exact-id","ordinal"].includes(capsule.sceneLink.mapping));
  assert.equal(capsule.sceneLink.strategicSceneId,sceneId);
  assert.equal(capsule.sceneLink.runtimeSceneId,capsule.runtime.scene?.id ?? null);
  assert.equal(capsule.runtime.assets,null);
  assert.equal(capsule.runtime.interactionGraph,null);
  assert.ok(capsule.allowedSystems.includes("camera"));
  assert.ok(capsule.allowedCapabilityIds.includes("scene.direct-camera"));
  assert.ok(capsule.deniedActions.some((item)=>/thesis/i.test(item)));
  assert.match(capsule.contextRule,/do not reload the entire project/i);
});

test("Capability Router assigns owners and refuses strategic findings as automatic repairs",()=>{
  const camera=routeVisualFinding({
    critic:"camera",captureId:"desktop-hero",severity:"major",finding:"Camera is too tight.",evidence:["Hero crop loses product edge."],
    affectedSystems:["camera"],repair:"Pull back framing.",confidence:.92,
  });
  assert.equal(camera.domain,"camera");
  assert.equal(camera.owner,"camera-worker");
  assert.ok(camera.allowedRepairCommands.includes("camera.applyChoreography"));
  assert.equal(camera.capabilityId,"scene.direct-camera");

  const brand=routeVisualFinding({
    critic:"brand",captureId:"desktop-hero",severity:"major",finding:"The direction feels off-brand.",evidence:["Identity is not visible."],
    affectedSystems:["brand"],repair:"Rethink the visual premise.",confidence:.9,
  });
  assert.equal(brand.domain,"director");
  assert.equal(brand.disposition,"human-review");
  assert.deepEqual(brand.allowedRepairCommands,[]);

  const material=routeVisualFinding({
    critic:"material",captureId:"desktop-hero",severity:"major",finding:"Material looks synthetic.",evidence:["Surface response is flat."],
    affectedSystems:["material","asset"],repair:"Replace or re-author the material.",confidence:.88,
  });
  assert.equal(material.domain,"asset");
  assert.equal(material.capabilityId,"asset.improve");
  assert.deepEqual(material.allowedRepairCommands,["scene.adjustMaterialSurface"]);
});

test("Visual repair planner obeys capability routing instead of guessing across domains",()=>{
  const experience=parseExperience(rawExperience);
  const reviewPlan=buildRenderReviewPlan(experience,2);
  const capture=reviewPlan.captures[0];
  const plan=planVisualRepairs({
    experience,
    reviewPlan,
    findings:[
      {
        critic:"camera",captureId:capture.id,severity:"major",finding:"The hero framing is too tight.",evidence:["Subject clips at frame edge."],
        affectedSystems:["camera","framing"],repair:"Pull back to restore breathing room.",confidence:.94,
      },
      {
        critic:"material",captureId:capture.id,severity:"major",finding:"The surface is visually unconvincing.",evidence:["Material response is flat."],
        affectedSystems:["material","asset"],repair:"Re-author the material.",confidence:.9,
      },
    ],
  });
  assert.ok(plan.commands.some((command)=>command.type==="camera.applyChoreography"));
  assert.equal(plan.unresolved.length,1);
  assert.equal(plan.unresolved[0].critic,"material");
});
