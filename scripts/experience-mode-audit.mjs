import rawExperience from "../config/experience.json";
import rawModes from "../config/experience-modes.json";
import { parseExperience } from "../src/lib/configSchema.ts";
import { activeExperienceMode, auditExperienceMode, parseExperienceModes } from "../src/platform/experienceModes.ts";

const experience = parseExperience(rawExperience);
const manifest = parseExperienceModes(rawModes);
const mode = activeExperienceMode(manifest);
const failures = auditExperienceMode(mode, experience);

if (failures.length) {
  failures.forEach((failure) => console.error(`INVALID experience mode: ${failure}`));
  process.exit(1);
}

console.log(`VALID experience mode: ${mode.label}, ${manifest.modes.length} production modes registered`);
