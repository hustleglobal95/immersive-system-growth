import { requireStudioRole, studioAccessErrorResponse } from "@/src/platform/studioAccess";
import { readVaultProject } from "@/src/platform/studioVault";
import { projectStateFingerprint } from "@/src/platform/control-plane/projectState";

export const runtime="nodejs";

const slug=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const fingerprint=/^[a-f0-9]{16,128}$/;

export async function POST(request:Request) {
  try {
    await requireStudioRole(request,"director");
    if(process.env.FORGE_LOOP_REMOTE_ENABLED!=="true") {
      return Response.json({ok:false,error:"Remote Loop execution is not enabled. Configure the Forge Loop GitHub Action secrets and set FORGE_LOOP_REMOTE_ENABLED=true."},{status:503});
    }
    const repository=process.env.FORGE_GITHUB_REPOSITORY ?? "";
    const token=process.env.FORGE_GITHUB_TOKEN ?? "";
    if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository) || !token) {
      return Response.json({ok:false,error:"Remote Loop execution requires FORGE_GITHUB_REPOSITORY and FORGE_GITHUB_TOKEN."},{status:503});
    }
    const size=Number(request.headers.get("content-length") ?? 0);
    if(!Number.isFinite(size) || size>20_000) return Response.json({ok:false,error:"Loop request is too large."},{status:413});
    const origin=request.headers.get("origin");
    if(origin && origin!==new URL(request.url).origin) return Response.json({ok:false,error:"Cross-origin Loop dispatch is blocked."},{status:403});

    const body=await request.json() as Record<string,unknown>;
    const projectId=String(body.projectId ?? "");
    const loopId=String(body.loopId ?? "");
    const proposalId=String(body.proposalId ?? "");
    const selectionKey=String(body.selectionKey ?? "");
    const baselineFingerprint=String(body.baselineFingerprint ?? "");
    const context=String(body.context ?? "").trim().slice(0,1800);
    if(!slug.test(projectId) || !slug.test(loopId) || !slug.test(proposalId) || !selectionKey || !fingerprint.test(baselineFingerprint) || !context) {
      return Response.json({ok:false,error:"Loop dispatch requires valid project, loop, proposal, selection, baseline and context values."},{status:400});
    }

    const snapshot=await readVaultProject(projectId);
    if(!snapshot) return Response.json({ok:false,error:"Save the current project to Project Vault before running an improvement Loop."},{status:409});
    const actual=projectStateFingerprint({
      experience:snapshot.experience,
      assetManifest:snapshot.assetManifest,
      interactionGraph:snapshot.interactionGraph,
      cinematicSystems:snapshot.cinematicSystems,
    });
    if(actual!==baselineFingerprint) {
      return Response.json({ok:false,error:"The Project Vault checkpoint does not match this proposal. Save the current project and prepare the proposal again."},{status:409});
    }

    const base=snapshot.project.deployment.productionBranch;
    if(!/^[A-Za-z0-9._/-]+$/.test(base) || base.includes("..")) {
      return Response.json({ok:false,error:"Project production branch is invalid."},{status:400});
    }

    const response=await fetch(`https://api.github.com/repos/${repository}/actions/workflows/forge-loop.yml/dispatches`,{
      method:"POST",
      headers:{
        accept:"application/vnd.github+json",
        authorization:`Bearer ${token}`,
        "content-type":"application/json",
        "x-github-api-version":"2022-11-28",
      },
      body:JSON.stringify({
        ref:base,
        inputs:{
          project_id:projectId,
          loop_id:loopId,
          proposal_id:proposalId,
          selection_key:selectionKey,
          baseline_fingerprint:baselineFingerprint,
          context,
        },
      }),
      cache:"no-store",
    });
    if(!response.ok) {
      const detail=(await response.text()).slice(0,300);
      throw new Error(`GitHub Actions dispatch failed (${response.status}): ${detail}`);
    }
    const [owner,name]=repository.split("/");
    return Response.json({
      ok:true,
      queued:true,
      workflowUrl:`https://github.com/${owner}/${name}/actions/workflows/forge-loop.yml`,
      message:"Forge Loop queued. The verified winner will be written to Project Vault when the run proves an improvement.",
    },{status:202});
  } catch(error) {
    const access=studioAccessErrorResponse(error);
    if(access) return access;
    return Response.json({ok:false,error:error instanceof Error ? error.message : "Could not dispatch Forge Loop."},{status:500});
  }
}
