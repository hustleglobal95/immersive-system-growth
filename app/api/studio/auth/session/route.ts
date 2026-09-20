import { clearStudioSessionCookie, createStudioSessionToken, parseStudioUsers, studioAccessEnabled, studioAccessErrorResponse, studioIdentityFromRequest, studioSessionCookie, verifyStudioUserSecret } from "@/src/platform/studioAccess";
import { studioAvailableInProduction } from "@/src/platform/studioPerimeter";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!studioAvailableInProduction(process.env)) return Response.json({ ok: false, error: "Not found" }, { status: 404 });
  const identity = await studioIdentityFromRequest(request);
  return Response.json({ ok: true, accessEnabled: studioAccessEnabled(), identity });
}

export async function POST(request: Request) {
  if (!studioAvailableInProduction(process.env)) return Response.json({ ok: false, error: "Not found" }, { status: 404 });
  if (!studioAccessEnabled()) return Response.json({ ok: true, accessEnabled: false, identity: { id: "local-owner", name: "Local owner", role: "owner" } });
  const size = Number(request.headers.get("content-length") ?? 0);
  if (!Number.isFinite(size) || size > 8_000) return Response.json({ ok: false, error: "Sign-in request is too large" }, { status: 413 });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ ok: false, error: "Cross-origin sign-in is blocked" }, { status: 403 });
  try {
    const body = await request.json() as { id?: unknown; secret?: unknown };
    const id = typeof body.id === "string" ? body.id.trim().toLowerCase() : "";
    const secret = typeof body.secret === "string" ? body.secret : "";
    const user = parseStudioUsers().find((item) => item.id === id);
    if (!user || !await verifyStudioUserSecret(user, secret)) return Response.json({ ok: false, error: "Invalid Forge user or passphrase" }, { status: 401 });
    const identity = { id: user.id, name: user.name, role: user.role };
    const token = await createStudioSessionToken(identity, process.env.FORGE_INTERNAL_SESSION_SECRET ?? "");
    const response = Response.json({ ok: true, identity });
    response.headers.set("set-cookie", studioSessionCookie(token, new URL(request.url).protocol === "https:"));
    response.headers.set("cache-control", "no-store");
    return response;
  } catch (error) {
    const access = studioAccessErrorResponse(error);
    if (access) return access;
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Sign-in failed" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  if (!studioAvailableInProduction(process.env)) return Response.json({ ok: false, error: "Not found" }, { status: 404 });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ ok: false, error: "Cross-origin sign-out is blocked" }, { status: 403 });
  const response = Response.json({ ok: true });
  response.headers.set("set-cookie", clearStudioSessionCookie(new URL(request.url).protocol === "https:"));
  response.headers.set("cache-control", "no-store");
  return response;
}
