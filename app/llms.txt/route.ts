import rawProject from "@/config/studio-project.json";
import { experience } from "@/src/lib/experience";
import { buildLlmsText } from "@/src/platform/discoverability";
import { parseStudioProject } from "@/src/platform/studioSchema";

const project=parseStudioProject(rawProject);

export function GET() {
  if(!project.discoverability.ai.publishLlmsTxt) return new Response("Not found\n",{status:404,headers:{"content-type":"text/plain; charset=utf-8"}});
  return new Response(buildLlmsText(project.discoverability,experience),{
    headers:{
      "content-type":"text/plain; charset=utf-8",
      "cache-control":"public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
