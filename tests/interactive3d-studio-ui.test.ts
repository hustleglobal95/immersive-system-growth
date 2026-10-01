import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const editor=fs.readFileSync("src/studio/ForgeEditor.tsx","utf8");
const dock=fs.readFileSync("src/studio/Interactive3DBuildDock.tsx","utf8");
const route=fs.readFileSync("app/api/studio/interactive3d/plan/route.ts","utf8");
const page=fs.readFileSync("app/studio/page.tsx","utf8");

test("default Studio is a real interactive 3D website editor",()=>{
  assert.match(page,/ForgeEditor/);
  assert.doesNotMatch(page,/ProductionStudioWorkbench/);
  assert.match(editor,/StudioLivePreview/);
  assert.match(editor,/Layers/);
  assert.match(editor,/Inspector/);
  assert.match(editor,/Timeline/);
  assert.match(editor,/Interactive3DBuildDock/);
});

test("Forge exposes the website authoring modes without a second Studio",()=>{
  assert.match(editor,/label:"Design"/);
  assert.match(editor,/label:"References"/);
  assert.match(editor,/label:"Motion"/);
  assert.match(editor,/label:"Interact"/);
  assert.match(editor,/label:"Assets"/);
  assert.match(editor,/label:"Effects"/);
  assert.doesNotMatch(editor,/production-advanced-menu/);
  assert.match(dock,/AI 3D BUILD/);
});

test("Interactive 3D planning route uses the bounded Forge compiler path",()=>{
  assert.match(route,/requireStudioRole\(request, "designer"\)/);
  assert.match(route,/planInteractive3DFromPrompt/);
  assert.match(route,/refineInteractive3DBlueprintWithAi/);
  assert.match(route,/compileInteractive3DBlueprint/);
  assert.match(route,/materializeInteractive3DExperience/);
});
