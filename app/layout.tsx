import type { Metadata, Viewport } from "next";
import { experience } from "@/src/lib/experience";
import { ExperienceRuntime } from "@/src/components/runtime/ExperienceRuntime";
import "./globals.css";
import "./design-system.css";
import "./nocterra.css";
import { bodyFont, editorialFont, architecturalFont } from "@/src/design/fonts";
import { defaultDirection, directionStyles } from "@/src/design/directions";
export const metadata: Metadata = {
  title: experience.meta.name,
  description: experience.meta.description,
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: experience.meta.themeColor,
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const project = experience.meta.name.startsWith("NOCTERRA") ? "nocterra" : "forge";
  return (
    <html lang="en">
      <body
        data-project={project}
        className={`${bodyFont.variable} ${editorialFont.variable} ${architecturalFont.variable}`}
        style={
          {
            ...directionStyles(defaultDirection),
            "--accent": experience.meta.themeColor,
            "--bg": experience.meta.backgroundColor,
          } as React.CSSProperties
        }
      >
        <ExperienceRuntime>{children}</ExperienceRuntime>
      </body>
    </html>
  );
}
