import fs from "node:fs/promises";
import path from "node:path";
import { parseDirectorTreatment } from "../src/platform/directorSchema.ts";
import { critiqueTreatment } from "../src/platform/directorEngine.ts";
import { createProductionPlanFromTreatment } from "../src/platform/directorProductionPlan.ts";

function args(argv) {
  const out = {};
  for (let index = 0; index < argv.length; index++) {
    const value = argv[index];
    if (!value.startsWith("--")) continue;
    const key = value.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) out[key] = true;
    else { out[key] = next; index++; }
  }
  return out;
}

const options = args(process.argv.slice(2));
const inputPath = options.input ? String(options.input) : null;
const outputDir = options.output ? String(options.output) : "artifacts/director-validated";
if (!inputPath) {
  console.error("Usage: npm run director:validate -- --input <director-treatment.json> [--output artifacts/director-validated]");
  process.exit(2);
}

let treatment;
try {
  const parsed = parseDirectorTreatment(JSON.parse(await fs.readFile(inputPath, "utf8")));
  treatment = { ...parsed, critique: critiqueTreatment(parsed) };
  treatment = parseDirectorTreatment(treatment);
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    stage: "schema",
    error: error instanceof Error ? error.message : String(error),
  }, null, 2));
  process.exit(1);
}

let plan;
try {
  plan = createProductionPlanFromTreatment(treatment);
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    stage: "compile",
    error: error instanceof Error ? error.message : String(error),
  }, null, 2));
  process.exit(1);
}

const slug = treatment.projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 72) || "director";
const root = path.join(outputDir, slug);
await fs.mkdir(root, { recursive: true });
await Promise.all([
  writeJson(path.join(root, "director-treatment.validated.json"), treatment),
  writeJson(path.join(root, "structure-plan.json"), plan.structure),
  writeJson(path.join(root, "creative-plan.json"), plan.creativePlan),
  writeJson(path.join(root, "production-plan.json"), plan),
]);

const result = {
  ok: plan.readiness.blockers.length === 0,
  project: treatment.projectName,
  thesis: treatment.thesis,
  memory: treatment.memoryStatement,
  selectedTerritory: treatment.selectedTerritoryId,
  creativeScore: plan.readiness.creativeScore,
  structureScore: plan.readiness.structureScore,
  readyForProduction: plan.readiness.readyForProduction,
  blockers: plan.readiness.blockers,
  warnings: treatment.critique.warnings,
  cuts: treatment.critique.cuts,
  output: root,
};
console.log(JSON.stringify(result, null, 2));
if (plan.readiness.blockers.length) process.exitCode = 1;

async function writeJson(file, value) {
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}
