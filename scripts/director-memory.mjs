import fs from "node:fs/promises";
import path from "node:path";
import { parseDirectorBrief, parseDirectorTreatment } from "../src/platform/directorSchema.ts";
import { createEmptyMemoryGraph, ingestCreativeIntelligenceMemory, ingestProjectMemory } from "../src/platform/director-intelligence/memory.ts";
import { fingerprintTreatment } from "../src/platform/director-intelligence/portfolioMemory.ts";

const briefPath = process.argv[2];
const treatmentPath = process.argv[3];
const intelligencePath = process.argv.find((arg) => arg.startsWith("--intelligence="))?.slice("--intelligence=".length);
const selectedMutationId = process.argv.find((arg) => arg.startsWith("--mutation="))?.slice("--mutation=".length);
if (!briefPath || !treatmentPath) {
  console.error("Usage: npm run director:memory -- <brief.json> <approved-treatment.json> [--intelligence=<director-intelligence-report.json>] [--mutation=<approved-mutation-id>]");
  process.exit(1);
}
const brief = parseDirectorBrief(JSON.parse(await fs.readFile(briefPath, "utf8")));
const treatment = parseDirectorTreatment(JSON.parse(await fs.readFile(treatmentPath, "utf8")));
const projectId = treatment.projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "director-project";
const memoryPath = path.join("forge-intelligence", "projects", `${projectId}.memory.json`);
const fingerprintPath = path.join("forge-intelligence", "projects", `${projectId}.fingerprint.json`);
let graph = createEmptyMemoryGraph();
try { graph = JSON.parse(await fs.readFile(memoryPath, "utf8")); } catch {}
graph = ingestProjectMemory(graph, projectId, brief, treatment);
if (intelligencePath) {
  const intelligence = JSON.parse(await fs.readFile(intelligencePath, "utf8"));
  const dna=intelligence.creativeDNA;
  const artDirection=intelligence.artDirection;
  const disciplineDirections=intelligence.disciplineDirections;
  const visualLanguage=(intelligence.visualLanguages ?? []).find((item)=>item.territoryId===treatment.selectedTerritoryId) ?? intelligence.visualLanguages?.[0];
  const selectedMutation=selectedMutationId ? (intelligence.creativeMutations ?? []).find((item)=>item.id===selectedMutationId) : undefined;
  if(!dna || !artDirection || !disciplineDirections || !visualLanguage) {
    throw new Error("The intelligence report is missing Creative Intelligence 2 outputs required for memory ingestion.");
  }
  if(selectedMutationId && !selectedMutation) throw new Error(`Mutation ${selectedMutationId} was not found in the intelligence report.`);
  graph=ingestCreativeIntelligenceMemory(graph,projectId,brief,{dna,artDirection,visualLanguage,disciplineDirections,selectedMutation});
}
const fingerprint = fingerprintTreatment(treatment, projectId);
await fs.mkdir(path.dirname(memoryPath), { recursive: true });
await fs.writeFile(memoryPath, JSON.stringify(graph, null, 2) + "\n");
await fs.writeFile(fingerprintPath, JSON.stringify(fingerprint, null, 2) + "\n");
console.log(`Stored Director memory for ${projectId}: ${graph.nodes.length} nodes, ${graph.edges.length} edges${intelligencePath ? " including Creative Intelligence 2." : "."}`);
