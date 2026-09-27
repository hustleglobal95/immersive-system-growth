import fs from "node:fs";

const checks=[
  ["src/platform/agentic/creativeStateGraph.ts",["buildCreativeStateGraph","director-locked","buildSignatureSliceGate"]],
  ["src/platform/agentic/contextCompiler.ts",["compileAgentContext","allowedCapabilityIds","deniedActions","do not reload the entire project"]],
  ["src/platform/agentic/capabilityRouter.ts",["routeVisualFinding","allowedRepairCommands","human-review","engineering-escalation"]],
  ["src/platform/autonomy/repairPlanner.ts",["routeVisualFinding","allowedRepairCommands.includes"]],
  ["src/platform/buildPacket.ts",["## CREATIVE STATE GRAPH","## SIGNATURE SLICE GATE","## AGENTIC EXECUTION MODEL"]],
  [".claude/skills/forge-build/SKILL.md",["npm run forge:context","Signature Slice Gate"]],
  ["CLAUDE.md",["Creative State Graph","Context Capsule","Capability Router","Signature Slice Gate","forge:preflight","USE FORGE"]],
  ["AGENTS.md",["forge:preflight","USE FORGE","Full-system Forge execution"]],
  ["config/forge-execution-policy.json",["forge-full-system-execution","clean-baseline","state-provenance","reference-intelligence","signature-slice-gate","separatePullRequestRequired"]],
  ["scripts/forge-preflight.mjs",["FORGE FULL-SYSTEM PREFLIGHT PASS","rawPromptCommitted:false","requiredContextDomains"]],
  ["scripts/forge-execution-audit.mjs",["changed-file gate FAILED","separation-of-duties gate FAILED","required stage not PASS"]],
  [".github/workflows/ci.yml",["Exercise full-system Forge preflight","forge:execution:audit -- --changed"]],
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
console.log("- full-system Forge preflight governance");
console.log("- governed creative change enforcement");
