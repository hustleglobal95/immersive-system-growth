import { z } from "zod";

const concise = z.string().min(1).max(500);
const directiveList = z.array(z.string().min(1).max(300)).max(32).default([]);

const sceneDirection = z.object({
  objective: concise.optional(),
  spatialStory: concise.optional(),
  composition: directiveList,
  camera: z.object({
    framing: directiveList,
    lens: directiveList,
    path: directiveList,
    speed: directiveList,
    focus: directiveList,
  }).strict().optional(),
  lighting: z.object({
    timeOfDay: directiveList,
    key: directiveList,
    fill: directiveList,
    practicals: directiveList,
    atmosphere: directiveList,
  }).strict().optional(),
  materials: directiveList,
  motion: z.object({
    subject: directiveList,
    environment: directiveList,
    assembly: directiveList,
    easing: directiveList,
    continuity: directiveList,
  }).strict().optional(),
  sound: directiveList,
  interactionNotes: directiveList,
  transitionNotes: directiveList,
  assetRequirements: directiveList,
  implementationNotes: directiveList,
  mobileNotes: directiveList,
  negativeDirectives: directiveList,
}).strict().optional();

const scene = z.object({
  id: z.string().min(1),
  purpose: z.string().min(1),
  subject: z.string().min(1),
  copy: z.string().min(1),
  interaction: z.string().min(1),
  transitionIn: z.string().min(1),
  transitionOut: z.string().min(1),
  direction: sceneDirection,
  // Runtime is validated more strictly by CreativePlanSchema, while this
  // base schema remains compatible with the creative audit command.
  runtime: z.unknown().optional(),
});

export const CreativeDirectionSchema = z.object({
  version: z.literal(1),
  conceptId: z.string().regex(/^[a-z0-9-]+$/),
  concept: z.string().min(1),
  audience: z.string().min(1),
  promise: z.string().min(1),
  emotionalArc: z.array(z.string().min(1)).min(3),
  cta: z.string().min(1),
  visual: z.object({
    palette: z.array(z.string()).min(1),
    typography: z.array(z.string()).min(1),
    materials: z.array(z.string()),
    motion: z.array(z.string()),
    sound: z.array(z.string()),
  }),
  artDirection: z.object({
    northStar: concise,
    hierarchy: directiveList,
    compositionRules: directiveList,
    cameraLanguage: directiveList,
    lightingLanguage: directiveList,
    materialLanguage: directiveList,
    motionLanguage: directiveList,
    transitionLanguage: directiveList,
    interactionLanguage: directiveList,
    soundLanguage: directiveList,
    spatialRules: directiveList,
    continuityRules: directiveList,
    realismRules: directiveList,
    assetRules: directiveList,
    typographyRules: directiveList,
    colorRules: directiveList,
    mobileRules: directiveList,
    performanceRules: directiveList,
    accessibilityRules: directiveList,
    forbiddenPatterns: directiveList,
  }).strict().optional(),
  constraints: z.object({
    approved: z.array(z.string()),
    prohibited: z.array(z.string()),
  }),
  scenes: z.array(scene).min(1),
  successEvent: z.string().min(1),
});

export type CreativeDirection = z.infer<typeof CreativeDirectionSchema>;

export function parseCreativeDirection(input: unknown): CreativeDirection {
  return CreativeDirectionSchema.parse(input);
}
