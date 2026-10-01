import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page=fs.readFileSync("app/studio/page.tsx","utf8");
const editor=fs.readFileSync("src/studio/ForgeEditor.tsx","utf8");
const dock=fs.readFileSync("src/studio/Interactive3DBuildDock.tsx","utf8");
const publish=fs.readFileSync("src/studio/ProjectPanels.tsx","utf8");
const route=fs.readFileSync("app/api/studio/interactive3d/plan/route.ts","utf8");
const planner=fs.readFileSync("src/platform/interactive3dPlanner.ts","utf8");
const materializer=fs.readFileSync("src/platform/interactive3dMaterializer.ts","utf8");

test("default Studio is the replacement canvas-first Forge editor",()=>{
  assert.match(page,/ForgeEditor/);
  assert.doesNotMatch(page,/ProductionStudioWorkbench/);
  assert.match(editor,/forge-next__canvas/);
  assert.match(editor,/forge-next__layers/);
  assert.match(editor,/forge-next__inspector/);
  assert.match(editor,/forge-next__timeline/);
  assert.match(editor,/StudioLivePreview/);
});

test("Forge exposes core website authoring modes directly",()=>{
  for(const token of ['id:"design",label:"Design"','id:"references",label:"References"','id:"motion",label:"Motion"','id:"interactions",label:"Interact"','id:"assets",label:"Assets"','id:"effects",label:"Effects"']) assert.ok(editor.includes(token),token);
  assert.match(editor,/Interactive3DBuildDock/);
  assert.doesNotMatch(editor,/production-advanced-menu/);
  assert.doesNotMatch(editor,/primarySurfaces/);
});

test("AI Build is part of the canvas and uses the interactive 3D planning path",()=>{
  assert.match(editor,/AI Build/);
  assert.match(dock,/fetch\("\/api\/studio\/interactive3d\/plan"/);
  assert.match(dock,/useCurrentHero/);
  assert.match(editor,/onPreview/);
  assert.match(editor,/onApply/);
});

test("planner generates project-specific site structure instead of reusing template scene IDs",()=>{
  assert.match(planner,/sceneCountForArchetype/);
  assert.match(planner,/sceneIdFor/);
  assert.doesNotMatch(planner,/experience\.scenes\.map\(\(scene, index\)/);
  assert.doesNotMatch(materializer,/requires blueprint scene IDs to match/);
});

test("generated sites remain editable through the production engines",()=>{
  assert.match(materializer,/next\.heroVisible = !heroVisual\?\.source/);
  assert.match(editor,/ReferenceWorkbench/);
  assert.match(editor,/AssetManager/);
  assert.match(editor,/SequencerEditor/);
  assert.match(editor,/InteractionGraphEditor/);
  assert.match(editor,/CinematicSystemsPanel/);
});

test("planning endpoint returns the whole generated website state",()=>{
  assert.match(route,/assetManifest: cleanManifest/);
  assert.match(route,/interactionGraph/);
  assert.match(route,/assetRequests/);
  assert.match(route,/signatureSceneId/);
});

test("publishing remains a protected release action in the same editor",()=>{
  assert.match(editor,/PublishPanel/);
  assert.match(publish,/fetch\("\/api\/studio\/publish"/);
  assert.match(publish,/healthReady/);
  assert.match(publish,/PUBLISH \/ RELEASE/);
});
