import { createMotionPreset } from "@/src/platform/motionPresets";
import { motionCurveCatalog, numberedNodeOrder, staggerSlots, staggerWindow } from "@/src/platform/motionLanguage";
import type { ExperienceConfig, MotionTrack, Vec3 } from "@/src/types/experience";

export const motionArchetypeCatalog = [
  { id: "editorial-reveal", label: "Editorial reveal", description: "Precision camera pressure with masked-copy style settle and restrained focus recovery." },
  { id: "parallax-story", label: "Parallax story", description: "Premium lateral camera separation with copy and media resolving on different depth beats." },
  { id: "threshold-passage", label: "Threshold passage", description: "Forward spatial commitment through a threshold with exposure, media and copy handoff." },
  { id: "architectural-build", label: "Architectural build", description: "Crane-led, reversible structural assembly ordered by semantic rig node groups." },
  { id: "product-hero", label: "Product hero", description: "Macro camera approach, object lift, light settle and restrained material polish." },
] as const;

export type MotionArchetypeName = (typeof motionArchetypeCatalog)[number]["id"];
const names = new Set<string>(motionArchetypeCatalog.map((entry) => entry.id));

export function isMotionArchetypeName(value: string): value is MotionArchetypeName {
  return names.has(value);
}

export function createMotionArchetype(
  name: MotionArchetypeName,
  config: ExperienceConfig,
  sceneIndex: number,
): MotionTrack[] {
  const scene = config.scenes[sceneIndex];
  if (name === "editorial-reveal") {
    return mergeByTarget([
      ...createMotionPreset("director-precision-push", config, sceneIndex),
      ...createMotionPreset("copy-rise", config, sceneIndex),
      numberTrack("editorial-copy-blur", "Editorial copy blur", "copy.blur", [
        key("editorial-copy-blur-a", 0, 14, "cubic", motionCurveCatalog.editorial.curve),
        key("editorial-copy-blur-b", 0.34, 0, "smooth"),
        key("editorial-copy-blur-c", 1, 0, "linear"),
      ]),
    ]);
  }

  if (name === "parallax-story") {
    const tracks: MotionTrack[] = [
      ...createMotionPreset("director-parallax-truck", config, sceneIndex),
      ...createMotionPreset("copy-rise", config, sceneIndex),
    ];
    if (scene.media) tracks.push(...createMotionPreset("media-reveal", config, sceneIndex));
    tracks.push(numberTrack("parallax-copy-blur", "Parallax copy depth", "copy.blur", [
      key("parallax-copy-blur-a", 0, 9, "cubic", motionCurveCatalog.glide.curve),
      key("parallax-copy-blur-b", 0.42, 0, "smooth"),
      key("parallax-copy-blur-c", 1, 0, "linear"),
    ]));
    return mergeByTarget(tracks);
  }

  if (name === "threshold-passage") {
    const exposure = scene.world.exposure;
    const tracks: MotionTrack[] = [
      ...createMotionPreset("director-precision-push", config, sceneIndex),
      numberTrack("threshold-exposure", "Threshold exposure", "world.exposure", [
        key("threshold-exposure-a", 0, exposure * 0.86, "smooth"),
        key("threshold-exposure-b", 0.46, exposure * 0.96, "cubic", motionCurveCatalog.cinematic.curve),
        key("threshold-exposure-c", 0.72, exposure, "cubic", motionCurveCatalog.editorial.curve),
        key("threshold-exposure-d", 1, exposure, "linear"),
      ]),
      ...createMotionPreset("copy-rise", config, sceneIndex),
    ];
    if (scene.media) tracks.push(...createMotionPreset("media-reveal", config, sceneIndex));
    return mergeByTarget(tracks);
  }

  if (name === "architectural-build") {
    const camera = createMotionPreset("director-crane-reveal", config, sceneIndex);
    const nodes = config.productRig?.nodes ?? [];
    if (!nodes.length) return camera;
    return [...camera, ...architecturalAssemblyTracks(nodes)];
  }

  return mergeByTarget([
    ...createMotionPreset("director-macro-approach", config, sceneIndex),
    ...createMotionPreset("product-lift", config, sceneIndex),
    ...createMotionPreset("light-pulse", config, sceneIndex),
    numberTrack("product-roughness-settle", "Material roughness settle", "material.roughness", [
      key("product-roughness-a", 0, Math.min(1, scene.material.roughness + 0.16), "smooth"),
      key("product-roughness-b", 0.58, scene.material.roughness, "cubic", motionCurveCatalog.editorial.curve),
      key("product-roughness-c", 1, scene.material.roughness, "linear"),
    ]),
    ...createMotionPreset("copy-rise", config, sceneIndex),
  ]);
}

function architecturalAssemblyTracks(nodes: string[]): MotionTrack[] {
  const groups = [
    { pattern: /(foundation|footing|podium|base)/i, start: 0.04, end: 0.16, offset: -0.35, duration: 0.16 },
    { pattern: /(core|column|structure|frame)/i, start: 0.12, end: 0.34, offset: -0.55, duration: 0.18 },
    { pattern: /(floor|slab|level|story|storey)/i, start: 0.2, end: 0.58, offset: -0.72, duration: 0.16 },
    { pattern: /(facade|façade|glass|curtain|skin|window)/i, start: 0.38, end: 0.72, offset: -0.28, duration: 0.18 },
    { pattern: /(balcony|terrace|fin|detail)/i, start: 0.58, end: 0.8, offset: -0.18, duration: 0.14 },
    { pattern: /(roof|crown|mechanical|penthouse)/i, start: 0.72, end: 0.86, offset: -0.24, duration: 0.14 },
    { pattern: /(landscape|tree|plant|pool|furniture|site)/i, start: 0.8, end: 0.94, offset: -0.12, duration: 0.12 },
  ];
  const claimed = new Set<string>();
  const result: MotionTrack[] = [];

  groups.forEach((group) => {
    const matching = numberedNodeOrder(nodes.filter((node) => !claimed.has(node) && group.pattern.test(node)));
    matching.forEach((node) => claimed.add(node));
    const slots = staggerSlots(matching.length, "forward");
    matching.forEach((node, index) => {
      const window = staggerWindow(slots[index], group.start, group.end, group.duration);
      result.push(...assemblyPair(node, window.start, window.end, group.offset));
    });
  });

  const remaining = numberedNodeOrder(nodes.filter((node) => !claimed.has(node)));
  const slots = staggerSlots(remaining.length, "forward");
  remaining.forEach((node, index) => {
    const window = staggerWindow(slots[index], 0.42, 0.84, 0.16);
    result.push(...assemblyPair(node, window.start, window.end, -0.24));
  });
  return result;
}

function assemblyPair(node: string, start: number, end: number, yOffset: number): MotionTrack[] {
  const id = slug(node);
  return [
    vectorTrack(`build-${id}-position`, `${node} build position`, `rig:${node}:position`, [
      key(`build-${id}-position-a`, 0, [0, yOffset, 0] as Vec3, "linear"),
      key(`build-${id}-position-b`, start, [0, yOffset, 0] as Vec3, "linear"),
      key(`build-${id}-position-c`, end, [0, 0, 0] as Vec3, "cubic", motionCurveCatalog.mechanical.curve),
      key(`build-${id}-position-d`, 1, [0, 0, 0] as Vec3, "linear"),
    ], "offset"),
    numberTrack(`build-${id}-opacity`, `${node} build opacity`, `rig:${node}:opacity`, [
      key(`build-${id}-opacity-a`, 0, 0, "linear"),
      key(`build-${id}-opacity-b`, start, 0, "linear"),
      key(`build-${id}-opacity-c`, Math.min(end, start + (end - start) * 0.72), 1, "cubic", motionCurveCatalog.editorial.curve),
      key(`build-${id}-opacity-d`, 1, 1, "linear"),
    ]),
  ];
}

function mergeByTarget(tracks: MotionTrack[]): MotionTrack[] {
  const seen = new Set<string>();
  const result: MotionTrack[] = [];
  for (const track of [...tracks].reverse()) {
    const key = `${track.viewport}:${track.target}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.unshift(track);
  }
  return result;
}

function numberTrack(
  id: string,
  label: string,
  target: Extract<MotionTrack, { type: "number" }>["target"],
  keyframes: Extract<MotionTrack, { type: "number" }>["keyframes"],
): MotionTrack {
  return { id, label, type: "number", target, blend: "absolute", viewport: "all", muted: false, locked: false, keyframes };
}

function vectorTrack(
  id: string,
  label: string,
  target: Extract<MotionTrack, { type: "vector" }>["target"],
  keyframes: Extract<MotionTrack, { type: "vector" }>["keyframes"],
  blend: "absolute" | "offset" = "absolute",
): MotionTrack {
  return { id, label, type: "vector", target, blend, viewport: "all", muted: false, locked: false, keyframes };
}

function key<T>(
  id: string,
  at: number,
  value: T,
  easing: MotionTrack["keyframes"][number]["easing"],
  curve?: [number, number, number, number],
) {
  return { id, at, value, easing, ...(curve ? { curve } : {}) };
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "motion";
}
