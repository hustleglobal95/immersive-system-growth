import { NextResponse } from "next/server";
import { presetCatalog, presetPack } from "@/src/platform/presetRegistry";

export const runtime = "nodejs";
export const dynamic = "force-static";

export function GET() {
  return NextResponse.json({ version: presetPack.version, presets: presetCatalog }, {
    headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" },
  });
}