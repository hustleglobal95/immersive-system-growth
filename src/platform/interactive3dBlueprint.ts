import { z } from "zod";
import {
  DirectorAssetTypeSchema,
  DirectorProjectTypeSchema,
  DirectorTierSchema,
  parseDirectorBrief,
  type DirectorBrief,
} from "@/src/platform/directorSchema";

const short = z.string().min(1).max(180);
const medium = z.string().min(1).max(600);
const directive = z.string().min(1).max(300);
const id = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const finite = z.number().finite();
const vec3 = z.tuple([finite, finite, finite]);

export const Interactive3DArchetypeSchema = z.enum([
  "product-reveal",
  "spatial-story",
  "editorial-depth",
  "interactive-gallery",
  "configurator",
  "data-sculpture",
  "world-explorer",
]);

export const Interactive3DSceneSchema = z.object({
  id,
  label: short,
  purpose: medium,
  dominantSubject: medium,
  copyRole: medium,
  medium: z.enum(["dom", "hybrid", "webgl"]),
  depthStrategy: z.enum([
    "flat",
    "layered-dom",
    "parallax",
    "perspective",
    "material",
    "atmospheric",
    "full-3d",
  ]),
  camera: z.object({
    move: z.enum(["static", "dolly", "truck", "crane", "orbit", "macro", "reveal", "custom"]),
    start: vec3.optional(),
    end: vec3.optional(),
    lens: z.enum(["wide", "normal", "telephoto", "macro", "adaptive"]).default("normal"),
    rationale: medium,
  }).strict(),
  interaction: z.object({
    input: z.enum(["none", "scroll", "pointer", "drag", "tap", "keyboard", "mixed"]),
    physicalQuantity: z.enum([
      "none",
      "position",
      "proximity",
      "velocity",
      "displacement",
      "orientation",
      "impulse",
      "progress",
    ]),
    behavior: medium,
  }).strict(),
  transition: medium,
  mobile: medium,
  prewarm: z.array(directive).max(12).default([]),
}).strict();

export const Interactive3DBlueprintSchema = z.object({
  version: z.literal(1),
  project: z.object({
    name: short,
    projectType: DirectorProjectTypeSchema,
    tier: DirectorTierSchema,
    audience: medium,
    objective: medium,
    primaryAction: short,
    brandTruth: medium,
    differentiators: z.array(directive).max(24).default([]),
    constraints: z.array(directive).max(24).default([]),
  }).strict(),
  experience: z.object({
    archetype: Interactive3DArchetypeSchema,
    thesis: medium,
    visualWorld: medium,
    interactionModel: medium,
    signatureMoment: medium,
    signatureSceneId: id,
    scenes: z.array(Interactive3DSceneSchema).min(2).max(16),
  }).strict(),
  renderer: z.object({
    strategy: z.enum(["webgl", "webgpu-opt-in"]).default("webgl"),
    rationale: medium,
  }).strict(),
  assets: z.array(z.object({
    id,
    label: short,
    type: DirectorAssetTypeSchema,
    status: z.enum(["existing", "generate", "commission", "missing"]),
    role: medium,
    source: medium.optional(),
    heroCandidate: z.boolean().default(false),
  }).strict()).max(80).default([]),
  references: z.array(z.object({
    label: short,
    lesson: medium,
    doNotCopy: medium,
  }).strict()).max(20).default([]),
  performance: z.object({
    targetFps: z.number().int().min(30).max(120).default(60),
    initialCriticalMb: z.number().positive().max(64).default(8),
    maxActiveMb: z.number().positive().max(512).default(96),
    maxDrawCalls: z.number().int().positive().max(5000).default(250),
    maxTriangles: z.number().int().positive().max(5_000_000).default(750_000),
  }).strict(),
  accessibility: z.object({
    semanticFallback: medium,
    reducedMotion: medium,
    keyboardPath: medium,
  }).strict(),
}).strict().superRefine((blueprint, ctx) => {
  if (!blueprint.experience.scenes.some((scene) => scene.id === blueprint.experience.signatureSceneId)) {
    ctx.addIssue({
      code: "custom",
      path: ["experience", "signatureSceneId"],
      message: "Signature scene must exist in experience.scenes",
    });
  }
  if (blueprint.performance.initialCriticalMb > blueprint.performance.maxActiveMb) {
    ctx.addIssue({
      code: "custom",
      path: ["performance", "maxActiveMb"],
      message: "Active budget must include the initial critical budget",
    });
  }
});

export type Interactive3DBlueprint = z.infer<typeof Interactive3DBlueprintSchema>;
export type Interactive3DScene = z.infer<typeof Interactive3DSceneSchema>;

export function parseInteractive3DBlueprint(input: unknown): Interactive3DBlueprint {
  return Interactive3DBlueprintSchema.parse(input);
}

export function blueprintToDirectorBrief(blueprint: Interactive3DBlueprint): DirectorBrief {
  const performanceConstraint =
    `3D budget: ${blueprint.performance.targetFps} FPS target, <=${blueprint.performance.maxDrawCalls} draw calls, <=${blueprint.performance.maxTriangles} triangles, <=${blueprint.performance.maxActiveMb} MB active assets.`;
  const rendererConstraint =
    blueprint.renderer.strategy === "webgpu-opt-in"
      ? "WebGPU is opt-in only. Preserve a production WebGL path until the selected scene stack is verified WebGPU-safe."
      : "Use the production WebGL renderer unless a separately reviewed renderer migration is approved.";

  return parseDirectorBrief({
    projectName: blueprint.project.name,
    projectType: blueprint.project.projectType,
    tier: blueprint.project.tier,
    audience: blueprint.project.audience,
    objective: blueprint.project.objective,
    primaryAction: blueprint.project.primaryAction,
    brandTruth: blueprint.project.brandTruth,
    differentiators: blueprint.project.differentiators,
    constraints: [
      ...blueprint.project.constraints,
      performanceConstraint,
      rendererConstraint,
      `Reduced-motion translation: ${blueprint.accessibility.reducedMotion}`,
      `Semantic fallback: ${blueprint.accessibility.semanticFallback}`,
      `Keyboard path: ${blueprint.accessibility.keyboardPath}`,
    ],
    existingAssets: blueprint.assets
      .filter((asset) => asset.status === "existing")
      .map((asset) => ({
        id: asset.id,
        label: asset.label,
        type: asset.type,
        notes: [asset.role, asset.source].filter(Boolean).join(" Source: "),
      })),
    references: blueprint.references.map((reference) => ({
      label: reference.label,
      lesson: `${reference.lesson} Do not copy: ${reference.doNotCopy}`,
    })),
  });
}

export function blueprintImplementationChecklist(blueprint: Interactive3DBlueprint): string[] {
  const signature = blueprint.experience.scenes.find(
    (scene) => scene.id === blueprint.experience.signatureSceneId,
  )!;
  const sceneChecks = blueprint.experience.scenes.map(
    (scene) =>
      `Scene ${scene.id}: ${scene.medium} / ${scene.depthStrategy}; camera=${scene.camera.move}; input=${scene.interaction.input}; mobile=${scene.mobile}`,
  );
  return [
    `Protect one signature moment in "${signature.label}": ${blueprint.experience.signatureMoment}`,
    `Keep the construction thesis visible: ${blueprint.experience.thesis}`,
    `Use the declared renderer policy: ${blueprint.renderer.strategy}. ${blueprint.renderer.rationale}`,
    `Prewarm the signature scene before first use: ${signature.prewarm.join("; ") || "no explicit prewarm items declared"}`,
    `Meet the performance contract: ${blueprint.performance.targetFps} FPS, ${blueprint.performance.maxDrawCalls} draw calls, ${blueprint.performance.maxTriangles} triangles, ${blueprint.performance.maxActiveMb} MB active.`,
    `Preserve semantic fallback: ${blueprint.accessibility.semanticFallback}`,
    `Preserve reduced-motion meaning: ${blueprint.accessibility.reducedMotion}`,
    ...sceneChecks,
  ];
}

export function blueprintRiskReport(blueprint: Interactive3DBlueprint): string[] {
  const risks: string[] = [];
  if (blueprint.renderer.strategy === "webgpu-opt-in") {
    risks.push(
      "WebGPU requires a compatibility audit before activation: current Forge paths using ShaderMaterial or legacy EffectComposer must stay on WebGL until ported to TSL/node materials and the WebGPU render pipeline.",
    );
  }
  if (!blueprint.assets.some((asset) => asset.heroCandidate && asset.status !== "missing")) {
    risks.push("No available hero candidate is declared; the signature slice may be blocked by asset quality.");
  }
  const unprepared = blueprint.experience.scenes.filter(
    (scene) => scene.medium !== "dom" && scene.prewarm.length === 0,
  );
  if (unprepared.length) {
    risks.push(
      `3D/hybrid scenes without explicit prewarm work: ${unprepared.map((scene) => scene.id).join(", ")}.`,
    );
  }
  const customCamera = blueprint.experience.scenes.filter((scene) => scene.camera.move === "custom");
  if (customCamera.length) {
    risks.push(
      `Custom camera grammar requires an explicit shot contract before implementation: ${customCamera.map((scene) => scene.id).join(", ")}.`,
    );
  }
  return risks;
}
