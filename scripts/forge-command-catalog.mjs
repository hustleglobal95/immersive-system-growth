import fs from "node:fs/promises";
import { parseExperience } from "../src/lib/configSchema.ts";
import { createExperienceEngine } from "../src/platform/createExperienceEngine.ts";

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
const inputPath = String(options.input || "config/experience.json");
const agentOnly = Boolean(options["agent-only"]);
const experience = parseExperience(JSON.parse(await fs.readFile(inputPath, "utf8")));
const engine = createExperienceEngine(experience);

console.log(JSON.stringify({
  revision: engine.getRevision(),
  fingerprint: engine.getFingerprint(),
  commands: engine.commands.catalog({ agentVisibleOnly: agentOnly }),
}, null, 2));
