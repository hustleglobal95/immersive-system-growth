import fs from "node:fs";
import { parseExperience } from "../src/lib/configSchema.ts";
import { applyCameraDirector, directCamera } from "../src/platform/cameraDirector.ts";
import { collectGeometryBounds } from "./spatial-geometry.mjs";

const args = process.argv.slice(2);
const file = valueAfter("--file") ?? "config/experience.json";
const write = args.includes("--write");
const all = args.includes("--all");
const sceneArg = valueAfter("--scene");
const source = JSON.parse(fs.readFileSync(file, "utf8"));
let config = parseExperience(source);
const geometryBounds = collectGeometryBounds(config);

const indexes = all
  ? config.scenes.map((_, index) => index)
  : [resolveSceneIndex(config, sceneArg)];

const plans = indexes.map((sceneIndex) => directCamera(config, sceneIndex, { liveBounds: geometryBounds }));
for (const plan of plans) {
  const spatial = plan.spatial.evaluation;
  console.log([
    plan.sceneId,
    plan.intent,
    plan.shotLabel,
    `${Math.round(plan.confidence * 100)}%`,
    `bounds:${plan.spatial.boundsSource}`,
    `clearance:${spatial.minClearance.toFixed(2)}`,
    `occlusion:${spatial.occlusionSamples}/${spatial.samples}`,
    `framing:${spatial.framingViolations}/${spatial.samples}`,
    `reroutes:${plan.spatial.reroutes}`,
    `rejected:${plan.spatial.rejectedCandidates}`,
    plan.rationale,
  ].join(" | "));
}

if (write) {
  for (const sceneIndex of indexes) config = applyCameraDirector(config, sceneIndex, { liveBounds: geometryBounds }).experience;
  fs.writeFileSync(file, JSON.stringify(config, null, 2) + "\n");
  console.log(`Camera Director authored ${indexes.length} scene${indexes.length === 1 ? "" : "s"} in ${file}.`);
} else {
  console.log(`Dry run only. Loaded ${geometryBounds.length} transformed geometry bound${geometryBounds.length === 1 ? "" : "s"}. Add --write to replace camera motion tracks with the selected spatially validated choreography.`);
}

function valueAfter(flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function resolveSceneIndex(config, value) {
  if (value === undefined) return 0;
  const numeric = Number(value);
  if (Number.isInteger(numeric) && numeric >= 0 && numeric < config.scenes.length) return numeric;
  const index = config.scenes.findIndex((scene) => scene.id === value);
  if (index >= 0) return index;
  throw new RangeError(`Unknown scene ${value}`);
}
