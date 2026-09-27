import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  applyReferenceAnalysesToBrief,
  classifyPromptUrls,
  loadReferenceAnalyses,
  validateReferenceAnalysis,
} from "../scripts/lib/reference-intelligence.mjs";
import { parseDirectorBrief } from "../src/platform/directorSchema";

const fixturePath="tests/fixtures/reference-analysis.example.json";
const fixture=JSON.parse(fs.readFileSync(fixturePath,"utf8"));

test("Forge classifies labeled business and reference URLs from a request",()=>{
  const prompt=[
    "Business: https://business.example/",
    "Reference: https://reference.example/",
    "Supporting research: https://docs.example/report",
  ].join("\n");
  const result=classifyPromptUrls(prompt);
  assert.deepEqual(result.unclassified,[]);
  assert.deepEqual(result.groups.business,["https://business.example/"]);
  assert.deepEqual(result.groups.reference,["https://reference.example/"]);
  assert.deepEqual(result.groups.supporting,["https://docs.example/report"]);
});

test("Forge leaves ambiguous request URLs unclassified so preflight can fail closed",()=>{
  const result=classifyPromptUrls("https://business.example/\nhttps://reference.example/");
  assert.equal(result.unclassified.length,2);
  assert.equal(result.groups.reference.length,0);
});

test("validated reference intelligence is bound to hashed local visual evidence",async()=>{
  const rows=await loadReferenceAnalyses([fixturePath],["https://reference.example/"]);
  assert.equal(rows.length,1);
  assert.equal(rows[0].analysis.reference.url,"https://reference.example/");
  assert.ok(rows[0].analysis.evidence.sources.some((source:any)=>source.sha256));
  assert.ok(rows[0].analysis.observedFacts.signatureMoment.length>0);
  assert.ok(rows[0].analysis.transferableLessons.length>=2);
});

test("reference analysis URL mismatch is rejected",async()=>{
  await assert.rejects(
    ()=>loadReferenceAnalyses([fixturePath],["https://different.example/"]),
    /URL mismatch/i,
  );
});

test("placeholder deconstruction text cannot satisfy the reference gate",()=>{
  const draft=structuredClone(fixture);
  draft.reference.whyRelevant="REVIEW REQUIRED";
  assert.throws(()=>validateReferenceAnalysis(draft),/placeholder/i);
});

test("external reference lessons become Director brief inputs without copying the surface bundle",async()=>{
  const rows=await loadReferenceAnalyses([fixturePath],["https://reference.example/"]);
  const base=parseDirectorBrief({
    projectName:"Reference Test",
    projectType:"brand",
    tier:"signature",
    audience:"Design-aware visitors evaluating a differentiated brand experience.",
    objective:"Create a memorable but useful brand experience.",
    primaryAction:"Explore the brand",
    brandTruth:"The experience must express a project-specific brand truth.",
    differentiators:["Project-specific point of view"],
    constraints:["Do not copy the supplied reference."],
    existingAssets:[],
    references:[],
  });
  const enriched=applyReferenceAnalysesToBrief(base,rows);
  assert.equal(enriched.references.length,1);
  assert.match(enriched.references[0].label,/reference\.example/);
  assert.match(enriched.references[0].lesson,/Transfer causal principles only/i);
});
