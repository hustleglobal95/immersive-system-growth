import fs from "node:fs/promises";
import path from "node:path";
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

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}

const options = args(process.argv.slice(2));
const inputPath = String(options.input || "config/experience.json");
const commandsPath = options.commands ? String(options.commands) : null;
const outputPath = options.output ? String(options.output) : null;
const journalOutput = options["journal-output"] ? String(options["journal-output"]) : null;
const checkpointOutput = options["checkpoint-output"] ? String(options["checkpoint-output"]) : null;
const dryRun = Boolean(options["dry-run"]);
const expectedRevision = options["expected-revision"] === undefined ? undefined : Number(options["expected-revision"]);
const actor = options.actor ? String(options.actor) : undefined;
const source = options.source ? String(options.source) : "cli";

if (!commandsPath) {
  console.error("Usage: npm run forge:command -- --commands <commands.json> [--input config/experience.json] [--output experience.json] [--expected-revision 0] [--actor name] [--source cli|ai|studio] [--journal-output journal.json] [--checkpoint-output checkpoint.json] [--dry-run]");
  process.exit(2);
}
if (expectedRevision !== undefined && (!Number.isInteger(expectedRevision) || expectedRevision < 0)) {
  console.error("--expected-revision must be a non-negative integer.");
  process.exit(2);
}

const experience = parseExperience(JSON.parse(await fs.readFile(inputPath, "utf8")));
const commands = JSON.parse(await fs.readFile(commandsPath, "utf8"));
if (!Array.isArray(commands)) throw new Error("Command file must contain an array of { type, input } records.");

const engine = createExperienceEngine(experience);
const unknown = commands.filter((item) => !item || typeof item.type !== "string" || !engine.commands.has(item.type));
if (unknown.length) {
  console.error("Unknown or malformed commands:", JSON.stringify(unknown, null, 2));
  console.error("Available commands:", engine.commands.list().join(", "));
  process.exit(2);
}

const result = engine.transactionRegistered(commands, {
  transactionId: `cli-${Date.now()}`,
  dryRun,
  expectedRevision,
  actor,
  source,
});

if (!result.ok) {
  console.error(JSON.stringify({
    ok: false,
    revision: result.revisionAfter,
    fingerprint: result.fingerprintAfter,
    receipt: result.receipt,
    errors: result.errors,
  }, null, 2));
  process.exit(1);
}

const summary = {
  ok: true,
  dryRun,
  commands: commands.map((item) => item.type),
  events: result.events.map((event) => ({ type: event.type, payload: event.payload })),
  affectedIds: result.receipt.affectedIds,
  sceneCount: result.state.scenes.length,
  revisionBefore: result.revisionBefore,
  revisionAfter: result.revisionAfter,
  fingerprintBefore: result.fingerprintBefore,
  fingerprintAfter: result.fingerprintAfter,
  receipt: result.receipt,
};
console.log(JSON.stringify(summary, null, 2));

if (outputPath && !dryRun) await writeJson(outputPath, result.state);
if (journalOutput && !dryRun) await writeJson(journalOutput, engine.getJournal());
if (checkpointOutput && !dryRun) await writeJson(checkpointOutput, engine.createCheckpoint(`CLI checkpoint revision ${engine.getRevision()}`));
