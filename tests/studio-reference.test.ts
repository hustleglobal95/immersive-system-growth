import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import rawExperience from "../config/experience.json";
import rawManifest from "../config/asset-manifest.json";
import rawProject from "../config/studio-project.json";
import { parseStudioProject } from "../src/platform/studioSchema";
import {
  activeStudioReferences,
  importStudioReferenceAnalysis,
  studioReferenceFromUrl,
  studioReferencesToBlueprintReferences,
  studioReferencesToDirectorReferences,
} from "../src/platform/studioReference";
import { planInteractive3DFromPrompt } from "../src/platform/interactive3dPlanner";

test("Forge imports structured reference analysis into transferable project intelligence",()=>{
  const fixture=JSON.parse(fs.readFileSync("tests/fixtures/reference-analysis.example.json","utf8"));
  const reference=importStudioReferenceAnalysis(fixture);
  assert.equal(reference.label,"CI Reference");
  assert.equal(reference.url,"https://reference.example/");
  assert.ok(reference.evidence.length>=6);
  assert.ok(reference.take.some((item)=>/Carry one meaningful subject/i.test(item)));
  assert.ok(reference.doNotCopy.includes("Exact composition"));
  assert.match(reference.systems.motion,/Scroll progression/i);
  assert.match(reference.systems.mobile,/Mobile preserves narrative order/i);
  assert.equal(activeStudioReferences([reference]).length,1);
});

test("URL-only references are stored but cannot steer a build without evidence or transfer rules",()=>{
  const reference=studioReferenceFromUrl("https://example.com/reference","Example");
  assert.equal(activeStudioReferences([reference]).length,0);
  assert.deepEqual(studioReferencesToBlueprintReferences([reference]),[]);
  assert.deepEqual(studioReferencesToDirectorReferences([reference]),[]);
});

test("Studio project schema persists website references",()=>{
  const fixture=JSON.parse(fs.readFileSync("tests/fixtures/reference-analysis.example.json","utf8"));
  const reference=importStudioReferenceAnalysis(fixture);
  const project=parseStudioProject({...rawProject,references:[reference]});
  assert.equal(project.references.length,1);
  assert.equal(project.references[0].label,"CI Reference");
});

test("interactive 3D planning carries evidence-directed references into the blueprint and Director path",()=>{
  const fixture=JSON.parse(fs.readFileSync("tests/fixtures/reference-analysis.example.json","utf8"));
  const reference=importStudioReferenceAnalysis(fixture);
  const plan=planInteractive3DFromPrompt({
    prompt:"Build a premium mechanical watch experience with a persistent product hero and restrained editorial motion.",
    projectName:"Reference Driven Watch",
    experience:rawExperience,
    manifest:rawManifest,
    references:[reference],
  });
  assert.equal(plan.blueprint.references.length,1);
  assert.match(plan.blueprint.references[0].lesson,/Carry one meaningful subject/i);
  assert.match(plan.blueprint.references[0].doNotCopy,/Exact composition/i);
  assert.ok(plan.decisions.some((item)=>/Reference intelligence: 1 evidence-directed/i.test(item)));
});
