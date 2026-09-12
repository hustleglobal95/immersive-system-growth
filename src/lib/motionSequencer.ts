import { lerpHex } from "@/src/lib/color";
import { lerp, lerpVec3 } from "@/src/lib/math";
import type {
  MotionTrack,
  SampledExperienceState,
  SampledMotionState,
  SceneDefinition,
  Vec3,
} from "@/src/types/experience";

type MotionValue = number | boolean | string | Vec3;
type MotionKey = {
  id: string;
  at: number;
  value: MotionValue;
  easing: MotionTrack["keyframes"][number]["easing"];
  curve?: [number, number, number, number];
};

export function sampleMotionTrack(track: MotionTrack, progress: number): MotionValue {
  const keys = track.keyframes as MotionKey[];
  const p = clamp(progress);
  if (p <= keys[0].at || keys.length === 1) return cloneValue(keys[0].value);
  const last = keys[keys.length - 1];
  if (p >= last.at) return cloneValue(last.value);
  const index = keys.findIndex((key) => key.at >= p);
  const from = keys[index - 1];
  const to = keys[index];
  const span = Math.max(0.000001, to.at - from.at);
  const local = (p - from.at) / span;
  const amount = sampleEasing(local, from.easing, from.curve);
  if (track.type === "boolean" || from.easing === "hold") return cloneValue(from.value);
  if (track.type === "vector") return lerpVec3(from.value as Vec3, to.value as Vec3, amount);
  if (track.type === "color") return lerpHex(from.value as string, to.value as string, amount);
  return lerp(from.value as number, to.value as number, amount);
}

export function sampleEasing(
  progress: number,
  easing: MotionKey["easing"],
  curve: MotionKey["curve"] = [0.33, 0, 0.67, 1],
) {
  const p = clamp(progress);
  if (easing === "hold") return 0;
  if (easing === "linear") return p;
  if (easing === "smooth") return p * p * (3 - 2 * p);
  if (easing === "ease-in") return p * p * p;
  if (easing === "ease-out") return 1 - Math.pow(1 - p, 3);
  if (easing === "ease-in-out")
    return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
  return cubicBezierAtX(p, curve);
}

export function cubicBezierAtX(
  x: number,
  [x1, y1, x2, y2]: [number, number, number, number],
) {
  const target = clamp(x);
  let low = 0;
  let high = 1;
  let t = target;
  for (let index = 0; index < 18; index += 1) {
    const sampledX = cubic(t, 0, x1, x2, 1);
    if (Math.abs(sampledX - target) < 0.000001) break;
    if (sampledX < target) low = t;
    else high = t;
    t = (low + high) * 0.5;
  }
  return cubic(t, 0, y1, y2, 1);
}

export function sampleSceneMotion(
  scene: SceneDefinition,
  localProgress: number,
  mobile = false,
): SampledMotionState {
  const result = emptyMotionState();
  const tracks = orderedViewportTracks(scene.motionTracks, mobile);
  for (const track of tracks) {
    const value = sampleMotionTrack(track, localProgress);
    applyAuxiliaryValue(result, track, value);
  }
  return result;
}

export function applySceneMotion(
  state: Omit<SampledExperienceState, "motion">,
  scene: SceneDefinition,
  localProgress: number,
  mobile = false,
): SampledExperienceState {
  const result: SampledExperienceState = {
    ...state,
    camera: { ...state.camera, position: [...state.camera.position], target: [...state.camera.target] },
    hero: { ...state.hero, position: [...state.hero.position], rotation: [...state.hero.rotation] },
    world: { ...state.world },
    material: { ...state.material },
    post: { ...state.post },
    motion: emptyMotionState(),
  };
  for (const track of orderedViewportTracks(scene.motionTracks, mobile)) {
    const value = sampleMotionTrack(track, localProgress);
    if (applyRuntimeValue(result, track, value)) continue;
    applyAuxiliaryValue(result.motion, track, value);
  }
  return result;
}

function applyRuntimeValue(
  state: SampledExperienceState,
  track: MotionTrack,
  value: MotionValue,
) {
  const target = track.target;
  if (target.startsWith("rig:") || target.startsWith("copy.") || target.startsWith("media.") || target.startsWith("layer:")) return false;
  if (track.type === "vector") {
    const vector = value as Vec3;
    if (target === "camera.position") state.camera.position = blendVector(state.camera.position, vector, track.blend);
    else if (target === "camera.target") state.camera.target = blendVector(state.camera.target, vector, track.blend);
    else if (target === "hero.position") state.hero.position = blendVector(state.hero.position, vector, track.blend);
    else if (target === "hero.rotation") state.hero.rotation = blendVector(state.hero.rotation, vector, track.blend);
    else return false;
    return true;
  }
  if (track.type === "color") {
    if (target === "world.background") state.world.background = value as string;
    else if (target === "world.fog") state.world.fog = value as string;
    else if (target === "world.keyColor") state.world.keyColor = value as string;
    else if (target === "world.rimColor") state.world.rimColor = value as string;
    else if (target === "material.tint") state.material.tint = value as string;
    else return false;
    return true;
  }
  if (track.type !== "number") return false;
  const scalar = value as number;
  const blend = (current: number | null) => blendNumber(current, scalar, track.blend);
  if (target === "camera.fov") state.camera.fov = blend(state.camera.fov);
  else if (target === "hero.scale") state.hero.scale = blend(state.hero.scale);
  else if (target === "world.fogDensity") state.world.fogDensity = blend(state.world.fogDensity);
  else if (target === "world.ambient") state.world.ambient = blend(state.world.ambient);
  else if (target === "world.key") state.world.key = blend(state.world.key);
  else if (target === "world.rim") state.world.rim = blend(state.world.rim);
  else if (target === "world.exposure") state.world.exposure = blend(state.world.exposure);
  else if (target === "material.tintStrength") state.material.tintStrength = blend(state.material.tintStrength);
  else if (target === "material.metalness") state.material.metalness = blend(state.material.metalness);
  else if (target === "material.roughness") state.material.roughness = blend(state.material.roughness);
  else if (target === "material.clearcoat") state.material.clearcoat = blend(state.material.clearcoat);
  else if (target === "post.bloom") state.post.bloom = blend(state.post.bloom);
  else if (target === "post.vignette") state.post.vignette = blend(state.post.vignette);
  else return false;
  return true;
}

function applyAuxiliaryValue(
  state: SampledMotionState,
  track: MotionTrack,
  value: MotionValue,
) {
  const target = track.target;
  if (track.type === "number" && target === "copy.opacity") state.copy.opacity = blendNumber(state.copy.opacity, value as number, track.blend);
  else if (track.type === "number" && target === "copy.y") state.copy.y = blendNumber(state.copy.y, value as number, track.blend);
  else if (track.type === "number" && target === "copy.blur") state.copy.blur = blendNumber(state.copy.blur, value as number, track.blend);
  else if (track.type === "number" && target === "media.reveal") state.media.reveal = value as number;
  else if (track.type === "number" && target === "media.opacity") state.media.opacity = value as number;
  else {
    const layer = /^layer:([^:]+):opacity$/.exec(target)?.[1];
    if (track.type === "number" && layer) state.layers[layer] = value as number;
    const rig = /^rig:([^:]+):(position|rotation|scale|opacity|visible)$/.exec(target);
    if (rig) {
      const [, node, property] = rig;
      state.rig[node] ??= {};
      state.rig[node][property as keyof (typeof state.rig)[string]] = {
        value: cloneValue(value) as number | boolean | Vec3,
        blend: "blend" in track ? track.blend : "absolute",
      };
    }
  }
}

function orderedViewportTracks(tracks: readonly MotionTrack[], mobile: boolean) {
  const viewport = mobile ? "mobile" : "desktop";
  return [
    ...tracks.filter((track) => !track.muted && track.viewport === "all"),
    ...tracks.filter((track) => !track.muted && track.viewport === viewport),
  ];
}

function emptyMotionState(): SampledMotionState {
  return {
    copy: { opacity: 1, y: 0, blur: 0 },
    media: {},
    layers: {},
    rig: {},
  };
}

function blendVector(base: Vec3, value: Vec3, blend: "absolute" | "offset"): Vec3 {
  return blend === "absolute"
    ? [...value]
    : [base[0] + value[0], base[1] + value[1], base[2] + value[2]];
}

function blendNumber(
  base: number | null,
  value: number,
  blend: "absolute" | "add" | "multiply",
) {
  if (blend === "absolute") return value;
  if (blend === "add") return (base ?? 0) + value;
  return (base ?? 1) * value;
}

function cubic(t: number, p0: number, p1: number, p2: number, p3: number) {
  const inverse = 1 - t;
  return inverse ** 3 * p0 + 3 * inverse ** 2 * t * p1 + 3 * inverse * t ** 2 * p2 + t ** 3 * p3;
}

function cloneValue<T extends MotionValue>(value: T): T {
  return (Array.isArray(value) ? [...value] : value) as T;
}

function clamp(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}
