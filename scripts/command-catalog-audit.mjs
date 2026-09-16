import fs from "node:fs/promises";
import { parseExperience } from "../src/lib/configSchema.ts";
import { createExperienceEngine } from "../src/platform/createExperienceEngine.ts";

const experience = parseExperience(JSON.parse(await fs.readFile("config/experience.json", "utf8")));
const engine = createExperienceEngine(experience);
const catalog = engine.commands.catalog();
const violations = [];

for (const command of catalog) {
  if (command.category === "unclassified") violations.push(`${command.type}: command is unclassified`);
  if (!command.description.trim()) violations.push(`${command.type}: command description is empty`);
  if ((command.impact === "destructive" || command.impact === "external") && command.approval === "auto") {
    violations.push(`${command.type}: ${command.impact} commands cannot be auto-approved`);
  }
  if (command.agentVisible && command.approval === "auto" && !command.reversible) {
    violations.push(`${command.type}: agent-visible auto commands must be reversible`);
  }
}

if (violations.length) {
  console.error(`Forge command catalog audit failed with ${violations.length} violation(s):`);
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

const byApproval = Object.fromEntries(["auto", "review", "required"].map((level) => [level, catalog.filter((item) => item.approval === level).length]));
console.log(`Forge command catalog audit passed: ${catalog.length} commands (${byApproval.auto} auto, ${byApproval.review} review, ${byApproval.required} required).`);
