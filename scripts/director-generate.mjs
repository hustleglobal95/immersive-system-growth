import fs from "node:fs/promises";
import path from "node:path";
import { createDirectorProductionPlan } from "../src/platform/directorProductionPlan.ts";

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
const inputPath = options.input ? String(options.input) : "config/director-brief.example.json";
const outputDir = options.output ? String(options.output) : "artifacts/director";
const brief = JSON.parse(await fs.readFile(inputPath, "utf8"));
const plan = createDirectorProductionPlan(brief);
const slug = String(plan.treatment.projectName).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 72) || "director";
const root = path.join(outputDir, slug);

await fs.mkdir(root, { recursive: true });
await Promise.all([
  writeJson(path.join(root, "director-treatment.json"), plan.treatment),
  writeJson(path.join(root, "structure-plan.json"), plan.structure),
  writeJson(path.join(root, "creative-plan.json"), plan.creativePlan),
  writeJson(path.join(root, "production-plan.json"), plan),
]);

console.log(JSON.stringify({
  ok: true,
  project: plan.treatment.projectName,
  thesis: plan.treatment.thesis,
  memory: plan.treatment.memoryStatement,
  selectedTerritory: plan.treatment.selectedTerritoryId,
  signatureMoment: plan.treatment.signatureMoment.name,
  creativeScore: plan.readiness.creativeScore,
  structureScore: plan.readiness.structureScore,
  readyForProduction: plan.readiness.readyForProduction,
  blockers: plan.readiness.blockers,
  output: root,
}, null, 2));

if (plan.readiness.blockers.length) process.exitCode = 1;

async function writeJson(file, value) {
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}
