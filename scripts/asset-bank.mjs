import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { readBank, writeBank, mergeBank } from "../src/platform/assetBankStore.ts";
import { bankCollectionSchema } from "../src/platform/assetBankSchema.ts";
import { inspectGlb } from "../src/platform/glbInspector.ts";
import { parseExperience } from "../src/lib/configSchema.ts";

const root = process.cwd();
const [command = "validate", ...args] = process.argv.slice(2);
const option = (name) => { const index = args.indexOf(name); return index < 0 ? undefined : args[index + 1]; };
const empty = { version: 1, assets: [], kits: [] };
const digest = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const asBuffer = (b) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
async function currentBank() {
  try { await fs.access("catalog/asset-bank/index.json"); } catch (error) { if (error.code === "ENOENT") return empty; throw error; }
  return readBank();
}
async function record(url, role) {
  const resolved = path.resolve(root, "public", "." + url);
  if (!resolved.startsWith(path.join(root, "public") + path.sep)) throw new Error("Asset path escapes public");
  const bytes = await fs.readFile(resolved);
  return { url, role, format: path.extname(url).slice(1), bytes: bytes.length, sha256: digest(bytes) };
}
async function seed() {
  const manifest = JSON.parse(await fs.readFile("config/asset-manifest.json", "utf8"));
  const mapping = { burger: "burger-showcase", pavilion: "real-estate", restaurant: "restaurant", automotive: "automotive", product: "product", saas: "saas" };
  const assets = [], kits = [];
  for (const [model, recipeId] of Object.entries(mapping)) {
    const url = `/models/reference/${model}.glb`;
    const bytes = await fs.readFile("public" + url);
    const inspection = inspectGlb(asBuffer(bytes));
    const recipe = parseExperience(JSON.parse(await fs.readFile(`recipes/${recipeId}.json`, "utf8")));
    const entry = {
      id: `forge-${model}`, title: `${model[0].toUpperCase()}${model.slice(1)} reference model`,
      description: "Original procedural Forge fixture. Suitable for layout and motion development; not photorealistic client artwork.",
      kind: "model", provider: "forge", sourceId: model,
      sourceUrl: "https://github.com/hustleglobal95/immersive-system-growth/blob/main/scripts/generate-assets.mjs",
      tags: [model, "procedural", "reference", "glb", "mobile-variant"], industries: [recipeId], authors: ["Forge repository contributors"],
      license: { id: "MIT", url: "https://github.com/hustleglobal95/immersive-system-growth/blob/main/LICENSE", attribution: "Retain the repository MIT copyright and permission notice." },
      status: "reference", approval: { by: "Forge reference seed", date: "2026-09-12", scope: "reference", notes: "Byte hashes and GLB structure checked by bank:seed. Not client artwork approval." },
      files: [await record(url, "runtime"), await record(url.replace(".glb", "-low.glb"), "mobile")],
      metadata: { triangles: inspection.totals.triangles, nodes: inspection.nodes.map((n) => n.name).filter(Boolean) },
    };
    assets.push(entry);
    kits.push({ id: `forge-${recipeId}-kit`, title: recipe.meta.name, description: `${recipe.scenes.length} coordinated reference scenes with model, lighting, cameras, copy and motion. Review the concept content before client use.`, industry: recipeId, assetIds: [entry.id], recipe: recipeId, status: "reference", artDirection: recipe.meta.description });
  }
  for (const item of manifest.textures.filter((item) => item.path === "/textures/reference/reveal-field.svg")) {
    assets.push({ id: "forge-reveal-field", title: "Reveal field", description: "Original SVG reveal test field for mask and media authoring.", kind: "image", provider: "forge", sourceId: "reveal-field", sourceUrl: "https://github.com/hustleglobal95/immersive-system-growth/blob/main/public/textures/reference/reveal-field.svg", thumbnail: item.path, tags: ["mask", "reveal", "reference"], industries: ["product"], authors: ["Forge repository contributors"], license: assets[0].license, status: "reference", approval: assets[0].approval, files: [await record(item.path, "runtime")], metadata: {} });
  }
  return { version: 1, assets, kits };
}
async function polyhaven() {
  const response = await fetch("https://api.polyhaven.com/assets", { headers: { "User-Agent": "Forge-Asset-Bank/1.0 (immersive-system-growth)", Referer: "https://github.com/hustleglobal95/immersive-system-growth" }, redirect: "error", signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Poly Haven: HTTP ${response.status}`);
  const reader = response.body.getReader();
  const chunks = []; let length = 0;
  for (;;) { const { done, value } = await reader.read(); if (done) break; length += value.length; if (length > 20_000_000) { await reader.cancel(); throw new Error("Provider response exceeds 20 MB"); } chunks.push(value); }
  const source = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  const assets = [];
  for (const [id, item] of Object.entries(source)) {
    if (![0, 1, 2].includes(item.type)) throw new Error(`Unknown provider asset type: ${id}`);
    if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new Error("Unsafe provider ID");
    const tags = [...new Set([...(item.categories ?? []), ...(item.tags ?? [])])].slice(0, 100);
    assets.push({
      id: "polyhaven-" + id.toLowerCase().replace(/_/g, "-"), title: item.name,
      description: (item.description ?? "Poly Haven source asset; download, optimize and verify before runtime use.").slice(0, 1600),
      kind: ["hdri", "material", "model"][item.type], provider: "polyhaven", sourceId: id,
      sourceUrl: "https://polyhaven.com/a/" + id,
      ...(item.thumbnail_url ? { thumbnail: item.thumbnail_url } : {}),
      tags, industries: [], authors: Object.keys(item.authors ?? {}),
      license: { id: "CC0-1.0", url: "https://polyhaven.com/license", attribution: "Powered by Poly Haven. Asset license is CC0; provider previews and API usage follow Poly Haven terms." },
      status: "source", files: [], metadata: { ...(item.polycount === undefined ? {} : { sourcePolycount: item.polycount }), ...(item.max_resolution ? { resolution: item.max_resolution } : {}) },
    });
  }
  return bankCollectionSchema.parse({ version: 1, assets, kits: [] });
}

async function validate(bank) {
  const storage = JSON.parse(await fs.readFile("config/asset-bank-storage.json", "utf8"));
  const allowed = new Set(storage.allowedHosts);
  for (const asset of bank.assets) {
    for (const url of [...asset.files.map((f) => f.url), ...(asset.thumbnail ? [asset.thumbnail] : [])]) {
      if (url.startsWith("https://") && !allowed.has(new URL(url).hostname)) throw new Error(`Unapproved asset host: ${url}`);
    }
    for (const file of asset.files) {
      if (!file.url.startsWith("/")) continue;
      const verified = await record(file.url, file.role);
      if (verified.sha256 !== file.sha256 || verified.bytes !== file.bytes) throw new Error(`Stale asset hash: ${asset.id} ${file.role}`);
      if (asset.kind === "model" && ["runtime", "mobile"].includes(file.role)) {
        const bytes = await fs.readFile("public" + file.url);
        inspectGlb(asBuffer(bytes));
        const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
        if ([...(gltf.buffers ?? []), ...(gltf.images ?? [])].some((item) => item.uri && !item.uri.startsWith("data:"))) throw new Error("Runtime GLB must embed every dependency");
      }
    }
  }
  for (const kit of bank.kits) {
    const recipe = parseExperience(JSON.parse(await fs.readFile(`recipes/${kit.recipe}.json`, "utf8")));
    const kitUrls = new Set(bank.assets.filter((a) => kit.assetIds.includes(a.id)).flatMap((a) => a.files.map((f) => f.url)));
    const required = [recipe.heroModel, recipe.heroLowModel, ...recipe.assets.flatMap((a) => [a.url, a.lowUrl]), ...recipe.scenes.flatMap((s) => [s.media?.src, s.media?.poster, ...(s.media?.layers ?? []).flatMap((layer) => [layer.src, layer.poster])])].filter(Boolean);
    for (const url of required) if (!kitUrls.has(url)) throw new Error(`Kit ${kit.id} does not include dependency ${url}`);
  }
}

let operationLock;
try {
  if (command !== "validate") {
    await fs.mkdir("catalog/asset-bank", { recursive: true });
    operationLock = await fs.open("catalog/asset-bank/.operation-lock", "wx");
  }
  let bank = await currentBank();
  if (command === "validate") {
    if (!bank.assets.length) throw new Error("Asset bank is empty. Run bank:seed.");
    await validate(bank);
  } else if (["seed", "sync-polyhaven", "import"].includes(command)) {
    let incoming;
    if (command === "seed") incoming = await seed();
    if (command === "sync-polyhaven") incoming = await polyhaven();
    if (command === "import") {
      const file = option("--file"); if (!file) throw new Error("Supply --file with a versioned bank collection JSON");
      if ((await fs.stat(file)).size > 100_000_000) throw new Error("Import exceeds 100 MB");
      incoming = bankCollectionSchema.parse(JSON.parse(await fs.readFile(file, "utf8")));
    }
    bank = mergeBank(bank, incoming);
    await validate(bank);
    if (args.includes("--write")) await writeBank(bank);
    else console.log("DRY RUN: add --write to persist the validated catalog.");
  } else if (command === "prepare") {
    const id = option("--id"), url = option("--url"), by = option("--by"), scope = option("--scope");
    if (!id || !url?.startsWith("/") || !by || !["reference", "client"].includes(scope)) throw new Error("Use prepare --id <id> --url /models/... --by <reviewer> --scope reference|client [--write]");
    const asset = bank.assets.find((a) => a.id === id); if (!asset) throw new Error("Unknown asset ID");
    const runtime = await record(url, "runtime");
    if (asset.kind === "model") {
      const bytes = await fs.readFile("public" + url);
      const report = inspectGlb(asBuffer(bytes));
      const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
      if ([...(gltf.buffers ?? []), ...(gltf.images ?? [])].some((item) => item.uri && !item.uri.startsWith("data:"))) throw new Error("Runtime GLB must embed every dependency");
      asset.metadata = { ...asset.metadata, triangles: report.totals.triangles, nodes: report.nodes.map((n) => n.name).filter(Boolean) };
    }
    asset.files = [runtime];
    if (option("--mobile")) asset.files.push(await record(option("--mobile"), "mobile"));
    if (option("--poster")) asset.files.push(await record(option("--poster"), "poster"));
    asset.status = scope === "client" ? "prepared" : "reference";
    asset.approval = { by, scope, date: new Date().toISOString().slice(0, 10), notes: option("--notes") ?? "Reviewed and staged through bank:prepare" };
    bank = bankCollectionSchema.parse(bank); await validate(bank);
    if (args.includes("--write")) await writeBank(bank); else console.log("DRY RUN: add --write after reviewing this preparation record.");
  } else throw new Error(`Unknown asset bank command: ${command}`);
  const counts = bank.assets.reduce((a, item) => ({ ...a, [item.status]: (a[item.status] ?? 0) + 1 }), {});
  console.log(JSON.stringify({ assets: bank.assets.length, status: counts, sceneKits: bank.kits.length }, null, 2));
} catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }
finally { if (operationLock) { await operationLock.close(); await fs.unlink("catalog/asset-bank/.operation-lock"); } }
