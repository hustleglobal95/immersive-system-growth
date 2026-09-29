import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const component=fs.readFileSync("src/experiences/zensia/ZensiaCoffeeExperience.tsx","utf8");
const css=fs.readFileSync("app/zensia/zensia-coffee-experience.css","utf8");
const page=fs.readFileSync("app/zensia/page.tsx","utf8");

test("Zensia route uses the reference-driven coffee experience",()=>{
  assert.match(page,/ZensiaCoffeeExperience/);
  assert.match(page,/zensia-coffee-experience\.css/);
  assert.match(component,/reference-master\.png/);
  assert.doesNotMatch(page,/ZensiaImaginationExperience/);
});

test("Zensia hero uses the approved cafe plate with runtime interaction and steam",()=>{
  assert.match(component,/ReferenceSlice/);
  assert.match(component,/zc-cup-interaction/);
  assert.match(component,/zc-steam-ribbon/);
  assert.match(component,/onPointerMove/);
  assert.match(component,/--mx/);
  assert.match(css,/\.zc-hero \.zc-slice__plate/);
  assert.match(css,/\.zc-steam-ribbon/);
  assert.doesNotMatch(component,/@react-three\/fiber/);
});

test("Zensia scroll carries coffee into the next section",()=>{
  assert.match(component,/zc-coffee-stream/);
  assert.match(component,/zc-coffee-fill/);
  assert.match(component,/ScrollTrigger/);
  assert.match(component,/scrub:/);
  assert.match(component,/start:\"65% top\"/);
  assert.match(component,/end:\"bottom top\"/);
});

test("Zensia full site preserves rack, recipes, story, visit and commerce",()=>{
  for(const token of ["zc-coffee","zc-rack","zc-recipes","zc-story","zc-visit","RACK_ITEMS","RECIPES"]){
    assert.match(component,new RegExp(token));
  }
  assert.match(component,/https:\/\/zensia-coffee-llc\.square\.site\//);
  assert.match(component,/https:\/\/www\.zensiacoffee\.com\/actual-menu/);
  assert.match(css,/--font-cormorant-garamond/);
  assert.match(css,/@media\(max-width:900px\)/);
  assert.match(css,/@media\(max-width:560px\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
