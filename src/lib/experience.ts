import rawExperience from "@/config/experience.json";
import type { ExperienceConfig } from "@/src/types/experience";

export const experience = rawExperience as ExperienceConfig;

export function getSceneIndex(progress: number) {
  const clamped = Math.min(1, Math.max(0, progress));
  for (let index = 0; index < experience.scenes.length; index += 1) {
    const [start, end] = experience.scenes[index].range;
    if (clamped >= start && (clamped < end || index === experience.scenes.length - 1)) return index;
  }
  return Math.max(0, experience.scenes.length - 1);
}

export function progressForScene(index: number) {
  const scene = experience.scenes[Math.min(experience.scenes.length - 1, Math.max(0, index))];
  return scene.range[0] + (scene.range[1] - scene.range[0]) * 0.15;
}
