import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page=fs.readFileSync("app/studio/page.tsx","utf8");
const studio=fs.readFileSync("src/studio/ProductionStudioWorkbench.tsx","utf8");
const dock=fs.readFileSync("src/studio/Interactive3DBuildDock.tsx","utf8");
const publish=fs.readFileSync("src/studio/ProjectPanels.tsx","utf8");
const route=fs.readFileSync("app/api/studio/interactive3d/plan/route.ts","utf8");
const planner=fs.readFileSync("src/platform/interactive3dPlanner.ts","utf8");
const materializer=fs.readFileSync("src/platform/interactive3dMaterializer.ts","utf8");

test("default Studio is the complete Forge website editor",()=>{
  assert.match(page,/ProductionStudioWorkbench/);
  assert.doesNotMatch(page,/SimpleForgeStudio/);
  assert.match(studio,/LIVE SITE CANVAS/);
  assert.match(studio,/LAYERS \+ SCENES/);
  assert.match(studio,/SCROLL TIMELINE/);
  assert.match(studio,/Interactive3DBuildDock/);
  assert.doesNotMatch(studio,/production-advanced-menu/);
});

test("AI Build is part of the editor and uses the interactive 3D planning path",()=>{
  assert.match(studio,/AI Build/);
  assert.match(dock,/fetch\("\/api\/studio\/interactive3d\/plan"/);
  assert.match(dock,/useCurrentHero/);
  assert.match(studio,/onPreview/);
  assert.match(studio,/onApply/);
});

test("planner generates project-specific site structure instead of reusing template scene IDs",()=>{
  assert.match(planner,/sceneCountForArchetype/);
  assert.match(planner,/sceneIdFor/);
  assert.doesNotMatch(planner,/experience\.scenes\.map\(\(scene, index\)/);
  assert.doesNotMatch(materializer,/requires blueprint scene IDs to match/);
});

test("new builds remain editable through the real production canvas",()=>{
  assert.match(materializer,/next\.heroVisible = !heroVisual\?\.source/);
  assert.match(studio,/StudioLivePreview/);
  assert.match(studio,/AssetManager/);
  assert.match(studio,/SequencerEditor/);
  assert.match(studio,/InteractionGraphEditor/);
});

test("planning endpoint returns the whole generated website state",()=>{
  assert.match(route,/assetManifest: cleanManifest/);
  assert.match(route,/interactionGraph/);
  assert.match(route,/assetRequests/);
  assert.match(route,/signatureSceneId/);
});

test("publishing remains a protected editor release action",()=>{
  assert.match(studio,/Publish/);
  assert.match(publish,/fetch\("\/api\/studio\/publish"/);
  assert.match(publish,/healthReady/);
  assert.match(publish,/PUBLISH \/ RELEASE/);
});
