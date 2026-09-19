import fs from "node:fs";
import path from "node:path";
import { parseExperience } from "@/src/lib/configSchema";
import { parseInteractionGraph } from "@/src/lib/interactionGraph";
import { emptyInteractionGraph } from "@/src/platform/emptyInteractionGraph";
import { parseStudioProject } from "@/src/platform/studioSchema";
import { parseAssetManifest } from "@/src/platform/assetManifestSchema";

/** A project Forge can open in Studio: the active configuration plus every client bundle. */
export interface ForgeProjectSummary {
  id: string;
  slug: string;
  name: string;
  description: string;
  sceneCount: number;
  active: boolean;
  liveHref?: string;
}

const root = process.cwd();
const read = (file: string) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const exists = (file: string) => fs.existsSync(path.join(root, file));

function projectFiles(): { slug: string; file: string; active: boolean; graph?: string }[] {
  const clients = exists("clients")
    ? fs.readdirSync(path.join(root, "clients"), { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && exists(`clients/${entry.name}/studio-project.json`))
        .map((entry) => ({ slug: entry.name, file: `clients/${entry.name}/studio-project.json`, active: false, graph: `clients/${entry.name}/interaction-graph.json` }))
    : [];
  return [{ slug: "active", file: "config/studio-project.json", active: true, graph: "config/interaction-graph.json" }, ...clients];
}

function load(entry: ReturnType<typeof projectFiles>[number]) {
  const project = parseStudioProject(read(entry.file));
  const experience = parseExperience(read(project.experiencePath));
  const manifestCandidates=[
    path.posix.join(path.posix.dirname(project.experiencePath),"asset-manifest.json"),
    path.posix.join(path.posix.dirname(entry.file),"asset-manifest.json"),
    entry.active ? "config/asset-manifest.json" : "",
  ].filter(Boolean);
  const manifestPath=manifestCandidates.find((candidate)=>exists(candidate));
  const assetManifest=manifestPath
    ? parseAssetManifest(read(manifestPath))
    : parseAssetManifest({models:[],textures:[],hdr:[],video:[],budgets:{modelMb:12,textureMb:5,hdrMb:12,videoMb:20,totalMb:45}});
  return { project, experience, assetManifest };
}

export function listForgeProjects(): ForgeProjectSummary[] {
  const seen = new Set<string>();
  const projects: ForgeProjectSummary[] = [];
  for (const entry of projectFiles()) {
    try {
      const { project, experience } = load(entry);
      if (seen.has(project.id)) continue;
      seen.add(project.id);
      projects.push({
        id: project.id,
        slug: entry.slug,
        name: project.name,
        description: experience.meta.description,
        sceneCount: experience.scenes.length,
        active: entry.active,
        liveHref: entry.active ? "/site" : exists(`app/${entry.slug}/page.tsx`) ? `/${entry.slug}` : undefined,
      });
    } catch {
      // A client bundle that fails validation is not offered for opening.
    }
  }
  return projects;
}

export function loadForgeProject(slug: string) {
  const entry = projectFiles().find((item) => item.slug === slug);
  if (!entry) return null;
  const { project, experience, assetManifest } = load(entry);
  let interactionGraph = emptyInteractionGraph(project.id);
  if (entry.graph && exists(entry.graph)) {
    try { interactionGraph = parseInteractionGraph(read(entry.graph)); } catch { /* fall back to an empty graph */ }
  }
  return { project, experience, assetManifest, interactionGraph };
}
