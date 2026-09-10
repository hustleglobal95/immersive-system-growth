import type { ExperienceConfig } from "@/src/types/experience";
import { sampleExperience } from "@/src/lib/sampleExperience";
export function auditContinuity(config: ExperienceConfig) {
  const errors: string[] = [];
  const distance = (a: number[], b: number[]) =>
    Math.hypot(...a.map((x, i) => x - b[i]));
  for (const aspect of [16 / 9, 9 / 16])
    for (const scene of config.scenes.slice(1)) {
      const p = scene.range[0],
        a = sampleExperience(p - 1e-9, false, config, aspect),
        b = sampleExperience(p, false, config, aspect);
      for (const [name, x, y] of [
        ["camera position", a.camera.position, b.camera.position],
        ["camera target", a.camera.target, b.camera.target],
        ["hero position", a.hero.position, b.hero.position],
        ["hero rotation", a.hero.rotation, b.hero.rotation],
      ] as const)
        if (distance([...x], [...y]) > 0.001)
          errors.push(
            `${scene.id}: ${name} discontinuity at ${p} (aspect ${aspect.toFixed(2)})`,
          );
      if (Math.abs(a.camera.fov - b.camera.fov) > 0.01)
        errors.push(`${scene.id}: FOV discontinuity`);
      if (Math.abs(a.hero.scale - b.hero.scale) > 0.001)
        errors.push(`${scene.id}: hero scale discontinuity`);
    }
  return errors;
}
