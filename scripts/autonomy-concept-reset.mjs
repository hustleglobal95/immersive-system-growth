import fs from "node:fs/promises";
import path from "node:path";
import { parseExperience } from "../src/lib/configSchema.ts";
import { parseInteractionGraph } from "../src/lib/interactionGraph.ts";
import { parseAssetManifest } from "../src/platform/assetManifestSchema.ts";
import { applyCreativeRebuildPlan } from "../src/platform/autonomy/creativeRebuild.ts";
import { creativeRebuildConfigured, requestCreativeRebuildPlan } from "../src/platform/autonomy/aiGatewayCreativeRebuild.ts";
import { inferPromptIntelligence } from "../src/platform/autonomy/promptIntelligence.ts";
import { runDirectorIntelligence } from "../src/platform/director-intelligence/orchestrator.ts";
import { loadCreativeContext } from "./lib/creative-context.mjs";

const options=args(process.argv.slice(2));
const experiencePath=String(options.experience || "config/experience.json");
const manifestPath=String(options.manifest || "config/asset-manifest.json");
const graphPath=String(options.graph || "config/interaction-graph.json");
const reportPath=String(options.report || "test-results/autonomy/review-report.json");
const outputRoot=String(options.output || "test-results/autonomy-concept-reset");
const strategy=String(options.strategy || "narrative-reversal");
const projectContext=String(options.context || process.env.FORGE_AUTONOMY_CONTEXT || "").trim();

if(!["narrative-reversal","signature-mechanism","interaction-led"].includes(strategy)) {
  console.error("Unknown Concept Reset strategy: "+strategy);
  process.exit(2);
}
if(projectContext.length<12) {
  console.error("Concept Reset requires grounded project context; provide --context or FORGE_AUTONOMY_CONTEXT.");
  process.exit(2);
}
if(!creativeRebuildConfigured(process.env)) {
  console.error("Concept Reset requires AI Gateway credentials because structural creative rebuilding cannot be safely approximated by fixed heuristics.");
  process.exit(2);
}

const experience=parseExperience(JSON.parse(await fs.readFile(experiencePath,"utf8")));
const manifest=parseAssetManifest(JSON.parse(await fs.readFile(manifestPath,"utf8")));
const interactionGraph=parseInteractionGraph(JSON.parse(await fs.readFile(graphPath,"utf8")));
const report=JSON.parse(await fs.readFile(reportPath,"utf8"));
const captures=await readCaptures(report);
const creativeContext=await loadCreativeContext(experience.meta.name);
const prompt=inferPromptIntelligence({
  prompt:projectContext,
  projectName:experience.meta.name,
  sceneCount:experience.scenes.length,
  manifest,
});
const intelligence=runDirectorIntelligence({
  brief:prompt.brief,
  ...(creativeContext.memory?.nodes?.length ? {memory:creativeContext.memory}:{}),
  ...(creativeContext.portfolio?.length ? {portfolio:creativeContext.portfolio}:{}),
});
const directorContext=[
  projectContext,
  "Forge Director Intelligence:",
  JSON.stringify({
    northStar:intelligence.creativeDNA.northStar,
    signatureMechanism:intelligence.creativeDNA.signatureMechanism,
    visualRule:intelligence.artDirection.visualRule,
    selectedTerritoryId:intelligence.report.treatment.selectedTerritoryId,
    constructionMode:intelligence.constructionPlan.mode,
    typography:intelligence.disciplineDirections.typography.premise,
    lighting:intelligence.disciplineDirections.lighting.premise,
    material:intelligence.disciplineDirections.material.premise,
    cameraRules:intelligence.disciplineDirections.camera.rules.slice(0,4),
    reject:intelligence.artDirection.reject.slice(0,6),
    originalityBlockers:intelligence.originalityGate.blockers.slice(0,6),
  }),
].join("\n");

const plan=await requestCreativeRebuildPlan({
  projectContext:directorContext,
  strategy,
  experience,
  interactionGraph,
  assetManifest:manifest,
  captures,
  environment:process.env,
});
const result=applyCreativeRebuildPlan({experience,interactionGraph,plan});

await fs.mkdir(outputRoot,{recursive:true});
const repairPlan={
  version:1,
  worker:"creative-rebuild",
  strategy,
  commands:[{
    type:"concept.reset",
    input:{
      thesis:plan.thesis,
      sceneCount:plan.sceneBlueprints.length,
      interactionCount:plan.interactionRecipes.length,
    },
    findingIds:[],
    rationale:plan.structuralReason,
  }],
  thesis:plan.thesis,
  failureDiagnosis:plan.failureDiagnosis,
  structuralReason:plan.structuralReason,
  sceneBlueprints:plan.sceneBlueprints,
  interactionRecipes:plan.interactionRecipes,
  assetGaps:plan.assetGaps,
  blockers:result.blockers,
  summary:result.summary,
};
await fs.writeFile(path.join(outputRoot,"repair-plan.json"),JSON.stringify(repairPlan,null,2)+"\n");

if(result.blockers.length) {
  await fs.writeFile(path.join(outputRoot,"repair-result.json"),JSON.stringify({ok:false,errors:result.blockers,summary:result.summary},null,2)+"\n");
  console.error(result.blockers.join(" "));
  process.exitCode=2;
} else {
  await fs.writeFile(path.join(outputRoot,"candidate-experience.json"),JSON.stringify(result.experience,null,2)+"\n");
  await fs.writeFile(path.join(outputRoot,"candidate-interaction-graph.json"),JSON.stringify(result.interactionGraph,null,2)+"\n");
  await fs.writeFile(path.join(outputRoot,"repair-result.json"),JSON.stringify({ok:true,errors:[],summary:result.summary},null,2)+"\n");
  console.log(result.summary.join(" "));
}

async function readCaptures(report) {
  const rows=[];
  if(report.contactSheet && await exists(report.contactSheet)) {
    const data=await fs.readFile(path.resolve(String(report.contactSheet)));
    rows.push({id:"current-concept-contact-sheet",mimeType:"image/jpeg",data:data.toString("base64")});
  }
  for(const capture of report.captures ?? []) {
    if(capture.status!=="captured" || !capture.path || rows.length>=10) continue;
    const capturePath=path.resolve(String(capture.path));
    if(!(await exists(capturePath))) continue;
    const data=await fs.readFile(capturePath);
    rows.push({id:String(capture.id),mimeType:"image/png",data:data.toString("base64")});
  }
  if(rows.length<2) throw new Error("Concept Reset requires at least two rendered incumbent captures.");
  return rows;
}

async function exists(file) {
  try { await fs.access(file); return true; } catch { return false; }
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
