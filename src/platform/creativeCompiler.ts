import { parseCreativeDirection, type CreativeDirection } from "@/src/platform/creativeDirectionSchema";
import { parseExperience } from "@/src/lib/configSchema";
import type { ExperienceConfig } from "@/src/types/experience";

export interface CreativeCompilation { experience: ExperienceConfig; provenance: Record<string, string>; }

/** Compiles creative intent into the existing runtime without changing camera or motion ownership. */
export function compileCreativeDirection(input: unknown, base: unknown): CreativeCompilation {
  const direction = parseCreativeDirection(input);
  const source = parseExperience(base);
  const provenance: Record<string, string> = {};
  const scenes = source.scenes.map((scene, index) => {
    const beat = direction.scenes[index % direction.scenes.length];
    provenance[`scenes.${index}.copy`] = `creative-direction.scenes[${index % direction.scenes.length}]`;
    return {
      ...scene,
      label: beat.id,
      copy: { ...scene.copy, headline: beat.copy, body: beat.purpose, cta: { label: direction.cta, href: `#${beat.id}` } },
      blocks: [{ id: `creative-${beat.id}`, type: "statement" as const, title: beat.copy, body: beat.purpose, accent: direction.concept }],
    };
  });
  const experience = parseExperience({ ...source, meta: { ...source.meta, description: direction.promise }, scenes });
  return { experience, provenance };
}
