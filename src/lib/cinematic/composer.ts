import type { CinematicSceneConfig } from "@/src/lib/cinematic/schema";
import { sampleStack } from "@/src/lib/cinematic/stack";
import { sampleReveal } from "@/src/lib/cinematic/revealRegistry";
import { sampleSpatialImage } from "@/src/lib/cinematic/spatialImage";
import { sampleOcclusion } from "@/src/lib/cinematic/occlusion";
import { sampleDiagram } from "@/src/lib/cinematic/diagrams";
import { sampleProceduralOpacity } from "@/src/lib/cinematic/procedural";
export interface CinematicComposeInput{progress:number;pointer:{x:number;y:number;velocity:number;trailEnergy:number}}
export function composeCinematicScene(scene:CinematicSceneConfig,input:CinematicComposeInput){return{
  stack:scene.stack?sampleStack(input.progress,scene.stack):null,
  reveal:scene.reveal?sampleReveal(scene.reveal,{progress:input.progress,pointerX:input.pointer.x,pointerY:input.pointer.y,velocity:input.pointer.velocity,trailEnergy:input.pointer.trailEnergy}):null,
  spatial:scene.spatial?sampleSpatialImage(scene.spatial,{pointerX:input.pointer.x,pointerY:input.pointer.y,scrollProgress:input.progress}):null,
  procedural:scene.procedural.map(config=>({config,opacity:sampleProceduralOpacity(config,input.progress)})),
  occlusion:scene.occlusion.map(config=>({config,sample:sampleOcclusion(config,input.progress)})),
  diagram:scene.diagram?{config:scene.diagram,sample:sampleDiagram(scene.diagram,input.progress)}:null,
};}
