export type Vec3 = [number, number, number];
export type QualityTier = "low" | "medium" | "high";
export type SceneEasing = "linear" | "smooth" | "cinematic";
export type CameraPathPreset = "linear" | "dolly" | "arc" | "orbit" | "crane" | "threshold" | "flyby" | "swoop" | "macro" | "pullback";
export type ObjectMotionPreset = "linear" | "handoff" | "rise" | "drop" | "spiral" | "scale-through";

export interface CameraState {
  position: Vec3;
  target: Vec3;
  fov: number;
}

export interface ObjectState {
  position: Vec3;
  rotation: Vec3;
  scale: number;
}

export interface WorldState {
  background: string;
  fog: string;
  fogDensity: number;
  ambient: number;
  key: number;
  rim: number;
}

export interface PostState {
  bloom: number;
  vignette: number;
}

export interface SceneCopy {
  eyebrow?: string;
  headline: string;
  body: string;
  align?: "left" | "right" | "center";
  cta?: { label: string; href: string };
}

export interface SceneDefinition {
  id: string;
  label: string;
  range: [number, number];
  easing: SceneEasing;
  camera: {
    path: CameraPathPreset;
    waypoints?: Vec3[];
    targetWaypoints?: Vec3[];
    from: CameraState;
    to: CameraState;
  };
  hero: {
    motion?: ObjectMotionPreset;
    from: ObjectState;
    to: ObjectState;
  };
  world: WorldState;
  post: PostState;
  copy: SceneCopy;
}

export interface HotspotDefinition {
  id: string;
  sceneId: string;
  label: string;
  description: string;
  position: Vec3;
}

export interface ExperienceConfig {
  meta: {
    name: string;
    description: string;
    themeColor: string;
    backgroundColor: string;
  };
  runtime: {
    sceneHeightVh: number;
    cameraDamping: number;
    objectDamping: number;
    pointerInfluence: number;
    maxDpr: number;
    minDpr: number;
  };
  heroModel: string;
  scenes: SceneDefinition[];
  hotspots: HotspotDefinition[];
}

export interface SampledExperienceState {
  scene: SceneDefinition;
  sceneIndex: number;
  localProgress: number;
  easedProgress: number;
  camera: CameraState;
  hero: ObjectState;
  world: WorldState;
  post: PostState;
}
