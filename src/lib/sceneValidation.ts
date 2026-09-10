import type { ExperienceConfig, SceneDefinition } from "@/src/types/experience";

export interface ValidationIssue { level: "error" | "warning"; message: string; }

export function validateScene(scene: SceneDefinition, index: number): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const [start, end] = scene.range;
  if (!scene.id.trim()) issues.push({ level: "error", message: `Scene ${index} has no id.` });
  if (start < 0 || end > 1 || end <= start) issues.push({ level: "error", message: `${scene.id}: invalid range ${start}..${end}.` });
  if (scene.copy.headline.length > 90) issues.push({ level: "warning", message: `${scene.id}: headline is long for cinematic overlay copy.` });
  if (scene.world.fogDensity > 0.12) issues.push({ level: "warning", message: `${scene.id}: fog density may obscure geometry.` });
  return issues;
}

export function validateExperienceConfig(config: ExperienceConfig): ValidationIssue[] {
  const issues = config.scenes.flatMap(validateScene);
  if (!config.scenes.length) issues.push({ level: "error", message: "Experience requires at least one scene." });
  if (config.scenes.length) {
    if (config.scenes[0].range[0] !== 0) issues.push({ level: "error", message: "First scene must start at 0." });
    if (config.scenes.at(-1)?.range[1] !== 1) issues.push({ level: "error", message: "Last scene must end at 1." });
    for (let index = 1; index < config.scenes.length; index += 1) {
      if (Math.abs(config.scenes[index - 1].range[1] - config.scenes[index].range[0]) > 0.000001) {
        issues.push({ level: "error", message: `${config.scenes[index - 1].id} and ${config.scenes[index].id} have a gap or overlap.` });
      }
    }
  }
  return issues;
}
