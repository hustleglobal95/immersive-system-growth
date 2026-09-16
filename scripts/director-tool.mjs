import fs from "node:fs/promises";
import { parseDirectorBrief } from "../src/platform/directorSchema.ts";
import { runDirectorIntelligence } from "../src/platform/director-intelligence/orchestrator.ts";
import { buildEvidenceReport } from "../src/platform/director-intelligence/evidence.ts";
import { retrievePrecedents } from "../src/platform/director-intelligence/precedents.ts";
import { runStressLab } from "../src/platform/director-intelligence/stressTests.ts";
import { reviewProduction } from "../src/platform/director-intelligence/continuousCritic.ts";
import { createDecisionLedger } from "../src/platform/director-intelligence/decisionLedger.ts";
import { synthesizePostmortem } from "../src/platform/director-intelligence/learning.ts";
import { calibrationCases } from "../src/platform/director-intelligence/calibration.ts";
import { buildResearchBrief } from "../src/platform/director-intelligence/research.ts";

const mode = process.argv[2];
if (!mode) {
  console.error("Usage: node --import tsx scripts/director-tool.mjs <discover|precedents|diverge|debate|critique|kill|stress|similarity|ceiling|assets|production|review|final-cut|postmortem|calibrate> [brief.json] [args]");
  process.exit(1);
}
const positional = process.argv.slice(3).filter((arg) => !arg.startsWith("--"));
const briefArg = positional.find((arg) => !/^\d+$/.test(arg));
const inputPath = briefArg || "config/director-brief.example.json";
const brief = parseDirectorBrief(JSON.parse(await fs.readFile(inputPath, "utf8")));
const run = runDirectorIntelligence({ brief });
const report = run.report;
let output;
switch (mode) {
  case "discover": output = { evidence: buildEvidenceReport(brief, report.treatment), researchBrief: buildResearchBrief(brief.projectName, brief.projectType, brief.objective) }; break;
  case "precedents": output = { precedents: retrievePrecedents(brief, undefined, "problem", 8), referenceDeconstructions: run.referenceDeconstructions }; break;
  case "diverge": output = { territories: report.treatment.territories, divergence: run.divergence }; break;
  case "debate": output = run.debate; break;
  case "critique": output = { selected: report.selectedEvaluation, originality: report.originality, cliches: report.cliches, councilCalibration: run.councilCalibration }; break;
  case "kill": output = { verdict: report.verdict, blockers: report.blockers, skeptic: report.selectedEvaluation.critiques.find((item) => item.role === "skeptic"), stressFatal: report.stress.results.filter((item) => item.status === "FATAL") }; break;
  case "stress": output = runStressLab(brief, report.treatment, report.treatment.territories.find((item) => item.id === report.treatment.selectedTerritoryId) ?? report.treatment.territories[0]); break;
  case "similarity": output = { fingerprint: report.fingerprint, collisions: report.collisions }; break;
  case "ceiling": output = report.ceiling; break;
  case "assets": output = report.assetGap; break;
  case "production": output = { leverage: report.leverage, productionPlan: run.productionPlan }; break;
  case "review": {
    const stageArg = process.argv.find((arg) => arg.startsWith("--stage="))?.split("=")[1] ?? positional.find((arg) => /^\d+$/.test(arg)) ?? "50";
    const stage = Number(stageArg);
    if (![25, 50, 75, 90, 100].includes(stage)) throw new Error("Review stage must be 25, 50, 75, 90 or 100.");
    output = reviewProduction(report.treatment, stage, report.decisions ?? createDecisionLedger(), { signatureStrength: report.selectedEvaluation.scores.memorability, portfolioCollision: report.collisions[0]?.dimensions.overall ?? 0, mobileEquivalent: report.selectedEvaluation.scores.mobileIntegrity >= 7.5, implementedSystems: ["structure", "camera", "motion", "interaction"] });
    break;
  }
  case "final-cut": output = reviewProduction(report.treatment, 100, report.decisions, { signatureStrength: report.selectedEvaluation.scores.memorability, portfolioCollision: report.collisions[0]?.dimensions.overall ?? 0, mobileEquivalent: report.selectedEvaluation.scores.mobileIntegrity >= 7.5, implementedSystems: ["structure", "camera", "motion", "interaction"] }); break;
  case "postmortem": {
    const postmortemPath = process.argv.find((arg) => arg.startsWith("--data="))?.split("=")[1];
    if (!postmortemPath) output = { required: ["revisions", "productionHours", "assetSpend", "performanceIssues", "outcomes"], note: "Pass --data=<postmortem.json> to write evidence-backed observations." };
    else output = synthesizePostmortem({ projectId: brief.projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-"), selectedTerritoryId: report.treatment.selectedTerritoryId, ...JSON.parse(await fs.readFile(postmortemPath, "utf8")) });
    break;
  }
  case "calibrate": output = { calibrationCases, council: run.councilCalibration }; break;
  default: throw new Error(`Unknown Director mode: ${mode}`);
}
console.log(JSON.stringify(output, null, 2));
