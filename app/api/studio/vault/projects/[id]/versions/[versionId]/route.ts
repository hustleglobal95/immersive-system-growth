import { requireStudioRole, studioAccessErrorResponse } from "@/src/platform/studioAccess";
import { readVaultVersion, restoreVaultVersion } from "@/src/platform/studioVault";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string; versionId: string }> }) {
  try {
    await requireStudioRole(request, "reviewer");
    const { id, versionId } = await context.params;
    const snapshot = await readVaultVersion(id, versionId);
    if (!snapshot) return Response.json({ ok: false, error: "Vault version not found" }, { status: 404 });
    return Response.json({ ok: true, snapshot });
  } catch (error) {
    const access = studioAccessErrorResponse(error);
    if (access) return access;
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Could not read Forge Vault version" }, { status: 400 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string; versionId: string }> }) {
  try {
    const identity = await requireStudioRole(request, "designer");
    const { id, versionId } = await context.params;
    return Response.json({ ok: true, ...(await restoreVaultVersion(id, versionId, identity)) });
  } catch (error) {
    const access = studioAccessErrorResponse(error);
    if (access) return access;
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Could not restore Forge Vault version" }, { status: 400 });
  }
}
