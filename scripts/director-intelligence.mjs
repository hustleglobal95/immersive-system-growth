import fs from "node:fs/promises";
import { parseDirectorBrief } from "../src/platform/directorSchema.ts";
import { runDirectorIntelligence } from "../src/platform/director-intelligence/orchestrator.ts";

const inputPath = process.argv[2] || "config/director-brief.example.json";
const outputPath = process.argv[3] || "director-intelligence-report.json";
const portfolioPath = process.argv.find((arg) => arg.startsWith("--portfolio="))?.split("=")[1];
const raw = JSON.parse(await fs.readFile(inputPath, "utf8"));
const brief = parseDirectorBrief(raw);
const portfolio = portfolioPath ? JSON.parse(await fs.readFile(portfolioPath, "utf8")) : [];
const result = runDirectorIntelligence({ brief, portfolio });
await fs.writeFile(outputPath, JSON.stringify(result, null, 2) + "\n");
console.log(`Forge Director Intelligence: ${result.report.verdict}`);
console.log(`Selected territory: ${result.report.treatment.selectedTerritoryId}`);
console.log(`Creative ceiling: ${result.report.ceiling.current.toFixed(1)} -> ${result.report.ceiling.projected.toFixed(1)}`);
console.log(`Stress resilience: ${result.report.stress.resilienceScore.toFixed(1)}/10`);
console.log(`Blockers: ${result.report.blockers.length}`);
console.log(`Wrote ${outputPath}`);
