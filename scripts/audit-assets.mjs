import fs from "node:fs";
import { auditAssets } from "./asset-audit-lib.mjs";
const files = [
  "config/experience.json",
  "config/cinematic-systems.json",
  ...fs
    .readdirSync("recipes")
    .filter((f) => f.endsWith(".json"))
    .map((f) => "recipes/" + f),
];
const result = auditAssets(
  process.cwd(),
  JSON.parse(fs.readFileSync("config/asset-manifest.json", "utf8")),
  files.map((f) => JSON.parse(fs.readFileSync(f, "utf8"))),
);
console.log(JSON.stringify(result, null, 2));
if (result.errors.length) process.exitCode = 1;
