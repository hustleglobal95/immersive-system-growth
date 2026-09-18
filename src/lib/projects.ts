import { z } from "zod";
import raw from "@/config/projects.json";

const image = z.object({ src: z.string().url(), alt: z.string().min(1).max(200) }).strict();

/** Project records are validated on the same terms as the experience config. */
export const projectSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(1).max(80),
  year: z.string().min(4).max(9),
  location: z.string().min(1).max(80),
  typology: z.string().min(1).max(120),
  status: z.string().min(1).max(40),
  summary: z.string().min(1).max(240),
  body: z.array(z.string().min(1).max(700)).min(1).max(6),
  facts: z.array(z.object({
    label: z.string().min(1).max(40),
    value: z.string().min(1).max(60),
  }).strict()).min(2).max(8),
  hero: z.string().url(),
  heroAlt: z.string().min(1).max(200),
  gallery: z.array(image).max(4).default([]),
}).strict();

export const projectsSchema = z.object({
  version: z.literal(1),
  projects: z.array(projectSchema).min(1).max(24),
}).strict().superRefine((value, context) => {
  const slugs = new Set<string>();
  value.projects.forEach((project, index) => {
    if (slugs.has(project.slug)) {
      context.addIssue({ code: "custom", message: "Duplicate project slug", path: ["projects", index, "slug"] });
    }
    slugs.add(project.slug);
  });
});

export type Project = z.infer<typeof projectSchema>;

export const projects: Project[] = projectsSchema.parse(raw).projects;

export function getProject(slug: string) {
  return projects.find((project) => project.slug === slug);
}

/** Neighbours for the footer of a project page, wrapping so there is never a dead end. */
export function projectNeighbours(slug: string) {
  const index = projects.findIndex((project) => project.slug === slug);
  if (index < 0) return { previous: null, next: null };
  return {
    previous: projects[(index - 1 + projects.length) % projects.length],
    next: projects[(index + 1) % projects.length],
  };
}
