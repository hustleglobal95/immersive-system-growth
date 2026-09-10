import fs from "node:fs";
import { parseExperience } from "../src/lib/configSchema.ts";
import { auditContinuity } from "../src/lib/continuity.ts";
let failures = 0;
for (const file of [
  "config/experience.json",
  ...fs
    .readdirSync("recipes")
    .filter((f) => f.endsWith(".json"))
    .map((f) => "recipes/" + f),
]) {
  const errors = auditContinuity(
    parseExperience(JSON.parse(fs.readFileSync(file, "utf8"))),
  );
  errors.forEach((e) => console.error(file, e));
  failures += errors.length;
}
console.log(
  `Cinematic audit: ${failures} errors in actual sampled desktop/mobile boundaries.`,
);
if (failures) process.exitCode = 1;
