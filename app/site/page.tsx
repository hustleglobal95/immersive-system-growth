import type { Metadata } from "next";
import rawProject from "@/config/studio-project.json";
import { parseStudioProject } from "@/src/platform/studioSchema";

const project=parseStudioProject(rawProject);

export const metadata:Metadata={
  title:project.discoverability.defaultTitle,
  description:project.discoverability.defaultDescription,
  alternates:{canonical:"/site"},
  openGraph:{
    type:"website",
    siteName:project.discoverability.siteName || project.name,
    title:project.discoverability.defaultTitle,
    description:project.discoverability.defaultDescription,
  },
};

export default function SitePage() {
  return null;
}
