import { requireStudioRole, studioAccessErrorResponse } from "@/src/platform/studioAccess";
import { assetGenerationRequestSchema, readAssetGenerationStatus, submitAssetGeneration, type AssetGenerationProvider } from "@/src/platform/assetGeneration";

export async function POST(request: Request) {
  try { await requireStudioRole(request, "designer"); } catch (error) { return studioAccessErrorResponse(error) ?? Response.json({ ok: false, error: "Asset generation access failed" }, { status: 500 }); }
  const size = Number(request.headers.get("content-length") ?? 0);
  if (size > 32_000) return Response.json({ ok: false, error: "Request is too large" }, { status: 413 });
  try {
    const input = assetGenerationRequestSchema.parse(await request.json());
    const ticket = await submitAssetGeneration(input, process.env);
    return Response.json({ ok: true, ticket });
  } catch (error) {
    return Response.json({ ok: false, error: messageFor(error) }, { status: 400 });
  }
}

export async function GET(request: Request) {
  try {
    await requireStudioRole(request, "reviewer");
    const url = new URL(request.url);
    const provider = url.searchParams.get("provider") as AssetGenerationProvider | null;
    const taskId = url.searchParams.get("taskId") ?? "";
    const phase = url.searchParams.get("phase");
    if (!provider || !["meshy", "higgsfield-image", "higgsfield-video"].includes(provider)) throw new Error("Unknown asset generation provider.");
    if (!taskId || taskId.length > 220) throw new Error("Asset generation task id is missing or invalid.");
    if (phase !== "preview" && phase !== "refine" && phase !== "generate") throw new Error("Asset generation phase is invalid.");
    const status = await readAssetGenerationStatus(provider, taskId, phase, process.env);
    return Response.json({ ok: true, status });
  } catch (error) {
    const access = studioAccessErrorResponse(error);
    if (access) return access;
    return Response.json({ ok: false, error: messageFor(error) }, { status: 400 });
  }
}

function messageFor(error: unknown) {
  if (error && typeof error === "object" && "issues" in error) {
    const issues = (error as { issues?: Array<{ path?: PropertyKey[]; message?: string }> }).issues ?? [];
    return issues.map((issue) => `${issue.path?.join(".") || "request"}: ${issue.message || "Invalid value"}`).join("; ");
  }
  return error instanceof Error ? error.message : "Asset generation request failed";
}
