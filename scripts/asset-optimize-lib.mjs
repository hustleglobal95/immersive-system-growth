import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const FORMATS = new Set(["avif", "webp"]);

export async function optimizeTexture({
  root,
  input,
  format = "avif",
  width = 2048,
  quality = 78,
  force = false,
  updateManifest = true,
}) {
  if (!FORMATS.has(format)) throw new Error("Format must be avif or webp");
  if (!Number.isInteger(width) || width < 320 || width > 8192) throw new Error("Width must be an integer from 320 to 8192");
  if (!Number.isInteger(quality) || quality < 20 || quality > 100) throw new Error("Quality must be an integer from 20 to 100");
  const repositoryRoot = path.resolve(root);
  const texturesRoot = path.join(repositoryRoot, "public", "textures");
  const source = path.resolve(repositoryRoot, input);
  ensureInside(texturesRoot, source, "Input must be inside public/textures");
  if (!fs.existsSync(source) || !fs.statSync(source).isFile()) throw new Error(`Input file does not exist: ${input}`);
  const parsed = path.parse(source);
  const output = path.join(parsed.dir, `${parsed.name}.opt.${format}`);
  ensureInside(texturesRoot, output, "Output escaped public/textures");
  if (fs.existsSync(output) && !force) throw new Error(`Output already exists: ${path.relative(repositoryRoot, output)}. Use --force to replace it.`);
  const manifestPath = path.join(repositoryRoot, "config", "asset-manifest.json");
  const manifest = readManifest(manifestPath);
  const temporary = `${output}.${process.pid}.${Date.now()}.tmp`;
  try {
    const pipeline = sharp(source, { failOn: "error" }).rotate().resize({ width, withoutEnlargement: true, fit: "inside" });
    if (format === "avif") pipeline.avif({ quality, effort: 5 });
    else pipeline.webp({ quality, effort: 5 });
    const metadata = await pipeline.toFile(temporary);
    const bytes = fs.statSync(temporary).size;
    if (bytes > manifest.budgets.textureMb * 1024 ** 2) throw new Error(`Optimized texture exceeds the ${manifest.budgets.textureMb} MiB texture budget`);
    fs.renameSync(temporary, output);
    const sha256 = crypto.createHash("sha256").update(fs.readFileSync(output)).digest("hex");
    const publicPath = `/${path.relative(path.join(repositoryRoot, "public"), output).split(path.sep).join("/")}`;
    const record = { path: publicPath, bytes, sha256 };
    if (updateManifest) {
      manifest.textures = [...manifest.textures.filter((item) => item.path !== publicPath), record];
      writeJsonAtomic(manifestPath, manifest);
    }
    return { ...record, width: metadata.width, height: metadata.height, format, sourceBytes: fs.statSync(source).size };
  } finally {
    if (fs.existsSync(temporary)) fs.rmSync(temporary);
  }
}

function readManifest(manifestPath) {
  if (!fs.existsSync(manifestPath)) throw new Error("config/asset-manifest.json is required");
  const value = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (!Array.isArray(value.textures) || !Number.isFinite(value.budgets?.textureMb)) throw new Error("Asset manifest is missing textures or textureMb budget");
  return value;
}

function writeJsonAtomic(file, value) {
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(temporary, file);
}

function ensureInside(parent, candidate, message) {
  const relative = path.relative(parent, candidate);
  if (relative.startsWith("..") || path.isAbsolute(relative) || relative === "") throw new Error(message);
}
