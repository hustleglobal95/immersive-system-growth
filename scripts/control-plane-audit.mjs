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
if(previewed.length!==deep.length) {
  issues.push({capabilityId:"registry",message:"Every deep capability must require preview or approval."});
}

const studio=fs.readFileSync("src/studio/ProductionStudioWorkbench.tsx","utf8");
const publish=fs.readFileSync("src/studio/ProjectPanels.tsx","utf8");
const deepRoute=fs.readFileSync("app/api/studio/loops/results/route.ts","utf8");
const draft=fs.readFileSync("src/studio/useStudioDraft.ts","utf8");
const loopPanel=fs.readFileSync("src/studio/LoopEnginePanel.tsx","utf8");
const loopRunner=fs.readFileSync("scripts/loop-run.mjs","utf8");

if(!studio.includes("const editorTabs = [") || !studio.includes('{ label:"Canvas", workspace:null }') || !studio.includes('{ label:"References", workspace:"References" }') || !studio.includes('{ label:"Motion", workspace:"Motion" }') || !studio.includes('{ label:"Interactions", workspace:"Interact" }') || !studio.includes('{ label:"Assets", workspace:"Assets" }') || !studio.includes('{ label:"Effects", workspace:"Visuals" }')) {
  issues.push({capabilityId:"studio",message:"Forge must expose Canvas, References, Motion, Interactions, Assets and Effects as first-class editor workspaces."});
}
if(studio.includes("SimpleForgeStudio") || studio.includes("production-advanced-menu")) {
  issues.push({capabilityId:"studio",message:"Retired simple/advanced product splits must not return."});
}
for(const required of ["compileIntent","recommendNextActions","evaluateProjectHealth","ControlPlaneReview"]) {
  if(!studio.includes(required)) issues.push({capabilityId:"studio",message:"Studio is missing Control Plane integration: "+required+"."});
}
for(const forbidden of ["createMotionArchetype","applyArchetype","buildSelectedNode","Start FOV"]) {
  if(studio.includes(forbidden)) issues.push({capabilityId:"studio",message:"Build surface bypasses Control Plane with legacy direct control: "+forbidden+"."});
}
if(!publish.includes("healthReady") || !publish.includes("Project Health")) {
  issues.push({capabilityId:"ship",message:"Publishing must use Project Health as a release-readiness gate."});
}
if(!deepRoute.includes('requireStudioRole(request,"reviewer")') || !deepRoute.includes("safeArtifactPath")) {
  issues.push({capabilityId:"deep-candidate",message:"Loop-result bridge must remain reviewer-protected and path-bounded."});
}
for(const required of ["applyProjectBundle","undoProjectBundle","redoProjectBundle"]) {
  if(!draft.includes(required)) issues.push({capabilityId:"history",message:"Working-draft proposal history is missing "+required+"."});
}
for(const required of ["proposal-id","selection-key","baseline-fingerprint"]) {
  if(!loopRunner.includes(required)) issues.push({capabilityId:"deep-candidate",message:"Loop runner is missing Control Plane provenance field "+required+"."});
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
    kind,
    forgeCapabilityRegistry.filter((item)=>item.executionClass===kind).length,
  ]));
  console.log(
    "Control Plane audit passed: "
    +forgeCapabilityRegistry.length+" capabilities · "
    +requiredKinds.length+" selection kinds · "
    +JSON.stringify(counts)
  );
}
