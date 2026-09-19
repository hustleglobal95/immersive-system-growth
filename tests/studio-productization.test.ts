import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const studioPage = fs.readFileSync("app/studio/page.tsx", "utf8");
const studio = fs.readFileSync("src/studio/ProductionStudioWorkbench.tsx", "utf8");
const guide = fs.readFileSync("src/studio/StudioWorkflowGuide.tsx", "utf8");
const panels = fs.readFileSync("src/studio/ProjectPanels.tsx", "utf8");
const agent = fs.readFileSync("src/studio/CreativeAgentWorkbench.tsx", "utf8");
const assetCreator = fs.readFileSync("src/studio/AssetCreationWorkbench.tsx", "utf8");
const assetManager = fs.readFileSync("src/studio/AssetManager.tsx", "utf8");

test("Studio exposes one guided entry hierarchy instead of floating launchers", () => {
  assert.doesNotMatch(studioPage, /studio-intelligence-dock|StudioWorkflowDock/);
  assert.match(studio, /Guided Build/);
  assert.match(studio, /production-assist/);
  assert.match(studio, /production-sr-only/);
});

test("Studio has keyboard access to the command system", () => {
  assert.match(studio, /event\.key\.toLowerCase\(\) === "k"/);
  assert.match(studio, /slashShortcut/);
  assert.match(studio, /production-command-palette/);
  assert.match(studio, /aria-label="Open command palette"/);
});

test("Guided Build finishes in Guided Ship instead of engineering controls", () => {
  assert.match(guide, /Review & publish/);
  assert.match(panels, /GUIDED SHIP/);
  assert.match(panels, /Advanced setup/);
  assert.match(panels, /HTTP-only session/);
  assert.doesNotMatch(panels, /Open review pull request/);
});

test("client-facing Studio family hides internal release labels", () => {
  assert.doesNotMatch(agent, /V5 · HIERARCHY \+ ASSET CREATION/);
  assert.doesNotMatch(assetCreator, />BETA</);
});


test("Studio routes selections through contextual direction instead of exposing raw machinery first", () => {
  assert.match(studio, /ContextualDirection/);
  assert.match(studio, /SCENE DIRECTION/);
  assert.match(studio, /CAMERA DIRECTION/);
  assert.match(studio, /OBJECT DIRECTION/);
  assert.match(studio, /ASSET DIRECTION/);
  assert.match(studio, /ENVIRONMENT DIRECTION/);
});

test("Studio asset intake surfaces Asset Intelligence guidance", () => {
  assert.match(assetManager, /analyzeAssetManifest/);
  assert.match(assetManager, /ASSET INTELLIGENCE/);
  assert.match(assetManager, /production suitability/);
});
