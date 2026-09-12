import fs from "node:fs";
import path from "node:path";
import { parseExperience } from "../src/lib/configSchema.ts";
import { parseStudioProject } from "../src/platform/studioSchema.ts";

const slug = process.argv[2];
const recipe = process.argv[3] ?? "burger-showcase";
if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
  console.error("Usage: npm run project:new -- client-slug [recipe]");
  process.exit(1);
}
const sourcePath = path.join("recipes", recipe + ".json");
if (!fs.existsSync(sourcePath)) {
  console.error(`Unknown recipe: ${recipe}`);
  process.exit(1);
}
const directory = path.join("clients", slug);
if (fs.existsSync(directory)) {
  console.error(`Client project already exists: ${directory}`);
  process.exit(1);
}
const experience = parseExperience(JSON.parse(fs.readFileSync(sourcePath, "utf8")));
const visualSystems = JSON.parse(fs.readFileSync("config/visual-systems.json", "utf8"));
const project = parseStudioProject({
  version: 2,
  id: slug,
  name: slug.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join(" "),
  experiencePath: `clients/${slug}/experience.json`,
  creativeDirectionPath: "config/creative-direction.json",
  visualSystemsPath: `clients/${slug}/visual-systems.json`,
  contentSources: [],
  deployment: { provider: "vercel", projectName: slug, productionBranch: "main" },
  telemetry: { enabled: true, endpoint: "/api/telemetry", sampleRate: 1, consent: "analytics", respectDnt: true },
});
fs.mkdirSync("clients", { recursive: true });
fs.mkdirSync(directory, { recursive: false });
fs.writeFileSync(path.join(directory, "experience.json"), JSON.stringify(experience, null, 2) + "\n");
fs.writeFileSync(path.join(directory, "studio-project.json"), JSON.stringify(project, null, 2) + "\n");
fs.writeFileSync(path.join(directory, "README.md"), `# ${project.name}\n\nCreated from the ${recipe} recipe.\n\n- Edit in /studio and export both JSON files.\n- Validate with npm run project:validate.\n- Activate with npm run project:activate -- ${slug}.\n`);
console.log(`Created ${directory} from ${recipe}.`);
