import { experience, getSceneIndex } from "@/src/lib/experience";
import { applyEasing } from "@/src/lib/easing";
import { lerp, lerpVec3, remap01 } from "@/src/lib/math";
import { lerpHex } from "@/src/lib/color";
import { sampleCameraPath, sampleFov } from "@/src/lib/cameraPaths";
import { sampleSpline } from "@/src/lib/spline";
import { sampleObjectMotion } from "@/src/lib/objectMotion";
import type { SampledExperienceState } from "@/src/types/experience";

export function sampleExperience(progress: number, reducedMotion = false): SampledExperienceState {
  const sceneIndex = getSceneIndex(progress);
  const scene = experience.scenes[sceneIndex];
  const nextScene = experience.scenes[Math.min(sceneIndex + 1, experience.scenes.length - 1)];
  const localProgress = remap01(progress, scene.range[0], scene.range[1]);
  const motionProgress = reducedMotion ? (localProgress < 0.5 ? 0 : 1) : localProgress;
  const easedProgress = applyEasing(motionProgress, scene.easing);
  const worldT = reducedMotion ? 0 : easedProgress;
  const position = scene.camera.waypoints?.length
    ? sampleSpline([scene.camera.from.position, ...scene.camera.waypoints, scene.camera.to.position], easedProgress)
    : sampleCameraPath(scene.camera.from.position, scene.camera.to.position, easedProgress, scene.camera.path);
  const target = scene.camera.targetWaypoints?.length
    ? sampleSpline([scene.camera.from.target, ...scene.camera.targetWaypoints, scene.camera.to.target], easedProgress)
    : lerpVec3(scene.camera.from.target, scene.camera.to.target, easedProgress);

  return {
    scene,
    sceneIndex,
    localProgress,
    easedProgress,
    camera: { position, target, fov: sampleFov(scene.camera.from.fov, scene.camera.to.fov, easedProgress) },
    hero: sampleObjectMotion(scene.hero.from, scene.hero.to, easedProgress, scene.hero.motion ?? "linear"),
    world: {
      background: lerpHex(scene.world.background, nextScene.world.background, worldT),
      fog: lerpHex(scene.world.fog, nextScene.world.fog, worldT),
      fogDensity: lerp(scene.world.fogDensity, nextScene.world.fogDensity, worldT),
      ambient: lerp(scene.world.ambient, nextScene.world.ambient, worldT),
      key: lerp(scene.world.key, nextScene.world.key, worldT),
      rim: lerp(scene.world.rim, nextScene.world.rim, worldT),
    },
    post: { bloom: lerp(scene.post.bloom, nextScene.post.bloom, worldT), vignette: lerp(scene.post.vignette, nextScene.post.vignette, worldT) },
  };
}
