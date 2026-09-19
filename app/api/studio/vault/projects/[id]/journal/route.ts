import { z } from "zod";
import { requireStudioRole, studioAccessErrorResponse } from "@/src/platform/studioAccess";
import { appendVaultJournal, readVaultJournal } from "@/src/platform/studioVault";

export const runtime = "nodejs";

const inputSchema = z.object({
  action: z.enum(["save", "restore", "archive", "unarchive", "publish", "asset-promote", "lesson", "loop-run", "loop-accept", "loop-stop", "loop-escalate"]),
  detail: z.string().min(1).max(1000),
}).strict();

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireStudioRole(request, "reviewer");
    const { id } = await context.params;
    return Response.json({ ok: true, events: await readVaultJournal(id) });
  } catch (error) {
    const access = studioAccessErrorResponse(error);
    if (access) return access;
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Could not read project history" }, { status: 400 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const identity = await requireStudioRole(request, "designer");
    const { id } = await context.params;
    const input = inputSchema.parse(await request.json());
    await appendVaultJournal(id, identity, input.action, input.detail);
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    const access = studioAccessErrorResponse(error);
    if (access) return access;
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Could not append project history" }, { status: 400 });
  }
}
