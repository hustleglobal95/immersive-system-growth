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

const options = args(process.argv.slice(2));
const inputPath = String(options.input || "config/experience.json");
const commandsPath = options.commands ? String(options.commands) : null;
const outputPath = options.output ? String(options.output) : null;
const dryRun = Boolean(options["dry-run"]);

if (!commandsPath) {
  console.error("Usage: npm run forge:command -- --commands <commands.json> [--input config/experience.json] [--output experience.json] [--dry-run]");
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
});

if (!result.ok) {
  console.error(JSON.stringify({ ok: false, errors: result.errors }, null, 2));
  process.exit(1);
}

const summary = {
  ok: true,
  dryRun,
  commands: commands.map((item) => item.type),
  events: result.events.map((event) => ({ type: event.type, payload: event.payload })),
  sceneCount: result.state.scenes.length,
};
console.log(JSON.stringify(summary, null, 2));

if (outputPath && !dryRun) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(result.state, null, 2)}\n`);
}
