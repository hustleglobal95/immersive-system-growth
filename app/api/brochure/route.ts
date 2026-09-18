import { readFile } from "node:fs/promises";
import path from "node:path";
import { experience } from "@/src/lib/experience";
import { verifyBrochureToken } from "@/src/platform/leadCapture";

export const runtime = "nodejs";

// Gated files live outside `public`, so the only way to reach one is through a verified grant.
const BROCHURE_DIR = path.join(process.cwd(), "private", "brochures");

/**
 * Releases a brochure against a signed, expiring grant issued by the enquiry route.
 *
 * The token carries a brochure id, never a path. The path comes from the checked-in config and
 * its file name is pattern-constrained, so a traversal segment cannot reach this reader.
 */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("t") ?? "";
  const grant = verifyBrochureToken(token, process.env.FORGE_LEAD_TOKEN_SECRET ?? "");
  if (!grant) return Response.json({ ok: false, error: "That download link is invalid or has expired." }, { status: 403 });

  const brochure = experience.conversion?.brochure;
  if (!brochure || brochure.id !== grant.brochureId)
    return Response.json({ ok: false, error: "That brochure is not available." }, { status: 404 });

  let file: Buffer;
  try {
    file = await readFile(path.join(BROCHURE_DIR, brochure.file));
  } catch {
    return Response.json({ ok: false, error: "That brochure is not available." }, { status: 404 });
  }

  return new Response(new Uint8Array(file), {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-length": String(file.byteLength),
      "content-disposition": `attachment; filename="${brochure.file}"`,
      // A grant is short-lived and personal; nothing in front of this route may keep a copy.
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
