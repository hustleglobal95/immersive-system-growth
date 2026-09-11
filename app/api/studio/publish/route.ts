import { timingSafeEqual } from "node:crypto";
import { publishStudioDraft } from "@/src/platform/studioPublish";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (process.env.FORGE_STUDIO_PUBLISH_ENABLED !== "true") return Response.json({ ok: false, error: "Studio publishing is disabled" }, { status: 404 });
  const size = Number(request.headers.get("content-length") ?? 0);
  if (!Number.isFinite(size) || size > 1_000_000) return Response.json({ ok: false, error: "Publish request is too large" }, { status: 413 });
  const expected = process.env.FORGE_STUDIO_PUBLISH_SECRET ?? "";
  const received = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!expected || !safeEqual(expected, received)) return Response.json({ ok: false, error: "Publishing authorization failed" }, { status: 401 });
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

function safeEqual(expected: string, received: string) {
  const a = Buffer.from(expected), b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}
