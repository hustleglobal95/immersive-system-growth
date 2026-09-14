import fs from "node:fs";
import { parseCinematicSystems } from "../src/lib/cinematic/schema.ts";
import { parseExperience } from "../src/lib/configSchema.ts";

const manifest=parseCinematicSystems(JSON.parse(fs.readFileSync("config/cinematic-systems.json","utf8")));
const experience=parseExperience(JSON.parse(fs.readFileSync("config/experience.json","utf8")));
const sceneIds=new Set(experience.scenes.map(scene=>scene.id));
const errors=[];
for(const [index,scene] of manifest.scenes.entries()){
  if(!sceneIds.has(scene.id))errors.push(`cinematic scene ${index} references unknown experience scene ${scene.id}`);
  if(scene.spatial){
    if(scene.spatial.planes.length>12)errors.push(`${scene.id}: too many spatial planes`);
    if(scene.spatial.depthStrength>80)console.warn(`WARN ${scene.id}: spatial depth strength ${scene.spatial.depthStrength} is aggressive; verify mobile crop.`);
  }
  for(const graphic of scene.procedural){
    if(graphic.kind==="halftone"&&graphic.count>12000)console.warn(`WARN ${scene.id}/${graphic.id}: ${graphic.count} dots requires high-tier canvas rendering.`);
  }
}
if(errors.length){for(const error of errors)console.error(error);process.exitCode=1;}else console.log(`CINEMATIC SYSTEMS VALID: ${manifest.scenes.length} configured scenes across spring, stack, reveal, spatial, procedural, occlusion and diagram systems.`);
