import fs from "node:fs";

const issues=[];
const required=[
  "src/platform/control-plane/mission.ts",
  "src/platform/control-plane/planGraph.ts",
  "src/platform/control-plane/outcomeEngine.ts",
  "src/platform/control-plane/autopilot.ts",
  "src/platform/control-plane/continuousCritic.ts",
  "src/studio/OperatorMissionControl.tsx",
  "docs/OPERATOR_INTELLIGENCE.md",
];
for(const path of required) {
  if(!fs.existsSync(path)) issues.push(`Missing Operator Intelligence file: ${path}`);
}

const studio=fs.readFileSync("src/studio/ProductionStudioWorkbench.tsx","utf8");
const mission=fs.readFileSync("src/platform/control-plane/mission.ts","utf8");
const plan=fs.readFileSync("src/platform/control-plane/planGraph.ts","utf8");
const autopilot=fs.readFileSync("src/platform/control-plane/autopilot.ts","utf8");
const surface=fs.readFileSync("src/studio/OperatorMissionControl.tsx","utf8");

for(const token of ["compileMission","buildMissionPlan","OperatorMissionControl","runMissionStep","contextOverride:SelectionContext"]) {
  if(!studio.includes(token)) issues.push(`Studio is missing Operator Intelligence integration: ${token}`);
}
if(!studio.includes('const primarySurfaces = ["Build", "Review", "Ship"] as const')) {
  issues.push("Operator Intelligence must not add a fourth permanent Studio destination.");
}
if(/primarySurfaces\s*=\s*\[[^\]]*Mission/i.test(studio)) {
  issues.push("Mission Control must live inside Build, not permanent navigation.");
}
for(const token of ["creative-world","signature-moment","final-approval"]) {
  if(!mission.includes(token)) issues.push(`Mission Contract is missing human gate: ${token}`);
}
if(!plan.includes("capabilityById")) issues.push("Plan Graph must resolve through the Capability Registry.");
for(const token of ["instant-reversible","preview-required","approval-required","human-gate"]) {
  if(!autopilot.includes(token)) issues.push(`Autopilot policy is missing safety contract: ${token}`);
}
for(const token of ["guide","copilot","autopilot","NEXT OUTCOME","SIGNATURE MOMENT"]) {
  if(!surface.includes(token)) issues.push(`Mission Control UI is missing operator contract: ${token}`);
}

if(issues.length) {
  console.error("Operator Intelligence audit failed:");
  for(const issue of issues) console.error("- "+issue);
  process.exit(1);
}
console.log("Operator Intelligence audit passed.");
