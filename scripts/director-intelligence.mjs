import fs from "node:fs/promises";
import path from "node:path";
import { parseDirectorBrief } from "../src/platform/directorSchema.ts";
import { runDirectorIntelligence } from "../src/platform/director-intelligence/orchestrator.ts";
import { seedPrecedents } from "../src/platform/director-intelligence/precedents.ts";

const inputPath = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "config/director-brief.example.json";
const outputArg = process.argv[3] && !process.argv[3].startsWith("--") ? process.argv[3] : undefined;
const outputPath = outputArg || "director-intelligence-report.json";
const portfolioPath = process.argv.find((arg) => arg.startsWith("--portfolio="))?.split("=")[1];
const decisionsPath = process.argv.find((arg) => arg.startsWith("--decisions="))?.split("=")[1];
const memoryPath = process.argv.find((arg) => arg.startsWith("--memory="))?.split("=")[1];
const operatorId = process.argv.find((arg) => arg.startsWith("--operator="))?.split("=")[1];
const raw = JSON.parse(await fs.readFile(inputPath, "utf8"));
const brief = parseDirectorBrief(raw);

const externalPrecedents = await loadJsonDirectory("forge-intelligence/precedents");
const storedPortfolio = (await loadJsonDirectory("forge-intelligence/projects", ".fingerprint.json")).flatMap((value) => Array.isArray(value) ? value : [value]);
const explicitPortfolio = portfolioPath ? JSON.parse(await fs.readFile(portfolioPath, "utf8")) : [];
const portfolio = [...storedPortfolio, ...(Array.isArray(explicitPortfolio) ? explicitPortfolio : [explicitPortfolio])].filter((item) => item?.projectId);
const projectTasteId=slug(brief.projectName);
const studioTaste = await readOptionalJson("forge-intelligence/taste/profile.json");
const operatorTaste = operatorId ? await readOptionalJson(`forge-intelligence/taste/operators/${slug(operatorId)}.json`) : undefined;
const projectTaste = await readOptionalJson(`forge-intelligence/taste/projects/${projectTasteId}.json`);
const tasteLayers = studioTaste || operatorTaste || projectTaste ? { studio:studioTaste,operator:operatorTaste,project:projectTaste } : undefined;
const memory = memoryPath ? await readOptionalJson(memoryPath) : undefined;
const decisions = decisionsPath ? await readOptionalJson(decisionsPath) : undefined;

const approvals = {
  brandTruthConfirmed: process.argv.includes("--confirm-brand-truth"),
  lockedTerritoryId: process.argv.find((arg) => arg.startsWith("--lock-territory="))?.split("=")[1],
  assetSpendApproved: process.argv.includes("--approve-asset-spend"),
  finalCutApproved: process.argv.includes("--final-cut-approved"),
};
const finalCutRequested = process.argv.includes("--final-cut") || approvals.finalCutApproved;

const result = runDirectorIntelligence({
  brief,
  precedents: [...seedPrecedents, ...externalPrecedents],
  portfolio,
  ...(tasteLayers ? { tasteLayers } : {}),
  ...(memory ? { memory } : {}),
  ...(decisions ? { decisions } : {}),
  approvals,
  finalCutRequested,
});
await fs.writeFile(outputPath, JSON.stringify(result, null, 2) + "\n");
console.log(`Forge Director Intelligence: ${result.report.verdict}`);
console.log(`Selected territory: ${result.report.treatment.selectedTerritoryId}`);
console.log(`Creative ceiling: ${result.creativeCeiling.current.toFixed(1)} -> ${result.creativeCeiling.projected.toFixed(1)}`);
console.log(`Stress resilience: ${result.report.stress.resilienceScore.toFixed(1)}/10`);
console.log(`Creative blockers: ${result.report.blockers.length}`);
console.log(`Pending human gates: ${result.humanGates.pending.length}`);
console.log(`Production authorized: ${result.productionPlan.readiness.readyForProduction ? "yes" : "no"}`);
console.log(`Stored portfolio fingerprints considered: ${portfolio.length}`);
console.log(`External precedents loaded: ${externalPrecedents.length}`);
console.log(`Taste model: ${result.tasteModel.contributions.map((item) => `${item.layer}:${Math.round(item.confidence*100)}%`).join(" · ") || "none"}`);
console.log(`Visual-language minimum distance: ${result.visualLanguageDivergence.minimumDistance}% (required ${result.visualLanguageDivergence.threshold}%)`);
console.log(`Creative-memory verdict: ${result.creativeMemory.verdict}`);
console.log(`Wrote ${outputPath}`);

async function readOptionalJson(filePath) {
  try { return JSON.parse(await fs.readFile(filePath, "utf8")); } catch (error) { if (error?.code === "ENOENT") return undefined; throw error; }
}

async function loadJsonDirectory(directory, suffix = ".json") {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const files = entries.filter((entry) => entry.isFile() && entry.name.endsWith(suffix)).map((entry) => path.join(directory, entry.name)).sort();
    const values = [];
    for (const file of files) values.push(JSON.parse(await fs.readFile(file, "utf8")));
    return values;
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}


function slug(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9-]+/g,"-").replace(/^-+|-+$/g,"") || "project";
}
