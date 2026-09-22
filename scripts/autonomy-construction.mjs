import fs from "node:fs/promises";
import path from "node:path";
import { parseAssetManifest } from "../src/platform/assetManifestSchema.ts";
import { buildConstructionCandidate } from "../src/platform/constructionWorker.ts";
import { loadCreativeContext } from "./lib/creative-context.mjs";

const options=args(process.argv.slice(2));
const experiencePath=String(options.experience || "config/experience.json");
const manifestPath=String(options.manifest || "config/asset-manifest.json");
const outputRoot=String(options.output || "test-results/autonomy-construction");
const strategy=String(options.strategy || "hierarchy-first");
const context=String(options.context || process.env.FORGE_AUTONOMY_CONTEXT || "").trim();
if(!["hierarchy-first","camera-structure","signature-budget"].includes(strategy)) {
  console.error("Unknown Construction strategy: "+strategy);
  process.exit(2);
}
if(context.length<12) {
  console.error("Construction requires grounded project context; provide --context or FORGE_AUTONOMY_CONTEXT.");
  process.exit(2);
}
const experience=JSON.parse(await fs.readFile(experiencePath,"utf8"));
const manifest=parseAssetManifest(JSON.parse(await fs.readFile(manifestPath,"utf8")));
const creativeContext=await loadCreativeContext(experience?.meta?.name || "Forge Project");
const candidate=buildConstructionCandidate({
  experience,manifest,context,strategy,
  memory:creativeContext.memory,
  portfolio:creativeContext.portfolio,
  antiRepeatContextLoaded:creativeContext.loaded,
});
await fs.mkdir(outputRoot,{recursive:true});
const plan={
  version:1,
  worker:"construction",
  strategy,
  director:candidate.director,
  creativePlan:{
    title:candidate.plan.title,
    thesis:candidate.plan.thesis,
    medium:candidate.plan.medium,
    signatureMoment:candidate.plan.signatureMoment,
    assetSummary:candidate.plan.assetSummary,
    sceneMoves:candidate.plan.sceneMoves.map((move)=>({
      sceneIndex:move.sceneIndex,
      label:move.label,
      role:move.role,
      archetype:move.archetype,
      cameraStrategy:move.cameraStrategy,
      canBuildNow:move.assetPlan.canBuildNow,
      blockers:move.assetPlan.blockers,
    })),
  },
  blockers:candidate.blockers,
  summary:candidate.summary,
};
await fs.writeFile(path.join(outputRoot,"construction-plan.json"),JSON.stringify(plan,null,2)+"\n");
await fs.writeFile(path.join(outputRoot,"repair-plan.json"),JSON.stringify(plan,null,2)+"\n");
if(!candidate.changed) {
  const errors=candidate.blockers.length ? candidate.blockers : ["No bounded Construction change remained after preserving authored state."];
  await fs.writeFile(path.join(outputRoot,"repair-result.json"),JSON.stringify({ok:false,errors,summary:candidate.summary},null,2)+"\n");
  console.error(errors.join(" "));
  process.exitCode=2;
} else {
  await fs.writeFile(path.join(outputRoot,"candidate-experience.json"),JSON.stringify(candidate.experience,null,2)+"\n");
  await fs.writeFile(path.join(outputRoot,"repair-result.json"),JSON.stringify({ok:true,errors:[],summary:candidate.summary},null,2)+"\n");
  console.log(candidate.summary.join(" "));
}

function args(argv) {
  const out={};
  for(let i=0;i<argv.length;i++) {
    const arg=argv[i];
    if(!arg.startsWith("--")) continue;
    const key=arg.slice(2);
    const next=argv[i+1];
    if(next && !next.startsWith("--")) { out[key]=next;i++; }
    else out[key]=true;
  }
  return out;
}
