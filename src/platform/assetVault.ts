import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { readAssetGenerationStatus, type AssetGenerationProvider, type ForgeAssetType } from "@/src/platform/assetGeneration";

type AssetVaultConfigurationEnvironment={ [key:string]:string|undefined };

export interface PromoteGeneratedAssetInput {
  provider: AssetGenerationProvider;
  taskId: string;
  phase: "preview" | "refine" | "generate";
  kind: ForgeAssetType;
  projectId: string;
  name: string;
}

export function assetVaultConfiguration(environment: AssetVaultConfigurationEnvironment = process.env) {
  const remoteConfigured=Boolean(environment.FORGE_ASSET_VAULT_ENDPOINT && environment.FORGE_ASSET_VAULT_PUBLIC_BASE_URL && environment.FORGE_ASSET_VAULT_TOKEN);
  const localConfigured=environment.NODE_ENV!=="production" && environment.FORGE_LOCAL_STORAGE_ENABLED==="true";
  return {
    configured: remoteConfigured || localConfigured,
    provider: remoteConfigured ? "remote-object-storage" as const : localConfigured ? "local-filesystem" as const : "unconfigured" as const,
    remoteConfigured,
    localConfigured,
    endpointConfigured: Boolean(environment.FORGE_ASSET_VAULT_ENDPOINT),
    publicBaseConfigured: Boolean(environment.FORGE_ASSET_VAULT_PUBLIC_BASE_URL),
    tokenConfigured: Boolean(environment.FORGE_ASSET_VAULT_TOKEN),
  };
}

export async function promoteGeneratedAsset(input: PromoteGeneratedAssetInput, environment: NodeJS.ProcessEnv = process.env) {
  validateInput(input);
  const configuration = assetVaultConfiguration(environment);
  if (!configuration.configured) throw new AssetVaultNotConfiguredError();
  const remote=configuration.remoteConfigured;
  const endpointBase = remote ? requireHttpsBase(environment.FORGE_ASSET_VAULT_ENDPOINT!, "FORGE_ASSET_VAULT_ENDPOINT") : null;
  const publicBase = remote ? requireHttpsBase(environment.FORGE_ASSET_VAULT_PUBLIC_BASE_URL!, "FORGE_ASSET_VAULT_PUBLIC_BASE_URL") : null;

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
    if(remote) {
      const endpoint = new URL(key, endpointBase!);
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
        redirect: "error",
      });
      if (!upload.ok) throw new Error(`Asset Vault upload failed (${upload.status}): ${(await upload.text()).slice(0, 220)}`);
      const assetPath = new URL(key, publicBase!).toString();
      return { path: assetPath, bytes: bytes.byteLength, sha256, key, sourceProvider: input.provider, storageProvider:"remote-object-storage" as const };
    }
    const publicRoot=path.join(process.cwd(),"public");
    const localRoot=path.join(publicRoot,"generated","vault");
    const target=path.join(localRoot,key);
    if(!target.startsWith(localRoot+path.sep)) throw new Error("Local Asset Vault path escapes storage root");
    await fs.mkdir(/* turbopackIgnore: true */ path.dirname(target),{recursive:true});
    const temporary=target+".tmp-"+crypto.randomUUID();
    await fs.writeFile(/* turbopackIgnore: true */ temporary,bytes);
    await fs.rename(/* turbopackIgnore: true */ temporary,/* turbopackIgnore: true */ target);
    const assetPath="/"+path.relative(publicRoot,target).split(path.sep).join("/");
    return { path: assetPath, bytes: bytes.byteLength, sha256, key, sourceProvider: input.provider, storageProvider:"local-filesystem" as const };
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
function requireHttpsBase(value: string, name: string) {
  const url = new URL(value.endsWith("/") ? value : value + "/");
  if (url.protocol !== "https:" || url.username || url.password) throw new Error(`${name} must be a credential-free HTTPS URL`);
  return url;
}
