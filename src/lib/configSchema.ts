import { z } from "zod";

const finite = z.number().finite();
const vec3 = z.tuple([finite, finite, finite]);
const id = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const color = z.string().regex(/^#(?:[\da-f]{3}|[\da-f]{6})$/i);
export const assetUrl = z
  .string()
  .refine(
    (s) => /^\/(?!\/)[^\s?#]*$/.test(s) || /^https:\/\/[^\s]+$/.test(s),
    "Use a root-relative path or HTTPS URL",
  );
const linkUrl = z
  .string()
  .refine(
    (s) =>
      /^(?:\/(?!\/)|#[a-z]|https:\/\/|mailto:)/i.test(s) && !/[\s<>]/.test(s),
    "Unsafe or unsupported link URL",
  );
export const cameraStateSchema = z
  .object({ position: vec3, target: vec3, fov: finite.min(15).max(90) })
  .strict()
  .refine(
    (s) => Math.hypot(...s.position.map((v, i) => v - s.target[i])) > 0.001,
    "Camera position and target must differ",
  );
export const cameraSchema = z
  .object({
    path: z.enum([
      "linear",
      "dolly",
      "arc",
      "orbit",
      "crane",
      "threshold",
      "flyby",
      "swoop",
      "macro",
      "pullback",
      "subject-orbit",
    ]),
    waypoints: z.array(vec3).max(32).optional(),
    targetWaypoints: z.array(vec3).max(32).optional(),
    from: cameraStateSchema,
    to: cameraStateSchema,
  })
  .strict();
const objectState = z
  .object({ position: vec3, rotation: vec3, scale: finite.positive().max(100) })
  .strict();
const trackEasing = z.enum(["linear", "smooth", "cinematic"]);
const vecKeyframes = z
  .array(
    z.object({ at: finite.min(0).max(1), value: vec3, easing: trackEasing.optional() }).strict(),
  )
  .min(2)
  .max(40)
  .refine((frames) => frames.every((frame, index) => !index || frame.at > frames[index - 1].at), "Keyframes must be strictly ordered");
const scalarKeyframes = z
  .array(
    z.object({ at: finite.min(0).max(1), value: finite.min(0).max(1), easing: trackEasing.optional() }).strict(),
  )
  .min(2)
  .max(40)
  .refine((frames) => frames.every((frame, index) => !index || frame.at > frames[index - 1].at), "Keyframes must be strictly ordered");
const booleanKeyframes = z
  .array(z.object({ at: finite.min(0).max(1), value: z.boolean() }).strict())
  .min(1)
  .max(40)
  .refine((frames) => frames.every((frame, index) => !index || frame.at > frames[index - 1].at), "Keyframes must be strictly ordered");
const transformTrack = z
  .object({
    node: z.string().min(1).max(120),
    property: z.enum(["position", "rotation", "scale"]),
    mode: z.enum(["offset", "absolute"]).default("offset"),
    keyframes: vecKeyframes,
  })
  .strict();
const opacityTrack = z
  .object({
    node: z.string().min(1).max(120),
    property: z.literal("opacity"),
    keyframes: scalarKeyframes,
  })
  .strict();
const visibilityTrack = z
  .object({
    node: z.string().min(1).max(120),
    property: z.literal("visible"),
    keyframes: booleanKeyframes,
  })
  .strict();
const rigMappingSchema = z
  .object({
    id,
    node: z.string().min(1).max(120),
    path: z.string().min(1).max(240),
    role: z.enum(["primary", "component", "accent", "animated"]),
    confidence: finite.min(0).max(1),
    required: z.boolean().default(false),
  })
  .strict();
export const productRigSchema = z
  .object({
    nodes: z.array(z.string().min(1).max(120)).min(1).max(100),
    mapping: z.array(rigMappingSchema).max(100).default([]),
    tracks: z.array(z.union([transformTrack, opacityTrack, visibilityTrack])).min(1).max(300),
  })
  .strict()
  .superRefine((rig, ctx) => {
    const nodes = new Set(rig.nodes);
    if (nodes.size !== rig.nodes.length)
      ctx.addIssue({ code: "custom", path: ["nodes"], message: "Product rig node names must be unique" });
    const mappingIds = new Set<string>();
    const mappingPaths = new Set<string>();
    rig.mapping.forEach((mapping, index) => {
      if (!nodes.has(mapping.node))
        ctx.addIssue({ code: "custom", path: ["mapping", index, "node"], message: "Mapping node is not declared by this rig" });
      if (mappingIds.has(mapping.id))
        ctx.addIssue({ code: "custom", path: ["mapping", index, "id"], message: "Mapping IDs must be unique" });
      if (mappingPaths.has(mapping.path))
        ctx.addIssue({ code: "custom", path: ["mapping", index, "path"], message: "Mapping paths must be unique" });
      mappingIds.add(mapping.id);
      mappingPaths.add(mapping.path);
    });
    const keys = new Set<string>();
    rig.tracks.forEach((track, index) => {
      if (!nodes.has(track.node))
        ctx.addIssue({ code: "custom", path: ["tracks", index, "node"], message: "Track node is not declared by this rig" });
      const key = track.node + ":" + track.property;
      if (keys.has(key))
        ctx.addIssue({ code: "custom", path: ["tracks", index], message: "Duplicate node property track" });
      keys.add(key);
    });
  });
const sceneBlockSchema = z.discriminatedUnion("type", [
  z.object({
    id,
    type: z.literal("statement"),
    title: z.string().min(1).max(160),
    body: z.string().max(500).optional(),
    accent: z.string().max(80).optional(),
  }).strict(),
  z.object({
    id,
    type: z.literal("brand-band"),
    text: z.string().min(1).max(120),
    repeats: finite.int().min(1).max(8).default(3),
  }).strict(),
  z.object({
    id,
    type: z.literal("menu-grid"),
    title: z.string().min(1).max(100),
    items: z.array(z.object({
      name: z.string().min(1).max(80),
      description: z.string().min(1).max(220),
      price: z.string().min(1).max(24),
      badge: z.string().max(40).optional(),
      // A square plate beside an index row. Optional, so existing indexes stay valid.
      thumb: assetUrl.optional(),
    }).strict()).min(2).max(8),
  }).strict(),
  z.object({
    id,
    type: z.literal("image-roll"),
    // A drifting rank of small square plates, carried across the section by scroll. Decorative
    // by definition, so it never holds primary copy or an action.
    images: z.array(z.object({
      src: assetUrl,
      alt: z.string().min(1).max(200),
    }).strict()).min(3).max(10),
    direction: z.enum(["left", "right"]).default("left"),
    travel: finite.min(4).max(180).default(90),
    lift: finite.min(0).max(14).default(5),
    curve: finite.min(0).max(1).default(1),
    sweep: finite.min(0.1).max(0.56).default(0.32),
  }).strict(),
  z.object({
    id,
    type: z.literal("order-card"),
    title: z.string().min(1).max(100),
    items: z.array(z.object({ label: z.string().min(1).max(80), value: z.string().min(1).max(40) }).strict()).min(1).max(8),
    total: z.string().min(1).max(40),
    cta: z.object({ label: z.string().min(1).max(80), href: linkUrl }).strict(),
  }).strict(),
]);
const assetBase = {
  id,
  position: vec3.default([0, 0, 0]),
  rotation: vec3.default([0, 0, 0]),
  scale: finite.positive().max(100).default(1),
  scenes: z.array(id).min(1).optional(),
  persist: z.boolean().default(false),
};
const modelAsset = z
  .object({
    ...assetBase,
    kind: z.literal("model"),
    url: assetUrl,
    lowUrl: assetUrl.optional(),
    animation: z
      .object({ sceneId: id, clip: z.string().min(1) })
      .strict()
      .optional(),
  })
  .strict();
const imageAsset = z
  .object({ ...assetBase, kind: z.literal("image"), url: assetUrl })
  .strict();
const videoAsset = z
  .object({
    ...assetBase,
    kind: z.literal("video"),
    url: assetUrl,
    sceneId: id.optional(),
  })
  .strict();
const panoramaAsset = z
  .object({ ...assetBase, kind: z.literal("panorama"), url: assetUrl })
  .strict();
const environmentAsset = z
  .object({ ...assetBase, kind: z.literal("environment"), url: assetUrl })
  .strict();
export const sceneAssetSchema = z.discriminatedUnion("kind", [
  modelAsset,
  imageAsset,
  videoAsset,
  panoramaAsset,
  environmentAsset,
]);
export const maskPresetSchema = z.enum([
  "linear-soft",
  "radial-iris",
  "diagonal-cut",
  "split-center",
  "pixel-grid",
  "noise-dissolve",
  "ink-spread",
  "film-burn",
]);
export const maskRevealSchema = z
  .object({
    preset: maskPresetSchema,
    renderer: z.enum(["auto", "dom", "webgl"]).default("auto"),
    direction: z.enum(["left", "right", "up", "down"]).default("right"),
    origin: z
      .tuple([finite.min(0).max(100), finite.min(0).max(100)])
      .default([50, 50]),
    softness: finite.min(0).max(40).default(12),
    scale: finite.min(0.5).max(2).default(1),
    rotation: finite.min(-180).max(180).default(0),
    intensity: finite.min(0).max(2).default(1),
    seed: finite.int().min(0).max(9999).default(47),
    invert: z.boolean().default(false),
    edgeColor: color.default("#f97316"),
    edgeWidth: finite.min(0).max(20).default(0),
  })
  .strict();
const transitionLayerBase = {
  id,
  blendMode: z.enum(["normal", "multiply", "screen", "overlay"]).default("normal"),
  opacity: finite.min(0).max(1).default(1),
  range: z.tuple([finite.min(0).max(1), finite.min(0).max(1)]).refine(([start, end]) => end > start, "Layer range must increase").default([0, 1]),
  motion: z.enum(["none", "parallax-up", "parallax-down", "scale"]).default("none"),
};
export const transitionLayerSchema = z.discriminatedUnion("kind", [
  z.object({ ...transitionLayerBase, kind: z.literal("color"), color }).strict(),
  z.object({ ...transitionLayerBase, kind: z.literal("image"), src: assetUrl, position: z.tuple([finite.min(0).max(100), finite.min(0).max(100)]).default([50, 50]) }).strict(),
]);
export const sceneMediaSchema = z.object({
  // A "color" plate is a chapter whose background is a flat field rather than a photograph. It
  // is a first-class media kind, so it inherits every transition, mask and overlap rule.
  kind: z.enum(["image", "video", "color"]),
  src: assetUrl.optional(),
  fill: color.optional(),
  poster: assetUrl.optional(),
  alt: z.string().min(1).max(300),
  transition: z.enum(["slide", "curtain", "zoom", "dissolve", "wipe", "mask", "cut"]).default("slide"),
  blendColor: color.optional(),
  maskSoftness: finite.min(0).max(100).default(18),
  mask: maskRevealSchema.optional(),
  layers: z.array(transitionLayerSchema).max(6).default([]),
  position: z.tuple([finite.min(0).max(100),finite.min(0).max(100)]).default([50,50]),
  mobilePosition: z.tuple([finite.min(0).max(100),finite.min(0).max(100)]).default([50,50]),
  overlap: finite.min(.1).max(.45).default(.25),
  direction: z.enum(["up","down","left","right"]).default("up"),
  zoom: finite.min(1).max(1.18).default(1.06),
  textEnd: finite.min(.1).max(.6).default(.28),
}).strict().superRefine((media, context) => {
  if (media.kind === "video" && !media.poster) context.addIssue({ code: "custom", message: "Video media requires a poster", path: ["poster"] });
  if (media.kind === "color" && !media.fill) context.addIssue({ code: "custom", message: "Color media requires a fill", path: ["fill"] });
  if (media.kind !== "color" && !media.src) context.addIssue({ code: "custom", message: "Image and video media require a src", path: ["src"] });
  const ids = new Set<string>();
  media.layers.forEach((layer, index) => {
    if (ids.has(layer.id)) context.addIssue({ code: "custom", message: "Transition layer IDs must be unique", path: ["layers", index, "id"] });
    ids.add(layer.id);
  });
});

export const motionEasingSchema = z.enum([
  "hold",
  "linear",
  "smooth",
  "ease-in",
  "ease-out",
  "ease-in-out",
  "cubic",
]);
const motionCurve = z
  .tuple([
    finite.min(0).max(1),
    finite.min(-2).max(3),
    finite.min(0).max(1),
    finite.min(-2).max(3),
  ])
  .default([0.33, 0, 0.67, 1]);
const motionKeyBase = {
  id,
  at: finite.min(0).max(1),
  easing: motionEasingSchema.default("smooth"),
  curve: motionCurve.optional(),
};
const orderedMotionKeys = <T extends z.ZodTypeAny>(schema: T) =>
  z
    .array(schema)
    .min(1)
    .max(80)
    .refine(
      (frames) =>
        frames.every(
          (frame, index) =>
            !index ||
            (frame as { at: number }).at >
              (frames[index - 1] as { at: number }).at,
        ),
      "Keyframes must be strictly ordered",
    )
    .refine(
      (frames) =>
        new Set(frames.map((frame) => (frame as { id: string }).id)).size ===
        frames.length,
      "Keyframe IDs must be unique",
    );
const motionTrackBase = {
  id,
  label: z.string().min(1).max(80),
  viewport: z.enum(["all", "desktop", "mobile"]).default("all"),
  muted: z.boolean().default(false),
  locked: z.boolean().default(false),
};
const scalarMotionTarget = z.union([
  z.enum([
    "camera.fov",
    "hero.scale",
    "world.fogDensity",
    "world.ambient",
    "world.key",
    "world.rim",
    "world.exposure",
    "material.tintStrength",
    "material.metalness",
    "material.roughness",
    "material.clearcoat",
    "post.bloom",
    "post.vignette",
    "copy.opacity",
    "copy.y",
    "copy.blur",
    "media.reveal",
    "media.opacity",
  ]),
  z.string().regex(/^layer:[a-z0-9]+(?:-[a-z0-9]+)*:opacity$/),
  z.string().regex(/^rig:[^:]{1,120}:opacity$/),
]);
const vectorMotionTarget = z.union([
  z.enum([
    "camera.position",
    "camera.target",
    "hero.position",
    "hero.rotation",
  ]),
  z.string().regex(/^rig:[^:]{1,120}:(?:position|rotation|scale)$/),
]);
const colorMotionTarget = z.enum([
  "world.background",
  "world.fog",
  "world.keyColor",
  "world.rimColor",
  "material.tint",
]);
const booleanMotionTarget = z.string().regex(/^rig:[^:]{1,120}:visible$/);
const scalarMotionTrack = z
  .object({
    ...motionTrackBase,
    type: z.literal("number"),
    target: scalarMotionTarget,
    blend: z.enum(["absolute", "add", "multiply"]).default("absolute"),
    keyframes: orderedMotionKeys(
      z.object({ ...motionKeyBase, value: finite }).strict(),
    ),
  })
  .strict()
  .superRefine((track, ctx) => {
    const range = scalarMotionBounds(track.target);
    track.keyframes.forEach((keyframe, index) => {
      if (track.blend === "multiply" && (keyframe.value < 0 || keyframe.value > 100))
        ctx.addIssue({ code: "custom", path: ["keyframes", index, "value"], message: "Multiply values must be between 0 and 100" });
      if (track.blend === "absolute" && (keyframe.value < range[0] || keyframe.value > range[1]))
        ctx.addIssue({ code: "custom", path: ["keyframes", index, "value"], message: `Value must be between ${range[0]} and ${range[1]} for ${track.target}` });
    });
  });
const vectorMotionTrack = z
  .object({
    ...motionTrackBase,
    type: z.literal("vector"),
    target: vectorMotionTarget,
    blend: z.enum(["absolute", "offset"]).default("absolute"),
    keyframes: orderedMotionKeys(
      z.object({ ...motionKeyBase, value: vec3 }).strict(),
    ),
  })
  .strict();
const colorMotionTrack = z
  .object({
    ...motionTrackBase,
    type: z.literal("color"),
    target: colorMotionTarget,
    keyframes: orderedMotionKeys(
      z.object({ ...motionKeyBase, value: color }).strict(),
    ),
  })
  .strict();
const booleanMotionTrack = z
  .object({
    ...motionTrackBase,
    type: z.literal("boolean"),
    target: booleanMotionTarget,
    keyframes: orderedMotionKeys(
      z.object({ ...motionKeyBase, value: z.boolean() }).strict(),
    ),
  })
  .strict();
export const motionTrackSchema = z.discriminatedUnion("type", [
  scalarMotionTrack,
  vectorMotionTrack,
  colorMotionTrack,
  booleanMotionTrack,
]);

function scalarMotionBounds(target: string): [number, number] {
  if (target === "camera.fov") return [15, 90];
  if (target === "hero.scale") return [0.001, 100];
  if (target === "world.fogDensity") return [0, 0.15];
  if (target === "world.ambient") return [0, 20];
  if (target === "world.key" || target === "world.rim") return [0, 50];
  if (target === "world.exposure") return [0.25, 3];
  if (target === "post.bloom") return [0, 2];
  if (target === "copy.y") return [-500, 500];
  if (target === "copy.blur") return [0, 100];
  return [0, 1];
}
export const sceneSchema = z
  .object({
    id,
    label: z.string().min(1).max(80),
    range: z
      .tuple([finite.min(0).max(1), finite.min(0).max(1)])
      .refine(([a, b]) => b > a, "Range must increase"),
    easing: z.enum(["linear", "smooth", "cinematic"]),
    camera: cameraSchema,
    mobileCamera: cameraSchema.optional(),
    motionTracks: z.array(motionTrackSchema).max(120).default([]),
    media: sceneMediaSchema.optional(),
    blocks: z.array(sceneBlockSchema).max(6).default([]),
    hero: z
      .object({
        motion: z
          .enum([
            "linear",
            "handoff",
            "rise",
            "drop",
            "spiral",
            "scale-through",
          ])
          .optional(),
        from: objectState,
        to: objectState,
      })
      .strict(),
    world: z
      .object({
        background: color,
        fog: color,
        fogDensity: finite.min(0).max(0.15),
        ambient: finite.min(0).max(20),
        key: finite.min(0).max(50),
        rim: finite.min(0).max(50),
        keyColor: color.default("#fff2df"),
        rimColor: color.default("#ff7a1a"),
        exposure: finite.min(0.25).max(3).default(1),
      })
      .strict(),
    material: z
      .object({
        tint: color.default("#ffffff"),
        tintStrength: finite.min(0).max(1).default(0),
        metalness: finite.min(0).max(1).nullable().default(null),
        roughness: finite.min(0).max(1).nullable().default(null),
        clearcoat: finite.min(0).max(1).nullable().default(null),
      })
      .strict()
      .default({
        tint: "#ffffff",
        tintStrength: 0,
        metalness: null,
        roughness: null,
        clearcoat: null,
      }),
    post: z
      .object({ bloom: finite.min(0).max(2), vignette: finite.min(0).max(1) })
      .strict(),
    copy: z
      .object({
        eyebrow: z.string().max(100).optional(),
        headline: z.string().min(1).max(120),
        body: z.string().min(1).max(800),
        align: z.enum(["left", "right", "center"]).optional(),
        cta: z
          .object({ label: z.string().min(1).max(80), href: linkUrl })
          .strict()
          .optional(),
      })
      .strict(),
  })
  .strict();
export const experienceSchema = z
  .object({
    meta: z
      .object({
        name: z.string().min(1).max(100),
        description: z.string().min(1).max(500),
        themeColor: color,
        backgroundColor: color,
      })
      .strict(),
    runtime: z
      .object({
        sceneHeightVh: finite.min(80).max(300),
        cameraDamping: finite.min(0.1).max(30),
        objectDamping: finite.min(0.1).max(30),
        pointerInfluence: finite.min(0).max(0.5),
        minDpr: finite.min(0.5).max(1.5),
        maxDpr: finite.min(0.5).max(2),
        maxPixels: finite.int().min(250000).max(16000000).default(4000000),
        preloadMb: finite.min(1).max(100).default(20),
      })
      .strict()
      .refine((s) => s.minDpr <= s.maxDpr, "minDpr must not exceed maxDpr"),
    heroModel: z.union([z.literal(""), assetUrl]),
    heroLowModel: assetUrl.optional(),
    productRig: productRigSchema.optional(),
    stage: z.enum(["demo", "minimal"]).default("demo"),
    heroVisible: z.boolean().default(true),
    assets: z.array(sceneAssetSchema).max(60).default([]),
    scenes: z.array(sceneSchema).min(1).max(30),
    hotspots: z
      .array(
        z
          .object({
            id,
            sceneId: id,
            label: z.string().min(1).max(100),
            description: z.string().min(1).max(1000),
            position: vec3,
          })
          .strict(),
      )
      .max(30),
  })
  .strict()
  .superRefine((c, ctx) => {
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: "custom", path, message });
    const ids = new Set<string>();
    c.scenes.forEach((s, i) => {
      if (ids.has(s.id)) issue(["scenes", i, "id"], "Duplicate scene ID");
      ids.add(s.id);
      if (i && Math.abs(c.scenes[i - 1].range[1] - s.range[0]) > 1e-9)
        issue(["scenes", i, "range"], "Timeline gap or overlap");
      const trackIds = new Set<string>();
      const trackTargets = new Set<string>();
      s.motionTracks.forEach((track, trackIndex) => {
        if (trackIds.has(track.id))
          issue(["scenes", i, "motionTracks", trackIndex, "id"], "Duplicate motion track ID");
        trackIds.add(track.id);
        const targetKey = `${track.viewport}:${track.target}`;
        if (trackTargets.has(targetKey))
          issue(["scenes", i, "motionTracks", trackIndex, "target"], "Duplicate target for this viewport");
        trackTargets.add(targetKey);
        const layer = /^layer:([^:]+):opacity$/.exec(track.target)?.[1];
        if (layer && !s.media?.layers.some((item) => item.id === layer))
          issue(["scenes", i, "motionTracks", trackIndex, "target"], "Transition layer target does not exist in this scene");
        const node = /^rig:([^:]+):/.exec(track.target)?.[1];
        if (node && !c.productRig?.nodes.includes(node))
          issue(["scenes", i, "motionTracks", trackIndex, "target"], "Product rig node target is not mapped");
        if (track.target.startsWith("media.") && !s.media)
          issue(["scenes", i, "motionTracks", trackIndex, "target"], "Media target requires scene media");
      });
    });
    if (c.scenes[0].range[0] !== 0)
      issue(["scenes", 0, "range"], "Timeline must start at 0");
    if (c.scenes.at(-1)!.range[1] !== 1)
      issue(["scenes", c.scenes.length - 1, "range"], "Timeline must end at 1");
    for (const group of ["hotspots", "assets"] as const) {
      const seen = new Set<string>();
      c[group].forEach((a, i) => {
        if (seen.has(a.id)) issue([group, i, "id"], "Duplicate ID");
        seen.add(a.id);
      });
    }
    c.hotspots.forEach((h, i) => {
      if (!ids.has(h.sceneId))
        issue(["hotspots", i, "sceneId"], "Unknown scene");
    });
    c.assets.forEach((a, i) => {
      for (const s of a.scenes ?? [])
        if (!ids.has(s)) issue(["assets", i, "scenes"], "Unknown scene");
      if (a.kind === "model" && a.animation && !ids.has(a.animation.sceneId))
        issue(["assets", i, "animation"], "Unknown scene");
      if (a.kind === "video" && a.sceneId && !ids.has(a.sceneId))
        issue(["assets", i, "sceneId"], "Unknown scene");
    });
    if (c.productRig && !c.heroModel)
      issue(["productRig"], "Product rigs require heroModel");
  });
export type ParsedExperience = z.infer<typeof experienceSchema>;
export function parseExperience(input: unknown): ParsedExperience {
  return experienceSchema.parse(input);
}
