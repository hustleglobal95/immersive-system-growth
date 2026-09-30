import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const component=fs.readFileSync("src/experiences/zensia/ZensiaCoffeeExperience.tsx","utf8");
const css=fs.readFileSync("app/zensia/zensia-coffee-experience.css","utf8");
const page=fs.readFileSync("app/zensia/page.tsx","utf8");

test("Zensia is visually locked to the approved reference asset",()=>{
  assert.match(page,/ZensiaCoffeeExperience/);
  assert.match(component,/\/zensia\/reference-master\.png/);
  assert.match(component,/width=(?:\{941\}|["\']941["\'])/);
  assert.match(component,/height=(?:\{1672\}|["\']1672["\'])/);
  assert.match(css,/\.zc-reference__image/);
  assert.match(css,/width:100%/);
  assert.match(css,/height:auto/);
});

test("Zensia interaction is layered without rewriting the approved composition",()=>{
  assert.match(component,/zc-cup-focus/);
  assert.match(component,/zc-steam/);
  assert.match(component,/zc-pour-accent/);
  assert.match(component,/onPointerMove/);
  assert.match(component,/HOTSPOTS/);
  assert.match(css,/\.zc-hotspots/);
  assert.doesNotMatch(component,/ReferenceSlice/);
  assert.doesNotMatch(css,/zc-hero::before/);
});

test("Zensia preserves commerce and navigation targets",()=>{
  assert.match(component,/https:\/\/zensia-coffee-llc\.square\.site\//);
  assert.match(component,/https:\/\/www\.zensiacoffee\.com\/actual-menu/);
  assert.match(component,/google\.com\/maps/);
  assert.match(component,/Explore our coffee/);
  assert.match(component,/Shop all coffee/);
  assert.match(component,/Explore recipes/);
});

test("Zensia includes reduced-motion and mobile-safe treatment",()=>{
  assert.match(css,/@media\(max-width:760px\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css,/overflow-x:clip/);
});
