import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const simple = fs.readFileSync("src/studio/SimpleForgeStudio.tsx", "utf8");
const advanced = fs.readFileSync("src/studio/ProductionStudioWorkbench.tsx", "utf8");
const dock = fs.readFileSync("src/studio/Interactive3DBuildDock.tsx", "utf8");
const route = fs.readFileSync("app/api/studio/interactive3d/plan/route.ts", "utf8");
const page = fs.readFileSync("app/studio/page.tsx", "utf8");
const advancedPage = fs.readFileSync("app/studio/advanced/page.tsx", "utf8");

test("default Studio keeps interactive 3D creation simple", () => {
  assert.match(page, /SimpleForgeStudio/);
  assert.match(simple, /Build Website/);
  assert.match(simple, /StudioLivePreview/);
  assert.match(simple, /\/api\/studio\/interactive3d\/plan/);
  assert.doesNotMatch(page, /interactive-3d-studio\.css/);
});

test("full interactive 3D authoring machinery remains available in Advanced", () => {
  assert.match(advancedPage, /ProductionStudioWorkbench/);
  assert.match(advanced, /Interactive3DBuildDock/);
  assert.match(advanced, /SCENE GRAPH/);
  assert.match(advanced, /LIVE 3D VIEWPORT/);
  assert.match(dock, /AI 3D BUILD/);
});

test("Interactive 3D planning route uses the bounded Forge compiler path", () => {
  assert.match(route, /requireStudioRole\(request, "designer"\)/);
  assert.match(route, /planInteractive3DFromPrompt/);
  assert.match(route, /refineInteractive3DBlueprintWithAi/);
  assert.match(route, /compileInteractive3DBlueprint/);
  assert.match(route, /materializeInteractive3DExperience/);
});
