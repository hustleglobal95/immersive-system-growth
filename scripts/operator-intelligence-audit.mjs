import fs from "node:fs";

const issues=[];
const required=[
  "src/platform/control-plane/mission.ts",
  "src/platform/control-plane/planGraph.ts",
  "src/platform/control-plane/outcomeEngine.ts",
  "src/platform/control-plane/autopilot.ts",
  "src/platform/control-plane/continuousCritic.ts",
  "docs/OPERATOR_INTELLIGENCE.md",
];
for(const path of required) if(!fs.existsSync(path)) issues.push(`Missing Operator Intelligence file: ${path}`);

const studio=fs.readFileSync("src/studio/ForgeEditor.tsx","utf8");
const mission=fs.readFileSync("src/platform/control-plane/mission.ts","utf8");
const plan=fs.readFileSync("src/platform/control-plane/planGraph.ts","utf8");
const autopilot=fs.readFileSync("src/platform/control-plane/autopilot.ts","utf8");

if(studio.includes("OperatorMissionControl") || studio.includes("primarySurfaces")) issues.push("Operator intelligence must not create a competing workflow shell inside the editor.");
for(const token of ["creative-world","signature-moment","final-approval"]) if(!mission.includes(token)) issues.push(`Mission Contract is missing human gate: ${token}`);
if(!plan.includes("capabilityById")) issues.push("Plan Graph must resolve through the Capability Registry.");
for(const token of ["instant-reversible","preview-required","approval-required","human-gate"]) if(!autopilot.includes(token)) issues.push(`Autopilot policy is missing safety contract: ${token}`);

if(issues.length){console.error("Operator Intelligence audit failed:");for(const issue of issues) console.error("- "+issue);process.exit(1);}
console.log("Operator Intelligence audit passed.");
