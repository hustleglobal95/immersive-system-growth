import fs from "node:fs/promises";
import { parseDirectorBrief } from "../src/platform/directorSchema.ts";
import { runDirectorIntelligence } from "../src/platform/director-intelligence/orchestrator.ts";

const brief = parseDirectorBrief(JSON.parse(await fs.readFile("clients/heliot/director-brief.json", "utf8")));
const result = runDirectorIntelligence({ brief });
const { report, productionPlan, humanGates } = result;

if (report.treatment.territories.length !== 3) throw new Error("HELIOT Director must produce exactly three territories.");
if (report.selectedEvaluation.critiques.length !== 12) throw new Error("HELIOT Director Council is incomplete.");
if (report.stress.results.length < 12) throw new Error("HELIOT stress lab is incomplete.");
if (report.planningDisposition === "REJECT") throw new Error(`HELIOT Director planning rejected the current direction: ${report.blockers.join(" | ")}`);
if (productionPlan.creativePlan.scenes.length < 5) throw new Error("HELIOT Director handoff produced an incomplete Creative Plan.");

console.log(`HELIOT planning disposition: ${report.planningDisposition}`);
console.log(`HELIOT rendered judgment: ${report.verdict}`);
console.log(`Selected territory: ${report.treatment.selectedTerritoryId}`);
console.log(`Creative ceiling: ${report.ceiling.current.toFixed(1)} -> ${report.ceiling.projected.toFixed(1)}`);
console.log(`Stress resilience: ${report.stress.resilienceScore.toFixed(1)}/10`);
console.log(`Council roles: ${report.selectedEvaluation.critiques.length}`);
console.log(`Human gates pending: ${humanGates.pending.length}`);
console.log("HELIOT Director Intelligence audit passed.");
