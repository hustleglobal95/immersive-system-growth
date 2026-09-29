import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const component=fs.readFileSync("src/experiences/zensia/ZensiaCoffeeExperience.tsx","utf8");
const css=fs.readFileSync("app/zensia/zensia-coffee-experience.css","utf8");
const page=fs.readFileSync("app/zensia/page.tsx","utf8");

test("Zensia route renders a real authored cafe experience",()=>{
  assert.match(page,/ZensiaCoffeeExperience/);
  assert.match(page,/zensia-coffee-experience\.css/);
  assert.doesNotMatch(component,/reference-master\.png/);
  assert.doesNotMatch(component,/zc-reference__image/);
});

test("Zensia hero uses a persistent interactive cup with runtime steam",()=>{
  assert.match(component,/HeroCup/);
  assert.match(component,/zc-cup-stage/);
  assert.match(component,/zc-steam__strand/);
  assert.match(component,/onPointerMove/);
  assert.match(component,/--mx/);
  assert.match(component,/ScrollTrigger/);
  assert.match(component,/zc-pour-stream/);
  assert.match(component,/zc-glass__fill/);
});

test("Zensia follows the approved cafe structure",()=>{
  for(const token of ["zc-hero","zc-coffee","zc-rack","zc-recipes","zc-story","zc-visit"]){
    assert.match(component,new RegExp(token));
  }
  assert.match(component,/ZENSIA Coffee/i);
  assert.match(component,/Exceptional Coffee/);
  assert.match(component,/From Our Café/);
  assert.match(component,/Timeless/);
  assert.match(component,/Rooted in/);
  assert.match(component,/Brighter Days/);
});

test("Zensia uses real Zensia assets and preserves conversion paths",()=>{
  assert.match(component,/static\.wixstatic\.com\/media/);
  assert.match(component,/zensia-coffee-llc\.square\.site/);
  assert.match(component,/zensiacoffee\.com\/actual-menu/);
  assert.match(component,/google\.com\/maps/);
  assert.match(css,/@media\(max-width:980px\)/);
  assert.match(css,/@media\(max-width:620px\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
