import rawExperience from "@/config/experience.json";
import { parseExperience } from "@/src/lib/configSchema";
import type { ExperienceConfig } from "@/src/types/experience";
import { clamp01 } from "@/src/lib/math";
export const experience = parseExperience(rawExperience);
export function getSceneIndex(
  progress: number,
  config: ExperienceConfig = experience,
) {
  const p = clamp01(progress);
  return config.scenes.findIndex(
    (s, i) =>
      p >= s.range[0] && (p < s.range[1] || i === config.scenes.length - 1),
  );
}
export function progressForScene(
  index: number,
  config: ExperienceConfig = experience,
) {
  return config.scenes[
    Math.min(config.scenes.length - 1, Math.max(0, Math.trunc(index)))
  ].range[0];
}
