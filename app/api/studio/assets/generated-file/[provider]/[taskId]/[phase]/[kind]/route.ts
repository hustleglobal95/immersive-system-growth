import { readAssetGenerationStatus, type AssetGenerationProvider } from "@/src/platform/assetGeneration";

export async function GET(_request: Request, context: { params: Promise<{ provider: string; taskId: string; phase: string; kind: string }> }) {
  try {
    const params = await context.params;
    const provider = params.provider as AssetGenerationProvider;
    const taskId = params.taskId;
    const phase = params.phase;
    const kind = params.kind;
    if (!["meshy", "higgsfield-image", "higgsfield-video"].includes(provider)) throw new Error("Unknown generated asset provider.");
    if (!taskId || taskId.length > 220) throw new Error("Generated asset task id is missing or invalid.");
    if (phase !== "preview" && phase !== "refine" && phase !== "generate") throw new Error("Generated asset phase is invalid.");

    const status = await readAssetGenerationStatus(provider, taskId, phase, process.env);
    if (status.status !== "succeeded") throw new Error("The generated asset is not ready yet.");
    const source = chooseOutput(status.outputs, kind);
    if (!source) throw new Error("The provider did not return a usable generated file.");

    const sourceUrl = new URL(source);
    if (sourceUrl.protocol !== "https:") throw new Error("Generated asset source must use HTTPS.");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);
    try {
      const response = await fetch(sourceUrl, { signal: controller.signal, cache: "no-store" });
      if (!response.ok || !response.body) throw new Error(`Generated asset download failed (${response.status}).`);
      const contentLength = Number(response.headers.get("content-length") ?? 0);
      if (contentLength > 120 * 1024 * 1024) throw new Error("Generated asset exceeds Forge's 120 MB draft bridge limit.");
      return new Response(response.body, {
        status: 200,
        headers: {
          "Content-Type": response.headers.get("content-type") ?? contentTypeFor(kind),
          "Cache-Control": "private, no-store",
          "Content-Disposition": `inline; filename="${safeFilename(kind)}"`,
        },
      });
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Generated asset download failed" }, { status: 400 });
  }
}

function chooseOutput(outputs: string[], kind: string) {
  const patterns: Record<string, RegExp> = {
    model: /\.glb(?:\?|$)/i,
    video: /\.(?:mp4|webm|mov)(?:\?|$)/i,
    image: /\.(?:png|jpe?g|webp|avif)(?:\?|$)/i,
    texture: /\.(?:png|jpe?g|webp|avif)(?:\?|$)/i,
    ui: /\.(?:png|jpe?g|webp|avif)(?:\?|$)/i,
  };
  const pattern = patterns[kind];
  return (pattern ? outputs.find((item) => pattern.test(item)) : undefined) ?? outputs.find((item) => /^https:\/\//i.test(item));
}

function contentTypeFor(kind: string) {
  if (kind === "model") return "model/gltf-binary";
  if (kind === "video") return "video/mp4";
  return "image/webp";
}
function safeFilename(kind: string) {
  if (kind === "model") return "forge-generated.glb";
  if (kind === "video") return "forge-generated.mp4";
  return "forge-generated.webp";
}
