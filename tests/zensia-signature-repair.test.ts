import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const component=fs.readFileSync("src/experiences/zensia/ZensiaExperience.tsx","utf8");
const css=fs.readFileSync("app/zensia/zensia.css","utf8");

test("Zensia hero uses Brewns-style product staging instead of the retired pace gimmick",()=>{
  assert.match(component,/Choose a Zensia coffee product/);
  assert.match(component,/Zensia Zen at Home Colombian coffee/);
  assert.match(component,/z2-product-stage/);
  assert.match(component,/PRODUCTS =/);
  assert.doesNotMatch(component,/type="range"/);
  assert.doesNotMatch(component,/Change the pace from city rush to stay/);
});

test("Zensia product selection changes the visual system while commerce remains semantic",()=>{
  assert.match(component,/setActiveProduct/);
  assert.match(component,/--z2-tone/);
  assert.match(component,/--z2-accent/);
  assert.match(component,/https:\/\/zensia-coffee-llc\.square\.site\//);
  assert.match(component,/https:\/\/www\.zensiacoffee\.com\/actual-menu/);
  assert.match(component,/profile\.squareup\.com\/loyalty\/MLX5PRMQ9XZ02/);
});

test("Zensia upgrade has authored desktop, mobile and reduced-motion composition",()=>{
  assert.match(css,/\.z2-product-stage/);
  assert.match(css,/\.z2-profile-grid/);
  assert.match(css,/@media\(max-width:980px\)/);
  assert.match(css,/@media\(max-width:560px\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
