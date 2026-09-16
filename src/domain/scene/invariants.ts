import type { ForgeInvariant } from "@/src/core/invariants/invariants";
import type { ExperienceConfig } from "@/src/types/experience";

export const sceneInvariants: readonly ForgeInvariant<ExperienceConfig>[] = [
  {
    id: "scene.minimum",
    check: (experience) => experience.scenes.length
      ? []
      : [{ code: "scene.minimum", message: "A Forge experience must contain at least one scene.", level: "error" }],
  },
  {
    id: "scene.ids.unique",
    check: (experience) => {
      const seen = new Set<string>();
      return experience.scenes.flatMap((scene, index) => {
        if (!seen.has(scene.id)) { seen.add(scene.id); return []; }
        return [{ code: "scene.id.duplicate", message: `Duplicate scene id ${scene.id}.`, level: "error" as const, path: `scenes.${index}.id` }];
      });
    },
  },
  {
    id: "scene.ranges",
    check: (experience) => {
      const issues = [];
      for (let index = 0; index < experience.scenes.length; index++) {
        const scene = experience.scenes[index];
        const [start, end] = scene.range;
        if (!(start >= 0 && end <= 1 && end > start))
          issues.push({ code: "scene.range.invalid", message: `${scene.id} has invalid range ${start}–${end}.`, level: "error" as const, path: `scenes.${index}.range` });
        if (index > 0) {
          const previous = experience.scenes[index - 1];
          if (Math.abs(previous.range[1] - start) > 0.000001)
            issues.push({ code: "scene.range.gap", message: `${previous.id} and ${scene.id} are not contiguous.`, level: "error" as const, path: `scenes.${index}.range` });
        }
      }
      if (experience.scenes.length) {
        const first = experience.scenes[0];
        const last = experience.scenes.at(-1)!;
        if (Math.abs(first.range[0]) > 0.000001) issues.push({ code: "scene.range.start", message: "Scene timeline must start at 0.", level: "error" as const });
        if (Math.abs(last.range[1] - 1) > 0.000001) issues.push({ code: "scene.range.end", message: "Scene timeline must end at 1.", level: "error" as const });
      }
      return issues;
    },
  },
];
