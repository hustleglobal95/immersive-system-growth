import fs from "node:fs";
import { forgeCapabilityRegistry, validateCapabilityRegistry } from "../src/platform/control-plane/capabilityRegistry.ts";

const issues=validateCapabilityRegistry();
const selectionKinds=new Set(forgeCapabilityRegistry.flatMap((item)=>item.selectionKinds));
const requiredKinds=["scene","camera","node","copy","media","asset","environment"];
for(const kind of requiredKinds) {
  if(!selectionKinds.has(kind)) issues.push({capabilityId:"registry",message:"No Control Plane capability covers selection kind "+kind+"."});
}

const deep=forgeCapabilityRegistry.filter((item)=>item.executionClass==="deep");
const previewed=deep.filter((item)=>item.riskClass==="preview-required" || item.riskClass==="approval-required");
if(previewed.length!==deep.length) issues.push({capabilityId:"registry",message:"Every deep capability must require preview or approval."});

const studio=fs.readFileSync("src/studio/ForgeEditor.tsx","utf8");
const publish=fs.readFileSync("src/studio/ProjectPanels.tsx","utf8");
const deepRoute=fs.readFileSync("app/api/studio/loops/results/route.ts","utf8");
const draft=fs.readFileSync("src/studio/useStudioDraft.ts","utf8");
const loopPanel=fs.readFileSync("src/studio/LoopEnginePanel.tsx","utf8");
const loopRunner=fs.readFileSync("scripts/loop-run.mjs","utf8");

for(const token of ['id:"design",label:"Design"','id:"references",label:"References"','id:"motion",label:"Motion"','id:"interactions",label:"Interact"','id:"assets",label:"Assets"','id:"effects",label:"Effects"']) {
  if(!studio.includes(token)) issues.push({capabilityId:"studio",message:"Forge editor is missing first-class mode: "+token});
}
for(const token of ["StudioLivePreview","Interactive3DBuildDock","evaluateProjectHealth","PublishPanel","LoopEnginePanel"]) {
  if(!studio.includes(token)) issues.push({capabilityId:"studio",message:"Forge editor is missing production integration: "+token});
}
if(studio.includes("SimpleForgeStudio") || studio.includes("ProductionStudioWorkbench") || studio.includes("production-advanced-menu")) {
  issues.push({capabilityId:"studio",message:"Retired Studio product shells must not return."});
}
if(!publish.includes("healthReady") || !publish.includes("Project Health")) issues.push({capabilityId:"ship",message:"Publishing must use Project Health as a release-readiness gate."});
if(!deepRoute.includes('requireStudioRole(request,"reviewer")') || !deepRoute.includes("safeArtifactPath")) issues.push({capabilityId:"deep-candidate",message:"Loop-result bridge must remain reviewer-protected and path-bounded."});
for(const required of ["applyProjectBundle","undoProjectBundle","redoProjectBundle"]) {
  if(!draft.includes(required)) issues.push({capabilityId:"history",message:"Working-draft history is missing "+required+"."});
}
for(const required of ["proposal-id","selection-key","baseline-fingerprint"]) {
  if(!loopRunner.includes(required)) issues.push({capabilityId:"deep-candidate",message:"Loop runner is missing provenance field "+required+"."});
}
for(const required of ["proposalBaselineMatches","vaultMatchesWorking","projectStateFingerprint"]) {
  if(!loopPanel.includes(required)) issues.push({capabilityId:"deep-candidate",message:"Studio deep-run source parity is missing "+required+"."});
}

if(issues.length) {
  console.error("Control Plane audit failed:");
  for(const issue of issues) console.error("- "+issue.capabilityId+": "+issue.message);
  process.exitCode=1;
} else {
  const counts=Object.fromEntries(["fast","deep","editor","navigation"].map((kind)=>[
    kind,forgeCapabilityRegistry.filter((item)=>item.executionClass===kind).length,
  ]));
  console.log("Control Plane audit passed: "+forgeCapabilityRegistry.length+" capabilities · "+requiredKinds.length+" selection kinds · "+JSON.stringify(counts));
}
