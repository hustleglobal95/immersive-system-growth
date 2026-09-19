import { hasStudioRole, requireStudioRole, studioAccessErrorResponse } from "@/src/platform/studioAccess";
import { isPublishSessionAuthorized } from "@/src/platform/studioPublishAuth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  let identity;
  try { identity = await requireStudioRole(request, "reviewer"); } catch (error) { return studioAccessErrorResponse(error) ?? Response.json({ ok: false, error: "Publish status access failed" }, { status: 500 }); }
  const secret = process.env.FORGE_STUDIO_PUBLISH_SECRET ?? "";
  const response = Response.json({
    ok: true,
    enabled: process.env.FORGE_STUDIO_PUBLISH_ENABLED === "true",
    secretConfigured: Boolean(secret),
    repositoryConfigured: Boolean(process.env.FORGE_GITHUB_REPOSITORY),
    githubTokenConfigured: Boolean(process.env.FORGE_GITHUB_TOKEN),
    sessionAuthorized: isPublishSessionAuthorized(request, secret),
    role: identity.role,
    canPublish: hasStudioRole(identity, "developer"),
  });
  response.headers.set("cache-control", "no-store");
  return response;
}
