import { executableLoopDefinitions } from "@/src/platform/loops/loopRegistry";
import { requireStudioRole, studioAccessErrorResponse } from "@/src/platform/studioAccess";
import { vaultConfiguration } from "@/src/platform/studioVault";

export const runtime="nodejs";

export async function GET(request:Request) {
  try {
    const identity=await requireStudioRole(request,"reviewer");
    const vault=vaultConfiguration();
    const response=Response.json({
      ok:true,
      role:identity.role,
      visualCriticConnected:Boolean(process.env.FORGE_VISUAL_CRITIC_URL || process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN),
      vaultConfigured:vault.configured,
      remoteRunnerEnabled:process.env.FORGE_LOOP_REMOTE_ENABLED==="true" && Boolean(process.env.FORGE_GITHUB_REPOSITORY && process.env.FORGE_GITHUB_TOKEN && (process.env.FORGE_VISUAL_CRITIC_URL || process.env.AI_GATEWAY_API_KEY)),
      executableLoops:executableLoopDefinitions().map((loop)=>loop.id),
    });
    response.headers.set("cache-control","no-store");
    return response;
  } catch(error) {
    const access=studioAccessErrorResponse(error);
    if(access) return access;
    return Response.json({ok:false,error:error instanceof Error ? error.message : "Could not read Loop Engine status"},{status:500});
  }
}
