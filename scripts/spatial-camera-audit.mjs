import fs from "node:fs";
import { parseExperience } from "../src/lib/configSchema.ts";
import { directCamera } from "../src/platform/cameraDirector.ts";
import { collectGeometryBounds } from "./spatial-geometry.mjs";

const files = [
  "config/experience.json",
  ...fs.readdirSync("recipes").filter((name) => name.endsWith(".json")).map((name) => `recipes/${name}`),
];
let errors = 0;
let warnings = 0;
let scenes = 0;
let rejectedCandidates = 0;
let reroutes = 0;

for (const filename of files) {
  const config = parseExperience(JSON.parse(fs.readFileSync(filename, "utf8")));
  const geometryBounds = collectGeometryBounds(config);
  for (let sceneIndex = 0; sceneIndex < config.scenes.length; sceneIndex += 1) {
    scenes += 1;
    const plan = directCamera(config, sceneIndex, { liveBounds: geometryBounds });
    const spatial = plan.spatial.evaluation;
    rejectedCandidates += plan.spatial.rejectedCandidates;
    reroutes += plan.spatial.reroutes;
    if (spatial.hardInvalid) {
      errors += 1;
      console.error(`ERROR ${filename} / ${plan.sceneId}: selected ${plan.shotLabel} remains spatially invalid after ${plan.spatial.reroutes} reroutes. collisions=${spatial.collisionSamples}, occlusion=${spatial.occlusionSamples}, framing=${spatial.framingViolations}, floor=${spatial.floorViolations}`);
      continue;
    }
    if (spatial.occlusionSamples > 0 || spatial.framingViolations > 0 || spatial.minClearance < 0.14) {
      warnings += 1;
      console.warn(`WARN ${filename} / ${plan.sceneId}: ${plan.shotLabel}; clearance=${spatial.minClearance.toFixed(2)}, occlusion=${spatial.occlusionSamples}/${spatial.samples}, framing=${spatial.framingViolations}/${spatial.samples}`);
    }
  }
}

console.log(`Spatial camera audit: ${errors} errors, ${warnings} warnings across ${scenes} directed scenes; ${rejectedCandidates} unsafe candidate shots rejected, ${reroutes} path reroutes authored.`);
if (errors) process.exitCode = 1;
