import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=(path:string)=>fs.readFileSync(path,"utf8");
const policy=JSON.parse(read("config/forge-execution-policy.json"));
const packageJson=JSON.parse(read("package.json"));

test("Forge full-system execution policy is machine-readable and fail-closed",()=>{
  assert.equal(policy.policyId,"forge-full-system-execution");
  assert.equal(policy.version,2);
  assert.equal(policy.automaticForSubstantialCreativeWork,true);
  assert.ok(policy.explicitTriggers.includes("USE FORGE"));
  for(const stage of [
    "operational-readiness",
    "clean-baseline",
    "state-provenance",
    "reference-classification",
    "external-reference-intelligence",
    "build-packet",
    "director-intelligence",
    "reference-intelligence",
    "creative-state-graph",
    "originality-gate",
    "capability-routing",
    "signature-slice-gate",
    "context-capsules",
    "verification-plan",
  ]) assert.ok(policy.fullBuild.requiredStages.includes(stage),stage+" must remain mandatory");
  assert.ok(policy.fullBuild.requiredContextDomains.length>=10);
  assert.equal(policy.governanceChangeControl.separatePullRequestRequired,true);
  assert.equal(policy.referenceDriven.failOnUnclassifiedUrls,true);
  assert.equal(policy.referenceDriven.requireValidatedAnalysisForReferenceUrls,true);
  assert.equal(policy.referenceDriven.requireHashedLocalVisualEvidence,true);
  assert.ok(policy.creativeChangeControl.governedPathPatterns.length>=6);
  for(const pattern of policy.creativeChangeControl.governedPathPatterns) assert.doesNotThrow(()=>new RegExp(pattern));
});

test("repository scripts and canonical check gate enforce Forge execution governance",()=>{
  assert.equal(packageJson.scripts["forge:preflight"],"node scripts/forge-preflight.mjs");
  assert.equal(packageJson.scripts["forge:execution:audit"],"node scripts/forge-execution-audit.mjs");
  assert.equal(packageJson.scripts["forge:reference:capture"],"node scripts/forge-reference-capture.mjs");
  assert.match(packageJson.scripts.check,/forge:execution:audit/);
  const preflight=read("scripts/forge-preflight.mjs");
  const audit=read("scripts/forge-execution-audit.mjs");
  assert.match(preflight,/rawPromptCommitted:false/);
  assert.match(preflight,/FORGE_EXECUTION_ATTESTATION_KEY/);
  assert.match(preflight,/requiredContextDomains/);
  assert.match(preflight,/assertCleanCreativeBaseline/);
  assert.match(preflight,/stateBaseline:stateEvidence/);
  assert.match(preflight,/classifyPromptUrls/);
  assert.match(preflight,/Reference-driven production is blocked pending visual deconstruction/);
  assert.match(preflight,/externalReferences:referenceRows/);
  assert.match(audit,/changed-file gate FAILED/);
  assert.match(audit,/separation-of-duties gate FAILED/);
  assert.match(audit,/required stage not PASS/);
  assert.match(audit,/invalid state provenance/);
  assert.match(audit,/do not share one Creative State Graph fingerprint/);
  assert.match(audit,/preflight base was not established before governed creative changes/);
  assert.match(audit,/external reference evidence count does not match classified reference URLs/);
  assert.match(audit,/external reference lacks hashed visual evidence/);
});

test("agent contracts make USE FORGE a durable execution directive",()=>{
  for(const path of ["CLAUDE.md","AGENTS.md",".claude/skills/forge-build/SKILL.md"]){
    const content=read(path);
    assert.match(content,/USE FORGE/i,path+" must define USE FORGE");
    assert.match(content,/forge:preflight/,path+" must require the preflight");
  }
  assert.match(read("CLAUDE.md"),/automatic for substantial/i);
  assert.match(read("AGENTS.md"),/user does not need to enumerate/i);
});

test("confidential prompt handling is supported end to end",()=>{
  assert.match(read("scripts/forge-build-packet.mjs"),/prompt-file/);
  assert.match(read("scripts/forge-context-capsule.mjs"),/prompt-file/);
  assert.match(read(".gitignore"),/\.forge\/execution\//);
  assert.match(read("docs/FORGE_EXECUTION_GOVERNANCE.md"),/no raw client prompt/i);
});

test("CI and repository ownership protect the governance path",()=>{
  const ci=read(".github/workflows/ci.yml");
  assert.match(ci,/fetch-depth: 0/);
  assert.match(ci,/Exercise full-system Forge preflight/);
  assert.match(ci,/forge:execution:audit -- --changed/);
  const owners=read(".github/CODEOWNERS");
  for(const path of [
    "/config/forge-execution-policy.json",
    "/scripts/forge-preflight.mjs",
    "/scripts/forge-execution-audit.mjs",
    "/CLAUDE.md",
    "/AGENTS.md",
    "/.github/workflows/ci.yml",
  ]) assert.ok(owners.includes(path),path+" must be CODEOWNED");
});
