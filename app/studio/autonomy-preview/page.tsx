import fs from "node:fs";
import path from "node:path";
import { notFound } from "next/navigation";
import rawExperience from "@/config/experience.json";
import { parseExperience } from "@/src/lib/configSchema";
import { AutonomyPreviewClient } from "@/src/studio/AutonomyPreviewClient";

export const dynamic = "force-dynamic";

export default async function AutonomyPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ progress?: string; viewport?: string }>;
}) {
  if (process.env.FORGE_AUTONOMY_PREVIEW !== "1") notFound();
  const params=await searchParams;
  const progress=clamp(Number(params.progress ?? "0"));
  const viewport=params.viewport==="mobile" ? "mobile" : "desktop";
  const candidatePath=process.env.FORGE_AUTONOMY_EXPERIENCE_PATH;
  const raw=candidatePath
    ? JSON.parse(fs.readFileSync(path.resolve(candidatePath),"utf8"))
    : rawExperience;
  const experience=parseExperience(raw);
  return <AutonomyPreviewClient experience={experience} progress={progress} viewport={viewport} />;
}

function clamp(value:number) {
  if(!Number.isFinite(value)) return 0;
  return Math.max(0,Math.min(1,value));
}
