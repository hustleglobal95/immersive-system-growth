import { z } from "zod";
import { requireStudioRole, studioAccessErrorResponse } from "@/src/platform/studioAccess";
import {
  analyzeStudioReferenceScreenshots,
  referenceAnalyzerConfigured,
  referenceScreenshotSchema,
} from "@/src/platform/referenceAnalyzer";
import { studioReferenceSchema } from "@/src/platform/studioReference";

export const runtime="nodejs";

const requestSchema=z.object({
  reference:studioReferenceSchema,
  screenshots:z.array(referenceScreenshotSchema).min(1).max(4),
}).strict();

export async function POST(request:Request) {
  try {
    await requireStudioRole(request,"designer");
  } catch(error) {
    return studioAccessErrorResponse(error) ?? Response.json({ok:false,error:"Reference analysis access failed."},{status:500});
  }

  const size=Number(request.headers.get("content-length") ?? 0);
  if(Number.isFinite(size) && size>16_000_000) {
    return Response.json({ok:false,error:"Reference analysis request is too large."},{status:413});
  }
  if(!referenceAnalyzerConfigured(process.env)) {
    return Response.json({ok:false,error:"Reference analysis AI is not configured."},{status:503});
  }

  try {
    const input=requestSchema.parse(await request.json());
    const reference=await analyzeStudioReferenceScreenshots({
      reference:input.reference,
      screenshots:input.screenshots,
    });
    return Response.json({ok:true,reference});
  } catch(error) {
    const message=error instanceof Error ? error.message : "Reference analysis failed.";
    return Response.json({ok:false,error:message},{status:422});
  }
}
