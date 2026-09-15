import fs from "node:fs";
import { parseExperience } from "../src/lib/configSchema.ts";
import { motionArchetypeCatalog, createMotionArchetype } from "../src/platform/motionArchetypes.ts";
import { motionCurveCatalog, staggerSlots } from "../src/platform/motionLanguage.ts";

const configPath = process.argv[2] || "config/experience.json";
const config = parseExperience(JSON.parse(fs.readFileSync(configPath, "utf8")));
const errors = [];

for (const [name, curve] of Object.entries(motionCurveCatalog)) {
  if (curve.curve) {
    if (curve.curve.length !== 4 || curve.curve.some((value) => !Number.isFinite(value))) {
      errors.push(`curve ${name} is invalid`);
    }
  }
}

for (const distribution of ["forward", "reverse", "center", "edges", "alternating"]) {
  const slots = staggerSlots(9, distribution);
  if (slots.length !== 9 || slots.some((value) => value < 0 || value > 1)) {
    errors.push(`stagger distribution ${distribution} is invalid`);
  }
  if (new Set(slots).size !== 9) errors.push(`stagger distribution ${distribution} has duplicate ranks`);
}

for (let sceneIndex = 0; sceneIndex < config.scenes.length; sceneIndex++) {
  for (const archetype of motionArchetypeCatalog) {
    const tracks = createMotionArchetype(archetype.id, config, sceneIndex);
    const targets = new Set();
    for (const track of tracks) {
      const targetKey = `${track.viewport}:${track.target}`;
      if (targets.has(targetKey)) errors.push(`${archetype.id} scene ${sceneIndex} duplicates target ${targetKey}`);
      targets.add(targetKey);
      if (!track.keyframes.length) errors.push(`${archetype.id} scene ${sceneIndex} has empty track ${track.id}`);
      let previous = -Infinity;
      for (const frame of track.keyframes) {
        if (frame.at < 0 || frame.at > 1) errors.push(`${track.id} has keyframe outside 0..1`);
        if (frame.at < previous) errors.push(`${track.id} keyframes are not sorted`);
        previous = frame.at;
      }
    }
  }
}

if (errors.length) {
  console.error("MOTION SYSTEM INVALID");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`MOTION SYSTEM VALID: ${motionArchetypeCatalog.length} archetypes, ${Object.keys(motionCurveCatalog).length} house curves, ${config.scenes.length} scenes audited`);
