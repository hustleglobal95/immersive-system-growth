import fs from "node:fs";
import path from "node:path";
const name = process.argv[2];
if (!name) {
  console.error("Usage: npm run recipe:apply -- real-estate");
  process.exit(1);
}
const root = process.cwd();
const source = path.join(root, "recipes", `${name}.json`);
const target = path.join(root, "config/experience.json");
const backup = path.join(root, "config/experience.backup.json");
if (!fs.existsSync(source)) {
  console.error(`Unknown recipe: ${name}. Run npm run recipe:list.`);
  process.exit(1);
}
if (fs.existsSync(target)) fs.copyFileSync(target, backup);
fs.copyFileSync(source, target);
console.log(`Applied ${name}. Previous config saved to config/experience.backup.json.`);
