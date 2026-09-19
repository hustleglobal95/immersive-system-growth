import { createHash } from "node:crypto";
import { readAssetGenerationStatus, type AssetGenerationProvider, type ForgeAssetType } from "@/src/platform/assetGeneration";

export interface PromoteGeneratedAssetInput {
  provider: AssetGenerationProvider;
  taskId: string;
  phase: "preview" | "refine" | "generate";
  kind: ForgeAssetType;
  projectId: string;
  name: string;
}

export function assetVaultConfiguration(environment: NodeJS.ProcessEnv = process.env) {
  return {
    configured: Boolean(environment.FORGE_ASSET_VAULT_ENDPOINT && environment.FORGE_ASSET_VAULT_PUBLIC_BASE_URL && environment.FORGE_ASSET_VAULT_TOKEN),
    endpointConfigured: Boolean(environment.FORGE_ASSET_VAULT_ENDPOINT),
    publicBaseConfigured: Boolean(environment.FORGE_ASSET_VAULT_PUBLIC_BASE_URL),
    tokenConfigured: Boolean(environment.FORGE_ASSET_VAULT_TOKEN),
  };
}

export async function promoteGeneratedAsset(input: PromoteGeneratedAssetInput, environment: NodeJS.ProcessEnv = process.env) {
  validateInput(input);
  const configuration = assetVaultConfiguration(environment);
  if (!configuration.configured) throw new AssetVaultNotConfiguredError();

  const status = await readAssetGenerationStatus(input.provider, input.taskId, input.phase, environment);
  if (status.status !== "succeeded") throw new Error("Generated asset is not ready for promotion");
  const source = chooseOutput(status.outputs, input.kind);
  if (!source) throw new Error("The asset provider did not return a promotable file");
  const sourceUrl = new URL(source);
  if (sourceUrl.protocol !== "https:") throw new Error("Generated asset source must use HTTPS");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(sourceUrl, { signal: controller.signal, cache: "no-store" });
    if (!response.ok) throw new Error(`Generated asset download failed (${response.status})`);
    const announced = Number(response.headers.get("content-length") ?? 0);
    if (announced > 120 * 1024 * 1024) throw new Error("Generated asset exceeds the 120 MB Forge Asset Vault bridge limit");
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.byteLength > 120 * 1024 * 1024) throw new Error("Generated asset exceeds the 120 MB Forge Asset Vault bridge limit");

    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const extension = extensionFor(input.kind, sourceUrl.pathname);
    const baseName = cleanName(input.name).replace(/\.[A-Za-z0-9]+$/, "") || "asset";
    const key = [input.projectId, sha256.slice(0, 2), `${sha256}-${baseName}.${extension}`].map(encodeURIComponent).join("/");
    const endpoint = new URL(ensureSlash(environment.FORGE_ASSET_VAULT_ENDPOINT!) + key);
    const upload = await fetch(endpoint, {
      method: "PUT",
      headers: {
        authorization: `Bearer ${environment.FORGE_ASSET_VAULT_TOKEN}`,
        "content-type": response.headers.get("content-type") ?? contentTypeFor(input.kind),
        "content-length": String(bytes.byteLength),
        "x-forge-sha256": sha256,
        "x-forge-project": input.projectId,
      },
      body: bytes,
      cache: "no-store",
    });
    if (!upload.ok) throw new Error(`Asset Vault upload failed (${upload.status}): ${(await upload.text()).slice(0, 220)}`);
    const path = new URL(key, ensureSlash(environment.FORGE_ASSET_VAULT_PUBLIC_BASE_URL!)).toString();
    return { path, bytes: bytes.byteLength, sha256, key, sourceProvider: input.provider };
  } finally {
    clearTimeout(timer);
  }
}

export class AssetVaultNotConfiguredError extends Error {
  constructor() { super("Forge Asset Vault is not configured"); }
}

function validateInput(input: PromoteGeneratedAssetInput) {
  if (!["meshy", "higgsfield-image", "higgsfield-video"].includes(input.provider)) throw new Error("Unknown generated asset provider");
  if (!["preview", "refine", "generate"].includes(input.phase)) throw new Error("Invalid generation phase");
  if (!["model", "image", "video", "texture", "ui"].includes(input.kind)) throw new Error("This asset kind cannot be promoted automatically");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.projectId)) throw new Error("Invalid project id");
  if (!input.taskId || input.taskId.length > 220) throw new Error("Invalid asset task id");
  if (!input.name || input.name.length > 140) throw new Error("Invalid asset name");
}

function chooseOutput(outputs: string[], kind: ForgeAssetType) {
  const patterns: Partial<Record<ForgeAssetType, RegExp>> = {
    model: /\.glb(?:\?|$)/i,
    video: /\.(?:mp4|webm|mov)(?:\?|$)/i,
    image: /\.(?:png|jpe?g|webp|avif)(?:\?|$)/i,
    texture: /\.(?:png|jpe?g|webp|avif)(?:\?|$)/i,
    ui: /\.(?:png|jpe?g|webp|avif)(?:\?|$)/i,
  };
  const pattern = patterns[kind];
  return (pattern ? outputs.find((item) => pattern.test(item)) : undefined) ?? outputs.find((item) => /^https:\/\//i.test(item));
}

function extensionFor(kind: ForgeAssetType, pathname: string) {
  const found = pathname.match(/\.([A-Za-z0-9]{2,6})$/)?.[1]?.toLowerCase();
  if (found && ["glb", "png", "jpg", "jpeg", "webp", "avif", "mp4", "webm", "mov"].includes(found)) return found === "jpeg" ? "jpg" : found;
  if (kind === "model") return "glb";
  if (kind === "video") return "mp4";
  return "webp";
}
function contentTypeFor(kind: ForgeAssetType) { return kind === "model" ? "model/gltf-binary" : kind === "video" ? "video/mp4" : "image/webp"; }
function cleanName(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100); }
function ensureSlash(value: string) { return value.endsWith("/") ? value : value + "/"; }
