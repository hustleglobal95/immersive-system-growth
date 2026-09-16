import fs from "node:fs/promises";
import path from "node:path";
import { parseExperience } from "../src/lib/configSchema.ts";
import { createExperienceEngine } from "../src/platform/createExperienceEngine.ts";
import { replayForgeJournal } from "../src/core/journal/replay.ts";
import { validateForgeCheckpoint } from "../src/core/checkpoints/checkpoint.ts";

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
const checkpointPath = options.checkpoint ? String(options.checkpoint) : null;
const journalPath = options.journal ? String(options.journal) : null;
const outputPath = options.output ? String(options.output) : null;

if (!journalPath) {
  console.error("Usage: npm run forge:replay -- --journal <journal.json> [--input config/experience.json | --checkpoint checkpoint.json] [--initial-revision 0] [--output replayed-experience.json]");
  process.exit(2);
}

let initial;
let initialRevision;
if (checkpointPath) {
  const checkpoint = validateForgeCheckpoint(JSON.parse(await fs.readFile(checkpointPath, "utf8")));
  initial = parseExperience(checkpoint.state);
  initialRevision = checkpoint.revision;
} else {
  initial = parseExperience(JSON.parse(await fs.readFile(inputPath, "utf8")));
  initialRevision = options["initial-revision"] === undefined ? 0 : Number(options["initial-revision"]);
}
if (!Number.isInteger(initialRevision) || initialRevision < 0) {
  console.error("--initial-revision must be a non-negative integer.");
  process.exit(2);
}

const journal = JSON.parse(await fs.readFile(journalPath, "utf8"));
if (!Array.isArray(journal)) throw new Error("Journal file must contain an array of Forge journal entries.");

const engine = createExperienceEngine(initial, { initialRevision });
const validateState = (state) => {
  try {
    return createExperienceEngine(state)
      .validate()
      .filter((issue) => issue.level === "error")
      .map((issue) => ({ code: issue.code, message: issue.message, path: issue.path, details: issue.details }));
  } catch (error) {
    return [{ code: "replay.state.invalid", message: error instanceof Error ? error.message : "Replayed state is invalid." }];
  }
};

const result = replayForgeJournal(initial, journal, engine.commands, { validateState, initialRevision });
console.log(JSON.stringify({
  ok: result.ok,
  appliedEntries: result.appliedEntries,
  revision: result.revision,
  fingerprint: result.fingerprint,
  errors: result.errors,
}, null, 2));

if (!result.ok) process.exit(1);
if (outputPath) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(result.state, null, 2)}\n`);
}
