import {
  assetGenerationRequestSchema,
  preferredAssetProvider,
  readAssetGenerationStatus,
  submitAssetGeneration,
  type AssetGenerationStatus,
  type AssetGenerationTicket,
  type ForgeAssetType,
} from "@/src/platform/assetGeneration";
import { promoteGeneratedAsset } from "@/src/platform/assetVault";
import {
  parseInteractive3DBlueprint,
  type Interactive3DBlueprint,
} from "@/src/platform/interactive3dBlueprint";
import { parseAssetManifest } from "@/src/platform/assetManifestSchema";
import type { AssetManifest, AssetManifestEntry } from "@/src/types/assets";

export interface Interactive3DAssetRequest {
  assetId: string;
  type: ForgeAssetType;
  name: string;
  prompt: string;
}

export interface Interactive3DAssetResolution {
  blueprint: Interactive3DBlueprint;
  manifest: AssetManifest;
  tickets: Array<{ assetId: string; ticket: AssetGenerationTicket }>;
  promoted: Array<{ assetId: string; path: string; bytes: number; sha256: string }>;
}

export function generationRequestsForInteractive3D(
  blueprint: Interactive3DBlueprint,
): Interactive3DAssetRequest[] {
  return blueprint.assets.flatMap((asset) => {
    if (asset.status !== "generate") return [];
    const type = generationType(asset.type);
    if (!type || !preferredAssetProvider(type)) return [];
    const prompt = [
      "Create a production asset for an interactive 3D website.",
      "Project: " + blueprint.project.name + ".",
      "Role: " + asset.role,
      "Visual world: " + blueprint.experience.visualWorld,
      "Art direction: " + blueprint.artDirection.composition + " " + blueprint.artDirection.lighting + " " + blueprint.artDirection.material,
      "Palette: background " + blueprint.artDirection.palette.background + ", accent " + blueprint.artDirection.palette.accent + ".",
      type === "model"
        ? "Deliver a clean hero-ready object/environment with coherent scale, silhouette, PBR material separation and no baked text or logos unless explicitly described."
        : "Create one coherent art-directed plate with intentional negative space, no generic AI interface decoration and no invented brand text.",
    ].join(" ");
    return [{
      assetId: asset.id,
      type,
      name: asset.label,
      prompt: prompt.slice(0, 4000),
    }];
  });
}

export async function resolveInteractive3DGeneratedAssets(input: {
  blueprint: Interactive3DBlueprint;
  manifest: unknown;
  projectId: string;
  environment?: NodeJS.ProcessEnv;
  awaitCompletion: boolean;
  pollIntervalMs?: number;
  maxWaitMs?: number;
}): Promise<Interactive3DAssetResolution> {
  const environment = input.environment ?? process.env;
  let blueprint = parseInteractive3DBlueprint(input.blueprint);
  let manifest = parseAssetManifest(input.manifest);
  const tickets: Interactive3DAssetResolution["tickets"] = [];
  const promoted: Interactive3DAssetResolution["promoted"] = [];

  for (const request of generationRequestsForInteractive3D(blueprint)) {
    const validated = assetGenerationRequestSchema.parse({
      action: "submit",
      name: request.name,
      type: request.type,
      prompt: request.prompt,
    });
    let ticket = await submitAssetGeneration(validated, environment);
    tickets.push({ assetId: request.assetId, ticket });
    if (!input.awaitCompletion) continue;

    let status = await waitForAsset(ticket, environment, input.pollIntervalMs ?? 5000, input.maxWaitMs ?? 600000);
    if (ticket.provider === "meshy" && ticket.phase === "preview" && status.canRefine) {
      ticket = await submitAssetGeneration(assetGenerationRequestSchema.parse({
        action: "refine",
        name: request.name,
        type: request.type,
        prompt: request.prompt,
        taskId: ticket.taskId,
      }), environment);
      tickets.push({ assetId: request.assetId, ticket });
      status = await waitForAsset(ticket, environment, input.pollIntervalMs ?? 5000, input.maxWaitMs ?? 600000);
    }
    if (status.status !== "succeeded") {
      throw new Error("Asset generation did not complete successfully for " + request.assetId + ": " + (status.error ?? status.status));
    }
    const stored = await promoteGeneratedAsset({
      provider: ticket.provider,
      taskId: ticket.taskId,
      phase: ticket.phase,
      kind: request.type,
      projectId: input.projectId,
      name: request.name,
    }, environment);
    promoted.push({ assetId: request.assetId, path: stored.path, bytes: stored.bytes, sha256: stored.sha256 });
    blueprint = parseInteractive3DBlueprint({
      ...blueprint,
      assets: blueprint.assets.map((asset) =>
        asset.id === request.assetId
          ? { ...asset, status: "existing", source: stored.path }
          : asset
      ),
    });
    manifest = addManifestEntry(manifest, request.type, {
      path: stored.path,
      bytes: stored.bytes,
      sha256: stored.sha256,
    });
  }
  return { blueprint, manifest, tickets, promoted };
}

async function waitForAsset(
  ticket: AssetGenerationTicket,
  environment: NodeJS.ProcessEnv,
  pollIntervalMs: number,
  maxWaitMs: number,
): Promise<AssetGenerationStatus> {
  const started = Date.now();
  while (Date.now() - started <= maxWaitMs) {
    const status = await readAssetGenerationStatus(ticket.provider, ticket.taskId, ticket.phase, environment);
    if (["succeeded","failed","canceled"].includes(status.status)) return status;
    await new Promise((resolve) => setTimeout(resolve, Math.max(1000, pollIntervalMs)));
  }
  throw new Error("Timed out waiting for generated asset " + ticket.taskId + ".");
}

function generationType(type: Interactive3DBlueprint["assets"][number]["type"]): ForgeAssetType | null {
  if (type === "model" || type === "image" || type === "video") return type;
  return null;
}

function addManifestEntry(manifest: AssetManifest, type: ForgeAssetType, entry: AssetManifestEntry): AssetManifest {
  const next = structuredClone(manifest);
  const key = type === "model" ? "models" : type === "video" ? "video" : "textures";
  const rows = next[key] as AssetManifestEntry[];
  if (!rows.some((item) => item.sha256 === entry.sha256)) rows.push(entry);
  return parseAssetManifest(next);
}
