import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const component=fs.readFileSync("src/experiences/zensia/ZensiaCoffeeExperience.tsx","utf8");
const css=fs.readFileSync("app/zensia/zensia-coffee-experience.css","utf8");
const page=fs.readFileSync("app/zensia/page.tsx","utf8");

test("Zensia route uses the full persistent coffee experience",()=>{
  assert.match(page,/ZensiaCoffeeExperience/);
  assert.match(page,/zensia-coffee-experience\.css/);
  assert.doesNotMatch(page,/ZensiaImaginationExperience/);
});

test("Zensia hero cup is one persistent interactive R3F object with runtime steam",()=>{
  assert.match(component,/Canvas/);
  assert.match(component,/useFrame/);
  assert.match(component,/CupScene/);
  assert.match(component,/SteamRibbon/);
  assert.match(component,/STEAM_VERTEX/);
  assert.match(component,/STEAM_FRAGMENT/);
  assert.match(component,/pointer\.current/);
  assert.match(component,/MathUtils\.smoothstep/);
  assert.match(component,/zc-canvas/);
});

test("Zensia scroll creates a real coffee handoff into the next scene",()=>{
  assert.match(component,/zc-pour-glass/);
  assert.match(component,/stream\.current/);
  assert.match(component,/pourIn/);
  assert.match(component,/pourOut/);
  assert.match(component,/ScrollTrigger\.create/);
  assert.match(component,/zc-pour-glass__fill/);
  assert.match(component,/scrub:/);
});

test("Zensia full site contains coffee products, rack, recipes, story and visit conversion",()=>{
  for(const token of ["zc-coffee","zc-rack","zc-recipes","zc-story","zc-visit","ZENSIA_BAGS","RACK_LABELS","DRINKS"]){
    assert.match(component,new RegExp(token));
  }
  assert.match(component,/https:\/\/zensia-coffee-llc\.square\.site\//);
  assert.match(component,/https:\/\/www\.zensiacoffee\.com\/actual-menu/);
  assert.match(css,/@media\(max-width:980px\)/);
  assert.match(css,/@media\(max-width:620px\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
