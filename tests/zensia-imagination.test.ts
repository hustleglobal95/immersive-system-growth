import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const component=fs.readFileSync("src/experiences/zensia/ZensiaImaginationExperience.tsx","utf8");
const css=fs.readFileSync("app/zensia/zensia-imagination.css","utf8");

test("Zensia professional type pass uses Manrope display with DM Sans support",()=>{
  assert.match(css,/--font-manrope/);
  assert.match(css,/--font-dm-sans/);
  assert.doesNotMatch(css,/--font-cormorant/);
  assert.doesNotMatch(css,/font-style:italic/);
  assert.match(component,/A cup can/);
  assert.match(component,/>ZENSIA<\/div>/);
});

test("Zensia imagination pass adds a real kinetic object language",()=>{
  for(const token of ["zi-object-field","zi-orbit","zi-seal","zi-steam","zi-photo-chip","zi-kinetic__tile"]){
    assert.match(component,new RegExp(token));
  }
  assert.match(component,/repeat:-1/);
  assert.match(component,/scrub:/);
  assert.match(component,/onProductMove/);
});

test("Zensia imagination pass preserves Forge masks, motion and commerce",()=>{
  assert.match(component,/createCssMaskStyle/);
  assert.match(component,/createMaskReveal/);
  assert.match(component,/ScrollTrigger/);
  assert.match(component,/https:\/\/zensia-coffee-llc\.square\.site\//);
  assert.match(component,/ZensiaImmersiveMenu/);
  assert.match(component,/profile\.squareup\.com\/loyalty\/MLX5PRMQ9XZ02/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
