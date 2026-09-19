import { requireStudioRole, studioAccessErrorResponse } from "@/src/platform/studioAccess";
import { clearPublishSessionCookie, publishSessionCookie, safeSecretEqual } from "@/src/platform/studioPublishAuth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try { await requireStudioRole(request, "developer"); } catch (error) { return studioAccessErrorResponse(error) ?? Response.json({ ok: false, error: "Publish unlock access failed" }, { status: 500 }); }
  if (process.env.FORGE_STUDIO_PUBLISH_ENABLED !== "true") return Response.json({ ok: false, error: "Studio publishing is disabled" }, { status: 404 });
  const size = Number(request.headers.get("content-length") ?? 0);
  if (!Number.isFinite(size) || size > 4096) return Response.json({ ok: false, error: "Unlock request is too large" }, { status: 413 });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ ok: false, error: "Cross-origin publishing is blocked" }, { status: 403 });
  const expected = process.env.FORGE_STUDIO_PUBLISH_SECRET ?? "";
  let received = "";
  try {
    const body = await request.json() as { secret?: unknown };
    received = typeof body.secret === "string" ? body.secret : "";
  } catch {
    return Response.json({ ok: false, error: "Invalid unlock request" }, { status: 400 });
  }
  if (!safeSecretEqual(expected, received)) return Response.json({ ok: false, error: "Owner publish secret is incorrect" }, { status: 401 });
  const secure = new URL(request.url).protocol === "https:";
  const response = Response.json({ ok: true });
  response.headers.set("set-cookie", publishSessionCookie(expected, secure));
  response.headers.set("cache-control", "no-store");
  return response;
}

export async function DELETE(request: Request) {
  try { await requireStudioRole(request, "reviewer"); } catch (error) { return studioAccessErrorResponse(error) ?? Response.json({ ok: false, error: "Publish sign-out access failed" }, { status: 500 }); }
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ ok: false, error: "Cross-origin publishing is blocked" }, { status: 403 });
  const secure = new URL(request.url).protocol === "https:";
  const response = Response.json({ ok: true });
  response.headers.set("set-cookie", clearPublishSessionCookie(secure));
  response.headers.set("cache-control", "no-store");
  return response;
}
