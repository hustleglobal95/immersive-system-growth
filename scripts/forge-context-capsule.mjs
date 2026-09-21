import fs from "node:fs/promises";
import path from "node:path";
import { parseDirectorBrief } from "../src/platform/directorSchema.ts";
import { runDirectorIntelligence } from "../src/platform/director-intelligence/orchestrator.ts";
import { inferPromptIntelligence } from "../src/platform/autonomy/promptIntelligence.ts";
import { parseExperience } from "../src/lib/configSchema.ts";
import { parseAssetManifest } from "../src/platform/assetManifestSchema.ts";
import { parseInteractionGraph } from "../src/lib/interactionGraph.ts";
import { buildCreativeStateGraph, buildSignatureSliceGate } from "../src/platform/agentic/creativeStateGraph.ts";
import { compileAgentContext } from "../src/platform/agentic/contextCompiler.ts";

const options=Object.fromEntries(process.argv.slice(2).filter((arg)=>arg.startsWith("--")&&arg.includes("=")).map((arg)=>arg.slice(2).split(/=(.*)/s,2)));
const domain=String(options.domain || "").trim();
const domains=new Set(["camera","motion","composition","typography","interaction","asset","mobile","performance","engineering","director"]);
if(!domains.has(domain)) {
  console.error("Use --domain=camera|motion|composition|typography|interaction|asset|mobile|performance|engineering|director");
  process.exit(2);
}
const objective=String(options.objective || "").trim();
if(!objective) {
  console.error("--objective is required so the capsule remains task-scoped.");
  process.exit(2);
}
const prompt=String(options.prompt || "").trim();
const projectName=String(options.name || "Forge Project").trim().slice(0,100);
const briefPath=String(options.brief || "config/director-brief.example.json");
const output=String(options.output || "");
const [briefRaw,experienceRaw,manifestRaw,graphRaw]=await Promise.all([
  prompt ? Promise.resolve("") : fs.readFile(briefPath,"utf8"),
  fs.readFile(String(options.experience || "config/experience.json"),"utf8"),
  fs.readFile(String(options.manifest || "config/asset-manifest.json"),"utf8"),
  fs.readFile(String(options.graph || "config/interaction-graph.json"),"utf8"),
]);
const experience=parseExperience(JSON.parse(experienceRaw));
const assetManifest=parseAssetManifest(JSON.parse(manifestRaw));
const interactionGraph=parseInteractionGraph(JSON.parse(graphRaw));
const brief=prompt
  ? inferPromptIntelligence({prompt,projectName,sceneCount:experience.scenes.length,manifest:assetManifest}).brief
  : parseDirectorBrief(JSON.parse(briefRaw));
const director=runDirectorIntelligence({brief});
const creativeState=buildCreativeStateGraph(director);
const signature=buildSignatureSliceGate(creativeState);
const requestedScene=String(options.scene || "").trim();
const sceneId=requestedScene || signature.primarySceneId;
const capsule=compileAgentContext({
  graph:creativeState,
  task:{
    id:String(options.id || "task-"+domain),
    domain,
    objective,
    sceneId,
    finding:options.finding ? String(options.finding) : undefined,
  },
  currentState:{experience,assetManifest,interactionGraph},
});
const payload=JSON.stringify({creativeStateFingerprint:creativeState.fingerprint,signatureSlice:signature,capsule},null,2)+"\n";
if(output) {
  const target=path.resolve(output);
  await fs.mkdir(path.dirname(target),{recursive:true});
  await fs.writeFile(target,payload,"utf8");
  console.log("Forge Context Capsule written to "+target);
} else {
  process.stdout.write(payload);
}
