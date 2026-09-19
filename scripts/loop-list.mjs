import { loopDefinitions } from "../src/platform/loops/loopRegistry.ts";

console.log("Forge Loop Engine");
for(const loop of loopDefinitions) {
  console.log("\n"+loop.id+" · "+loop.label+" · "+(loop.executable ? "EXECUTABLE" : "CONTRACT ONLY"));
  console.log("  "+loop.description);
  console.log("  worker: "+loop.worker);
  console.log("  verifiers: "+loop.verifiers.join(", "));
  console.log("  cycles/candidates: "+loop.budgets.maxCycles+" / "+loop.budgets.maxCandidatesPerCycle);
}
