import { z } from "zod";

export const EXPERIENCE_MODE_IDS = [
  "scroll-storytelling",
  "floating-navigation",
  "interactive-cards",
  "big-hero-type",
  "3d-product-view",
  "motion-cues",
] as const;

export const experienceModeIdSchema = z.enum(EXPERIENCE_MODE_IDS);

export const experienceModeSchema = z.object({
  id: experienceModeIdSchema,
  label: z.string().min(1).max(80),
  summary: z.string().min(1).max(240),
  composition: z.object({
    narrative: z.enum(["chapters", "editorial", "cards", "product"]),
    navigation: z.enum(["standard", "floating", "minimal"]),
    typography: z.enum(["balanced", "hero"]),
    interaction: z.enum(["scroll", "cards", "orbit", "guided"]),
    cues: z.enum(["standard", "guided"]),
  }).strict(),
  requirements: z.object({
    minimumScenes: z.number().int().min(1).max(24),
    webgl: z.enum(["optional", "enhanced", "required"]),
    productRig: z.boolean(),
  }).strict(),
  fallback: z.enum(["semantic-document", "static-cards", "poster-inspection"]),
  reducedMotion: z.enum(["linear-document", "static-cards", "static-inspection"]),
}).strict();

export const experienceModesManifestSchema = z.object({
  version: z.literal(1),
  activeMode: experienceModeIdSchema,
  modes: z.array(experienceModeSchema).length(EXPERIENCE_MODE_IDS.length),
}).strict().superRefine((manifest, ctx) => {
  const ids = manifest.modes.map((mode) => mode.id);
  EXPERIENCE_MODE_IDS.forEach((id) => {
    if (!ids.includes(id)) {
      ctx.addIssue({ code: "custom", path: ["modes"], message: `Missing required experience mode: ${id}` });
    }
  });
  if (new Set(ids).size !== ids.length) {
    ctx.addIssue({ code: "custom", path: ["modes"], message: "Experience mode IDs must be unique" });
  }
});

export type ExperienceModeId = z.infer<typeof experienceModeIdSchema>;
export type ExperienceMode = z.infer<typeof experienceModeSchema>;
export type ExperienceModesManifest = z.infer<typeof experienceModesManifestSchema>;

export function parseExperienceModes(input: unknown): ExperienceModesManifest {
  return experienceModesManifestSchema.parse(input);
}

export function activeExperienceMode(manifest: ExperienceModesManifest): ExperienceMode {
  const mode = manifest.modes.find((candidate) => candidate.id === manifest.activeMode);
  if (!mode) throw new Error(`Active experience mode is not registered: ${manifest.activeMode}`);
  return mode;
}

export function experienceModeClass(id: ExperienceModeId): string {
  return `experience-mode--${id}`;
}

export function auditExperienceMode(
  mode: ExperienceMode,
  experience: { scenes: readonly unknown[]; heroModel?: string; assets?: readonly { kind: string }[] },
): string[] {
  const failures: string[] = [];
  if (experience.scenes.length < mode.requirements.minimumScenes) {
    failures.push(`${mode.label} requires at least ${mode.requirements.minimumScenes} scenes`);
  }
  if (mode.requirements.productRig) {
    const hasModel = Boolean(experience.heroModel) || Boolean(experience.assets?.some((asset) => asset.kind === "model"));
    if (!hasModel) failures.push(`${mode.label} requires a registered model or product rig`);
  }
  return failures;
}
