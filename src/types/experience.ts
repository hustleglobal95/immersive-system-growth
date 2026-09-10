import type { z } from "zod";
import type {
  experienceSchema,
  sceneAssetSchema,
  cameraSchema,
} from "@/src/lib/configSchema";
export type Vec3 = [number, number, number];
export type QualityTier = "low" | "medium" | "high";
export type QualityMode = "auto" | QualityTier;
export type ExperienceConfig = z.infer<typeof experienceSchema>;
export type SceneDefinition = ExperienceConfig["scenes"][number];
export type SceneAsset = z.infer<typeof sceneAssetSchema>;
export type CameraDefinition = z.infer<typeof cameraSchema>;
export type SceneEasing = SceneDefinition["easing"];
export type CameraPathPreset = CameraDefinition["path"];
export type ObjectMotionPreset = NonNullable<SceneDefinition["hero"]["motion"]>;
export type CameraState = CameraDefinition["from"];
export type ObjectState = SceneDefinition["hero"]["from"];
export type WorldState = SceneDefinition["world"];
export type PostState = SceneDefinition["post"];
export type SceneCopy = SceneDefinition["copy"];
export type HotspotDefinition = ExperienceConfig["hotspots"][number];
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
