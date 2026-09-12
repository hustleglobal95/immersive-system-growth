import fs from "node:fs";
import { parseExperience } from "../src/lib/configSchema.ts";
import { auditCameraMotion } from "../src/lib/cameraDiagnostics.ts";

let errors = 0;
let warnings = 0;
for (const file of [
  "config/experience.json",
  ...fs.readdirSync("recipes").filter((name) => name.endsWith(".json")).map((name) => `recipes/${name}`),
]) {
  const config = parseExperience(JSON.parse(fs.readFileSync(file, "utf8")));
  for (const diagnostic of auditCameraMotion(config)) {
    const prefix = diagnostic.level === "error" ? "ERROR" : "WARN";
    console[diagnostic.level === "error" ? "error" : "warn"](
      `${prefix} ${file} ${diagnostic.sceneId} ${diagnostic.viewport}: ${diagnostic.message}`,
    );
    if (diagnostic.level === "error") errors += 1;
    else warnings += 1;
  }
}
console.log(`Camera audit: ${errors} errors, ${warnings} warnings across desktop/mobile sampled motion.`);
if (errors) process.exitCode = 1;
