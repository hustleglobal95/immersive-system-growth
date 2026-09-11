import { telemetryEventSchema } from "@/src/platform/telemetry";

const windows = new Map<string, { started: number; count: number }>();

export async function POST(request: Request) {
  const size = Number(request.headers.get("content-length") ?? 0);
  if (size > 16_000) return Response.json({ accepted: false }, { status: 413 });
  try {
    const event = telemetryEventSchema.parse(await request.json());
    if (!withinLimit(event.sessionId)) return Response.json({ accepted: false }, { status: 429 });
    const sink = process.env.FORGE_TELEMETRY_WEBHOOK_URL;
    if (sink) {
      const url = new URL(sink);
      if (url.protocol !== "https:") throw new Error("Telemetry webhook must use HTTPS");
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3_000);
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(event),
          signal: controller.signal,
          redirect: "error",
        });
        if (!response.ok) throw new Error("Telemetry webhook rejected the event");
      } finally {
        clearTimeout(timer);
      }
    } else {
      console.info("FORGE_TELEMETRY", JSON.stringify(event));
    }
    return Response.json({ accepted: true }, { status: 202 });
  } catch {
    return Response.json({ accepted: false }, { status: 400 });
  }
}

function withinLimit(sessionId: string) {
  const now = Date.now();
  const current = windows.get(sessionId);
  if (!current || now - current.started > 60_000) {
    windows.set(sessionId, { started: now, count: 1 });
    if (windows.size > 2_000) windows.clear();
    return true;
  }
  current.count++;
  return current.count <= 60;
}
