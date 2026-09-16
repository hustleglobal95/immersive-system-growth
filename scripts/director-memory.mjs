import fs from "node:fs/promises";
import path from "node:path";
import { parseDirectorBrief, parseDirectorTreatment } from "../src/platform/directorSchema.ts";
import { createEmptyMemoryGraph, ingestProjectMemory } from "../src/platform/director-intelligence/memory.ts";
import { fingerprintTreatment } from "../src/platform/director-intelligence/portfolioMemory.ts";

const briefPath = process.argv[2];
const treatmentPath = process.argv[3];
if (!briefPath || !treatmentPath) {
  console.error("Usage: npm run director:memory -- <brief.json> <approved-treatment.json>");
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
const fingerprint = fingerprintTreatment(treatment, projectId);
await fs.mkdir(path.dirname(memoryPath), { recursive: true });
await fs.writeFile(memoryPath, JSON.stringify(graph, null, 2) + "\n");
await fs.writeFile(fingerprintPath, JSON.stringify(fingerprint, null, 2) + "\n");
console.log(`Stored Director memory for ${projectId}: ${graph.nodes.length} nodes, ${graph.edges.length} edges.`);
