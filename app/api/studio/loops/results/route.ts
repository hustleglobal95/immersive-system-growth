import fs from "node:fs/promises";
import path from "node:path";
import { loopRunReportSchema } from "@/src/platform/loops/loopSchema";
import { parseExperience } from "@/src/lib/configSchema";
import { parseAssetManifest } from "@/src/platform/assetManifestSchema";
import { parseInteractionGraph } from "@/src/lib/interactionGraph";
import { requireStudioRole, studioAccessErrorResponse } from "@/src/platform/studioAccess";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const slug=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function GET(request:Request) {
  try {
    await requireStudioRole(request,"reviewer");
    const url=new URL(request.url);
    const projectId=url.searchParams.get("project") ?? "";
    const loopId=url.searchParams.get("loop") ?? "";
    const proposalId=url.searchParams.get("proposal") ?? "";
    if(!slug.test(projectId) || !slug.test(loopId) || !slug.test(proposalId)) {
      return Response.json({ok:false,error:"Valid project, loop and proposal IDs are required."},{status:400});
    }

    const root=path.resolve(process.cwd(),"test-results","forge-loops");
    const directories=await fs.readdir(root,{withFileTypes:true}).catch(()=>[]);
    const names=directories.filter((entry)=>entry.isDirectory() && entry.name.endsWith("-"+loopId)).map((entry)=>entry.name).sort().reverse();

    for(const name of names) {
      const workRoot=path.join(root,name);
      const reportPath=path.join(workRoot,"run-report.json");
      const raw=await fs.readFile(reportPath,"utf8").catch(()=>null);
      if(!raw) continue;
      const parsed=loopRunReportSchema.safeParse(JSON.parse(raw));
      if(!parsed.success) continue;
      const report=parsed.data;
      if(report.projectId!==projectId || report.loopId!==loopId) continue;
      if(report.controlPlane?.proposalId!==proposalId) continue;
      if(!["completed","stopped"].includes(report.status) || report.acceptedImprovements<1) continue;
      if(!report.acceptedExperiencePath || !report.acceptedAssetManifestPath || !report.acceptedInteractionGraphPath) continue;

      const experiencePath=safeArtifactPath(root,report.acceptedExperiencePath);
      const manifestPath=safeArtifactPath(root,report.acceptedAssetManifestPath);
      const graphPath=safeArtifactPath(root,report.acceptedInteractionGraphPath);
      if(!experiencePath || !manifestPath || !graphPath) continue;

      const [experienceRaw,manifestRaw,graphRaw]=await Promise.all([
        fs.readFile(experiencePath,"utf8"),
        fs.readFile(manifestPath,"utf8"),
        fs.readFile(graphPath,"utf8"),
      ]);
      const experience=parseExperience(JSON.parse(experienceRaw));
      const assetManifest=parseAssetManifest(JSON.parse(manifestRaw));
      const interactionGraph=parseInteractionGraph(JSON.parse(graphRaw));
      const acceptedCycle=[...report.cycles].reverse().find((cycle)=>cycle.acceptedCandidateId);
      const evidence=acceptedCycle?.candidates.find((candidate)=>candidate.id===acceptedCycle.acceptedCandidateId);

      const response=Response.json({
        ok:true,
        found:true,
        candidate:{
          runId:report.runId,
          loopId:report.loopId,
          projectId,
          sourceVersionId:report.sourceVersionId,
          proposalId:report.controlPlane.proposalId,
          selectionKey:report.controlPlane.selectionKey,
          baselineFingerprint:report.controlPlane.baselineFingerprint,
          fingerprint:report.currentFingerprint,
          repairSummary:evidence?.repairSummary ?? [],
          preferenceAgreement:evidence?.preferenceAgreement ?? null,
          experience,
          assetManifest,
          interactionGraph,
        },
      });
      response.headers.set("cache-control","no-store");
      return response;
    }

    const response=Response.json({ok:true,found:false});
    response.headers.set("cache-control","no-store");
    return response;
  } catch(error) {
    const access=studioAccessErrorResponse(error);
    if(access) return access;
    return Response.json({ok:false,error:error instanceof Error ? error.message : "Could not read Loop Engine result."},{status:500});
  }
}

function safeArtifactPath(root:string,value:string) {
  const resolved=path.resolve(value);
  const prefix=root.endsWith(path.sep) ? root : root+path.sep;
  return resolved.startsWith(prefix) ? resolved : null;
}
