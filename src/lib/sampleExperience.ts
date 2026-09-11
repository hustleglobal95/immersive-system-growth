import { experience, getSceneIndex } from "@/src/lib/experience";
import { applyEasing } from "@/src/lib/easing";
import { lerp, lerpVec3, remap01 } from "@/src/lib/math";
import { lerpHex } from "@/src/lib/color";
import { sampleCameraPath, sampleFov } from "@/src/lib/cameraPaths";
import { sampleSpline } from "@/src/lib/spline";
import { sampleObjectMotion } from "@/src/lib/objectMotion";
import type {
  ExperienceConfig,
  SampledExperienceState,
} from "@/src/types/experience";

export function sampleExperience(
  progress: number,
  reducedMotion = false,
  config: ExperienceConfig = experience,
  aspect = 16 / 9,
): SampledExperienceState {
  const sceneIndex = getSceneIndex(progress, config);
  const scene = config.scenes[sceneIndex];
  const nextScene =
    config.scenes[Math.min(sceneIndex + 1, config.scenes.length - 1)];
  const localProgress = remap01(progress, scene.range[0], scene.range[1]);
  const motionProgress = reducedMotion ? 0 : localProgress;
  const cameraScene = reducedMotion ? config.scenes[0] : scene;
  const camera =
    aspect < 0.85 && cameraScene.mobileCamera
      ? cameraScene.mobileCamera
      : cameraScene.camera;
  const easedProgress = applyEasing(motionProgress, scene.easing);
  const worldT = reducedMotion ? 0 : easedProgress;
  const world = reducedMotion ? config.scenes[0].world : scene.world;
  const position = camera.waypoints?.length
    ? sampleSpline(
        [camera.from.position, ...camera.waypoints, camera.to.position],
        easedProgress,
      )
    : sampleCameraPath(
        camera.from.position,
        camera.to.position,
        easedProgress,
        camera.path,
        camera.from.target,
        camera.to.target,
      );
  const target = camera.targetWaypoints?.length
    ? sampleSpline(
        [camera.from.target, ...camera.targetWaypoints, camera.to.target],
        easedProgress,
      )
    : lerpVec3(camera.from.target, camera.to.target, easedProgress);

  return {
    scene,
    sceneIndex,
    localProgress,
    easedProgress,
    camera: {
      position,
      target,
      fov: sampleFov(camera.from.fov, camera.to.fov, easedProgress),
    },
    hero: reducedMotion
      ? config.scenes[0].hero.from
      : sampleObjectMotion(
          scene.hero.from,
          scene.hero.to,
          easedProgress,
          scene.hero.motion ?? "linear",
        ),
    world: {
      background: lerpHex(world.background, nextScene.world.background, worldT),
      fog: lerpHex(world.fog, nextScene.world.fog, worldT),
      fogDensity: lerp(world.fogDensity, nextScene.world.fogDensity, worldT),
      ambient: lerp(world.ambient, nextScene.world.ambient, worldT),
      key: lerp(world.key, nextScene.world.key, worldT),
      rim: lerp(world.rim, nextScene.world.rim, worldT),
      keyColor: lerpHex(world.keyColor, nextScene.world.keyColor, worldT),
      rimColor: lerpHex(world.rimColor, nextScene.world.rimColor, worldT),
      exposure: lerp(world.exposure, nextScene.world.exposure, worldT),
    },
    material: {
      tint: lerpHex(scene.material.tint, nextScene.material.tint, worldT),
      tintStrength: lerp(scene.material.tintStrength, nextScene.material.tintStrength, worldT),
      metalness: interpolateNullable(scene.material.metalness, nextScene.material.metalness, worldT),
      roughness: interpolateNullable(scene.material.roughness, nextScene.material.roughness, worldT),
      clearcoat: interpolateNullable(scene.material.clearcoat, nextScene.material.clearcoat, worldT),
    },
    post: {
      bloom: lerp(scene.post.bloom, nextScene.post.bloom, worldT),
      vignette: lerp(scene.post.vignette, nextScene.post.vignette, worldT),
    },
  };
}

function interpolateNullable(from: number | null, to: number | null, progress: number) {
  if (from === null || to === null) return from;
  return lerp(from, to, progress);
}
