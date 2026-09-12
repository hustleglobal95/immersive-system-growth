import { sampleExperience } from "@/src/lib/sampleExperience";
import {
  cameraChoreographyCatalog,
  createCameraChoreography,
  isCameraChoreographyName,
} from "@/src/platform/cameraChoreography";
import { directCamera } from "@/src/platform/cameraDirector";
import type {
  ExperienceConfig,
  MotionTrack,
  MotionViewport,
  SceneDefinition,
  Vec3,
} from "@/src/types/experience";

export const motionPresetCatalog = [
  { id: "auto-direct-camera", label: "Auto Director · Camera", description: "Analyze scene intent and geometry, then choose a Director-grade camera choreography." },
  ...cameraChoreographyCatalog,
  { id: "camera-drift", label: "Camera drift", description: "A restrained three-point camera arc." },
  { id: "product-lift", label: "Product lift", description: "Rise, hold and settle the persistent hero." },
  { id: "light-pulse", label: "Light pulse", description: "Build and release key-light intensity." },
  { id: "copy-rise", label: "Copy rise", description: "Fade and settle the scene copy." },
  { id: "media-reveal", label: "Media reveal", description: "Author a reversible reveal envelope." },
  { id: "mobile-closeup", label: "Mobile close-up", description: "Override camera framing only on narrow viewports." },
  { id: "cinematic-focus", label: "Cinematic focus", description: "Combine a focal-length push with restrained bloom and copy settling." },
  { id: "rig-cascade", label: "Rig component cascade", description: "Stagger mapped GLB components into their assembled positions." },
] as const;

export type MotionPresetName = (typeof motionPresetCatalog)[number]["id"];

export function createMotionPreset(
  name: MotionPresetName,
  config: ExperienceConfig,
  sceneIndex: number,
): MotionTrack[] {
  if (name === "auto-direct-camera") return directCamera(config, sceneIndex).tracks;
  if (isCameraChoreographyName(name)) return createCameraChoreography(name, config, sceneIndex);
  const scene = config.scenes[sceneIndex];
  const base = sampleExperience(scene.range[0], false, { ...config, scenes: config.scenes.map((item, index) => index === sceneIndex ? { ...item, motionTracks: [] } : item) });
  if (name === "camera-drift") {
    const from = base.camera.position;
    return [vectorTrack("camera-drift", "Camera position", "camera.position", [
      key("camera-drift-a", 0, from, "smooth"),
      key("camera-drift-b", 0.5, [from[0] + 0.55, from[1] + 0.18, from[2] - 0.3], "cubic", [0.2, 0, 0.2, 1]),
      key("camera-drift-c", 1, scene.camera.to.position, "smooth"),
    ])];
  }
  if (name === "product-lift") {
    const from = scene.hero.from.position;
    return [vectorTrack("product-lift", "Hero position", "hero.position", [
      key("product-lift-a", 0, from, "ease-out"),
      key("product-lift-b", 0.55, [from[0], from[1] + 0.45, from[2]], "cubic", [0.16, 1, 0.3, 1]),
      key("product-lift-c", 1, scene.hero.to.position, "smooth"),
    ])];
  }
  if (name === "light-pulse") {
    const amount = scene.world.key;
    return [numberTrack("light-pulse", "Key light", "world.key", [
      key("light-pulse-a", 0, amount * 0.72, "ease-out"),
      key("light-pulse-b", 0.48, Math.min(50, amount * 1.35), "cubic", [0.2, 0.8, 0.2, 1]),
      key("light-pulse-c", 1, amount, "ease-in-out"),
    ])];
  }
  if (name === "copy-rise") return [
    numberTrack("copy-opacity", "Copy opacity", "copy.opacity", [key("copy-opacity-a", 0, 0, "ease-out"), key("copy-opacity-b", 0.28, 1, "smooth"), key("copy-opacity-c", 1, 1, "linear")]),
    numberTrack("copy-y", "Copy Y", "copy.y", [key("copy-y-a", 0, 32, "cubic", [0.16, 1, 0.3, 1]), key("copy-y-b", 0.32, 0, "smooth"), key("copy-y-c", 1, 0, "linear")]),
  ];
  if (name === "media-reveal") return [
    numberTrack("media-reveal", "Media reveal", "media.reveal", [key("media-reveal-a", 0, 0, "smooth"), key("media-reveal-b", 0.3, 1, "cubic", [0.25, 0, 0.1, 1]), key("media-reveal-c", 1, 1, "linear")]),
  ];
  if (name === "cinematic-focus") return [
    numberTrack("focus-fov", "Focus focal length", "camera.fov", [key("focus-fov-a", 0, Math.min(90, base.camera.fov + 8), "cubic", [0.16, 1, 0.3, 1]), key("focus-fov-b", 0.62, base.camera.fov, "smooth"), key("focus-fov-c", 1, scene.camera.to.fov, "ease-in-out")]),
    numberTrack("focus-bloom", "Focus bloom", "post.bloom", [key("focus-bloom-a", 0, 0, "linear"), key("focus-bloom-b", 0.28, Math.min(2, scene.post.bloom + 0.3), "cubic", [0.2, 0.8, 0.2, 1]), key("focus-bloom-c", 1, scene.post.bloom, "ease-out")]),
    numberTrack("focus-copy", "Focus copy", "copy.opacity", [key("focus-copy-a", 0, 0, "smooth"), key("focus-copy-b", 0.45, 1, "cubic", [0.16, 1, 0.3, 1]), key("focus-copy-c", 1, 1, "linear")]),
  ];
  if (name === "rig-cascade") {
    return (config.productRig?.nodes ?? []).slice(0, 24).map((node, index, nodes) => {
      const angle = index / Math.max(1, nodes.length) * Math.PI * 2;
      const radius = 0.55 + (index % 3) * 0.18;
      const settle = Math.min(0.88, 0.38 + index * 0.025);
      const id = `cascade-${slug(node)}`;
      return vectorTrack(id, `${node} cascade`, `rig:${node}:position`, [
        key(`${id}-a`, 0, [Math.cos(angle) * radius, (index % 4 - 1.5) * 0.24, Math.sin(angle) * radius] as Vec3, "smooth"),
        key(`${id}-b`, settle, [0, 0, 0] as Vec3, "cubic", [0.16, 1, 0.3, 1]),
        key(`${id}-c`, 1, [0, 0, 0] as Vec3, "linear"),
      ], "all", "offset");
    });
  }
  const mobile = scene.mobileCamera ?? scene.camera;
  return [vectorTrack("mobile-camera", "Mobile camera", "camera.position", [
    key("mobile-camera-a", 0, mobile.from.position, "smooth"),
    key("mobile-camera-b", 1, mobile.to.position, "ease-in-out"),
  ], "mobile")];
}

export interface MotionTargetOption {
  target: MotionTrack["target"];
  type: MotionTrack["type"];
  label: string;
  group: "Camera" | "Object" | "Lighting" | "Material" | "DOM" | "Media" | "Model";
}

export function motionTargetOptions(config: ExperienceConfig, scene: SceneDefinition): MotionTargetOption[] {
  const fixed: MotionTargetOption[] = [
    option("camera.position", "vector", "Camera position", "Camera"), option("camera.target", "vector", "Camera target", "Camera"), option("camera.fov", "number", "Camera FOV", "Camera"),
    option("hero.position", "vector", "Hero position", "Object"), option("hero.rotation", "vector", "Hero rotation", "Object"), option("hero.scale", "number", "Hero scale", "Object"),
    option("world.ambient", "number", "Ambient intensity", "Lighting"), option("world.key", "number", "Key intensity", "Lighting"), option("world.rim", "number", "Rim intensity", "Lighting"), option("world.exposure", "number", "Exposure", "Lighting"), option("world.keyColor", "color", "Key color", "Lighting"), option("world.rimColor", "color", "Rim color", "Lighting"), option("world.background", "color", "Background", "Lighting"), option("world.fog", "color", "Fog color", "Lighting"), option("world.fogDensity", "number", "Fog density", "Lighting"),
    option("material.tint", "color", "Material tint", "Material"), option("material.tintStrength", "number", "Tint strength", "Material"), option("material.metalness", "number", "Metalness", "Material"), option("material.roughness", "number", "Roughness", "Material"), option("material.clearcoat", "number", "Clearcoat", "Material"), option("post.bloom", "number", "Bloom", "Lighting"), option("post.vignette", "number", "Vignette", "Lighting"),
    option("copy.opacity", "number", "Copy opacity", "DOM"), option("copy.y", "number", "Copy Y", "DOM"), option("copy.blur", "number", "Copy blur", "DOM"),
  ];
  if (scene.media) {
    fixed.push(option("media.reveal", "number", "Media reveal", "Media"));
    fixed.push(option("media.opacity", "number", "Media opacity", "Media"));
  }
  for (const layer of scene.media?.layers ?? []) fixed.push(option(`layer:${layer.id}:opacity`, "number", `${layer.id} opacity`, "Media"));
  for (const node of config.productRig?.nodes ?? []) {
    fixed.push(option(`rig:${node}:position`, "vector", `${node} position`, "Model"));
    fixed.push(option(`rig:${node}:rotation`, "vector", `${node} rotation`, "Model"));
    fixed.push(option(`rig:${node}:scale`, "vector", `${node} scale`, "Model"));
    fixed.push(option(`rig:${node}:opacity`, "number", `${node} opacity`, "Model"));
    fixed.push(option(`rig:${node}:visible`, "boolean", `${node} visibility`, "Model"));
  }
  return fixed;
}

export function createTrackForTarget(
  config: ExperienceConfig,
  sceneIndex: number,
  targetOption: MotionTargetOption,
  viewport: MotionViewport,
): MotionTrack {
  const scene = config.scenes[sceneIndex];
  const target = targetOption.target;
  const id = uniqueTrackId(scene, slug(`${viewport}-${target}`));
  const values = defaultValues(config, sceneIndex, targetOption);
  const base = { id, label: targetOption.label, viewport, muted: false, locked: false };
  const frames = values.map((value, index) => key(`${id}-${index + 1}`, index, value, "smooth"));
  if (targetOption.type === "vector") return { ...base, type: "vector", target: target as Extract<MotionTrack, { type: "vector" }>["target"], blend: "absolute", keyframes: frames as Extract<MotionTrack, { type: "vector" }>["keyframes"] };
  if (targetOption.type === "color") return { ...base, type: "color", target: target as Extract<MotionTrack, { type: "color" }>["target"], keyframes: frames as Extract<MotionTrack, { type: "color" }>["keyframes"] };
  if (targetOption.type === "boolean") return { ...base, type: "boolean", target: target as Extract<MotionTrack, { type: "boolean" }>["target"], keyframes: frames as Extract<MotionTrack, { type: "boolean" }>["keyframes"] };
  return { ...base, type: "number", target: target as Extract<MotionTrack, { type: "number" }>["target"], blend: "absolute", keyframes: frames as Extract<MotionTrack, { type: "number" }>["keyframes"] };
}

function defaultValues(config: ExperienceConfig, sceneIndex: number, target: MotionTargetOption): Array<number | boolean | string | Vec3> {
  const scene = config.scenes[sceneIndex];
  if (target.target === "camera.position") return [scene.camera.from.position, scene.camera.to.position];
  if (target.target === "camera.target") return [scene.camera.from.target, scene.camera.to.target];
  if (target.target === "camera.fov") return [scene.camera.from.fov, scene.camera.to.fov];
  if (target.target === "hero.position") return [scene.hero.from.position, scene.hero.to.position];
  if (target.target === "hero.rotation") return [scene.hero.from.rotation, scene.hero.to.rotation];
  if (target.target === "hero.scale") return [scene.hero.from.scale, scene.hero.to.scale];
  if (target.type === "boolean") return [true, true];
  if (target.type === "color") {
    const keyName = target.target.split(".")[1] as keyof typeof scene.world & keyof typeof scene.material;
    const source = target.target.startsWith("world.") ? scene.world : scene.material;
    const value = source[keyName] as string;
    return [value, value];
  }
  const groups = { world: scene.world, material: scene.material, post: scene.post } as const;
  const [group, property] = target.target.split(".");
  if (group in groups) {
    const value = (groups[group as keyof typeof groups] as Record<string, unknown>)[property];
    if (typeof value === "number") return [value, value];
  }
  if (target.target === "copy.opacity" || target.target === "media.opacity" || target.target.includes(":opacity")) return [1, 1];
  if (target.target === "media.reveal") return [0, 1];
  if (target.target.endsWith(":scale")) return [[1, 1, 1], [1, 1, 1]];
  if (target.type === "vector") return [[0, 0, 0], [0, 0, 0]];
  return [0, 0];
}

function numberTrack(id: string, label: string, target: Extract<MotionTrack, { type: "number" }>["target"], keyframes: Extract<MotionTrack, { type: "number" }>["keyframes"]): MotionTrack {
  return { id, label, type: "number", target, blend: "absolute", viewport: "all", muted: false, locked: false, keyframes };
}

function vectorTrack(id: string, label: string, target: Extract<MotionTrack, { type: "vector" }>["target"], keyframes: Extract<MotionTrack, { type: "vector" }>["keyframes"], viewport: MotionViewport = "all", blend: "absolute" | "offset" = "absolute"): MotionTrack {
  return { id, label, type: "vector", target, blend, viewport, muted: false, locked: false, keyframes };
}

function key<T>(id: string, at: number, value: T, easing: MotionTrack["keyframes"][number]["easing"], curve?: [number, number, number, number]) {
  return { id, at, value, easing, ...(curve ? { curve } : {}) };
}

function option<T extends MotionTrack["type"]>(target: Extract<MotionTrack, { type: T }>["target"], type: T, label: string, group: MotionTargetOption["group"]): MotionTargetOption {
  return { target, type, label, group } as MotionTargetOption;
}

function uniqueTrackId(scene: SceneDefinition, base: string) {
  let id = base;
  let index = 2;
  while (scene.motionTracks.some((track) => track.id === id)) id = `${base}-${index++}`;
  return id;
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "motion";
}
