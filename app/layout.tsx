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
import "./pages.css";

const project=parseStudioProject(rawProject);
const discoverability=project.discoverability;

export const metadata: Metadata = {
  // metadataBase is what makes Open Graph and canonical URLs absolute. Without it a social
  // scraper resolves them against the request and sees localhost.
  metadataBase: new URL(siteUrl()),
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
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const isNocterra = experience.meta.name.startsWith("NOCTERRA");
  const isAtelierMaris = experience.meta.name.startsWith("ATELIER MARIS");
  const project = isAtelierMaris ? "atelier-maris" : isNocterra ? "nocterra" : "forge";
  return (
    <html lang="en">
      <body
        data-project={project}
        className={`${bodyFont.variable} ${editorialFont.variable} ${architecturalFont.variable}`}
      >
        <DiscoverabilityJsonLd />
        <ExperienceRuntime>{children}</ExperienceRuntime>
      </body>
    </html>
  );
}
