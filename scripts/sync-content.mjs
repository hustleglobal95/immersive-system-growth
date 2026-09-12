import fs from "node:fs";
import path from "node:path";
import { parseExperience } from "../src/lib/configSchema.ts";
import { applyContentMappings, fetchContentSource } from "../src/platform/integrations.ts";
import { parseStudioProject } from "../src/platform/studioSchema.ts";

const projectPath = process.argv[2] ?? "config/studio-project.json";
const shouldWrite = process.argv.includes("--write");
const project = parseStudioProject(JSON.parse(fs.readFileSync(projectPath, "utf8")));
const experiencePath = path.resolve(project.experiencePath);
let experience = parseExperience(JSON.parse(fs.readFileSync(experiencePath, "utf8")));
const configuredHosts = (process.env.FORGE_ALLOWED_CONTENT_HOSTS ?? "").split(",").map((host) => host.trim()).filter(Boolean);

for (const source of project.contentSources) {
  const sourceHosts = source.kind === "json"
    ? [new URL(source.endpoint).hostname]
    : source.kind === "shopify"
      ? [source.storeDomain]
      : [];
  const data = await fetchContentSource(source, {
    allowedHosts: [...configuredHosts, ...sourceHosts],
    environment: process.env,
    maxBytes: 2_000_000,
  });
  experience = parseExperience(applyContentMappings(experience, data, source.mappings));
  console.log(`SYNCED ${source.id}: ${source.mappings.length} mappings`);
}

if (!project.contentSources.length) console.log("No content sources configured.");
if (shouldWrite) {
  fs.writeFileSync(experiencePath, JSON.stringify(experience, null, 2) + "\n");
  console.log(`WROTE ${path.relative(process.cwd(), experiencePath)}`);
} else {
  console.log("Dry run complete. Pass --write to update the experience file.");
}
