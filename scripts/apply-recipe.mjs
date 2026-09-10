import fs from "node:fs";
import path from "node:path";
import { parseExperience } from "../src/lib/configSchema.ts";
import { auditContinuity } from "../src/lib/continuity.ts";
import { auditAssets } from "./asset-audit-lib.mjs";
const name = process.argv[2];
if (!name || !/^[a-z0-9-]+$/.test(name))
  throw new Error("Usage: npm run recipe:apply -- recipe-name");
const source = path.join("recipes", `${name}.json`),
  target = "config/experience.json";
const text = fs.readFileSync(source, "utf8"),
  config = parseExperience(JSON.parse(text));
const errors = [
  ...auditContinuity(config),
  ...auditAssets(
    process.cwd(),
    JSON.parse(fs.readFileSync("config/asset-manifest.json", "utf8")),
    [config],
  ).errors,
];
if (errors.length) throw new Error(errors.join("\n"));
fs.mkdirSync("config/backups", { recursive: true });
if (fs.existsSync(target))
  fs.copyFileSync(
    target,
    `config/backups/experience-${Date.now()}.json`,
    fs.constants.COPYFILE_EXCL,
  );
fs.writeFileSync(target + ".tmp", text);
fs.renameSync(target + ".tmp", target);
console.log(
  `Applied validated ${name}; previous config preserved in config/backups.`,
);
