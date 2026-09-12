import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseVisualSystems } from "../src/platform/visualSystems.ts";

const file = resolve(process.cwd(), "config/visual-systems.json");
const parsed = parseVisualSystems(JSON.parse(await readFile(file, "utf8")));
const unsupported = parsed.systems.filter((system) => system.kind !== "instanced-field");
if (unsupported.length) {
  console.log(
    "Visual systems declared for extension:",
    unsupported.map((system) => system.id).join(", "),
  );
}
console.log(
  "Visual systems valid:",
  parsed.systems.length,
  "systems;",
  parsed.systems.reduce((total, system) => total + system.instanceCount, 0),
  "declared instances",
);
