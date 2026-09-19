import { requireStudioRole, studioAccessErrorResponse } from "@/src/platform/studioAccess";
import { listVaultProjects, saveVaultProject, vaultConfiguration } from "@/src/platform/studioVault";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireStudioRole(request, "reviewer");
    const configuration = vaultConfiguration();
    return Response.json({ ok: true, configuration, projects: configuration.configured ? await listVaultProjects() : [] });
  } catch (error) {
    const access = studioAccessErrorResponse(error);
    if (access) return access;
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Could not read Forge Vault" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const identity = await requireStudioRole(request, "designer");
    if (!vaultConfiguration().configured) return Response.json({ ok: false, error: "Forge Project Vault is not configured", configuration: vaultConfiguration() }, { status: 503 });
    const size = Number(request.headers.get("content-length") ?? 0);
    if (!Number.isFinite(size) || size > 5_000_000) return Response.json({ ok: false, error: "Vault snapshot request is too large" }, { status: 413 });
    const body = await request.json() as { label?: unknown; note?: unknown; draft?: unknown };
    if (!body.draft || typeof body.draft !== "object") return Response.json({ ok: false, error: "Vault draft is required" }, { status: 400 });
    const label = typeof body.label === "string" ? body.label : "Saved from Studio";
    const note = typeof body.note === "string" ? body.note : "";
    const result = await saveVaultProject(body.draft as Parameters<typeof saveVaultProject>[0], identity, label, note);
    return Response.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    const access = studioAccessErrorResponse(error);
    if (access) return access;
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Could not save Forge Vault project" }, { status: 400 });
  }
}
