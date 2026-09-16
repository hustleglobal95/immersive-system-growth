import { z } from "zod";

const short = z.string().min(1).max(180);
const medium = z.string().min(1).max(600);
const long = z.string().min(1).max(1600);
const directives = z.array(z.string().min(1).max(360)).max(64).default([]);
const score = z.number().int().min(0).max(10);

export const DirectorProjectTypeSchema = z.enum([
  "brand",
  "product",
  "property",
  "hospitality",
  "portfolio",
  "saas",
  "commerce",
  "campaign",
  "automotive",
  "fashion",
]);

export const DirectorTierSchema = z.enum(["cinematic", "immersive", "signature", "flagship"]);
export const DirectorAssetQualitySchema = z.enum(["hero", "strong", "supporting", "weak", "missing"]);
export const DirectorProductionDecisionSchema = z.enum(["use", "upgrade", "replace", "create", "omit"]);

export const DirectorBriefSchema = z.object({
  projectName: short,
  projectType: DirectorProjectTypeSchema,
  tier: DirectorTierSchema,
  client: short.optional(),
  audience: medium,
  objective: medium,
  primaryAction: short,
  brandTruth: medium,
  differentiators: directives,
  constraints: directives,
  existingAssets: z.array(z.object({
    id: z.string().min(1).max(120),
    label: short,
    type: z.enum(["model", "image", "video", "audio", "copy", "brand", "data", "other"]),
    notes: medium.optional(),
  }).strict()).max(80).default([]),
  references: z.array(z.object({ label: short, lesson: medium }).strict()).max(20).default([]),
}).strict();

export const DirectorTerritorySchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: short,
  oneLine: medium,
  thesis: medium,
  memory: medium,
  strategicReason: long,
  visualPremise: long,
  experientialPremise: long,
  signatureMoment: long,
  risk: medium,
  scores: z.object({
    distinctiveness: score,
    brandFit: score,
    memorability: score,
    feasibility: score,
    conversionFit: score,
  }).strict(),
}).strict();

export const DirectorEmotionalBeatSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  label: short,
  emotion: short,
  visitorQuestion: medium,
  purpose: medium,
  intensity: score,
  informationDensity: score,
  interactionLevel: score,
  proofLevel: score,
  conversionWeight: score,
}).strict();

export const DirectorGrammarSchema = z.object({
  camera: directives,
  motion: directives,
  composition: directives,
  typography: directives,
  color: directives,
  materials: directives,
  lighting: directives,
  imagery: directives,
  interaction: directives,
  transitions: directives,
  sound: directives,
  spatial: directives,
  mobile: directives,
}).strict();

export const DirectorShotSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  chapterId: z.string().min(1).max(120),
  title: short,
  purpose: medium,
  subject: short,
  framing: medium,
  lensCharacter: medium,
  movement: medium,
  durationCharacter: short,
  emotion: short,
  copyRelationship: medium,
  transitionIn: medium,
  transitionOut: medium,
  reserveForSignatureMoment: z.boolean().default(false),
}).strict();

export const DirectorAssetAssessmentSchema = z.object({
  id: z.string().min(1).max(120),
  label: short,
  quality: DirectorAssetQualitySchema,
  creativeValue: score,
  productionDecision: DirectorProductionDecisionSchema,
  role: medium,
  reason: medium,
  improvementBrief: medium.optional(),
}).strict();

export const DirectorBudgetAllocationSchema = z.object({
  signatureMoment: z.number().min(0).max(100),
  opening: z.number().min(0).max(100),
  coreStory: z.number().min(0).max(100),
  assetCreation: z.number().min(0).max(100),
  artDirectionUi: z.number().min(0).max(100),
  supportingUtility: z.number().min(0).max(100),
}).strict();

export const DirectorCritiqueSchema = z.object({
  thesisClarity: score,
  signatureMomentStrength: score,
  pacingContrast: score,
  visualCoherence: score,
  brandSpecificity: score,
  interactionPurpose: score,
  mobileIntegrity: score,
  conversionIntegrity: score,
  originality: score,
  assetDiscipline: score,
  overall: score,
  blockers: directives,
  warnings: directives,
  cuts: directives,
  directives: directives,
}).strict();

export const DirectorTreatmentSchema = z.object({
  version: z.literal(1),
  projectName: short,
  projectType: DirectorProjectTypeSchema,
  tier: DirectorTierSchema,
  territories: z.array(DirectorTerritorySchema).min(3).max(3),
  selectedTerritoryId: z.string().min(1),
  thesis: medium,
  memoryStatement: medium,
  audience: medium,
  objective: medium,
  primaryAction: short,
  emotionalArc: z.array(DirectorEmotionalBeatSchema).min(5).max(16),
  signatureMoment: z.object({
    name: short,
    description: long,
    whyMemorable: medium,
    prerequisites: directives,
    protectFrom: directives,
  }).strict(),
  artBible: z.object({
    northStar: medium,
    world: long,
    typographyCharacter: long,
    photographyCharacter: long,
    paletteLogic: long,
    materialLogic: long,
    whitespace: long,
    uiChrome: long,
  }).strict(),
  grammar: DirectorGrammarSchema,
  shotBible: z.array(DirectorShotSchema).min(3).max(32),
  assets: z.array(DirectorAssetAssessmentSchema).max(100),
  budgetAllocation: DirectorBudgetAllocationSchema,
  noGoRules: directives,
  originalityRules: directives,
  conversionArc: directives,
  mobileInterpretation: directives,
  productionPriorities: directives,
  qualityBar: directives,
  critiqueQuestions: directives,
  critique: DirectorCritiqueSchema,
}).strict().superRefine((value, ctx) => {
  if (!value.territories.some((territory) => territory.id === value.selectedTerritoryId)) {
    ctx.addIssue({ code: "custom", path: ["selectedTerritoryId"], message: "Selected territory must exist in territories." });
  }
  const allocation = Object.values(value.budgetAllocation).reduce((total, current) => total + current, 0);
  if (Math.abs(allocation - 100) > 0.001) {
    ctx.addIssue({ code: "custom", path: ["budgetAllocation"], message: `Budget allocation must total 100; received ${allocation}.` });
  }
  const signatureBeats = value.emotionalArc.filter((beat) => beat.intensity >= 9);
  if (signatureBeats.length > 3) {
    ctx.addIssue({ code: "custom", path: ["emotionalArc"], message: "Director should reserve 9–10 intensity for no more than three beats." });
  }
});

export type DirectorBrief = z.infer<typeof DirectorBriefSchema>;
export type DirectorTerritory = z.infer<typeof DirectorTerritorySchema>;
export type DirectorTreatment = z.infer<typeof DirectorTreatmentSchema>;
export type DirectorCritique = z.infer<typeof DirectorCritiqueSchema>;

export function parseDirectorBrief(input: unknown): DirectorBrief {
  return DirectorBriefSchema.parse(input);
}

export function parseDirectorTreatment(input: unknown): DirectorTreatment {
  return DirectorTreatmentSchema.parse(input);
}
