import type { MetadataRoute } from "next";
import rawProject from "@/config/studio-project.json";
import { siteUrl } from "@/src/lib/siteUrl";
import { parseStudioProject } from "@/src/platform/studioSchema";

const project=parseStudioProject(rawProject);
const discoverability=project.discoverability;

export default function robots(): MetadataRoute.Robots {
  const publicPaths=discoverability.publicPaths.length ? discoverability.publicPaths : ["/site"];
  const privatePaths=discoverability.privatePaths;
  const rules:MetadataRoute.Robots["rules"]=[
    {userAgent:"*",allow:publicPaths,disallow:privatePaths},
    discoverability.ai.allowSearchCrawlers
      ? {userAgent:["OAI-SearchBot","ChatGPT-User"],allow:publicPaths,disallow:privatePaths}
      : {userAgent:["OAI-SearchBot","ChatGPT-User"],disallow:"/"},
    discoverability.ai.allowTrainingCrawlers
      ? {userAgent:"GPTBot",allow:publicPaths,disallow:privatePaths}
      : {userAgent:"GPTBot",disallow:"/"},
  ];
  return {rules,sitemap:`${siteUrl()}/sitemap.xml`,host:siteUrl()};
}
