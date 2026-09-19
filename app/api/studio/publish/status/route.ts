import { isPublishSessionAuthorized } from "@/src/platform/studioPublishAuth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const secret = process.env.FORGE_STUDIO_PUBLISH_SECRET ?? "";
  const response = Response.json({
    ok: true,
    enabled: process.env.FORGE_STUDIO_PUBLISH_ENABLED === "true",
    secretConfigured: Boolean(secret),
    repositoryConfigured: Boolean(process.env.FORGE_GITHUB_REPOSITORY),
    githubTokenConfigured: Boolean(process.env.FORGE_GITHUB_TOKEN),
    sessionAuthorized: isPublishSessionAuthorized(request, secret),
  });
  response.headers.set("cache-control", "no-store");
  return response;
}
