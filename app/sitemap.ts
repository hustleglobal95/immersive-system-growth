import type { MetadataRoute } from "next";
import rawProject from "@/config/studio-project.json";
import { projects } from "@/src/lib/projects";
import { siteUrl } from "@/src/lib/siteUrl";
import { parseStudioProject } from "@/src/platform/studioSchema";

const studioProject=parseStudioProject(rawProject);

export default function sitemap(): MetadataRoute.Sitemap {
  const base=studioProject.discoverability.canonicalBaseUrl || siteUrl();
  const now=new Date();
  const publicPaths=new Set(studioProject.discoverability.publicPaths);
  const staticEntries=[
    ["/site","monthly",1],
    ["/work","monthly",.8],
    ["/about","yearly",.6],
  ] as const;
  const entries:MetadataRoute.Sitemap=staticEntries
    .filter(([route])=>publicPaths.has(route))
    .map(([route,changeFrequency,priority])=>({url:`${base}${route}`,lastModified:now,changeFrequency,priority}));
  if(publicPaths.has("/work")) {
    entries.push(...projects.map((project)=>({
      url:`${base}/work/${project.slug}`,
      lastModified:now,
      changeFrequency:"yearly" as const,
      priority:.7,
    })));
  }
  return entries;
}
