import fs from "node:fs/promises";
import path from "node:path";
import { createTasteProfile, recordPreference } from "../src/platform/director-intelligence/taste.ts";

const arg=(name)=>process.argv.find((item)=>item.startsWith(`--${name}=`))?.slice(name.length+3);
const layer=String(arg("layer") || "studio");
const winnerId=arg("winner");
const loserId=arg("loser");
const reason=arg("reason");
const operatorId=arg("operator");
const projectId=arg("project");
if(!["studio","operator","project"].includes(layer)) throw new Error("--layer must be studio, operator or project.");
if(layer==="operator" && !operatorId) throw new Error("Operator taste requires --operator=<id>.");
if(layer==="project" && !projectId) throw new Error("Project taste requires --project=<id>.");
if(!winnerId || !loserId || !reason) {
  console.error('Usage: npm run director:preference -- --layer=studio|operator|project --winner=<id> --loser=<id> --reason="why" [--operator=<id>] [--project=<id>] [--restraintVsSpectacle=-0.5 ...]');
  process.exit(1);
}

const profilePath=layer==="studio"
  ? "forge-intelligence/taste/profile.json"
  : layer==="operator"
    ? `forge-intelligence/taste/operators/${safe(operatorId)}.json`
    : `forge-intelligence/taste/projects/${safe(projectId)}.json`;

const profile=await readProfile(profilePath);
const allowed=["restraintVsSpectacle","literalVsAbstract","cinematicVsEditorial","continuousVsChaptered","typographyVsImage","darkVsLight","denseVsSparse","directedVsExploratory","realismVsStylization","emotionalVsRational","familiarVsNovel"];
const dimensions={};
for(const key of allowed) {
  const raw=arg(key);
  if(raw===undefined) continue;
  const value=Number(raw);
  if(!Number.isFinite(value) || value < -1 || value > 1) throw new Error(`${key} must be between -1 and 1.`);
  dimensions[key]=value;
}

const next=recordPreference(profile,{
  id:`${layer}-preference-${profile.preferences.length+1}`,
  winnerId,loserId,reasons:[reason],dimensions,createdAt:new Date().toISOString(),
});
await fs.mkdir(path.dirname(profilePath),{recursive:true});
await fs.writeFile(profilePath,JSON.stringify(next,null,2)+"\n");
console.log(`Recorded ${layer} preference ${next.preferences.length} at ${profilePath}; confidence ${(next.confidence*100).toFixed(0)}%.`);

async function readProfile(file) {
  try { return JSON.parse(await fs.readFile(file,"utf8")); }
  catch(error) {
    if(error && typeof error==="object" && "code" in error && error.code==="ENOENT") return createTasteProfile();
    throw error;
  }
}
function safe(value) {
  const normalized=String(value || "").toLowerCase().replace(/[^a-z0-9-]+/g,"-").replace(/^-+|-+$/g,"");
  if(!normalized) throw new Error("Taste layer identifier is empty after normalization.");
  return normalized;
}
