import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { z } from "zod";
import { bankCollectionSchema, type BankCollection } from "@/src/platform/assetBankSchema";

const indexSchema = z.object({ version: z.literal(1), assets: z.number().int().nonnegative().max(100_000), shards: z.array(z.string().regex(/^[a-f0-9]{64}\.json$/)).max(500), kits: bankCollectionSchema.shape.kits }).strict();
export const defaultBankRoot = path.join(process.cwd(), "catalog", "asset-bank");

export async function readBank(root = defaultBankRoot): Promise<BankCollection> {
  const index = indexSchema.parse(JSON.parse(await fs.readFile(path.join(root, "index.json"), "utf8")));
  const assets: BankCollection["assets"] = [];
  for (const shard of index.shards) {
    const text = await fs.readFile(path.join(root, "shards", shard), "utf8");
    if (Buffer.byteLength(text) > 4_000_000 || createHash("sha256").update(text).digest("hex") + ".json" !== shard) throw new Error("Catalog shard integrity failure");
    const rows = z.array(bankCollectionSchema.shape.assets.element).max(250).parse(JSON.parse(text));
    assets.push(...rows);
  }
  if (assets.length !== index.assets) throw new Error("Catalog count mismatch");
  return bankCollectionSchema.parse({ version: 1, assets, kits: index.kits });
}

export function mergeBank(current: BankCollection, incoming: BankCollection): BankCollection {
  bankCollectionSchema.parse(incoming);
  const assets = new Map(current.assets.map((a) => [a.id, a]));
  for (const item of incoming.assets) {
    const previous = assets.get(item.id);
    if (previous && (previous.provider !== item.provider || previous.sourceId !== item.sourceId)) throw new Error(`Asset identity collision: ${item.id}`);
    // Provider refreshes must not discard approved files, mappings or review decisions.
    assets.set(item.id, previous && previous.status !== "source" && item.status === "source" ? previous : item);
  }
  const kits = new Map(current.kits.map((k) => [k.id, k]));
  for (const kit of incoming.kits) kits.set(kit.id, kit);
  return bankCollectionSchema.parse({ version: 1, assets: [...assets.values()].sort((a, b) => a.id.localeCompare(b.id)), kits: [...kits.values()].sort((a, b) => a.id.localeCompare(b.id)) });
}

export async function writeBank(input: unknown, root = defaultBankRoot) {
  const bank = bankCollectionSchema.parse(input);
  // Immutable content-addressed shards and an atomic index swap avoid partial generations.
  await fs.mkdir(path.join(root, "shards"), { recursive: true });
  const lock = await fs.open(path.join(root, ".write-lock"), "wx");
  try {
    const ordered = [...bank.assets].sort((a, b) => a.id.localeCompare(b.id));
    const shards: string[] = [];
    for (let offset = 0; offset < ordered.length; offset += 250) {
      const content = JSON.stringify(ordered.slice(offset, offset + 250)) + "\n";
      if (Buffer.byteLength(content) > 4_000_000) throw new Error("Catalog shard too large");
      const name = createHash("sha256").update(content).digest("hex") + ".json";
      await fs.writeFile(path.join(root, "shards", name), content);
      shards.push(name);
    }
    const temp = path.join(root, "index.next.json");
    await fs.writeFile(temp, JSON.stringify({ version: 1, assets: ordered.length, shards, kits: bank.kits }, null, 2) + "\n");
    await fs.rename(temp, path.join(root, "index.json"));
  } finally { await lock.close(); await fs.unlink(path.join(root, ".write-lock")); }
}
