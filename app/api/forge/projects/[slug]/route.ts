import { loadForgeProject } from "@/src/platform/forgeProjects";
import { requireStudioRole, studioAccessErrorResponse } from "@/src/platform/studioAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try { await requireStudioRole(request, "reviewer"); } catch (error) { return studioAccessErrorResponse(error) ?? Response.json({ error: "Project access failed" }, { status: 500 }); }
  const { slug } = await params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return Response.json({ error: "Invalid project" }, { status: 400 });
  try {
    const project = loadForgeProject(slug);
    if (!project) return Response.json({ error: "Project not found" }, { status: 404 });
    return Response.json(project, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Project failed validation" }, { status: 422 });
  }
}
