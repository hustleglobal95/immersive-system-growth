import { contentSourceSchema } from "@/src/platform/studioSchema";
import { fetchContentSource } from "@/src/platform/integrations";

export async function POST(request: Request) {
  const size = Number(request.headers.get("content-length") ?? 0);
  if (size > 32_000) return Response.json({ ok: false, error: "Request is too large" }, { status: 413 });
  try {
    const source = contentSourceSchema.parse(await request.json());
    const allowedHosts = (process.env.FORGE_ALLOWED_CONTENT_HOSTS ?? "")
      .split(",")
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5_000);
    try {
      const data = await fetchContentSource(source, {
        allowedHosts,
        environment: process.env,
        signal: controller.signal,
        maxBytes: 2_000_000,
      });
      return Response.json({ ok: true, data });
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Integration preview failed";
    return Response.json({ ok: false, error: message }, { status: 400 });
  }
}
