import rawPresetPack from "../../config/presets.json";
import { maskRevealSchema, parseExperience } from "@/src/lib/configSchema";
import { createMotionPreset, type MotionPresetName } from "@/src/platform/motionPresets";
import type { ExperienceConfig, MotionTrack } from "@/src/types/experience";
import { z } from "zod";

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const motionPresetName = z.enum(["camera-drift", "product-lift", "light-pulse", "copy-rise", "media-reveal", "mobile-closeup", "cinematic-focus", "rig-cascade"]);
const transitionPresetSchema = z.object({
  transition: z.enum(["slide", "curtain", "zoom", "dissolve", "wipe", "mask"]),
  direction: z.enum(["up", "down"]).optional(),
  maskPreset: z.enum(["linear-soft", "radial-iris", "diagonal-cut", "split-center", "pixel-grid", "noise-dissolve", "ink-spread", "film-burn"]).optional(),
  maskDirection: z.enum(["left", "right", "up", "down"]).optional(),
  maskSoftness: z.number().finite().min(0).max(100).optional(),
  blendColor: z.string().regex(/^#(?:[\\da-f]{3}|[\\da-f]{6})$/i).optional(),
}).strict();

export const forgePresetSchema = z.object({
  id: slug,
  revision: z.number().int().positive().max(1000).default(1),
  kind: z.enum(["motion", "transition"]),
  label: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  tags: z.array(slug).max(16).default([]),
  motionPreset: motionPresetName.optional(),
  transition: transitionPresetSchema.optional(),
}).strict().superRefine((preset, ctx) => {
  if (preset.kind === "motion" && !preset.motionPreset) {
    ctx.addIssue({ code: "custom", path: ["motionPreset"], message: "Motion presets require a motionPreset implementation" });
  }
  if (preset.kind === "transition" && !preset.transition) {
    ctx.addIssue({ code: "custom", path: ["transition"], message: "Transition presets require transition settings" });
  }
});

export const presetPackSchema = z.object({
  version: z.literal(1),
  presets: z.array(forgePresetSchema).max(200),
}).strict().superRefine((pack, ctx) => {
  const ids = new Set<string>();
  pack.presets.forEach((preset, index) => {
    if (ids.has(preset.id)) ctx.addIssue({ code: "custom", path: ["presets", index, "id"], message: "Preset IDs must be unique" });
    ids.add(preset.id);
  });
});

export type ForgePreset = z.infer<typeof forgePresetSchema>;
export type PresetPack = z.infer<typeof presetPackSchema>;
export const presetPack = presetPackSchema.parse(rawPresetPack);
export const presetCatalog = presetPack.presets;

export function parsePresetPack(input: unknown): PresetPack {
  return presetPackSchema.parse(input);
}

export function getForgePreset(id: string): ForgePreset {
  const preset = presetCatalog.find((candidate) => candidate.id === id);
  if (!preset) throw new Error(`Unknown Forge preset: ${id}`);
  return preset;
}

function namespaceTrack(track: MotionTrack, presetId: string, index: number): MotionTrack {
  const id = `${presetId}-${track.id}-${index + 1}`;
  return {
    ...track,
    id,
    keyframes: track.keyframes.map((keyframe, keyframeIndex) => ({
      ...keyframe,
      id: `${id}-${keyframeIndex + 1}`,
    })),
  } as MotionTrack;
}

export function applyForgePreset(config: ExperienceConfig, sceneIndex: number, presetId: string): ExperienceConfig {
  const preset = getForgePreset(presetId);
  const scene = config.scenes[sceneIndex];
  if (!scene) throw new Error(`Scene index is out of range: ${sceneIndex}`);
  const next = structuredClone(config);

  if (preset.kind === "motion") {
    const motionPreset = preset.motionPreset as MotionPresetName;
    const tracks = createMotionPreset(motionPreset, config, sceneIndex).map((track, index) => namespaceTrack(track, preset.id, index));
    const prefix = `${preset.id}-`;
    next.scenes[sceneIndex].motionTracks = [
      ...next.scenes[sceneIndex].motionTracks.filter((track) => !track.id.startsWith(prefix)),
      ...tracks,
    ];
    return parseExperience(next);
  }

  const media = next.scenes[sceneIndex].media;
  if (!media) throw new Error(`Preset ${preset.id} requires scene media`);
  const transition = preset.transition;
  if (!transition) throw new Error(`Preset ${preset.id} has no transition settings`);
  media.transition = transition.transition;
  if (transition.direction) media.direction = transition.direction;
  if (transition.blendColor) media.blendColor = transition.blendColor;
  if (transition.maskPreset || transition.maskDirection || transition.maskSoftness !== undefined) {
    media.mask = maskRevealSchema.parse({
      ...(media.mask ?? {}),
      ...(transition.maskPreset ? { preset: transition.maskPreset } : {}),
      ...(transition.maskDirection ? { direction: transition.maskDirection } : {}),
      ...(transition.maskSoftness !== undefined ? { softness: transition.maskSoftness } : {}),
    });
  }
  return parseExperience(next);
}