import { runDirectorJudge } from "@/src/platform/director-intelligence/judgeClient";
import { requireStudioRole, studioAccessErrorResponse } from "@/src/platform/studioAccess";

export async function POST(request:Request) {
  try {
    await requireStudioRole(request,"director");
  } catch(error) {
    return studioAccessErrorResponse(error) ?? Response.json({ok:false,error:"Director judge access failed"},{status:500});
  }
  try {
    const input=await request.json();
    const judgment=await runDirectorJudge(input);
    return Response.json({ok:true,judgment});
  } catch(error) {
    const message=error instanceof Error?error.message:"Director judgment failed";
    return Response.json({ok:false,error:message},{status:422});
  }
}
