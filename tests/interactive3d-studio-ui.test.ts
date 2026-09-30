import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const studio = fs.readFileSync("src/studio/ProductionStudioWorkbench.tsx", "utf8");
const dock = fs.readFileSync("src/studio/Interactive3DBuildDock.tsx", "utf8");
const route = fs.readFileSync("app/api/studio/interactive3d/plan/route.ts", "utf8");
const css = fs.readFileSync("app/studio/interactive-3d-studio.css", "utf8");
const page = fs.readFileSync("app/studio/page.tsx", "utf8");

test("Studio is explicitly optimized for interactive 3D website production", () => {
  assert.match(studio, /3D STUDIO/);
  assert.match(studio, /INTERACTIVE WEB/);
  assert.match(studio, /SCENE GRAPH/);
  assert.match(studio, /LIVE 3D VIEWPORT/);
  assert.match(studio, /PROPERTIES/);
  assert.match(studio, /SCROLL STORYBOARD/);
  assert.match(page, /interactive-3d-studio\.css/);
});

test("Studio exposes one whole-site AI 3D build dock and a secondary contextual command", () => {
  assert.match(studio, /Interactive3DBuildDock/);
  assert.match(dock, /AI 3D BUILD/);
  assert.match(dock, /Build 3D direction/);
  assert.match(dock, /Brief/);
  assert.match(dock, /Hero asset/);
  assert.match(dock, /Scenes/);
  assert.match(dock, /Motion/);
  assert.match(dock, /Proof/);
  assert.match(studio, /Refine the selected 3D scene/);
});

test("Interactive 3D Studio planning route uses the bounded Forge compiler path", () => {
  assert.match(route, /requireStudioRole\(request, "designer"\)/);
  assert.match(route, /planInteractive3DFromPrompt/);
  assert.match(route, /refineInteractive3DBlueprintWithAi/);
  assert.match(route, /compileInteractive3DBlueprint/);
  assert.match(route, /materializeInteractive3DExperience/);
});

test("3D Studio CSS keeps the viewport central and uses progressive disclosure", () => {
  assert.match(css, /grid-template-columns:244px minmax\(620px,1fr\) 318px/);
  assert.match(css, /production-3d-builder/);
  assert.match(css, /production-3d-pipeline/);
  assert.match(css, /production-advanced-menu/);
});
