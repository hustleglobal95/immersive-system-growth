import fs from "node:fs";
import { parseCinematicSystems } from "../src/lib/cinematic/schema.ts";
import { parseExperience } from "../src/lib/configSchema.ts";
import { visualPhysicsCost } from "../src/lib/cinematic/visualPhysics.ts";

const manifest=parseCinematicSystems(JSON.parse(fs.readFileSync("config/cinematic-systems.json","utf8")));
const experience=parseExperience(JSON.parse(fs.readFileSync("config/experience.json","utf8")));
const sceneIds=new Set(experience.scenes.map(scene=>scene.id));
const errors=[];
for(const [index,scene] of manifest.scenes.entries()){
  if(!sceneIds.has(scene.id))errors.push(`cinematic scene ${index} references unknown experience scene ${scene.id}`);
  const experienceScene=experience.scenes.find(item=>item.id===scene.id);
  if(scene.cursorReveal){
    if(experienceScene?.media?.kind!=="image")errors.push(`${scene.id}: cursor reveal requires an image-backed production scene.`);
    if(scene.cursorReveal.mode==="fluid"&&scene.cursorReveal.fluidResolution>256)console.warn(`WARN ${scene.id}: fluid cursor reveal resolution ${scene.cursorReveal.fluidResolution} is expensive; verify target-device GPU time.`);
    if(scene.cursorReveal.touch==="always")console.warn(`WARN ${scene.id}: touch-always cursor reveal should be verified against native page scrolling.`);
  }
  if(scene.warp||scene.refraction||scene.sceneTransition){
    if(experienceScene?.media?.kind!=="image")errors.push(`${scene.id}: visual physics requires an image-backed production scene.`);
    const cost=visualPhysicsCost(scene);
    if(cost==="heavy")console.warn(`WARN ${scene.id}: visual physics stack is heavy; verify mobile GPU frame time and fallback behavior.`);
    if(scene.sceneTransition?.effect==="depth"&&!scene.spatial?.depthMap)console.warn(`WARN ${scene.id}: depth transition has no authored depth map and will use the neutral fallback texture.`);
  }
  if(scene.spatial){
    if(scene.spatial.planes.length>12)errors.push(`${scene.id}: too many spatial planes`);
    if(scene.spatial.depthStrength>80)console.warn(`WARN ${scene.id}: spatial depth strength ${scene.spatial.depthStrength} is aggressive; verify mobile crop.`);
  }
  for(const graphic of scene.procedural){
    if(graphic.kind==="halftone"&&graphic.count>12000)console.warn(`WARN ${scene.id}/${graphic.id}: ${graphic.count} dots requires high-tier canvas rendering.`);
  }
}
if(errors.length){for(const error of errors)console.error(error);process.exitCode=1;}else console.log(`CINEMATIC SYSTEMS VALID: ${manifest.scenes.length} configured scenes across spring, stack, reveal, cursor reveal, warp, refraction, scene transition, spatial, procedural, occlusion and diagram systems.`);
