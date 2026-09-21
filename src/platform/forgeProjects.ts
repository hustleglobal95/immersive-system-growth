import { parseExperience } from "@/src/lib/configSchema";
import { parseInteractionGraph } from "@/src/lib/interactionGraph";
import { emptyInteractionGraph } from "@/src/platform/emptyInteractionGraph";
import { parseStudioProject } from "@/src/platform/studioSchema";
import { parseAssetManifest } from "@/src/platform/assetManifestSchema";
import { parseCinematicSystems } from "@/src/lib/cinematic/schema";
import { cinematicSystems as productionCinematicSystems } from "@/src/lib/cinematic/config";
import { forgeProjectRegistry } from "@/src/generated/forgeProjectRegistry";

/** A project Forge can open in Studio: the active configuration plus every generated client bundle. */
export interface ForgeProjectSummary {
  id:string;
  slug:string;
  name:string;
  description:string;
  sceneCount:number;
  active:boolean;
  liveHref?:string;
}

type RegistryEntry=(typeof forgeProjectRegistry)[number];

function load(entry:RegistryEntry) {
  const project=parseStudioProject(entry.project);
  const experience=parseExperience(entry.experience);
  const assetManifest=entry.assetManifest
    ? parseAssetManifest(entry.assetManifest)
    : parseAssetManifest({models:[],textures:[],hdr:[],video:[],budgets:{modelMb:12,textureMb:5,hdrMb:12,videoMb:20,totalMb:45}});
  const cinematicSystems=entry.cinematicSystems
    ? parseCinematicSystems(entry.cinematicSystems)
    : parseCinematicSystems({version:1,defaults:productionCinematicSystems.defaults,scenes:[]});
  return {project,experience,assetManifest,cinematicSystems};
}

export function listForgeProjects():ForgeProjectSummary[] {
  const seen=new Set<string>();
  const projects:ForgeProjectSummary[]=[];
  for(const entry of forgeProjectRegistry) {
    try {
      const {project,experience}=load(entry);
      if(seen.has(project.id)) continue;
      seen.add(project.id);
      projects.push({
        id:project.id,
        slug:entry.slug,
        name:project.name,
        description:experience.meta.description,
        sceneCount:experience.scenes.length,
        active:entry.active,
        ...(entry.liveHref?{liveHref:entry.liveHref}:{}),
      });
    } catch {
      // A generated client bundle that fails validation is not offered for opening.
    }
  }
  return projects;
}

export function loadForgeProject(slug:string) {
  const entry=forgeProjectRegistry.find((item)=>item.slug===slug);
  if(!entry) return null;
  const {project,experience,assetManifest,cinematicSystems}=load(entry);
  let interactionGraph=emptyInteractionGraph(project.id);
  if(entry.interactionGraph) {
    try { interactionGraph=parseInteractionGraph(entry.interactionGraph); } catch { /* fall back to an empty graph */ }
  }
  return {project,experience,assetManifest,interactionGraph,cinematicSystems};
}
