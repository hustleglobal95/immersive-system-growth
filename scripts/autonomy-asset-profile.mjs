import fs from "node:fs/promises";
import path from "node:path";
import { profileAssetQuality } from "../src/platform/assetQuality.ts";

const options=args(process.argv.slice(2));
const experiencePath=String(options.experience || "config/experience.json");
const manifestPath=String(options.manifest || "config/asset-manifest.json");
const outputPath=String(options.output || "test-results/autonomy-assets.json");
const experience=JSON.parse(await fs.readFile(experiencePath,"utf8"));
const manifest=JSON.parse(await fs.readFile(manifestPath,"utf8"));
const profile=profileAssetQuality(experience,manifest);
const missingLocal=await missingLocalAssets(profile.referencedPaths);
const report={
  version:1,
  generatedAt:new Date().toISOString(),
  experience:experiencePath,
  manifest:manifestPath,
  ...profile,
  missingLocal,
  passed:profile.unregisteredLocalPaths.length===0 && missingLocal.length===0,
};
await fs.mkdir(path.dirname(outputPath),{recursive:true});
await fs.writeFile(outputPath,JSON.stringify(report,null,2)+"\n");
console.log("Asset profile: "+Math.round(profile.intelligence.score)+"/100 manifest health · "+profile.referencedBytes+" referenced bytes · "+profile.derivativeOpportunities.length+" registered derivative opportunities.");
if(!report.passed) process.exitCode=2;

async function missingLocalAssets(paths) {
  const missing=[];
  for(const assetPath of paths.filter((value)=>value.startsWith("/"))) {
    try { await fs.access(path.join(process.cwd(),"public",assetPath.slice(1))); }
    catch { missing.push(assetPath); }
  }
  return missing;
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
