import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");

const layers = ["core", "domain", "platform", "runtime", "studio"];
const rank = new Map(layers.map((layer, index) => [layer, index]));

const rules = {
  core: new Set(["core"]),
  domain: new Set(["core", "domain"]),
  platform: new Set(["core", "domain", "platform"]),
  runtime: new Set(["core", "domain", "platform", "runtime"]),
  studio: new Set(["core", "domain", "platform", "runtime", "studio", "design", "components", "lib", "store", "types"]),
};

const transitional = new Set(["components", "lib", "store", "types", "design"]);

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function layerFor(file) {
  const rel = path.relative(SRC, file).replaceAll("\\", "/");
  const top = rel.split("/")[0];
  return layers.includes(top) ? top : transitional.has(top) ? top : null;
}

function extractImports(source) {
  const imports = [];
  const patterns = [
    /\bimport\s+(?:[^"']+?\s+from\s+)?["']([^"']+)["']/g,
    /\bexport\s+[^"']*?\s+from\s+["']([^"']+)["']/g,
    /\bimport\(["']([^"']+)["']\)/g,
    /\brequire\(["']([^"']+)["']\)/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) imports.push(match[1]);
  }
  return imports;
}

function resolveForgeLayer(specifier, importer) {
  let rel = null;
  if (specifier.startsWith("@/src/")) rel = specifier.slice("@/src/".length);
  else if (specifier.startsWith("src/")) rel = specifier.slice("src/".length);
  else if (specifier.startsWith(".")) {
    const abs = path.resolve(path.dirname(importer), specifier);
    if (!abs.startsWith(SRC)) return null;
    rel = path.relative(SRC, abs).replaceAll("\\", "/");
  }
  if (!rel) return null;
  const top = rel.split("/")[0];
  return layers.includes(top) ? top : transitional.has(top) ? top : null;
}

const violations = [];
const files = walk(SRC);

for (const file of files) {
  const importerLayer = layerFor(file);
  if (!importerLayer || !layers.includes(importerLayer)) continue;
  const allowed = rules[importerLayer];
  const source = fs.readFileSync(file, "utf8");
  for (const specifier of extractImports(source)) {
    const importedLayer = resolveForgeLayer(specifier, file);
    if (!importedLayer) continue;

    if (importedLayer === "studio" && importerLayer !== "studio") {
      violations.push({ file, importerLayer, specifier, importedLayer, reason: "Only Studio may import Studio modules." });
      continue;
    }

    if (layers.includes(importedLayer) && !allowed.has(importedLayer)) {
      violations.push({ file, importerLayer, specifier, importedLayer, reason: `${importerLayer} may not depend on higher layer ${importedLayer}.` });
      continue;
    }

    if (rank.has(importerLayer) && rank.has(importedLayer) && rank.get(importedLayer) > rank.get(importerLayer)) {
      violations.push({ file, importerLayer, specifier, importedLayer, reason: "Dependency direction points upward." });
    }
  }
}

if (violations.length) {
  console.error(`Forge architecture audit failed with ${violations.length} violation(s):`);
  for (const violation of violations) {
    console.error(`\n- ${path.relative(ROOT, violation.file)} [${violation.importerLayer}]`);
    console.error(`  imports ${violation.specifier} [${violation.importedLayer}]`);
    console.error(`  ${violation.reason}`);
  }
  process.exit(1);
}

console.log(`Forge architecture audit passed across ${files.length} source files.`);
