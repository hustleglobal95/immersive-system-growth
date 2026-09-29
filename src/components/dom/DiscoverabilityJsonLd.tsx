"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import rawProject from "@/config/studio-project.json";
import { experience } from "@/src/lib/experience";
import { buildStructuredData, safeJsonLd } from "@/src/platform/discoverability";
import { parseStudioProject } from "@/src/platform/studioSchema";

const project=parseStudioProject(rawProject);
const defaultProject = experience.meta.name.startsWith("ATELIER MARIS")
  ? "atelier-maris"
  : experience.meta.name.startsWith("NOCTERRA")
    ? "nocterra"
    : "forge";

export function DiscoverabilityJsonLd() {
  const pathname=usePathname();
  const isZensia=pathname==="/zensia"||pathname.startsWith("/zensia/");

  useLayoutEffect(()=>{
    document.body.dataset.project=isZensia?"zensia":defaultProject;
    return()=>{
      document.body.dataset.project=defaultProject;
    };
  },[isZensia]);

  if(isZensia) return null;

  const data=buildStructuredData(project.discoverability,experience);
  return <script id="forge-discoverability-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{__html:safeJsonLd(data)}} />;
}
