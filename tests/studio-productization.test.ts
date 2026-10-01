import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page=fs.readFileSync("app/studio/page.tsx","utf8");
const studio=fs.readFileSync("src/studio/SimpleForgeStudio.tsx","utf8");
const route=fs.readFileSync("app/api/studio/interactive3d/plan/route.ts","utf8");
const planner=fs.readFileSync("src/platform/interactive3dPlanner.ts","utf8");
const materializer=fs.readFileSync("src/platform/interactive3dMaterializer.ts","utf8");

test("default Studio is one real Forge builder",()=>{
  assert.match(page,/SimpleForgeStudio/);
  assert.match(studio,/forge-builder/);
  assert.match(studio,/"Build Website"/);
  assert.match(studio,/"Finish Website"/);
  assert.doesNotMatch(studio,/type Mode="build"/);
  assert.doesNotMatch(studio,/href="\/studio\/advanced"/);
});

test("Build Website applies a complete fresh project bundle",()=>{
  assert.match(studio,/fetch\("\/api\/studio\/interactive3d\/plan"/);
  assert.match(studio,/assetManifest:body\.assetManifest/);
  assert.match(studio,/interactionGraph:body\.interactionGraph/);
  assert.match(studio,/useCurrentHero:false/);
  assert.match(studio,/draft\.applyProjectBundle/);
});

test("planner generates project-specific site structure instead of reusing template scene IDs",()=>{
  assert.match(planner,/sceneCountForArchetype/);
  assert.match(planner,/sceneIdFor/);
  assert.doesNotMatch(planner,/experience\.scenes\.map\(\(scene, index\)/);
  assert.doesNotMatch(materializer,/requires blueprint scene IDs to match/);
});

test("new builds are visibly interactive before final assets arrive",()=>{
  assert.match(materializer,/next\.heroVisible = !heroVisual\?\.source/);
  assert.match(studio,/Generate Hero/);
  assert.match(studio,/\/api\/studio\/assets\/generate/);
  assert.match(studio,/StudioLivePreview/);
});

test("planning endpoint returns the whole generated website state",()=>{
  assert.match(route,/assetManifest: cleanManifest/);
  assert.match(route,/interactionGraph/);
  assert.match(route,/assetRequests/);
  assert.match(route,/signatureSceneId/);
});

test("finished projects still export when automatic publishing is unavailable",()=>{
  assert.match(studio,/downloadJson/);
  assert.match(studio,/-finished\.json/);
  assert.match(studio,/fetch\("\/api\/studio\/publish"/);
});
