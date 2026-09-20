import fs from "node:fs";
import path from "node:path";
import { notFound } from "next/navigation";
import rawExperience from "@/config/experience.json";
import { parseExperience } from "@/src/lib/configSchema";
import { AutonomyRuntimeClient } from "@/src/studio/AutonomyRuntimeClient";
import { requireStudioPageAccess } from "@/src/platform/studioPageAccess";

export const dynamic="force-dynamic";

export default async function AutonomyRuntimePage({
  searchParams,
}:{
  searchParams:Promise<{ variant?:string }>;
}) {
  await requireStudioPageAccess("/studio/autonomy-runtime");
  if(process.env.FORGE_AUTONOMY_PREVIEW!=="1") notFound();
  const params=await searchParams;
  const variant=params.variant==="candidate" ? "candidate" : "incumbent";
  const incumbentPath=process.env.FORGE_AUTONOMY_INCUMBENT_PATH;
  const candidatePath=process.env.FORGE_AUTONOMY_CANDIDATE_PATH ?? process.env.FORGE_AUTONOMY_EXPERIENCE_PATH;
  const selectedPath=variant==="candidate" ? candidatePath : incumbentPath;
  const raw=selectedPath
    ? JSON.parse(fs.readFileSync(path.resolve(selectedPath),"utf8"))
    : rawExperience;
  const experience=parseExperience(raw);
  return <AutonomyRuntimeClient experience={experience} variant={variant} />;
}
