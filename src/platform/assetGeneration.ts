import { z } from "zod";

export const forgeAssetTypeSchema = z.enum(["model", "image", "video", "texture", "hdri", "audio", "ui", "copy"]);
export type ForgeAssetType = z.infer<typeof forgeAssetTypeSchema>;

export const assetGenerationRequestSchema = z.object({
  action: z.enum(["submit", "refine"]).default("submit"),
  name: z.string().min(1).max(140),
  type: forgeAssetTypeSchema,
  prompt: z.string().min(8).max(4000),
  taskId: z.string().min(1).max(220).optional(),
}).strict();

export type AssetGenerationProvider = "meshy" | "higgsfield-image" | "higgsfield-video";

export interface AssetGenerationTicket {
  provider: AssetGenerationProvider;
  taskId: string;
  phase: "preview" | "refine" | "generate";
  status: "submitted";
  message: string;
}

export interface AssetGenerationStatus {
  provider: AssetGenerationProvider;
  taskId: string;
  phase: "preview" | "refine" | "generate";
  status: "queued" | "working" | "succeeded" | "failed" | "canceled";
  progress?: number;
  outputs: string[];
  previewUrl?: string;
  error?: string;
  canRefine?: boolean;
}

export function preferredAssetProvider(type: ForgeAssetType): AssetGenerationProvider | null {
  if (type === "model") return "meshy";
  if (type === "video") return "higgsfield-video";
  if (type === "image" || type === "texture" || type === "ui") return "higgsfield-image";
  return null;
}

export async function submitAssetGeneration(
  input: z.infer<typeof assetGenerationRequestSchema>,
  environment: NodeJS.ProcessEnv,
): Promise<AssetGenerationTicket> {
  const provider = preferredAssetProvider(input.type);
  if (!provider) throw new Error(`${input.type} generation is not connected yet. Import this asset manually or choose a supported image, video or 3D asset.`);

  if (provider === "meshy") {
    const apiKey = environment.MESHY_API_KEY;
    if (!apiKey) throw new Error("Meshy is not connected. Add MESHY_API_KEY to the server environment to create 3D assets inside Forge.");

    const isRefine = input.action === "refine";
    if (isRefine && !input.taskId) throw new Error("A completed Meshy preview task is required before refinement.");
    const body = isRefine
      ? { mode: "refine", preview_task_id: input.taskId, enable_pbr: true, target_formats: ["glb"] }
      : { mode: "preview", prompt: input.prompt, target_formats: ["glb"] };
    const response = await providerFetch("https://api.meshy.ai/openapi/v2/text-to-3d", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json() as { result?: string };
    if (!data.result) throw new Error("Meshy did not return a task id.");
    return {
      provider,
      taskId: data.result,
      phase: isRefine ? "refine" : "preview",
      status: "submitted",
      message: isRefine ? "Meshy is texturing and preparing the production GLB." : "Meshy is building the first 3D geometry preview.",
    };
  }

  const keyId = environment.HF_API_KEY_ID;
  const keySecret = environment.HF_API_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error("Higgsfield API is not connected. Add HF_API_KEY_ID and HF_API_KEY_SECRET to the server environment to create image/video assets inside Forge.");
  const authorization = `Key ${keyId}:${keySecret}`;
  const endpoint = provider === "higgsfield-image"
    ? "https://api.higgsfield.ai/marketing-studio/image"
    : "https://api.higgsfield.ai/minimax/h3/text-to-video";
  const body = provider === "higgsfield-image"
    ? { prompt: input.prompt, quality: "high", moderation: "auto", resolution: "2k", aspect_ratio: "16:9", enhance_prompt: false }
    : { prompt: input.prompt, duration: 5, resolution: "2K", aspect_ratio: "16:9", aigc_watermark: false };
  const response = await providerFetch(endpoint, {
    method: "POST",
    headers: { Authorization: authorization, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json() as Record<string, unknown>;
  const taskId = firstString(data.request_id, data.id, data.requestId);
  if (!taskId) throw new Error("Higgsfield did not return a request id.");
  return {
    provider,
    taskId,
    phase: "generate",
    status: "submitted",
    message: provider === "higgsfield-image" ? "Higgsfield is creating the image asset." : "Higgsfield is creating the video asset.",
  };
}

export async function readAssetGenerationStatus(
  provider: AssetGenerationProvider,
  taskId: string,
  phase: "preview" | "refine" | "generate",
  environment: NodeJS.ProcessEnv,
): Promise<AssetGenerationStatus> {
  if (provider === "meshy") {
    const apiKey = environment.MESHY_API_KEY;
    if (!apiKey) throw new Error("Meshy is not connected.");
    const response = await providerFetch(`https://api.meshy.ai/openapi/v2/text-to-3d/${encodeURIComponent(taskId)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const data = await response.json() as Record<string, unknown>;
    const rawStatus = String(data.status ?? "PENDING");
    const modelUrls = isRecord(data.model_urls) ? Object.values(data.model_urls).filter(isString) : [];
    const error = isRecord(data.task_error) ? firstString(data.task_error.message) : undefined;
    return {
      provider,
      taskId,
      phase,
      status: normalizeStatus(rawStatus),
      progress: typeof data.progress === "number" ? data.progress : undefined,
      outputs: modelUrls,
      previewUrl: firstString(data.thumbnail_url),
      error,
      canRefine: phase === "preview" && rawStatus.toUpperCase() === "SUCCEEDED",
    };
  }

  const keyId = environment.HF_API_KEY_ID;
  const keySecret = environment.HF_API_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error("Higgsfield API is not connected.");
  const response = await providerFetch(`https://api.higgsfield.ai/requests/${encodeURIComponent(taskId)}/status`, {
    headers: { Authorization: `Key ${keyId}:${keySecret}` },
  });
  const data = await response.json() as Record<string, unknown>;
  const rawStatus = String(data.status ?? data.state ?? "queued");
  const outputs = collectOutputUrls(data);
  return {
    provider,
    taskId,
    phase,
    status: normalizeStatus(rawStatus),
    progress: typeof data.progress === "number" ? data.progress : undefined,
    outputs,
    previewUrl: outputs.find((url) => /\.(?:png|jpe?g|webp)(?:\?|$)/i.test(url)),
    error: firstString(data.error, isRecord(data.detail) ? data.detail.message : undefined),
  };
}

async function providerFetch(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
    if (!response.ok) {
      const text = (await response.text()).slice(0, 600);
      throw new Error(`Asset provider request failed (${response.status})${text ? `: ${text}` : ""}`);
    }
    return response;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeStatus(value: string): AssetGenerationStatus["status"] {
  const normalized = value.toLowerCase().replace(/[_\s-]+/g, "");
  if (["succeeded", "success", "completed", "complete", "done"].includes(normalized)) return "succeeded";
  if (["failed", "error", "nsfw"].includes(normalized)) return "failed";
  if (["canceled", "cancelled"].includes(normalized)) return "canceled";
  if (["inprogress", "processing", "running", "working"].includes(normalized)) return "working";
  return "queued";
}

function collectOutputUrls(value: unknown): string[] {
  const found = new Set<string>();
  const visit = (current: unknown, depth: number) => {
    if (depth > 6 || current == null) return;
    if (typeof current === "string") {
      if (/^https:\/\//i.test(current)) found.add(current);
      return;
    }
    if (Array.isArray(current)) {
      current.forEach((item) => visit(item, depth + 1));
      return;
    }
    if (typeof current === "object") Object.values(current as Record<string, unknown>).forEach((item) => visit(item, depth + 1));
  };
  visit(value, 0);
  return [...found];
}

function firstString(...values: unknown[]) {
  return values.find(isString) as string | undefined;
}
function isString(value: unknown): value is string { return typeof value === "string" && value.length > 0; }
function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
