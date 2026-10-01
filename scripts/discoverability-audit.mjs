import fs from "node:fs";
import { parseExperience } from "../src/lib/configSchema.ts";
import { evaluateDiscoverability } from "../src/platform/discoverability.ts";
import { parseStudioProject } from "../src/platform/studioSchema.ts";

const project=parseStudioProject(JSON.parse(fs.readFileSync("config/studio-project.json","utf8")));
const experience=parseExperience(JSON.parse(fs.readFileSync("config/experience.json","utf8")));
const report=evaluateDiscoverability({discoverability:project.discoverability,experience});
const failures=[];

if(report.status!=="ready") failures.push(`Active project Search + AI health is ${report.status} (${report.score}/100): ${report.issues.map((issue)=>issue.title).join("; ")}`);
if(!fs.readFileSync("app/layout.tsx","utf8").includes("DiscoverabilityJsonLd")) failures.push("Root layout must render structured discoverability JSON-LD.");
const robots=fs.readFileSync("app/robots.ts","utf8");
for(const token of ["OAI-SearchBot","ChatGPT-User","GPTBot","discoverability.publicPaths","discoverability.privatePaths"]) if(!robots.includes(token)) failures.push(`Robots policy is missing ${token}.`);
const sitemap=fs.readFileSync("app/sitemap.ts","utf8");
if(!sitemap.includes("discoverability.publicPaths")) failures.push("Sitemap must derive public routes from the discoverability contract.");
const llms=fs.readFileSync("app/llms.txt/route.ts","utf8");
if(!llms.includes("buildLlmsText") || !llms.includes("publishLlmsTxt")) failures.push("llms.txt must be generated from the project contract and remain policy-controlled.");
const health=fs.readFileSync("src/platform/control-plane/projectHealth.ts","utf8");
if(!health.includes('domain:"discoverability"') || !health.includes("discoverabilityScore")) failures.push("Project Health must include discoverability as a release domain.");
const studio=fs.readFileSync("src/studio/ForgeEditor.tsx","utf8");
if(!studio.includes("DiscoverabilityPanel") || !studio.includes('setMode("quality")')) failures.push("Forge editor must expose an actionable Search + AI repair surface.");

if(failures.length){console.error("Forge discoverability audit failed:");for(const failure of failures) console.error("- "+failure);process.exitCode=1;}
else console.log(`Forge discoverability audit passed: ${report.score}/100 · ${report.metrics.semanticSceneCoverage}% semantic scene coverage · ${report.metrics.searchIntentCount} intents · ${report.metrics.authorityTopicCount} authority topics.`);
