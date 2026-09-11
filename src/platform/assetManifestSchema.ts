import { z } from "zod";
import type { AssetManifest } from "@/src/types/assets";

const localAsset = z.string().regex(/^\/(?:models|textures|hdr|video)\/(?!.*\.\.)[^\s?#]+$/);
const entry = z.object({ path: localAsset.or(z.string().url().refine((value) => value.startsWith("https://"))), bytes: z.number().int().positive(), sha256: z.string().regex(/^[a-f0-9]{64}$/) }).strict();
export const assetManifestSchema = z.object({
  models: z.array(entry).max(200),
  textures: z.array(entry).max(400),
  hdr: z.array(entry).max(100),
  video: z.array(entry).max(100),
  budgets: z.object({ modelMb: z.number().positive().max(500), textureMb: z.number().positive().max(500), hdrMb: z.number().positive().max(500), videoMb: z.number().positive().max(1000), totalMb: z.number().positive().max(5000) }).strict(),
}).strict();

export function parseAssetManifest(value: unknown): AssetManifest {
  return assetManifestSchema.parse(value);
}
