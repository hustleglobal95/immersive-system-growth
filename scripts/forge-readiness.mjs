import fs from "node:fs";

const env=process.env;
const rows=[];

const has=(name)=>Boolean(env[name]?.trim());
const file=(path)=>fs.existsSync(path);
const all=(...names)=>names.every(has);
const yes=(label,detail)=>rows.push({status:"READY",label,detail});
const hold=(label,detail)=>rows.push({status:"SETUP",label,detail});
const proof=(label,detail)=>rows.push({status:"VERIFY",label,detail});

function internalAccessReady(){
  if(env.STUDIO_AUTH_ENABLED==="false") return true;
  if((env.FORGE_INTERNAL_SESSION_SECRET?.length ?? 0)<32) return false;
  try{
    const users=JSON.parse(env.FORGE_INTERNAL_USERS_JSON ?? "[]");
    return Array.isArray(users)&&users.length>0&&users.every((user)=>user&&typeof user.id==="string"&&typeof user.name==="string"&&typeof user.role==="string"&&/^pbkdf2\$\d+\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+$/.test(user.secretHash ?? ""));
  }catch{return false;}
}
function directorCalibrationReady(){
  if(!has("FORGE_DIRECTOR_JUDGE_URL")||!has("FORGE_DIRECTOR_JUDGE_CALIBRATION_JSON")) return false;
  try{
    const c=JSON.parse(env.FORGE_DIRECTOR_JUDGE_CALIBRATION_JSON);
    return c&&c.sampleSize>=20&&c.pairwiseAgreement>=0.75&&c.lockPrecision>=0.8&&c.falseLockRate<=0.1&&typeof c.judgeId==="string";
  }catch{return false;}
}

const coreFiles=[
  "app/page.tsx",
  "app/studio/page.tsx",
  "src/platform/createExperienceEngine.ts",
  "src/platform/loops/loopRegistry.ts",
  "src/platform/director-intelligence/orchestrator.ts",
  "config/experience.json",
];
coreFiles.every(file)
  ? yes("Core runtime + Studio source","Core application, Studio, Director and Loop source contracts are present.")
  : hold("Core runtime + Studio source","Required checked-in source is missing.");

file(".github/workflows/ci.yml")||file(".github/workflows/forge-ci.yml")||file(".github/workflows/validate.yml")
  ? yes("Hosted CI contract","A GitHub Actions validation workflow exists.")
  : proof("Hosted CI contract","No canonical CI workflow was detected by the readiness script.");

if(env.STUDIO_AUTH_ENABLED==="false"){
  yes("Local Studio access","Authentication is explicitly disabled for local authoring.");
}else if(internalAccessReady()){
  yes("Studio internal access","Session secret and at least one valid internal user are configured.");
}else{
  hold("Studio access","Auth defaults on. Use npm run studio:local for solo local work, or configure FORGE_INTERNAL_SESSION_SECRET + FORGE_INTERNAL_USERS_JSON.");
}

all("FORGE_GITHUB_REPOSITORY","FORGE_GITHUB_TOKEN")
  ? yes("Project Vault","GitHub-backed durable project storage can authenticate.")
  : hold("Project Vault","Set FORGE_GITHUB_REPOSITORY and FORGE_GITHUB_TOKEN for durable checkpoints.");

has("MESHY_API_KEY")
  ? yes("Meshy 3D generation","Server credential is configured.")
  : hold("Meshy 3D generation","MESHY_API_KEY is not configured; import 3D manually or configure Meshy.");

all("HF_API_KEY_ID","HF_API_KEY_SECRET")
  ? yes("Higgsfield image/video generation","Server credentials are configured.")
  : hold("Higgsfield image/video generation","HF_API_KEY_ID / HF_API_KEY_SECRET are not configured.");

all("FORGE_ASSET_VAULT_ENDPOINT","FORGE_ASSET_VAULT_PUBLIC_BASE_URL","FORGE_ASSET_VAULT_TOKEN")
  ? yes("Permanent generated-asset storage","Asset Vault upload + public delivery are configured.")
  : hold("Permanent generated-asset storage","Generated provider output can remain temporary until Asset Vault is configured.");

has("FORGE_VISUAL_CRITIC_URL")
  ? yes("Multimodal visual critic","Comparative rendered review can call the configured critic.")
  : hold("Multimodal visual critic","Visual loops can collect deterministic findings, but cannot self-approve visual improvement without FORGE_VISUAL_CRITIC_URL.");

directorCalibrationReady()
  ? yes("Calibrated Director judge","Rendered creative LOCK/REVISE judgment is configured and calibration clears minimum thresholds.")
  : hold("Calibrated Director judge","Director stays UNVERIFIED without a configured judge and valid calibration record.");

(env.FORGE_LOOP_REMOTE_ENABLED==="true"&&all("FORGE_GITHUB_REPOSITORY","FORGE_GITHUB_TOKEN")&&has("FORGE_VISUAL_CRITIC_URL"))
  ? yes("Remote Loop Engine","Studio can dispatch evidence-gated remote loops.")
  : hold("Remote Loop Engine","Requires FORGE_LOOP_REMOTE_ENABLED=true, GitHub repository/token, and a visual critic.");

(env.FORGE_STUDIO_PUBLISH_ENABLED==="true"&&(env.FORGE_STUDIO_PUBLISH_SECRET?.length ?? 0)>=24&&all("FORGE_GITHUB_REPOSITORY","FORGE_GITHUB_TOKEN"))
  ? yes("Studio review publishing","Review-PR publishing is configured.")
  : hold("Studio review publishing","Publishing is intentionally disabled until the publish secret + GitHub credentials are configured.");

has("NEXT_PUBLIC_SITE_URL")
  ? yes("Production canonical origin","NEXT_PUBLIC_SITE_URL is configured.")
  : hold("Production canonical origin","Set NEXT_PUBLIC_SITE_URL before a production build so metadata/sitemap do not advertise localhost.");

proof("Real-device performance","Headless/browser CI is not proof of physical-device smoothness. Test representative iPhone/Android hardware before shipping a high-end project.");
proof("Autonomous construction scope","Construction Loop currently orchestrates and improves projects inside Forge's existing scene/config/runtime vocabulary. Bespoke React structure, novel shader systems, unusual world logic or new primitives can still require Claude/human code.");
proof("Prompt-to-site reliability","Forge can generate detailed direction and implementation constraints, but there is no truthful guarantee that a model will reproduce an elite reference in one to three attempts. Rendered iteration remains part of the production process.");
proof("Creative ceiling","Forge supplies strong systems and construction intelligence, but world-class output still depends on asset quality, art direction, typography, camera tuning and rendered iteration. A passing build does not certify elite visual quality.");

const rank={READY:0,SETUP:1,VERIFY:2};
console.log("\nFORGE OPERATIONAL READINESS\n");
for(const row of rows.sort((a,b)=>rank[a.status]-rank[b.status])){
  console.log(`${row.status.padEnd(6)}  ${row.label}`);
  console.log(`        ${row.detail}`);
}
const ready=rows.filter((r)=>r.status==="READY").length;
const setup=rows.filter((r)=>r.status==="SETUP").length;
const verify=rows.filter((r)=>r.status==="VERIFY").length;
console.log(`\nSummary: ${ready} ready · ${setup} setup-required · ${verify} external-verification items.`);
console.log("Use npm run verify for code/release gates. Use npm run forge:readiness before starting a client project.");
if(process.argv.includes("--strict")&&setup>0) process.exitCode=1;
