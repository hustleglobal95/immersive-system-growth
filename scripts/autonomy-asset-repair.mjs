import fs from "node:fs/promises";
import path from "node:path";
import { buildAssetQualityCandidate } from "../src/platform/assetQuality.ts";

const options=args(process.argv.slice(2));
const experiencePath=String(options.experience || "config/experience.json");
const manifestPath=String(options.manifest || "config/asset-manifest.json");
const outputRoot=String(options.output || "test-results/autonomy-asset-repair");
const strategy=String(options.strategy || "canonical-reuse");
if(!["registered-derivative","canonical-reuse"].includes(strategy)) {
  console.error("Unknown Asset Quality strategy: "+strategy);
  process.exit(2);
}
const experience=JSON.parse(await fs.readFile(experiencePath,"utf8"));
const manifest=JSON.parse(await fs.readFile(manifestPath,"utf8"));
const candidate=buildAssetQualityCandidate(experience,manifest,strategy);
await fs.mkdir(outputRoot,{recursive:true});
const plan={
  version:1,
  worker:"asset-repair",
  strategy,
  changed:candidate.changed,
  replacements:candidate.replacements,
  removedManifestPaths:candidate.removedManifestPaths,
  before:{
    manifestHealth:candidate.profileBefore.intelligence.score,
    referencedBytes:candidate.profileBefore.referencedBytes,
    duplicateHashes:candidate.profileBefore.intelligence.duplicateHashes.length,
  },
  after:{
    manifestHealth:candidate.profileAfter.intelligence.score,
    referencedBytes:candidate.profileAfter.referencedBytes,
    duplicateHashes:candidate.profileAfter.intelligence.duplicateHashes.length,
  },
  summary:candidate.summary,
};
await fs.writeFile(path.join(outputRoot,"repair-plan.json"),JSON.stringify(plan,null,2)+"\n");
if(!candidate.changed) {
  await fs.writeFile(path.join(outputRoot,"repair-result.json"),JSON.stringify({ok:false,errors:[candidate.summary.at(-1) || "No safe Asset Quality change was available."]},null,2)+"\n");
  console.error(candidate.summary.at(-1) || "No safe Asset Quality change was available.");
  process.exitCode=2;
} else {
  await fs.writeFile(path.join(outputRoot,"candidate-experience.json"),JSON.stringify(candidate.experience,null,2)+"\n");
  await fs.writeFile(path.join(outputRoot,"candidate-asset-manifest.json"),JSON.stringify(candidate.assetManifest,null,2)+"\n");
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
