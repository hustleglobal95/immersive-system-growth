import { requireStudioRole, studioAccessErrorResponse } from "@/src/platform/studioAccess";
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

export async function GET(request: Request) {
  try { await requireStudioRole(request, "reviewer"); } catch (error) { return studioAccessErrorResponse(error) ?? NextResponse.json({ error: "Type Vault access failed" }, { status: 500 }); }
  try {
    // Bounded, per the contract: a remote endpoint gets a timeout, a redirect refusal and a
    // size ceiling. Without them a slow or hostile response holds this route open indefinitely.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5_000);
    let payload: string;
    try {
      const response = await fetch("https://api.fontsource.org/v1/fonts", {
        headers: { accept: "application/json" },
        next: { revalidate: 86400 },
        signal: controller.signal,
        redirect: "error",
      });
      if (!response.ok) throw new Error(`Fontsource returned ${response.status}`);
      const size = Number(response.headers.get("content-length") ?? 0);
      if (Number.isFinite(size) && size > 4_000_000) throw new Error("Fontsource response too large");
      payload = await response.text();
      if (payload.length > 4_000_000) throw new Error("Fontsource response too large");
    } finally {
      clearTimeout(timer);
    }
    const data = JSON.parse(payload) as FontsourceFont[];
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
