import { z } from "zod";

export const bankId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120);
export const bankKinds = ["model", "material", "hdri", "image", "video", "audio", "font"] as const;
export const bankUrl = z.string().max(2000).refine((value) => {
  if (/[\\\s]/.test(value)) return false;
  if (value.startsWith("/")) return /^\/(?:models|textures|hdr|video|audio|fonts)\/[A-Za-z0-9_./-]+$/.test(value) && !value.includes("..");
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password && ![...url.searchParams.keys()].some((key) => /token|signature|credential|secret|api.?key|^sig$|^se$/i.test(key)); } catch { return false; }
}, "Use an asset path or a public HTTPS URL without credentials");
const file = z.object({
  url: bankUrl, format: z.string().min(1).max(16),
  bytes: z.number().int().positive().max(2_000_000_000),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  role: z.enum(["runtime", "mobile", "poster", "source"]),
}).strict();
export const bankAssetSchema = z.object({
  id: bankId, title: z.string().min(1).max(160), description: z.string().max(1600),
  kind: z.enum(bankKinds), provider: bankId, sourceId: z.string().min(1).max(160),
  sourceUrl: bankUrl.refine((url) => url.startsWith("https://")),
  thumbnail: bankUrl.optional(),
  tags: z.array(z.string().min(1).max(120)).max(100),
  industries: z.array(bankId).max(20),
  authors: z.array(z.string().min(1).max(160)).min(1).max(40),
  license: z.object({ id: z.string().min(1).max(80), url: bankUrl.refine((url) => url.startsWith("https://")), attribution: z.string().max(1200) }).strict(),
  status: z.enum(["source", "prepared", "reference"]),
  approval: z.object({ by: z.string().min(1).max(160), date: z.iso.date(), scope: z.enum(["reference", "client"]), notes: z.string().max(800) }).strict().optional(),
  files: z.array(file).max(20),
  metadata: z.object({
    triangles: z.number().int().nonnegative().optional(),
    sourcePolycount: z.number().int().nonnegative().optional(),
    nodes: z.array(z.string().min(1).max(120)).max(500).optional(),
    resolution: z.tuple([z.number().positive(), z.number().positive()]).optional(),
    durationSeconds: z.number().nonnegative().optional(),
  }).strict(),
}).strict().superRefine((asset, ctx) => {
  const runtime = asset.files.filter((f) => f.role === "runtime");
  if (["runtime", "mobile", "poster"].some((role) => asset.files.filter((f) => f.role === role).length > 1)) ctx.addIssue({ code: "custom", message: "Only one runtime, mobile and poster variant are allowed" });
  if (asset.status !== "source" && (runtime.length !== 1 || !asset.approval)) ctx.addIssue({ code: "custom", message: "Prepared/reference assets require a verified runtime file and approval record" });
  if (asset.status === "prepared" && asset.approval?.scope !== "client") ctx.addIssue({ code: "custom", message: "Prepared assets require client approval scope" });
  if (asset.status === "reference" && asset.approval?.scope !== "reference") ctx.addIssue({ code: "custom", message: "Reference assets require reference approval scope" });
  if (asset.kind === "model" && asset.files.some((f) => ["runtime", "mobile"].includes(f.role) && f.format !== "glb")) ctx.addIssue({ code: "custom", message: "Runtime models must be self-contained GLB files" });
  if (asset.kind === "video" && asset.status !== "source" && !asset.files.some((f) => f.role === "poster")) ctx.addIssue({ code: "custom", message: "Prepared video requires a verified poster file" });
});
export const sceneKitSchema = z.object({
  id: bankId, title: z.string().min(1).max(160), description: z.string().min(1).max(1000),
  industry: bankId, assetIds: z.array(bankId).min(1).max(100),
  recipe: bankId, status: z.literal("reference"),
  artDirection: z.string().min(1).max(1000),
}).strict();
export type BankAsset = z.infer<typeof bankAssetSchema>;
export type SceneKit = z.infer<typeof sceneKitSchema>;
export const bankCollectionSchema = z.object({ version: z.literal(1), assets: z.array(bankAssetSchema).max(100_000), kits: z.array(sceneKitSchema).max(1000) }).strict().superRefine((bank, ctx) => {
  const ids = new Set(bank.assets.map((a) => a.id));
  if (ids.size !== bank.assets.length) ctx.addIssue({ code: "custom", message: "Duplicate asset IDs" });
  if (new Set(bank.kits.map((k) => k.id)).size !== bank.kits.length) ctx.addIssue({ code: "custom", message: "Duplicate kit IDs" });
  for (const kit of bank.kits) for (const id of kit.assetIds) if (!ids.has(id)) ctx.addIssue({ code: "custom", message: `Kit ${kit.id} references missing asset ${id}` });
});
export type BankCollection = z.infer<typeof bankCollectionSchema>;

export const bankQuerySchema = z.object({
  q: z.string().max(200).default(""), kind: z.enum(bankKinds).optional(),
  status: z.enum(["source", "prepared", "reference"]).optional(),
  industry: bankId.optional(), provider: bankId.optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(24),
}).strict();
