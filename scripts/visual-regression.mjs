import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const baselinePath = process.env.FORGE_VISUAL_BASELINE || "config/visual-baseline.json";
const captureRoot = process.env.FORGE_VISUAL_CAPTURE_ROOT || "test-results/showcase";
const update = process.argv.includes("--update");
const SIZE = 32;
const DEFAULT_WARN = 0.025;
const DEFAULT_FAIL = 0.06;

async function exists(filename) {
  try { await fs.access(filename); return true; } catch { return false; }
}

async function signature(filename) {
  const { data, info } = await sharp(filename)
    .resize(SIZE, SIZE, { fit: "fill" })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (info.channels !== 1) throw new Error(`Expected grayscale signature for ${filename}.`);
  return Buffer.from(data).toString("base64");
}

function difference(a, b) {
  const left = Buffer.from(a, "base64");
  const right = Buffer.from(b, "base64");
  if (left.length !== right.length || left.length !== SIZE * SIZE) return 1;
  let total = 0;
  for (let index = 0; index < left.length; index++) total += Math.abs(left[index] - right[index]);
  return total / (left.length * 255);
}

async function screenshots() {
  const found = [];
  async function walk(directory) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(filename);
      else if (entry.isFile() && entry.name.endsWith(".png")) found.push(filename);
    }
  }
  if (!(await exists(captureRoot))) throw new Error(`Visual capture directory does not exist: ${captureRoot}`);
  await walk(captureRoot);
  return found.sort();
}

const files = await screenshots();
if (!files.length) throw new Error(`No PNG captures found under ${captureRoot}.`);
const current = {};
for (const filename of files) {
  const id = path.relative(captureRoot, filename).replaceAll(path.sep, "/");
  current[id] = await signature(filename);
}

if (update) {
  const baseline = {
    version: 1,
    established: true,
    generatedAt: new Date().toISOString(),
    signature: { width: SIZE, height: SIZE, mode: "grayscale-mean-absolute-error" },
    thresholds: { warn: DEFAULT_WARN, fail: DEFAULT_FAIL },
    shots: current,
  };
  await fs.writeFile(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`);
  console.log(`Visual baseline updated: ${Object.keys(current).length} screenshots -> ${baselinePath}`);
  process.exit(0);
}

if (!(await exists(baselinePath))) {
  console.error(`Visual baseline missing: ${baselinePath}. Capture a verified build, then run visual:baseline:update.`);
  process.exit(2);
}
const baseline = JSON.parse(await fs.readFile(baselinePath, "utf8"));
if (!baseline.established) {
  console.error("Visual baseline is not established. Capture and inspect a known-good production build before enabling the regression gate.");
  process.exit(2);
}
const warnThreshold = Number(baseline.thresholds?.warn ?? DEFAULT_WARN);
const failThreshold = Number(baseline.thresholds?.fail ?? DEFAULT_FAIL);
const ids = new Set([...Object.keys(baseline.shots ?? {}), ...Object.keys(current)]);
const results = [];
for (const id of [...ids].sort()) {
  if (!baseline.shots?.[id]) results.push({ id, status: "fail", difference: 1, reason: "new-unapproved-shot" });
  else if (!current[id]) results.push({ id, status: "fail", difference: 1, reason: "missing-current-shot" });
  else {
    const delta = difference(baseline.shots[id], current[id]);
    results.push({ id, difference: delta, status: delta >= failThreshold ? "fail" : delta >= warnThreshold ? "warn" : "pass" });
  }
}
for (const result of results) console.log(`${result.status.toUpperCase().padEnd(4)} ${result.id}: ${(result.difference * 100).toFixed(2)}%${result.reason ? ` (${result.reason})` : ""}`);
const failures = results.filter((item) => item.status === "fail");
const warnings = results.filter((item) => item.status === "warn");
console.log(`Visual regression: ${results.length - failures.length - warnings.length} pass, ${warnings.length} warn, ${failures.length} fail.`);
if (failures.length) process.exitCode = 1;
