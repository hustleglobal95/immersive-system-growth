import { requireStudioRole, studioAccessErrorResponse } from "@/src/platform/studioAccess";
import { readVaultJournal, readVaultProject, setVaultProjectArchived } from "@/src/platform/studioVault";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireStudioRole(request, "reviewer");
    const { id } = await context.params;
    const [snapshot, journal] = await Promise.all([readVaultProject(id), readVaultJournal(id)]);
    if (!snapshot) return Response.json({ ok: false, error: "Vault project not found" }, { status: 404 });
    return Response.json({ ok: true, snapshot, journal });
  } catch (error) {
    const access = studioAccessErrorResponse(error);
    if (access) return access;
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Could not load Forge Vault project" }, { status: 400 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const identity = await requireStudioRole(request, "director");
    const { id } = await context.params;
    const body = await request.json() as { archived?: unknown };
    if (typeof body.archived !== "boolean") return Response.json({ ok: false, error: "archived must be boolean" }, { status: 400 });
    return Response.json({ ok: true, project: await setVaultProjectArchived(id, body.archived, identity) });
  } catch (error) {
    const access = studioAccessErrorResponse(error);
    if (access) return access;
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Could not update Forge Vault project" }, { status: 400 });
  }
}
