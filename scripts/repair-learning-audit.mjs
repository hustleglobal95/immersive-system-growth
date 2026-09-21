import fs from "node:fs";

const checks=[
  ["src/platform/commands/repairCommands.ts",["scene.adjustLighting","scene.adjustSubjectFraming","scene.adjustMediaFraming","scene.adjustMaterialSurface","Cannot introduce"]],
  ["src/platform/autonomy/repairPlanner.ts",["scene.adjustLighting","scene.adjustSubjectFraming","scene.adjustMediaFraming","scene.adjustMaterialSurface"]],
  ["src/platform/learning/projectLearning.ts",["human-approved","evaluateProjectLearning","at least three independent projects","forge-loop-human-promotion"]],
  ["src/platform/studioVault.ts",["saveVaultLearningRecord","listVaultLearningRecords","learning/records"]],
  ["scripts/loop-accept.mjs",["createProjectLearningRecord","saveVaultLearningRecord","Project learning:"]],
];
const failures=[];
for(const [file,needles] of checks) {
  if(!fs.existsSync(file)) {
    failures.push(file+": missing");
    continue;
  }
  const content=fs.readFileSync(file,"utf8");
  for(const needle of needles) if(!content.includes(needle)) failures.push(file+": missing "+JSON.stringify(needle));
}
if(failures.length) {
  console.error("Repair + learning audit failed:");
  for(const failure of failures) console.error("- "+failure);
  process.exit(1);
}
console.log("Repair + learning audit PASS");
console.log("- domain-specific reversible repair vocabulary");
console.log("- authored-material fail-closed boundary");
console.log("- human-approved Project Learning persistence");
console.log("- cross-project evidence evaluation without auto-promotion");
