import fs from "node:fs/promises";
import { parseDirectorBrief } from "../src/platform/directorSchema.ts";
import { runDirectorIntelligence } from "../src/platform/director-intelligence/orchestrator.ts";
import { buildForgeBuildPacket } from "../src/platform/buildPacket.ts";

const options=Object.fromEntries(process.argv.slice(2).filter((arg)=>arg.startsWith("--")&&arg.includes("=")).map((arg)=>arg.slice(2).split(/=(.*)/s,2)));
const briefPath=String(options.brief || "config/director-brief.example.json");
const output=String(options.output || "");
const [briefRaw,experience,assetManifest,interactionGraph,cinematicSystems,repoContract]=await Promise.all([
  fs.readFile(briefPath,"utf8"),
  fs.readFile(String(options.experience || "config/experience.json"),"utf8"),
  fs.readFile(String(options.manifest || "config/asset-manifest.json"),"utf8"),
  fs.readFile(String(options.graph || "config/interaction-graph.json"),"utf8"),
  fs.readFile(String(options.cinematic || "config/cinematic-systems.json"),"utf8"),
  fs.readFile("CLAUDE.md","utf8"),
]);
const brief=parseDirectorBrief(JSON.parse(briefRaw));
const director=runDirectorIntelligence({brief});
const packet=buildForgeBuildPacket({
  director,
  currentState:{
    experience:JSON.parse(experience),
    assetManifest:JSON.parse(assetManifest),
    interactionGraph:JSON.parse(interactionGraph),
    cinematicSystems:JSON.parse(cinematicSystems),
  },
  repoContract,
});
if(output) {
  await fs.mkdir(new URL(".",new URL("file://"+process.cwd()+"/"+output)).pathname,{recursive:true}).catch(()=>{});
  await fs.writeFile(output,packet+"\n","utf8");
  console.log("Forge Build Packet written to "+output);
} else {
  console.log(packet);
}
