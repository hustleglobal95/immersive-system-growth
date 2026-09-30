import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { planInteractive3DFromPrompt } from "../src/platform/interactive3dPlanner.ts";
import { aiGatewayInteractive3DPlannerConfigured, refineInteractive3DBlueprintWithAi } from "../src/platform/autonomy/aiGatewayInteractive3DPlanner.ts";
import { resolveInteractive3DGeneratedAssets } from "../src/platform/interactive3dAssetFactory.ts";
import { compileInteractive3DBlueprint } from "../src/platform/interactive3dCompiler.ts";
import { materializeInteractive3DExperience } from "../src/platform/interactive3dMaterializer.ts";
import { evaluateInteractive3DAutobuildReadiness } from "../src/platform/interactive3dAutobuild.ts";

const options = args(process.argv.slice(2));
const prompt = await resolvePrompt(options);
const projectName = String(options.name || inferName(prompt)).trim().slice(0, 100);
const projectId = slug(String(options.project || projectName));
const outputRoot = path.resolve(String(options.output || path.join("test-results","interactive3d-autobuild",projectId)));
const experiencePath = path.resolve(String(options.experience || "config/experience.json"));
const manifestPath = path.resolve(String(options.manifest || "config/asset-manifest.json"));
const graphPath = path.resolve(String(options.graph || "config/interaction-graph.json"));
const cinematicPath = path.resolve(String(options.cinematic || "config/cinematic-systems.json"));
const [experience,manifest] = await Promise.all([
  fs.readFile(experiencePath,"utf8").then(JSON.parse),
  fs.readFile(manifestPath,"utf8").then(JSON.parse),
]);
const heroAsset = options["hero-asset"]
  ? {
      id: String(options["hero-id"] || "owned-hero"),
      label: String(options["hero-label"] || projectName + " hero asset"),
      type: String(options["hero-type"] || "model"),
      source: String(options["hero-asset"]),
    }
  : undefined;

await fs.mkdir(outputRoot,{recursive:true});
const base = planInteractive3DFromPrompt({prompt,projectName,experience,manifest,heroAsset});
let blueprint = base.blueprint;
const aiRequested = bool(options.ai, true);
const aiConfigured = aiGatewayInteractive3DPlannerConfigured(process.env);
const strict = bool(options.strict, false);
if (strict && (!aiRequested || !aiConfigured)) {
  fail("Strict autonomous 3D production requires the bounded AI planner and AI Gateway credentials.");
}
if (aiRequested && aiConfigured) {
  blueprint = await refineInteractive3DBlueprintWithAi({ prompt, base: blueprint });
} else if (bool(options["require-ai"], false) && !aiConfigured) {
  fail("AI planning was required but AI Gateway credentials are not configured.");
}
await write("01-blueprint.json", blueprint);

let workingManifest = manifest;
const generationRequested = bool(options["generate-assets"], false);
let assetResolution = { tickets: [], promoted: [] };
if (generationRequested) {
  const resolved = await resolveInteractive3DGeneratedAssets({
    blueprint,
    manifest: workingManifest,
    projectId,
    awaitCompletion: bool(options["await-assets"], true),
    pollIntervalMs: integer(options["asset-poll-ms"], 5000),
    maxWaitMs: integer(options["asset-timeout-ms"], 600000),
  });
  blueprint = resolved.blueprint;
  workingManifest = resolved.manifest;
  assetResolution = { tickets: resolved.tickets, promoted: resolved.promoted };
  await write("02-resolved-blueprint.json", blueprint);
  await write("02-asset-manifest.json", workingManifest);
}

const compilePlan = compileInteractive3DBlueprint(blueprint);
await write("03-compile-plan.json", compilePlan);
if (bool(options["plan-only"], false)) {
  await write("autobuild-report.json", report({materialized:false,loop:null}));
  console.log("FORGE INTERACTIVE 3D PLAN COMPLETE");
  console.log(outputRoot);
  process.exit(0);
}

const materialized = materializeInteractive3DExperience({blueprint,experience});
await write("04-signature-experience.json", materialized.experience);
const unresolvedHero = !materialized.assetReadiness.ready;
if (unresolvedHero && strict) {
  await write("autobuild-report.json", report({materialized:true,loop:null}));
  fail(materialized.assetReadiness.blockers.join(" "));
}

let constructionLoop = null;
let visualPolishLoop = null;
let finalExperienceSource = path.join(outputRoot,"04-signature-experience.json");
let finalManifestSource = generationRequested ? path.join(outputRoot,"02-asset-manifest.json") : manifestPath;
let finalGraphSource = graphPath;
const loopsRequested = bool(options.loop, true);
const polishRequested = loopsRequested && bool(options.polish, true);

if (loopsRequested && !unresolvedHero) {
  constructionLoop = await runForgeLoop({
    loopId:"construction",
    output:path.join(outputRoot,"construction-loop"),
    experience:finalExperienceSource,
    manifest:finalManifestSource,
    graph:finalGraphSource,
    cycles:integer(options.cycles,3),
    candidates:integer(options.candidates,3),
  });
  if (constructionLoop.code === 0 && constructionLoop.report) {
    finalExperienceSource = constructionLoop.report.acceptedExperiencePath || finalExperienceSource;
    finalManifestSource = constructionLoop.report.acceptedAssetManifestPath || finalManifestSource;
    finalGraphSource = constructionLoop.report.acceptedInteractionGraphPath || finalGraphSource;
  }
  if (constructionLoop.code !== 0 && strict) {
    const current=report({materialized:true,constructionLoop,visualPolishLoop});
    await write("autobuild-report.json",current);
    fail("Construction loop failed closed. Inspect "+constructionLoop.reportPath);
  }

  if (polishRequested && constructionLoop.code === 0) {
    visualPolishLoop = await runForgeLoop({
      loopId:"visual-polish",
      output:path.join(outputRoot,"visual-polish-loop"),
      experience:finalExperienceSource,
      manifest:finalManifestSource,
      graph:finalGraphSource,
      cycles:integer(options["polish-cycles"],2),
      candidates:integer(options["polish-candidates"],3),
    });
    if (visualPolishLoop.code === 0 && visualPolishLoop.report) {
      finalExperienceSource = visualPolishLoop.report.acceptedExperiencePath || finalExperienceSource;
      finalManifestSource = visualPolishLoop.report.acceptedAssetManifestPath || finalManifestSource;
      finalGraphSource = visualPolishLoop.report.acceptedInteractionGraphPath || finalGraphSource;
    }
    if (visualPolishLoop.code !== 0 && strict) {
      const current=report({materialized:true,constructionLoop,visualPolishLoop});
      await write("autobuild-report.json",current);
      fail("Visual-polish loop failed closed. Inspect "+visualPolishLoop.reportPath);
    }
  }
}

if (loopsRequested && unresolvedHero) {
  console.log("Rendered loops skipped: the signature-critical hero asset is unresolved.");
}

const finalExperienceArtifact=path.join(outputRoot,"05-final-experience.json");
const finalManifestArtifact=path.join(outputRoot,"05-final-asset-manifest.json");
const finalGraphArtifact=path.join(outputRoot,"05-final-interaction-graph.json");
await fs.copyFile(finalExperienceSource,finalExperienceArtifact);
await fs.copyFile(finalManifestSource,finalManifestArtifact);
await fs.copyFile(finalGraphSource,finalGraphArtifact);

const finalReport=report({materialized:true,constructionLoop,visualPolishLoop});
await write("autobuild-report.json",finalReport);
if(strict && !finalReport.autonomousProductionReady) {
  fail("Strict autonomous 3D production did not earn production-ready status. Inspect "+path.join(outputRoot,"autobuild-report.json"));
}
console.log("FORGE INTERACTIVE 3D AUTOBUILD COMPLETE");
console.log("Blueprint: "+path.join(outputRoot,generationRequested ? "02-resolved-blueprint.json" : "01-blueprint.json"));
console.log("Signature experience: "+path.join(outputRoot,"04-signature-experience.json"));
console.log("Final experience: "+finalExperienceArtifact);
if(!aiConfigured) console.log("AI planner: deterministic baseline only (AI Gateway not configured)");
if(unresolvedHero) console.log("Asset readiness: BLOCKED until signature asset generation/promotion completes");
if(!finalReport.autonomousProductionReady) {
  console.log("Production readiness: BLOCKED · "+finalReport.readiness.blockers.join(" | "));
}

function report(input){
  const readiness=evaluateInteractive3DAutobuildReadiness({
    materialized:input.materialized,
    signatureReady:!unresolvedHero,
    aiRequested,
    aiConfigured,
    aiUsed:aiRequested&&aiConfigured,
    construction:input.constructionLoop,
    visualPolish:input.visualPolishLoop,
  });
  return {
    version:1,
    projectId,projectName,prompt,
    generatedAt:new Date().toISOString(),
    planner:{aiRequested,aiConfigured,aiUsed:aiRequested&&aiConfigured},
    blueprint:{archetype:blueprint.experience.archetype,signatureSceneId:blueprint.experience.signatureSceneId},
    assets:{
      generationRequested,
      tickets:assetResolution.tickets,
      promoted:assetResolution.promoted,
      signatureReady:!unresolvedHero,
      blockers:input.materialized ? materialized.assetReadiness.blockers : [],
    },
    materialized:input.materialized,
    loop:input.constructionLoop,
    loops:{
      construction:input.constructionLoop,
      visualPolish:input.visualPolishLoop,
    },
    finalArtifacts:{
      experience:"05-final-experience.json",
      assetManifest:"05-final-asset-manifest.json",
      interactionGraph:"05-final-interaction-graph.json",
    },
    readiness,
    autonomousProductionReady:readiness.ready,
  };
}

async function runForgeLoop(input){
  const result=await run(process.execPath,[
    "--import","tsx","scripts/loop-run.mjs",
    "--loop",input.loopId,
    "--experience",input.experience,
    "--manifest",input.manifest,
    "--graph",input.graph,
    "--cinematic",cinematicPath,
    "--context",prompt,
    "--output",input.output,
    "--cycles",String(input.cycles),
    "--candidates",String(input.candidates),
  ]);
  const reportPath=path.join(input.output,"run-report.json");
  return {code:result.code,reportPath,report:await readJson(reportPath,null)};
}
async function resolvePrompt(opts){
  if(opts.prompt) return String(opts.prompt).trim();
  if(opts["prompt-file"]) return (await fs.readFile(path.resolve(String(opts["prompt-file"])),"utf8")).trim();
  fail("Pass --prompt or --prompt-file.");
}
async function write(name,value){ await fs.writeFile(path.join(outputRoot,name),JSON.stringify(value,null,2)+"\n"); }
async function readJson(file,fallback){ try{return JSON.parse(await fs.readFile(file,"utf8"));}catch{return fallback;} }
function run(command,argv){return new Promise((resolve,reject)=>{const child=spawn(command,argv,{stdio:"inherit",env:process.env});child.on("error",reject);child.on("exit",(code)=>resolve({code:code??1}));});}
function bool(value,fallback){if(value===undefined)return fallback;return !["0","false","no","off"].includes(String(value).toLowerCase());}
function integer(value,fallback){const n=Number(value??fallback);return Number.isFinite(n)?Math.max(1,Math.floor(n)):fallback;}
function inferName(value){const cleaned=value.replace(/^(create|build|make|design)\s+(an?\s+)?/i,"").replace(/\s+/g," ").trim();return cleaned.split(/[.;]/)[0].split(/\s+/).slice(0,6).join(" ")||"Forge 3D Project";}
function slug(value){return value.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,64)||"forge-3d-project";}
function args(argv){const out={};for(let i=0;i<argv.length;i++){const arg=argv[i];if(!arg.startsWith("--"))continue;const raw=arg.slice(2);if(raw.includes("=")){const [k,...rest]=raw.split("=");out[k]=rest.join("=");continue;}const next=argv[i+1];if(next&&!next.startsWith("--")){out[raw]=next;i++;}else out[raw]=true;}return out;}
function fail(message){console.error("Forge interactive 3D autobuild failed: "+message);process.exit(2);}
