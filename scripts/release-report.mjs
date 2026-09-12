import fs from "node:fs";
import path from "node:path";
import rawProject from "../config/forge-project.json";
import { parseForgeProject } from "../src/platform/forgeProjectSchema.ts";
import { createReleaseManifest, type ReleaseDocumentKind } from "../src/platform/releaseManifest.ts";

const root = process.cwd();
const project = parseForgeProject(rawProject);

function read(relativePath: string) {
  const resolved = path.resolve(root, relativePath);
  if (!resolved.startsWith(root + path.sep)) throw new Error("Release document path escapes the repository");
  if (!fs.existsSync(resolved)) throw new Error("Release document not found: " + relativePath);
  return fs.readFileSync(resolved, "utf8");
}

const documents = {
  forgeProject: read("config/forge-project.json"),
  experience: read(project.paths.experience),
  studioProject: read(project.paths.studioProject),
  creativeDirection: read(project.paths.creativeDirection),
  assetManifest: read(project.paths.assetManifest),
  visualSystems: read(project.paths.visualSystems),
} satisfies Record<ReleaseDocumentKind, string>;

console.log(JSON.stringify(createReleaseManifest(project, documents), null, 2));
