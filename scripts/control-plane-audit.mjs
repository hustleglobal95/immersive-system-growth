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

if(!studio.includes('const primarySurfaces = ["Build", "Review", "Ship"] as const')) {
  issues.push({capabilityId:"studio",message:"Primary Studio navigation must remain Build / Review / Ship."});
}
if(/const workspaces\s*=\s*\["Create",\s*"Motion",\s*"Interact",\s*"Assets",\s*"Ship"\]/.test(studio)) {
  issues.push({capabilityId:"studio",message:"Retired five-workspace navigation returned to the default Studio surface."});
}
for(const required of ["compileIntent","recommendNextActions","evaluateProjectHealth","ControlPlaneReview"]) {
  if(!studio.includes(required)) issues.push({capabilityId:"studio",message:"Studio is missing Control Plane integration: "+required+"."});
}
for(const forbidden of ["createMotionArchetype","applyArchetype","buildSelectedNode","Start FOV"]) {
  if(studio.includes(forbidden)) issues.push({capabilityId:"studio",message:"Build surface bypasses Control Plane with legacy direct control: "+forbidden+"."});
}
if(!publish.includes("healthReady") || !publish.includes("Project Health")) {
  issues.push({capabilityId:"ship",message:"Guided Ship must use Project Health as a release-readiness gate."});
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
