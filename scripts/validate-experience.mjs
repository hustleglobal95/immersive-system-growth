import fs from "node:fs";
import { parseExperience } from "../src/lib/configSchema.ts";
const files = process.argv.slice(2);
if (!files.length)
  files.push(
    "config/experience.json",
    ...fs
      .readdirSync("recipes")
      .filter((f) => f.endsWith(".json"))
      .map((f) => "recipes/" + f),
  );
let failed = false;
for (const file of files) {
  try {
    const config = parseExperience(JSON.parse(fs.readFileSync(file, "utf8")));
    console.log(
      `VALID ${file}: ${config.scenes.length} scenes, ${config.assets.length} assets`,
    );
  } catch (e) {
    failed = true;
    console.error(`INVALID ${file}: ${e.message}`);
  }
}
if (failed) process.exitCode = 1;
