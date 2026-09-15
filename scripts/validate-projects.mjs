import fs from "node:fs";
import path from "node:path";
import { parseExperience } from "../src/lib/configSchema.ts";
import { parseStudioProject } from "../src/platform/studioSchema.ts";
import { parseCreativeDirection } from "../src/platform/creativeDirectionSchema.ts";
import { parseAssetManifest } from "../src/platform/assetManifestSchema.ts";
import { parseVisualSystems } from "../src/platform/visualSystems.ts";
import { activeExperienceMode, auditExperienceMode, parseExperienceModes } from "../src/platform/experienceModes.ts";
import { parseForgeProject } from "../src/platform/forgeProjectSchema.ts";

const root = process.cwd();

function readJson(relativePath, label) {
  const resolved = path.resolve(root, relativePath);
  if (!resolved.startsWith(root + path.sep)) throw new Error(`${label} path escapes the repository`);
  if (!fs.existsSync(resolved)) throw new Error(`${label} not found: ${relativePath}`);
  return JSON.parse(fs.readFileSync(resolved, "utf8"));
}

let failures = 0;

try {
  const forge = parseForgeProject(readJson("config/forge-project.json", "Forge project"));
  const studio = parseStudioProject(readJson(forge.paths.studioProject, "Studio project"));
  const experience = parseExperience(readJson(forge.paths.experience, "Experience"));
  parseCreativeDirection(readJson(forge.paths.creativeDirection, "Creative direction"));
  parseAssetManifest(readJson(forge.paths.assetManifest, "Asset manifest"));
  parseVisualSystems(readJson(forge.paths.visualSystems, "Visual systems"));
  const modes = parseExperienceModes(readJson(forge.paths.experienceModes, "Experience modes"));
  const modeFailures = auditExperienceMode(activeExperienceMode(modes), experience);
  if (modeFailures.length) throw new Error(modeFailures.join(". "));
  if (studio.experiencePath !== forge.paths.experience) {
    throw new Error("Forge project and Studio project point to different experience files");
  }
  if (studio.experienceModesPath !== forge.paths.experienceModes) {
    throw new Error("Forge project and Studio project point to different experience mode files");
  }
  if (studio.creativeDirectionPath !== forge.paths.creativeDirection) {
    throw new Error("Forge project and Studio project point to different creative direction files");
  }
  console.log(`VALID forge project: ${forge.name}, ${experience.scenes.length} scenes, ${forge.performance.targetFps} FPS target`);
} catch (error) {
  failures++;
  console.error(`INVALID config/forge-project.json: ${error instanceof Error ? error.message : String(error)}`);
}

const candidates = ["config/studio-project.json"];
const clients = path.join(root, "clients");
if (fs.existsSync(clients)) {
  for (const entry of fs.readdirSync(clients, { withFileTypes: true })) {
    if (entry.isDirectory()) candidates.push(`clients/${entry.name}/studio-project.json`);
  }
}

for (const projectPath of candidates) {
  try {
    const project = parseStudioProject(readJson(projectPath, "Studio project"));
    const experience = parseExperience(readJson(project.experiencePath, "Experience"));
    parseCreativeDirection(readJson(project.creativeDirectionPath, "Creative direction"));
    parseVisualSystems(readJson(project.visualSystemsPath, "Visual systems"));
    const modes = parseExperienceModes(readJson(project.experienceModesPath, "Experience modes"));
    const modeFailures = auditExperienceMode(activeExperienceMode(modes), experience);
    if (modeFailures.length) throw new Error(modeFailures.join(". "));
    console.log(`VALID ${projectPath}: ${project.name}, ${experience.scenes.length} scenes, ${project.contentSources.length} sources`);
  } catch (error) {
    failures++;
    console.error(`INVALID ${projectPath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failures) process.exit(1);