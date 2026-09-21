import fs from "node:fs";

const checks=[
  ["src/platform/agentic/creativeStateGraph.ts",["buildCreativeStateGraph","director-locked","buildSignatureSliceGate"]],
  ["src/platform/agentic/contextCompiler.ts",["compileAgentContext","allowedCapabilityIds","deniedActions","do not reload the entire project"]],
  ["src/platform/agentic/capabilityRouter.ts",["routeVisualFinding","allowedRepairCommands","human-review","engineering-escalation"]],
  ["src/platform/autonomy/repairPlanner.ts",["routeVisualFinding","allowedRepairCommands.includes"]],
  ["src/platform/buildPacket.ts",["## CREATIVE STATE GRAPH","## SIGNATURE SLICE GATE","## AGENTIC EXECUTION MODEL"]],
  [".claude/skills/forge-build/SKILL.md",["npm run forge:context","Signature Slice Gate"]],
  ["CLAUDE.md",["Creative State Graph","Context Capsule","Capability Router","Signature Slice Gate"]],
];
const failures=[];
for(const [file,patterns] of checks) {
  if(!fs.existsSync(file)) {
    failures.push(file+": missing");
    continue;
  }
  const content=fs.readFileSync(file,"utf8");
  for(const pattern of patterns) if(!content.includes(pattern)) failures.push(file+": missing contract "+JSON.stringify(pattern));
}
if(failures.length) {
  console.error("Agentic consistency audit failed:");
  for(const failure of failures) console.error("- "+failure);
  process.exit(1);
}
console.log("Agentic consistency audit PASS");
console.log("- canonical Creative State Graph");
console.log("- task-scoped Context Compiler");
console.log("- capability-routed mutation ownership");
console.log("- signature-slice gating");
console.log("- Claude execution contract wiring");
