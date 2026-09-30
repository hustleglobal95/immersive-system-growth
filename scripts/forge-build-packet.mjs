import fs from "node:fs/promises";
import path from "node:path";
import { parseDirectorBrief } from "../src/platform/directorSchema.ts";
import { runDirectorIntelligence } from "../src/platform/director-intelligence/orchestrator.ts";
import { buildForgeBuildPacket } from "../src/platform/buildPacket.ts";
import { blueprintToDirectorBrief, parseInteractive3DBlueprint } from "../src/platform/interactive3dBlueprint.ts";
import { inferPromptIntelligence } from "../src/platform/autonomy/promptIntelligence.ts";
import { parseExperience } from "../src/lib/configSchema.ts";
import { parseAssetManifest } from "../src/platform/assetManifestSchema.ts";
import { loadCreativeContext } from "./lib/creative-context.mjs";
import { applyReferenceAnalysesToBrief, classifyPromptUrls, loadReferenceAnalyses, parseDelimitedList, summarizeReferenceAnalyses } from "./lib/reference-intelligence.mjs";

const options=Object.fromEntries(process.argv.slice(2).filter((arg)=>arg.startsWith("--")&&arg.includes("=")).map((arg)=>arg.slice(2).split(/=(.*)/s,2)));
const briefPath=String(options.brief || "config/director-brief.example.json");
const blueprintPath=String(options.blueprint || "").trim();
const output=String(options.output || "");
const promptFile=String(options["prompt-file"] || "").trim();
const prompt=promptFile ? (await fs.readFile(path.resolve(promptFile),"utf8")).trim() : String(options.prompt || "").trim();
const projectName=String(options.name || "Forge Project").trim().slice(0,100);
const referenceAnalysisPaths=parseDelimitedList(options["reference-analysis"]);
const businessUrls=parseDelimitedList(options["business-url"]);
const referenceUrls=parseDelimitedList(options["reference-url"]);
const supportingUrls=parseDelimitedList(options["supporting-url"]);
if(blueprintPath&&prompt) throw new Error("Pass either --blueprint or --prompt, not both.");
const [briefRaw,experience,assetManifest,interactionGraph,cinematicSystems,repoContract,blueprintRaw]=await Promise.all([
  prompt ? Promise.resolve("") : fs.readFile(briefPath,"utf8"),
  fs.readFile(String(options.experience || "config/experience.json"),"utf8"),
  fs.readFile(String(options.manifest || "config/asset-manifest.json"),"utf8"),
  fs.readFile(String(options.graph || "config/interaction-graph.json"),"utf8"),
  fs.readFile(String(options.cinematic || "config/cinematic-systems.json"),"utf8"),
  fs.readFile("CLAUDE.md","utf8"),
  blueprintPath ? fs.readFile(path.resolve(blueprintPath),"utf8") : Promise.resolve(""),
]);
const parsedExperience=parseExperience(JSON.parse(experience));
const parsedManifest=parseAssetManifest(JSON.parse(assetManifest));
const interactive3dBlueprint=blueprintRaw ? parseInteractive3DBlueprint(JSON.parse(blueprintRaw)) : null;
const inferredBrief=interactive3dBlueprint
  ? blueprintToDirectorBrief(interactive3dBlueprint)
  : prompt
    ? inferPromptIntelligence({prompt,projectName,sceneCount:parsedExperience.scenes.length,manifest:parsedManifest}).brief
    : parseDirectorBrief(JSON.parse(briefRaw));
const urlClassification=prompt
  ? classifyPromptUrls(prompt,{businessUrls,referenceUrls,supportingUrls})
  : {detected:[],groups:{business:[],reference:[],supporting:[]},unclassified:[],notInPrompt:[]};
if(urlClassification.unclassified.length) {
  throw new Error("Unclassified URL(s) in Forge request: "+urlClassification.unclassified.join(", ")+". Label the URL as business/reference/supporting or pass --business-url/--reference-url/--supporting-url.");
}
if(urlClassification.notInPrompt.length) {
  throw new Error("Classified URL was not present in the request: "+urlClassification.notInPrompt.join(", "));
}
if(urlClassification.groups.reference.length&&!referenceAnalysisPaths.length) {
  throw new Error("Reference-driven Forge build is blocked until every reference URL has a validated deconstruction. Pass --reference-analysis=<file[;file]>.");
}
const referenceRows=await loadReferenceAnalyses(referenceAnalysisPaths,urlClassification.groups.reference);
const brief=applyReferenceAnalysesToBrief(inferredBrief,referenceRows);
const creativeContext=await loadCreativeContext(brief.projectName);
const director=runDirectorIntelligence({
  brief,
  ...(creativeContext.memory.nodes.length ? {memory:creativeContext.memory}:{}),
  ...(creativeContext.portfolio.length ? {portfolio:creativeContext.portfolio}:{}),
});
const packet=buildForgeBuildPacket({
  director,
  currentState:{
    experience:parsedExperience,
    assetManifest:parsedManifest,
    interactionGraph:JSON.parse(interactionGraph),
    cinematicSystems:JSON.parse(cinematicSystems),
  },
  repoContract,
  externalReferenceIntelligence:summarizeReferenceAnalyses(referenceRows),
  interactive3dBlueprint:interactive3dBlueprint ?? undefined,
});
if(output) {
  const target=path.resolve(output);
  await fs.mkdir(path.dirname(target),{recursive:true});
  await fs.writeFile(target,packet+"\n","utf8");
  console.log("Forge Build Packet written to "+output);
} else {
  console.log(packet);
}
