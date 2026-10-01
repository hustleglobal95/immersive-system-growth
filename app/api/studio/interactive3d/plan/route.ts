import { z } from "zod";
import { requireStudioRole, studioAccessErrorResponse } from "@/src/platform/studioAccess";
import { parseExperience } from "@/src/lib/configSchema";
import { planInteractive3DFromPrompt } from "@/src/platform/interactive3dPlanner";
import { aiGatewayInteractive3DPlannerConfigured, refineInteractive3DBlueprintWithAi } from "@/src/platform/autonomy/aiGatewayInteractive3DPlanner";
import { compileInteractive3DBlueprint } from "@/src/platform/interactive3dCompiler";
import { materializeInteractive3DExperience } from "@/src/platform/interactive3dMaterializer";
import { parseAssetManifest } from "@/src/platform/assetManifestSchema";
import { generationRequestsForInteractive3D } from "@/src/platform/interactive3dAssetFactory";
import { interactionGraphForInteractive3D } from "@/src/platform/interactive3dInteractionGraph";

export const runtime = "nodejs";

const requestSchema = z.object({
  prompt: z.string().min(12).max(5000),
  projectName: z.string().min(1).max(100),
  experience: z.unknown(),
  manifest: z.unknown(),
  useCurrentHero: z.boolean().default(false),
}).strict();

export async function POST(request: Request) {
  try {
    await requireStudioRole(request, "designer");
  } catch (error) {
    return studioAccessErrorResponse(error) ?? Response.json({ ok: false, error: "Interactive 3D Studio access failed." }, { status: 500 });
  }

  const size = Number(request.headers.get("content-length") ?? 0);
  if (!Number.isFinite(size) || size > 1_500_000) {
    return Response.json({ ok: false, error: "Interactive 3D planning request is too large." }, { status: 413 });
  }

  try {
    const input = requestSchema.parse(await request.json());
    const experience = parseExperience(input.experience);
    const sourceManifest = parseAssetManifest(input.manifest);
    const cleanManifest = input.useCurrentHero
      ? sourceManifest
      : parseAssetManifest({
          ...sourceManifest,
          models: [],
          textures: [],
          hdr: [],
          video: [],
        });
    const heroSource = input.useCurrentHero ? experience.heroModel : "";
    const base = planInteractive3DFromPrompt({
      prompt: input.prompt,
      projectName: input.projectName,
      experience,
      manifest: cleanManifest,
      ...(heroSource ? {
        heroAsset: {
          id: "studio-owned-hero",
          label: input.projectName + " current hero GLB",
          type: "model" as const,
          source: heroSource,
        },
      } : {}),
    });

    const aiConfigured = aiGatewayInteractive3DPlannerConfigured(process.env);
    const blueprint = aiConfigured
      ? await refineInteractive3DBlueprintWithAi({ prompt: input.prompt, base: base.blueprint })
      : base.blueprint;
    const compilePlan = compileInteractive3DBlueprint(blueprint);
    const materialized = materializeInteractive3DExperience({ blueprint, experience });
    const interactionGraph = interactionGraphForInteractive3D(blueprint);
    const assetRequests = generationRequestsForInteractive3D(blueprint);

    return Response.json({
      ok: true,
      ai: { configured: aiConfigured, used: aiConfigured },
      blueprint,
      candidate: materialized.experience,
      assetManifest: cleanManifest,
      interactionGraph,
      assetRequests,
      assets: materialized.assetReadiness,
      decisions: [
        ...base.decisions,
        "Forge recipes: " + [...new Set(compilePlan.scenes.flatMap((scene) => scene.recipes))].join(", "),
        "Signature slice: " + compilePlan.signatureSlice.sceneId,
      ],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Interactive 3D planning failed.";
    return Response.json({ ok: false, error: message }, { status: 422 });
  }
}
