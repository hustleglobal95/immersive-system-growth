import type { Metadata, Viewport } from "next";
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
  title: experience.meta.name,
  description: experience.meta.description,
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
