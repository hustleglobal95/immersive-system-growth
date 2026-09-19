import { z } from "zod";
import { AssetVaultNotConfiguredError, assetVaultConfiguration, promoteGeneratedAsset } from "@/src/platform/assetVault";
import { requireStudioRole, studioAccessErrorResponse } from "@/src/platform/studioAccess";
import { appendVaultJournal } from "@/src/platform/studioVault";

export const runtime = "nodejs";

const inputSchema = z.object({
  provider: z.enum(["meshy", "higgsfield-image", "higgsfield-video"]),
  taskId: z.string().min(1).max(220),
  phase: z.enum(["preview", "refine", "generate"]),
  kind: z.enum(["model", "image", "video", "texture", "ui"]),
  projectId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(1).max(140),
}).strict();

export async function GET(request: Request) {
  try {
    await requireStudioRole(request, "reviewer");
    return Response.json({ ok: true, configuration: assetVaultConfiguration() });
  } catch (error) {
    const access = studioAccessErrorResponse(error);
    if (access) return access;
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Could not read Asset Vault status" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const identity = await requireStudioRole(request, "designer");
    const size = Number(request.headers.get("content-length") ?? 0);
    if (!Number.isFinite(size) || size > 16_000) return Response.json({ ok: false, error: "Asset promotion request is too large" }, { status: 413 });
    const input = inputSchema.parse(await request.json());
    const asset = await promoteGeneratedAsset(input);
    try { await appendVaultJournal(input.projectId, identity, "asset-promote", `${input.name} → ${asset.path}`); } catch { /* Asset storage must not fail because optional production history is unavailable. */ }
    return Response.json({ ok: true, asset }, { status: 201 });
  } catch (error) {
    const access = studioAccessErrorResponse(error);
    if (access) return access;
    if (error instanceof AssetVaultNotConfiguredError) return Response.json({ ok: false, error: error.message, configuration: assetVaultConfiguration() }, { status: 503 });
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Could not promote generated asset" }, { status: 400 });
  }
}
