import type { MetadataRoute } from "next";
import { projects } from "@/src/lib/projects";
import { siteUrl } from "@/src/lib/siteUrl";

/**
 * Derived, not listed.
 *
 * A hand-written sitemap rots the first time a route is added, which is the most common SEO miss
 * there is. The project pages are generated from the same records that generate the routes, so a
 * new project appears here without anyone remembering to add it.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const now = new Date();
  return [
    { url: `${base}/site`, lastModified: now, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/work`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "yearly", priority: 0.6 },
    ...projects.map((project) => ({
      url: `${base}/work/${project.slug}`,
      lastModified: now,
      changeFrequency: "yearly" as const,
      priority: 0.7,
    })),
  ];
}
