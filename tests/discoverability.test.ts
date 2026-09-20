import assert from "node:assert/strict";
import test from "node:test";
import rawExperience from "../config/experience.json" with { type:"json" };
import rawProject from "../config/studio-project.json" with { type:"json" };
import { parseExperience } from "../src/lib/configSchema";
import { buildLlmsText, buildStructuredData, discoverabilityDefaults, evaluateDiscoverability } from "../src/platform/discoverability";
import { parseStudioProject } from "../src/platform/studioSchema";

const experience=parseExperience(rawExperience);
const project=parseStudioProject(rawProject);

test("active project has release-ready Search and AI discoverability",()=>{
  const report=evaluateDiscoverability({discoverability:project.discoverability,experience});
  assert.equal(report.status,"ready");
  assert.equal(report.score,100);
  assert.equal(report.metrics.semanticSceneCoverage,100);
  assert.ok(report.metrics.searchIntentCount>=1);
  assert.ok(report.metrics.authorityTopicCount>=3);
});

test("new projects fail closed until canonical search identity is authored",()=>{
  const config=discoverabilityDefaults("New Client");
  const report=evaluateDiscoverability({discoverability:config,experience});
  assert.equal(report.status,"blocked");
  assert.ok(report.issues.some((issue)=>issue.id==="canonical-base" && issue.severity==="blocker"));
  assert.ok(report.issues.some((issue)=>issue.id==="default-description" && issue.severity==="blocker"));
});

test("structured data describes both the website and primary entity",()=>{
  const data=buildStructuredData(project.discoverability,experience) as {"@graph":Array<Record<string,unknown>>};
  assert.equal(data["@graph"][0]?.["@type"],"WebSite");
  assert.equal(data["@graph"][1]?.["@type"],"ProfessionalService");
  assert.equal(data["@graph"][1]?.name,"Atelier Maris");
});

test("llms text is grounded in declared public pages and authority topics",()=>{
  const text=buildLlmsText(project.discoverability,experience);
  assert.match(text,/# Atelier Maris/);
  assert.match(text,/Authority topics/);
  assert.match(text,/https:\/\/immersive-system-growth\.vercel\.app\/site/);
  assert.doesNotMatch(text,/\/studio\b/);
});
