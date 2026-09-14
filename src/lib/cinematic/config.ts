import rawCinematicSystems from "@/config/cinematic-systems.json";
import { parseCinematicSystems } from "@/src/lib/cinematic/schema";
export const cinematicSystems=parseCinematicSystems(rawCinematicSystems);
export function getCinematicScene(sceneId:string){return cinematicSystems.scenes.find(scene=>scene.id===sceneId)??null;}
