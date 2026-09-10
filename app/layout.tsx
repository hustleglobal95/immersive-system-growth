import type { Metadata, Viewport } from "next";
import { experience } from "@/src/lib/experience";
import { ExperienceRuntime } from "@/src/components/runtime/ExperienceRuntime";
import "./globals.css";
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
  return (
    <html lang="en">
      <body
        style={
          {
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
