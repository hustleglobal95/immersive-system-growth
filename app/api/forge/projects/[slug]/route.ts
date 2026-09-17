import { loadForgeProject } from "@/src/platform/forgeProjects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
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
