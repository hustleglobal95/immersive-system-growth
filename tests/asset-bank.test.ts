import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import rawExperience from "../config/experience.json";
import rawManifest from "../config/asset-manifest.json";
import rawGraph from "../config/interaction-graph.json";
import { parseInteractionGraph } from "../src/lib/interactionGraph";
import { parseExperience } from "../src/lib/configSchema";
import { bankAssetSchema, bankCollectionSchema, bankUrl, type BankCollection } from "../src/platform/assetBankSchema";
import { readBank, writeBank, mergeBank } from "../src/platform/assetBankStore";
import { addBankFiles, createBankSearch, incompatibleBankKitBindings, insertBankAsset } from "../src/platform/assetBank";

const snapshot = readBank();

test("kit replacement detects sequence and camera bindings even without scene triggers", () => {
  const experience = parseExperience(rawExperience);
  const graph = parseInteractionGraph(rawGraph);
  graph.nodes = [{ id: "sequence", label: "Authored sequence", position: { x: 0, y: 0 }, kind: "action", action: { type: "sequence", name: "missing-scene", command: "play", loop: false, release: false } }, { id: "camera", label: "Authored camera", position: { x: 0, y: 0 }, kind: "action", action: { type: "camera", name: "missing-scene", command: "play", release: false } }];
  graph.edges = [];
  assert.deepEqual(incompatibleBankKitBindings(experience, graph), ["Authored sequence", "Authored camera"]);
  assert.deepEqual(incompatibleBankKitBindings(experience, parseInteractionGraph(rawGraph)), []);
});

test("shipped bank has real source metadata, verified fixtures and resolvable reference kits", async () => {
  const bank = await snapshot;
  assert.ok(bank.assets.filter((a) => a.provider === "polyhaven" && a.status === "source").length >= 2375);
  assert.equal(bank.assets.filter((a) => a.status === "reference").length, 7);
  assert.equal(bank.kits.length, 6);
  for (const kit of bank.kits) {
    const experience = parseExperience(JSON.parse(await fs.readFile(`recipes/${kit.recipe}.json`, "utf8")));
    const assets = bank.assets.filter((a) => kit.assetIds.includes(a.id));
    const required = [experience.heroModel, experience.heroLowModel, ...experience.assets.flatMap((a) => [a.url, a.kind === "model" ? a.lowUrl : undefined])].filter(Boolean);
    assert.ok(required.length > 0);
    for (const url of required) assert.ok(assets.some((a) => a.files.some((f) => f.url === url)), `${kit.id}: ${url}`);
    assert.doesNotThrow(() => addBankFiles(assets, rawManifest));
  }
});

test("10,000-entry search applies combined filters and bounded nonoverlapping pagination", async () => {
  const source = (await snapshot).assets.find((a) => a.status === "source")!;
  const bank: BankCollection = { version: 1, kits: [], assets: Array.from({ length: 10_000 }, (_, i) => ({ ...source, id: `search-${i}`, sourceId: String(i), title: i % 2 ? "Oak chair" : "Stone wall", kind: i % 2 ? "model" : "material", industries: ["interior"] })) };
  const search = createBankSearch(bankCollectionSchema.parse(bank));
  const query = { q: "OAK chair", kind: "model", industry: "interior", status: "source", provider: source.provider, limit: 48 };
  const first = search(query), second = search({ ...query, page: 2 });
  assert.equal(first.total, 5000);
  assert.equal(first.items.length, 48);
  assert.equal(new Set([...first.items, ...second.items].map((a) => a.id)).size, 96);
  assert.equal(search({ status: "prepared" }).total, 0);
  assert.equal(search({ ...query, page: 10000 }).items.length, 0);
  assert.throws(() => search({ limit: 49 }));
  assert.throws(() => search({ page: 0 }));
  assert.throws(() => search({ q: "a".repeat(201) }));
});

test("insertion preserves hero and rig, registers both model variants, and never mutates inputs", async () => {
  const asset = (await snapshot).assets.find((a) => a.id === "forge-burger")!;
  const experience = parseExperience(rawExperience);
  const before = structuredClone(experience);
  const manifest = { ...structuredClone(rawManifest), models: [] };
  const result = insertBankAsset(asset, experience, manifest, experience.scenes[1].id);
  assert.deepEqual(experience, before);
  assert.equal(manifest.models.length, 0);
  assert.equal(result.experience.heroModel, experience.heroModel);
  assert.deepEqual(result.experience.productRig, experience.productRig);
  assert.deepEqual(result.experience.assets.at(-1)?.scenes, [experience.scenes[1].id]);
  const inserted = result.experience.assets.at(-1)!;
  assert.equal(inserted.kind === "model" ? inserted.lowUrl : undefined, asset.files.find((f) => f.role === "mobile")?.url);
  assert.equal(result.assetManifest.models.length, 2);
  assert.throws(() => insertBankAsset(asset, result.experience, result.assetManifest, experience.scenes[0].id), /already/);
  assert.throws(() => insertBankAsset(asset, experience, manifest, "missing"), /existing scene/);
  const conflict = structuredClone(result.assetManifest);
  conflict.models[0].bytes++;
  assert.throws(() => insertBankAsset(asset, experience, conflict, experience.scenes[0].id), /Manifest conflict/);
});

test("source entries cannot be inserted and existing media is protected", async () => {
  const bank = await snapshot;
  const experience = parseExperience(rawExperience);
  assert.throws(() => insertBankAsset(bank.assets.find((a) => a.status === "source"), experience, rawManifest, experience.scenes[0].id), /Prepare and verify/);
  const image = bank.assets.find((a) => a.id === "forge-reveal-field")!;
  delete experience.scenes[0].media;
  const result = insertBankAsset(image, experience, rawManifest, experience.scenes[0].id);
  assert.equal(result.experience.scenes[0].media?.src, image.files[0].url);
  assert.throws(() => insertBankAsset(image, result.experience, result.assetManifest, experience.scenes[0].id), /already has media/);
});

test("video insertion requires a verified poster and registers its hash", async () => {
  const base = (await snapshot).assets.find((a) => a.id === "forge-reveal-field")!;
  const video = { ...base, id: "test-video", kind: "video", files: [{ ...base.files[0], url: "/video/test.mp4", format: "mp4" }] };
  assert.equal(bankAssetSchema.safeParse(video).success, false);
  const approved = bankAssetSchema.parse({ ...video, files: [...video.files, { ...base.files[0], role: "poster" }] });
  const experience = parseExperience(rawExperience);
  delete experience.scenes[0].media;
  const result = insertBankAsset(approved, experience, { ...rawManifest, textures: [] }, experience.scenes[0].id);
  assert.equal(result.experience.scenes[0].media?.poster, base.files[0].url);
  assert.equal(result.assetManifest.textures[0].sha256, base.files[0].sha256);
});

test("unsafe links, missing approvals, duplicate IDs and orphan kits fail validation", async () => {
  for (const url of ["javascript:alert(1)", "http://example.com/a.glb", "//example.com/a.glb", "/models/../secret", "https://user:pass@example.com/a", "https://example.com/a?X-Amz-Signature=private"]) assert.equal(bankUrl.safeParse(url).success, false, url);
  const bank = await snapshot;
  const fixture = bank.assets.find((a) => a.id === "forge-burger")!;
  assert.equal(bankAssetSchema.safeParse({ ...fixture, approval: undefined }).success, false);
  assert.equal(bankCollectionSchema.safeParse({ ...bank, assets: [...bank.assets, fixture] }).success, false);
  assert.equal(bankCollectionSchema.safeParse({ ...bank, kits: [{ ...bank.kits[0], assetIds: ["missing"] }] }).success, false);
});

test("refresh preserves review decisions and rejects identity collisions", async () => {
  const fixture = (await snapshot).assets.find((a) => a.id === "forge-burger")!;
  const current: BankCollection = { version: 1, assets: [fixture], kits: [] };
  const incoming = bankCollectionSchema.parse({ ...current, assets: [{ ...fixture, status: "source", approval: undefined, files: [] }] });
  assert.deepEqual(mergeBank(current, incoming), current);
  assert.throws(() => mergeBank(current, { ...incoming, assets: [{ ...incoming.assets[0], provider: "other" }] }), /identity collision/);
});

test("content-addressed snapshots reject corruption and competing writers", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "forge-bank-"));
  const bank = await snapshot;
  const small: BankCollection = { version: 1, assets: [bank.assets[0]], kits: [] };
  try {
    await writeBank(small, root);
    assert.deepEqual(await readBank(root), small);
    await fs.writeFile(path.join(root, ".write-lock"), "");
    await assert.rejects(() => writeBank(small, root), /EEXIST/);
    await fs.unlink(path.join(root, ".write-lock"));
    const index = JSON.parse(await fs.readFile(path.join(root, "index.json"), "utf8"));
    await fs.appendFile(path.join(root, "shards", index.shards[0]), " ");
    await assert.rejects(() => readBank(root), /integrity failure/);
    await assert.rejects(() => writeBank(small, root), /shard is corrupt/);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});
