import type { ExperienceConfig, SceneDefinition } from "@/src/types/experience";
import { createCameraShot, type CameraShotName } from "@/src/lib/cameraShots";
import type { MediaTransition } from "@/src/lib/mediaPanels";

export const scenePresetNames = [
  "product-reveal",
  "orbit-proof",
  "detail-approach",
  "menu-handoff",
  "conversion-frame",
] as const;
export type ScenePresetName = (typeof scenePresetNames)[number];

const cameraForPreset: Record<ScenePresetName, CameraShotName> = {
  "product-reveal": "low-reveal",
  "orbit-proof": "hero-orbit",
  "detail-approach": "detail-approach",
  "menu-handoff": "hero-orbit",
  "conversion-frame": "low-reveal",
};

export function applyScenePreset(
  scene: SceneDefinition,
  preset: ScenePresetName,
  subjectRadius = 1.5,
): SceneDefinition {
  const camera = createCameraShot(cameraForPreset[preset], scene.camera.from.target, subjectRadius);
  const mobileCamera = createCameraShot(cameraForPreset[preset], scene.camera.from.target, subjectRadius, 9 / 16);
  const hero = (() => {
    switch (preset) {
      case "product-reveal":
        return { motion: "rise" as const, from: { position: [0, -0.6, 0] as [number, number, number], rotation: [0, -0.25, 0] as [number, number, number], scale: 0.82 }, to: { position: [0, 0, 0] as [number, number, number], rotation: [0, 0.12, 0] as [number, number, number], scale: 1 } };
      case "orbit-proof":
        return { ...scene.hero, motion: "spiral" as const };
      case "detail-approach":
        return { ...scene.hero, motion: "handoff" as const };
      case "menu-handoff":
        return { motion: "handoff" as const, from: scene.hero.from, to: { ...scene.hero.to, position: [0.85, scene.hero.to.position[1], scene.hero.to.position[2]] as [number, number, number], scale: scene.hero.to.scale * 0.82 } };
      case "conversion-frame":
        return { ...scene.hero, motion: "scale-through" as const };
    }
  })();
  return { ...scene, camera, mobileCamera, hero };
}

export function applyMediaTransition(scene: SceneDefinition, transition: MediaTransition): SceneDefinition {
  return scene.media ? { ...scene, media: { ...scene.media, transition } } : scene;
}

export function moveSceneBoundary(config: ExperienceConfig, boundary: number, value: number): ExperienceConfig {
  if (boundary <= 0 || boundary >= config.scenes.length) return config;
  const prior = config.scenes[boundary - 1];
  const next = config.scenes[boundary];
  const clamped = Math.max(prior.range[0] + 0.02, Math.min(next.range[1] - 0.02, value));
  return {
    ...config,
    scenes: config.scenes.map((scene, index) => {
      if (index === boundary - 1) return { ...scene, range: [scene.range[0], clamped] };
      if (index === boundary) return { ...scene, range: [clamped, scene.range[1]] };
      return scene;
    }),
  };
}

export function replaceScene(config: ExperienceConfig, index: number, scene: SceneDefinition): ExperienceConfig {
  return { ...config, scenes: config.scenes.map((current, position) => position === index ? scene : current) };
}
