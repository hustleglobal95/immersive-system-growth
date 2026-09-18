import type { Metadata, Viewport } from "next";
import { siteUrl } from "@/src/lib/siteUrl";
import type { ReactNode } from "react";
import { experience } from "@/src/lib/experience";
import { architecturalFont, bodyFont, editorialFont } from "@/src/design/fonts";
import { ExperienceRuntime } from "@/src/components/runtime/ExperienceRuntime";
import "./globals.css";
import "./experience-modes.css";
import "./design-system.css";
import "./nocterra.css";
import "./atelier-maris.css";
import "./pages.css";

export const metadata: Metadata = {
  // metadataBase is what makes Open Graph and canonical URLs absolute. Without it a social
  // scraper resolves them against the request and sees localhost.
  metadataBase: new URL(siteUrl()),
  title: experience.meta.name,
  description: experience.meta.description,
  openGraph: {
    type: "website",
    siteName: "Atelier Maris",
    title: experience.meta.name,
    description: experience.meta.description,
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
        <ExperienceRuntime>{children}</ExperienceRuntime>
      </body>
    </html>
  );
}
