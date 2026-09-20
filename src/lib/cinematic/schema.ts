import { z } from "zod";

const finite = z.number().finite();
const id = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const color = z.string().regex(/^#(?:[\da-f]{3}|[\da-f]{6})$/i);
const assetUrl = z.string().refine((value) => /^\/(?!\/)[^\s?#]*$/.test(value) || /^https:\/\/[^\s]+$/.test(value), "Use a root-relative path or HTTPS URL");
const range = z.tuple([finite.min(0).max(1), finite.min(0).max(1)]).refine(([start, end]) => end > start, "Range must increase");

export const springSchema = z.object({
  mass: finite.min(0.05).max(20).default(1),
  stiffness: finite.min(1).max(1000).default(180),
  damping: finite.min(0).max(150).default(24),
  precision: finite.min(0.00001).max(0.1).default(0.001),
  maxStep: finite.min(1 / 240).max(0.1).default(1 / 30),
}).strict();

export const pointerSchema = z.object({
  trailLength: z.number().int().min(0).max(64).default(24),
  smoothing: finite.min(0).max(1).default(0.18),
  velocityClamp: finite.min(0.1).max(20).default(4),
  dwellMs: z.number().int().min(0).max(5000).default(350),
}).strict();

export const stackSchema = z.object({
  enabled: z.boolean().default(true),
  scaleTo: finite.min(0.65).max(1).default(0.9),
  darkenTo: finite.min(0).max(0.9).default(0.55),
  depth: finite.min(0).max(240).default(80),
  overlap: finite.min(0).max(0.75).default(0.22),
  pin: z.boolean().default(true),
}).strict();

export const revealSchema = z.object({
  effect: z.enum(["liquid", "contour", "burn", "radial", "directional", "particle", "wireframe"]),
  direction: z.enum(["left", "right", "up", "down"]).default("right"),
  softness: finite.min(0).max(1).default(0.14),
  intensity: finite.min(0).max(3).default(1),
  pointerInfluence: finite.min(0).max(2).default(0),
  trailInfluence: finite.min(0).max(2).default(0),
  edgeColor: color.default("#f97316"),
  edgeWidth: finite.min(0).max(0.2).default(0.015),
  seed: z.number().int().min(0).max(999999).default(47),
  range: range.default([0, 1]),
}).strict();

export const cursorRevealSchema = z.object({
  src: assetUrl,
  mode: z.enum(["lens", "trail", "fluid"]).default("trail"),
  renderer: z.enum(["auto", "gpu", "canvas"]).default("auto"),
  brushSize: finite.min(0.01).max(0.5).default(0.14),
  brushStrength: finite.min(0).max(3).default(1),
  softness: finite.min(0.001).max(1).default(0.2),
  motionStrength: finite.min(0).max(4).default(1),
  lingerMs: z.number().int().min(0).max(10000).default(260),
  fadeSeconds: finite.min(0.05).max(20).default(1.2),
  trailPersistence: finite.min(0).max(1).default(0.82),
  touch: z.enum(["disabled", "drag", "always"]).default("drag"),
  fit: z.enum(["cover", "contain"]).default("cover"),
  position: z.tuple([finite.min(0).max(100), finite.min(0).max(100)]).default([50, 50]),
  fluidResolution: z.number().int().min(64).max(512).default(192),
  velocityDissipation: finite.min(0.8).max(1).default(0.985),
  dyeDissipation: finite.min(0.8).max(1).default(0.992),
  pressureIterations: z.number().int().min(1).max(40).default(12),
  curl: finite.min(0).max(50).default(18),
  splatForce: finite.min(0).max(12).default(4),
}).strict();

export const warpSchema = z.object({
  mode: z.enum(["elastic", "cloth", "water", "heat", "shockwave"]).default("elastic"),
  strength: finite.min(0).max(2.5).default(0.38),
  radius: finite.min(0.02).max(1).default(0.3),
  falloff: finite.min(0.1).max(8).default(2),
  pointerInfluence: finite.min(0).max(3).default(1),
  velocityInfluence: finite.min(0).max(3).default(0.65),
  scrollInfluence: finite.min(0).max(3).default(0.25),
  frequency: finite.min(0.1).max(30).default(8),
}).strict();

export const refractionSchema = z.object({
  mode: z.enum(["lens", "panel", "liquid"]).default("lens"),
  strength: finite.min(0).max(2).default(0.28),
  radius: finite.min(0.03).max(1.5).default(0.34),
  dispersion: finite.min(0).max(0.08).default(0.008),
  edgeRefraction: finite.min(0).max(2).default(0.45),
  sheen: finite.min(0).max(2).default(0.22),
  ripple: finite.min(0).max(2).default(0.2),
  pointerInfluence: finite.min(0).max(3).default(1),
  center: z.tuple([finite.min(0).max(100), finite.min(0).max(100)]).default([50, 50]),
}).strict();

export const sceneTransitionSchema = z.object({
  effect: z.enum(["ripple", "liquid", "noise", "pixel", "chromatic", "directional", "iris", "slats", "grain", "depth"]).default("liquid"),
  src: assetUrl.optional(),
  range: range.default([0.72, 1]),
  direction: z.enum(["left", "right", "up", "down"]).default("right"),
  softness: finite.min(0.001).max(0.5).default(0.08),
  intensity: finite.min(0).max(3).default(1),
  displacement: finite.min(0).max(0.25).default(0.045),
  chromaticAberration: finite.min(0).max(0.08).default(0.008),
  blockSize: z.number().int().min(2).max(128).default(24),
  slats: z.number().int().min(2).max(64).default(12),
  seed: z.number().int().min(0).max(999999).default(47),
}).strict();

const spatialPlaneSchema = z.object({
  id,
  src: assetUrl,
  depth: finite.min(-2).max(2),
  scale: finite.min(0.25).max(4).default(1),
  opacity: finite.min(0).max(1).default(1),
}).strict();

export const spatialSchema = z.object({
  mode: z.enum(["depth", "planes", "relight", "depth-relight"]),
  depthMap: assetUrl.optional(),
  normalMap: assetUrl.optional(),
  planes: z.array(spatialPlaneSchema).max(12).default([]),
  pointerResponse: finite.min(0).max(2).default(0.18),
  scrollResponse: finite.min(0).max(2).default(0.12),
  depthStrength: finite.min(0).max(120).default(28),
  relightStrength: finite.min(0).max(2).default(0.5),
  focus: finite.min(0).max(1).default(0.5),
}).strict().superRefine((value, ctx) => {
  if ((value.mode === "depth" || value.mode === "depth-relight") && !value.depthMap) ctx.addIssue({ code: "custom", path: ["depthMap"], message: "Depth modes require depthMap" });
  if ((value.mode === "relight" || value.mode === "depth-relight") && !value.normalMap) ctx.addIssue({ code: "custom", path: ["normalMap"], message: "Relight modes require normalMap" });
  if (value.mode === "planes" && value.planes.length < 2) ctx.addIssue({ code: "custom", path: ["planes"], message: "Plane mode requires at least two planes" });
});

const proceduralBase = {
  id,
  opacity: finite.min(0).max(1).default(1),
  color: color.default("#ffffff"),
  range: range.default([0, 1]),
  blendMode: z.enum(["normal", "screen", "multiply", "overlay"]).default("normal"),
  interactive: z.boolean().default(false),
  seed: z.number().int().min(0).max(999999).default(47),
};

export const proceduralSchema = z.discriminatedUnion("kind", [
  z.object({ ...proceduralBase, kind: z.literal("contours"), count: z.number().int().min(2).max(120).default(24), amplitude: finite.min(0).max(2).default(0.25), frequency: finite.min(0.1).max(12).default(2.2) }).strict(),
  z.object({ ...proceduralBase, kind: z.literal("halftone"), count: z.number().int().min(64).max(20000).default(8004), radius: finite.min(0.1).max(12).default(1.4), response: finite.min(0).max(3).default(1) }).strict(),
  z.object({ ...proceduralBase, kind: z.literal("line-trace"), points: z.array(z.tuple([finite.min(0).max(1), finite.min(0).max(1)])).min(2).max(256), duration: finite.min(0.1).max(30).default(6) }).strict(),
  z.object({ ...proceduralBase, kind: z.literal("grid"), columns: z.number().int().min(2).max(100).default(12), rows: z.number().int().min(2).max(100).default(12), distortion: finite.min(0).max(2).default(0.1) }).strict(),
]);

export const occlusionLayerSchema = z.object({
  id,
  kind: z.enum(["image", "gradient", "shadow", "blur"]),
  src: assetUrl.optional(),
  range: range.default([0, 1]),
  axis: z.enum(["x", "y"]).default("x"),
  from: finite.min(-200).max(200).default(100),
  to: finite.min(-200).max(200).default(-100),
  blur: finite.min(0).max(80).default(0),
  opacity: finite.min(0).max(1).default(1),
  depth: finite.min(-4).max(4).default(1),
}).strict().superRefine((value, ctx) => {
  if (value.kind === "image" && !value.src) ctx.addIssue({ code: "custom", path: ["src"], message: "Image occluders require src" });
});

const diagramPoint = z.object({ id, x: finite.min(0).max(1), y: finite.min(0).max(1), label: z.string().max(80).optional(), value: z.string().max(80).optional() }).strict();
const diagramEdge = z.object({ from: id, to: id, label: z.string().max(80).optional() }).strict();

export const diagramSchema = z.object({
  kind: z.enum(["floor-plan", "route", "timeline", "schematic"]),
  points: z.array(diagramPoint).min(2).max(128),
  edges: z.array(diagramEdge).max(256).default([]),
  stroke: color.default("#ffffff"),
  accent: color.default("#f97316"),
  lineWidth: finite.min(0.25).max(12).default(1.25),
  drawRange: range.default([0, 1]),
  labels: z.boolean().default(true),
  interactive: z.boolean().default(false),
}).strict().superRefine((value, ctx) => {
  const ids = new Set(value.points.map((point) => point.id));
  value.edges.forEach((edge, index) => {
    if (!ids.has(edge.from) || !ids.has(edge.to)) ctx.addIssue({ code: "custom", path: ["edges", index], message: "Diagram edge references an unknown point" });
  });
});

export const cinematicSceneSchema = z.object({
  id,
  stack: stackSchema.optional(),
  spring: springSchema.optional(),
  reveal: revealSchema.optional(),
  cursorReveal: cursorRevealSchema.optional(),
  warp: warpSchema.optional(),
  refraction: refractionSchema.optional(),
  sceneTransition: sceneTransitionSchema.optional(),
  spatial: spatialSchema.optional(),
  procedural: z.array(proceduralSchema).max(12).default([]),
  occlusion: z.array(occlusionLayerSchema).max(12).default([]),
  diagram: diagramSchema.optional(),
}).strict();

const defaultSpring = { mass: 1, stiffness: 180, damping: 24, precision: 0.001, maxStep: 1 / 30 };
const defaultPointer = { trailLength: 24, smoothing: 0.18, velocityClamp: 4, dwellMs: 350 };

export const cinematicSystemsSchema = z.object({
  version: z.literal(1),
  defaults: z.object({
    spring: springSchema.default(defaultSpring),
    pointer: pointerSchema.default(defaultPointer),
    reducedMotion: z.enum(["static", "minimal"]).default("minimal"),
  }).strict(),
  scenes: z.array(cinematicSceneSchema).max(30).default([]),
}).strict().superRefine((value, ctx) => {
  const ids = new Set<string>();
  value.scenes.forEach((scene, index) => {
    if (ids.has(scene.id)) ctx.addIssue({ code: "custom", path: ["scenes", index, "id"], message: "Cinematic scene IDs must be unique" });
    ids.add(scene.id);
  });
});

export type CinematicSystemsManifest = z.infer<typeof cinematicSystemsSchema>;
export type CinematicSceneConfig = z.infer<typeof cinematicSceneSchema>;
export type SpringConfig = z.infer<typeof springSchema>;
export type StackConfig = z.infer<typeof stackSchema>;
export type RevealConfig = z.infer<typeof revealSchema>;
export type CursorRevealConfig = z.infer<typeof cursorRevealSchema>;
export type WarpConfig = z.infer<typeof warpSchema>;
export type RefractionConfig = z.infer<typeof refractionSchema>;
export type SceneTransitionConfig = z.infer<typeof sceneTransitionSchema>;
export type SpatialConfig = z.infer<typeof spatialSchema>;
export type ProceduralConfig = z.infer<typeof proceduralSchema>;
export type OcclusionLayerConfig = z.infer<typeof occlusionLayerSchema>;
export type DiagramConfig = z.infer<typeof diagramSchema>;

export function parseCinematicSystems(input: unknown): CinematicSystemsManifest {
  return cinematicSystemsSchema.parse(input);
}
