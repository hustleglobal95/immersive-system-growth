import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const component=fs.readFileSync("src/experiences/zensia/ZensiaImaginationExperience.tsx","utf8");
const cup=fs.readFileSync("src/experiences/zensia/ZensiaHeroCup.tsx","utf8");
const css=fs.readFileSync("app/zensia/zensia-imagination.css","utf8");

test("Zensia uses the production typography system without fallback editorial drift",()=>{
  assert.match(css,/--font-manrope/);
  assert.match(css,/--font-dm-sans/);
  assert.doesNotMatch(css,/--font-cormorant/);
  assert.doesNotMatch(css,/font-style:italic/);
  assert.match(component,/Coffee/);
  assert.match(component,/>ZENSIA<\/div>/);
});

test("Zensia is built around a persistent interactive 3D coffee cup",()=>{
  assert.match(component,/ZensiaHeroCup/);
  assert.match(component,/zi-cup-flow/);
  assert.match(component,/zi-cup-stage-shell/);
  assert.match(component,/onCupMove/);
  assert.match(component,/scrub:/);
  assert.match(cup,/Canvas/);
  assert.match(cup,/CoffeeCupScene/);
  assert.match(cup,/SteamWisp/);
  assert.match(cup,/tubeGeometry/);
  assert.match(cup,/latheGeometry/);
  assert.match(cup,/circleGeometry/);
});

test("Zensia carries the experience from hero to rack, recipes, full menu and commerce",()=>{
  for(const token of ["zi-rack","zi-recipes","zi-photo-story","ZensiaImmersiveMenu","zi-origin","zi-club","zi-visit"]){
    assert.match(component,new RegExp(token));
  }
  assert.match(component,/A cup can/);
  assert.match(component,/The coffee rack/);
  assert.match(component,/Three ways/);
  assert.match(component,/https:\/\/zensia-coffee-llc\.square\.site\//);
  assert.match(component,/profile\.squareup\.com\/loyalty\/MLX5PRMQ9XZ02/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
