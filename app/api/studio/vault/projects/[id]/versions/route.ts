import { requireStudioRole, studioAccessErrorResponse } from "@/src/platform/studioAccess";
import { listVaultVersions } from "@/src/platform/studioVault";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireStudioRole(request, "reviewer");
    const { id } = await context.params;
    return Response.json({ ok: true, versions: await listVaultVersions(id) });
  } catch (error) {
    const access = studioAccessErrorResponse(error);
    if (access) return access;
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Could not read Forge Vault versions" }, { status: 400 });
  }
}
