import { requireStudioRole, studioAccessErrorResponse } from "@/src/platform/studioAccess";
import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { bankId } from "@/src/platform/assetBankSchema";
import { readBank } from "@/src/platform/assetBankStore";
import { createBankSearch } from "@/src/platform/assetBank";
import { parseExperience } from "@/src/lib/configSchema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// A deployment has one immutable catalog snapshot; restart after CLI updates in development.
let snapshot: ReturnType<typeof load> | undefined;
async function load() { const bank = await readBank(); return { bank, search: createBankSearch(bank) }; }
export async function GET(request: Request) {
  try { await requireStudioRole(request, "reviewer"); } catch (error) { return studioAccessErrorResponse(error) ?? Response.json({ ok: false, error: "Forge internal access failed" }, { status: 500 }); }
  try {
    snapshot ??= load().catch((error) => { snapshot = undefined; throw error; });
    const { bank, search } = await snapshot;
    const params = new URL(request.url).searchParams;
    if (params.has("kit")) {
      const id = bankId.parse(params.get("kit"));
      const kit = bank.kits.find((k) => k.id === id);
      if (!kit) return NextResponse.json({ error: "Scene kit not found" }, { status: 404 });
      // Recipe is validated from trusted catalog metadata, never a user-supplied path.
      const experience = parseExperience(JSON.parse(await fs.readFile(path.join(process.cwd(), "recipes", kit.recipe + ".json"), "utf8")));
      return NextResponse.json({ kit, experience, assets: bank.assets.filter((asset) => kit.assetIds.includes(asset.id)) });
    }
    return NextResponse.json(search(Object.fromEntries(params)), { headers: { "Cache-Control": "private, max-age=60" } });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") return NextResponse.json({ error: "Invalid catalog query or data" }, { status: 400 });
    console.error("Asset bank unavailable", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Asset bank unavailable. Run bank:validate and check deployment file tracing." }, { status: 503 });
  }
}
