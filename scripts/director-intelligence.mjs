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
const raw = JSON.parse(await fs.readFile(inputPath, "utf8"));
const brief = parseDirectorBrief(raw);

const externalPrecedents = await loadJsonDirectory("forge-intelligence/precedents");
const storedPortfolio = (await loadJsonDirectory("forge-intelligence/projects", ".fingerprint.json")).flatMap((value) => Array.isArray(value) ? value : [value]);
const explicitPortfolio = portfolioPath ? JSON.parse(await fs.readFile(portfolioPath, "utf8")) : [];
const portfolio = [...storedPortfolio, ...(Array.isArray(explicitPortfolio) ? explicitPortfolio : [explicitPortfolio])].filter((item) => item?.projectId);
const taste = await readOptionalJson("forge-intelligence/taste/profile.json");
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
  ...(taste ? { taste } : {}),
  ...(decisions ? { decisions } : {}),
  approvals,
  finalCutRequested,
});
await fs.writeFile(outputPath, JSON.stringify(result, null, 2) + "\n");
console.log(`Forge Director Intelligence: ${result.report.verdict}`);
console.log(`Selected territory: ${result.report.treatment.selectedTerritoryId}`);
console.log(`Creative ceiling: ${result.report.ceiling.current.toFixed(1)} -> ${result.report.ceiling.projected.toFixed(1)}`);
console.log(`Stress resilience: ${result.report.stress.resilienceScore.toFixed(1)}/10`);
console.log(`Creative blockers: ${result.report.blockers.length}`);
console.log(`Pending human gates: ${result.humanGates.pending.length}`);
console.log(`Production authorized: ${result.productionPlan.readiness.readyForProduction ? "yes" : "no"}`);
console.log(`Stored portfolio fingerprints considered: ${portfolio.length}`);
console.log(`External precedents loaded: ${externalPrecedents.length}`);
console.log(`Taste confidence: ${taste ? Math.round((taste.confidence ?? 0) * 100) : 0}%`);
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
