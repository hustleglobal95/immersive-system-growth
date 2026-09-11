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
export const productRigSchema = z
  .object({
    nodes: z.array(z.string().min(1).max(120)).min(1).max(100),
    tracks: z.array(z.union([transformTrack, opacityTrack, visibilityTrack])).min(1).max(300),
  })
  .strict()
  .superRefine((rig, ctx) => {
    const nodes = new Set(rig.nodes);
    if (nodes.size !== rig.nodes.length)
      ctx.addIssue({ code: "custom", path: ["nodes"], message: "Product rig node names must be unique" });
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
    }).strict()).min(2).max(8),
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
export const sceneMediaSchema = z.object({
  kind: z.enum(["image", "video"]),
  src: assetUrl,
  poster: assetUrl.optional(),
  alt: z.string().min(1).max(300),
  transition: z.enum(["slide", "curtain", "zoom", "dissolve", "wipe"]).default("slide"),
  blendColor: color.optional(),
  maskSoftness: finite.min(0).max(100).default(18),
  position: z.tuple([finite.min(0).max(100),finite.min(0).max(100)]).default([50,50]),
  mobilePosition: z.tuple([finite.min(0).max(100),finite.min(0).max(100)]).default([50,50]),
  overlap: finite.min(.1).max(.45).default(.25),
  direction: z.enum(["up","down"]).default("up"),
  zoom: finite.min(1).max(1.18).default(1.06),
  textEnd: finite.min(.1).max(.6).default(.28),
}).strict().refine(m=>m.kind!=="video" || !!m.poster,"Video media requires a poster");
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
      })
      .strict(),
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
