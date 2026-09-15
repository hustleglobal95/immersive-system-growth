import fs from "node:fs";
import path from "node:path";
import { parseExperience } from "../src/lib/configSchema.ts";
import { parseStudioProject } from "../src/platform/studioSchema.ts";
import { parseVisualSystems } from "../src/platform/visualSystems.ts";
import { parseExperienceModes } from "../src/platform/experienceModes.ts";

const slug = process.argv[2];
if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
  console.error("Usage: npm run project:activate -- client-slug");
  process.exit(1);
}
const directory = path.join("clients", slug);
const project = parseStudioProject(JSON.parse(fs.readFileSync(path.join(directory, "studio-project.json"), "utf8")));
const experience = parseExperience(JSON.parse(fs.readFileSync(project.experiencePath, "utf8")));
const visualSystems = parseVisualSystems(JSON.parse(fs.readFileSync(project.visualSystemsPath, "utf8")));
const experienceModes = parseExperienceModes(JSON.parse(fs.readFileSync(project.experienceModesPath, "utf8")));
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
fs.mkdirSync("config/backups", { recursive: true });
for (const name of ["experience.json", "studio-project.json", "visual-systems.json", "experience-modes.json"]) {
  fs.copyFileSync(path.join("config", name), path.join("config/backups", stamp + "-" + name));
}
fs.writeFileSync("config/experience.json", JSON.stringify(experience, null, 2) + "\n");
fs.writeFileSync("config/visual-systems.json", JSON.stringify(visualSystems, null, 2) + "\n");
fs.writeFileSync("config/experience-modes.json", JSON.stringify(experienceModes, null, 2) + "\n");
fs.writeFileSync("config/studio-project.json", JSON.stringify({ ...project, experiencePath: "config/experience.json", visualSystemsPath: "config/visual-systems.json", experienceModesPath: "config/experience-modes.json" }, null, 2) + "\n");
console.log(`Activated ${project.name}. Previous configuration saved under config/backups.`);
