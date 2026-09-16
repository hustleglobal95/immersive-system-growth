import { NextResponse } from "next/server";

export const revalidate = 86400;

interface FontsourceFont {
  id: string;
  family: string;
  subsets: string[];
  weights: number[];
  styles: string[];
  defSubset: string;
  variable: boolean;
  lastModified: string;
  category: string;
  version: string;
  type: string;
}

export async function GET() {
  try {
    const response = await fetch("https://api.fontsource.org/v1/fonts", {
      headers: { accept: "application/json" },
      next: { revalidate: 86400 },
    });
    if (!response.ok) throw new Error(`Fontsource returned ${response.status}`);
    const data = (await response.json()) as FontsourceFont[];
    const fonts = data
      .filter((font) => font.type !== "icons")
      .map((font) => ({
        id: font.id,
        name: font.family,
        category: font.category,
        subsets: font.subsets,
        weights: font.weights,
        styles: font.styles,
        variable: font.variable,
        lastModified: font.lastModified,
        sourceType: font.type,
        source: `https://fontsource.org/fonts/${font.id}`,
        license: "Open-source font; verify package license before redistribution",
      }));
    return NextResponse.json({ source: "fontsource", count: fonts.length, fonts });
  } catch (error) {
    return NextResponse.json({
      source: "fallback",
      count: 0,
      fonts: [],
      warning: error instanceof Error ? error.message : "Fontsource catalog unavailable",
    });
  }
}
