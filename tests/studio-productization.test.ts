import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page=fs.readFileSync("app/studio/page.tsx","utf8");
const advancedPage=fs.readFileSync("app/studio/advanced/page.tsx","utf8");
const simple=fs.readFileSync("src/studio/SimpleForgeStudio.tsx","utf8");
const production=fs.readFileSync("src/studio/ProductionStudioWorkbench.tsx","utf8");

test("default Studio is the simple Forge product",()=>{
  assert.match(page,/SimpleForgeStudio/);
  assert.doesNotMatch(page,/ProductionStudioWorkbench/);
  assert.match(simple,/type Mode="build"\|"edit"\|"finish"/);
  assert.match(simple,/>Build Website</);
  assert.match(simple,/>Finish Website</);
  assert.match(simple,/href="\/studio\/advanced"/);
});

test("simple Studio builds through the bounded 3D planner",()=>{
  assert.match(simple,/fetch\("\/api\/studio\/interactive3d\/plan"/);
  assert.match(simple,/draft\.applyProjectBundle/);
  assert.match(simple,/StudioLivePreview/);
});

test("simple Studio can finish through Forge publishing",()=>{
  assert.match(simple,/fetch\("\/api\/studio\/publish\/status"/);
  assert.match(simple,/fetch\("\/api\/studio\/publish"/);
  assert.match(simple,/releaseReady/);
});

test("full production machinery is preserved behind Advanced",()=>{
  assert.match(advancedPage,/ProductionStudioWorkbench/);
  assert.match(production,/primarySurfaces = \["Build", "Review", "Ship"\]/);
  assert.match(production,/production-advanced-menu/);
});
