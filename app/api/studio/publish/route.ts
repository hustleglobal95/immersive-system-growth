import { requireStudioRole, studioAccessErrorResponse } from "@/src/platform/studioAccess";
import { publishStudioDraft } from "@/src/platform/studioPublish";
import { isPublishRequestAuthorized, safeSecretEqual } from "@/src/platform/studioPublishAuth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (process.env.FORGE_STUDIO_PUBLISH_ENABLED !== "true") return Response.json({ ok: false, error: "Studio publishing is disabled" }, { status: 404 });
  const size = Number(request.headers.get("content-length") ?? 0);
  if (!Number.isFinite(size) || size > 1_000_000) return Response.json({ ok: false, error: "Publish request is too large" }, { status: 413 });
  const expected = process.env.FORGE_STUDIO_PUBLISH_SECRET ?? "";
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const legacyAutomation = safeSecretEqual(expected, bearer);
  if (!legacyAutomation) {
    try { await requireStudioRole(request, "developer"); } catch (error) { return studioAccessErrorResponse(error) ?? Response.json({ ok: false, error: "Publishing access failed" }, { status: 500 }); }
  }
  if (!isPublishRequestAuthorized(request, expected)) return Response.json({ ok: false, error: "Publishing authorization failed" }, { status: 401 });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ ok: false, error: "Cross-origin publishing is blocked" }, { status: 403 });
  try {
    const result = await publishStudioDraft(await request.json(), { repository: process.env.FORGE_GITHUB_REPOSITORY ?? "", token: process.env.FORGE_GITHUB_TOKEN ?? "" });
    return Response.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Publishing failed";
    return Response.json({ ok: false, error: message }, { status: 400 });
  }
}

