import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const manifestPath = path.join(root, "config/asset-manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const groups = ["models", "textures", "hdr", "video"];
const defaultDirs = { models: "public/models", textures: "public/textures", hdr: "public/hdr", video: "public/video" };
const totals = { models: 0, textures: 0, hdr: 0, video: 0 };
let failed = false;

function mb(bytes) { return bytes / 1024 / 1024; }

for (const group of groups) {
  const directory = path.join(root, defaultDirs[group]);
  const files = fs.existsSync(directory) ? fs.readdirSync(directory, { withFileTypes: true }).filter((item) => item.isFile() && item.name !== ".gitkeep") : [];
  for (const file of files) {
    const full = path.join(directory, file.name);
    const size = fs.statSync(full).size;
    totals[group] += size;
    const budget = manifest.budgets?.[`${group === "models" ? "model" : group === "textures" ? "texture" : group}Mb`] ?? Infinity;
    const flag = mb(size) > budget;
    console.log(`${flag ? "!" : "✓"} ${group}/${file.name} ${mb(size).toFixed(2)} MB`);
    if (flag) console.warn(`  exceeds per-file ${budget} MB budget`);
  }
}

const total = Object.values(totals).reduce((sum, value) => sum + value, 0);
console.log(`\nTotal audited asset weight: ${mb(total).toFixed(2)} MB`);
if (mb(total) > (manifest.budgets?.totalMb ?? Infinity)) {
  console.error(`ERROR total asset weight exceeds ${manifest.budgets.totalMb} MB budget.`);
  failed = true;
}

for (const group of groups) {
  for (const item of manifest[group] ?? []) {
    const relative = typeof item === "string" ? item : item.path;
    if (relative && !fs.existsSync(path.join(root, relative.replace(/^\//, "public/")))) {
      console.warn(`WARN manifest reference not found: ${relative}`);
    }
  }
}

if (failed) process.exit(1);
console.log("Asset audit passed.");
