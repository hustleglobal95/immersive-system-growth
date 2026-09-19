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
