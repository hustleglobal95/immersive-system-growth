import fs from "node:fs";
import path from "node:path";
import { parseExperience } from "../src/lib/configSchema.ts";
import { parseStudioProject } from "../src/platform/studioSchema.ts";

const root = process.cwd();
const candidates = ["config/studio-project.json"];
const clients = path.join(root, "clients");
if (fs.existsSync(clients)) {
  for (const entry of fs.readdirSync(clients, { withFileTypes: true })) {
    if (entry.isDirectory()) candidates.push(`clients/${entry.name}/studio-project.json`);
  }
}

let failures = 0;
for (const projectPath of candidates) {
  try {
    const project = parseStudioProject(JSON.parse(fs.readFileSync(projectPath, "utf8")));
    const experiencePath = path.resolve(root, project.experiencePath);
    if (!experiencePath.startsWith(root + path.sep)) throw new Error("Experience path escapes the repository");
    const experience = parseExperience(JSON.parse(fs.readFileSync(experiencePath, "utf8")));
    console.log(`VALID ${projectPath}: ${project.name}, ${experience.scenes.length} scenes, ${project.contentSources.length} sources`);
  } catch (error) {
    failures++;
    console.error(`INVALID ${projectPath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
if (failures) process.exit(1);
