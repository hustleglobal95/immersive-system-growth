import { z } from "zod";

const finite = z.number().finite();
const id = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const vec3 = z.tuple([finite, finite, finite]);

export const visualSystemSchema = z
  .object({
    id,
    label: z.string().min(1).max(100),
    kind: z.enum([
      "instanced-field",
      "particle-field",
      "terrain-flow",
      "globe-data",
      "portal",
    ]),
    enabled: z.boolean().default(true),
    seed: z.number().int().min(0).max(2147483647).default(1),
    instanceCount: z.number().int().min(1).max(2048).default(64),
    spread: vec3,
    size: finite.min(0.001).max(10),
    color: hexColor,
    accent: hexColor,
    motion: finite.min(0).max(4).default(1),
    fallback: z.enum(["static", "dom", "hidden"]).default("static"),
    reducedMotion: z.enum(["freeze", "static", "hide"]).default("freeze"),
  })
  .strict();

export const visualSystemsManifestSchema = z
  .object({
    version: z.literal(1),
    systems: z.array(visualSystemSchema).max(24),
  })
  .strict()
  .superRefine((manifest, ctx) => {
    const ids = new Set<string>();
    manifest.systems.forEach((system, index) => {
      if (ids.has(system.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["systems", index, "id"],
          message: "Duplicate visual system ID",
        });
      }
      ids.add(system.id);
      if (system.kind === "instanced-field" && system.instanceCount > 1024) {
        ctx.addIssue({
          code: "custom",
          path: ["systems", index, "instanceCount"],
          message: "Instanced fields are capped at 1024 instances per system",
        });
      }
    });
  });

export type VisualSystemDefinition = z.infer<typeof visualSystemSchema>;
export type VisualSystemsManifest = z.infer<typeof visualSystemsManifestSchema>;
export type VisualQuality = "low" | "medium" | "high";
export type Vec3 = [number, number, number];

export function parseVisualSystems(input: unknown): VisualSystemsManifest {
  return visualSystemsManifestSchema.parse(input);
}

const qualityMultipliers: Record<VisualQuality, number> = {
  low: 0.2,
  medium: 0.55,
  high: 1,
};

export function qualityInstanceCount(
  system: VisualSystemDefinition,
  quality: VisualQuality,
): number {
  return Math.max(
    1,
    Math.min(
      system.instanceCount,
      Math.round(system.instanceCount * qualityMultipliers[quality]),
    ),
  );
}

function seededUnit(seed: number, index: number, channel: number): number {
  const value = Math.sin(seed * 12.9898 + index * 78.233 + channel * 37.719) * 43758.5453;
  return value - Math.floor(value);
}

export interface InstancedFieldSample {
  position: Vec3;
  rotation: Vec3;
  scale: number;
  phase: number;
}

export function sampleInstancedField(
  system: VisualSystemDefinition,
  count = system.instanceCount,
): InstancedFieldSample[] {
  const safeCount = Math.max(0, Math.min(system.instanceCount, Math.floor(count)));
  return Array.from({ length: safeCount }, (_, index) => {
    const position: Vec3 = [
      (seededUnit(system.seed, index, 0) * 2 - 1) * system.spread[0],
      (seededUnit(system.seed, index, 1) * 2 - 1) * system.spread[1],
      (seededUnit(system.seed, index, 2) * 2 - 1) * system.spread[2],
    ];
    return {
      position,
      rotation: [
        seededUnit(system.seed, index, 3) * Math.PI,
        seededUnit(system.seed, index, 4) * Math.PI,
        seededUnit(system.seed, index, 5) * Math.PI,
      ],
      scale: 0.55 + seededUnit(system.seed, index, 6) * 0.9,
      phase: seededUnit(system.seed, index, 7) * Math.PI * 2,
    };
  });
}

export function visualSystemMode(
  system: VisualSystemDefinition,
  quality: VisualQuality,
  reducedMotion: boolean,
): "dynamic" | "static" | "hidden" {
  if (!system.enabled || system.fallback === "hidden") return "hidden";
  if (reducedMotion && system.reducedMotion === "hide") return "hidden";
  if (reducedMotion || quality === "low") return "static";
  return "dynamic";
}
