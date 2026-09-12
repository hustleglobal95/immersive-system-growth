import { z } from "zod";
import { CreativeDirectionSchema } from "@/src/platform/creativeDirectionSchema";
import { interactionEventTypeSchema } from "@/src/lib/interactionGraph";

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const motionPreset = z.enum(["camera-drift","product-lift","light-pulse","copy-rise","media-reveal","mobile-closeup","cinematic-focus","rig-cascade"]);

const runtimeSchema = z.object({
  sceneId: slug.optional(),
  motionPreset: motionPreset.default("cinematic-focus"),
  trigger: z.object({
    event: interactionEventTypeSchema,
    target: z.string().min(1).max(160).optional(),
    name: z.string().min(1).max(120).optional(),
    sceneId: slug.optional(),
    states: z.array(slug).max(24).default([]),
  }).strict().optional(),
  actions: z.array(z.unknown()).max(8).default([]),
}).strict().default({});

const planSceneSchema = z.object({
  id: z.string().min(1),
  purpose: z.string().min(1),
  subject: z.string().min(1),
  copy: z.string().min(1),
  interaction: z.string().min(1),
  transitionIn: z.string().min(1),
  transitionOut: z.string().min(1),
  runtime: runtimeSchema,
}).strict();

export const CreativePlanSchema = CreativeDirectionSchema.omit({ scenes: true }).extend({
  scenes: z.array(planSceneSchema).min(1),
});

export type CreativePlan = z.infer<typeof CreativePlanSchema>;
export type CreativePlanScene = CreativePlan["scenes"][number];
export type CreativeMotionPreset = z.infer<typeof motionPreset>;

export function parseCreativePlan(input: unknown): CreativePlan {
  return CreativePlanSchema.parse(input);
}
