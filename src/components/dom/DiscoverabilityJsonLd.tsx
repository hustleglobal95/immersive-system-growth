import rawProject from "@/config/studio-project.json";
import { experience } from "@/src/lib/experience";
import { buildStructuredData, safeJsonLd } from "@/src/platform/discoverability";
import { parseStudioProject } from "@/src/platform/studioSchema";

const project=parseStudioProject(rawProject);

export function DiscoverabilityJsonLd() {
  const data=buildStructuredData(project.discoverability,experience);
  return <script id="forge-discoverability-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{__html:safeJsonLd(data)}} />;
}
