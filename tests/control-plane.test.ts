import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import rawExperience from "../config/experience.json";
import rawManifest from "../config/asset-manifest.json";
import rawGraph from "../config/interaction-graph.json";
import { parseExperience } from "../src/lib/configSchema";
import { parseInteractionGraph } from "../src/lib/interactionGraph";
import { parseAssetManifest } from "../src/platform/assetManifestSchema";
import { capabilitiesForContext, forgeCapabilityRegistry, matchCapabilityIntent, validateCapabilityRegistry } from "../src/platform/control-plane/capabilityRegistry";
import { createProposalDraft, forgeProposalSchema, proposalCanMutateAuthoritativeState, proposalRequiresPreview } from "../src/platform/control-plane/proposal";
import { resolveSelectionContext } from "../src/platform/control-plane/selectionContext";
import { compileIntent, motionArchetypeForIntent } from "../src/platform/control-plane/intentCompiler";
import { recommendNextActions } from "../src/platform/control-plane/nextAction";
import { evaluateProjectHealth } from "../src/platform/control-plane/projectHealth";
import { prepareFastProposal } from "../src/platform/control-plane/fastProposal";
import { attachVerifiedLoopCandidate } from "../src/platform/control-plane/deepCandidate";

const experience=parseExperience(rawExperience);
const manifest=parseAssetManifest(rawManifest);
const graph=parseInteractionGraph(rawGraph);

test("Selection Context centralizes scene state and production signals",()=>{
  const context=resolveSelectionContext({
    experience,
    manifest,
    graph,
    selection:{kind:"scene",index:0},
    validationIssues:[],
  });
  assert.equal(context.version,1);
  assert.equal(context.selectionKey,"scene:"+experience.scenes[0].id);
  assert.equal(context.sceneId,experience.scenes[0].id);
  assert.equal(context.state.assetCount,manifest.models.length+manifest.textures.length+manifest.hdr.length+manifest.video.length);
  assert.ok(context.state.manifestHealth>=0 && context.state.manifestHealth<=100);
  assert.ok(context.signals.some((item)=>/manifest health/i.test(item)));
});

test("Selection Context fails closed when a selected asset no longer exists",()=>{
  const context=resolveSelectionContext({
    experience,
    manifest,
    graph,
    selection:{kind:"asset",index:999,sceneIndex:0},
  });
  assert.ok(context.issues.some((issue)=>issue.code==="missing-asset" && issue.severity==="blocker"));
  assert.match(context.selectionKey,/asset:missing/);
});

test("Capability Registry contracts validate as a closed orchestration surface",()=>{
  assert.deepEqual(validateCapabilityRegistry(),[]);
  assert.equal(new Set(forgeCapabilityRegistry.map((item)=>item.id)).size,forgeCapabilityRegistry.length);
  for(const capability of forgeCapabilityRegistry.filter((item)=>item.executionClass==="deep")) {
    assert.notEqual(capability.riskClass,"instant-reversible");
  }
});

test("Capability Registry exposes intent instead of subsystem menus",()=>{
  const scene=resolveSelectionContext({experience,manifest,graph,selection:{kind:"scene",index:0}});
  const capabilities=capabilitiesForContext(scene);
  assert.ok(capabilities.some((item)=>item.id==="scene.direct-camera"));
  assert.ok(capabilities.some((item)=>item.id==="scene.compose-motion"));
  assert.ok(capabilities.every((item)=>item.selectionKinds.includes("scene")));
  assert.ok(forgeCapabilityRegistry.every((item)=>item.intents.length>0));
  assert.ok(forgeCapabilityRegistry.every((item)=>item.systems.length>0));
});

test("Capability Registry changes recommendations with selection context",()=>{
  const camera=resolveSelectionContext({experience,manifest,graph,selection:{kind:"camera",index:0}});
  const cameraCapabilities=capabilitiesForContext(camera);
  assert.equal(cameraCapabilities[0]?.id,"camera.coordinate-motion");
  assert.ok(cameraCapabilities.some((item)=>item.advancedSurface==="Sequencer"));

  const asset=resolveSelectionContext({experience,manifest,graph,selection:{kind:"asset",index:0,sceneIndex:0}});
  const assetCapabilities=capabilitiesForContext(asset);
  assert.equal(assetCapabilities[0]?.id,"asset.inspect-optimize");
  assert.ok(assetCapabilities.some((item)=>item.dispatch.type==="loop" && item.dispatch.loop==="asset-quality"));
});

test("Intent matching stays bounded to capabilities valid for the current selection",()=>{
  const scene=resolveSelectionContext({experience,manifest,graph,selection:{kind:"scene",index:0}});
  const mobile=matchCapabilityIntent(scene,"fix mobile on this scene");
  assert.equal(mobile?.id,"scene.fix-mobile");

  const camera=resolveSelectionContext({experience,manifest,graph,selection:{kind:"camera",index:0}});
  const shot=matchCapabilityIntent(camera,"fine tune the camera keyframes");
  assert.equal(shot?.id,"camera.fine-tune");
  assert.notEqual(shot?.id,"scene.fix-mobile");
});

test("Proposal Contract records scope and verification before mutation",()=>{
  const context=resolveSelectionContext({experience,manifest,graph,selection:{kind:"asset",index:0,sceneIndex:0}});
  const capability=capabilitiesForContext(context).find((item)=>item.id==="asset.improve")!;
  const proposal=createProposalDraft({
    id:"proposal-asset-improve",
    createdAt:"2026-09-19T14:00:00.000Z",
    capability,
    context,
    intent:"Improve this asset without changing its identity",
    source:"semantic-action",
  });
  assert.equal(forgeProposalSchema.safeParse(proposal).success,true);
  assert.equal(proposal.state,"draft");
  assert.equal(proposal.riskClass,"preview-required");
  assert.ok(proposal.mutationScope.allowedPaths.includes("assetManifest"));
  assert.ok(proposal.mutationScope.allowedPaths.includes("candidateProjectState"));
  assert.ok(proposal.mutationScope.preserved.some((item)=>/authoritative production state/i.test(item)));
  assert.deepEqual(proposal.verification.required,capability.verifiers);
  assert.equal(proposalRequiresPreview(proposal),true);
  assert.equal(proposalCanMutateAuthoritativeState(proposal),false);
});

test("Proposal Contract never grants authoritative mutation to a preview-only proposal",()=>{
  const context=resolveSelectionContext({experience,manifest,graph,selection:{kind:"scene",index:0}});
  const capability=capabilitiesForContext(context).find((item)=>item.id==="scene.polish");
  if(!capability) return;
  const proposal=createProposalDraft({
    id:"proposal-scene-polish",
    createdAt:"2026-09-19T14:00:00.000Z",
    capability,
    context,
    intent:"Make this scene stronger",
  });
  const accepted={...proposal,state:"accepted" as const};
  assert.equal(proposalCanMutateAuthoritativeState(accepted),false);
});

test("Studio consumes the Control Plane instead of hardcoding contextual capability branches",()=>{
  const studio=fs.readFileSync("src/studio/ProductionStudioWorkbench.tsx","utf8");
  const loops=fs.readFileSync("src/studio/LoopEnginePanel.tsx","utf8");
  assert.match(studio,/resolveSelectionContext/);
  assert.match(studio,/capabilitiesForContext/);
  assert.match(studio,/createProposalDraft/);
  assert.match(studio,/data-capability=/);
  assert.doesNotMatch(studio,/if\(selection\.kind==="camera"\) return <section className="production-context"/);
  assert.match(loops,/initialLoopId/);
});


test("Intent Compiler maps outcome language to valid capabilities without exposing subsystems",()=>{
  const node=resolveSelectionContext({
    experience,
    manifest,
    graph,
    selection:{kind:"node",index:0,name:experience.productRig?.nodes[0] ?? "missing"},
  });
  const compiled=compileIntent(node,"make this part inspectable");
  assert.equal(compiled.status,"matched");
  assert.equal(compiled.capabilityId,"node.add-behavior");
  assert.ok(compiled.confidence>0);
});

test("Motion intent resolves to a context-appropriate archetype",()=>{
  const scene=resolveSelectionContext({experience,manifest,graph,selection:{kind:"scene",index:0}});
  assert.equal(motionArchetypeForIntent(scene,"editorial reveal"),"editorial-reveal");
  assert.equal(motionArchetypeForIntent(scene,"move through the threshold"),"threshold-passage");
  const productExperience=parseExperience(rawExperience);
  const product=resolveSelectionContext({experience:productExperience,manifest,graph,selection:{kind:"scene",index:0}});
  assert.equal(motionArchetypeForIntent(product,"make the assembly more mechanical"),"product-hero");
});

test("Next Action prioritizes unfinished production work",()=>{
  const source=parseExperience(rawExperience);
  source.scenes[0].motionTracks=[];
  const context=resolveSelectionContext({experience:source,manifest,graph,selection:{kind:"scene",index:0}});
  const next=recommendNextActions(context,1)[0];
  assert.equal(next?.capability.id,"scene.compose-motion");
  assert.equal(next?.urgency,"now");
});

test("Project Health is the single production-readiness abstraction",()=>{
  const source=parseExperience(rawExperience);
  source.scenes[0].motionTracks=[];
  delete source.scenes[0].mobileCamera;
  const health=evaluateProjectHealth({experience:source,manifest,graph,validationIssues:[]});
  assert.equal(health.status,"attention");
  assert.ok(health.issues.some((issue)=>issue.domain==="motion"));
  assert.ok(health.issues.some((issue)=>issue.domain==="mobile"));
  assert.ok(health.score<100);
});

test("Fast proposal prepares a candidate before working state changes",()=>{
  const source=parseExperience(rawExperience);
  source.scenes[0].motionTracks=[];
  const context=resolveSelectionContext({experience:source,manifest,graph,selection:{kind:"scene",index:0}});
  const capability=capabilitiesForContext(context).find((item)=>item.id==="scene.compose-motion")!;
  const before=JSON.stringify(source);
  const prepared=prepareFastProposal({
    id:"proposal-fast-motion",
    createdAt:"2026-09-19T14:00:00.000Z",
    capability,
    context,
    experience:source,
    intent:"compose motion",
    archetype:"editorial-reveal",
  });
  assert.equal(prepared.proposal.state,"ready");
  assert.ok(prepared.candidateExperience.scenes[0].motionTracks.length>0);
  assert.ok(prepared.proposal.changes.length>0);
  assert.equal(JSON.stringify(source),before);
});

test("Verified Loop candidates attach only to matching deep proposals",()=>{
  const context=resolveSelectionContext({experience,manifest,graph,selection:{kind:"scene",index:0}});
  const capability=capabilitiesForContext(context).find((item)=>item.id==="scene.polish");
  if(!capability) return;
  const proposal=createProposalDraft({
    id:"proposal-loop-polish",
    createdAt:"2026-09-19T14:00:00.000Z",
    capability,
    context,
    intent:"polish this scene",
  });
  const attached=attachVerifiedLoopCandidate(proposal,{
    runId:"loop-test-visual-polish",
    loopId:"visual-polish",
    projectId:"test-project",
    fingerprint:"a".repeat(64),
    repairSummary:["Improved hierarchy without a hard-gate regression."],
    preferenceAgreement:.9,
    experience,
    assetManifest:manifest,
    interactionGraph:graph,
  });
  assert.equal(attached.state,"ready");
  assert.ok(attached.verification.results.every((result)=>result.status==="passed"));
  assert.equal(attached.candidate?.fingerprint,"a".repeat(64));
  assert.throws(()=>attachVerifiedLoopCandidate(proposal,{
    runId:"loop-test-performance",
    loopId:"performance",
    projectId:"test-project",
    fingerprint:"b".repeat(64),
    repairSummary:[],
    preferenceAgreement:.9,
    experience,
    assetManifest:manifest,
    interactionGraph:graph,
  }));
});

test("Studio exposes Build Review Ship and keeps specialist tools under Advanced",()=>{
  const studio=fs.readFileSync("src/studio/ProductionStudioWorkbench.tsx","utf8");
  assert.match(studio,/primarySurfaces = \["Build", "Review", "Ship"\]/);
  assert.match(studio,/production-advanced-menu/);
  assert.match(studio,/ReviewSurface/);
  assert.match(studio,/ShipSurface/);
  assert.match(studio,/NEXT BEST ACTION/);
  assert.match(studio,/Project Health/);
  assert.doesNotMatch(studio,/const workspaces = \["Create", "Motion", "Interact", "Assets", "Ship"\]/);
});

test("Deep proposal evidence returns through the verified local Loop result bridge",()=>{
  const loopPanel=fs.readFileSync("src/studio/LoopEnginePanel.tsx","utf8");
  const route=fs.readFileSync("app/api/studio/loops/results/route.ts","utf8");
  assert.match(loopPanel,/Load verified candidate/);
  assert.match(loopPanel,/onCandidateReady/);
  assert.match(route,/requireStudioRole\(request,"reviewer"\)/);
  assert.match(route,/acceptedExperiencePath/);
  assert.match(route,/safeArtifactPath/);
});


test("Build no longer exposes raw camera/environment mutation controls",()=>{
  const studio=fs.readFileSync("src/studio/ProductionStudioWorkbench.tsx","utf8");
  assert.doesNotMatch(studio,/Start FOV/);
  assert.doesNotMatch(studio,/Apply motion/);
  assert.doesNotMatch(studio,/createMotionArchetype/);
  assert.doesNotMatch(studio,/buildSelectedNode/);
  assert.match(studio,/RefinePanel/);
});

test("Accepted proposal bundles have atomic undo and redo history",()=>{
  const draft=fs.readFileSync("src/studio/useStudioDraft.ts","utf8");
  assert.match(draft,/applyProjectBundle/);
  assert.match(draft,/undoProjectBundle/);
  assert.match(draft,/redoProjectBundle/);
  assert.match(draft,/clearProjectBundleHistory/);
  assert.match(draft,/setAssetManifestState/);
  assert.match(draft,/setInteractionGraphState/);
});
