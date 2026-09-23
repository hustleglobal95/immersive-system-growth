import type { Metadata, Viewport } from "next";
import { siteUrl } from "@/src/lib/siteUrl";
import type { ReactNode } from "react";
import { experience } from "@/src/lib/experience";
import rawProject from "@/config/studio-project.json";
import { parseStudioProject } from "@/src/platform/studioSchema";
import { DiscoverabilityJsonLd } from "@/src/components/dom/DiscoverabilityJsonLd";
import { architecturalFont, bodyFont, editorialFont } from "@/src/design/fonts";
import { ExperienceRuntime } from "@/src/components/runtime/ExperienceRuntime";
import "./globals.css";
import "./experience-modes.css";
import "./design-system.css";
import "./nocterra.css";
import "./atelier-maris.css";
import "./weekley-marketplace.css";
import "./pages.css";

const project = parseStudioProject(rawProject);
const discoverability = project.discoverability;

export const metadata: Metadata = {
  metadataBase: new URL(discoverability.canonicalBaseUrl || siteUrl()),
  title: discoverability.defaultTitle || experience.meta.name,
  description: discoverability.defaultDescription || experience.meta.description,
  openGraph: {
    type: "website",
    siteName: discoverability.siteName || experience.meta.name,
    title: discoverability.defaultTitle || experience.meta.name,
    description: discoverability.defaultDescription || experience.meta.description,
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: experience.meta.themeColor,
  colorScheme: experience.meta.name.startsWith("DWH FORGE") ? "light" : "dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const isWeekley = experience.meta.name.startsWith("DWH FORGE");
  const isNocterra = experience.meta.name.startsWith("NOCTERRA");
  const isAtelierMaris = experience.meta.name.startsWith("ATELIER MARIS");
  const activeProject = isWeekley
    ? "weekley-marketplace"
    : isAtelierMaris
      ? "atelier-maris"
      : isNocterra
        ? "nocterra"
        : "forge";
  return (
    <html lang="en">
      <body
        data-project={activeProject}
        className={`${bodyFont.variable} ${editorialFont.variable} ${architecturalFont.variable}`}
      >
        <DiscoverabilityJsonLd />
        <ExperienceRuntime>{children}</ExperienceRuntime>
      </body>
    </html>
  );
}
