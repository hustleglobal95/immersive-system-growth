import fs from "node:fs/promises";
import path from "node:path";
import { parseDirectorBrief } from "../src/platform/directorSchema.ts";
import { runDirectorIntelligence } from "../src/platform/director-intelligence/orchestrator.ts";
import { buildForgeBuildPacket } from "../src/platform/buildPacket.ts";
import { inferPromptIntelligence } from "../src/platform/autonomy/promptIntelligence.ts";
import { parseExperience } from "../src/lib/configSchema.ts";
import { parseAssetManifest } from "../src/platform/assetManifestSchema.ts";
import { loadCreativeContext } from "./lib/creative-context.mjs";
import { applyBrandEvidenceToBrief, parseBrandEvidence } from "../src/platform/autonomy/brandEvidence.ts";

const options=Object.fromEntries(process.argv.slice(2).filter((arg)=>arg.startsWith("--")&&arg.includes("=")).map((arg)=>arg.slice(2).split(/=(.*)/s,2)));
const briefPath=String(options.brief || "config/director-brief.example.json");
const output=String(options.output || "");
const prompt=String(options.prompt || "").trim();
const projectName=String(options.name || "Forge Project").trim().slice(0,100);
const clientWork=String(options["client-work"] || "").toLowerCase()==="true";
const evidencePath=String(options.evidence || "").trim();
const [briefRaw,experience,assetManifest,interactionGraph,cinematicSystems,repoContract]=await Promise.all([
  prompt ? Promise.resolve("") : fs.readFile(briefPath,"utf8"),
  fs.readFile(String(options.experience || "config/experience.json"),"utf8"),
  fs.readFile(String(options.manifest || "config/asset-manifest.json"),"utf8"),
  fs.readFile(String(options.graph || "config/interaction-graph.json"),"utf8"),
  fs.readFile(String(options.cinematic || "config/cinematic-systems.json"),"utf8"),
  fs.readFile("CLAUDE.md","utf8"),
]);
const parsedExperience=parseExperience(JSON.parse(experience));
const parsedManifest=parseAssetManifest(JSON.parse(assetManifest));
const inferredBrief=prompt
  ? inferPromptIntelligence({prompt,projectName,sceneCount:parsedExperience.scenes.length,manifest:parsedManifest}).brief
  : parseDirectorBrief(JSON.parse(briefRaw));
let brandEvidence=null;
if(evidencePath) {
  brandEvidence=parseBrandEvidence(JSON.parse(await fs.readFile(evidencePath,"utf8")));
} else if(clientWork || /https?:\/\//i.test(prompt)) {
  brandEvidence=await discoverBrandEvidence({projectName,prompt});
}
if((clientWork || /https?:\/\//i.test(prompt)) && !brandEvidence) {
  throw new Error("Named-client build blocked: no matching verified first-party brand evidence was found. Create forge-intelligence/projects/<client>.brand-evidence.json or pass --evidence=<path>; generic category priors are not sufficient.");
}
const brief=brandEvidence ? applyBrandEvidenceToBrief(inferredBrief,brandEvidence) : inferredBrief;
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
  ...(brandEvidence ? {brandEvidence}:{}),
});
if(output) {
  const target=path.resolve(output);
  await fs.mkdir(path.dirname(target),{recursive:true});
  await fs.writeFile(target,packet+"\n","utf8");
  console.log("Forge Build Packet written to "+output);
} else {
  console.log(packet);
}


async function discoverBrandEvidence({projectName,prompt}) {
  const root=path.resolve("forge-intelligence/projects");
  let entries=[];
  try {
    entries=await fs.readdir(root,{withFileTypes:true});
  } catch(error) {
    if(error?.code==="ENOENT") return null;
    throw error;
  }
  const targetTokens=meaningfulTokens(projectName+" "+prompt);
  const candidates=[];
  for(const entry of entries.filter((item)=>item.isFile() && item.name.endsWith(".brand-evidence.json"))) {
    const file=path.join(root,entry.name);
    try {
      const evidence=parseBrandEvidence(JSON.parse(await fs.readFile(file,"utf8")));
      const candidateTokens=meaningfulTokens(evidence.clientName+" "+entry.name);
      const overlap=[...candidateTokens].filter((token)=>targetTokens.has(token)).length;
      const score=overlap/Math.max(1,Math.min(candidateTokens.size,targetTokens.size));
      if(overlap>=2) candidates.push({evidence,score,overlap,file});
    } catch {
      // Invalid evidence remains unusable and will be caught when explicitly selected.
    }
  }
  candidates.sort((a,b)=>b.score-a.score || b.overlap-a.overlap || a.file.localeCompare(b.file));
  return candidates[0]?.evidence ?? null;
}

function meaningfulTokens(value) {
  const stop=new Set(["the","and","for","with","from","into","homes","home","project","conceptual","launch","experience","website","site"]);
  return new Set(String(value).toLowerCase().split(/[^a-z0-9]+/).filter((token)=>token.length>=3 && !stop.has(token)));
}
